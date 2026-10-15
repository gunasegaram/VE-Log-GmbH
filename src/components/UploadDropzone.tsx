import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Plus,
  Fuel,
  Receipt,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelected: (file: File, isOffer: boolean) => void;
  onOpenManualPosition: () => void;
  onOpenDieselModal: () => void;
  onOpenOtherCostModal: () => void;
  onOpenTimeModal: () => void;
  onLoadSampleInvoice: () => void;
  onLoadSampleOffer: () => void;
  isProcessing: boolean;
  statusMessage?: string;
  isError?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  onOpenManualPosition,
  onOpenDieselModal,
  onOpenOtherCostModal,
  onOpenTimeModal,
  onLoadSampleInvoice,
  onLoadSampleOffer,
  isProcessing,
  statusMessage,
  isError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const offerFileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isOffer = /angebot|kalkulation|budget/i.test(file.name);
      onFileSelected(file, isOffer);
    }
  };

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isOffer = /angebot|kalkulation|budget/i.test(file.name);
      onFileSelected(file, isOffer);
      e.target.value = '';
    }
  };

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0], true);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-sm space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-6 md:p-8 transition-all flex flex-col items-center justify-center text-center ${
          isDragOver
            ? 'border-[#8e2f2b] bg-[#fbefee]'
            : 'border-stone-300 hover:border-[#8e2f2b]/50 bg-stone-50/60'
        } ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-stone-200 flex items-center justify-center mb-3">
          {isProcessing ? (
            <div className="w-6 h-6 border-3 border-[#8e2f2b] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-7 h-7 text-[#8e2f2b]" />
          )}
        </div>

        <h2 className="text-base md:text-lg font-bold text-stone-900 tracking-tight">
          PDF-Rechnung, Angebot oder Excel-Tabelle hier ablegen
        </h2>
        <p className="text-xs md:text-sm text-stone-500 max-w-lg mt-1 mb-5">
          Erkennt Positionen, Mengen, Einheiten und Nettopreise automatisch.
          Unterstützt Rechnungen, Angebote, Stundenzettel, Lieferscheine und Dieselquittungen.
        </p>

        {/* Action Buttons for Upload */}
        <div className="flex flex-wrap gap-2.5 justify-center items-center">
          <button
            onClick={() => offerFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8e2f2b] hover:bg-[#68201f] text-white font-semibold text-xs shadow-sm transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Angebot einlesen (Plan)</span>
          </button>
          <input
            ref={offerFileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={handleOfferChange}
            className="hidden"
          />

          <button
            onClick={() => generalFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-2xs transition-all"
          >
            <Receipt className="w-4 h-4 text-stone-600" />
            <span>Rechnung / Beleg einlesen (Ist)</span>
          </button>
          <input
            ref={generalFileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={handleGeneralChange}
            className="hidden"
          />
        </div>

        {/* Fast Test Samples */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-stone-200/80 text-xs text-stone-500">
          <span className="flex items-center gap-1 font-medium text-stone-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Schnelltest mit Musterdaten:
          </span>
          <button
            onClick={onLoadSampleInvoice}
            className="px-2.5 py-1 rounded-md bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors"
          >
            Muster-Rechnung testen
          </button>
          <button
            onClick={onLoadSampleOffer}
            className="px-2.5 py-1 rounded-md bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors"
          >
            Muster-Angebot testen
          </button>
        </div>
      </div>

      {/* Manual Quick Entry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-1">
            Direkterfassung:
          </span>
          <button
            onClick={onOpenManualPosition}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500" />
            <span>Position</span>
          </button>
          <button
            onClick={onOpenDieselModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-600" />
            <span>Diesel</span>
          </button>
          <button
            onClick={onOpenTimeModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Arbeitszeit</span>
          </button>
          <button
            onClick={onOpenOtherCostModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-purple-600" />
            <span>Sonstige Kosten</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
              isError
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
