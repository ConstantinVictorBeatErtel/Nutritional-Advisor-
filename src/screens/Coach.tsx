import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, LoaderCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { getDailyCoachFeedback, type DailyCoachFeedback } from '../lib/coach';
import { sumMeals, todayLocalDateKey, type LoggedMeal } from '../lib/meal-log';
import {
  buildGoalsSummary,
  buildProfileSummary,
  getGoalLabel,
  type NutritionTargets,
  type UserProfile,
} from '../lib/profile';

interface CoachProps {
  meals: LoggedMeal[];
  profile: UserProfile;
  nutritionTargets: NutritionTargets;
  onRemoveMeal: (mealId: string) => void;
}

const FALLBACK_FEEDBACK: DailyCoachFeedback = {
  advice: 'Loading your review…',
  generated_at: new Date().toISOString(),
  meal_count: 0,
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function splitAdvice(advice: string) {
  return advice
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

export default function Coach({ meals, profile, nutritionTargets, onRemoveMeal }: CoachProps) {
  const [feedback, setFeedback] = useState<DailyCoachFeedback>(FALLBACK_FEEDBACK);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const totals = useMemo(() => sumMeals(meals), [meals]);

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const nextFeedback = await getDailyCoachFeedback(
        meals,
        todayLocalDateKey(),
        buildGoalsSummary(nutritionTargets),
        buildProfileSummary(profile),
      );
      setFeedback(nextFeedback);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown coach error.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, [meals, profile, nutritionTargets]);

  const adviceSections = splitAdvice(feedback.advice);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-tertiary font-bold tracking-widest text-xs uppercase mb-2 block">Daily Coach</span>
          <h2 className="text-5xl font-extrabold tracking-tighter text-zinc-900 leading-none">
            Today&apos;s <span className="text-primary italic">Review</span>
          </h2>
          <p className="mt-4 text-zinc-500 max-w-2xl leading-relaxed">
            This review uses today&apos;s confirmed meals (your local calendar date), your profile, and calculated targets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFeedback()}
          disabled={isLoading}
          className="flex items-center gap-3 editorial-gradient text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-70"
        >
          {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Refresh Review
        </button>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <BrainCircuit className="w-7 h-7 fill-orange-600/10" />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900">Nutrition Review</h3>
              <div className="mt-4 space-y-4 max-w-3xl">
                {adviceSections.map((section, index) => (
                  <p key={index} className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                    {section}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-50 border border-zinc-100 px-5 py-4 text-sm text-zinc-500 min-w-[240px]">
            <p>Generated {formatDateTime(feedback.generated_at)}</p>
            <p className="mt-1">
              Based on {feedback.meal_count} confirmed meal{feedback.meal_count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Target vs Logged</h3>
          <div className="space-y-5">
            <GoalRow label="Goal" current={getGoalLabel(profile.goal)} target="" />
            <GoalRow label="Calories" current={`${Math.round(totals.calories)} kcal`} target={`${nutritionTargets.targetCalories} kcal`} />
            <GoalRow label="Protein" current={`${Math.round(totals.protein)} g`} target={`${nutritionTargets.proteinG} g`} />
            <GoalRow label="Carbs" current={`${Math.round(totals.carbs)} g`} target={`${nutritionTargets.carbsG} g`} />
            <GoalRow label="Fat" current={`${Math.round(totals.fat)} g`} target={`${nutritionTargets.fatG} g`} />
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Confirmed Meals</h3>
          {meals.length > 0 ? (
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="rounded-2xl bg-zinc-50 px-5 py-4 border border-zinc-100">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900">{meal.title}</p>
                      <p className="text-sm text-zinc-500">
                        {meal.mealType} • {new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <p className="font-bold text-zinc-900">{Math.round(meal.calories)} kcal</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Remove this meal from today’s log?')) {
                            onRemoveMeal(meal.id);
                          }
                        }}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label={`Remove ${meal.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(meal.ingredientsText || meal.portionText) ? (
                    <p className="mt-2 text-sm text-zinc-500">{[meal.ingredientsText, meal.portionText].filter(Boolean).join(' • ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500">
              No confirmed meals yet.
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function GoalRow({ label, current, target }: { label: string; current: string; target: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold text-zinc-900">{current}</span>
        {target ? <p className="text-xs text-zinc-400">Target {target}</p> : null}
      </div>
    </div>
  );
}
