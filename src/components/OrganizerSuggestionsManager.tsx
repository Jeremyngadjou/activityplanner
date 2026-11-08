import React, { useState } from 'react';
import { ActivitySuggestion, SlotType, Activity, Category } from '../types';
import {
  Lightbulb,
  Check,
  UserCheck,
  PlusCircle,
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Tag,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface OrganizerSuggestionsManagerProps {
  suggestions: ActivitySuggestion[];
  onConvertToActivity: (suggestion: ActivitySuggestion) => Promise<void>;
  onAcceptDuo: (
    suggestion: ActivitySuggestion,
    date: string,
    slot: SlotType
  ) => Promise<void>;
  onCancelDuo?: (suggestion: ActivitySuggestion) => Promise<void>;
  onDeclineSuggestion: (suggestionId: string, adminNote?: string) => Promise<void>;
  onDeleteSuggestion: (suggestionId: string) => Promise<void>;
  activeYear: number;
  activeMonth: number;
}

const slotLabels: Record<SlotType, string> = {
  morning: 'Matinée (09h - 12h30)',
  afternoon: 'Après-midi (14h - 18h30)',
  evening: 'Soirée (19h - 23h30)',
};

export const OrganizerSuggestionsManager: React.FC<OrganizerSuggestionsManagerProps> = ({
  suggestions,
  onConvertToActivity,
  onAcceptDuo,
  onCancelDuo,
  onDeclineSuggestion,
  onDeleteSuggestion,
  activeYear,
  activeMonth,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'converted' | 'duo' | 'declined'>('pending');
  const [duoModalSuggestion, setDuoModalSuggestion] = useState<ActivitySuggestion | null>(null);
  const [duoDate, setDuoDate] = useState('');
  const [duoSlot, setDuoSlot] = useState<SlotType>('afternoon');
  const [isProcessing, setIsProcessing] = useState(false);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
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

  const filtered = suggestions.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return s.status === 'pending';
    if (filter === 'converted') return s.status === 'converted_to_activity';
    if (filter === 'duo') return s.status === 'accepted_duo';
    if (filter === 'declined') return s.status === 'declined';
    return true;
  });

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  const handleOpenDuoModal = (sug: ActivitySuggestion) => {
    setDuoModalSuggestion(sug);
    if (sug.preferredDate) {
      setDuoDate(sug.preferredDate);
    } else {
      const defaultDay = '15';
      const mStr = String(activeMonth + 1).padStart(2, '0');
      setDuoDate(`${activeYear}-${mStr}-${defaultDay}`);
    }
    setDuoSlot(sug.preferredSlot || 'afternoon');
  };

  const handleConfirmDuo = async () => {
    if (!duoModalSuggestion || !duoDate) return;
    setIsProcessing(true);
    try {
      await onAcceptDuo(duoModalSuggestion, duoDate, duoSlot);
      setDuoModalSuggestion(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDecline = async (id: string) => {
    setIsProcessing(true);
    try {
      await onDeclineSuggestion(id, declineReason.trim() || undefined);
      setDecliningId(null);
      setDeclineReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const getContactLink = (contact: string, friendName: string, title: string) => {
    const clean = contact.trim();
    const isEmail = clean.includes('@');
    const digits = clean.replace(/\D/g, '');
    const isPhone = digits.length >= 8;

    if (isEmail) {
      return (
        <a
          href={`mailto:${clean}?subject=${encodeURIComponent(`Ton idée d'activité : ${title}`)}`}
          className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {clean}
        </a>
      );
    }

    if (isPhone) {
      let wa = digits;
      if (wa.startsWith('0') && wa.length === 10) wa = `33${wa.substring(1)}`;
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-slate-700">{clean}</span>
          <span className="text-slate-300">·</span>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
          >
            WhatsApp
          </a>
          <span className="text-slate-300">·</span>
          <a href={`sms:${digits}`} className="text-slate-600 hover:text-slate-900 underline">
            SMS
          </a>
        </div>
      );
    }

    return <span className="text-xs font-medium text-slate-700">{clean}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <span>Suggestions d’Activités par les Invités</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Idées proposées par vos amis : ajoutez-les aux fiches publiques ou validez une sortie à 2.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            type="button"
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
            type="button"
            onClick={() => setFilter('converted')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'converted'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ajoutées aux fiches
          </button>
          <button
            type="button"
            onClick={() => setFilter('duo')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'duo'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sorties à 2
          </button>
          <button
            type="button"
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
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({suggestions.length})
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Aucune suggestion dans cette catégorie
          </h3>
          <p className="text-xs text-slate-500">
            {filter === 'pending'
              ? 'Toutes les idées suggérées ont été traitées ! Vos amis peuvent en proposer de nouvelles depuis la Vue Invités.'
              : 'Aucune suggestion ne correspond à ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((sug) => {
            const isPending = sug.status === 'pending';
            const isConverted = sug.status === 'converted_to_activity';
            const isDuo = sug.status === 'accepted_duo';
            const isDeclined = sug.status === 'declined';
            const isDecliningThis = decliningId === sug.id;

            return (
              <div
                key={sug.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {sug.title}
                      </span>
                      {sug.category && (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {sug.category}
                        </span>
                      )}

                      {/* Status Badges */}
                      {isPending && (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                          En attente
                        </span>
                      )}
                      {isConverted && (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Ajoutée aux activités</span>
                        </span>
                      )}
                      {isDuo && (
                        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Sortie à 2 validée</span>
                        </span>
                      )}
                      {isDeclined && (
                        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Déclinée
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                      {sug.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-amber-600" />
                        Suggéré par : <strong>{sug.suggestedBy}</strong>
                      </span>

                      {sug.friendContact && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {getContactLink(sug.friendContact, sug.suggestedBy, sug.title)}
                        </div>
                      )}

                      {sug.preferredDate && (
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Date suggérée : {formatDate(sug.preferredDate)}
                          {sug.preferredSlot && ` (${slotLabels[sug.preferredSlot]})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isPending && !isDecliningThis && (
                      <>
                        <button
                          type="button"
                          onClick={() => onConvertToActivity(sug)}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          title="Créer une fiche d'activité dans le catalogue pour tout le monde"
                        >
                          <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Ajouter aux activités</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDuoModal(sug)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          title="Valider cette sortie directement à 2 avec cet ami"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Accepter la sortie à 2</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDecliningId(sug.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </>
                    )}

                    {isDuo && onCancelDuo && (
                      <button
                        type="button"
                        onClick={() => onCancelDuo(sug)}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Annuler cette sortie à 2 et libérer le créneau dans le planning"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Quitter / Annuler la sortie à 2</span>
                      </button>
                    )}

                    {isDeclined && (
                      <button
                        type="button"
                        onClick={() => handleOpenDuoModal(sug)}
                        className="text-xs text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        Repêcher pour sortie à 2
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteSuggestion(sug.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer la suggestion"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Decline input form */}
                {isDecliningThis && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Motif de refus facultatif (ex: pas disponible, déjà testé...)"
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleConfirmDecline(sug.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Confirmer le refus
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDecliningId(null);
                          setDeclineReason('');
                        }}
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

      {/* Modal: Accepter la sortie à 2 (Validation d'un créneau direct) */}
      {duoModalSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Valider la Sortie à 2</span>
              </div>
              <button
                type="button"
                onClick={() => setDuoModalSuggestion(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
              <p className="font-bold">{duoModalSuggestion.title}</p>
              <p className="text-[11px] text-indigo-800">
                Avec <strong>{duoModalSuggestion.suggestedBy}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date de la sortie
                </label>
                <input
                  type="date"
                  required
                  value={duoDate}
                  onChange={(e) => setDuoDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Créneau horaire
                </label>
                <select
                  value={duoSlot}
                  onChange={(e) => setDuoSlot(e.target.value as SlotType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="morning">Matinée (09h - 12h30)</option>
                  <option value="afternoon">Après-midi (14h - 18h30)</option>
                  <option value="evening">Soirée (19h - 23h30)</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Cette action réservera directement le créneau dans votre planning et l'ajoutera automatiquement à votre Google Calendar si connecté.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDuoModalSuggestion(null)}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessing || !duoDate}
                onClick={handleConfirmDuo}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Bloquer au planning</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
