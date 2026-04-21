import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Leaf, Cake, Ruler, Dumbbell, Scale, Zap, Sparkles, Brain, ArrowRight, Check, PersonStanding, User, HeartPulse, ClipboardPenLine } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  calculateNutritionTargets,
  defaultProfile,
  getDiagnosedConditionLabel,
  getActivityLabel,
  getGoalLabel,
  type ActivityLevel,
  type DiagnosedCondition,
  type GoalDirection,
  type NutritionPlanPreference,
  type UserProfile,
  type WellnessObjective,
} from '../lib/profile';

interface OnboardingProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
}

const objectives: Array<{
  id: WellnessObjective;
  label: string;
  sub: string;
  icon: typeof Scale;
  color: string;
}> = [
  { id: 'weight', label: 'Optimize Weight', sub: 'Higher-protein, lower-carb emphasis', icon: Scale, color: 'text-primary' },
  { id: 'performance', label: 'Athletic Performance', sub: 'More training fuel from carbohydrates', icon: Zap, color: 'text-blue-600' },
  { id: 'vitality', label: 'Holistic Vitality', sub: 'Balanced, sustainable macro split', icon: Sparkles, color: 'text-orange-600' },
  { id: 'focus', label: 'Cognitive Focus', sub: 'Higher healthy fats for steadier energy', icon: Brain, color: 'text-zinc-600' },
];

const activityOptions: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra'];
const goalOptions: GoalDirection[] = ['lose', 'maintain', 'gain'];
const diagnosedConditionOptions: DiagnosedCondition[] = ['diabetes-pre-diabetes', 'depression-low-mood', 'sleep-difficulties', 'none'];
const nutritionPlanPreferenceOptions: Array<{
  id: Exclude<NutritionPlanPreference, ''>;
  label: string;
  sub: string;
}> = [
  { id: 'one-day-meal-plan', label: '1-Day Meal Plan', sub: 'Detailed calories and macros per meal for a single structured day.' },
  { id: 'one-week-meal-plan', label: '1-Week Meal Plan', sub: 'Daily calorie and macro targets spread across 7 varied days.' },
  { id: 'recommended-targets', label: 'Recommended Targets', sub: 'Just daily calorie and macro goals. No specific meals suggested.' },
  { id: 'intake-critique', label: 'Intake Critique', sub: 'Critique current intake and recommend specific adjustments.' },
];

export default function Onboarding({ initialProfile, onComplete }: OnboardingProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile ?? defaultProfile);
  const targets = useMemo(() => calculateNutritionTargets(profile), [profile]);
  const canSubmit = profile.name.trim().length > 0;

  const toggleDiagnosedCondition = (condition: DiagnosedCondition) => {
    setProfile((current) => {
      if (condition === 'none') {
        return { ...current, diagnosedConditions: ['none'] };
      }

      const withoutNone = current.diagnosedConditions.filter((value) => value !== 'none');
      const isSelected = withoutNone.includes(condition);
      const nextValues = isSelected
        ? withoutNone.filter((value) => value !== condition)
        : [...withoutNone, condition];

      return {
        ...current,
        diagnosedConditions: nextValues.length > 0 ? nextValues : ['none'],
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onComplete({ ...profile, name: profile.name.trim() });
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35vw] h-[35vw] bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 bg-white shadow-2xl rounded-3xl overflow-hidden z-10 relative min-h-[800px]"
      >
        <section className="md:col-span-4 bg-primary relative hidden md:flex flex-col justify-between p-12 text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr_i3DbK4h128uZp3bwpWWotPXjmLt1afaZ6D2aa3TaSxBmvPQYQz4Av291l4ApSBsj0FdxSGwD5L59ZZ0yI9qEQEExZfCuHLjz1i00cnpaFeL2zmAFrF2yiN6nGegKeA_GjD_Ho6UH3O28xmJTSscyjGmt1PdRxmrdd0hKYr_MPixeYuwjlD3fI4H8D-vzYJKWUmpaBtNAN5jc8SKifYHl3UYRsL1G0NJpRr1a7mElfT-KmtUPZhW-N4l5nv3NsdDMotwtmLeg13s"
              alt="Wellness"
              className="w-full h-full object-cover opacity-30 mix-blend-overlay"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-emerald-600/60" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <Leaf className="w-8 h-8 fill-white" />
              <span className="font-headline font-extrabold tracking-tighter text-2xl">NutriSnap</span>
            </div>
            <h1 className="font-headline text-5xl font-extrabold leading-[1.1] mb-6 tracking-tight">
              Nutrition targets that actually match your profile.
            </h1>
            <p className="text-lg opacity-90 font-light leading-relaxed max-w-sm">
              Calorie targets use BMR, activity level, and goal direction. Macro targets change with your primary wellness objective.
            </p>
          </div>
        </section>

        <section className="md:col-span-8 flex flex-col p-8 md:p-16 overflow-y-auto">
          <div className="mb-10">
            <span className="text-primary font-bold text-xs tracking-widest uppercase">Profile</span>
            <h2 className="font-headline text-3xl font-bold text-zinc-900 mt-2">Build your nutrition targets</h2>
            <p className="mt-3 text-zinc-500 max-w-2xl">
              Enter the basics once, then the dashboard and daily coach will compare your confirmed meals against these calculated targets.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <Field label="Your Name" icon={User}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </Field>
              <Field label="Age" icon={Cake}>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={profile.age}
                  onChange={(event) => setProfile((current) => ({ ...current, age: Number(event.target.value) || 0 }))}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </Field>
              <Field label="Height (cm)" icon={Ruler}>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={profile.heightCm}
                  onChange={(event) => setProfile((current) => ({ ...current, heightCm: Number(event.target.value) || 0 }))}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </Field>
              <Field label="Weight (kg)" icon={Scale}>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="0.1"
                  value={profile.weightKg}
                  onChange={(event) => setProfile((current) => ({ ...current, weightKg: Number(event.target.value) || 0 }))}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </Field>
              <Field label="Biological Sex" icon={PersonStanding}>
                <select
                  value={profile.biologicalSex}
                  onChange={(event) => setProfile((current) => ({ ...current, biologicalSex: event.target.value as UserProfile['biologicalSex'] }))}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Field label="Activity Level" icon={Dumbbell}>
                <div className="grid grid-cols-2 gap-3">
                  {activityOptions.map((activityLevel) => (
                    <button
                      key={activityLevel}
                      type="button"
                      onClick={() => setProfile((current) => ({ ...current, activityLevel }))}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition-all min-h-[88px] flex items-center',
                        profile.activityLevel === activityLevel
                          ? 'border-primary bg-emerald-50 text-zinc-900 shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <span className="block font-bold text-zinc-900 leading-snug">{getActivityLabel(activityLevel)}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Goal Direction" icon={ArrowRight}>
                <div className="grid grid-cols-3 gap-3">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setProfile((current) => ({ ...current, goal }))}
                      className={cn(
                        'rounded-2xl border px-3 py-4 text-center transition-all min-h-[88px] flex items-center justify-center',
                        profile.goal === goal
                          ? 'border-primary bg-emerald-50 text-zinc-900 shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <span className="block font-bold leading-snug text-base break-words max-w-[8ch]">
                        {goal === 'maintain' ? 'Maintenance' : getGoalLabel(goal)}
                      </span>
                    </button>
                  ))}
                </div>

                {profile.goal !== 'maintain' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Target weight (kg)"
                      value={profile.targetWeightKg ?? ''}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          targetWeightKg: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                      className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                    />
                    <input
                      type="number"
                      min="7"
                      placeholder="Timeline (days)"
                      value={profile.targetDays ?? ''}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          targetDays: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                      className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                ) : null}
              </Field>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-600 block mb-4">Primary Wellness Objective</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {objectives.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, wellnessObjective: goal.id }))}
                    className={cn(
                      'group relative flex flex-col p-5 rounded-2xl text-left transition-all active:scale-95 border-2 min-h-[166px]',
                      profile.wellnessObjective === goal.id
                        ? 'bg-white border-primary shadow-lg'
                        : 'bg-zinc-50 border-transparent hover:border-zinc-200',
                    )}
                  >
                    <goal.icon className={cn('w-8 h-8 mb-3', goal.color)} />
                    <span className="font-headline font-bold text-zinc-900">{goal.label}</span>
                    <span className="text-xs text-zinc-500 mt-1 leading-relaxed">{goal.sub}</span>
                    {profile.wellnessObjective === goal.id ? (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Field label="Diagnosed Conditions" icon={HeartPulse}>
                <div className="grid grid-cols-2 gap-3">
                  {diagnosedConditionOptions.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleDiagnosedCondition(condition)}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition-all min-h-[88px] flex items-center gap-3',
                        profile.diagnosedConditions.includes(condition)
                          ? 'border-primary bg-emerald-50 text-zinc-900 shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <span
                        className={cn(
                          'h-5 w-5 rounded-md border flex items-center justify-center shrink-0',
                          profile.diagnosedConditions.includes(condition)
                            ? 'border-primary bg-primary text-white'
                            : 'border-zinc-300 bg-white',
                        )}
                      >
                        {profile.diagnosedConditions.includes(condition) ? <Check className="w-3 h-3" /> : null}
                      </span>
                      <span className="block font-bold text-zinc-900 leading-snug">{getDiagnosedConditionLabel(condition)}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Nutrition Plan Type Preference" icon={ClipboardPenLine}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nutritionPlanPreferenceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProfile((current) => ({ ...current, nutritionPlanPreference: option.id }))}
                      className={cn(
                        'group relative flex flex-col rounded-2xl border p-5 text-left transition-all min-h-[152px]',
                        profile.nutritionPlanPreference === option.id
                          ? 'border-primary bg-emerald-50 shadow-sm'
                          : 'border-zinc-200 bg-white hover:border-zinc-300',
                      )}
                    >
                      <span className="font-headline font-bold text-zinc-900">{option.label}</span>
                      <span className="mt-2 text-sm leading-relaxed text-zinc-500">{option.sub}</span>
                      {profile.nutritionPlanPreference === option.id ? (
                        <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-6">
              <h3 className="text-lg font-bold text-zinc-900">Nutrition Math Summary</h3>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="BMR" value={`${targets.bmr} kcal`} />
                <Metric label="TDEE" value={`${targets.tdee} kcal`} />
                <Metric label="Target Calories" value={`${targets.targetCalories} kcal`} />
                <Metric label="Adjustment" value={`${targets.calorieAdjustment >= 0 ? '+' : ''}${targets.calorieAdjustment} kcal`} />
                <Metric label="Protein" value={`${targets.proteinG} g`} />
                <Metric label="Carbs" value={`${targets.carbsG} g`} />
                <Metric label="Fat" value={`${targets.fatG} g`} />
                <Metric
                  label="Macro Split"
                  value={`${Math.round(targets.macroPercentages.protein * 100)}/${Math.round(targets.macroPercentages.fat * 100)}/${Math.round(targets.macroPercentages.carbs * 100)}`}
                />
              </div>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Sanity check: calories come from Mifflin-St Jeor BMR, activity-based TDEE, and a capped daily adjustment toward your target weight. Macro grams come from the objective-based percentage split, converted using 4 kcal/g for protein and carbs plus 9 kcal/g for fats.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'w-full bg-gradient-to-br from-primary to-emerald-600 text-white font-headline font-bold py-5 px-8 rounded-2xl shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]',
                  canSubmit ? 'hover:shadow-emerald-900/20' : 'opacity-60 cursor-not-allowed',
                )}
              >
                Save Profile
                <ArrowRight className="w-5 h-5" />
              </button>
              {!canSubmit ? <p className="text-sm text-zinc-500">Enter your name to continue.</p> : null}
            </div>
          </form>
        </section>
      </motion.main>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Cake;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-semibold text-zinc-600 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-5 border border-zinc-100">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-zinc-900 leading-snug">{value}</p>
    </div>
  );
}
