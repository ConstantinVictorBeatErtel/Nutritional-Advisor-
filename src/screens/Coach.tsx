import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Sparkles, TrendingUp, CheckCircle, Scale, Bolt, Droplets } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Coach() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12"
    >
      {/* Hero */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-tertiary font-bold tracking-widest text-xs uppercase mb-2 block">Weekly Review</span>
            <h2 className="text-5xl font-extrabold tracking-tighter text-zinc-900 leading-none">
              Vitality <span className="text-primary italic">Momentum</span>
            </h2>
            <p className="mt-4 text-zinc-500 max-w-lg font-body leading-relaxed">
              Your metabolic efficiency increased by 12% this week. You're entering a state of sustained nutritional harmony.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 text-center min-w-[120px]">
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter mb-1">Consistency</p>
              <p className="text-3xl font-extrabold text-primary">94%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 text-center min-w-[120px]">
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter mb-1">Vitality Score</p>
              <p className="text-3xl font-extrabold text-secondary">88</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Caloric Rhythm */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Caloric Rhythm</h3>
              <p className="text-sm text-zinc-400">Actual vs. Budget (Last 7 Days)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase text-zinc-500">Intake</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-200" />
                <span className="text-[10px] font-bold uppercase text-zinc-500">Goal</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-zinc-50 rounded-t-xl relative h-48">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${[85, 92, 100, 115, 80, 75, 60][i]}%` }}
                    className={cn(
                      "absolute bottom-0 w-full rounded-t-xl transition-all duration-500",
                      i === 3 ? "bg-emerald-400" : "bg-primary"
                    )} 
                  />
                </div>
                <span className={cn("text-[10px] font-bold", i === 3 ? "text-emerald-600" : "text-zinc-400")}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Macro Precision */}
        <div className="col-span-12 lg:col-span-4 editorial-gradient rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight mb-1">Macro Precision</h3>
            <p className="text-white/70 text-sm mb-8">Weekly Balance</p>
            <div className="space-y-6">
              {[
                { label: 'Protein', val: '105%', w: '100%' },
                { label: 'Carbohydrates', val: '88%', w: '88%' },
                { label: 'Healthy Fats', val: '95%', w: '95%' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span>{m.label}</span>
                    <span>{m.val}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: m.w }}
                      className="h-full bg-white rounded-full" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium">Protein optimization achieved.</span>
            <CheckCircle className="w-5 h-5 fill-white text-primary" />
          </div>
        </div>

        {/* Coach's Corner */}
        <div className="col-span-12 bg-zinc-50 rounded-[3rem] p-1.5 border border-zinc-100">
          <div className="bg-white rounded-[2.8rem] p-8 md:p-12 flex flex-col lg:flex-row gap-12 items-start">
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-lg shadow-orange-900/5">
                  <BrainCircuit className="w-8 h-8 fill-orange-600/10" />
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold tracking-tighter text-zinc-900">Coach's Corner</h3>
                  <p className="text-sm text-orange-600 font-bold">AI-Powered Synthesis</p>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-sm italic text-zinc-600 leading-relaxed font-body">
                  "Elena, your metabolic data suggests a high adaptability to the increased protein load. Let's explore fiber-dense complex carbs next week to sustain that afternoon energy curve."
                </p>
              </div>
              <button className="w-full py-4 editorial-gradient text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/10 active:scale-95 transition-all">
                Request Specific Drilldown
              </button>
            </div>

            <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold tracking-tight text-lg">Key Insight</span>
                  </div>
                  <p className="text-zinc-600 font-body leading-relaxed">
                    Your sleep quality correlates 85% with your carbohydrate timing. Consuming 40% of your daily carbs before 2 PM significantly improved your deep sleep cycles this week.
                  </p>
                </div>
                <div className="h-[1px] w-full bg-zinc-100" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-bold tracking-tight text-lg">Performance Gain</span>
                  </div>
                  <p className="text-zinc-600 font-body leading-relaxed">
                    Resting heart rate dipped to 58 BPM on average, reflecting improved cardiovascular efficiency following the hydration adjustments suggested last Tuesday.
                  </p>
                </div>
              </div>
              <div className="relative rounded-[2rem] overflow-hidden min-h-[300px] group">
                <img
                  src="https://picsum.photos/seed/nourish/600/800"
                  alt="Recommended Meal"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent flex flex-col justify-end p-8">
                  <p className="text-white font-bold mb-1">Recommended Meal</p>
                  <p className="text-white/70 text-xs">Lemon-Tahini Harvest Bowl</p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] text-white font-bold uppercase tracking-widest">Recipe Inside</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Biometrics */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-zinc-50 p-8 rounded-[2.5rem] flex flex-col justify-between border border-zinc-100">
          <div>
            <Scale className="w-8 h-8 text-secondary mb-4" />
            <h4 className="text-lg font-bold text-zinc-900">Body Composition</h4>
            <p className="text-sm text-zinc-500 mb-6">Down 0.8kg since last Monday</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-900">64.2</span>
              <span className="text-zinc-400 font-bold">kg</span>
            </div>
          </div>
          <div className="mt-8">
            <div className="h-1.5 bg-zinc-200 rounded-full w-full">
              <div className="h-full bg-secondary rounded-full" style="width: 70%" />
            </div>
            <p className="text-[10px] font-bold text-secondary mt-2 uppercase tracking-widest">TARGET: 62.0kg</p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-zinc-50 p-8 rounded-[2.5rem] flex flex-col justify-between border border-zinc-100">
          <div>
            <Bolt className="w-8 h-8 text-orange-500 mb-4 fill-orange-500/10" />
            <h4 className="text-lg font-bold text-zinc-900">Energy Levels</h4>
            <p className="text-sm text-zinc-500 mb-6">Peak energy at 10:30 AM daily</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-900">High</span>
            </div>
          </div>
          <div className="mt-8 flex gap-1.5">
            {[1, 2, 3, 4].map((i) => <div key={i} className="flex-1 h-2 bg-orange-500 rounded-full" />)}
            <div className="flex-1 h-2 bg-zinc-200 rounded-full" />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-zinc-50 p-8 rounded-[2.5rem] flex items-center gap-6 border border-zinc-100">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin-slow flex items-center justify-center">
            <Droplets className="w-8 h-8 text-primary fill-primary/10" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-zinc-900">Hydration Flow</h4>
            <p className="text-sm text-zinc-500">2.4L average / day</p>
            <p className="text-primary font-bold text-xs mt-1">+15% vs Last Week</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
