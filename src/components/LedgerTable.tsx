import React, { useState } from 'react';
import { LedgerRow, CostCategory, COST_CATEGORIES } from '../types';
import { formatMoney, parseGermanNumber, cents } from '../services/calculations';
import {
  Search,
  Filter,
  Download,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react';

interface LedgerTableProps {
  rows: LedgerRow[];
  onUpdateRow: (id: string, updates: Partial<LedgerRow>) => void;
  onEditRow: (row: LedgerRow) => void;
  onDeleteRow: (id: string) => void;
  onOpenAddModal: () => void;
  onExportCsv: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  rows,
  onUpdateRow,
  onEditRow,
  onDeleteRow,
  onOpenAddModal,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState<'all' | 'plan' | 'actual'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (sideFilter !== 'all' && r.side !== sideFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchSource = (r.source || '').toLowerCase().includes(q);
      const matchDate = (r.date || '').toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      return matchDesc || matchSource || matchDate || matchCat;
    }
    return true;
  });

  const handleInlineChange = (
    id: string,
    field: 'qty' | 'rate',
    rawValue: string,
    currentValue: number
  ) => {
    const val = parseGermanNumber(rawValue);
    if (!Number.isFinite(val)) return;
    if (val === currentValue) return;

    onUpdateRow(id, {
      [field]: val,
      placeholder: false,
      ...(field === 'rate'
        ? {
            originalRate: currentValue,
            priceChangedAt: new Date().toISOString(),
          }
        : {}),
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Positionen der Baustelle</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {filteredRows.length} von {rows.length}
            </span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Menge und Einzelpreis (EP) können direkt in der Tabelle bearbeitet werden.
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b] w-36 sm:w-48 bg-stone-50/50"
            />
          </div>

          {/* Side Filter */}
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as any)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20"
          >
            <option value="all">Alle Positionen</option>
            <option value="plan">Nur Plan</option>
            <option value="actual">Nur Ist</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20"
          >
            <option value="all">Alle Kostenarten</option>
            {COST_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
            title="Tabelle als CSV exportieren"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Position erfassen</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-stone-200 text-stone-400 font-semibold tracking-wider text-[11px] uppercase">
              <th className="py-2.5 pr-4">Position / Bezeichnung</th>
              <th className="py-2.5 px-3">Zuordnung</th>
              <th className="py-2.5 px-3">Kostenart</th>
              <th className="py-2.5 px-3 text-right">Menge</th>
              <th className="py-2.5 px-3 text-right">EP netto (€)</th>
              <th className="py-2.5 px-3 text-right">Gesamt netto</th>
              <th className="py-2.5 pl-4 text-center">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-800">
            {filteredRows.map((row) => {
              const totalAmount = cents(row.qty * row.rate);
              const isRevenue = row.kind === 'revenue';
              const isPlan = row.side === 'plan';

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-stone-50/80 transition-colors ${
                    row.placeholder ? 'opacity-60 bg-stone-50/40' : ''
                  }`}
                >
                  {/* Description & Source */}
                  <td className="py-3 pr-4 max-w-xs md:max-w-md">
                    <div className="font-semibold text-stone-900 leading-tight">
                      {row.description}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-stone-400">
                      {row.date && <span>{row.date}</span>}
                      {row.source && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]" title={row.source}>
                            {row.source}
                          </span>
                        </>
                      )}
                      {row.originalRate != null && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium">
                            Urspr. {formatMoney(row.originalRate)}
                          </span>
                        </>
                      )}
                      {row.placeholder && (
                        <span className="text-stone-400 italic">Vorbereitetes Feld</span>
                      )}
                    </div>
                  </td>

                  {/* Side & Kind */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isPlan
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-stone-100 text-stone-800 border border-stone-200'
                      }`}
                    >
                      {isPlan ? 'Plan' : 'Ist'}
                    </span>
                    <span
                      className={`ml-1.5 text-[11px] font-medium ${
                        isRevenue ? 'text-emerald-700' : 'text-stone-500'
                      }`}
                    >
                      {isRevenue ? 'Leistung' : 'Kosten'}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {isRevenue ? (
                      <span className="text-stone-400">-</span>
                    ) : (
                      <span className="text-xs font-medium text-stone-700">
                        {row.category}
                      </span>
                    )}
                  </td>

                  {/* Inline Quantity Input */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={String(row.qty).replace('.', ',')}
                        onBlur={(e) =>
                          handleInlineChange(row.id, 'qty', e.target.value, row.qty)
                        }
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-20 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200 hover:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#8e2f2b] focus:border-[#8e2f2b] bg-[#fffdf9]"
                      />
                      <span className="text-stone-500 text-[11px] w-12 text-left truncate">
                        {row.unit}
                      </span>
                    </div>
                  </td>

                  {/* Inline Rate Input */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={String(row.rate).replace('.', ',')}
                        onBlur={(e) =>
                          handleInlineChange(row.id, 'rate', e.target.value, row.rate)
                        }
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-22 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200 hover:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#8e2f2b] focus:border-[#8e2f2b] bg-[#fcf5f4]"
                      />
                      <span className="text-stone-400 text-xs">€</span>
                    </div>
                  </td>

                  {/* Total Net */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                    {formatMoney(totalAmount)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-3 pl-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditRow(row)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Position bearbeiten"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Position löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="w-8 h-8 text-stone-300" />
                    <p className="font-medium text-xs">
                      {rows.length === 0
                        ? 'Noch keine Positionen in dieser Baustelle erfasst.'
                        : 'Keine Positionen mit den aktuellen Filtern gefunden.'}
                    </p>
                    <p className="text-[11px] text-stone-400 max-w-sm">
                      Lade oben eine PDF-Rechnung oder ein Angebot hoch oder erfasse eine Position direkt.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
