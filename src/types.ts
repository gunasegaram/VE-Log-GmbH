export type CostCategory =
  | 'Geräte'
  | 'Diesel'
  | 'Schwertransport'
  | 'Personal'
  | 'Schüttgüter'
  | 'Sonstige Kosten';

export const COST_CATEGORIES: CostCategory[] = [
  'Geräte',
  'Diesel',
  'Schwertransport',
  'Personal',
  'Schüttgüter',
  'Sonstige Kosten'
];

export type PositionSide = 'plan' | 'actual'; // plan = Angebot/Kalkulation, actual = Ist/Rechnung/Bericht
export type PositionKind = 'cost' | 'revenue'; // cost = Kosten, revenue = Leistung / Erlös

export interface LedgerRow {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  category: CostCategory;
  side: PositionSide;
  kind: PositionKind;
  date?: string;
  source?: string;
  documentId?: string;
  placeholder?: boolean;
  originalRate?: number | null;
  priceChangedAt?: string;
  note?: string;
}

export interface StoredDocument {
  id: string;
  name: string;
  hash: string;
  date: string;
  fileSize?: number;
  pageCount?: number;
  detectedType: 'offer' | 'invoice' | 'timesheet' | 'delivery' | 'excel' | 'unknown';
  rawText?: string;
  positionCount: number;
  netTotal?: number | null;
}

export interface VariablePrices {
  hourly: number | null; // Netto € / Std. für Plan
  diesel: number | null; // Netto € / Liter für Plan
}

export interface Project {
  id: string;
  name: string;
  customer?: string;
  costcenter?: string;
  overhead: number; // in %, z.B. 15
  variablePrices: VariablePrices;
  rows: LedgerRow[];
  documents: StoredDocument[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterRate {
  id: string;
  name: string;
  unit: string;
  rate: number;
  category: CostCategory;
}

export interface ParsedPosition {
  id: string;
  selected: boolean;
  posNumber?: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  total: number;
  category: CostCategory;
  side: PositionSide;
  kind: PositionKind;
  date?: string;
  note?: string;
  confidence?: 'high' | 'medium' | 'low';
  targetId?: string;
  keepManualPrice?: boolean;
  rateEdited?: boolean;
  offerRate?: number;
}

export interface ParseResult {
  fileName: string;
  hash: string;
  detectedType: 'offer' | 'invoice' | 'timesheet' | 'delivery' | 'excel' | 'unknown';
  detectedProjectName?: string;
  detectedCustomer?: string;
  detectedDate?: string;
  detectedInvoiceNumber?: string;
  rows: ParsedPosition[];
  netTotal: number | null;
  grossTotal: number | null;
  vatAmount: number | null;
  rawText: string;
  sheets?: Array<{
    name: string;
    grid: (string | number)[][];
    rows: ParsedPosition[];
    mapping?: Record<string, number>;
  }>;
  warning?: string;
  mode: 'table' | 'positions' | 'nettotal' | 'unrecognized';
}

export interface AppState {
  version: number;
  projects: Project[];
  selectedProjectId: string | null;
  rates: MasterRate[];
  autoImportImmediately?: boolean;
}
