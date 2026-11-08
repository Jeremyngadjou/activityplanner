import React, { useState } from 'react';
import { Category, SlotType, ActivitySuggestion } from '../types';
import {
  X,
  Lightbulb,
  Send,
  User,
  Phone,
  Tag,
  AlignLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface SuggestActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuggestion: (
    data: Omit<ActivitySuggestion, 'id' | 'status' | 'createdAt'>
  ) => Promise<void>;
  currentMonthKey: string;
}

const CATEGORIES: Category[] = [
  'Gastronomie',
  'Sport',
  'Culture',
  'Soirée',
  'Plein Air',
  'Atelier',
  'Jeux',
  'Détente',
  'Insolite',
];

export const SuggestActivityModal: React.FC<SuggestActivityModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuggestion,
  currentMonthKey,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedBy, setSuggestedBy] = useState('');
  const [friendContact, setFriendContact] = useState('');
  const [category, setCategory] = useState<Category>('Gastronomie');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState<SlotType | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !suggestedBy.trim() || !description.trim()) {
      setErrorMsg('Veuillez renseigner votre nom, le titre et une courte description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmitSuggestion({
        title: title.trim(),
        description: description.trim(),
        suggestedBy: suggestedBy.trim(),
        friendContact: friendContact.trim() || undefined,
        category,
        preferredDate: preferredDate || undefined,
        preferredSlot: preferredSlot ? (preferredSlot as SlotType) : undefined,
        monthKey: currentMonthKey,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de l’envoi de votre suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setTitle('');
    setDescription('');
    setSuggestedBy('');
    setFriendContact('');
    setPreferredDate('');
    setPreferredSlot('');
    setIsSuccess(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Suggérer une idée d’activité
              </h3>
              <p className="text-[11px] text-slate-500">
                Proposez une sortie inédite à l'organisateur !
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Idée transmise avec succès !
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Merci <span className="font-semibold text-slate-900">{suggestedBy}</span> ! L'organisateur a reçu votre suggestion. Il pourra soit l'ajouter aux activités pour tout le monde, soit convenir d'une sortie à 2 avec vous.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-center max-w-sm mx-auto">
                Vous pourrez suivre la réponse de l'organisateur directement depuis l'onglet <strong>« Mes demandes »</strong> en haut de la page.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Votre prénom ou surnom *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Thomas"
                      value={suggestedBy}
                      onChange={(e) => setSuggestedBy(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone ou Instagram (facultatif)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: 06 12 34 56 78"
                      value={friendContact}
                      onChange={(e) => setFriendContact(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Category */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom ou titre de l’activité *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tournoi de karting, Escape Game VR, Soirée Ramen..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description / Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description, détails ou lien de l'endroit *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Pourquoi tu as envie de faire ça, le lieu envisagé ou les détails pratiques..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Optional Date & Slot */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Tu as déjà une date ou un créneau en tête ? (facultatif)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value as SlotType | '')}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">Créneau indifférent</option>
                      <option value="morning">Matinée (09h - 12h30)</option>
                      <option value="afternoon">Après-midi (14h - 18h30)</option>
                      <option value="evening">Soirée (19h - 23h30)</option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmission...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer la suggestion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
