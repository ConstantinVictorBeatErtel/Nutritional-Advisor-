import json
import os
import re
from typing import Dict, Optional, Tuple

import faiss
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageFile
from transformers import AutoImageProcessor, AutoModel, AutoProcessor


ImageFile.LOAD_TRUNCATED_IMAGES = True

TARGETS = ["calories_kcal", "fat_g", "protein_g", "carbohydrate_g"]
DEFAULT_RELEASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CLIP_MODEL_ID = "openai/clip-vit-base-patch32"


def get_device(device: Optional[str] = None) -> str:
    if device:
        return device
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# Local CLIP text prototypes → typical macros (order: kcal, fat_g, protein_g, carbs_g).
# Used when phase-1 encoder weights and/or FAISS index are not shipped in the bundle.
FOOD_PROTOTYPES: Tuple[Tuple[str, float, float, float, float], ...] = (
    ("grilled chicken breast with broccoli", 380, 12, 48, 20),
    ("baked salmon fillet with asparagus", 420, 22, 38, 12),
    ("beef steak with mashed potatoes", 720, 38, 48, 45),
    ("pork ribs barbecue sauce", 650, 38, 42, 35),
    ("turkey sandwich on whole grain bread", 520, 18, 35, 55),
    ("caesar salad with chicken", 480, 28, 32, 28),
    ("greek salad feta olives", 340, 26, 12, 22),
    ("vegetable stir fry tofu", 320, 14, 18, 38),
    ("pasta with tomato sauce and parmesan", 580, 16, 18, 88),
    ("pepperoni pizza slice", 320, 14, 14, 36),
    ("cheeseburger and french fries", 920, 48, 38, 85),
    ("fish and chips", 780, 42, 28, 72),
    ("sushi rolls salmon avocado", 420, 14, 18, 58),
    ("ramen noodle bowl with egg", 520, 18, 22, 68),
    ("fried rice with shrimp", 540, 16, 24, 78),
    ("tacos with ground beef", 580, 28, 32, 48),
    ("burrito with beans rice", 680, 22, 28, 92),
    ("chicken curry with rice", 620, 22, 38, 72),
    ("pad thai noodles shrimp", 640, 20, 28, 88),
    ("pho noodle soup beef", 480, 14, 28, 65),
    ("eggs bacon toast breakfast", 520, 32, 24, 38),
    ("oatmeal bowl berries nuts", 340, 12, 12, 48),
    ("pancakes maple syrup", 620, 18, 12, 98),
    ("bagel cream cheese", 400, 16, 10, 52),
    ("cereal with milk banana", 320, 6, 10, 58),
    ("fruit smoothie bowl", 280, 6, 8, 52),
    ("chocolate cake dessert", 420, 18, 6, 60),
    ("ice cream sundae", 380, 18, 6, 48),
    ("apple banana fruit plate", 180, 1, 2, 44),
    ("mixed nuts snack", 320, 28, 10, 12),
    ("protein bar", 220, 8, 20, 22),
    ("chips and salsa", 280, 14, 4, 34),
    ("chili con carne bowl", 420, 18, 32, 38),
    ("lasagna baked pasta", 640, 28, 36, 58),
    ("shepherd pie meat potato", 520, 24, 28, 48),
    ("falafel wrap hummus", 480, 20, 16, 58),
    ("shawarma plate rice", 680, 28, 38, 72),
    ("dim sum dumplings", 380, 14, 18, 48),
    ("waffles fried chicken", 780, 38, 36, 72),
)


def retrieval_encoder_bundle_present(paths: Dict[str, str]) -> bool:
    return os.path.isfile(paths["phase1_encoder"]) and os.path.isfile(paths["faiss_index"])


@torch.no_grad()
def estimate_nutrition_clip_prototypes(
    image_path: str,
    clip_bundle: Dict,
    ingredients_text: Optional[str],
    portion_text: Optional[str],
    train_targets_path: str,
    temperature: float = 0.07,
) -> Tuple[np.ndarray, float, str]:
    """Estimate macros by weighting FOOD_PROTOTYPES with CLIP image–text similarity."""
    image = load_rgb_image(image_path)
    processor = clip_bundle["processor"]
    model = clip_bundle["model"]
    device = clip_bundle["device"]

    pixel_inputs = processor(images=[image], return_tensors="pt")
    pixel_values = pixel_inputs["pixel_values"].to(device)

    def _as_image_embed(x):
        if isinstance(x, torch.Tensor):
            return x
        if hasattr(x, "image_embeds") and x.image_embeds is not None:
            return x.image_embeds
        if hasattr(x, "pooler_output") and x.pooler_output is not None:
            return x.pooler_output
        if hasattr(x, "last_hidden_state"):
            return x.last_hidden_state[:, 0, :]
        raise TypeError(f"Cannot get image embedding from {type(x)}")

    if hasattr(model, "get_image_features"):
        img_feat = _as_image_embed(model.get_image_features(pixel_values=pixel_values))
    else:
        img_feat = _as_image_embed(model(pixel_values=pixel_values))
    img_feat = F.normalize(img_feat, dim=-1)

    captions = [p[0] for p in FOOD_PROTOTYPES]
    prior = np.load(train_targets_path).mean(axis=0).astype(np.float32)
    templates = np.array([[p[1], p[2], p[3], p[4]] for p in FOOD_PROTOTYPES], dtype=np.float32)

    extra_captions: list[str] = []
    extra_rows: list[np.ndarray] = []
    if ingredients_text and ingredients_text.strip():
        extra_captions.append(f"home cooked meal with {ingredients_text.strip()[:180]}")
        extra_rows.append(prior)
    extra_captions.append("generic restaurant lunch plate balanced meal")
    extra_rows.append(prior)

    if extra_captions:
        captions = captions + extra_captions
        templates = np.vstack([templates, np.stack(extra_rows, axis=0)])

    text_inputs = processor(text=captions, return_tensors="pt", padding=True, truncation=True)
    text_inputs = {k: v.to(device) for k, v in text_inputs.items() if k != "pixel_values"}
    def _as_text_embed(x):
        if isinstance(x, torch.Tensor):
            return x
        if hasattr(x, "text_embeds") and x.text_embeds is not None:
            return x.text_embeds
        if hasattr(x, "pooler_output") and x.pooler_output is not None:
            return x.pooler_output
        raise TypeError(f"Cannot get text embedding from {type(x)}")

    if hasattr(model, "get_text_features"):
        txt_feat = _as_text_embed(
            model.get_text_features(
                input_ids=text_inputs["input_ids"],
                attention_mask=text_inputs.get("attention_mask"),
            )
        )
    else:
        txt_feat = _as_text_embed(model(**text_inputs))
    txt_feat = F.normalize(txt_feat, dim=-1)

    logits = (img_feat @ txt_feat.T).squeeze(0) / temperature
    probs = torch.softmax(logits, dim=-1).detach().cpu().numpy().astype(np.float32)
    pred = (probs @ templates).astype(np.float32)
    pred = np.maximum(pred, 0.0)

    grams: list[float] = []
    if portion_text:
        grams = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*g\b", portion_text, re.IGNORECASE)]
    portion_factor = 1.0
    if grams:
        portion_factor = float(min(3.0, max(0.45, sum(grams) / 350.0)))
    pred = pred * portion_factor

    max_sim = float(probs.max())
    dbg = f"clip_prototype blend (top p={max_sim:.2f}, portion×{portion_factor:.2f})"
    return pred, max_sim, dbg


def safe_text(value: Optional[str], max_chars: int) -> str:
    if value is None:
        return "unknown"
    text = str(value).strip()
    if not text:
        return "unknown"
    return text[:max_chars]


def build_prompt(prompt_name: str, ingredients_text: Optional[str], portion_text: Optional[str]) -> str:
    ing = safe_text(ingredients_text, 220)
    por = safe_text(portion_text, 120)
    prompt_name = prompt_name.upper()
    if prompt_name == "A":
        return f"ingredients: {ing}. portion: {por}"
    if prompt_name == "B":
        return (
            "Nutrition cues for this food. "
            f"Main ingredients: {ing}. "
            f"Portion details: {por}. "
            "Focus on quantity and density."
        )
    if prompt_name == "C":
        return (
            f"Food description. Ingredients: {ing}. "
            f"Serving size: {por}. "
            "Infer nutrition-relevant residual cues."
        )
    raise ValueError(f"Unsupported prompt: {prompt_name}")


def resolve_hf_local_snapshot(model_id: str) -> Optional[str]:
    if os.path.exists(model_id):
        return model_id
    if "/" not in model_id:
        return None
    cache_root = os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub")
    repo_dir = os.path.join(cache_root, "models--" + model_id.replace("/", "--"))
    ref_path = os.path.join(repo_dir, "refs", "main")
    if os.path.exists(ref_path):
        with open(ref_path, "r", encoding="utf-8") as fh:
            snapshot = fh.read().strip()
        snapshot_dir = os.path.join(repo_dir, "snapshots", snapshot)
        if os.path.isdir(snapshot_dir):
            return snapshot_dir
    snapshots_dir = os.path.join(repo_dir, "snapshots")
    if os.path.isdir(snapshots_dir):
        entries = sorted(
            [os.path.join(snapshots_dir, name) for name in os.listdir(snapshots_dir)],
            reverse=True,
        )
        for entry in entries:
            if os.path.isdir(entry):
                return entry
    return None


def load_rgb_image(image_path: str) -> Image.Image:
    with Image.open(image_path) as image:
        return image.convert("RGB")


class MLP(nn.Module):
    def __init__(self, inp: int, hs: Tuple[int, ...], drop: float = 0.1):
        super().__init__()
        layers = []
        d = inp
        for h in hs:
            layers += [nn.Linear(d, h), nn.ReLU(), nn.Dropout(drop)]
            d = h
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class NutritionEncoder(nn.Module):
    def __init__(
        self,
        model_id: str,
        proj_dim: int = 768,
        dropout: float = 0.1,
        local_files_only: bool = True,
    ):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_id, local_files_only=local_files_only)
        self._proj_dim = proj_dim
        self._dropout = dropout
        self.proj = None
        self.reg_head = None

    def _to_tensor(self, x):
        if torch.is_tensor(x):
            return x
        if hasattr(x, "image_embeds"):
            return self._to_tensor(x.image_embeds)
        if hasattr(x, "pooler_output"):
            return self._to_tensor(x.pooler_output)
        if hasattr(x, "last_hidden_state"):
            v = self._to_tensor(x.last_hidden_state)
            return v[:, 0, :] if v.dim() == 3 else v
        if isinstance(x, dict):
            for key in ["image_embeds", "pooler_output", "last_hidden_state"]:
                if key in x:
                    v = self._to_tensor(x[key])
                    if key == "last_hidden_state" and v.dim() == 3:
                        return v[:, 0, :]
                    return v
        if isinstance(x, (tuple, list)) and x:
            return self._to_tensor(x[0])
        raise TypeError(f"Cannot convert to tensor: {type(x)}")

    def _get_feat(self, pixel_values: torch.Tensor) -> torch.Tensor:
        if hasattr(self.backbone, "get_image_features"):
            out = self.backbone.get_image_features(pixel_values=pixel_values)
        else:
            out = self.backbone(pixel_values=pixel_values)
        return self._to_tensor(out)

    def _build_heads_if_needed(self, feat_dim: int, device: torch.device) -> None:
        if self.proj is None:
            self.proj = nn.Sequential(
                nn.Linear(feat_dim, self._proj_dim),
                nn.GELU(),
                nn.Dropout(self._dropout),
                nn.Linear(self._proj_dim, self._proj_dim),
            ).to(device)
            h2 = max(128, self._proj_dim // 2)
            self.reg_head = nn.Sequential(
                nn.Linear(self._proj_dim, h2),
                nn.GELU(),
                nn.Linear(h2, 4),
            ).to(device)

    def forward(self, pixel_values: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        feat = self._get_feat(pixel_values)
        self._build_heads_if_needed(feat.shape[-1], feat.device)
        emb = F.normalize(self.proj(feat), dim=1)
        y_hat_z = self.reg_head(emb)
        return emb, y_hat_z


class RAMRLVLM(nn.Module):
    def __init__(self, vlm_dim: int, res_mean: np.ndarray, res_std: np.ndarray):
        super().__init__()
        kn_dim = 9
        self.vlm = MLP(vlm_dim, (1024, 512), 0.1)
        self.vlm_head = nn.Linear(512, 4)

        self.knn = MLP(kn_dim, (256, 128, 64), 0.0)
        self.knn_head = nn.Linear(64, 4)

        self.gate = MLP(vlm_dim + kn_dim, (256, 64), 0.0)
        self.gate_head = nn.Linear(64, 4)

        self.register_buffer("res_mean", torch.tensor(res_mean, dtype=torch.float32))
        self.register_buffer("res_std", torch.tensor(res_std, dtype=torch.float32))

    def forward(
        self,
        vlm_feat: torch.Tensor,
        knn_mean: torch.Tensor,
        sim_feat: torch.Tensor,
        force_alpha: Optional[float] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        kn = torch.cat([knn_mean, sim_feat], dim=1)
        r_vlm_z = self.vlm_head(self.vlm(vlm_feat))
        r_knn_z = self.knn_head(self.knn(kn))
        if force_alpha is None:
            alpha = torch.sigmoid(self.gate_head(self.gate(torch.cat([vlm_feat, kn], dim=1))))
        else:
            alpha = torch.full((vlm_feat.size(0), 4), float(force_alpha), device=vlm_feat.device)
        r_z = alpha * r_knn_z + (1.0 - alpha) * r_vlm_z
        r = r_z * self.res_std + self.res_mean
        yhat = knn_mean + r
        return yhat, alpha


def sim_stats(sims: np.ndarray) -> np.ndarray:
    sims = sims.astype(np.float32)
    mean = float(np.mean(sims))
    maxv = float(np.max(sims))
    minv = float(np.min(sims))
    std = float(np.std(sims))
    return np.array([mean, maxv, std, minv, maxv - mean], dtype=np.float32)


def load_json(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def infer_release_dir(explicit_release_dir: Optional[str] = None) -> str:
    return os.path.abspath(explicit_release_dir or DEFAULT_RELEASE_DIR)


def resolve_release_path(path_value: Optional[str], release_dir: Optional[str] = None) -> Optional[str]:
    if not path_value:
        return path_value
    if os.path.isabs(path_value):
        return path_value
    root = infer_release_dir(release_dir)
    candidate = os.path.abspath(os.path.join(root, path_value))
    if os.path.exists(candidate):
        return candidate
    return path_value


def default_release_paths(release_dir: Optional[str] = None) -> Dict[str, str]:
    root = infer_release_dir(release_dir)
    return {
        "release_dir": root,
        "manifest": os.path.join(root, "manifest.json"),
        "phase3b_model": os.path.join(root, "best_phase3b_vlm.pt"),
        "phase1_encoder": os.path.join(root, "phase1_encoder_nb_e3.pt"),
        "phase2_dir": os.path.join(root, "phase2_retrieval_e3"),
        "faiss_index": os.path.join(root, "phase2_retrieval_e3", "faiss_new.index"),
        "residual_stats": os.path.join(root, "phase2_retrieval_e3", "residual_stats_v2.json"),
        "train_targets": os.path.join(root, "phase2_retrieval_e3", "train_targets.npy"),
        "train_ids": os.path.join(root, "phase2_retrieval_e3", "train_image_ids.csv"),
        "deploy_config": os.path.join(root, "deploy_config.json"),
    }


def load_release_config(release_dir: Optional[str] = None) -> Dict:
    paths = default_release_paths(release_dir)
    config_path = paths["deploy_config"]
    if os.path.exists(config_path):
        return load_json(config_path)
    return {
        "clip_model_id": DEFAULT_CLIP_MODEL_ID,
        "default_prompt": "A",
        "local_files_only": True,
        "targets": TARGETS,
    }


def load_phase1_encoder(
    encoder_ckpt_path: str,
    device: Optional[str] = None,
    model_id_or_path: Optional[str] = None,
    local_files_only: bool = True,
):
    device = get_device(device)
    ckpt = torch.load(encoder_ckpt_path, map_location="cpu", weights_only=False)
    model_id = model_id_or_path or ckpt["model_id"]
    resolved_model = resolve_hf_local_snapshot(model_id) if local_files_only else model_id
    resolved_model = resolved_model or model_id
    proj_dim = int(ckpt["proj_dim"])
    dropout = float(ckpt["dropout"])

    processor = AutoImageProcessor.from_pretrained(resolved_model, local_files_only=local_files_only)
    model = NutritionEncoder(
        resolved_model,
        proj_dim=proj_dim,
        dropout=dropout,
        local_files_only=local_files_only,
    ).to(device)
    proj_weight = ckpt["model_state"].get("proj.0.weight")
    if proj_weight is not None:
        model._build_heads_if_needed(int(proj_weight.shape[1]), torch.device(device))
    model.load_state_dict(ckpt["model_state"], strict=False)
    model.eval()
    return {
        "checkpoint": ckpt,
        "model_id": model_id,
        "resolved_model_path": resolved_model,
        "processor": processor,
        "model": model,
        "device": device,
    }


@torch.no_grad()
def encode_retrieval_image(image_path: str, encoder_bundle: Dict) -> np.ndarray:
    image = load_rgb_image(image_path)
    processor = encoder_bundle["processor"]
    device = encoder_bundle["device"]
    model = encoder_bundle["model"]
    pixel_values = processor(images=[image], return_tensors="pt")["pixel_values"].to(device)
    emb, _ = model(pixel_values)
    arr = emb.detach().cpu().numpy().astype(np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.maximum(norms, 1e-12)


def load_clip_bundle(
    model_id: str = DEFAULT_CLIP_MODEL_ID,
    device: Optional[str] = None,
    local_files_only: bool = True,
) -> Dict:
    device = get_device(device)
    resolved_model = resolve_hf_local_snapshot(model_id) if local_files_only else model_id
    resolved_model = resolved_model or model_id
    processor = AutoProcessor.from_pretrained(resolved_model, local_files_only=local_files_only)
    model = AutoModel.from_pretrained(resolved_model, local_files_only=local_files_only).to(device).eval()
    return {
        "model_id": model_id,
        "resolved_model_path": resolved_model,
        "processor": processor,
        "model": model,
        "device": device,
    }


@torch.no_grad()
def encode_vlm_feature(
    image_path: str,
    clip_bundle: Dict,
    prompt_name: str = "A",
    ingredients_text: Optional[str] = None,
    portion_text: Optional[str] = None,
) -> Tuple[np.ndarray, str]:
    image = load_rgb_image(image_path)
    prompt = build_prompt(prompt_name, ingredients_text, portion_text)
    inputs = clip_bundle["processor"](
        images=[image],
        text=[prompt],
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77,
    )
    inputs = {k: v.to(clip_bundle["device"]) for k, v in inputs.items()}
    outputs = clip_bundle["model"](**inputs)
    img_e = F.normalize(outputs.image_embeds, dim=1)
    txt_e = F.normalize(outputs.text_embeds, dim=1)
    feat = torch.cat([img_e, txt_e, img_e * txt_e, torch.abs(img_e - txt_e)], dim=1)
    return feat.detach().cpu().numpy().astype(np.float32), prompt


def load_train_targets(path: str) -> np.ndarray:
    arr = np.load(path)
    return np.asarray(arr, dtype=np.float32)


def load_residual_stats(path: str) -> Dict:
    stats = load_json(path)
    stats["res_mean"] = np.array(stats["res_mean"], dtype=np.float32)
    stats["res_std"] = np.array(stats["res_std"], dtype=np.float32)
    return stats


def search_knn(
    faiss_index_path: str,
    query_vec: np.ndarray,
    train_targets: np.ndarray,
    k: int,
) -> Dict[str, np.ndarray]:
    index = faiss.read_index(faiss_index_path)
    dists, idxs = index.search(np.asarray(query_vec, dtype=np.float32), int(k))
    neighbor_targets = train_targets[idxs.reshape(-1)].reshape(idxs.shape[0], k, train_targets.shape[1])
    knn_mean = neighbor_targets.mean(axis=1).astype(np.float32)
    sim_feat = np.stack([sim_stats(dists[i]) for i in range(dists.shape[0])], axis=0).astype(np.float32)
    return {
        "knn_mean": knn_mean,
        "sim_feat": sim_feat,
        "neighbor_indices": idxs.astype(np.int64),
        "neighbor_scores": dists.astype(np.float32),
    }


def infer_vlm_dim_from_release(release_dir: Optional[str] = None) -> int:
    sample = os.path.join(infer_release_dir(release_dir), "A", "vlm_test.npy")
    arr = np.load(sample, mmap_mode="r")
    return int(arr.shape[1])


def load_phase3_model(
    model_weights_path: str,
    residual_stats_path: str,
    vlm_dim: int,
    device: Optional[str] = None,
) -> Dict:
    device = get_device(device)
    stats = load_residual_stats(residual_stats_path)
    model = RAMRLVLM(vlm_dim, stats["res_mean"], stats["res_std"]).to(device)
    state = torch.load(model_weights_path, map_location="cpu", weights_only=False)
    model.load_state_dict(state, strict=True)
    model.eval()
    return {"model": model, "device": device, "stats": stats}


@torch.no_grad()
def predict_phase3(
    model_bundle: Dict,
    vlm_feat: np.ndarray,
    knn_mean: np.ndarray,
    sim_feat: np.ndarray,
) -> Dict[str, np.ndarray]:
    model = model_bundle["model"]
    device = model_bundle["device"]
    vlm_t = torch.from_numpy(np.asarray(vlm_feat, dtype=np.float32)).to(device)
    knn_t = torch.from_numpy(np.asarray(knn_mean, dtype=np.float32)).to(device)
    sim_t = torch.from_numpy(np.asarray(sim_feat, dtype=np.float32)).to(device)
    pred, alpha = model(vlm_t, knn_t, sim_t, force_alpha=None)
    return {
        "prediction": pred.detach().cpu().numpy().astype(np.float32),
        "gate": alpha.detach().cpu().numpy().astype(np.float32),
    }
