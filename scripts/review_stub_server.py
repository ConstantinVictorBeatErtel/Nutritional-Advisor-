"""Lightweight review API compatible with Express `POST /analyze` → `{"advice": ...}`.

Use when the full Unsloth/CUDA stack is unavailable (e.g. macOS). Set REVIEW_MODE=full
in the environment and use the real `api_server.py` on a CUDA machine.
"""
from __future__ import annotations

import argparse
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

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


def _stub_advice(prompt: str) -> str:
    cal = None
    m = re.search(r"Total:\s+(\d+)\s*cal", prompt, re.I)
    if m:
        cal = int(m.group(1))
    group_m = re.search(r"\[USER GROUP:\s*([^\]]+)\]", prompt)
    group = group_m.group(1).strip() if group_m else "general"
    lines = [
        "This response uses the **local stub reviewer** (no Unsloth/CUDA model on this machine).",
        f"Detected profile bucket: **{group}**.",
    ]
    if cal is not None:
        lines.append(f"Logged intake today is about **{cal} kcal** from the meals you confirmed.")
    lines.append(
        "For a full neural review, run `consumer prompt engineering/api_server.py` on hardware "
        "with CUDA and set `REVIEW_MODE=full` in `scripts/local-paths.env`, or point `REVIEW_PYTHON` "
        "at a venv where Unsloth works."
    )
    lines.append(
        "Meanwhile: keep protein spread across meals, favor whole foods, and align the next meal "
        "with your stated targets from onboarding."
    )
    return "\n\n".join(lines)


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "mode": "stub"})


@app.post("/analyze")
async def analyze(user_input: UserPrompt):
    return JSONResponse({"advice": _stub_advice(user_input.prompt)})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
