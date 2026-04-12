import React from 'react';
import { motion } from 'motion/react';
import { Plus, Info, Apple, Salad, Cookie, Droplets } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  onLogMeal: () => void;
}

export default function Dashboard({ onLogMeal }: DashboardProps) {
  const macros = [
    { label: 'PROTEIN', value: '142g', goal: '95% of goal', color: 'text-primary' },
    { label: 'CARBS', value: '186g', goal: '72% of goal', color: 'text-secondary' },
    { label: 'FATS', value: '64g', goal: '84% of goal', color: 'text-tertiary' },
  ];

  const logs = [
    { title: 'Wild Berry Smoothie Bowl', type: 'Breakfast', time: '8:30 AM', cal: 342, img: 'https://picsum.photos/seed/smoothie/200/200' },
    { title: 'Grilled Chicken & Kale Salad', type: 'Lunch', time: '1:15 PM', cal: 580, img: 'https://picsum.photos/seed/salad/200/200' },
    { title: 'Apple with Almond Butter', type: 'Snack', time: '4:00 PM', cal: 195, img: 'https://picsum.photos/seed/apple/200/200' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12"
    >
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-2">
            Your Daily<br />
            <span className="editorial-gradient bg-clip-text text-transparent">Vitality.</span>
          </h2>
          <p className="text-zinc-500 max-w-md text-lg font-body leading-relaxed">
            Fueling your body with intention. You're 82% towards your hydration goal today.
          </p>
        </div>
        <button 
          onClick={onLogMeal}
          className="flex items-center gap-3 editorial-gradient text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Log Meal
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Calorie Card */}
        <div className="md:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-20 -mt-20 blur-3xl transition-all group-hover:bg-emerald-100" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Calories</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tighter text-zinc-900">1,842</span>
                  <span className="text-zinc-400 text-xl">/ 2,250 kcal</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-2xl">408</span>
                <p className="text-xs text-zinc-400">Remaining</p>
              </div>
            </div>

            <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '82%' }}
                className="h-full editorial-gradient rounded-full" 
              />
            </div>

            <div className="grid grid-cols-3 gap-8">
              {macros.map((m) => (
                <div key={m.label}>
                  <p className="text-xs font-bold text-zinc-400 mb-2">{m.label}</p>
                  <p className="text-2xl font-bold text-zinc-900">{m.value}</p>
                  <p className={cn("text-[10px] font-bold", m.color)}>{m.goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Insight */}
        <div className="md:col-span-4 bg-emerald-50/50 p-8 rounded-3xl flex flex-col justify-between border border-emerald-100/50">
          <div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full mb-4 inline-block">SMART INSIGHT</span>
            <h4 className="text-xl font-bold leading-snug mb-4 text-emerald-900">You're low on Magnesium today.</h4>
            <p className="text-emerald-800/70 text-sm leading-relaxed">Consider adding spinach or almonds to your next snack to reach your micronutrient goals.</p>
          </div>
          <div className="mt-6">
            <img
              src="https://picsum.photos/seed/almonds/400/200"
              alt="Insight"
              className="w-full h-32 object-cover rounded-2xl grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Macro Balance Chart */}
        <div className="md:col-span-12 lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Macro Balance</h3>
          <div className="flex items-end justify-center gap-12 py-4 h-48">
            {[
              { label: 'P', h: '90%', color: 'bg-primary' },
              { label: 'C', h: '60%', color: 'bg-secondary' },
              { label: 'F', h: '45%', color: 'bg-tertiary' },
            ].map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-3 h-full justify-end">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: bar.h }}
                  className={cn("w-10 rounded-t-xl", bar.color)} 
                />
                <span className="text-xs font-bold text-zinc-400">{bar.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-100 text-xs text-zinc-400 italic">
            Balanced ratio detected. Optimal for recovery.
          </div>
        </div>

        {/* Recent Logs */}
        <div className="md:col-span-12 lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Logs</h3>
            <button className="text-primary text-xs font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors group cursor-pointer">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  <img src={log.img} alt={log.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-zinc-900">{log.title}</h5>
                  <p className="text-xs text-zinc-500">{log.type} • {log.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zinc-900">{log.cal} <span className="text-[10px] font-normal text-zinc-400">kcal</span></p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <div className="w-1 h-1 rounded-full bg-secondary" />
                    <div className="w-1 h-1 rounded-full bg-tertiary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hydration Footer */}
      <section className="p-8 bg-emerald-50 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border border-emerald-100">
        <div className="flex gap-6 items-center">
          <div className="w-20 h-20 bg-primary-container rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/10">
            <Droplets className="w-10 h-10 fill-white" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-emerald-900">Stay Hydrated.</h4>
            <p className="text-emerald-800/70">You've logged 1.8L of your 2.2L goal.</p>
          </div>
        </div>
        <button className="bg-white px-8 py-3 rounded-full font-bold text-primary shadow-sm hover:shadow-md transition-all active:scale-95">
          Log 250ml
        </button>
      </section>
    </motion.div>
  );
}
