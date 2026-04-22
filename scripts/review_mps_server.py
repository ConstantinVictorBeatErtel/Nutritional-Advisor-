"""Daily nutrition review API for Apple Silicon (MPS): same contract as Unsloth `api_server.py`.

POST /analyze  JSON {"prompt": "..."}  →  {"advice": "..."}
GET  /health → {"status": "ok", "mode": "mps", "model": "..."}

Environment:
- NUTRITION_REVIEW_MODEL — HF model id (default: Qwen2.5-0.5B-Instruct).
- NUTRITION_REVIEW_MAX_INPUT_TOKENS / NUTRITION_REVIEW_MAX_NEW_TOKENS — trim work per request.
- NUTRITION_REVIEW_FAST=1 — short, tip-only replies via low-temperature sampling (not greedy; avoids echoing intake lines).
- NUTRITION_REVIEW_FAST_MAX_NEW — max new tokens in fast mode (default 220).

First run downloads weights (~1GB for the default 0.5B instruct model).
"""
from __future__ import annotations

import argparse
import os
import re

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import uvicorn

MODEL_ID = os.environ.get("NUTRITION_REVIEW_MODEL", "Qwen/Qwen2.5-0.5B-Instruct").strip()
MAX_INPUT_TOKENS = int(os.environ.get("NUTRITION_REVIEW_MAX_INPUT_TOKENS", "3072"))
MAX_NEW = int(os.environ.get("NUTRITION_REVIEW_MAX_NEW_TOKENS", "768"))
FAST = os.environ.get("NUTRITION_REVIEW_FAST", "").strip().lower() in {"1", "true", "yes", "on"}
FAST_MAX_NEW = int(os.environ.get("NUTRITION_REVIEW_FAST_MAX_NEW", "220"))

if torch.cuda.is_available():
    _device = "cuda"
elif torch.backends.mps.is_available():
    _device = "mps"
else:
    _device = "cpu"

print(f"Loading review model {_device}: {MODEL_ID} ...")
_tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if _device != "cpu" else torch.float32,
    trust_remote_code=True,
)
_model.eval()
_model.to(_device)
print("Review model ready.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserPrompt(BaseModel):
    prompt: str


SYSTEM = (
    "You are a careful nutrition coach. The user message contains structured intake data, "
    "health context, and goals. Give specific, practical guidance. Mention calories and macros "
    "when relevant. Do not claim to diagnose disease; encourage professional care when needed."
)

# Fast mode: tiny models + greedy decoding often parrot the intake block; we force "tip only" and use sampling.
SYSTEM_FAST = (
    "You are a nutrition coach. The next message is CONTEXT (profile, intake, targets)—not text to repeat.\n"
    "Reply with exactly ONE short coaching tip: 2–4 sentences, under 90 words, plain prose.\n"
    "Must: one clear next action (what to eat, adjust, or prioritize today).\n"
    "Forbidden: copying calorie or macro lines from context; listing totals; bullet lists that only mirror "
    "the log; phrases like 'Total:', 'Current Intake', or restating every meal line. "
    "You may cite at most ONE number if it sharpens the tip (e.g. protein gap). "
    "No preamble ('Here is…') and no sign-off. No diagnosis; suggest a clinician when serious."
)

OUTPUT_CONTRACT = (
    "\n\n---\nOutput: Write ONLY the coaching tip above, following the system rules. Stop after the tip."
)


def _trim_fast_output(text: str) -> str:
    """Keep the first coherent block; small models sometimes append echoed intake."""
    if not FAST or not text:
        return text
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not parts:
        return text
    first = parts[0]
    # Drop a leading line that still looks like a copied total row
    lines = first.split("\n")
    kept: list[str] = []
    for ln in lines:
        s = ln.strip()
        if re.match(r"^Total:\s*", s, re.I):
            continue
        if re.match(r"^Current Intake", s, re.I):
            continue
        if re.match(r"^-\s+.+\d+\s*cal\s*\|", s):
            continue
        kept.append(ln)
    return "\n".join(kept).strip() or first


def _generate_advice(user_text: str) -> str:
    system = SYSTEM_FAST if FAST else SYSTEM
    user_body = user_text + (OUTPUT_CONTRACT if FAST else "")
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_body},
    ]
    input_ids = _tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    if input_ids.shape[-1] > MAX_INPUT_TOKENS:
        input_ids = input_ids[:, -MAX_INPUT_TOKENS:]
    input_ids = input_ids.to(_device)
    max_new = min(FAST_MAX_NEW, MAX_NEW) if FAST else MAX_NEW
    gen_kw: dict = {
        "pad_token_id": _tokenizer.eos_token_id,
        "repetition_penalty": 1.12,
    }
    if FAST:
        # Greedy decode often regurgitates structured intake; light sampling stays fast and more coherent.
        gen_kw["do_sample"] = True
        gen_kw["temperature"] = 0.22
        gen_kw["top_p"] = 0.88
    else:
        gen_kw["do_sample"] = True
        gen_kw["temperature"] = 0.35
        gen_kw["top_p"] = 0.92
    with torch.no_grad():
        out = _model.generate(input_ids, max_new_tokens=max_new, **gen_kw)
    new_tokens = out[0, input_ids.shape[1] :]
    text = _tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    text = _trim_fast_output(text)
    return text or "(Empty generation — try again or shorten the prompt.)"


@app.get("/health")
async def health():
    return JSONResponse(
        {"status": "ok", "mode": "mps", "model": MODEL_ID, "device": _device, "fast": FAST},
    )


@app.post("/analyze")
async def analyze(body: UserPrompt):
    advice = _generate_advice(body.prompt)
    return JSONResponse({"advice": advice})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
