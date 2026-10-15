import React from 'react';
import { ProjectTotals, formatMoney } from '../services/calculations';
import { ArrowDownRight, ArrowUpRight, Printer } from 'lucide-react';

interface PlanActualComparisonProps {
  totals: ProjectTotals;
  onPrint: () => void;
}

export const PlanActualComparison: React.FC<PlanActualComparisonProps> = ({
  totals,
  onPrint,
}) => {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Plan und Ist im Vergleich
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Positive Kostenabweichung (rot) bedeutet höhere Kosten als geplant.
            </p>
          </div>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8e2f2b] hover:text-[#68201f] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Drucken / PDF</span>
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-semibold tracking-wider text-[11px] uppercase">
                <th className="py-2.5 pr-4">Kostenart</th>
                <th className="py-2.5 px-3 text-right">Plan netto</th>
                <th className="py-2.5 px-3 text-right">Ist netto</th>
                <th className="py-2.5 pl-4 text-right">Abweichung (Δ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {totals.categories.map((cat) => {
                const isOver = cat.actual > cat.plan;
                const isUnder = cat.actual < cat.plan;
                return (
                  <tr key={cat.name} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-stone-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                      <span>{cat.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                      {formatMoney(cat.plan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-900">
                      {formatMoney(cat.actual)}
                    </td>
                    <td
                      className={`py-2.5 pl-4 text-right font-mono font-bold ${
                        isOver
                          ? 'text-[#8e2f2b]'
                          : isUnder
                          ? 'text-emerald-700'
                          : 'text-stone-400'
                      }`}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        {isOver && <ArrowUpRight className="w-3 h-3 text-[#8e2f2b]" />}
                        {isUnder && <ArrowDownRight className="w-3 h-3 text-emerald-600" />}
                        <span>
                          {cat.diff > 0 ? '+' : ''}
                          {formatMoney(cat.diff)}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Summary Footer */}
            <tfoot className="border-t-2 border-stone-300 bg-stone-50/80 font-semibold">
              <tr className="border-b border-stone-200">
                <td className="py-2.5 px-3 text-stone-900">Gesamtkosten</td>
                <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                  {formatMoney(totals.cost.plan)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-stone-900 font-bold">
                  {formatMoney(totals.cost.actual)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono font-bold ${
                    totals.cost.diff > 0 ? 'text-[#8e2f2b]' : 'text-emerald-700'
                  }`}
                >
                  {totals.cost.diff > 0 ? '+' : ''}
                  {formatMoney(totals.cost.diff)}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="py-2.5 px-3 text-stone-900">Leistungen</td>
                <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                  {formatMoney(totals.revenue.plan)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-stone-900 font-bold">
                  {formatMoney(totals.revenue.actual)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono font-bold ${
                    totals.revenue.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {totals.revenue.diff > 0 ? '+' : ''}
                  {formatMoney(totals.revenue.diff)}
                </td>
              </tr>
              <tr className="bg-[#f7eae9]/40 text-[#8e2f2b]">
                <td className="py-3 px-3 text-sm font-bold">Ergebnis (Gewinn/Verlust)</td>
                <td className="py-3 px-3 text-right font-mono text-stone-700 font-semibold">
                  {formatMoney(totals.profit.plan)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-sm text-[#8e2f2b]">
                  {formatMoney(totals.profit.actual)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-mono font-black ${
                    totals.profit.actual >= totals.profit.plan
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {totals.profit.actual >= totals.profit.plan ? '+' : ''}
                  {formatMoney(totals.profit.actual - totals.profit.plan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
};
