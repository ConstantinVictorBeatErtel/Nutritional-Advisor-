"""Daily nutrition review API for Apple Silicon (MPS): same contract as Unsloth `api_server.py`.

POST /analyze  JSON {"prompt": "..."}  →  {"advice": "..."}
GET  /health → {"status": "ok", "mode": "mps", "model": "..."}

Set NUTRITION_REVIEW_MODEL to override the default Hugging Face model id.
First run downloads weights (~1GB for the default 0.5B instruct model).
"""
from __future__ import annotations

import argparse
import os

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


def _generate_advice(user_text: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user_text},
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
    with torch.no_grad():
        out = _model.generate(
            input_ids,
            max_new_tokens=MAX_NEW,
            do_sample=True,
            temperature=0.35,
            top_p=0.92,
            pad_token_id=_tokenizer.eos_token_id,
        )
    new_tokens = out[0, input_ids.shape[1] :]
    text = _tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return text or "(Empty generation — try again or shorten the prompt.)"


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "mode": "mps", "model": MODEL_ID, "device": _device})


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
