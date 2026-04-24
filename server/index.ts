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
const REVIEW_API_BASE_URL = (process.env.AI_REVIEW_API_BASE_URL?.trim() || 'http://127.0.0.1:8000').replace(/\/$/, '');
const PYTHON_VISION_URL = (process.env.VISION_PYTHON_URL?.trim() || 'http://127.0.0.1:8010/api/vision/analyze').replace(/\/$/, '');

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

interface PythonVisionResponseBody {
  meal_name?: string;
  meal_type?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  predicted_portion_g: number | null;
  prompt_text?: string;
  route?: string;
  ingredients_text?: string | null;
  portion_text?: string | null;
}

interface CoachRequestBody {
  date?: string;
  meals?: LoggedMealPayload[];
  goalsSummary?: string;
  profileSummary?: string;
}

interface CoachApiResponseBody {
  advice: string;
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

function parseDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    const error = new Error('imageDataUrl must be a valid base64-encoded image data URL.');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const [, mimeType, base64Payload] = match;
  return {
    mimeType,
    buffer: Buffer.from(base64Payload, 'base64'),
  };
}

function guessFileExtension(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

async function callPythonVisionService({
  imageDataUrl,
  ingredientsText,
  portionText,
}: {
  imageDataUrl: string;
  ingredientsText?: string;
  portionText?: string;
}): Promise<PythonVisionResponseBody> {
  const { mimeType, buffer } = parseDataUrl(imageDataUrl);
  const ingredients = ingredientsText?.trim() || '';
  const portion = portionText?.trim() || '';
  const description = [ingredients && `Ingredients: ${ingredients}`, portion && `Portion: ${portion}`]
    .filter(Boolean)
    .join('\n');

  const formData = new FormData();
  formData.append('image', new Blob([buffer], { type: mimeType }), `upload.${guessFileExtension(mimeType)}`);

  if (ingredients) {
    formData.append('ingredients_text', ingredients);
  }
  if (portion) {
    formData.append('portion_text', portion);
  }
  if (description) {
    formData.append('description', description);
  }

  const pythonResponse = await fetch(PYTHON_VISION_URL, {
    method: 'POST',
    body: formData,
  });

  const rawText = await pythonResponse.text();
  if (!pythonResponse.ok) {
    const error = new Error(`Python vision service failed with status ${pythonResponse.status}: ${rawText}`);
    (error as Error & { status?: number }).status = 502;
    throw error;
  }

  return JSON.parse(rawText) as PythonVisionResponseBody;
}

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    aiConfigured: Boolean(API_KEY),
    reviewApiConfigured: Boolean(REVIEW_API_BASE_URL),
    visionPythonConfigured: Boolean(PYTHON_VISION_URL),
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

    const visionResult = await callPythonVisionService({
      imageDataUrl,
      ingredientsText: body.ingredientsText,
      portionText: body.portionText,
    });

    response.json({
      meal_name: visionResult.meal_name?.trim() || 'Logged meal',
      meal_type: visionResult.meal_type || 'Meal',
      calories: normalizeNumber(visionResult.calories),
      protein_g: normalizeNumber(visionResult.protein_g),
      carbs_g: normalizeNumber(visionResult.carbs_g),
      fat_g: normalizeNumber(visionResult.fat_g),
      confidence: clampUnitInterval(visionResult.confidence, 0.72),
      predicted_portion_g:
        visionResult.predicted_portion_g == null ? null : normalizeNumber(visionResult.predicted_portion_g),
      prompt_text: visionResult.prompt_text || 'Meal analysis completed.',
      route: visionResult.route || 'python_vision_service',
      ingredients_text: visionResult.ingredients_text ?? body.ingredientsText?.trim() ?? null,
      portion_text: visionResult.portion_text ?? body.portionText?.trim() ?? null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    response.status(status).json({
      error: error instanceof Error ? error.message : 'Meal analysis failed.',
    });
  }
});

function inferUserGroup(profileSummary: string) {
  const diagnosedConditions = extractProfileField(profileSummary, 'Diagnosed conditions').toLowerCase();

  const hasDiabetes = diagnosedConditions.includes('diabetes');
  const hasDepression = diagnosedConditions.includes('depression') || diagnosedConditions.includes('low mood');
  const hasSleep = diagnosedConditions.includes('sleep');
  const hasNone =
    diagnosedConditions.includes('none of the above') || diagnosedConditions.includes('none reported');

  if (hasNone) {
    return 'Adult/Standard Health';
  }
  if (hasDiabetes && hasDepression) {
    return 'Adult/Diabetes+Depression';
  }
  if (hasDiabetes) {
    return 'Adult/Diabetes Risk';
  }
  if (hasDepression) {
    return 'Adult/Mental Health Risk';
  }
  if (hasSleep) {
    return 'Adult/Sleep Risk';
  }

  const text = profileSummary.toLowerCase();
  if (text.includes('cognitive focus')) {
    return 'Adult/Mental Health Risk';
  }
  return 'Adult/Standard Health';
}

function extractProfileField(profileSummary: string, field: string) {
  const match = profileSummary.match(new RegExp(`^${field}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
}

function normalizeAdviceFromReview(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const t = String(value).trim();
    return t.length > 0 ? t : null;
  }
  if (Array.isArray(value)) {
    const t = value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n').trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

function extractAdviceFromReviewPayload(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const keys = ['advice', 'Advice', 'message', 'response', 'output', 'text', 'content'];
  for (const key of keys) {
    if (key in record) {
      const normalized = normalizeAdviceFromReview(record[key]);
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

/** Review services should return JSON `{ "advice": "..." }`; tolerate fences, extra text, and plain-text fallbacks. */
function parseReviewApiJsonBody(rawText: string): { advice: string } {
  const trimmed = rawText.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error('The review API returned an empty body.');
  }

  const tryParse = (jsonStr: string): unknown => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  let parsed: unknown = tryParse(trimmed);

  if (parsed == null) {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      parsed = tryParse(fence[1].trim());
    }
  }

  if (parsed == null) {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      parsed = tryParse(trimmed.slice(first, last + 1));
    }
  }

  if (parsed == null) {
    if (!trimmed.startsWith('<')) {
      return { advice: trimmed };
    }
    throw new Error(`The review API returned non-JSON. First 200 chars: ${trimmed.slice(0, 200)}`);
  }

  const advice = extractAdviceFromReviewPayload(parsed);
  if (!advice) {
    throw new Error(
      `The review API JSON had no usable advice field. Snippet: ${trimmed.slice(0, 320)}`,
    );
  }
  return { advice };
}

function buildReviewPrompt(body: CoachRequestBody, totals: NutritionTotals) {
  const profileSummary = body.profileSummary || '';
  const age = extractProfileField(profileSummary, 'Age');
  const weight = extractProfileField(profileSummary, 'Weight');
  const height = extractProfileField(profileSummary, 'Height');
  const goal = extractProfileField(profileSummary, 'Goal') || 'Maintenance';
  const diagnosedConditions = extractProfileField(profileSummary, 'Diagnosed conditions');
  const nutritionPlanPreference = extractProfileField(profileSummary, 'Nutrition plan type preference');
  const userGroup = inferUserGroup(profileSummary);
  const conditions =
    diagnosedConditions ||
    (userGroup.includes('Diabetes')
      ? 'Diabetes'
      : userGroup.includes('Mental Health')
        ? 'Depression risk'
        : userGroup.includes('Sleep')
          ? 'Sleep difficulties'
          : 'None reported');

  const meals = Array.isArray(body.meals) ? body.meals : [];
  const mealLines = meals
    .map((meal) => {
      const mealName = meal.title || meal.mealType || 'Meal';
      return `- ${mealName}: ${Math.round(meal.calories || 0)}cal | P:${Math.round(meal.protein_g || 0)}g | F:${Math.round(meal.fat_g || 0)}g | C:${Math.round(meal.carbs_g || 0)}g`;
    })
    .join('\n');

  const pref = nutritionPlanPreference?.toLowerCase() ?? '';

  return [
    `[USER GROUP: ${userGroup}]`,
    `CRITICAL: This user has been classified as [USER GROUP: ${userGroup}]. You MUST apply all rules for this user group. DO NOT re-evaluate or override this classification.`,
    `Age: ${age || '28'} | Gender: ${extractProfileField(profileSummary, 'Biological sex for BMR math') || 'Unknown'} | Weight: ${weight || 'Unknown'} | Height: ${height || 'Unknown'}`,
    `Diagnosed conditions: ${conditions}. RULE: Because this user has ${conditions}, you MUST use the ${userGroup} system prompt rules. Skip your own safety check — it has already been done.`,
    `Nutrition plan preference: ${nutritionPlanPreference || 'No stated preference'}`,
    ...(meals.length > 0
      ? [
          'Current Intake:',
          `  Total:     ${Math.round(totals.calories)}cal | P:${Math.round(totals.protein)}g | F:${Math.round(totals.fat)}g | C:${Math.round(totals.carbs)}g`,
          mealLines,
        ]
      : []),
    '',
    'Note: Always refer to the user as "User" not "Patient" in your response. IMPORTANT: Only apply condition-specific safety rules if conditions are EXPLICITLY listed in the Conditions field above. If Conditions says "None of the above" or "None reported", treat this user as a completely healthy adult with NO medical conditions. Do NOT infer, assume, or mention diabetes, depression, or any other condition. Do NOT reject the request based on inferred conditions. Always refer to the user as "User" not "Patient".',
    `Goal: ${goal}`,
    `Targets:\n${body.goalsSummary || 'Not provided'}`,
    meals.length === 0
      ? `Request: The user has not logged any meals yet. Based on their profile and targets, provide: ${
          pref.includes('week')
            ? 'a 7-day meal plan with daily calorie and macro targets.'
            : pref.includes('day')
              ? 'a detailed 1-day meal plan with calories and macros per meal.'
              : pref.includes('target')
                ? 'recommended daily calorie and macro targets only, no specific meals.'
                : pref.includes('critique')
                  ? 'general dietary advice and recommendations based on their profile.'
                  : 'a personalised nutrition plan and practical dietary advice.'
        }`
      : `Request: Review today's intake against the targets and provide: ${
          pref.includes('week')
            ? 'a 7-day meal plan adjustment.'
            : pref.includes('day')
              ? 'a corrected 1-day meal plan.'
              : pref.includes('target')
                ? 'recommended target adjustments only.'
                : pref.includes('critique')
                  ? "a critique of today's intake with specific adjustments."
                  : 'practical diet advice.'
        }`,
  ].join('\n');
}

app.post('/api/coach/daily-feedback', async (request, response) => {
  try {
    const body = request.body as CoachRequestBody;
    const meals = Array.isArray(body.meals) ? body.meals : [];

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
    let reviewResponse: Response;
    try {
      reviewResponse = await fetch(`${REVIEW_API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: buildReviewPrompt(body, totals),
        }),
      });
    } catch (fetchError) {
      const reason = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const isNetwork =
        reason === 'fetch failed' ||
        (fetchError instanceof TypeError && /fetch|network|ECONNREFUSED|ENOTFOUND|certificate/i.test(reason));
      if (isNetwork) {
        throw new Error(
          `Could not reach the review API at ${REVIEW_API_BASE_URL}/analyze (${reason}). ` +
            'If this was a Colab Cloudflare URL, it expires when the notebook stops—open API_Calling.ipynb, start a new tunnel, and set AI_REVIEW_API_BASE_URL in .env.local to the new base URL (no trailing slash). ' +
            'For local coaching, run the review server on port 8000 (e.g. `npm run start:local` or `python scripts/review_mps_server.py`) and use AI_REVIEW_API_BASE_URL=http://127.0.0.1:8000.',
        );
      }
      throw fetchError;
    }

    const rawText = await reviewResponse.text();
    if (!reviewResponse.ok) {
      throw new Error(`The review API failed with status ${reviewResponse.status}: ${rawText}`);
    }

    const { advice } = parseReviewApiJsonBody(rawText);

    response.json({
      advice,
      generated_at: new Date().toISOString(),
      meal_count: meals.length,
    } satisfies CoachApiResponseBody);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Daily feedback failed.';
    if (!response.headersSent) {
      response.status(status).json({ error: message });
    }
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
