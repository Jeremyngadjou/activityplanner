import React, { useState } from 'react';
import { Activity, Proposal, ScheduleSlot, SlotType } from '../types';
import { ActivityIcon } from './ActivityIcon';
import {
  X,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Check,
  Send,
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudSun,
  Moon,
  Info,
  Users,
  UserPlus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  activity: Activity;
  existingSlots: ScheduleSlot[];
  onClose: () => void;
  onSubmitProposal: (proposalData: Omit<Proposal, 'id' | 'status' | 'createdAt'>) => void;
  onJoinSlot?: (
    date: string,
    slot: SlotType,
    participant: { name: string; contact?: string; note?: string }
  ) => Promise<void>;
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
  onJoinSlot,
  defaultYear,
  defaultMonth,
}) => {
  const [pickerYear, setPickerYear] = useState<number>(() => defaultYear ?? 2026);
  const [pickerMonth, setPickerMonth] = useState<number>(() => defaultMonth ?? 10);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDate();
    return today <= 28 ? today : 1;
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('afternoon');
  const [friendName, setFriendName] = useState('');
  const [friendContact, setFriendContact] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [wasJoined, setWasJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamic calendar math for current picker month & year
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const startOffset = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7;

  // Minimum date boundary: November 2026 (starting month)
  const isAtMinMonth = pickerYear <= 2026 && pickerMonth <= 10;

  // Ensure selectedDay doesn't exceed days in newly selected month
  const safeDay = Math.min(selectedDay, daysInMonth);
  const dateString = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

  const goToPrevMonth = () => {
    if (isAtMinMonth) return;
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

  // Find slot for given day & slot key
  const getSlotForTime = (day: number, slot: SlotType) => {
    const dStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return existingSlots.find((s) => s.date === dStr && s.slot === slot);
  };

  // Current selected slot info
  const currentMatchingSlot = getSlotForTime(safeDay, selectedSlot);
  const isCurrentSlotForThisActivity = currentMatchingSlot?.activityId === activity.id;
  const isCurrentSlotForOtherActivity =
    currentMatchingSlot && currentMatchingSlot.activityId !== activity.id;

  // Existing sessions already planned for this activity across all months
  const existingActivitySlots = existingSlots.filter((s) => s.activityId === activity.id);

  const slotLabels: Record<
    SlotType,
    { label: string; time: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    morning: { label: 'Matinée', time: '09h00 – 12h30', Icon: Sun },
    afternoon: { label: 'Après-midi', time: '14h00 – 18h30', Icon: CloudSun },
    evening: { label: 'Soirée', time: '19h00 – 23h30', Icon: Moon },
  };

  const formattedSelectedDate = new Date(pickerYear, pickerMonth, safeDay).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleSelectPreExistingSession = (s: ScheduleSlot) => {
    const [y, m, d] = s.date.split('-').map(Number);
    setPickerYear(y);
    setPickerMonth(m - 1);
    setSelectedDay(d);
    setSelectedSlot(s.slot);
    const input = document.getElementById('booking-friend-name-input');
    input?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setErrorMsg('Veuillez renseigner votre prénom ou surnom.');
      return;
    }

    if (isCurrentSlotForOtherActivity) {
      setErrorMsg("Ce créneau est déjà réservé pour une autre activité. Veuillez choisir un autre créneau.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // If joining an already booked session for this exact activity
      if (isCurrentSlotForThisActivity && onJoinSlot) {
        await onJoinSlot(dateString, selectedSlot, {
          name: friendName.trim(),
          contact: friendContact.trim() || undefined,
          note: note.trim() || undefined,
        });
        setWasJoined(true);
      } else {
        // Normal proposal
        onSubmitProposal({
          activityId: activity.id,
          activityTitle: activity.title,
          friendName: friendName.trim(),
          friendContact: friendContact.trim() || undefined,
          note: note.trim() || undefined,
          date: dateString,
          slot: selectedSlot,
        });
        setWasJoined(false);
      }

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur s'est produite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateString = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className={`p-6 bg-gradient-to-r ${activity.accentGradient} text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
            <ActivityIcon name={activity.iconName} className="w-4 h-4" />
            <span>
              {activity.category} · {activity.duration}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
            {activity.title}
          </h2>
          <p className="text-sm text-white/90 line-clamp-2">{activity.description}</p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {wasJoined ? 'Participation confirmée !' : 'Demande envoyée avec succès !'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {wasJoined ? (
                  <>
                    Super <span className="font-semibold text-slate-900">{friendName}</span> ! Vous êtes
                    inscrit(e) sur la sortie avec{' '}
                    <span className="font-semibold text-slate-900">{currentMatchingSlot?.friendName}</span> pour
                    le{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {formattedSelectedDate} ({slotLabels[selectedSlot].label.toLowerCase()})
                    </span>.
                  </>
                ) : (
                  <>
                    Merci <span className="font-semibold text-slate-900">{friendName}</span> ! La proposition
                    pour le{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {formattedSelectedDate} ({slotLabels[selectedSlot].label.toLowerCase()})
                    </span>{' '}
                    a bien été transmise. Elle apparaîtra dans le planning dès validation !
                  </>
                )}
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
                <span>
                  {slotLabels[selectedSlot].label} ({slotLabels[selectedSlot].time})
                </span>
              </div>
              {wasJoined && currentMatchingSlot && (
                <div className="flex justify-between text-emerald-800 font-semibold pt-1 border-t border-slate-200">
                  <span>Groupe :</span>
                  <span>Avec {currentMatchingSlot.friendName} et les autres amis</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center max-w-sm mx-auto">
              Vous pouvez suivre la réponse de l'organisateur en direct à tout moment via le bouton « Mes demandes » en haut de la page.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
            >
              Parfait, fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Quick Banner: Existing Sessions for this activity */}
            {existingActivitySlots.length > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-emerald-700" />
                    Sortie collective déjà au planning
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {existingActivitySlots.length} session(s)
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Cette activité est déjà calée sur un ou plusieurs créneaux. Vous pouvez directement vous joindre au groupe !
                </p>
                <div className="space-y-2">
                  {existingActivitySlots.map((s) => {
                    const isCurrentlyChosen = s.date === dateString && s.slot === selectedSlot;
                    const participantsCount = 1 + (s.participants?.length || 0);

                    return (
                      <div
                        key={`${s.date}-${s.slot}`}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentlyChosen
                            ? 'bg-emerald-100/70 border-emerald-400 ring-1 ring-emerald-300'
                            : 'bg-white border-emerald-200 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="capitalize">{formatDateString(s.date)}</span>
                            <span className="text-slate-300">·</span>
                            <span>{slotLabels[s.slot]?.label}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Participants ({participantsCount}) :{' '}
                            <strong className="text-slate-900">{s.friendName}</strong>
                            {s.participants && s.participants.length > 0 && (
                              <span>, {s.participants.map((p) => p.name).join(', ')}</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectPreExistingSession(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isCurrentlyChosen
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isCurrentlyChosen ? 'Session sélectionnée' : 'Rejoindre ce créneau'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  disabled={isAtMinMonth}
                  className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={isAtMinMonth ? 'Novembre 2026 est le mois de démarrage' : 'Mois précédent'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <select
                    value={pickerMonth}
                    onChange={(e) => setPickerMonth(parseInt(e.target.value, 10))}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((name, idx) => {
                      const isDisabled = pickerYear === 2026 && idx < 10;
                      return (
                        <option key={name} value={idx} disabled={isDisabled}>
                          {name}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={pickerYear}
                    onChange={(e) => {
                      const yr = parseInt(e.target.value, 10);
                      setPickerYear(yr);
                      if (yr === 2026 && pickerMonth < 10) {
                        setPickerMonth(10);
                      }
                    }}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer font-mono"
                  >
                    {[2026, 2027].map((yr) => (
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

                    // Check day slots status
                    const mSlot = getSlotForTime(day, 'morning');
                    const aSlot = getSlotForTime(day, 'afternoon');
                    const eSlot = getSlotForTime(day, 'evening');

                    const hasThisActivityOnDay =
                      mSlot?.activityId === activity.id ||
                      aSlot?.activityId === activity.id ||
                      eSlot?.activityId === activity.id;

                    const dayFullyOccupied = !!mSlot && !!aSlot && !!eSlot;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`h-8 w-full rounded-lg font-medium transition-all flex items-center justify-center relative cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm font-bold scale-105'
                            : hasThisActivityOnDay
                            ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                            : dayFullyOccupied
                            ? 'text-slate-400 line-through hover:bg-slate-200'
                            : 'text-slate-700 hover:bg-slate-200'
                        }`}
                        title={
                          hasThisActivityOnDay
                            ? 'Cette activité est déjà prévue ce jour-là ! Vous pouvez la rejoindre.'
                            : undefined
                        }
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
                  const existingOnTime = getSlotForTime(safeDay, slotKey);
                  const isForSameActivity = existingOnTime?.activityId === activity.id;
                  const isForOther = existingOnTime && !isForSameActivity;
                  const isSelected = selectedSlot === slotKey;

                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => setSelectedSlot(slotKey)}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                        isSelected
                          ? isForSameActivity
                            ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                            : isForOther
                            ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20'
                            : 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                          : isForSameActivity
                          ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50'
                          : isForOther
                          ? 'border-slate-200 bg-slate-100/70 opacity-60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mb-1 text-slate-700">
                        <info.Icon
                          className={`w-4 h-4 ${
                            isForSameActivity ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-900">{info.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{info.time}</div>

                      {isForSameActivity && (
                        <span className="inline-block text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded mt-1.5 border border-emerald-300">
                          Rejoindre (avec {existingOnTime.friendName})
                        </span>
                      )}

                      {isForOther && (
                        <span className="inline-block text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded mt-1.5 border border-rose-200">
                          Occupé (autre sortie)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Informative Status Banner based on slot */}
              {isCurrentSlotForThisActivity && currentMatchingSlot && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 mt-2.5 flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Session collective avec {currentMatchingSlot.friendName}
                    </span>
                    <span className="text-emerald-800 block mt-0.5">
                      Indiquez simplement votre prénom ci-dessous pour vous ajouter à cette sortie !
                    </span>
                  </div>
                </div>
              )}

              {isCurrentSlotForOtherActivity && currentMatchingSlot && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mt-2.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Créneau déjà réservé pour une autre activité</span>
                    <span className="text-rose-700 block mt-0.5">
                      L'organisateur est déjà pris par « {currentMatchingSlot.activityTitle} ». Veuillez choisir une autre date ou un autre créneau.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Friend details */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                3. Tes coordonnées & mot pour l'équipe
              </label>

              <div>
                <input
                  id="booking-friend-name-input"
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
                  placeholder={
                    isCurrentSlotForThisActivity
                      ? "Un mot pour le groupe ? (ex: 'Trop chaud pour venir avec vous !', ...)"
                      : "Un petit mot ? (ex: 'Trop chaud pour tester !', 'Je ramène mon jeu préféré', ...)"
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !!isCurrentSlotForOtherActivity}
                className={`w-full py-3.5 px-6 font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCurrentSlotForThisActivity
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : isCurrentSlotForThisActivity && currentMatchingSlot ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Rejoindre la sortie (avec {currentMatchingSlot.friendName})</span>
                  </>
                ) : (
                  <>
                    <span>Envoyer ma proposition</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 mt-2">
                {isCurrentSlotForThisActivity
                  ? 'Votre participation sera immédiatement ajoutée et notifiée à l’organisateur !'
                  : 'L’organisateur recevra votre demande et pourra l’insérer directement dans son emploi du temps !'}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
