import React, { useState } from 'react';
import { Proposal, SlotType } from '../types';
import {
  Check,
  X,
  Clock,
  Calendar,
  MessageSquare,
  Phone,
  Inbox,
  AlertCircle,
  CalendarPlus,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createGoogleCalendarWebUrl } from '../services/calendarService';

interface OrganizerInboxProps {
  proposals: Proposal[];
  onAcceptProposal: (proposalId: string) => void;
  onDeclineProposal: (proposalId: string, reason?: string) => void;
  googleToken?: string | null;
  onConnectGoogleCalendar?: () => Promise<void>;
  calendarSyncNotice?: {
    type: 'success' | 'warning' | 'info';
    message: string;
    directUrl?: string;
  } | null;
  onDismissSyncNotice?: () => void;
}

export const OrganizerInbox: React.FC<OrganizerInboxProps> = ({
  proposals,
  onAcceptProposal,
  onDeclineProposal,
  googleToken,
  onConnectGoogleCalendar,
  calendarSyncNotice,
  onDismissSyncNotice,
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

  const getContactActions = (
    contact: string,
    friendName: string,
    activityTitle: string,
    date: string,
    slot: SlotType,
    isAccepted: boolean
  ) => {
    const clean = contact.trim();
    const isEmail = clean.includes('@') && clean.includes('.');
    const digitsOnly = clean.replace(/\D/g, '');
    const isPhone = digitsOnly.length >= 8;

    const message = isAccepted
      ? `Salut ${friendName} ! C'est validé pour « ${activityTitle} » le ${formatDate(date)} (${slotLabels[slot]}) !`
      : `Salut ${friendName} ! Concernant ta proposition pour « ${activityTitle} » le ${formatDate(date)} : `;

    if (isEmail) {
      return (
        <a
          href={`mailto:${clean}?subject=${encodeURIComponent(`Sortie : ${activityTitle}`)}&body=${encodeURIComponent(message)}`}
          className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
          title="Envoyer un email de confirmation"
        >
          Envoyer un email
        </a>
      );
    }

    if (isPhone) {
      let waNumber = digitsOnly;
      if (waNumber.startsWith('0') && waNumber.length === 10) {
        waNumber = `33${waNumber.substring(1)}`;
      }
      return (
        <div className="inline-flex items-center gap-1.5 ml-1">
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            title="Envoyer confirmation via WhatsApp"
          >
            WhatsApp
          </a>
          <a
            href={`sms:${digitsOnly}?body=${encodeURIComponent(message)}`}
            className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            title="Envoyer SMS"
          >
            SMS
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Automatic Sync Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              googleToken ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Synchronisation Google Calendar
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  googleToken
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {googleToken ? 'Automatique active' : 'Prêt à lier'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {googleToken
                ? 'Chaque proposition acceptée est automatiquement ajoutée à votre Google Calendar.'
                : 'Liez votre Google Calendar pour que toute proposition acceptée s’y ajoute automatiquement.'}
            </p>
          </div>
        </div>

        {onConnectGoogleCalendar && !googleToken && (
          <button
            type="button"
            onClick={onConnectGoogleCalendar}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Connecter Google Calendar</span>
          </button>
        )}
      </div>

      {/* Calendar Sync Live Notice */}
      {calendarSyncNotice && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
            calendarSyncNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : calendarSyncNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{calendarSyncNotice.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {calendarSyncNotice.directUrl && (
              <a
                href={calendarSyncNotice.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ouvrir Google Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onDismissSyncNotice && (
              <button
                type="button"
                onClick={onDismissSyncNotice}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-600" />
            <span>Boîte de Réception des Propositions</span>
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
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{proposal.friendContact}</span>
                          {getContactActions(
                            proposal.friendContact,
                            proposal.friendName,
                            proposal.activityTitle,
                            proposal.date,
                            proposal.slot,
                            proposal.status === 'accepted'
                          )}
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
                      <div className="flex items-center gap-2">
                        <a
                          href={createGoogleCalendarWebUrl({
                            title: proposal.activityTitle,
                            friendName: proposal.friendName,
                            date: proposal.date,
                            slot: proposal.slot,
                            note: proposal.note,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Voir ou ajouter dans Google Calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-amber-600" />
                          <span>Google Calendar</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <button
                          onClick={() => onDeclineProposal(proposal.id, 'Annulé par l’organisateur')}
                          className="text-xs text-slate-500 hover:text-rose-600 underline transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
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
