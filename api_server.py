import re
import torch
from unsloth import FastLanguageModel
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 模型加载 ──────────────────────────────────────────────────
print("Loading model...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="lizdongberkeleyedu/nutrition_training_model",
    max_seq_length=2048,
    dtype=None,
    load_in_4bit=True,
)
FastLanguageModel.for_inference(model)
model.eval()
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print("Model loaded ✅")


# ── Prompt Engineering ────────────────────────────────────────
def get_system_prompt(user_group, age):
    SAFETY_RULES = (
        "SAFETY RULES — check BEFORE generating any plan:\n"
        "- If requested calories < 1000/day for adults → REJECT, explain risks, give safe alternative\n"
        "- If weight loss goal > 1kg/week → REJECT, explain physiological limits, redirect\n"
        "- If target weight would result in BMI < 18.5 → REJECT, redirect to weight gain\n"
        "- If user is already underweight (BMI < 18.5) + requests weight loss → REJECT regardless of group\n"
        "- If user requests zero carb + has depression → REJECT, explain serotonin/tryptophan pathway\n"
        "- If user requests zero carb + has diabetes → REJECT, explain hypoglycaemia risk\n"
        "- If user requests protein-only (zero fat + zero carb) → REJECT, explain rabbit starvation syndrome\n"
        "- If user requests OMAD + has diabetes → REJECT, explain blood glucose instability risk\n"
        "- If user requests high-GI foods (white rice, white bread, sugary drinks) + has diabetes → REJECT, provide low-GI alternative\n"
        "- If any pediatric case requests weight loss → REJECT, redirect to weight gain\n"
        "- If triple risk (underweight + diabetes + depression) → REJECT all restriction, strong redirect to weight gain\n"
        "When REJECTING: (1) acknowledge intent, (2) explain why with specific numbers, "
        "(3) redirect to safe goal, (4) provide corrected targets + meal plan, (5) recommend doctor consultation.\n"
    )
    if "Pediatric" in user_group and age < 6:
        return (
            "You are a pediatric diet advisor for toddlers under 6. STRICT RULES:\n"
            "1. ONLY recommend soft/mashed/pureed foods suitable for toddlers\n"
            "2. FORBIDDEN: grilled meat, raw salad, tacos, adult portions\n"
            "3. ALWAYS start response with: ⚠️ Pediatric case - soft foods only\n"
            "4. Provide FULL day: Breakfast + Mid-Morning Snack + Lunch + Afternoon Snack + Dinner\n"
            "5. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "6. Weight loss is STRICTLY FORBIDDEN for underweight children\n"
            "\n" + SAFETY_RULES
        )
    elif "Pediatric" in user_group and age >= 6:
        return (
            "You are a pediatric diet advisor for children and teenagers. STRICT RULES:\n"
            "1. Recommend age-appropriate foods suitable for teenagers\n"
            "2. ALWAYS start response with: ⚠️ Pediatric case - age-appropriate foods\n"
            "3. Provide FULL day: Breakfast + Mid-Morning Snack + Lunch + Afternoon Snack + Dinner\n"
            "4. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "5. Weight loss is STRICTLY FORBIDDEN for underweight children\n"
            "6. Account for growth and activity needs\n"
            "\n" + SAFETY_RULES
        )
    elif "Diabetes+Depression" in user_group:
        return (
            "You are a clinical diet advisor for patients with both diabetes and depression. STRICT RULES:\n"
            "1. ONLY recommend low-GI foods\n"
            "2. FORBIDDEN: white rice, white bread, sugary drinks, zero-carb diets, protein-only diets\n"
            "3. Prioritize omega-3 rich foods (salmon, walnuts, flaxseed) for mood support\n"
            "4. Provide FULL day: Breakfast + Lunch + Dinner + Snack\n"
            "5. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "6. ALWAYS warn about blood glucose monitoring AND mood/sleep impact\n"
            "\n" + SAFETY_RULES
        )
    elif "Diabetes" in user_group:
        return (
            "You are a clinical diet advisor for diabetic patients. STRICT RULES:\n"
            "1. ONLY recommend low-GI foods\n"
            "2. FORBIDDEN: white rice, white bread, sugary drinks\n"
            "3. Provide FULL day: Breakfast + Lunch + Dinner + Snack\n"
            "4. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "5. ALWAYS warn about blood glucose monitoring\n"
            "\n" + SAFETY_RULES
        )
    elif "Mental Health" in user_group:
        return (
            "You are a clinical diet advisor for patients with mental health risk. STRICT RULES:\n"
            "1. Prioritize omega-3 rich foods (salmon, walnuts, flaxseed) and consistent meal timing\n"
            "2. FORBIDDEN: zero-carb diets (disrupts serotonin synthesis)\n"
            "3. Provide FULL day: Breakfast + Lunch + Dinner + Snack\n"
            "4. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "5. ALWAYS mention sleep and mood impact of dietary choices\n"
            "\n" + SAFETY_RULES
        )
    elif "Underweight" in user_group:
        return (
            "You are a clinical diet advisor for underweight patients. STRICT RULES:\n"
            "1. Weight loss is STRICTLY FORBIDDEN — always redirect to weight gain\n"
            "2. Provide FULL day: Breakfast + Lunch + Dinner + Snack\n"
            "3. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "4. Focus on calorie-dense, nutrient-rich whole foods\n"
            "\n" + SAFETY_RULES
        )
    else:
        return (
            "You are a clinical diet advisor. STRICT RULES:\n"
            "1. Provide FULL day: Breakfast + Lunch + Dinner + Snack\n"
            "2. Every meal MUST show exact calories and macros (cal | P | F | C)\n"
            "3. Be concise — no cooking tips, no shopping lists unless requested\n"
            "\n" + SAFETY_RULES
        )


def generate_nutrition_response(user_input_prompt):
    match_group = re.search(r'\[USER GROUP: ([^\]]+)\]', user_input_prompt)
    match_age   = re.search(r'Age:\s*(\d+)', user_input_prompt)
    user_group  = match_group.group(1) if match_group else ""
    age         = int(match_age.group(1)) if match_age else 99

    system_prompt = get_system_prompt(user_group, age)
    formatted_prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_input_prompt}<|im_end|>\n"
        "<|im_start|>assistant\n<think>\n\n</think>\n"
    )
    inputs  = tokenizer(formatted_prompt, return_tensors="pt").to(device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=2400,
        temperature=0.3,
        do_sample=True,
        repetition_penalty=1.1,
        eos_token_id=tokenizer.encode("<|im_end|>")[0],
    )
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response.split("</think>")[-1].strip()


# ── FastAPI ───────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/analyze")
async def options_analyze():
    return JSONResponse({}, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    })

class UserPrompt(BaseModel):
    prompt: str

@app.post("/analyze")
async def analyze(user_input: UserPrompt):
    result = generate_nutrition_response(user_input.prompt)
    return JSONResponse(
        {"advice": result},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"}, headers={"Access-Control-Allow-Origin": "*"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
