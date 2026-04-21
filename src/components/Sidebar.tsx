import React from 'react';
import { LayoutGrid, ClipboardList, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName?: string;
}

export default function Sidebar({ activeTab, setActiveTab, userName }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'logs', label: 'Logs', icon: ClipboardList },
    { id: 'coach', label: 'Coach', icon: BrainCircuit },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-emerald-50/80 backdrop-blur-xl py-8 px-4 sticky top-0 border-r border-emerald-100/20">
      <div className="mb-12 px-2">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-900">NutriSnap</h1>
        <p className="text-[10px] text-emerald-600/70 uppercase tracking-widest font-bold mt-1">Personal Nutrition</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out',
              activeTab === item.id
                ? 'text-emerald-700 font-bold border-r-4 border-emerald-600 bg-emerald-100/50 pl-6'
                : 'text-zinc-500 hover:text-emerald-600 hover:bg-emerald-100/30 hover:pl-6',
            )}
          >
            <item.icon className={cn('w-5 h-5', activeTab === item.id && 'fill-emerald-700/10')} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-emerald-100/20">
        <div className="mt-6 px-4 py-4 bg-white/40 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700">
            {(userName?.trim()?.charAt(0) || '?').toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{userName?.trim() || 'Profile incomplete'}</p>
            <p className="text-[10px] text-zinc-500">Saved locally</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
