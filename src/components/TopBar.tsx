import React from 'react';
import { Search, Bell, Calendar, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, showBack, onBack }: TopBarProps) {
  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        {showBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-4">
          {!showBack && (
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search insights..."
                className="pl-10 pr-4 py-2 bg-zinc-100/50 border-none rounded-full w-64 focus:ring-2 focus:ring-emerald-500/20 transition-all text-xs"
              />
            </div>
          )}
          <span className="font-bold text-lg tracking-tight text-zinc-900">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <button className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors">
          <Calendar className="w-5 h-5" />
        </button>
        <div className="h-8 w-[1px] bg-zinc-200 hidden md:block" />
        <span className="font-bold text-emerald-700 tracking-tight hidden md:block">The Vitality Edit</span>
        <div className="w-8 h-8 rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJTtZZ8sIPcaEcVwZFS2UGOfxwCBdcifTQXGN-PvAe8v_gVm67zKa-d6nyAXBDiESXDKdhmsr3wv5UF0Z_SDE-5HsESoUNSfnWanTQTRP_hEBD70RVmJ2tcUhmuWoHNGhPfFRRsFQKcK3Bzm7pFMOCfcxst4AVzkFw7d-CIsLsRpn6aoxdcPDtcKDuILm0mJSYW4Ux8g_Y5BPIjz0axwEi05nD8UE9gZhpRyI2toE_Yd7HosJXLsS4nQTlghLEYO6ORURBtKg3sFJ9"
            alt="User Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
