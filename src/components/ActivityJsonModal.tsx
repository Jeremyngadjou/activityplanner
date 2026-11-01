import React, { useState, useRef } from 'react';
import { Activity } from '../types';
import { Download, Upload, FileText, Check, AlertCircle, X, ChevronRight, Layers } from 'lucide-react';

interface ActivityJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  activeYear: number;
  activeMonth: number;
  monthNames: string[];
  onImportActivities: (monthKey: string, activities: Activity[], mode: 'merge' | 'replace') => Promise<void>;
}

export const ActivityJsonModal: React.FC<ActivityJsonModalProps> = ({
  isOpen,
  onClose,
  activities,
  activeYear,
  activeMonth,
  monthNames,
  onImportActivities,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMonthKey = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`;
  const currentMonthName = `${monthNames[activeMonth]} ${activeYear}`;

  // Filter activities belonging to current month
  const monthActivities = activities.filter((a) => (a.monthKey || '2026-11') === currentMonthKey);

  // Import state
  const [importedJson, setImportedJson] = useState<any[] | null>(null);
  const [importTargetMonthKey, setImportTargetMonthKey] = useState(currentMonthKey);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    const dataToExport = {
      version: '1.0',
      monthKey: currentMonthKey,
      monthName: currentMonthName,
      exportedAt: new Date().toISOString(),
      count: monthActivities.length,
      activities: monthActivities,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `sorties-${currentMonthKey}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setImportSuccessMessage(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let list: any[] = [];
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && Array.isArray(parsed.activities)) {
          list = parsed.activities;
          if (parsed.monthKey) {
            setImportTargetMonthKey(parsed.monthKey);
          }
        } else {
          throw new Error('Le fichier ne contient pas de liste d’activités valide.');
        }

        if (list.length === 0) {
          throw new Error('Le fichier JSON ne contient aucune activité.');
        }

        // Validate basic properties
        const validList = list.filter((item) => item && typeof item.title === 'string');
        if (validList.length === 0) {
          throw new Error('Aucune activité valide trouvée avec un titre.');
        }

        setImportedJson(validList);
      } catch (err: any) {
        setImportError(err.message || 'Fichier JSON invalide.');
        setImportedJson(null);
      }
    };
    reader.readAsText(file);
  };

  // Submit Import
  const handleConfirmImport = async () => {
    if (!importedJson || importedJson.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      await onImportActivities(importTargetMonthKey, importedJson, importMode);
      setImportSuccessMessage(
        `${importedJson.length} activité(s) importée(s) avec succès pour le mois sélectionné !`
      );
      setImportedJson(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Erreur lors de l'importation.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Gestion des Activités (JSON)</h2>
              <p className="text-[11px] text-slate-500">Mois ciblé : {currentMonthName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 bg-white">
          <button
            onClick={() => setTab('export')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              tab === 'export'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter ({monthActivities.length})</span>
          </button>
          <button
            onClick={() => setTab('import')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              tab === 'import'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importer JSON</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {tab === 'export' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Mois à exporter :</span>
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {currentMonthName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Nombre d'activités trouvées :</span>
                  <span className="font-bold text-slate-900">{monthActivities.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Nom du fichier :</span>
                  <span className="font-mono text-slate-700 text-[11px]">sorties-{currentMonthKey}.json</span>
                </div>
              </div>

              {monthActivities.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <p>Aucune activité n'est enregistrée pour {currentMonthName}.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ajoutez des activités ou sélectionnez un autre mois pour exporter.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Aperçu des activités incluses :
                  </label>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 divide-y divide-slate-100 text-xs">
                    {monthActivities.map((act) => (
                      <div key={act.id} className="py-1.5 flex items-center justify-between">
                        <span className="font-medium text-slate-800 truncate pr-2">{act.title}</span>
                        <span className="text-[10px] text-slate-500 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {act.category}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger sorties-{currentMonthKey}.json</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File upload box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
              >
                <Upload className="w-6 h-6 text-amber-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-900">
                  Cliquez pour sélectionner un fichier JSON
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fichier .json contenant vos activités exportées
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Error message */}
              {importError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success message */}
              {importSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {/* Preview & options when file loaded */}
              {importedJson && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Activités détectées :</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {importedJson.length} activité{importedJson.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Target month picker */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Mois cible d'importation :
                    </label>
                    <input
                      type="month"
                      min="2026-11"
                      value={importTargetMonthKey}
                      onChange={(e) => setImportTargetMonthKey(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  {/* Mode radio */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Mode d'insertion pour ce mois :
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold">Ajouter (Fusionner)</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Conserve les activités existantes</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold">Remplacer</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Écrase les activités du mois</div>
                      </button>
                    </div>
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isImporting ? 'Importation en cours...' : `Confirmer l'import (${importedJson.length})`}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
