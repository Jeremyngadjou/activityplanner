import React, { useState } from 'react';
import { Proposal, ScheduleSlot, SlotType } from '../types';
import {
  Calendar as CalendarIcon,
  Download,
  Clock,
  User,
  CheckCircle2,
  X,
  CalendarPlus,
  Loader2,
  Check,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  signInWithGoogleCalendar,
  logoutGoogle,
  addEventToGoogleCalendar,
} from '../services/calendarService';
import { User as FirebaseUser } from 'firebase/auth';

interface OrganizerCalendarProps {
  scheduleSlots: ScheduleSlot[];
  proposals: Proposal[];
  onRemoveSlot: (date: string, slot: SlotType) => void;
  googleUser: FirebaseUser | null;
  googleToken: string | null;
  onGoogleLoginSuccess: (user: FirebaseUser, token: string) => void;
  onGoogleLogout: () => void;
  activeTargetMonth?: { year: number; month: number };
  onSetActiveTargetMonth?: (year: number, month: number) => void;
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

export const OrganizerCalendar: React.FC<OrganizerCalendarProps> = ({
  scheduleSlots,
  proposals,
  onRemoveSlot,
  googleUser,
  googleToken,
  onGoogleLoginSuccess,
  onGoogleLogout,
  activeTargetMonth,
  onSetActiveTargetMonth,
}) => {
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<ScheduleSlot | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [googleSyncSuccess, setGoogleSyncSuccess] = useState<string | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);

  // Dynamic month & year state (defaults to activeTargetMonth or current date)
  const [currentYear, setCurrentYear] = useState<number>(() => activeTargetMonth?.year ?? new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => activeTargetMonth?.month ?? new Date().getMonth());

  // Confirmation modal state before Google Calendar event creation
  const [confirmSyncSlot, setConfirmSyncSlot] = useState<ScheduleSlot | null>(null);

  // Dynamic calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Monday start offset: 0 = Mon, 1 = Tue, ..., 6 = Sun
  const startOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const slotLabels: Record<SlotType, { name: string; times: string; color: string }> = {
    morning: { name: 'Matin', times: '09h - 12h30', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    afternoon: { name: 'Après-midi', times: '14h - 18h30', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    evening: { name: 'Soirée', times: '19h - 23h30', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  };

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Current month prefix (YYYY-MM)
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthSlots = scheduleSlots.filter((s) => s.date.startsWith(currentMonthPrefix));
  const totalSlotsInMonth = daysInMonth * 3;
  const bookedCountInMonth = monthSlots.length;
  const uniqueFriendsInMonth = new Set(monthSlots.map((s) => s.friendName)).size;

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setGoogleSyncError(null);
    try {
      const result = await signInWithGoogleCalendar();
      if (result) {
        onGoogleLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setGoogleSyncError('Connexion à Google Calendar annulée ou impossible.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Confirm and push event to Google Calendar
  const handleConfirmPushToGoogle = async () => {
    if (!confirmSyncSlot || !googleToken) return;

    setIsSyncingGoogle(true);
    setGoogleSyncError(null);
    try {
      await addEventToGoogleCalendar(googleToken, {
        title: confirmSyncSlot.activityTitle,
        friendName: confirmSyncSlot.friendName,
        date: confirmSyncSlot.date,
        slot: confirmSyncSlot.slot,
        note: confirmSyncSlot.note,
      });

      setGoogleSyncSuccess(
        `« ${confirmSyncSlot.activityTitle} avec ${confirmSyncSlot.friendName} » a été ajouté à votre vrai Google Calendar !`
      );
      setConfirmSyncSlot(null);
      setTimeout(() => setGoogleSyncSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error adding event to Google Calendar:', err);
      setGoogleSyncError(err?.message || 'Erreur lors de l’ajout dans Google Calendar.');
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Export to iCalendar (.ics)
  const exportToICS = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OnSeVoitQuand//Planning//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const slotHours: Record<SlotType, { start: string; end: string }> = {
      morning: { start: 'T090000', end: 'T123000' },
      afternoon: { start: 'T140000', end: 'T183000' },
      evening: { start: 'T190000', end: 'T233000' },
    };

    scheduleSlots.forEach((slot) => {
      const cleanDate = slot.date.replace(/-/g, '');
      const hours = slotHours[slot.slot];
      const startDateTime = `${cleanDate}${hours.start}`;
      const endDateTime = `${cleanDate}${hours.end}`;
      const summary = `${slot.activityTitle} avec ${slot.friendName}`;
      const desc = `Activité prévue avec ${slot.friendName}.${slot.note ? ` Note: ${slot.note}` : ''}`;

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${slot.proposalId || Math.random().toString()}@onsevoitquand`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `planning_${MONTH_NAMES[currentMonth].toLowerCase()}_${currentYear}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const yearsOptions = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-600" />
            <span>Emploi du Temps — {MONTH_NAMES[currentMonth]} {currentYear}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Naviguez entre les mois pour planifier toutes vos sorties et synchroniser vos créneaux.
          </p>
        </div>

        {/* Calendar Sync Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Google Calendar Connection Button */}
          {googleUser ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-900 font-medium truncate max-w-[150px]">
                {googleUser.email || 'Google Calendar connecté'}
              </span>
              <button
                onClick={onGoogleLogout}
                className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
                title="Déconnecter Google Calendar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              {isLoggingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Lier Google Calendar</span>
            </button>
          )}

          {/* Export to ICS button */}
          <button
            onClick={exportToICS}
            disabled={scheduleSlots.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Télécharger le fichier .ics pour tout calendrier"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter iCal (.ics)</span>
          </button>
        </div>
      </div>

      {/* Month & Year Navigation Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer font-mono"
            >
              {yearsOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Mois suivant"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTargetMonth && onSetActiveTargetMonth && (
            activeTargetMonth.year === currentYear && activeTargetMonth.month === currentMonth ? (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-amber-600" />
                <span>Mois partagé aux invités</span>
              </span>
            ) : (
              <button
                onClick={() => onSetActiveTargetMonth(currentYear, currentMonth)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Définir ce mois comme le mois par défaut ouvert par vos amis"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Partager ce mois-ci</span>
              </button>
            )
          )}

          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            title="Revenir au mois actuel"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Aujourd'hui</span>
          </button>
        </div>
      </div>

      {/* Sync feedback message */}
      {googleSyncSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{googleSyncSuccess}</span>
        </div>
      )}

      {googleSyncError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <X className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{googleSyncError}</span>
        </div>
      )}

      {/* KPI Cards for the active month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Activités en {MONTH_NAMES[currentMonth]}</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {bookedCountInMonth}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Amis au rendez-vous</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {uniqueFriendsInMonth}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Créneaux libres ({MONTH_NAMES[currentMonth]})</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {totalSlotsInMonth - bookedCountInMonth} <span className="text-xs font-normal text-slate-400">/ {totalSlotsInMonth}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-bold text-slate-500">
          {dayNames.map((d) => (
            <div key={d} className="py-1">
              <span className="hidden md:inline">{d}</span>
              <span className="md:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`cal-empty-${i}`} className="min-h-[110px] bg-slate-50/50 rounded-xl" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const daySlots = scheduleSlots.filter((s) => s.date === dateStr);
            const dayPending = proposals.filter((p) => p.date === dateStr && p.status === 'pending');

            return (
              <div
                key={day}
                className="min-h-[110px] sm:min-h-[125px] bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {day}
                  </span>
                  {dayPending.length > 0 && (
                    <span
                      title={`${dayPending.length} proposition(s) en attente`}
                      className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse"
                    >
                      {dayPending.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  {(['morning', 'afternoon', 'evening'] as SlotType[]).map((slotKey) => {
                    const booked = daySlots.find((s) => s.slot === slotKey);
                    const slotInfo = slotLabels[slotKey];

                    if (booked) {
                      return (
                        <button
                          key={slotKey}
                          onClick={() => setSelectedSlotDetail(booked)}
                          className={`w-full text-left p-1 rounded-md border text-[10px] font-medium leading-tight truncate block transition-transform hover:scale-[1.02] cursor-pointer ${slotInfo.color}`}
                        >
                          <span className="font-bold">{slotInfo.name.charAt(0)}:</span> {booked.friendName}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={slotKey}
                        className="text-[9px] text-slate-300 font-light px-1 py-0.5 truncate border border-dashed border-slate-100 rounded"
                      >
                        {slotInfo.name.charAt(0)} libre
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot detail modal */}
      {selectedSlotDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Créneau Confirmé
              </span>
              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedSlotDetail.activityTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                Avec <span className="font-semibold text-slate-900">{selectedSlotDetail.friendName}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {selectedSlotDetail.date} · {slotLabels[selectedSlotDetail.slot].name} ({slotLabels[selectedSlotDetail.slot].times})
              </p>
              {selectedSlotDetail.note && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 italic mt-3">
                  « {selectedSlotDetail.note} »
                </div>
              )}
            </div>

            {/* Google Calendar Action */}
            <div className="pt-2 space-y-2">
              {googleUser ? (
                <button
                  onClick={() => {
                    setConfirmSyncSlot(selectedSlotDetail);
                    setSelectedSlotDetail(null);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Ajouter à mon Google Calendar</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedSlotDetail(null);
                    handleGoogleSignIn();
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Connecter Google Calendar pour synchroniser</span>
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    onRemoveSlot(selectedSlotDetail.date, selectedSlotDetail.slot);
                    setSelectedSlotDetail(null);
                  }}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
                >
                  Libérer ce créneau
                </button>
                <button
                  onClick={() => setSelectedSlotDetail(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog before mutating Google Calendar */}
      {confirmSyncSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <CalendarPlus className="w-5 h-5" />
              <span>Confirmation Google Calendar</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Voulez-vous ajouter l'événement suivant dans votre agenda Google principal ?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                {confirmSyncSlot.activityTitle}
              </div>
              <div className="text-slate-600">
                Avec : <span className="font-semibold text-slate-900">{confirmSyncSlot.friendName}</span>
              </div>
              <div className="text-slate-500 font-mono">
                Date : {confirmSyncSlot.date} ({slotLabels[confirmSyncSlot.slot].name} {slotLabels[confirmSyncSlot.slot].times})
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmSyncSlot(null)}
                disabled={isSyncingGoogle}
                className="w-full py-2.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPushToGoogle}
                disabled={isSyncingGoogle}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSyncingGoogle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmer l'ajout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
