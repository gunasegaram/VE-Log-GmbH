import React from 'react';
import { HardHat, Calendar, ShieldCheck, Printer } from 'lucide-react';

interface HeaderProps {
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onPrint }) => {
  const currentDate = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 md:h-20 bg-white border-b border-stone-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-stone-500 text-xs md:text-sm font-medium">
          <span className="flex items-center gap-1.5 text-stone-700 font-semibold">
            <HardHat className="w-4 h-4 text-[#8e2f2b]" />
            Arbeitsplatz
          </span>
          <span className="text-stone-300">/</span>
          <strong className="text-stone-900 font-semibold">Baustellen-Nachkalkulation</strong>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onPrint}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          title="Kalkulation drucken oder als PDF speichern"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Drucken</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>{currentDate}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f7eae9] text-[#8e2f2b]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>VE-Log Intern</span>
        </div>
      </div>
    </header>
  );
};
