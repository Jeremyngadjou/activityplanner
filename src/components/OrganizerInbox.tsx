import React, { useState } from 'react';
import { Proposal, SlotType } from '../types';
import { Check, X, Clock, Calendar, MessageSquare, Phone, User, Inbox, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrganizerInboxProps {
  proposals: Proposal[];
  onAcceptProposal: (proposalId: string) => void;
  onDeclineProposal: (proposalId: string, reason?: string) => void;
}

export const OrganizerInbox: React.FC<OrganizerInboxProps> = ({
  proposals,
  onAcceptProposal,
  onDeclineProposal,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('pending');
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const slotLabels: Record<SlotType, string> = {
    morning: 'Matinée (09h–12h30)',
    afternoon: 'Après-midi (14h–18h30)',
    evening: 'Soirée (19h–23h30)',
  };

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;

  const handleAccept = (id: string) => {
    onAcceptProposal(id);
    try {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    } catch {}
  };

  const handleConfirmDecline = (id: string) => {
    onDeclineProposal(id, declineReason);
    setDecliningId(null);
    setDeclineReason('');
  };

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
    <div className="space-y-6">
      {/* Top filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-600" />
            Boîte de Réception des Propositions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez les envies de vos amis et validez les créneaux pour votre emploi du temps.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>En attente</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'accepted'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acceptées
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'declined'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Refusées
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({proposals.length})
          </button>
        </div>
      </div>

      {/* Proposals list */}
      {filteredProposals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Aucune proposition dans cette catégorie
          </h3>
          <p className="text-xs text-slate-500">
            {filter === 'pending'
              ? "Toutes les demandes ont été traitées ! Passez en 'Vue Ami' pour en envoyer une nouvelle."
              : 'Aucune demande ne correspond à ce filtre pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => {
            const isDecliningThis = decliningId === proposal.id;

            return (
              <div
                key={proposal.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {proposal.friendName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        {proposal.activityTitle}
                      </span>
                      {proposal.status === 'accepted' && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Confirmé au planning
                        </span>
                      )}
                      {proposal.status === 'declined' && (
                        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Décliné
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {formatDate(proposal.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{slotLabels[proposal.slot]}</span>
                      </div>
                      {proposal.friendContact && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{proposal.friendContact}</span>
                        </div>
                      )}
                    </div>

                    {proposal.note && (
                      <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 max-w-xl">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="italic">« {proposal.note} »</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {proposal.status === 'pending' && !isDecliningThis && (
                      <>
                        <button
                          onClick={() => handleAccept(proposal.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Accepter & Bloquer</span>
                        </button>
                        <button
                          onClick={() => setDecliningId(proposal.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </>
                    )}

                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => onDeclineProposal(proposal.id, 'Annulé par l’organisateur')}
                        className="text-xs text-slate-500 hover:text-rose-600 underline transition-colors cursor-pointer"
                      >
                        Annuler la validation
                      </button>
                    )}

                    {proposal.status === 'declined' && (
                      <button
                        onClick={() => handleAccept(proposal.id)}
                        className="text-xs text-amber-700 hover:text-amber-900 underline transition-colors cursor-pointer"
                      >
                        Repêcher et accepter
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline decline form */}
                {isDecliningThis && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Motif facultatif (ex: déjà occupé, reportons...)"
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleConfirmDecline(proposal.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Confirmer le refus
                      </button>
                      <button
                        onClick={() => setDecliningId(null)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
