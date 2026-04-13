import { postJson } from './api';
import type { LoggedMeal } from './meal-log';

export interface DailyCoachFeedback {
  headline: string;
  summary: string;
  next_action: string;
  generated_at: string;
  meal_count: number;
}

export async function getDailyCoachFeedback(
  meals: LoggedMeal[],
  date: string,
  goalsSummary: string,
  profileSummary: string,
) {
  return postJson<DailyCoachFeedback>('/api/coach/daily-feedback', {
    meals,
    date,
    goalsSummary,
    profileSummary,
  });
}
