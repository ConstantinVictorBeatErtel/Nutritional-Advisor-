<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nutritional Advisor

This version uses a local Express API for meal-photo analysis and daily coaching.

- Meal photos go through `POST /api/vision/analyze`
- Daily coaching goes through `POST /api/coach/daily-feedback`
- Confirmed meals are stored locally and drive the dashboard plus the daily coach review

## Run Locally

### One command: full local stack (vision + review LLM + API + web)

This app uses **two local Python services**: Vitality vision (meal photo) on port **8010**, and the nutrition review model (FastAPI) on port **8000**. The Express server already points at those defaults (`VISION_PYTHON_URL` / `AI_REVIEW_API_BASE_URL`).

1. Install Node dependencies: `npm install`
2. Copy `scripts/local-paths.env.example` to `scripts/local-paths.env` if your folders are not the defaults inside that file.
3. Ensure the review API venv has its dependencies (Unsloth, FastAPI, etc.); set `REVIEW_PYTHON` / `VISION_PYTHON` in `scripts/local-paths.env` if you use project-specific interpreters (for example the frozen bundle’s `.venv311arm2`).
4. Run everything:

   ```bash
   npm run start:local
   ```

   On macOS you can also double-click **`Start Local Stack.command`** in Finder.

5. Open `http://127.0.0.1:3000`. **No OpenRouter key is required** for the daily coach when the review service is running.

### Apple Silicon notes

- **Vision:** If the full RAMRL bundle is missing `phase1_encoder_nb_e3.pt` and/or `faiss_new.index`, the runtime automatically uses a **local CLIP prototype estimator** (OpenAI CLIP + curated food macros + your optional text hints). Weights download from Hugging Face on first use if the `vendor_models/...` tree has no checkpoint files. CLIP and the phase-1 fusion model run on **MPS** when available (`deploy_runtime.get_device`).
- **Review:** Default `REVIEW_MODE=mps` runs `scripts/review_mps_server.py` (**Qwen2.5-0.5B-Instruct** on MPS). Override with `NUTRITION_REVIEW_MODEL`. CUDA/Unsloth remains available as `REVIEW_MODE=full`.

### Manual run (API + web only, you start Python yourself)

1. Install dependencies:
   `npm install`
2. Create `.env.local` if needed:

   ```bash
   AI_REVIEW_API_BASE_URL="http://127.0.0.1:8000"
   VISION_PYTHON_URL="http://127.0.0.1:8010/api/vision/analyze"
   VITE_APP_API_BASE_URL="http://127.0.0.1:8787"
   ```

3. Start the local API:
   `npm run dev:api`
4. Start the frontend:
   `npm run dev`
5. Open:
   `http://127.0.0.1:3000`

## What Changed

- The dashboard now calculates calorie and macro targets from the nutrition math document using BMR, TDEE, goal adjustment, and macro formulas.
- The onboarding flow now saves a real profile instead of using fixed demo values.
- The coach screen now calls the attached nutrition review API contract (`POST /analyze` returning `{"advice": ...}`), with a timestamp and meal count.
