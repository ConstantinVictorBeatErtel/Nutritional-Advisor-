import React from 'react';
import { LayoutGrid, ClipboardList, BrainCircuit, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'logs', label: 'Logs', icon: ClipboardList },
    { id: 'coach', label: 'Coach', icon: BrainCircuit },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-emerald-50/80 backdrop-blur-xl py-8 px-4 sticky top-0 border-r border-emerald-100/20">
      <div className="mb-12 px-2">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-900">Vitality Advisor</h1>
        <p className="text-[10px] text-emerald-600/70 uppercase tracking-widest font-bold mt-1">Editorial Wellness</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out",
              activeTab === item.id
                ? "text-emerald-700 font-bold border-r-4 border-emerald-600 bg-emerald-100/50 pl-6"
                : "text-zinc-500 hover:text-emerald-600 hover:bg-emerald-100/30 hover:pl-6"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-emerald-700/10")} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-2 pt-4 border-t border-emerald-100/20">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-emerald-600 transition-all duration-300 rounded-xl hover:bg-emerald-100/30 hover:pl-6"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
        
        <div className="mt-6 px-4 py-4 bg-white/40 rounded-2xl flex items-center gap-3">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1CLzJuHullVNGomNVmsY176wARV2XPdtOeWxkQteowgGJRJbkFb1uE8_dQHiQOKzkG6GLSRM1CaoPFGEr5xJTBxF0-3CiQSQS0JQDSHxQRQiB-_PWaRWu90KJOD2n0hEgsztKkmWEjXlEFfMsg4bzV-oC88tCQyg91mQXda6f1ye9VjmkEk26dDvmA_TLDvnbWgI3d_EyFT5bV2bkKw8ba6Z4KxsGYj7a9C_iO3CAuBZK8orgVVfxWJUGJac0v_-2Ezl-CGbdP04o"
            alt="Elena Rossi"
            className="w-10 h-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">Elena Rossi</p>
            <p className="text-[10px] text-zinc-500">Premium Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
