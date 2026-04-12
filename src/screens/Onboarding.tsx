import React from 'react';
import { motion } from 'motion/react';
import { Leaf, Cake, Ruler, Dumbbell, Scale, Zap, Sparkles, Brain, ArrowRight, Info, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35vw] h-[35vw] bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />

      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white shadow-2xl rounded-3xl overflow-hidden z-10 relative min-h-[800px]"
      >
        {/* Left Side */}
        <section className="md:col-span-5 bg-primary relative hidden md:flex flex-col justify-between p-12 text-white overflow-hidden">
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
              <span className="font-headline font-extrabold tracking-tighter text-2xl">The Vitality Edit</span>
            </div>
            <h1 className="font-headline text-5xl font-extrabold leading-[1.1] mb-6 tracking-tight">
              Your journey to <span className="text-emerald-200">optimal</span> vitality begins.
            </h1>
            <p className="text-lg opacity-90 font-light leading-relaxed max-w-xs">
              We're tailoring a nutritional blueprint specifically for your biological needs and lifestyle goals.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex -space-x-4 mb-4">
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={`https://picsum.photos/seed/user${i}/100/100`}
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-primary object-cover"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="w-10 h-10 rounded-full bg-emerald-400 border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">+2k</div>
            </div>
            <p className="text-sm font-medium opacity-80 italic">Join 2,000+ others pursuing peak performance.</p>
          </div>
        </section>

        {/* Right Side */}
        <section className="md:col-span-7 flex flex-col p-8 md:p-16 overflow-y-auto">
          <div className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-primary font-bold text-xs tracking-widest uppercase">Step 01 of 03</span>
                <h2 className="font-headline text-3xl font-bold text-zinc-900 mt-1">Core Metrics</h2>
              </div>
              <span className="text-zinc-500 font-medium text-sm">35% Complete</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '35%' }}
                className="h-full bg-primary rounded-full" 
              />
            </div>
          </div>

          <form className="space-y-10" onSubmit={(e) => { e.preventDefault(); onComplete(); }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-semibold text-zinc-600 flex items-center gap-2">
                  <Cake className="w-4 h-4" /> Age
                </label>
                <input 
                  type="number" 
                  placeholder="28"
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-semibold text-zinc-600 flex items-center gap-2">
                  <Ruler className="w-4 h-4 rotate-[-90deg]" /> Height (cm)
                </label>
                <input 
                  type="number" 
                  placeholder="175"
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-semibold text-zinc-600 flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Weight (kg)
                </label>
                <input 
                  type="number" 
                  placeholder="72"
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-600 block mb-4">Primary Wellness Objective</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'weight', label: 'Optimize Weight', sub: 'Focus on metabolic efficiency', icon: Scale, color: 'text-primary' },
                  { id: 'performance', label: 'Athletic Performance', sub: 'Macro-loading for strength', icon: Zap, color: 'text-blue-600' },
                  { id: 'vitality', label: 'Holistic Vitality', sub: 'Longevity and steady energy', icon: Sparkles, color: 'text-orange-600' },
                  { id: 'focus', label: 'Cognitive Focus', sub: 'Brain-fuel and mental clarity', icon: Brain, color: 'text-zinc-600' },
                ].map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={cn(
                      "group relative flex flex-col p-5 rounded-2xl text-left transition-all active:scale-95 border-2",
                      goal.id === 'weight' ? "bg-white border-primary shadow-lg" : "bg-zinc-50 border-transparent hover:border-zinc-200"
                    )}
                  >
                    <goal.icon className={cn("w-8 h-8 mb-3", goal.color)} />
                    <span className="font-headline font-bold text-zinc-900">{goal.label}</span>
                    <span className="text-xs text-zinc-500 mt-1">{goal.sub}</span>
                    {goal.id === 'weight' && (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-600">Daily Sleep Duration</label>
                <span className="text-primary font-bold">7.5 Hours</span>
              </div>
              <input 
                type="range" 
                min="4" max="12" step="0.5" defaultValue="7.5"
                className="w-full h-2 bg-zinc-100 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                <span>Minimal (4h)</span>
                <span>Optimal (7.5h)</span>
                <span>Extended (12h)</span>
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-4">
              <button 
                type="submit"
                className="w-full bg-gradient-to-br from-primary to-emerald-600 text-white font-headline font-bold py-5 px-8 rounded-2xl shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                Continue to Diet Profile
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                By continuing, you agree to our <span className="underline font-medium text-zinc-900 cursor-pointer">Privacy Policy</span> regarding your biometric data processing.
              </p>
            </div>
          </form>
        </section>
      </motion.main>
    </div>
  );
}
