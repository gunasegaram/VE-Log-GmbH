import React, { useState } from 'react';
import { ProjectTotals, formatMoney, formatNumber, parseGermanNumber } from '../services/calculations';
import { Sliders, Fuel, Clock, Percent } from 'lucide-react';
import { Project } from '../types';

interface CostDistributionPanelProps {
  project: Project;
  totals: ProjectTotals;
  onUpdateVariablePrices: (hourly: number | null, diesel: number | null) => void;
  onUpdateOverhead: (overhead: number) => void;
}

export const CostDistributionPanel: React.FC<CostDistributionPanelProps> = ({
  project,
  totals,
  onUpdateVariablePrices,
  onUpdateOverhead,
}) => {
  const [hourlyInput, setHourlyInput] = useState(
    project.variablePrices?.hourly != null ? String(project.variablePrices.hourly).replace('.', ',') : ''
  );
  const [dieselInput, setDieselInput] = useState(
    project.variablePrices?.diesel != null ? String(project.variablePrices.diesel).replace('.', ',') : ''
  );
  const [overheadInput, setOverheadInput] = useState(String(project.overhead || 15));

  const totalActualCost = totals.categories.reduce((acc, c) => acc + Math.max(0, c.actual), 0);

  const handleHourlyBlur = () => {
    const val = hourlyInput.trim() === '' ? null : parseGermanNumber(hourlyInput);
    if (val !== null && (!Number.isFinite(val) || val < 0)) {
      setHourlyInput(project.variablePrices?.hourly != null ? String(project.variablePrices.hourly).replace('.', ',') : '');
      return;
    }
    onUpdateVariablePrices(val, project.variablePrices?.diesel ?? null);
  };

  const handleDieselBlur = () => {
    const val = dieselInput.trim() === '' ? null : parseGermanNumber(dieselInput);
    if (val !== null && (!Number.isFinite(val) || val < 0)) {
      setDieselInput(project.variablePrices?.diesel != null ? String(project.variablePrices.diesel).replace('.', ',') : '');
      return;
    }
    onUpdateVariablePrices(project.variablePrices?.hourly ?? null, val);
  };

  const handleOverheadBlur = () => {
    const val = parseGermanNumber(overheadInput);
    if (!Number.isFinite(val) || val < 0 || val > 100) {
      setOverheadInput(String(project.overhead || 15));
      return;
    }
    onUpdateOverhead(val);
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-xs flex flex-col justify-between space-y-6">
      {/* 1. Progress Distribution Bars */}
      <div>
        <h2 className="text-base font-bold text-stone-900 tracking-tight pb-2 border-b border-stone-100 flex items-center justify-between">
          <span>Kostenverteilung (Ist)</span>
          <span className="text-xs font-normal text-stone-400">nach Kostenarten</span>
        </h2>

        <div className="space-y-3 mt-4">
          {totals.categories.map((cat) => {
            const pct = totalActualCost > 0 ? (Math.max(0, cat.actual) / totalActualCost) * 100 : 0;
            return (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-700">{cat.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-stone-400 text-[11px]">{pct.toFixed(1)} %</span>
                    <span className="font-semibold text-stone-800">{formatMoney(cat.actual)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-[#8e2f2b]"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Variable Plan Prices */}
      <div className="pt-4 border-t border-stone-100 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#8e2f2b]" />
          <h3 className="text-sm font-bold text-stone-900">Variable Planpreise</h3>
        </div>
        <p className="text-[11px] text-stone-500 leading-normal">
          Gilt für passende Planpositionen und künftige Angebotsimporte. Bei Änderung werden
          zugehörige Planpositionen automatisch aktualisiert. Istkosten behalten ihren Belegpreis.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Stundensatz (€/Std.)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={hourlyInput}
                onChange={(e) => setHourlyInput(e.target.value)}
                onBlur={handleHourlyBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="aus Angebot"
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b] bg-[#fffdf9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-amber-500" />
              <span>Dieselpreis (€/Ltr.)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={dieselInput}
                onChange={(e) => setDieselInput(e.target.value)}
                onBlur={handleDieselBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="aus Angebot"
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b] bg-[#fffdf9]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Overhead Rate */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-stone-800 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-stone-400" />
            <span>Verwaltungsgemeinkosten</span>
          </label>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Zuschlag auf die Gesamterlöse für Plan und Ist (Standard: 15 %)
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={overheadInput}
            onChange={(e) => setOverheadInput(e.target.value)}
            onBlur={handleOverheadBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-16 text-xs text-right font-mono px-2 py-1.5 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
          />
          <span className="text-xs font-semibold text-stone-500">%</span>
        </div>
      </div>
    </section>
  );
};
