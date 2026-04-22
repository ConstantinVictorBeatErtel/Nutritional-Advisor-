import React from 'react';
import { motion } from 'motion/react';
import { Plus, Settings2, ClipboardList, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { sumMeals, type LoggedMeal } from '../lib/meal-log';
import {
  getActivityLabel,
  getDiagnosedConditionsLabel,
  getGoalLabel,
  getNutritionPlanPreferenceLabel,
  getObjectiveLabel,
  type NutritionTargets,
  type UserProfile,
} from '../lib/profile';

interface DashboardProps {
  meals: LoggedMeal[];
  profile: UserProfile;
  nutritionTargets: NutritionTargets;
  onLogMeal: () => void;
  onEditProfile: () => void;
  onRemoveMeal: (mealId: string) => void;
}

function formatPercent(current: number, target: number) {
  if (!target) {
    return '0%';
  }
  return `${Math.round((current / target) * 100)}%`;
}

function progressWidth(current: number, target: number) {
  if (!target) {
    return '0%';
  }
  return `${Math.max(0, Math.min(100, Math.round((current / target) * 100)))}%`;
}

export default function Dashboard({
  meals,
  profile,
  nutritionTargets,
  onLogMeal,
  onEditProfile,
  onRemoveMeal,
}: DashboardProps) {
  const totals = sumMeals(meals);
  const remainingCalories = Math.max(0, nutritionTargets.targetCalories - Math.round(totals.calories));
  const todayHeading = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const macroCards = [
    {
      label: 'Protein',
      current: Math.round(totals.protein),
      target: nutritionTargets.proteinG,
      color: 'text-primary',
      bar: 'bg-primary',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Carbs',
      current: Math.round(totals.carbs),
      target: nutritionTargets.carbsG,
      color: 'text-secondary',
      bar: 'bg-secondary',
      bg: 'bg-blue-50',
    },
    {
      label: 'Fat',
      current: Math.round(totals.fat),
      target: nutritionTargets.fatG,
      color: 'text-tertiary',
      bar: 'bg-tertiary',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-7xl mx-auto w-full space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-3">
            Your Daily
            <br />
            <span className="text-primary">Targets</span>
          </h2>
          <p className="text-zinc-500 max-w-2xl text-lg leading-relaxed">
            <span className="font-semibold text-zinc-700">{todayHeading}.</span>{' '}
            {meals.length > 0
              ? `You've logged ${meals.length} meal${meals.length === 1 ? '' : 's'} today (older days stay saved but are hidden here). Totals and the coach use only today’s entries.`
              : 'No meals logged yet today. Log a meal photo to build today’s totals; past days remain in storage for history.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onEditProfile}
            className="flex items-center gap-3 bg-white text-zinc-900 px-6 py-4 rounded-2xl font-bold shadow-sm border border-zinc-100 hover:bg-zinc-50 transition-all active:scale-95"
          >
            <Settings2 className="w-5 h-5" />
            Edit Profile
          </button>
          <button
            onClick={onLogMeal}
            className="flex items-center gap-3 editorial-gradient text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Log Meal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <div className="flex justify-between items-start gap-4 mb-8">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Calorie Target</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter text-zinc-900">{Math.round(totals.calories)}</span>
                <span className="text-zinc-400 text-xl">/ {nutritionTargets.targetCalories} kcal</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-primary font-bold text-2xl">{remainingCalories}</span>
              <p className="text-xs text-zinc-400">Remaining</p>
            </div>
          </div>

          <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden mb-8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progressWidth(totals.calories, nutritionTargets.targetCalories) }}
              className="h-full editorial-gradient rounded-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {macroCards.map((macro) => (
              <div key={macro.label} className={cn('rounded-3xl p-5 border border-zinc-100', macro.bg)}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{macro.label}</p>
                <p className={cn('mt-3 text-3xl font-extrabold tracking-tight', macro.color)}>{macro.current}g</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Goal {macro.target}g • {formatPercent(macro.current, macro.target)}
                </p>
                <div className="w-full bg-black/5 h-2 rounded-full mt-5">
                  <motion.div initial={{ width: 0 }} animate={{ width: progressWidth(macro.current, macro.target) }} className={cn('h-full rounded-full', macro.bar)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Nutrition Math</h3>
          <div className="space-y-5">
            <DetailRow label="Goal" value={getGoalLabel(profile.goal)} />
            <DetailRow label="Primary Objective" value={getObjectiveLabel(profile.wellnessObjective)} />
            <DetailRow label="Diagnosed Conditions" value={getDiagnosedConditionsLabel(profile.diagnosedConditions)} />
            <DetailRow label="Plan Preference" value={getNutritionPlanPreferenceLabel(profile.nutritionPlanPreference)} />
            <DetailRow label="Activity Level" value={getActivityLabel(profile.activityLevel)} />
            <DetailRow label="BMR" value={`${nutritionTargets.bmr} kcal`} />
            <DetailRow label="TDEE" value={`${nutritionTargets.tdee} kcal`} />
            <DetailRow
              label="Calorie Adjustment"
              value={`${nutritionTargets.calorieAdjustment >= 0 ? '+' : ''}${nutritionTargets.calorieAdjustment} kcal`}
            />
            {profile.targetWeightKg ? <DetailRow label="Target Weight" value={`${profile.targetWeightKg} kg`} /> : null}
            {profile.targetDays ? <DetailRow label="Target Timeline" value={`${profile.targetDays} days`} /> : null}
          </div>
        </section>

        <section className="xl:col-span-12 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today&apos;s meals</h3>
              <p className="mt-2 text-sm text-zinc-500">Confirmed today only. Remove a row to delete it from your log.</p>
            </div>
            <ClipboardList className="w-5 h-5 text-zinc-300" />
          </div>

          {meals.length > 0 ? (
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="flex flex-col md:flex-row md:items-center gap-4 rounded-2xl bg-zinc-50 px-5 py-5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">{meal.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-zinc-900">{meal.title}</h4>
                    <p className="text-sm text-zinc-500">
                      {meal.mealType} • {new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {(meal.ingredientsText || meal.portionText) ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        {[meal.ingredientsText, meal.portionText].filter(Boolean).join(' • ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-zinc-600 md:flex-1">
                    <Stat label="Calories" value={`${Math.round(meal.calories)} kcal`} />
                    <Stat label="Protein" value={`${Math.round(meal.protein_g)}g`} />
                    <Stat label="Carbs" value={`${Math.round(meal.carbs_g)}g`} />
                    <Stat label="Fat" value={`${Math.round(meal.fat_g)}g`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Remove this meal from your log?')) {
                        onRemoveMeal(meal.id);
                      }
                    }}
                    className="self-end md:self-center p-3 rounded-2xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    aria-label={`Remove ${meal.title}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500">
              No confirmed meals yet. Use the photo logger to create your first real entry.
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-bold text-zinc-900 text-right">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[78px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-1 font-bold text-zinc-900">{value}</p>
    </div>
  );
}
