export interface LoggedMeal {
  id: string;
  title: string;
  mealType: string;
  createdAt: string;
  ingredientsText: string;
  portionText: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  route?: string;
}

const STORAGE_KEY = 'nutritional-advisor.logged-meals.v1';

export function loadLoggedMeals(): LoggedMeal[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(Boolean) as LoggedMeal[];
  } catch {
    return [];
  }
}

export function saveLoggedMeals(meals: LoggedMeal[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

export function sumMeals(meals: LoggedMeal[]) {
  return meals.reduce(
    (accumulator, meal) => {
      accumulator.calories += meal.calories || 0;
      accumulator.protein += meal.protein_g || 0;
      accumulator.carbs += meal.carbs_g || 0;
      accumulator.fat += meal.fat_g || 0;
      return accumulator;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
