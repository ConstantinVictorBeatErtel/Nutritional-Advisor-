import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, Flashlight, Mic, Bolt, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogMealProps {
  onComplete: () => void;
}

export default function LogMeal({ onComplete }: LogMealProps) {
  const [isScanning, setIsScanning] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-6xl mx-auto w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Camera & Input */}
        <div className="lg:col-span-7 space-y-8">
          <div className="relative group">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-zinc-900 mb-4 leading-none">
              Capture the <br /><span className="text-primary italic">Moment.</span>
            </h2>
            
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-zinc-100 shadow-2xl relative border-4 border-white">
              <img
                src="https://picsum.photos/seed/meal/800/600"
                alt="Meal"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              {/* Camera Overlay */}
              <div className="absolute inset-0 border-[20px] border-black/5 flex flex-col justify-between p-8">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 border-t-2 border-l-2 border-white/80 rounded-tl-2xl" />
                  <div className="w-12 h-12 border-t-2 border-r-2 border-white/80 rounded-tr-2xl" />
                </div>
                
                <div className="flex justify-center">
                  <motion.div 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-black/20 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 border border-white/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-white text-xs font-bold tracking-widest uppercase">AI Scanning...</span>
                  </motion.div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-12 h-12 border-b-2 border-l-2 border-white/80 rounded-bl-2xl" />
                  <div className="w-12 h-12 border-b-2 border-r-2 border-white/80 rounded-br-2xl" />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8 mt-10">
              <button className="w-14 h-14 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-sm active:scale-90 border border-zinc-100">
                <ImageIcon className="w-6 h-6" />
              </button>
              <button className="w-20 h-20 rounded-full editorial-gradient p-1 shadow-xl shadow-emerald-900/20 active:scale-95 transition-transform">
                <div className="w-full h-full rounded-full border-4 border-white/40 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white fill-white/20" />
                </div>
              </button>
              <button className="w-14 h-14 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-sm active:scale-90 border border-zinc-100">
                <Flashlight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Optional Description</label>
            <div className="relative">
              <textarea
                className="w-full bg-white border-none rounded-2xl p-6 text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none transition-all shadow-sm"
                placeholder="What are you eating? (e.g. 'Avocado toast with a poached egg')"
              />
              <div className="absolute bottom-4 right-4 text-primary p-2 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer">
                <Mic className="w-5 h-5" />
              </div>
            </div>
          </div>

          <button className="w-full editorial-gradient text-white py-6 rounded-[2rem] font-headline font-bold text-xl shadow-xl shadow-emerald-900/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
            Generate Interpretation
            <Bolt className="w-6 h-6 fill-white" />
          </button>
        </div>

        {/* Right: Analysis */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-emerald-900/5 border border-zinc-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Bolt className="w-6 h-6 fill-orange-600/10" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-2xl text-zinc-900">AI Interpretation</h3>
                <p className="text-sm text-zinc-400 font-medium">Confidence: 94%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="col-span-2 bg-emerald-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-emerald-100">
                <span className="text-6xl font-extrabold text-primary tracking-tighter">485</span>
                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-2">Total Calories</span>
              </div>
              
              {[
                { label: 'Protein', val: '24g', color: 'text-secondary', bg: 'bg-blue-50', bar: 'bg-secondary', w: '75%' },
                { label: 'Carbs', val: '42g', color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500', w: '50%' },
                { label: 'Fats', val: '18g', color: 'text-zinc-600', bg: 'bg-zinc-50', bar: 'bg-zinc-400', w: '33%' },
                { label: 'Fiber', val: '6g', color: 'text-primary', bg: 'bg-emerald-50', bar: 'bg-primary', w: '25%' },
              ].map((m) => (
                <div key={m.label} className={cn("rounded-2xl p-5 flex flex-col", m.bg)}>
                  <span className={cn("font-bold text-xl", m.color)}>{m.val}</span>
                  <span className={cn("text-xs font-medium opacity-60", m.color)}>{m.label}</span>
                  <div className="w-full bg-black/5 h-1.5 rounded-full mt-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: m.w }}
                      className={cn("h-full rounded-full", m.bar)} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={onComplete}
              className="w-full editorial-gradient text-white py-6 rounded-[2rem] font-headline font-bold text-xl shadow-xl shadow-emerald-900/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              Confirm and Log Meal
              <CheckCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
