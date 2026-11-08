import React, { useState } from 'react';
import { Proposal, ActivitySuggestion, SlotType } from '../types';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  MessageSquare,
  Trash2,
  Sparkles,
  Lightbulb,
  Check,
} from 'lucide-react';

interface GuestProposalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: Proposal[];
  suggestions: ActivitySuggestion[];
  onClearHistory: () => void;
  onCancelProposal?: (proposalId: string) => Promise<void>;
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
  suggestions,
  onClearHistory,
  onCancelProposal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'proposals' | 'suggestions'>('all');

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

  const totalCount = proposals.length + suggestions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>Mes Demandes & Suggestions</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez l'état de validation en temps réel de vos propositions et idées d'activités.
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

        {/* Tab filters */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('proposals')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                activeTab === 'proposals'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Créneaux ({proposals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-center ${
                activeTab === 'suggestions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Idées ({suggestions.length})
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {totalCount === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
              <p>Vous n'avez pas encore envoyé de proposition ou d'idée depuis ce navigateur.</p>
            </div>
          ) : (
            <>
              {/* Proposals list */}
              {(activeTab === 'all' || activeTab === 'proposals') &&
                proposals.map((item) => {
                  const isAccepted = item.status === 'accepted';
                  const isDeclined = item.status === 'declined';
                  const isPending = item.status === 'pending';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                        isAccepted
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : isDeclined
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-amber-200/80'
                      }`}
                    >
                      {/* STATUT VISIBLE ET PROMINENT DIRECTEMENT SUR LA CARTE */}
                      <div
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          isAccepted
                            ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                            : isDeclined
                            ? 'bg-rose-100/80 text-rose-900 border-rose-300'
                            : 'bg-amber-100/80 text-amber-900 border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isAccepted && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                          {isDeclined && <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />}
                          {isPending && <Hourglass className="w-4 h-4 text-amber-700 shrink-0" />}

                          <span className="uppercase tracking-wider text-[11px]">
                            {isAccepted
                              ? 'Statut : Acceptée & Bloquée au planning'
                              : isDeclined
                              ? 'Statut : Refusée par l’organisateur'
                              : 'Statut : En attente de validation'}
                          </span>
                        </div>

                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white/70 border border-current">
                          Créneau
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.activityTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(item.date)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {slotLabels[item.slot]}
                          </span>
                        </div>
                      </div>

                      {isAccepted && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-xs text-emerald-900 font-medium">
                          Rendez-vous confirmé ! Ce créneau est désormais réservé pour votre sortie ensemble.
                        </div>
                      )}

                      {isDeclined && item.declineReason && (
                        <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-xs text-rose-900">
                          <span className="font-semibold block mb-0.5">Motif de refus :</span>
                          <span>« {item.declineReason} »</span>
                        </div>
                      )}

                      {item.note && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>Votre mot : « {item.note} »</span>
                        </div>
                      )}

                      {onCancelProposal && (
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => onCancelProposal(item.id)}
                            className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
                            title="Annuler et retirer cette demande"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Annuler ma demande</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Suggestions list */}
              {(activeTab === 'all' || activeTab === 'suggestions') &&
                suggestions.map((item) => {
                  const isAcceptedDuo = item.status === 'accepted_duo';
                  const isConverted = item.status === 'converted_to_activity';
                  const isDeclined = item.status === 'declined';
                  const isPending = item.status === 'pending';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                        isAcceptedDuo || isConverted
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : isDeclined
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-amber-200/80'
                      }`}
                    >
                      {/* STATUT VISIBLE ET PROMINENT DIRECTEMENT SUR LA CARTE */}
                      <div
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          isAcceptedDuo || isConverted
                            ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                            : isDeclined
                            ? 'bg-rose-100/80 text-rose-900 border-rose-300'
                            : 'bg-amber-100/80 text-amber-900 border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {(isAcceptedDuo || isConverted) && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          )}
                          {isDeclined && <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />}
                          {isPending && <Hourglass className="w-4 h-4 text-amber-700 shrink-0" />}

                          <span className="uppercase tracking-wider text-[11px]">
                            {isAcceptedDuo
                              ? 'Statut : Acceptée en sortie à 2 !'
                              : isConverted
                              ? 'Statut : Ajoutée aux activités pour tous !'
                              : isDeclined
                              ? 'Statut : Non retenue par l’organisateur'
                              : 'Statut : En attente d’examen'}
                          </span>
                        </div>

                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white/70 border border-current">
                          Idée Suggérée
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {item.title}
                          </h4>
                          {item.category && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                          {item.description}
                        </p>
                      </div>

                      {item.preferredDate && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Date souhaitée : {formatDate(item.preferredDate)}</span>
                          {item.preferredSlot && <span>({slotLabels[item.preferredSlot]})</span>}
                        </div>
                      )}

                      {isAcceptedDuo && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-xs text-emerald-900 font-medium">
                          Excellente idée ! L'organisateur a validé cette activité pour la faire à 2 avec vous.
                          {item.resultingSlotDate && (
                            <span className="block mt-0.5 font-bold">
                              Calée le {formatDate(item.resultingSlotDate)} !
                            </span>
                          )}
                        </div>
                      )}

                      {isConverted && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-xs text-emerald-900 font-medium">
                          Génial ! L'organisateur a retenu votre idée et l'a ajoutée au catalogue d'activités pour que tout le groupe puisse aussi en profiter.
                        </div>
                      )}

                      {isDeclined && item.adminNote && (
                        <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-xs text-rose-900">
                          <span className="font-semibold block mb-0.5">Motif de l'organisateur :</span>
                          <span>« {item.adminNote} »</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          {totalCount > 0 ? (
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
