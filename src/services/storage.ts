import { AppState, Project } from '../types';
import { INITIAL_STATE } from './sampleData';

const STORAGE_KEY = 'velog-nachkalkulation-v2';
const LEGACY_STORAGE_KEY = 'baustellen-ledger-v1';

export function loadAppState(): AppState {
  if (typeof window === 'undefined') return INITIAL_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.projects) && Array.isArray(parsed.rates)) {
        return {
          version: parsed.version || 2,
          projects: parsed.projects,
          selectedProjectId: parsed.selectedProjectId || parsed.projects[0]?.id || null,
          rates: parsed.rates,
          autoImportImmediately: parsed.autoImportImmediately ?? false,
        };
      }
    }

    // Try migration from legacy v1 format if user had prior local data
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy.projects)) {
        const migratedProjects: Project[] = legacy.projects.map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          name: p.name || 'Unbenannte Baustelle',
          customer: p.customer || '',
          costcenter: p.costcenter || '',
          overhead: typeof p.overhead === 'number' ? p.overhead : 15,
          variablePrices: p.variablePrices || { hourly: null, diesel: null },
          rows: Array.isArray(p.rows) ? p.rows : [],
          documents: Array.isArray(p.documents) ? p.documents : [],
        }));

        const migratedRates = Array.isArray(legacy.rates)
          ? legacy.rates.map((r: any, idx: number) => ({
              id: `migrated-${idx}`,
              name: r.name || '',
              unit: r.unit || 'Std.',
              rate: typeof r.rate === 'number' ? r.rate : 0,
              category: 'Geräte',
            }))
          : INITIAL_STATE.rates;

        const migratedState: AppState = {
          version: 2,
          projects: migratedProjects.length > 0 ? migratedProjects : INITIAL_STATE.projects,
          selectedProjectId: legacy.selected || migratedProjects[0]?.id || null,
          rates: migratedRates,
          autoImportImmediately: false,
        };

        saveAppState(migratedState);
        return migratedState;
      }
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }

  return INITIAL_STATE;
}

export function saveAppState(state: AppState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
    return false;
  }
}

export function exportBackupJson(state: AppState): void {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VE-Log_Baustellen_Sicherung_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsvReport(project: Project): void {
  const rows: (string | number)[][] = [
    ['VE-Log Baustellen-Nachkalkulation'],
    ['Baustelle', project.name],
    ['Auftraggeber', project.customer || ''],
    ['Kostenstelle', project.costcenter || ''],
    ['Stand', new Date().toLocaleDateString('de-DE')],
    [],
    [
      'Position / Bezeichnung',
      'Zuordnung',
      'Art',
      'Kostenart',
      'Menge',
      'Einheit',
      'EP netto (€)',
      'Gesamt netto (€)',
      'Datum',
      'Quelle',
    ],
  ];

  for (const r of project.rows) {
    rows.push([
      r.description,
      r.side === 'plan' ? 'Plan' : 'Ist',
      r.kind === 'revenue' ? 'Leistung' : 'Kosten',
      r.kind === 'revenue' ? '-' : r.category,
      String(r.qty).replace('.', ','),
      r.unit,
      String(r.rate).replace('.', ','),
      String(Math.round(r.qty * r.rate * 100) / 100).replace('.', ','),
      r.date || '',
      r.source || 'Manuell erfasst',
    ]);
  }

  const csvContent =
    '\ufeff' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '').replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(';')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Nachkalkulation_${project.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
