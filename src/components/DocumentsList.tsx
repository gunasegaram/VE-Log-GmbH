import React, { useState } from 'react';
import { StoredDocument } from '../types';
import { FileText, Trash2, Eye, Calendar, Layers, Receipt } from 'lucide-react';
import { formatMoney } from '../services/calculations';

interface DocumentsListProps {
  documents: StoredDocument[];
  onViewText: (doc: StoredDocument) => void;
  onDeleteDocument: (doc: StoredDocument) => void;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  onViewText,
  onDeleteDocument,
}) => {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Importierte Belege</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {documents.length} Belege
            </span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Historie der eingelesenen PDF- und Excel-Dateien dieser Baustelle.
          </p>
        </div>
      </div>

      <div className="divide-y divide-stone-100 text-xs">
        {documents.map((doc) => {
          const formattedDate = new Date(doc.date).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const isOffer = doc.detectedType === 'offer';

          return (
            <div
              key={doc.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isOffer
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-[#8e2f2b]/10 text-[#8e2f2b]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-stone-900 flex items-center gap-2">
                    <span>{doc.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isOffer
                          ? 'bg-blue-100/70 text-blue-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {isOffer ? 'Angebot' : 'Rechnung'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-300" />
                      {formattedDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-stone-300" />
                      {doc.positionCount} Positionen
                    </span>
                    {doc.netTotal != null && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-stone-600 font-medium">
                          {formatMoney(doc.netTotal)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {doc.rawText && (
                  <button
                    onClick={() => onViewText(doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Quelltext</span>
                  </button>
                )}
                <button
                  onClick={() => onDeleteDocument(doc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Beleg löschen</span>
                </button>
              </div>
            </div>
          );
        })}

        {documents.length === 0 && (
          <div className="py-8 text-center text-stone-400">
            <Receipt className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs">Noch keine Belege für diese Baustelle importiert.</p>
          </div>
        )}
      </div>
    </section>
  );
};
