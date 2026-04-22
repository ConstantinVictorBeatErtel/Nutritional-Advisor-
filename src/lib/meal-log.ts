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

/** Cap stored entries so localStorage stays bounded (multi-day history). */
export const MAX_LOGGED_MEALS = 500;

/** Calendar date in the user's local timezone (YYYY-MM-DD). */
export function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalDateKey(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const day = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filterMealsForLocalDate(meals: LoggedMeal[], ymd: string): LoggedMeal[] {
  if (!ymd) {
    return [];
  }
  return meals.filter((meal) => localDateKeyFromIso(meal.createdAt) === ymd);
}

export function removeMealById(meals: LoggedMeal[], id: string): LoggedMeal[] {
  return meals.filter((meal) => meal.id !== id);
}

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
