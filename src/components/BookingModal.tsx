import React, { useState } from 'react';
import { Activity, Proposal, ScheduleSlot, SlotType } from '../types';
import { ActivityIcon } from './ActivityIcon';
import { X, Calendar, Clock, User, MessageSquare, Check, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  activity: Activity;
  existingSlots: ScheduleSlot[];
  onClose: () => void;
  onSubmitProposal: (proposalData: Omit<Proposal, 'id' | 'status' | 'createdAt'>) => void;
  defaultYear?: number;
  defaultMonth?: number;
}

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const BookingModal: React.FC<BookingModalProps> = ({
  activity,
  existingSlots,
  onClose,
  onSubmitProposal,
  defaultYear,
  defaultMonth,
}) => {
  const [pickerYear, setPickerYear] = useState<number>(() => defaultYear ?? new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(() => defaultMonth ?? new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDate();
    return today <= 28 ? today : 1;
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('afternoon');
  const [friendName, setFriendName] = useState('');
  const [friendContact, setFriendContact] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamic calendar math for current picker month & year
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const startOffset = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7;

  // Ensure selectedDay doesn't exceed days in newly selected month
  const safeDay = Math.min(selectedDay, daysInMonth);
  const dateString = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

  const goToPrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  // Check if slot is already occupied
  const isSlotBooked = (day: number, slot: SlotType) => {
    const dStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return existingSlots.some((s) => s.date === dStr && s.slot === slot);
  };

  const currentSlotBooked = isSlotBooked(safeDay, selectedSlot);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setErrorMsg('Veuillez renseigner votre prénom ou surnom.');
      return;
    }

    onSubmitProposal({
      activityId: activity.id,
      activityTitle: activity.title,
      friendName: friendName.trim(),
      friendContact: friendContact.trim() || undefined,
      note: note.trim() || undefined,
      date: dateString,
      slot: selectedSlot,
    });

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }

    setSubmitted(true);
  };

  const slotLabels: Record<SlotType, { label: string; time: string; icon: string }> = {
    morning: { label: 'Matinée', time: '09h00 – 12h30', icon: '☀️' },
    afternoon: { label: 'Après-midi', time: '14h00 – 18h30', icon: '🌤️' },
    evening: { label: 'Soirée', time: '19h00 – 23h30', icon: '🌙' },
  };

  const formattedSelectedDate = new Date(pickerYear, pickerMonth, safeDay).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className={`p-6 bg-gradient-to-r ${activity.accentGradient} text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
            <ActivityIcon name={activity.iconName} className="w-4 h-4" />
            <span>{activity.category} · {activity.duration}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
            {activity.title}
          </h2>
          <p className="text-sm text-white/90 line-clamp-2">
            {activity.description}
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                Demande envoyée avec succès !
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Merci <span className="font-semibold text-slate-900">{friendName}</span> ! La proposition pour le{' '}
                <span className="font-semibold text-slate-900 capitalize">
                  {formattedSelectedDate} ({slotLabels[selectedSlot].label.toLowerCase()})
                </span>{' '}
                a bien été transmise. Elle apparaîtra dans le planning dès validation !
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-sm mx-auto text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between font-medium text-slate-900">
                <span>Activité :</span>
                <span>{activity.title}</span>
              </div>
              <div className="flex justify-between">
                <span>Date choisie :</span>
                <span className="capitalize">{formattedSelectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Créneau :</span>
                <span>{slotLabels[selectedSlot].label} ({slotLabels[selectedSlot].time})</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
            >
              Parfait, fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step 1: Calendar Choice with Month Navigation */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  1. Choisis ta date
                </label>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 capitalize">
                  {safeDay} {MONTH_NAMES[pickerMonth]} {pickerYear}
                </span>
              </div>

              {/* Month Selector Bar */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200 mb-2">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <select
                    value={pickerMonth}
                    onChange={(e) => setPickerMonth(parseInt(e.target.value, 10))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pickerYear}
                    onChange={(e) => setPickerYear(parseInt(e.target.value, 10))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer font-mono"
                  >
                    {[pickerYear - 1, pickerYear, pickerYear + 1, pickerYear + 2].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month calendar grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
                  <span>Lun</span>
                  <span>Mar</span>
                  <span>Mer</span>
                  <span>Jeu</span>
                  <span>Ven</span>
                  <span>Sam</span>
                  <span>Dim</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {/* Empty offset days before 1st of month */}
                  {Array.from({ length: startOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}
                  {/* 1 to daysInMonth */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = safeDay === day;
                    // Check if entire day is fully booked
                    const dayFullyBooked =
                      isSlotBooked(day, 'morning') &&
                      isSlotBooked(day, 'afternoon') &&
                      isSlotBooked(day, 'evening');

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`h-8 w-full rounded-lg font-medium transition-all flex items-center justify-center relative cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm font-bold scale-105'
                            : dayFullyBooked
                            ? 'text-slate-400 line-through hover:bg-slate-200'
                            : 'text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2: Slot choice */}
            <div>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2.5">
                <Clock className="w-4 h-4 text-amber-600" />
                2. Choisis le moment de la journée
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {(['morning', 'afternoon', 'evening'] as SlotType[]).map((slotKey) => {
                  const info = slotLabels[slotKey];
                  const isOccupied = isSlotBooked(safeDay, slotKey);
                  const isSelected = selectedSlot === slotKey;

                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => setSelectedSlot(slotKey)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                          : isOccupied
                          ? 'border-slate-200 bg-slate-100/60 opacity-60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base mb-1">{info.icon}</div>
                      <div className="text-xs font-bold text-slate-900">{info.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{info.time}</div>
                      {isOccupied && (
                        <span className="block text-[10px] text-red-600 font-semibold mt-1">
                          Déjà pris
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {currentSlotBooked && (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                  ℹ️ Ce créneau a déjà une activité validée, mais tu peux quand même proposer si tu veux te joindre au groupe ou proposer une alternative !
                </p>
              )}
            </div>

            {/* Step 3: Friend details */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                3. Tes coordonnées & motivation
              </label>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Ton prénom ou surnom *"
                  value={friendName}
                  onChange={(e) => {
                    setFriendName(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Numéro de tel ou @insta / WhatsApp (facultatif)"
                  value={friendContact}
                  onChange={(e) => setFriendContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder="Un petit mot ? (ex: 'Trop chaud pour tester !', 'Je ramène mon jeu préféré', ...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
              )}
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Envoyer ma proposition</span>
                <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2">
                Je recevrai ta demande et pourrai l’insérer directement dans mon emploi du temps !
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
