import React from 'react';
import { ProjectTotals } from '../services/calculations';
import { formatMoney } from '../services/calculations';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface MetricsCardsProps {
  totals: ProjectTotals;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ totals }) => {
  const isProfitPositive = totals.profit.actual >= 0;
  const isCostOverrun = totals.cost.actual > totals.cost.plan;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Leistungen / Revenue */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-stone-500 uppercase">
              Leistungen · Ist
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight font-mono">
              {formatMoney(totals.revenue.actual)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Geplant: <strong>{formatMoney(totals.revenue.plan)}</strong></span>
          <span className={`font-semibold ${totals.revenue.actual >= totals.revenue.plan ? 'text-emerald-600' : 'text-stone-600'}`}>
            {totals.revenue.actual >= totals.revenue.plan ? '+' : ''}
            {formatMoney(totals.revenue.actual - totals.revenue.plan)}
          </span>
        </div>
      </div>

      {/* 2. Kosten / Costs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-stone-500 uppercase">
              Kosten · Ist
            </span>
            <span className={`p-1.5 rounded-lg ${isCostOverrun ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight font-mono">
              {formatMoney(totals.cost.actual)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Geplant: <strong>{formatMoney(totals.cost.plan)}</strong></span>
          <span
            className={`font-semibold inline-flex items-center gap-0.5 ${
              isCostOverrun ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {isCostOverrun ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            <span>Δ {formatMoney(Math.abs(totals.cost.actual - totals.cost.plan))}</span>
          </span>
        </div>
      </div>

      {/* 3. Baustellenergebnis / Profit */}
      <div
        className={`rounded-2xl p-5 shadow-sm flex flex-col justify-between text-white relative overflow-hidden ${
          isProfitPositive
            ? 'bg-gradient-to-br from-[#8e2f2b] to-[#68201f]'
            : 'bg-gradient-to-br from-rose-800 to-rose-950'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-rose-200 uppercase">
              Baustellenergebnis · Ist
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              {totals.margin.actual.toFixed(1)} % Marge
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black tracking-tight font-mono">
              {formatMoney(totals.profit.actual)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-rose-100">
          <span>Plan-Ergebnis: <strong>{formatMoney(totals.profit.plan)}</strong></span>
          <span className="font-semibold text-white">
            {totals.profit.actual >= totals.profit.plan ? '+' : ''}
            {formatMoney(totals.profit.actual - totals.profit.plan)}
          </span>
        </div>
      </div>
    </div>
  );
};
