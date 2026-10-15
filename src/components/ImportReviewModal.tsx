import React, { useState } from 'react';
import {
  ParseResult,
  ParsedPosition,
  Project,
  COST_CATEGORIES,
  PositionSide,
  PositionKind,
  CostCategory,
} from '../types';
import { formatMoney, parseGermanNumber, cents } from '../services/calculations';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Building,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface ImportReviewModalProps {
  parseResult: ParseResult;
  currentProject: Project | null;
  projects: Project[];
  onAccept: (
    rows: ParsedPosition[],
    targetProjectId: string,
    createProjectName?: string,
    customerName?: string
  ) => void;
  onCancel: () => void;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  parseResult,
  currentProject,
  projects,
  onAccept,
  onCancel,
}) => {
  const [rows, setRows] = useState<ParsedPosition[]>(parseResult.rows);
  const [side, setSide] = useState<PositionSide>(
    parseResult.detectedType === 'offer' ? 'plan' : 'actual'
  );
  const [kind, setKind] = useState<PositionKind>(
    parseResult.detectedType === 'offer' ? 'revenue' : 'cost'
  );
  const [showRawText, setShowRawText] = useState(false);

  // Target project selection: either current project or create new
  const [targetMode, setTargetMode] = useState<'current' | 'new'>(
    currentProject ? 'current' : 'new'
  );
  const [newProjectName, setNewProjectName] = useState(
    parseResult.detectedProjectName ||
      parseResult.fileName.replace(/\.(pdf|xlsx|xls)$/i, '')
  );
  const [newCustomerName, setNewCustomerName] = useState(
    parseResult.detectedCustomer || ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProject?.id || projects[0]?.id || ''
  );

  // Update side / kind globally for all items if changed
  const handleGlobalSideChange = (newSide: PositionSide) => {
    setSide(newSide);
    setRows((prev) => prev.map((r) => ({ ...r, side: newSide })));
  };

  const handleGlobalKindChange = (newKind: PositionKind) => {
    setKind(newKind);
    setRows((prev) => prev.map((r) => ({ ...r, kind: newKind })));
  };

  const handleRowChange = (
    id: string,
    field: keyof ParsedPosition,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const q = field === 'qty' ? parseGermanNumber(value) : r.qty;
          const p = field === 'rate' ? parseGermanNumber(value) : r.rate;
          if (Number.isFinite(q) && Number.isFinite(p)) {
            updated.total = cents(q * p);
          }
        }
        return updated;
      })
    );
  };

  const handleAddRow = () => {
    const newRow: ParsedPosition = {
      id: crypto.randomUUID(),
      selected: true,
      description: 'Zusätzliche Position',
      qty: 1,
      unit: 'pauschal',
      rate: 0,
      total: 0,
      category: 'Sonstige Kosten',
      side,
      kind,
      confidence: 'medium',
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    setRows(rows.map((r) => ({ ...r, selected: checked })));
  };

  const selectedRows = rows.filter((r) => r.selected);
  const selectedSum = selectedRows.reduce((acc, r) => acc + r.total, 0);

  const handleConfirm = () => {
    if (selectedRows.length === 0) return;

    if (targetMode === 'new') {
      const finalName = newProjectName.trim() || 'Neue Baustelle';
      onAccept(selectedRows, '', finalName, newCustomerName.trim());
    } else {
      const targetId = selectedProjectId || currentProject?.id || '';
      onAccept(selectedRows, targetId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-stone-200 flex items-start justify-between bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#8e2f2b]/10 text-[#8e2f2b]">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-lg md:text-xl font-bold text-stone-900 tracking-tight">
                Beleg prüfen & importieren
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-mono">
              Datei: <strong>{parseResult.fileName}</strong> •{' '}
              {parseResult.detectedType === 'offer'
                ? 'Angebot / Planungsbeleg'
                : 'Rechnung / Ist-Beleg'}
              {parseResult.detectedDate ? ` • Datum: ${parseResult.detectedDate}` : ''}
              {parseResult.detectedInvoiceNumber
                ? ` • Beleg-Nr: ${parseResult.detectedInvoiceNumber}`
                : ''}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning or Detection Notice */}
        {parseResult.warning && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hinweis zur automatischen Texterkennung:</p>
              <p className="mt-0.5 leading-relaxed">{parseResult.warning}</p>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Target Baustelle Settings */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#8e2f2b]" />
                <span>Ziel-Baustelle für diese Daten:</span>
              </span>
              <div className="flex items-center gap-2 text-xs">
                {currentProject && (
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-700">
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === 'current'}
                      onChange={() => setTargetMode('current')}
                      className="accent-[#8e2f2b]"
                    />
                    <span>Bestehende Baustelle</span>
                  </label>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-700">
                  <input
                    type="radio"
                    name="targetMode"
                    checked={targetMode === 'new'}
                    onChange={() => setTargetMode('new')}
                    className="accent-[#8e2f2b]"
                  />
                  <span>Neue Baustelle anlegen</span>
                </label>
              </div>
            </div>

            {targetMode === 'current' ? (
              <div className="flex items-center gap-3">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-stone-300 bg-white font-medium text-stone-900"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.customer ? `(${p.customer})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Baustellenname
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="z. B. B470 Ortsdurchfahrt"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-900 focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Auftraggeber / Kunde
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="z. B. Stadt Forchheim"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-900 focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick presets for side and kind */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Standard-Zuordnung:</span>
                <select
                  value={side}
                  onChange={(e) => handleGlobalSideChange(e.target.value as any)}
                  className="py-1 px-2.5 rounded-lg border border-stone-300 font-semibold text-stone-800 bg-white"
                >
                  <option value="actual">Ist (Rechnung / Beleg)</option>
                  <option value="plan">Plan (Angebot / Kalkulation)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Belegart:</span>
                <select
                  value={kind}
                  onChange={(e) => handleGlobalKindChange(e.target.value as any)}
                  className="py-1 px-2.5 rounded-lg border border-stone-300 font-semibold text-stone-800 bg-white"
                >
                  <option value="cost">Kosten</option>
                  <option value="revenue">Leistung / Erlös</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowRawText(!showRawText)}
              className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 font-medium text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showRawText ? 'Erkannten Text verbergen' : 'Erkannten Text anzeigen'}</span>
            </button>
          </div>

          {/* Optional Raw Text View */}
          {showRawText && (
            <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
              {parseResult.rawText || 'Kein Textinhalt vorhanden.'}
            </div>
          )}

          {/* Extracted Positions Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 sticky top-0 border-b border-stone-200 text-stone-500 font-semibold text-[11px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every((r) => r.selected)}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="accent-[#8e2f2b] rounded cursor-pointer"
                        title="Alle auswählen / abwählen"
                      />
                    </th>
                    <th className="py-2.5 px-2">Beschreibung</th>
                    <th className="py-2.5 px-2 w-24">Plan / Ist</th>
                    <th className="py-2.5 px-2 w-32">Kostenart</th>
                    <th className="py-2.5 px-2 w-20 text-right">Menge</th>
                    <th className="py-2.5 px-2 w-16">Einheit</th>
                    <th className="py-2.5 px-2 w-24 text-right">Preis (€)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Gesamt (€)</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-stone-50 transition-colors ${
                        !r.selected ? 'opacity-40 bg-stone-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={(e) =>
                            handleRowChange(r.id, 'selected', e.target.checked)
                          }
                          className="accent-[#8e2f2b] rounded cursor-pointer"
                        />
                      </td>

                      {/* Description */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={r.description}
                          onChange={(e) =>
                            handleRowChange(r.id, 'description', e.target.value)
                          }
                          className="w-full text-xs px-2 py-1 rounded border border-stone-200 focus:border-[#8e2f2b] focus:ring-1 focus:ring-[#8e2f2b]"
                        />
                        {r.note && (
                          <div className="text-[10px] text-stone-400 mt-0.5 truncate max-w-sm">
                            {r.note}
                          </div>
                        )}
                      </td>

                      {/* Side / Kind */}
                      <td className="py-2 px-2">
                        <select
                          value={r.side}
                          onChange={(e) =>
                            handleRowChange(r.id, 'side', e.target.value as any)
                          }
                          className="w-full text-xs py-1 px-1.5 rounded border border-stone-200 bg-white"
                        >
                          <option value="actual">Ist</option>
                          <option value="plan">Plan</option>
                        </select>
                      </td>

                      {/* Category */}
                      <td className="py-2 px-2">
                        <select
                          value={r.category}
                          onChange={(e) =>
                            handleRowChange(r.id, 'category', e.target.value as any)
                          }
                          className="w-full text-xs py-1 px-1.5 rounded border border-stone-200 bg-white"
                        >
                          {COST_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={String(r.qty).replace('.', ',')}
                          onChange={(e) =>
                            handleRowChange(r.id, 'qty', e.target.value)
                          }
                          className="w-18 text-right font-mono text-xs px-1.5 py-1 rounded border border-stone-200 focus:border-[#8e2f2b]"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={r.unit}
                          onChange={(e) =>
                            handleRowChange(r.id, 'unit', e.target.value)
                          }
                          className="w-14 text-xs px-1.5 py-1 rounded border border-stone-200 focus:border-[#8e2f2b]"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={String(r.rate).replace('.', ',')}
                          onChange={(e) =>
                            handleRowChange(r.id, 'rate', e.target.value)
                          }
                          className="w-20 text-right font-mono text-xs px-1.5 py-1 rounded border border-stone-200 focus:border-[#8e2f2b]"
                        />
                      </td>

                      {/* Total Net */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatMoney(r.total)}
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(r.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                          title="Zeile entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-400">
                        Keine Positionen gefunden. Klicke unten auf „+ Position hinzufügen“.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8e2f2b] hover:text-[#68201f]"
              >
                <Plus className="w-4 h-4" />
                <span>Position hinzufügen</span>
              </button>

              <div className="text-xs text-stone-600">
                <span>Ausgewählt: </span>
                <strong className="text-stone-900 font-bold">
                  {selectedRows.length} Positionen
                </strong>{' '}
                • Summe netto:{' '}
                <strong className="text-stone-900 font-bold font-mono">
                  {formatMoney(selectedSum)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            Abbrechen
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={selectedRows.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
                selectedRows.length > 0
                  ? 'bg-[#8e2f2b] hover:bg-[#68201f] text-white cursor-pointer'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {selectedRows.length} Positionen in Baustelle einfügen
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
