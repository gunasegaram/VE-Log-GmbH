import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Database,
  Download,
  Upload,
  Layers,
  Truck,
} from 'lucide-react';
import { Project } from '../types';

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onOpenRates: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  onOpenRates,
  onExportBackup,
  onImportBackup,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportBackup(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-stone-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8e2f2b] to-[#68201f] flex items-center justify-center text-white shadow-md shadow-[#8e2f2b]/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-[#8e2f2b]">
                VE-Log
              </span>
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 uppercase">
                Bau
              </span>
            </div>
            <p className="text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
              Mitarbeiterportal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-3">
        <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-stone-400 uppercase">
          Arbeitsplatz
        </p>
        <nav className="space-y-1">
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold bg-[#f7eae9] text-[#8e2f2b]"
          >
            <BarChart3 className="w-4 h-4 text-[#8e2f2b]" />
            <span>Nachkalkulation</span>
          </div>

          <button
            onClick={onOpenRates}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors text-left"
          >
            <span className="flex items-center gap-3">
              <Database className="w-4 h-4 text-stone-400" />
              <span>Stammpreise</span>
            </span>
            <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
              Katalog
            </span>
          </button>
        </nav>
      </div>

      {/* Baustellen List */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-1">
          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
            Baustellen ({projects.length})
          </p>
          <button
            onClick={onOpenNewProject}
            className="text-xs text-[#8e2f2b] font-semibold hover:underline"
          >
            + Neu
          </button>
        </div>

        <div className="mt-1 space-y-1">
          {projects.map((proj) => {
            const isSelected = proj.id === selectedProjectId;
            return (
              <button
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-stone-900 text-white font-medium shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold">{proj.name}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8e2f2b]" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-75 truncate">
                  <span>{proj.customer || 'Kein Kunde'}</span>
                  {proj.costcenter && (
                    <>
                      <span>•</span>
                      <span>{proj.costcenter}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}

          {projects.length === 0 && (
            <p className="text-xs text-stone-400 px-3 py-2 italic">
              Noch keine Baustelle angelegt.
            </p>
          )}
        </div>
      </div>

      {/* Backup & Restore Footer */}
      <div className="p-4 border-t border-stone-200 bg-stone-50/70 space-y-2">
        <p className="text-[10px] text-stone-400 font-medium px-1">
          Datensicherung & Import
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportBackup}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
            title="Alle Baustellen als JSON herunterladen"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Sichern</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
            title="Bestehende JSON-Sicherung einlesen"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Einlesen</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <p className="text-[10px] text-stone-400 leading-tight px-1">
          Daten verbleiben lokal in deinem Browser.
        </p>
      </div>
    </aside>
  );
};
