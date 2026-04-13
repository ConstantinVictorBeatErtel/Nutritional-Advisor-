import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const API_KEY = process.env.AI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim();
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const APP_TITLE = process.env.AI_APP_TITLE?.trim() || process.env.OPENROUTER_APP_TITLE?.trim() || 'Nutritional Advisor';
const APP_REFERER = process.env.AI_HTTP_REFERER?.trim() || process.env.OPENROUTER_HTTP_REFERER?.trim() || process.env.APP_URL?.trim() || 'http://127.0.0.1:3000';
const VISION_MODEL = process.env.AI_VISION_MODEL?.trim() || process.env.OPENROUTER_VISION_MODEL?.trim() || 'moonshotai/kimi-k2.5:nitro';
const COACH_MODEL = process.env.AI_COACH_MODEL?.trim() || process.env.OPENROUTER_COACH_MODEL?.trim() || 'moonshotai/kimi-k2-thinking:nitro';

app.use(express.json({ limit: '15mb' }));
app.use((request, response, next) => {
  const origin = request.headers.origin || APP_REFERER;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
});

type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContentPart[];
}

interface LoggedMealPayload {
  id?: string;
  title?: string;
  mealType?: string;
  createdAt?: string;
  ingredientsText?: string;
  portionText?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  confidence?: number;
}

interface VisionRequestBody {
  imageDataUrl?: string;
  ingredientsText?: string;
  portionText?: string;
}

interface VisionResponseBody {
  meal_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  predicted_portion_g: number | null;
  prompt_text: string;
}

interface CoachRequestBody {
  date?: string;
  meals?: LoggedMealPayload[];
  goalsSummary?: string;
  profileSummary?: string;
}

interface CoachModelResponseBody {
  headline: string;
  summary: string;
  next_action: string;
}

interface CoachApiResponseBody extends CoachModelResponseBody {
  generated_at: string;
  meal_count: number;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function ensureApiKey() {
  if (!API_KEY) {
    const error = new Error('AI_API_KEY is missing. Add it to .env.local before starting the API server.');
    (error as Error & { status?: number }).status = 500;
    throw error;
  }
}

function normalizeNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.round(value * 10) / 10);
}

function clampUnitInterval(value: number, fallback = 0.5) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function extractMessageText(payload: unknown) {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        const text = (part as { text?: string }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }

  throw new Error('The AI service returned an empty response.');
}

function parseJsonResponse<T>(messageText: string): T {
  try {
    return JSON.parse(messageText) as T;
  } catch {
    const firstBrace = messageText.indexOf('{');
    const lastBrace = messageText.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(messageText.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error(`The AI service returned invalid JSON: ${messageText}`);
  }
}

async function callAi<T>({
  model,
  messages,
  schemaName,
  schema,
  temperature = 0.2,
  maxTokens = 700,
  reasoning,
}: {
  model: string;
  messages: ChatMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  reasoning?: Record<string, unknown>;
}): Promise<T> {
  ensureApiKey();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': APP_REFERER,
      'X-OpenRouter-Title': APP_TITLE,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(reasoning ? { reasoning } : {}),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`The AI request failed with status ${response.status}: ${rawText}`);
  }

  const payload = JSON.parse(rawText);
  const messageText = extractMessageText(payload);
  return parseJsonResponse<T>(messageText);
}

const visionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    meal_name: { type: 'string' },
    meal_type: {
      type: 'string',
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Meal'],
    },
    calories: { type: 'number' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    confidence: { type: 'number' },
    predicted_portion_g: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
    },
    prompt_text: { type: 'string' },
  },
  required: [
    'meal_name',
    'meal_type',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'confidence',
    'predicted_portion_g',
    'prompt_text',
  ],
};

const coachSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    next_action: { type: 'string' },
  },
  required: ['headline', 'summary', 'next_action'],
};

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    aiConfigured: Boolean(API_KEY),
  });
});

app.post('/api/vision/analyze', async (request, response) => {
  try {
    const body = request.body as VisionRequestBody;
    const imageDataUrl = body.imageDataUrl?.trim();

    if (!imageDataUrl) {
      response.status(400).json({ error: 'imageDataUrl is required.' });
      return;
    }

    const ingredientsText = body.ingredientsText?.trim() || 'Not provided';
    const portionText = body.portionText?.trim() || 'Not provided';

    const visionResult = await callAi<VisionResponseBody>({
      model: VISION_MODEL,
      schemaName: 'meal_analysis',
      schema: visionSchema,
      temperature: 0.1,
      maxTokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'Estimate meal name, meal type, calories, protein, carbs, fat, portion estimate, and confidence from the meal photo. Return only structured data.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Meal photo.\n` +
                `Ingredients hint: ${ingredientsText}\n` +
                `Portion hint: ${portionText}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      reasoning: { effort: 'none', exclude: true },
    });

    response.json({
      meal_name: visionResult.meal_name.trim() || 'Logged meal',
      meal_type: visionResult.meal_type || 'Meal',
      calories: normalizeNumber(visionResult.calories),
      protein_g: normalizeNumber(visionResult.protein_g),
      carbs_g: normalizeNumber(visionResult.carbs_g),
      fat_g: normalizeNumber(visionResult.fat_g),
      confidence: clampUnitInterval(visionResult.confidence, 0.72),
      predicted_portion_g:
        visionResult.predicted_portion_g == null ? null : normalizeNumber(visionResult.predicted_portion_g),
      prompt_text: visionResult.prompt_text,
      route: 'meal_photo_analysis',
      ingredients_text: body.ingredientsText?.trim() || null,
      portion_text: body.portionText?.trim() || null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    response.status(status).json({
      error: error instanceof Error ? error.message : 'Meal analysis failed.',
    });
  }
});

app.post('/api/coach/daily-feedback', async (request, response) => {
  try {
    const body = request.body as CoachRequestBody;
    const meals = Array.isArray(body.meals) ? body.meals : [];

    if (meals.length === 0) {
      response.json({
        headline: 'Log a meal to unlock today’s review.',
        summary: 'Once you confirm at least one meal, the coach will summarize what happened today and suggest the most important next move.',
        next_action: 'Confirm your first meal to generate a daily review.',
        generated_at: new Date().toISOString(),
        meal_count: 0,
      } satisfies CoachApiResponseBody);
      return;
    }

    const totals = meals.reduce<NutritionTotals>(
      (accumulator, meal) => {
        accumulator.calories += meal.calories || 0;
        accumulator.protein += meal.protein_g || 0;
        accumulator.carbs += meal.carbs_g || 0;
        accumulator.fat += meal.fat_g || 0;
        return accumulator;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const coachResult = await callAi<CoachModelResponseBody>({
      model: COACH_MODEL,
      schemaName: 'daily_coach_feedback',
      schema: coachSchema,
      temperature: 0.2,
      maxTokens: 1700,
      reasoning: { effort: 'low', exclude: true },
      messages: [
        {
          role: 'system',
          content:
            'Write a concise nutrition review from confirmed meals. Stay grounded, specific, supportive, and never invent metrics or patterns that are not present in the data. Return only structured data.',
        },
        {
          role: 'user',
          content:
            `Create a short daily nutrition review for ${body.date || 'today'}.\n\n` +
            `Profile context:\n${body.profileSummary || 'Not provided'}\n\n` +
            `Nutrition targets:\n${body.goalsSummary || 'Not provided'}\n\n` +
            `Daily totals:\n` +
            `- Calories: ${normalizeNumber(totals.calories)} kcal\n` +
            `- Protein: ${normalizeNumber(totals.protein)} g\n` +
            `- Carbs: ${normalizeNumber(totals.carbs)} g\n` +
            `- Fat: ${normalizeNumber(totals.fat)} g\n\n` +
            `Meals:\n${JSON.stringify(meals, null, 2)}\n\n` +
            'Return only three fields: a short headline, a plain-language summary of how the day compares to the targets, and one next action for the rest of today or tomorrow.',
        },
      ],
    });

    response.json({
      ...coachResult,
      generated_at: new Date().toISOString(),
      meal_count: meals.length,
    } satisfies CoachApiResponseBody);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    response.status(status).json({
      error: error instanceof Error ? error.message : 'Daily feedback failed.',
    });
  }
});

app.listen(PORT, () => {
  console.log(
    JSON.stringify(
      {
        status: 'listening',
        port: PORT,
        aiConfigured: Boolean(API_KEY),
      },
      null,
      2,
    ),
  );
});
