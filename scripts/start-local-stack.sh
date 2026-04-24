#!/usr/bin/env bash
# Start vision (8010), review LLM (8000), Express (8787), and Vite (3000) together.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATHS_FILE="$ROOT/scripts/local-paths.env"
if [[ -f "$PATHS_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$PATHS_FILE"
fi

VITALITY_RUNTIME_DIR="${VITALITY_RUNTIME_DIR:-/Users/ConstiX/Downloads/vitality_food_demo_frozen_20260409/runtime}"
NUTRITION_REVIEW_DIR="${NUTRITION_REVIEW_DIR:-/Users/ConstiX/Downloads/consumer prompt engineering}"
# Frozen runtime venv includes faiss/torch for vision; system python3 usually does not.
VISION_PYTHON="${VISION_PYTHON:-/Users/ConstiX/Downloads/vitality_food_demo_frozen_20260409/.venv311arm2/bin/python}"
REVIEW_PYTHON="${REVIEW_PYTHON:-$ROOT/.venv/bin/python}"
# mps = Qwen2.5 via PyTorch MPS (Apple Silicon). full = Unsloth+CUDA. stub = placeholder only.
REVIEW_MODE="${REVIEW_MODE:-mps}"

VISION_PORT="${VISION_PORT:-8010}"
REVIEW_PORT="${REVIEW_PORT:-8000}"

if [[ ! -f "$VITALITY_RUNTIME_DIR/vision_api_server.py" ]]; then
  echo "Missing vision server at $VITALITY_RUNTIME_DIR/vision_api_server.py"
  echo "Set VITALITY_RUNTIME_DIR in scripts/local-paths.env (see local-paths.env.example)."
  exit 1
fi

REVIEW_API_DIR="$ROOT"
if [[ "$REVIEW_MODE" == "full" ]]; then
  if [[ -f "$ROOT/api_server.py" ]]; then
    REVIEW_API_DIR="$ROOT"
  elif [[ -f "$NUTRITION_REVIEW_DIR/api_server.py" ]]; then
    REVIEW_API_DIR="$NUTRITION_REVIEW_DIR"
  else
    echo "Missing Unsloth review API: expected $ROOT/api_server.py or $NUTRITION_REVIEW_DIR/api_server.py"
    echo "Set NUTRITION_REVIEW_DIR in scripts/local-paths.env (see local-paths.env.example)."
    exit 1
  fi
fi

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # npm/vite may have spawned child Node processes
  for j in $(jobs -p 2>/dev/null || true); do
    kill "$j" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

port_busy() {
  lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
}

for p in "$VISION_PORT" "$REVIEW_PORT" 8787 3000; do
  if port_busy "$p"; then
    echo "Port $p is already in use. Stop the other process or change ports in .env / scripts."
    exit 1
  fi
done

export AI_REVIEW_API_BASE_URL="http://127.0.0.1:${REVIEW_PORT}"
export VISION_PYTHON_URL="http://127.0.0.1:${VISION_PORT}/api/vision/analyze"
export VITE_APP_API_BASE_URL="${VITE_APP_API_BASE_URL:-http://127.0.0.1:8787}"

echo "Starting vision service on :${VISION_PORT}..."
(
  cd "$VITALITY_RUNTIME_DIR"
  exec "$VISION_PYTHON" vision_api_server.py --host 127.0.0.1 --port "$VISION_PORT"
) &
PIDS+=("$!")

if [[ "$REVIEW_MODE" == "full" ]]; then
  echo "Starting review LLM (Unsloth/CUDA) on :${REVIEW_PORT} — first load can take several minutes..."
  (
    cd "$REVIEW_API_DIR"
    exec "$REVIEW_PYTHON" -c "
import uvicorn
from api_server import app
uvicorn.run(app, host='127.0.0.1', port=${REVIEW_PORT})
"
  ) &
elif [[ "$REVIEW_MODE" == "mps" ]]; then
  echo "Starting review LLM (PyTorch MPS) on :${REVIEW_PORT} — first run may download model weights..."
  (
    cd "$ROOT"
    exec "$REVIEW_PYTHON" scripts/review_mps_server.py --host 127.0.0.1 --port "$REVIEW_PORT"
  ) &
else
  echo "Starting review stub on :${REVIEW_PORT} (set REVIEW_MODE=mps or full for a real model)..."
  (
    cd "$ROOT"
    exec "$REVIEW_PYTHON" scripts/review_stub_server.py --host 127.0.0.1 --port "$REVIEW_PORT"
  ) &
fi
PIDS+=("$!")

echo "Waiting for Python services (review model may take several minutes on first load)..."
for i in $(seq 1 900); do
  vision_ok=0
  review_ok=0
  curl -sf "http://127.0.0.1:${VISION_PORT}/health" >/dev/null 2>&1 && vision_ok=1 || true
  curl -sf "http://127.0.0.1:${REVIEW_PORT}/health" >/dev/null 2>&1 && review_ok=1 || true
  if [[ "$vision_ok" -eq 1 ]] && [[ "$review_ok" -eq 1 ]]; then
    break
  fi
  if ! kill -0 "${PIDS[0]}" 2>/dev/null || ! kill -0 "${PIDS[1]}" 2>/dev/null; then
    echo "A Python service exited early. Check logs above."
    exit 1
  fi
  if (( i % 30 == 0 )); then
    echo "  ... still waiting (${i}s). Vision ok=${vision_ok} review ok=${review_ok}"
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:${VISION_PORT}/health" >/dev/null; then
  echo "Vision service did not respond on :${VISION_PORT}/health (timed out after 900s or process died)."
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${REVIEW_PORT}/health" >/dev/null; then
  echo "Review API did not respond on :${REVIEW_PORT}/health (timed out after 900s or process died)."
  exit 1
fi

echo "Starting Express and Vite..."
export PORT="${PORT:-8787}"

npm run dev:api &
PIDS+=("$!")
npm run dev &
PIDS+=("$!")

echo ""
echo "Stack running (local models, no OpenRouter key required for coach):"
echo "  Vision:  http://127.0.0.1:${VISION_PORT}/api/vision/analyze"
echo "  Review:  http://127.0.0.1:${REVIEW_PORT}/analyze"
echo "  API:     http://127.0.0.1:8787"
echo "  App:     http://127.0.0.1:3000"
echo "Press Ctrl+C to stop all services."
wait
