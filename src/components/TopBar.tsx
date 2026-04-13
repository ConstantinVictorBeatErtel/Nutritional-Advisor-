import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TopBarProps {
  title: string;
  userName?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, userName, showBack, onBack }: TopBarProps) {
  const initial = userName?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button onClick={onBack} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}
        <span className="font-bold text-lg tracking-tight text-zinc-900">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {userName ? <span className="font-semibold text-zinc-600 hidden md:block">{userName}</span> : null}
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700">
          {initial}
        </div>
      </div>
    </header>
  );
}
