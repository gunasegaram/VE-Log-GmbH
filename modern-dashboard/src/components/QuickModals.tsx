import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  HardHat,
  Fuel,
  Receipt,
  Clock,
  Database,
  FileText,
} from 'lucide-react';
import {
  CostCategory,
  COST_CATEGORIES,
  LedgerRow,
  MasterRate,
  PositionKind,
  PositionSide,
  StoredDocument,
} from '../types';
import {
  formatMoney,
  parseGermanNumber,
  cents,
  calculateWorkHours,
  detectCategory,
} from '../services/calculations';

// --- NEW PROJECT MODAL ---
interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, customer: string, costcenter: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [costcenter, setCostcenter] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), customer.trim(), costcenter.trim());
    setName('');
    setCustomer('');
    setCostcenter('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#8e2f2b]/10 text-[#8e2f2b]">
              <HardHat className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-stone-900">Neue Baustelle anlegen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Baustellenname / Vorhaben *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. B470 Ortsdurchfahrt"
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Auftraggeber / Kunde
            </label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="z. B. Stadt Forchheim"
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Kostenstelle / Projektnummer
            </label>
            <input
              type="text"
              value={costcenter}
              onChange={(e) => setCostcenter(e.target.value)}
              placeholder="z. B. KSt-4702"
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 bg-[#8e2f2b] hover:bg-[#68201f] text-white font-semibold rounded-xl disabled:opacity-50 shadow-xs"
            >
              Baustelle anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- EDIT / ADD POSITION MODAL ---
interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: Partial<LedgerRow>) => void;
  editingRow?: LedgerRow | null;
  rates: MasterRate[];
}

export const PositionModal: React.FC<PositionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRow,
  rates,
}) => {
  const [description, setDescription] = useState(editingRow?.description || '');
  const [side, setSide] = useState<PositionSide>(editingRow?.side || 'actual');
  const [kind, setKind] = useState<PositionKind>(editingRow?.kind || 'cost');
  const [category, setCategory] = useState<CostCategory>(editingRow?.category || 'Sonstige Kosten');
  const [qty, setQty] = useState(String(editingRow?.qty || 1));
  const [unit, setUnit] = useState(editingRow?.unit || 'pauschal');
  const [rate, setRate] = useState(String(editingRow?.rate || 0));
  const [date, setDate] = useState(editingRow?.date || new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    if (editingRow) {
      setDescription(editingRow.description);
      setSide(editingRow.side);
      setKind(editingRow.kind);
      setCategory(editingRow.category);
      setQty(String(editingRow.qty));
      setUnit(editingRow.unit);
      setRate(String(editingRow.rate));
      setDate(editingRow.date || new Date().toISOString().split('T')[0]);
    } else {
      setDescription('');
      setSide('actual');
      setKind('cost');
      setCategory('Sonstige Kosten');
      setQty('1');
      setUnit('pauschal');
      setRate('0');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingRow, isOpen]);

  if (!isOpen) return null;

  const handleRateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rateId = e.target.value;
    if (!rateId) return;
    const r = rates.find((item) => item.id === rateId);
    if (r) {
      setDescription(r.name);
      setUnit(r.unit);
      setRate(String(r.rate));
      setCategory(r.category);
    }
  };

  const parsedQty = parseGermanNumber(qty) || 0;
  const parsedRate = parseGermanNumber(rate) || 0;
  const total = cents(parsedQty * parsedRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onSave({
      ...(editingRow ? { id: editingRow.id } : {}),
      description: description.trim(),
      side,
      kind,
      category,
      qty: parsedQty,
      unit: unit.trim() || 'Stk.',
      rate: parsedRate,
      date,
      placeholder: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-900">
            {editingRow ? 'Position bearbeiten' : 'Position erfassen'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Master Rate Preset */}
          {!editingRow && (
            <div>
              <label className="block font-semibold text-stone-600 mb-1">
                Stammpreis übernehmen (optional)
              </label>
              <select
                onChange={handleRateSelect}
                defaultValue=""
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-stone-50/50"
              >
                <option value="">Eigenen Text & Preis eingeben</option>
                {rates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} • {formatMoney(r.rate)} / {r.unit} ({r.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Bezeichnung / Beschreibung *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z. B. Baggerarbeiten CAT 326"
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#8e2f2b]/20 focus:border-[#8e2f2b]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Zuordnung</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="actual">Ist-Kosten / Erlös</option>
                <option value="plan">Plan / Angebot</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Art</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="cost">Kosten</option>
                <option value="revenue">Leistung / Erlös</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kostenart</label>
              <select
                value={category}
                disabled={kind === 'revenue'}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white disabled:opacity-50"
              >
                {COST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Menge</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Einheit</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Std. / Tag / to"
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">EP netto (€)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 text-right"
              />
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <span className="font-semibold text-stone-600">Gesamtbetrag netto:</span>
            <span className="font-bold text-sm font-mono text-stone-900">
              {formatMoney(total)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#8e2f2b] hover:bg-[#68201f] text-white font-semibold rounded-xl shadow-xs"
            >
              Speichern & neu berechnen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- DIESEL QUICK ENTRY MODAL ---
interface DieselModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (liters: number, rate: number, date: string, desc: string) => void;
  defaultPrice: number | null;
}

export const DieselModal: React.FC<DieselModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultPrice,
}) => {
  const [liters, setLiters] = useState('');
  const [rate, setRate] = useState(defaultPrice != null ? String(defaultPrice).replace('.', ',') : '1,65');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('Dieselkraftstoff Baustellentank');

  if (!isOpen) return null;

  const parsedLiters = parseGermanNumber(liters) || 0;
  const parsedRate = parseGermanNumber(rate) || 0;
  const total = cents(parsedLiters * parsedRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedLiters <= 0) return;
    onSave(parsedLiters, parsedRate, date, description.trim());
    setLiters('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Fuel className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-stone-900">Dieselkraftstoff erfassen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Verwendungszweck</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Getankte Menge (Liter) *</label>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                required
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="z. B. 450"
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Preis netto (€ / Liter)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-300"
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <span className="font-semibold text-stone-600">Gesamtsumme Diesel:</span>
            <span className="font-bold text-sm font-mono text-stone-900">
              {formatMoney(total)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={parsedLiters <= 0}
              className="px-5 py-2 bg-[#8e2f2b] hover:bg-[#68201f] text-white font-semibold rounded-xl shadow-xs"
            >
              Als Dieselkosten verbuchen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- WORK TIME CALCULATOR MODAL ---
interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: Partial<LedgerRow>) => void;
  rates: MasterRate[];
}

export const TimeModal: React.FC<TimeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rates,
}) => {
  const [description, setDescription] = useState('Maschinist Bagger');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rate, setRate] = useState('50');
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('16:30');
  const [pause, setPause] = useState('auto');

  if (!isOpen) return null;

  let netHours = 0;
  let calcError = '';
  try {
    netHours = calculateWorkHours(start, end, pause);
  } catch (err: any) {
    calcError = err.message;
  }

  const parsedRate = parseGermanNumber(rate) || 0;
  const totalCost = cents(netHours * parsedRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (netHours <= 0 || calcError) return;

    onSave({
      description: description.trim(),
      side: 'actual',
      kind: 'cost',
      category: 'Personal',
      qty: netHours,
      unit: 'Std.',
      rate: parsedRate,
      date,
      source: `Arbeitszeit ${start}–${end} (Pause: ${pause === 'auto' ? 'ArbZG' : pause + ' Min.'})`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-stone-900">Arbeitszeit berechnen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Mitarbeiter / Tätigkeit *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z. B. Maschinist M. Huber"
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Stundensatz (€ / Std.)</label>
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-stone-300 text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Beginn</label>
              <input
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Ende</label>
              <input
                type="time"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Pausenabzug</label>
              <select
                value={pause}
                onChange={(e) => setPause(e.target.value)}
                className="w-full text-xs px-1.5 py-1.5 rounded-lg border border-stone-300 bg-white"
              >
                <option value="auto">Gesetzlich (ArbZG)</option>
                <option value="0">Keine Pause</option>
                <option value="30">30 Minuten</option>
                <option value="45">45 Minuten</option>
                <option value="60">60 Minuten</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-stone-400">
            Gesetzlich: ab 6 Std. = 30 Min., ab 9 Std. = 45 Min. Nachtschichten über Mitternacht werden automatisch berechnet.
          </p>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-500 font-medium">Berechnete Nettozeit:</span>
              {calcError ? (
                <span className="block text-rose-600 font-semibold">{calcError}</span>
              ) : (
                <strong className="block text-stone-900 font-bold">{netHours} Stunden</strong>
              )}
            </div>
            <div className="text-right">
              <span className="text-stone-500 font-medium">Lohnkosten:</span>
              <strong className="block text-sm font-mono text-stone-900 font-bold">
                {formatMoney(totalCost)}
              </strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={netHours <= 0 || !!calcError}
              className="px-5 py-2 bg-[#8e2f2b] hover:bg-[#68201f] text-white font-semibold rounded-xl shadow-xs"
            >
              Als Personalkosten verbuchen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MASTER RATES CATALOG MODAL ---
interface MasterRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: MasterRate[];
  onSaveRates: (rates: MasterRate[]) => void;
}

export const MasterRatesModal: React.FC<MasterRatesModalProps> = ({
  isOpen,
  onClose,
  rates,
  onSaveRates,
}) => {
  const [localRates, setLocalRates] = useState<MasterRate[]>(rates);

  React.useEffect(() => {
    setLocalRates(rates);
  }, [rates, isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (idx: number, field: keyof MasterRate, val: any) => {
    const updated = [...localRates];
    updated[idx] = { ...updated[idx], [field]: val };
    setLocalRates(updated);
  };

  const handleAdd = () => {
    setLocalRates([
      ...localRates,
      {
        id: crypto.randomUUID(),
        name: 'Neues Gerät / Mitarbeiter',
        unit: 'Tag',
        rate: 150,
        category: 'Geräte',
      },
    ]);
  };

  const handleDelete = (idx: number) => {
    const updated = [...localRates];
    updated.splice(idx, 1);
    setLocalRates(updated);
  };

  const handleSave = () => {
    onSaveRates(localRates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl max-h-[85vh] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-stone-100 text-[#8e2f2b]">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">Stammpreise & Gerätekatalog</h2>
              <p className="text-xs text-stone-400">
                Wird bei Belegimporten für automatische Preisergänzungen und Vorschläge verwendet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 border border-stone-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 font-semibold text-[11px] uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Bezeichnung</th>
                <th className="py-2.5 px-3 w-36">Kostenart</th>
                <th className="py-2.5 px-3 w-24">Einheit</th>
                <th className="py-2.5 px-3 w-28 text-right">Netto-Preis (€)</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {localRates.map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-stone-50">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                      className="w-full text-xs px-2 py-1 rounded border border-stone-200"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={r.category}
                      onChange={(e) => handleUpdate(idx, 'category', e.target.value as any)}
                      className="w-full text-xs px-1.5 py-1 rounded border border-stone-200 bg-white"
                    >
                      {COST_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={r.unit}
                      onChange={(e) => handleUpdate(idx, 'unit', e.target.value)}
                      className="w-full text-xs px-2 py-1 rounded border border-stone-200"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={r.rate}
                      onChange={(e) => handleUpdate(idx, 'rate', Number(e.target.value))}
                      className="w-20 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => handleDelete(idx)}
                      className="text-stone-400 hover:text-rose-600 transition-colors"
                      title="Eintrag löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neuer Stammpreis</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-[#8e2f2b] hover:bg-[#68201f] text-white rounded-xl shadow-xs"
            >
              Stammpreise speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- DELETE CONFIRM MODAL ---
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  optionLabel?: string;
  onConfirm: (withOption: boolean) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  optionLabel,
  onConfirm,
}) => {
  const [optionChecked, setOptionChecked] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">{title}</h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {optionLabel && (
          <label className="flex items-center gap-2.5 mt-4 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={optionChecked}
              onChange={(e) => setOptionChecked(e.target.checked)}
              className="accent-[#8e2f2b] rounded cursor-pointer"
            />
            <span className="font-medium">{optionLabel}</span>
          </label>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onConfirm(optionChecked);
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs"
          >
            Endgültig löschen
          </button>
        </div>
      </div>
    </div>
  );
};
