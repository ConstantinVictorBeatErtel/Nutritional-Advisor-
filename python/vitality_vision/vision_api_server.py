import argparse
import json
import os
import platform
import re
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

import numpy as np

from deploy_runtime import (
    DEFAULT_CLIP_MODEL_ID,
    default_release_paths,
    encode_retrieval_image,
    encode_vlm_feature,
    estimate_nutrition_clip_prototypes,
    infer_release_dir,
    infer_vlm_dim_from_release,
    load_clip_bundle,
    load_phase1_encoder,
    load_phase3_model,
    load_release_config,
    load_train_targets,
    predict_phase3,
    resolve_release_path,
    retrieval_encoder_bundle_present,
    search_knn,
)


GRAM_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*g\b", re.IGNORECASE)
PORTION_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?\s*(?:g|grams?|oz|ounces?|cup|cups|bowl|bowls|slice|slices|piece|pieces|serving|servings))",
    re.IGNORECASE,
)


class VisionService:
    def __init__(self, release_dir: str, device: Optional[str] = None, allow_remote: bool = False):
        self.release_dir = infer_release_dir(release_dir)
        self.device = device
        self.allow_remote = allow_remote
        self.paths = default_release_paths(self.release_dir)
        self.config = load_release_config(self.release_dir)
        self.local_files_only = bool(self.config.get("local_files_only", True)) and not allow_remote
        self.prompt_name = self.config.get("default_prompt", "A")
        self.clip_model_id = resolve_release_path(
            self.config.get("clip_model_id_or_path"),
            self.release_dir,
        ) or self.config.get("clip_model_id", DEFAULT_CLIP_MODEL_ID)
        self.retrieval_only = should_use_retrieval_only()
        self.retrieval_k = load_retrieval_k(self.paths["residual_stats"])
        force_proto = os.environ.get("VITALITY_FORCE_PROTOTYPE", "").strip().lower() in {"1", "true", "yes", "on"}
        self._prototype_fallback = force_proto or (not retrieval_encoder_bundle_present(self.paths))

        self._encoder_bundle = None
        self._clip_bundle = None
        self._phase3_bundle = None
        self._train_targets = None

    def _ensure_loaded(self) -> None:
        if self._prototype_fallback:
            if self._clip_bundle is None:
                try:
                    self._clip_bundle = load_clip_bundle(
                        model_id=self.clip_model_id,
                        device=self.device,
                        local_files_only=self.local_files_only,
                    )
                except OSError:
                    # Vendor tree may contain tokenizer/config only; fetch weights once from HF hub.
                    self._clip_bundle = load_clip_bundle(
                        model_id=DEFAULT_CLIP_MODEL_ID,
                        device=self.device,
                        local_files_only=False,
                    )
            return
        if self._encoder_bundle is None:
            self._encoder_bundle = load_phase1_encoder(
                self.paths["phase1_encoder"],
                device=self.device,
                model_id_or_path=resolve_release_path(
                    self.config.get("phase1_model_id_or_path"),
                    self.release_dir,
                ),
                local_files_only=self.local_files_only,
            )
        if self._train_targets is None:
            self._train_targets = load_train_targets(self.paths["train_targets"])
        if self.retrieval_only:
            return
        if self._clip_bundle is None:
            self._clip_bundle = load_clip_bundle(
                model_id=self.clip_model_id,
                device=self.device,
                local_files_only=self.local_files_only,
            )
        if self._phase3_bundle is None:
            self._phase3_bundle = load_phase3_model(
                model_weights_path=self.paths["phase3b_model"],
                residual_stats_path=self.paths["residual_stats"],
                vlm_dim=infer_vlm_dim_from_release(self.release_dir),
                device=self.device,
            )

    def analyze(
        self,
        image_path: str,
        description: str = "",
        ingredients_text: Optional[str] = None,
        portion_text: Optional[str] = None,
    ) -> Dict:
        self._ensure_loaded()
        if not ingredients_text and not portion_text:
            ingredients_text, portion_text = split_description(description)
        if self._prototype_fallback:
            pred_vec, max_sim, dbg = estimate_nutrition_clip_prototypes(
                image_path,
                self._clip_bundle,
                ingredients_text,
                portion_text,
                self.paths["train_targets"],
            )
            prediction = np.asarray(pred_vec, dtype=np.float32).reshape(4)
            gate = np.full((4,), 0.62, dtype=np.float32)
            knn_mean = prediction.copy()
            neighbor_scores = np.array([max_sim, max_sim * 0.92, max_sim * 0.85], dtype=np.float32)
            return build_frontend_payload(
                prediction=prediction,
                gate=gate,
                knn_mean=knn_mean,
                neighbor_scores=neighbor_scores,
                prompt_name=self.prompt_name,
                prompt_text=dbg,
                ingredients_text=ingredients_text,
                portion_text=portion_text,
                route_override="clip_prototype_local_fallback",
            )
        retrieval_vec = encode_retrieval_image(image_path, self._encoder_bundle)
        k = self.retrieval_k if self.retrieval_only else int(self._phase3_bundle["stats"].get("k", 10))
        knn = search_knn(self.paths["faiss_index"], retrieval_vec, self._train_targets, k=k)
        if self.retrieval_only:
            return build_frontend_payload(
                prediction=knn["knn_mean"][0],
                gate=np.ones(4, dtype=np.float32),
                knn_mean=knn["knn_mean"][0],
                neighbor_scores=knn["neighbor_scores"][0],
                prompt_name=self.prompt_name,
                prompt_text="retrieval-only fallback",
                ingredients_text=ingredients_text,
                portion_text=portion_text,
                route_override="phase2_retrieval_knn_fallback",
            )
        vlm_feat, prompt_text = encode_vlm_feature(
            image_path=image_path,
            clip_bundle=self._clip_bundle,
            prompt_name=self.prompt_name,
            ingredients_text=ingredients_text,
            portion_text=portion_text,
        )
        pred = predict_phase3(
            self._phase3_bundle,
            vlm_feat=vlm_feat,
            knn_mean=knn["knn_mean"],
            sim_feat=knn["sim_feat"],
        )
        return build_frontend_payload(
            prediction=pred["prediction"][0],
            gate=pred["gate"][0],
            knn_mean=knn["knn_mean"][0],
            neighbor_scores=knn["neighbor_scores"][0],
            prompt_name=self.prompt_name,
            prompt_text=prompt_text,
            ingredients_text=ingredients_text,
            portion_text=portion_text,
        )


def split_description(description: str) -> tuple[Optional[str], Optional[str]]:
    text = (description or "").strip()
    if not text:
        return None, None
    portion_match = PORTION_PATTERN.search(text)
    portion_text = portion_match.group(1) if portion_match else None
    ingredients_text = text
    return ingredients_text, portion_text


def infer_predicted_portion_g(portion_text: Optional[str]) -> Optional[float]:
    if not portion_text:
        return None
    grams = [float(x) for x in GRAM_PATTERN.findall(portion_text)]
    if not grams:
        return None
    return float(sum(grams))


def build_frontend_payload(
    prediction: np.ndarray,
    gate: np.ndarray,
    knn_mean: np.ndarray,
    neighbor_scores: np.ndarray,
    prompt_name: str,
    prompt_text: str,
    ingredients_text: Optional[str],
    portion_text: Optional[str],
    route_override: Optional[str] = None,
) -> Dict:
    calories, fat_g, protein_g, carbs_g = [float(x) for x in prediction.tolist()]
    gate_mean = float(np.mean(gate))
    top_score = float(np.max(neighbor_scores))
    confidence = max(0.0, min(0.99, 0.55 * gate_mean + 0.45 * top_score))
    predicted_portion_g = infer_predicted_portion_g(portion_text)
    return {
        "calories": calories,
        "fat_g": fat_g,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "confidence": confidence,
        "route": route_override or f"phase3b_clip_prompt_{prompt_name}_ramrl",
        "predicted_portion_g": predicted_portion_g,
        "prompt_text": prompt_text,
        "ingredients_text": ingredients_text,
        "portion_text": portion_text,
        "debug": {
            "gate_mean": gate_mean,
            "knn_mean": {
                "calories_kcal": float(knn_mean[0]),
                "fat_g": float(knn_mean[1]),
                "protein_g": float(knn_mean[2]),
                "carbohydrate_g": float(knn_mean[3]),
            },
            "top_neighbor_score": top_score,
        },
    }


class VisionRequestHandler(BaseHTTPRequestHandler):
    server_version = "VitalityVisionHTTP/0.1"

    @property
    def vision_service(self) -> VisionService:
        return self.server.vision_service

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            vs = getattr(self.server, "vision_service", None)
            payload = {
                "status": "ok",
                "prototype_fallback": bool(getattr(vs, "_prototype_fallback", False)),
            }
            self._write_json(HTTPStatus.OK, payload)
            return
        self._write_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/vision/analyze":
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return

        try:
            form = self._parse_multipart_form()
            upload = form.get("image")
            if not upload or not upload.get("filename") or upload.get("content") is None:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "Missing image upload"})
                return

            description = form.get("description", {}).get("value", "")
            ingredients_text = form.get("ingredients_text", {}).get("value", "").strip() or None
            portion_text = form.get("portion_text", {}).get("value", "").strip() or None
            temp_path = self._write_temp_file(upload["filename"], upload["content"])
            try:
                result = self.vision_service.analyze(
                    temp_path,
                    description=description,
                    ingredients_text=ingredients_text,
                    portion_text=portion_text,
                )
            finally:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

            self._write_json(HTTPStatus.OK, result)
        except Exception as exc:
            self._write_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def _parse_multipart_form(self) -> Dict:
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise ValueError("Content-Type must be multipart/form-data")
        boundary_token = "boundary="
        if boundary_token not in content_type:
            raise ValueError("Missing multipart boundary")
        boundary = content_type.split(boundary_token, 1)[1].strip().strip('"')
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        delimiter = ("--" + boundary).encode("utf-8")

        form = {}
        for part in body.split(delimiter):
            part = part.strip()
            if not part or part == b"--":
                continue
            headers_blob, _, content = part.partition(b"\r\n\r\n")
            headers_lines = headers_blob.decode("utf-8", errors="ignore").split("\r\n")
            headers = {}
            for line in headers_lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    headers[key.strip().lower()] = value.strip()
            disposition = headers.get("content-disposition", "")
            name_match = re.search(r'name="([^"]+)"', disposition)
            if not name_match:
                continue
            field_name = name_match.group(1)
            filename_match = re.search(r'filename="([^"]*)"', disposition)
            payload = content[:-2] if content.endswith(b"\r\n") else content
            if filename_match:
                form[field_name] = {
                    "filename": filename_match.group(1),
                    "content": payload,
                    "content_type": headers.get("content-type", "application/octet-stream"),
                }
            else:
                form[field_name] = {"value": payload.decode("utf-8", errors="ignore")}
        return form

    def _write_temp_file(self, filename: str, content: bytes) -> str:
        suffix = Path(filename).suffix or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(content)
            return temp.name

    def _write_json(self, status: HTTPStatus, payload: Dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def build_server(host: str, port: int, release_dir: str, device: Optional[str], allow_remote: bool):
    service = VisionService(release_dir=release_dir, device=device, allow_remote=allow_remote)
    server = ThreadingHTTPServer((host, port), VisionRequestHandler)
    server.vision_service = service
    return server


def should_use_retrieval_only() -> bool:
    override = os.environ.get("VITALITY_RETRIEVAL_ONLY", "").strip().lower()
    if override in {"1", "true", "yes", "on"}:
        return True
    if override in {"0", "false", "no", "off"}:
        return False
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def load_retrieval_k(residual_stats_path: str) -> int:
    with open(residual_stats_path, "r", encoding="utf-8") as fh:
        stats = json.load(fh)
    return int(stats.get("k", 10))


def main() -> None:
    parser = argparse.ArgumentParser(description="Local HTTP server for the Vitality food logging frontend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--release-dir", default=None)
    parser.add_argument("--device", default=None)
    parser.add_argument("--allow-remote", action="store_true")
    args = parser.parse_args()

    release_dir = infer_release_dir(args.release_dir)
    server = build_server(
        host=args.host,
        port=args.port,
        release_dir=release_dir,
        device=args.device,
        allow_remote=args.allow_remote,
    )
    print(
        json.dumps(
            {
                "status": "starting",
                "host": args.host,
                "port": args.port,
                "release_dir": release_dir,
                "endpoint": f"http://{args.host}:{args.port}/api/vision/analyze",
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
