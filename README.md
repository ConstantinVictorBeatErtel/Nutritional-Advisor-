<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nutritional Advisor

This version uses a local Express API for meal-photo analysis and daily coaching.

- Meal photos go through `POST /api/vision/analyze`
- Daily coaching goes through `POST /api/coach/daily-feedback`
- Confirmed meals are stored locally and drive the dashboard plus the daily coach review

## Run Locally

1. Install dependencies:
   `npm install`
2. Create `.env.local`:

   ```bash
   AI_API_KEY="sk-or-v1-..."
   AI_HTTP_REFERER="http://127.0.0.1:3000"
   AI_APP_TITLE="Nutritional Advisor"
   AI_REVIEW_API_BASE_URL="http://127.0.0.1:8000"
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
