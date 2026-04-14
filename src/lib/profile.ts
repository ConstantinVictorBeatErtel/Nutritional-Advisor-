export type BiologicalSex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type GoalDirection = 'lose' | 'maintain' | 'gain';
export type WellnessObjective = 'weight' | 'performance' | 'vitality' | 'focus';
export type DiagnosedCondition = 'diabetes' | 'depression' | 'sleep-issues' | 'none';

export interface UserProfile {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
  activityLevel: ActivityLevel;
  goal: GoalDirection;
  targetWeightKg: number | null;
  targetDays: number | null;
  wellnessObjective: WellnessObjective;
  diagnosedCondition: DiagnosedCondition;
  nutritionPlanPreference: string;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  calorieAdjustment: number;
  macroPercentages: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

const STORAGE_KEY = 'nutritional-advisor.user-profile.v1';

export const defaultProfile: UserProfile = {
  name: '',
  age: 28,
  heightCm: 175,
  weightKg: 72,
  biologicalSex: 'male',
  activityLevel: 'moderate',
  goal: 'maintain',
  targetWeightKg: null,
  targetDays: null,
  wellnessObjective: 'weight',
  diagnosedCondition: 'none',
  nutritionPlanPreference: '',
};

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  very: 'Very active',
  extra: 'Extra active',
};

const goalLabels: Record<GoalDirection, string> = {
  lose: 'Weight loss',
  maintain: 'Maintenance',
  gain: 'Weight gain',
};

const objectiveLabels: Record<WellnessObjective, string> = {
  weight: 'Optimize Weight',
  performance: 'Athletic Performance',
  vitality: 'Holistic Vitality',
  focus: 'Cognitive Focus',
};

const diagnosedConditionLabels: Record<DiagnosedCondition, string> = {
  diabetes: 'Diabetes',
  depression: 'Depression',
  'sleep-issues': 'Sleep Issues',
  none: 'None',
};

const macroPercentagesByObjective: Record<
  WellnessObjective,
  Record<GoalDirection, { protein: number; fat: number; carbs: number }>
> = {
  weight: {
    lose: { protein: 0.4, fat: 0.35, carbs: 0.25 },
    maintain: { protein: 0.35, fat: 0.35, carbs: 0.3 },
    gain: { protein: 0.3, fat: 0.3, carbs: 0.4 },
  },
  performance: {
    lose: { protein: 0.35, fat: 0.25, carbs: 0.4 },
    maintain: { protein: 0.3, fat: 0.3, carbs: 0.4 },
    gain: { protein: 0.25, fat: 0.25, carbs: 0.5 },
  },
  vitality: {
    lose: { protein: 0.3, fat: 0.3, carbs: 0.4 },
    maintain: { protein: 0.3, fat: 0.3, carbs: 0.4 },
    gain: { protein: 0.25, fat: 0.25, carbs: 0.5 },
  },
  focus: {
    lose: { protein: 0.35, fat: 0.35, carbs: 0.3 },
    maintain: { protein: 0.3, fat: 0.35, carbs: 0.35 },
    gain: { protein: 0.25, fat: 0.35, carbs: 0.4 },
  },
};

export function loadUserProfile() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return { ...defaultProfile, ...parsed } as UserProfile;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function clampCalories(value: number) {
  return Math.max(1200, Math.round(value));
}

function clampPercentageTotals(percentages: { protein: number; fat: number; carbs: number }) {
  const total = percentages.protein + percentages.fat + percentages.carbs;
  if (Math.abs(total - 1) < 0.0001) {
    return percentages;
  }

  return {
    protein: percentages.protein / total,
    fat: percentages.fat / total,
    carbs: percentages.carbs / total,
  };
}

function calculateBmr(profile: UserProfile) {
  const base = (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * profile.age);
  return profile.biologicalSex === 'male' ? base + 5 : base - 161;
}

function calculateCalorieAdjustment(profile: UserProfile) {
  if (profile.goal === 'maintain') {
    return 0;
  }

  const currentWeight = profile.weightKg;
  const targetWeight = profile.targetWeightKg;
  const targetDays = profile.targetDays;

  if (!targetWeight || !targetDays || targetDays <= 0) {
    return profile.goal === 'lose' ? -400 : 300;
  }

  if (profile.goal === 'lose') {
    const deltaKg = Math.max(0, currentWeight - targetWeight);
    const dailyAdjustment = Math.min(500, (7700 * deltaKg) / targetDays);
    return -Math.round(dailyAdjustment || 400);
  }

  const deltaKg = Math.max(0, targetWeight - currentWeight);
  const dailyAdjustment = Math.min(500, (7700 * deltaKg) / targetDays);
  return Math.round(dailyAdjustment || 300);
}

export function calculateNutritionTargets(profile: UserProfile): NutritionTargets {
  const bmr = calculateBmr(profile);
  const tdee = bmr * activityMultipliers[profile.activityLevel];
  const calorieAdjustment = calculateCalorieAdjustment(profile);
  const targetCalories = clampCalories(tdee + calorieAdjustment);
  const macroPercentages = clampPercentageTotals(macroPercentagesByObjective[profile.wellnessObjective][profile.goal]);

  const proteinG = Math.max(0, Math.round((targetCalories * macroPercentages.protein) / 4));
  const fatG = Math.max(0, Math.round((targetCalories * macroPercentages.fat) / 9));
  const carbsG = Math.max(0, Math.round((targetCalories * macroPercentages.carbs) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    proteinG,
    fatG,
    carbsG,
    calorieAdjustment,
    macroPercentages,
  };
}

export function getGoalLabel(goal: GoalDirection) {
  return goalLabels[goal];
}

export function getActivityLabel(activityLevel: ActivityLevel) {
  return activityLabels[activityLevel];
}

export function getObjectiveLabel(wellnessObjective: WellnessObjective) {
  return objectiveLabels[wellnessObjective];
}

export function getDiagnosedConditionLabel(condition: DiagnosedCondition) {
  return diagnosedConditionLabels[condition];
}

export function buildProfileSummary(profile: UserProfile) {
  return [
    profile.name ? `Name: ${profile.name}` : null,
    `Age: ${profile.age}`,
    `Height: ${profile.heightCm} cm`,
    `Weight: ${profile.weightKg} kg`,
    `Biological sex for BMR math: ${profile.biologicalSex}`,
    `Activity level: ${getActivityLabel(profile.activityLevel)}`,
    `Goal: ${getGoalLabel(profile.goal)}`,
    `Primary objective: ${getObjectiveLabel(profile.wellnessObjective)}`,
    `Diagnosed conditions: ${getDiagnosedConditionLabel(profile.diagnosedCondition)}`,
    profile.nutritionPlanPreference.trim() ? `Nutrition plan type preference: ${profile.nutritionPlanPreference.trim()}` : null,
    profile.targetWeightKg ? `Target weight: ${profile.targetWeightKg} kg` : null,
    profile.targetDays ? `Target timeline: ${profile.targetDays} days` : null,
  ].filter(Boolean).join('\n');
}

export function buildGoalsSummary(targets: NutritionTargets) {
  return [
    `Target calories: ${targets.targetCalories} kcal`,
    `Protein target: ${targets.proteinG} g`,
    `Fat target: ${targets.fatG} g`,
    `Carb target: ${targets.carbsG} g`,
    `Macro split: ${Math.round(targets.macroPercentages.protein * 100)}% protein / ${Math.round(targets.macroPercentages.fat * 100)}% fat / ${Math.round(targets.macroPercentages.carbs * 100)}% carbs`,
    `BMR: ${targets.bmr} kcal`,
    `TDEE: ${targets.tdee} kcal`,
    `Daily calorie adjustment: ${targets.calorieAdjustment >= 0 ? '+' : ''}${targets.calorieAdjustment} kcal`,
  ].join('\n');
}
