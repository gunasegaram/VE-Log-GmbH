import React, { useState, useEffect } from 'react';
import { AppState, Project, LedgerRow, ParsedPosition, StoredDocument, MasterRate } from './types';
import { loadAppState, saveAppState, exportBackupJson, exportCsvReport } from './services/storage';
import { parsePdfFile } from './services/pdfParser';
import { parseExcelFile } from './services/excelParser';
import { calculateProjectTotals, cents, detectCategory } from './services/calculations';
import { INITIAL_RATES, createInitialProject } from './services/sampleData';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { UploadDropzone } from './components/UploadDropzone';
import { MetricsCards } from './components/MetricsCards';
import { PlanActualComparison } from './components/PlanActualComparison';
import { CostDistributionPanel } from './components/CostDistributionPanel';
import { LedgerTable } from './components/LedgerTable';
import { DocumentsList } from './components/DocumentsList';
import { ImportReviewModal } from './components/ImportReviewModal';
import {
  NewProjectModal,
  PositionModal,
  DieselModal,
  TimeModal,
  MasterRatesModal,
  DeleteConfirmModal,
} from './components/QuickModals';

import {
  Building2,
  Trash2,
  Plus,
  Undo2,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(loadAppState);
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    undoAction?: () => void;
  } | null>(null);

  // Modals state
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isStatusError, setIsStatusError] = useState(false);
  const [pendingParseResult, setPendingParseResult] = useState<any>(null);

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<LedgerRow | null>(null);

  const [isDieselModalOpen, setIsDieselModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isOtherCostModalOpen, setIsOtherCostModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);

  // Raw text viewer modal
  const [viewingDocText, setViewingDocText] = useState<{ title: string; text: string } | null>(null);

  // Delete confirmation modals
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'project' | 'document';
    title: string;
    message: string;
    optionLabel?: string;
    onConfirm: (withOption: boolean) => void;
  } | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Current active project
  const currentProject =
    state.projects.find((p) => p.id === state.selectedProjectId) ||
    state.projects[0] ||
    null;

  const projectTotals = currentProject
    ? calculateProjectTotals(currentProject)
    : null;

  // Show Toast Helper
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    undoAction?: () => void
  ) => {
    const id = crypto.randomUUID();
    setToast({ id, message, type, undoAction });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 6000);
  };

  // --- PROJECT MANAGEMENT ---
  const handleCreateProject = (name: string, customer: string, costcenter: string) => {
    const newProj: Project = {
      id: crypto.randomUUID(),
      name,
      customer,
      costcenter,
      overhead: 15,
      variablePrices: { hourly: null, diesel: null },
      rows: [
        {
          id: crypto.randomUUID(),
          description: 'Geräte (Planansatz)',
          qty: 0,
          unit: 'Tag',
          rate: 0,
          category: 'Geräte',
          side: 'plan',
          kind: 'cost',
          placeholder: true,
          source: 'Vorbereitetes Planfeld',
        },
        {
          id: crypto.randomUUID(),
          description: 'Diesel (Planansatz)',
          qty: 0,
          unit: 'Liter',
          rate: 0,
          category: 'Diesel',
          side: 'plan',
          kind: 'cost',
          placeholder: true,
          source: 'Vorbereitetes Planfeld',
        },
        {
          id: crypto.randomUUID(),
          description: 'Personal (Planansatz)',
          qty: 0,
          unit: 'Std.',
          rate: 0,
          category: 'Personal',
          side: 'plan',
          kind: 'cost',
          placeholder: true,
          source: 'Vorbereitetes Planfeld',
        },
      ],
      documents: [],
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, newProj],
      selectedProjectId: newProj.id,
    }));

    showToast(`Baustelle „${name}“ angelegt.`);
  };

  const handleDeleteProjectRequest = () => {
    if (!currentProject) return;
    const projToDelete = currentProject;
    const previousIndex = state.projects.findIndex((p) => p.id === projToDelete.id);

    setDeleteConfirm({
      type: 'project',
      title: 'Baustelle löschen',
      message: `Möchtest du die Baustelle „${projToDelete.name}“ mit allen ${projToDelete.rows.length} Positionen und ${projToDelete.documents.length} Belegen wirklich löschen?`,
      onConfirm: () => {
        const remaining = state.projects.filter((p) => p.id !== projToDelete.id);
        const nextSelected = remaining[Math.min(previousIndex, remaining.length - 1)]?.id || null;

        setState((prev) => ({
          ...prev,
          projects: remaining,
          selectedProjectId: nextSelected,
        }));

        showToast(
          `Baustelle „${projToDelete.name}“ gelöscht.`,
          'info',
          () => {
            setState((prev) => ({
              ...prev,
              projects: [...prev.projects, projToDelete],
              selectedProjectId: projToDelete.id,
            }));
            showToast('Löschen der Baustelle rückgängig gemacht.');
          }
        );
      },
    });
  };

  // --- FILE IMPORT PROCESSING (PDF & EXCEL) ---
  const handleFileSelected = async (file: File, isOffer: boolean) => {
    setIsProcessingFile(true);
    setStatusMessage(`${file.name} wird analysiert & Positionen werden erkannt…`);
    setIsStatusError(false);

    try {
      let result;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        result = await parsePdfFile(file, state.rates);
      } else if (/\.(xlsx|xls)$/i.test(file.name)) {
        result = await parseExcelFile(file, state.rates);
      } else {
        throw new Error('Bitte eine PDF- oder Excel-Datei (.xlsx) auswählen.');
      }

      // Check if file is already imported in the current project
      if (currentProject?.documents.some((d) => d.hash === result.hash)) {
        setStatusMessage(`Hinweis: ${file.name} wurde bereits früher eingelesen.`);
      }

      // Override detected type if user explicitly selected "Angebot einlesen"
      if (isOffer) {
        result.detectedType = 'offer';
        result.rows.forEach((r) => {
          r.side = 'plan';
          r.kind = 'revenue';
        });
      }

      setPendingParseResult(result);
      setStatusMessage(`${result.rows.length} Positionen in ${file.name} erkannt.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Fehler beim Einlesen: ${err.message}`);
      setIsStatusError(true);
      showToast(err.message, 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleAcceptImport = (
    acceptedPositions: ParsedPosition[],
    targetProjectId: string,
    createProjectName?: string,
    customerName?: string
  ) => {
    if (!pendingParseResult) return;

    let targetProj = state.projects.find((p) => p.id === targetProjectId);

    // If user chose to create a new project directly from this document
    if (!targetProj && createProjectName) {
      targetProj = {
        id: crypto.randomUUID(),
        name: createProjectName,
        customer: customerName || '',
        costcenter: '',
        overhead: 15,
        variablePrices: { hourly: null, diesel: null },
        rows: [],
        documents: [],
        createdAt: new Date().toISOString(),
      };
    }

    if (!targetProj) {
      if (state.projects.length === 0) {
        targetProj = {
          id: crypto.randomUUID(),
          name: createProjectName || pendingParseResult.fileName.replace(/\.(pdf|xlsx)$/i, ''),
          customer: customerName || '',
          costcenter: '',
          overhead: 15,
          variablePrices: { hourly: null, diesel: null },
          rows: [],
          documents: [],
          createdAt: new Date().toISOString(),
        };
      } else {
        targetProj = state.projects[0];
      }
    }

    const docId = crypto.randomUUID();
    const newDoc: StoredDocument = {
      id: docId,
      name: pendingParseResult.fileName,
      hash: pendingParseResult.hash,
      date: new Date().toISOString(),
      detectedType: pendingParseResult.detectedType,
      positionCount: acceptedPositions.length,
      rawText: pendingParseResult.rawText,
      netTotal: acceptedPositions.reduce((s, r) => s + r.total, 0),
    };

    const newRows: LedgerRow[] = acceptedPositions.map((p) => ({
      id: crypto.randomUUID(),
      description: p.description,
      qty: p.qty,
      unit: p.unit,
      rate: p.rate,
      category: p.category,
      side: p.side,
      kind: p.kind,
      date: p.date || pendingParseResult.detectedDate || new Date().toISOString().split('T')[0],
      source: pendingParseResult.fileName,
      documentId: docId,
      note: p.note,
    }));

    const updatedProjects = state.projects.some((p) => p.id === targetProj.id)
      ? state.projects.map((p) =>
          p.id === targetProj.id
            ? {
                ...p,
                rows: [...p.rows, ...newRows],
                documents: [...p.documents, newDoc],
              }
            : p
        )
      : [
          ...state.projects,
          {
            ...targetProj,
            rows: newRows,
            documents: [newDoc],
          },
        ];

    setState((prev) => ({
      ...prev,
      projects: updatedProjects,
      selectedProjectId: targetProj.id,
    }));

    setPendingParseResult(null);
    setStatusMessage(`${newRows.length} Positionen automatisch übernommen.`);
    showToast(
      `${newRows.length} Positionen aus „${pendingParseResult.fileName}“ in „${targetProj.name}“ eingefügt.`
    );
  };

  // --- ROW OPERATIONS ---
  const handleUpdateRow = (id: string, updates: Partial<LedgerRow>) => {
    if (!currentProject) return;

    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === currentProject.id
          ? {
              ...p,
              rows: p.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
            }
          : p
      ),
    }));
  };

  const handleSavePosition = (positionData: Partial<LedgerRow>) => {
    if (!currentProject) return;

    if (positionData.id) {
      // Edit existing
      handleUpdateRow(positionData.id, positionData);
      showToast('Position aktualisiert.');
    } else {
      // Add new
      const newRow: LedgerRow = {
        id: crypto.randomUUID(),
        description: positionData.description || 'Neue Position',
        qty: positionData.qty || 1,
        unit: positionData.unit || 'pauschal',
        rate: positionData.rate || 0,
        category: positionData.category || 'Sonstige Kosten',
        side: positionData.side || 'actual',
        kind: positionData.kind || 'cost',
        date: positionData.date || new Date().toISOString().split('T')[0],
        source: 'Manuell erfasst',
      };

      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === currentProject.id
            ? { ...p, rows: [...p.rows, newRow] }
            : p
        ),
      }));

      showToast('Position hinzugefügt.');
    }
  };

  const handleDeleteRow = (id: string) => {
    if (!currentProject) return;
    const rowIndex = currentProject.rows.findIndex((r) => r.id === id);
    if (rowIndex < 0) return;
    const removedRow = currentProject.rows[rowIndex];

    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === currentProject.id
          ? { ...p, rows: p.rows.filter((r) => r.id !== id) }
          : p
      ),
    }));

    showToast('Position entfernt.', 'info', () => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === currentProject.id
            ? {
                ...p,
                rows: [
                  ...p.rows.slice(0, rowIndex),
                  removedRow,
                  ...p.rows.slice(rowIndex),
                ],
              }
            : p
        ),
      }));
      showToast('Position wiederhergestellt.');
    });
  };

  // --- DOCUMENT OPERATIONS ---
  const handleDeleteDocument = (doc: StoredDocument) => {
    if (!currentProject) return;

    setDeleteConfirm({
      type: 'document',
      title: 'Beleg löschen',
      message: `Möchtest du den Beleg „${doc.name}“ entfernen?`,
      optionLabel: 'Auch alle zugehörigen importierten Positionen aus der Baustelle entfernen',
      onConfirm: (withPositions) => {
        const remainingDocs = currentProject.documents.filter((d) => d.id !== doc.id);
        const remainingRows = withPositions
          ? currentProject.rows.filter((r) => r.documentId !== doc.id)
          : currentProject.rows.map((r) => (r.documentId === doc.id ? { ...r, documentId: undefined } : r));

        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === currentProject.id
              ? {
                  ...p,
                  documents: remainingDocs,
                  rows: remainingRows,
                }
              : p
          ),
        }));

        showToast(
          withPositions
            ? `Beleg „${doc.name}“ und zugehörige Positionen gelöscht.`
            : `Beleg „${doc.name}“ gelöscht (Positionen beibehalten).`
        );
      },
    });
  };

  // --- VARIABLE PRICES & OVERHEAD ---
  const handleUpdateVariablePrices = (hourly: number | null, diesel: number | null) => {
    if (!currentProject) return;

    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== currentProject.id) return p;

        // Recalculate matching plan positions if variable price changed
        const updatedRows = p.rows.map((row) => {
          if (row.side !== 'plan' || row.kind !== 'cost') return row;

          if (hourly !== null && row.category === 'Personal' && /^(std\.?|h|stunden)$/i.test(row.unit)) {
            return {
              ...row,
              originalRate: row.originalRate ?? row.rate,
              rate: hourly,
              priceChangedAt: new Date().toISOString(),
            };
          }

          if (diesel !== null && row.category === 'Diesel' && /^(l|liter)$/i.test(row.unit)) {
            return {
              ...row,
              originalRate: row.originalRate ?? row.rate,
              rate: diesel,
              priceChangedAt: new Date().toISOString(),
            };
          }

          return row;
        });

        return {
          ...p,
          variablePrices: { hourly, diesel },
          rows: updatedRows,
        };
      }),
    }));

    showToast('Planpreise aktualisiert & passende Positionen neu berechnet.');
  };

  const handleUpdateOverhead = (overhead: number) => {
    if (!currentProject) return;
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === currentProject.id ? { ...p, overhead } : p
      ),
    }));
    showToast(`Verwaltungssatz auf ${overhead} % aktualisiert.`);
  };

  // --- SAMPLE TEST DATA ---
  const handleLoadSampleInvoice = () => {
    const samplePositions: ParsedPosition[] = [
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '1',
        description: 'Miete Kettenbagger CAT 326 (Einsatz Woche 14)',
        qty: 5,
        unit: 'Tag',
        rate: 250,
        total: 1250,
        category: 'Geräte',
        side: 'actual',
        kind: 'cost',
        note: 'Erkannt: Gerätetarif CAT 326',
        confidence: 'high',
      },
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '2',
        description: 'Dieselkraftstoff EN 590 Tankung Baustelle',
        qty: 850,
        unit: 'Liter',
        rate: 1.64,
        total: 1394,
        category: 'Diesel',
        side: 'actual',
        kind: 'cost',
        note: 'Erkannt: Dieselpreis 1,64 €',
        confidence: 'high',
      },
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '3',
        description: 'Maschinist Baggerbetrieb nach Nachweis',
        qty: 42.5,
        unit: 'Std.',
        rate: 50,
        total: 2125,
        category: 'Personal',
        side: 'actual',
        kind: 'cost',
        note: 'Erkannt: Stundensatz 50,00 €',
        confidence: 'high',
      },
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '4',
        description: 'Lieferung Schottertragschicht 0/45',
        qty: 185.4,
        unit: 't',
        rate: 18.2,
        total: 3374.28,
        category: 'Schüttgüter',
        side: 'actual',
        kind: 'cost',
        note: 'Erkannt: Schotterlieferung',
        confidence: 'high',
      },
    ];

    setPendingParseResult({
      fileName: 'Rechnung_RE-2024-8841_Muster.pdf',
      hash: 'sample-inv-' + Date.now(),
      detectedType: 'invoice',
      detectedProjectName: currentProject?.name || 'B470 Ortsdurchfahrt',
      detectedCustomer: 'Baustoff- & Maschinenverleih Franken GmbH',
      detectedDate: new Date().toISOString().split('T')[0],
      detectedInvoiceNumber: 'RE-2024-8841',
      rows: samplePositions,
      netTotal: 8143.28,
      grossTotal: 9690.5,
      vatAmount: 1547.22,
      rawText:
        'Rechnung Nr. RE-2024-8841\nDatum: ' +
        new Date().toLocaleDateString('de-DE') +
        '\nBauvorhaben: ' +
        (currentProject?.name || 'B470 Ortsdurchfahrt') +
        '\n\nPos 1: Miete Kettenbagger CAT 326 5 Tag à 250,00 € = 1.250,00 €\nPos 2: Dieselkraftstoff EN 590 850 Liter à 1,64 € = 1.394,00 €\nPos 3: Maschinist Baggerbetrieb 42,5 Std. à 50,00 € = 2.125,00 €\nPos 4: Lieferung Schottertragschicht 0/45 185,4 to à 18,20 € = 3.374,28 €\n\nNettobetrag: 8.143,28 €\nzzgl. 19% MwSt: 1.547,22 €\nGesamtbetrag brutto: 9.690,50 €',
      mode: 'positions',
    });
  };

  const handleLoadSampleOffer = () => {
    const samplePositions: ParsedPosition[] = [
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '01.01',
        description: 'Boden der Bodenklassen 3-5 lösen, laden und entsorgen',
        qty: 650,
        unit: 'm³',
        rate: 19.5,
        total: 12675,
        category: 'Sonstige Kosten',
        side: 'plan',
        kind: 'revenue',
        note: 'Angebotsposition Hauptleistung',
        confidence: 'high',
      },
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '01.02',
        description: 'Planum herstellen und verdichten mit Hamm Walzenzug',
        qty: 1800,
        unit: 'm²',
        rate: 4.8,
        total: 8640,
        category: 'Sonstige Kosten',
        side: 'plan',
        kind: 'revenue',
        note: 'Angebotsposition Erdplanum',
        confidence: 'high',
      },
      {
        id: crypto.randomUUID(),
        selected: true,
        posNumber: '01.03',
        description: 'Frostschutzschicht 0/32 liefern und profilgerecht einbauen',
        qty: 850,
        unit: 't',
        rate: 22.5,
        total: 19125,
        category: 'Sonstige Kosten',
        side: 'plan',
        kind: 'revenue',
        note: 'Angebotsposition Tragschicht',
        confidence: 'high',
      },
    ];

    setPendingParseResult({
      fileName: 'Angebot_ANG-2024-0312_Muster.pdf',
      hash: 'sample-off-' + Date.now(),
      detectedType: 'offer',
      detectedProjectName: currentProject?.name || 'Neubau Umgehungsstraße',
      detectedCustomer: 'Landkreis Forchheim - Tiefbauamt',
      detectedDate: new Date().toISOString().split('T')[0],
      detectedInvoiceNumber: 'ANG-2024-0312',
      rows: samplePositions,
      netTotal: 40440,
      grossTotal: 48123.6,
      vatAmount: 7683.6,
      rawText:
        'Angebot Nr. ANG-2024-0312\nProjekt: ' +
        (currentProject?.name || 'Neubau Umgehungsstraße') +
        '\n\n01.01 Boden der Bodenklassen 3-5 lösen, laden und entsorgen 650 m³ 19,50 € 12.675,00 €\n01.02 Planum herstellen und verdichten 1800 m² 4,80 € 8.640,00 €\n01.03 Frostschutzschicht 0/32 liefern und einbauen 850 to 22,50 € 19.125,00 €\n\nNettosumme Angebot: 40.440,00 €',
      mode: 'positions',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#232735] flex flex-col antialiased">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          projects={state.projects}
          selectedProjectId={state.selectedProjectId}
          onSelectProject={(id) => setState((prev) => ({ ...prev, selectedProjectId: id }))}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onOpenRates={() => setIsRatesModalOpen(true)}
          onExportBackup={() => exportBackupJson(state)}
          onImportBackup={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const parsed = JSON.parse(e.target?.result as string);
                if (Array.isArray(parsed.projects)) {
                  setState({
                    version: parsed.version || 2,
                    projects: parsed.projects,
                    selectedProjectId: parsed.selectedProjectId || parsed.projects[0]?.id || null,
                    rates: parsed.rates || INITIAL_RATES,
                  });
                  showToast('Datensicherung erfolgreich wiederhergestellt.');
                }
              } catch (err: any) {
                showToast(`Fehler beim Einlesen: ${err.message}`, 'error');
              }
            };
            reader.readAsText(file);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <Header onPrint={handlePrint} />

          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Top Project Selector & Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#8e2f2b] uppercase">
                  Vom Beleg zum Ergebnis
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight mt-0.5">
                  {currentProject?.name || 'Keine Baustelle ausgewählt'}
                </h1>
                <p className="text-xs md:text-sm text-stone-500 mt-1">
                  {currentProject
                    ? [currentProject.customer, currentProject.costcenter && `KSt: ${currentProject.costcenter}`]
                        .filter(Boolean)
                        .join(' • ') || 'Bereit für Belege & Kalkulation.'
                    : 'Lege deine erste Baustelle an oder wähle eine bestehende aus.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsNewProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8e2f2b] hover:bg-[#68201f] text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Baustelle anlegen</span>
                </button>

                {currentProject && (
                  <button
                    onClick={handleDeleteProjectRequest}
                    className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Aktuelle Baustelle löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Smart PDF / Excel Dropzone */}
            <UploadDropzone
              onFileSelected={handleFileSelected}
              onOpenManualPosition={() => {
                setEditingRow(null);
                setIsPositionModalOpen(true);
              }}
              onOpenDieselModal={() => setIsDieselModalOpen(true)}
              onOpenOtherCostModal={() => {
                setEditingRow({
                  id: '',
                  description: 'Sonstige Baustellenkosten',
                  qty: 1,
                  unit: 'pauschal',
                  rate: 0,
                  category: 'Sonstige Kosten',
                  side: 'actual',
                  kind: 'cost',
                  date: new Date().toISOString().split('T')[0],
                });
                setIsPositionModalOpen(true);
              }}
              onOpenTimeModal={() => setIsTimeModalOpen(true)}
              onLoadSampleInvoice={handleLoadSampleInvoice}
              onLoadSampleOffer={handleLoadSampleOffer}
              isProcessing={isProcessingFile}
              statusMessage={statusMessage}
              isError={isStatusError}
            />

            {/* If Project exists: Metrics, Tables, and Ledger */}
            {currentProject && projectTotals ? (
              <div className="space-y-6">
                {/* 1. Metrics Cards */}
                <MetricsCards totals={projectTotals} />

                {/* 2. Side-by-Side: Plan vs Actual Table & Cost Distribution Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7">
                    <PlanActualComparison
                      totals={projectTotals}
                      onPrint={handlePrint}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <CostDistributionPanel
                      project={currentProject}
                      totals={projectTotals}
                      onUpdateVariablePrices={handleUpdateVariablePrices}
                      onUpdateOverhead={handleUpdateOverhead}
                    />
                  </div>
                </div>

                {/* 3. Detailed Positions Ledger Table */}
                <LedgerTable
                  rows={currentProject.rows}
                  onUpdateRow={handleUpdateRow}
                  onEditRow={(row) => {
                    setEditingRow(row);
                    setIsPositionModalOpen(true);
                  }}
                  onDeleteRow={handleDeleteRow}
                  onOpenAddModal={() => {
                    setEditingRow(null);
                    setIsPositionModalOpen(true);
                  }}
                  onExportCsv={() => exportCsvReport(currentProject)}
                />

                {/* 4. Imported Documents Archive */}
                <DocumentsList
                  documents={currentProject.documents}
                  onViewText={(doc) =>
                    setViewingDocText({
                      title: doc.name,
                      text: doc.rawText || 'Kein extrahierter Text vorhanden.',
                    })
                  }
                  onDeleteDocument={handleDeleteDocument}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
                <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-900">Keine aktive Baustelle</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                  Lege jetzt deine erste Baustelle an oder ziehe oben einfach eine PDF-Rechnung hinein, um automatisch eine Baustelle zu starten.
                </p>
                <button
                  onClick={() => setIsNewProjectOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8e2f2b] hover:bg-[#68201f] text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Erste Baustelle anlegen</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- ALL MODALS --- */}
      {/* 1. PDF/Excel Import Review & Confirmation Modal */}
      {pendingParseResult && (
        <ImportReviewModal
          parseResult={pendingParseResult}
          currentProject={currentProject}
          projects={state.projects}
          onAccept={handleAcceptImport}
          onCancel={() => setPendingParseResult(null)}
        />
      )}

      {/* 2. New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* 3. Manual Position / Edit Position Modal */}
      <PositionModal
        isOpen={isPositionModalOpen}
        onClose={() => {
          setIsPositionModalOpen(false);
          setEditingRow(null);
        }}
        onSave={handleSavePosition}
        editingRow={editingRow}
        rates={state.rates}
      />

      {/* 4. Quick Diesel Modal */}
      <DieselModal
        isOpen={isDieselModalOpen}
        onClose={() => setIsDieselModalOpen(false)}
        defaultPrice={currentProject?.variablePrices.diesel ?? 1.65}
        onSave={(liters, rate, date, desc) => {
          handleSavePosition({
            description: desc,
            qty: liters,
            unit: 'Liter',
            rate,
            category: 'Diesel',
            side: 'actual',
            kind: 'cost',
            date,
            source: 'Dieseltankung Baustelle',
          });
        }}
      />

      {/* 5. Work Time Modal */}
      <TimeModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        rates={state.rates}
        onSave={handleSavePosition}
      />

      {/* 6. Master Rates Modal */}
      <MasterRatesModal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        rates={state.rates}
        onSaveRates={(updatedRates) => {
          setState((prev) => ({ ...prev, rates: updatedRates }));
          showToast('Stammpreise aktualisiert.');
        }}
      />

      {/* 7. Delete Confirmation Dialog */}
      {deleteConfirm && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          optionLabel={deleteConfirm.optionLabel}
          onConfirm={deleteConfirm.onConfirm}
        />
      )}

      {/* 8. Raw Document Text Modal */}
      {viewingDocText && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl max-h-[85vh] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8e2f2b]" />
                <h3 className="text-base font-bold text-stone-900">{viewingDocText.title}</h3>
              </div>
              <button
                onClick={() => setViewingDocText(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-xl bg-stone-950 text-stone-100 font-mono text-xs whitespace-pre-wrap">
              {viewingDocText.text}
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setViewingDocText(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-900 text-white shadow-2xl text-xs font-medium border border-stone-700 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => {
                toast.undoAction?.();
                setToast(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-amber-300 hover:underline font-bold ml-2 shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Rückgängig</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
