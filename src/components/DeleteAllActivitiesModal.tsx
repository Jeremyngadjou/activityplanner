import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteAllActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'current' | 'all') => Promise<void>;
  currentMonthLabel: string;
  currentMonthCount: number;
  totalCount: number;
}

export const DeleteAllActivitiesModal: React.FC<DeleteAllActivitiesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentMonthLabel,
  currentMonthCount,
  totalCount,
}) => {
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const countToDelete = scope === 'current' ? currentMonthCount : totalCount;

  const handleExecute = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(scope);
      onClose();
    } catch (err) {
      console.error('Erreur suppression groupée:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supprimer les activités
              </h3>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Action irréversible sur la base de données
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Périmètre de suppression
            </label>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  scope === 'current'
                    ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-300'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="delete-scope"
                  checked={scope === 'current'}
                  onChange={() => setScope('current')}
                  disabled={isDeleting}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Uniquement ce mois ({currentMonthLabel})
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    Supprime {currentMonthCount} activité(s) du catalogue de ce mois.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-300'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="delete-scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  disabled={isDeleting}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Toutes les activités (tous les mois confondus)
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    Supprime l'intégralité des {totalCount} activités enregistrées.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Warning box */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Les propositions et créneaux déjà réservés avec vos amis ne seront pas affectés, mais les activités disparaîtront immédiatement de l'écran des invités.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={isDeleting}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Je confirme vouloir supprimer {countToDelete} activité(s) définitivement
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isDeleting || !confirmed || countToDelete === 0}
            onClick={handleExecute}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Suppression en cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer {countToDelete} activité(s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
