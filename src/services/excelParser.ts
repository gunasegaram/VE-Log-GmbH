import * as XLSX from 'xlsx';
import { MasterRate, ParsedPosition, ParseResult, PositionKind, PositionSide } from '../types';
import { parseGermanNumber, detectCategory, cents } from './calculations';

export async function parseExcelFile(
  file: File,
  rates: MasterRate[] = []
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const hash = await computeHash(arrayBuffer);

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const isOffer = /angebot|kalkulation|budget|preisanfrage/i.test(file.name);
  const side: PositionSide = isOffer ? 'plan' : 'actual';
  const kind: PositionKind = isOffer ? 'revenue' : 'cost';

  const sheets: ParseResult['sheets'] = [];
  const allRows: ParsedPosition[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const grid: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    if (grid.length === 0) continue;

    const { rows, mapping } = parseGrid(grid, rates, side, kind);
    sheets.push({
      name: sheetName,
      grid,
      rows,
      mapping: mapping || undefined,
    });

    if (allRows.length === 0 && rows.length > 0) {
      allRows.push(...rows);
    }
  }

  const rawText = sheets
    .map((s) => `[Blatt: ${s.name}]\n` + s.grid.map((r) => r.join(' | ')).join('\n'))
    .join('\n\n');

  const netTotal = allRows.reduce((s, r) => s + r.total, 0);

  return {
    fileName: file.name,
    hash,
    detectedType: isOffer ? 'offer' : 'excel',
    rows: allRows,
    netTotal: netTotal > 0 ? netTotal : null,
    grossTotal: null,
    vatAmount: null,
    rawText,
    sheets,
    mode: allRows.length > 0 ? 'table' : 'unrecognized',
    warning:
      allRows.length === 0
        ? 'In der Excel-Tabelle wurden keine eindeutigen Spalten für Beschreibung, Menge oder Preis erkannt. Bitte wähle das Blatt und passe die Spaltenzuordnung an.'
        : undefined,
  };
}

function parseGrid(
  grid: (string | number)[][],
  rates: MasterRate[],
  side: PositionSide,
  kind: PositionKind
): { rows: ParsedPosition[]; mapping: Record<string, number> | null } {
  const norm = (s: unknown) => String(s ?? '').toLowerCase().trim();

  const columnAliases: Record<string, string[]> = {
    pos: ['pos', 'pos.', 'pos-nr', 'position', 'ordnungszahl', 'oz'],
    description: ['beschreibung', 'bezeichnung', 'leistung', 'leistungstext', 'position', 'artikel', 'name', 'text', 'mitarbeiter', 'gerät'],
    qty: ['menge', 'anzahl', 'stunden', 'std', 'tage', 'quantity', 'stk', 'tonnen', 'gewicht'],
    unit: ['einheit', 'me', 'mengeneinheit', 'dimension', 'unit'],
    rate: ['einzelpreis', 'ep', 'ep netto', 'preis', 'stundensatz', 'tagessatz', 'satz', 'preis/me'],
    total: ['gesamtpreis', 'gp', 'gesamt', 'betrag', 'netto', 'gesamt netto', 'summe', 'total'],
    category: ['kostenart', 'kategorie', 'art'],
    date: ['datum', 'date', 'tag', 'zeitraum'],
  };

  let headerIndex = -1;
  let mapping: Record<string, number> = {};

  // Scan first 25 rows to identify the header row
  for (let r = 0; r < Math.min(25, grid.length); r++) {
    const row = grid[r];
    const m: Record<string, number> = {};

    for (const [key, aliases] of Object.entries(columnAliases)) {
      const idx = row.findIndex((cell) => {
        const text = norm(cell);
        if (!text) return !1;
        if (key === 'total' && /brutto/i.test(text)) return !1;
        return aliases.some((a) => text === a || text.startsWith(a + ' '));
      });
      if (idx >= 0) m[key] = idx;
    }

    if (m.description != null && (m.qty != null || m.total != null || m.rate != null)) {
      mapping = m;
      headerIndex = r;
      break;
    }
  }

  if (headerIndex < 0) {
    return { rows: [], mapping: null };
  }

  const rows: ParsedPosition[] = [];
  const dataRows = grid.slice(headerIndex + 1);

  for (const line of dataRows) {
    const getVal = (k: string) => (mapping[k] != null ? line[mapping[k]] : null);
    const desc = String(getVal('description') ?? '').trim();

    if (!desc) continue;
    if (/^(gesamt(?:summe|betrag|preis)?|summe|netto|brutto|mwst|ust|total)\b/i.test(desc)) {
      continue;
    }

    let qty = parseGermanNumber(getVal('qty'));
    let rate = parseGermanNumber(getVal('rate'));
    let total = parseGermanNumber(getVal('total'));
    let unit = String(getVal('unit') || '').trim();
    const posNumber = String(getVal('pos') || '').trim();

    // Default units if missing
    if (!unit) {
      if (/stunden|std/i.test(desc)) unit = 'Std.';
      else if (/tag|tage/i.test(desc)) unit = 'Tag';
      else if (/liter|diesel/i.test(desc)) unit = 'Liter';
      else unit = 'pauschal';
    }

    if (!Number.isFinite(qty)) {
      qty = Number.isFinite(total) ? 1 : 1;
    }

    if (!Number.isFinite(rate) && Number.isFinite(total) && qty !== 0) {
      rate = cents(total / qty);
    } else if (Number.isFinite(rate) && (!Number.isFinite(total) || total === 0)) {
      total = cents(qty * rate);
    } else if (!Number.isFinite(rate)) {
      const matched = rates.find((r) => desc.toLowerCase().includes(r.name.toLowerCase()));
      if (matched) {
        rate = matched.rate;
        unit = unit || matched.unit;
        total = cents(qty * rate);
      } else {
        rate = 0;
        total = 0;
      }
    }

    const category = detectCategory(desc, unit);

    rows.push({
      id: crypto.randomUUID(),
      selected: true,
      posNumber: posNumber || undefined,
      description: desc,
      qty,
      unit: unit || 'Stk.',
      rate: rate || 0,
      total: total || 0,
      category,
      side,
      kind,
      confidence: 'high',
    });
  }

  return { rows, mapping };
}

async function computeHash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
