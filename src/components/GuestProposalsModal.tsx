import React from 'react';
import { Proposal, SlotType } from '../types';
import { X, Calendar, Clock, CheckCircle2, AlertCircle, Hourglass, MessageSquare, Trash2 } from 'lucide-react';

interface GuestProposalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: Proposal[];
  onClearHistory: () => void;
}

const slotLabels: Record<SlotType, string> = {
  morning: 'Matinée (09h - 12h30)',
  afternoon: 'Après-midi (14h - 18h30)',
  evening: 'Soirée (19h - 23h30)',
};

export const GuestProposalsModal: React.FC<GuestProposalsModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (y && m && d) {
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {}
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Mes Propositions de Sorties
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez l'état de vos demandes et les réponses de l'organisateur.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of proposals */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {proposals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Vous n'avez pas encore envoyé de proposition depuis ce navigateur.
            </div>
          ) : (
            proposals.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.activityTitle}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(item.date)}</span>
                      <span className="text-slate-300">·</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slotLabels[item.slot]}</span>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 rounded-full border border-amber-200">
                        <Hourglass className="w-3 h-3 text-amber-600" />
                        <span>En attente</span>
                      </span>
                    )}
                    {item.status === 'accepted' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Accepté</span>
                      </span>
                    )}
                    {item.status === 'declined' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-800 bg-rose-50 rounded-full border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Non retenu</span>
                      </span>
                    )}
                  </div>
                </div>

                {item.status === 'accepted' && (
                  <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    L'organisateur a validé ce créneau ! Le rendez-vous est bloqué à l'emploi du temps.
                  </div>
                )}

                {item.status === 'declined' && item.declineReason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <span className="font-semibold block mb-0.5">Motif de l'organisateur :</span>
                    <span>« {item.declineReason} »</span>
                  </div>
                )}

                {item.note && (
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                    <MessageSquare className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>Votre mot : « {item.note} »</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          {proposals.length > 0 ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer l'historique local</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
