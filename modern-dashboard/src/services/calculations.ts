import { CostCategory, COST_CATEGORIES, LedgerRow, Project } from '../types';

export const cents = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export function parseGermanNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v == null) return NaN;
  let s = String(v).trim().replace(/[\s\u00A0€$EUR]+/gi, '');
  if (!s) return NaN;

  // Check if both . and , exist:
  // e.g. "1.250,50" -> dot is thousands, comma is decimal
  // or "1,250.50" -> comma is thousands, dot is decimal
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // German format: 1.250,50
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,250.50
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Comma only: 1250,50
    s = s.replace(',', '.');
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : NaN;
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0,00 €';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number | null | undefined, maxDecimals: number = 2): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n);
}

export function detectCategory(text: string, unit: string = ''): CostCategory {
  const s = `${text} ${unit}`.toLowerCase();

  // Diesel / Kraftstoffe
  if (/diesel|kraftstoff|ad.?blue|treibstoff|heizöl|super\s*(e10|e5)|tanken|tankbeleg|zapfsäule/i.test(s)) {
    return 'Diesel';
  }

  // Personal
  if (/stund|std\.?|\bh\b|personal|mitarbeiter|maschinist|bauleiter|polier|handarbeiter|facharbeiter|monteur|werker|lohn|stundenlohn|regie|schicht/i.test(s)) {
    return 'Personal';
  }

  // Schwertransport / Tieflader
  if (/schwertransport|tieflader|transport|überführung|sattelzug|abroller|muldenkipper|fuhrlohn|anfahrt|abfahrt|spedition|maut/i.test(s)) {
    return 'Schwertransport';
  }

  // Schüttgüter
  if (/material|schütt|kies|sand|schotter|mineralbeton|asphalt|frostschutz|recycling|rc-|boden|aushub|humus|mutterboden|splitt|mischgut|beton|entsorgung.*boden/i.test(s)) {
    return 'Schüttgüter';
  }

  // Geräte
  if (/gerät|bagger|raupe|walze|radlader|maschine|dumper|fräse|fertiger|verdichter|rüttel|miete|mietgerät|gerätetag|caterpillar|liebherr|komatsu|wirtgen|fendt|metso|keestrack/i.test(s)) {
    return 'Geräte';
  }

  return 'Sonstige Kosten';
}

export function calculateWorkHours(start: string, end: string, pause: string): number {
  const parse = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m || +m[1] > 23 || +m[2] > 59) {
      throw new Error('Uhrzeit bitte als HH:MM eingeben.');
    }
    return +m[1] * 60 + +m[2];
  };

  let minutes = parse(end) - parse(start);
  if (minutes < 0) minutes += 1440; // Over midnight

  let breakMinutes = 0;
  if (pause === 'auto') {
    // German working hours law (ArbZG): >6h = 30min, >9h = 45min, >12h = 60min
    if (minutes > 720) breakMinutes = 60;
    else if (minutes > 540) breakMinutes = 45;
    else if (minutes > 360) breakMinutes = 30;
    else breakMinutes = 0;
  } else {
    breakMinutes = parseGermanNumber(pause);
    if (!Number.isFinite(breakMinutes) || breakMinutes < 0) breakMinutes = 0;
  }

  if (breakMinutes > minutes) {
    throw new Error('Pause kann nicht länger als die gesamte Schichtdauer sein.');
  }

  return cents((minutes - breakMinutes) / 60);
}

export interface CategoryComparison {
  name: string;
  plan: number;
  actual: number;
  diff: number; // actual - plan (positive = cost overrun)
}

export interface ProjectTotals {
  revenue: { plan: number; actual: number; diff: number };
  cost: { plan: number; actual: number; diff: number };
  profit: { plan: number; actual: number; diff: number };
  margin: { plan: number; actual: number };
  categories: CategoryComparison[];
  overhead: { plan: number; actual: number };
}

export function calculateProjectTotals(project: Project): ProjectTotals {
  let costPlan = 0;
  let costActual = 0;
  let revPlan = 0;
  let revActual = 0;

  const catMap: Record<CostCategory, { plan: number; actual: number }> = {
    Geräte: { plan: 0, actual: 0 },
    Diesel: { plan: 0, actual: 0 },
    Schwertransport: { plan: 0, actual: 0 },
    Personal: { plan: 0, actual: 0 },
    Schüttgüter: { plan: 0, actual: 0 },
    'Sonstige Kosten': { plan: 0, actual: 0 },
  };

  for (const row of project.rows) {
    const val = cents(row.qty * row.rate);
    if (row.kind === 'revenue') {
      if (row.side === 'plan') revPlan += val;
      else revActual += val;
    } else {
      if (row.side === 'plan') {
        costPlan += val;
        if (catMap[row.category]) catMap[row.category].plan += val;
      } else {
        costActual += val;
        if (catMap[row.category]) catMap[row.category].actual += val;
      }
    }
  }

  // Overhead (Verwaltung) calculation based on revenues
  const overheadPct = project.overhead || 0;
  const overheadPlan = cents((revPlan * overheadPct) / 100);
  const overheadActual = cents((revActual * overheadPct) / 100);

  costPlan = cents(costPlan + overheadPlan);
  costActual = cents(costActual + overheadActual);
  revPlan = cents(revPlan);
  revActual = cents(revActual);

  const profitPlan = cents(revPlan - costPlan);
  const profitActual = cents(revActual - costActual);

  const categories: CategoryComparison[] = COST_CATEGORIES.map((name) => {
    const p = cents(catMap[name]?.plan || 0);
    const a = cents(catMap[name]?.actual || 0);
    return {
      name,
      plan: p,
      actual: a,
      diff: cents(a - p),
    };
  });

  // Add Verwaltung as separate category
  categories.push({
    name: 'Verwaltung',
    plan: overheadPlan,
    actual: overheadActual,
    diff: cents(overheadActual - overheadPlan),
  });

  return {
    revenue: { plan: revPlan, actual: revActual, diff: cents(revActual - revPlan) },
    cost: { plan: costPlan, actual: costActual, diff: cents(costActual - costPlan) },
    profit: { plan: profitPlan, actual: profitActual, diff: cents(profitActual - profitPlan) },
    margin: {
      plan: revPlan > 0 ? (profitPlan / revPlan) * 100 : 0,
      actual: revActual > 0 ? (profitActual / revActual) * 100 : 0,
    },
    categories,
    overhead: { plan: overheadPlan, actual: overheadActual },
  };
}
