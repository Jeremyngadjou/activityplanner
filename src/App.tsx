import React, { useState, useEffect } from 'react';
import { Activity, Proposal, ScheduleSlot, AppNotification, AppView, OrganizerTab, SlotType, ActivitySuggestion } from './types';
import { INITIAL_ACTIVITIES } from './data/defaultActivities';
import { ActivityCard } from './components/ActivityCard';
import { BookingModal } from './components/BookingModal';
import { OrganizerInbox } from './components/OrganizerInbox';
import { OrganizerCalendar } from './components/OrganizerCalendar';
import { OrganizerActivityManager } from './components/OrganizerActivityManager';
import { OrganizerAIStudio } from './components/OrganizerAIStudio';
import { OrganizerNotifications } from './components/OrganizerNotifications';
import { GuestProposalsModal } from './components/GuestProposalsModal';
import { SuggestActivityModal } from './components/SuggestActivityModal';
import { OrganizerSuggestionsManager } from './components/OrganizerSuggestionsManager';
import {
  Clock,
  Sparkles,
  Calendar,
  Inbox,
  LayoutGrid,
  Search,
  CheckCircle2,
  Share2,
  Lightbulb,
  Check,
  Plus,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
  KeyRound,
  X,
  Bell,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PinModal, ChangePinModal } from './components/PinModal';
import {
  initAuth,
  logoutGoogle,
  addEventToGoogleCalendar,
  createGoogleCalendarWebUrl,
  getStoredAccessToken,
  signInWithGoogleCalendar,
} from './services/calendarService';
import { User as FirebaseUser } from 'firebase/auth';
import { ADMIN_EMAIL } from './firebase';
import {
  subscribeActivities,
  subscribeProposals,
  subscribeScheduleSlots,
  subscribeNotifications,
  subscribeSettings,
  saveActivityToFirestore,
  deleteActivityFromFirestore,
  deleteAllActivitiesFromFirestore,
  importActivitiesToFirestore,
  createProposalInFirestore,
  updateProposalStatusInFirestore,
  saveScheduleSlotToFirestore,
  deleteScheduleSlotFromFirestore,
  saveSettingsToFirestore,
  joinScheduleSlotInFirestore,
  subscribeActivitySuggestions,
  createActivitySuggestionInFirestore,
  updateActivitySuggestionStatusInFirestore,
  deleteActivitySuggestionFromFirestore,
} from './services/firestoreSync';

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

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('friend');
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>('activities');

  // Shared server state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & filter state
  const [selectedActivityForBooking, setSelectedActivityForBooking] = useState<Activity | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Guest Proposals History (allows friends to track their proposal & suggestion status)
  const [guestProposalIds, setGuestProposalIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rdv_guest_proposals') || '[]');
    } catch {
      return [];
    }
  });
  const [guestSuggestionIds, setGuestSuggestionIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rdv_guest_suggestions') || '[]');
    } catch {
      return [];
    }
  });
  const [showGuestProposalsModal, setShowGuestProposalsModal] = useState(false);

  // Google Calendar Auth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Target planning month chosen by the organizer (or loaded via ?m=YYYY-MM)
  // Tool foundation starting month is strictly November 2026 (index 10)
  const [activeYear, setActiveYear] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      if (mParam && /^\d{4}-\d{2}$/.test(mParam)) {
        const y = parseInt(mParam.split('-')[0], 10);
        const m = parseInt(mParam.split('-')[1], 10) - 1;
        if (y > 2026 || (y === 2026 && m >= 10)) {
          return y;
        }
      }
      const saved = localStorage.getItem('rdv_target_year');
      if (saved) {
        const y = parseInt(saved, 10);
        if (y >= 2026) return y;
      }
    }
    return 2026;
  });

  const [activeMonth, setActiveMonth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      if (mParam && /^\d{4}-\d{2}$/.test(mParam)) {
        const y = parseInt(mParam.split('-')[0], 10);
        const m = parseInt(mParam.split('-')[1], 10) - 1;
        if (y > 2026 || (y === 2026 && m >= 10)) {
          if (m >= 0 && m <= 11) return m;
        }
      }
      const saved = localStorage.getItem('rdv_target_month');
      if (saved) {
        const m = parseInt(saved, 10);
        if (m >= 0 && m <= 11) return m;
      }
    }
    return 10; // Novembre 2026 (starting month)
  });

  // Centralized Notifications State (strictly silent, no popup toast banners)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [calendarSyncNotice, setCalendarSyncNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
    directUrl?: string;
  } | null>(null);

  const handleSetActiveMonth = async (year: number, month: number) => {
    let safeYear = year;
    let safeMonth = month;
    // Strictly prevent navigating before November 2026
    if (safeYear < 2026 || (safeYear === 2026 && safeMonth < 10)) {
      safeYear = 2026;
      safeMonth = 10;
    }

    setActiveYear(safeYear);
    setActiveMonth(safeMonth);
    localStorage.setItem('rdv_target_year', String(safeYear));
    localStorage.setItem('rdv_target_month', String(safeMonth));
    const url = new URL(window.location.href);
    url.searchParams.set('m', `${safeYear}-${String(safeMonth + 1).padStart(2, '0')}`);
    window.history.replaceState({}, '', url.toString());

    try {
      await saveSettingsToFirestore(safeYear, safeMonth);
    } catch {}

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetYear: safeYear, targetMonth: safeMonth }),
      });
    } catch {}
  };

  const isAtMinMonth = activeYear <= 2026 && activeMonth <= 10;

  const handlePrevMonth = () => {
    if (isAtMinMonth) return;
    if (activeMonth === 0) {
      handleSetActiveMonth(activeYear - 1, 11);
    } else {
      handleSetActiveMonth(activeYear, activeMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 11) {
      handleSetActiveMonth(activeYear + 1, 0);
    } else {
      handleSetActiveMonth(activeYear, activeMonth + 1);
    }
  };

  // Generate selectable months from Nov 2026 onwards
  const guestAvailableMonths: { key: string; label: string; year: number; month: number }[] = [];
  for (let y = 2026; y <= 2027; y++) {
    const startM = y === 2026 ? 10 : 0;
    for (let m = startM; m < 12; m++) {
      guestAvailableMonths.push({
        key: `${y}-${String(m + 1).padStart(2, '0')}`,
        label: `${MONTH_NAMES[m]} ${y}`,
        year: y,
        month: m,
      });
    }
  }

  // Handle JSON Import with Firestore broadcast
  const handleImportActivities = async (
    monthKey: string,
    importedList: Activity[],
    mode: 'merge' | 'replace'
  ) => {
    const cleanMonthKey = monthKey || '2026-11';
    try {
      await importActivitiesToFirestore(cleanMonthKey, importedList, mode);
    } catch (e) {
      console.warn('Erreur import Firestore:', e);
    }

    try {
      await fetch('/api/activities/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthKey: cleanMonthKey, activities: importedList, mode }),
      });
    } catch {
      const formatted = importedList.map((item, idx) => ({
        ...item,
        id: item.id || `act-imp-${Date.now()}-${idx}`,
        monthKey: cleanMonthKey,
      }));
      if (mode === 'replace') {
        setActivities((prev) => [
          ...formatted,
          ...prev.filter((a) => (a.monthKey || '2026-11') !== cleanMonthKey),
        ]);
      } else {
        setActivities((prev) => [...formatted, ...prev]);
      }
    }
  };

  // Organizer Security (Centralized PIN protection)
  const STORAGE_KEY_PIN = 'rdv_nov_pin_v1';
  const STORAGE_KEY_AUTH = 'rdv_nov_auth_v1';
  const [savedPin, setSavedPin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PIN) || '1126';
  });
  const [isOrganizerUnlocked, setIsOrganizerUnlocked] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [gatePin, setGatePin] = useState('');
  const [gateError, setGateError] = useState(false);
  const [isGateVerifying, setIsGateVerifying] = useState(false);

  const handleUnlockSuccess = (user?: FirebaseUser, token?: string) => {
    setIsOrganizerUnlocked(true);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    if (user) setGoogleUser(user);
    if (token) setGoogleToken(token);
    setCurrentView('organizer');
    setShowPinModal(false);
    setGatePin('');
    setGateError(false);
  };

  // Centralized PIN verification across all devices
  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.valid;
      }
    } catch {}
    // Fallback if offline
    return pin === savedPin;
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePin.trim()) return;
    setIsGateVerifying(true);
    setGateError(false);
    const isValid = await handleVerifyPin(gatePin.trim());
    setIsGateVerifying(false);
    if (isValid) {
      handleUnlockSuccess();
    } else {
      setGateError(true);
      setGatePin('');
    }
  };

  const handleLockOrganizer = () => {
    setIsOrganizerUnlocked(false);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setCurrentView('friend');
  };

  const handleChangePinCentralized = async (currentPin: string, newPin: string) => {
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedPin(newPin);
        localStorage.setItem(STORAGE_KEY_PIN, newPin);
        loadServerData(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Erreur lors du changement de PIN.' };
    } catch {
      setSavedPin(newPin);
      localStorage.setItem(STORAGE_KEY_PIN, newPin);
      return { success: true };
    }
  };

  // Centralized Notification Handlers
  const handleMarkNotifAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {}
  };

  const handleMarkAllNotifsAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {}
  };

  const handleDeleteNotif = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const handleClearAllNotifs = async () => {
    setNotifications([]);
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
    } catch {}
  };

  const handleNavigateToProposal = (_proposalId: string) => {
    if (!isOrganizerUnlocked) {
      setShowPinModal(true);
      return;
    }
    setCurrentView('organizer');
    setOrganizerTab('inbox');
  };

  // Fetch initial and synced data
  const loadServerData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const rawActs = data.activities && data.activities.length > 0 ? data.activities : INITIAL_ACTIVITIES;
          const seen = new Set<string>();
          const uniqueActs = rawActs.filter((a: Activity) => {
            if (!a?.id || seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
          });
          setActivities(uniqueActs);
          setProposals(data.proposals || []);
          setScheduleSlots(data.scheduleSlots || []);

          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }

          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
          }

          if (data.settings) {
            const params = new URLSearchParams(window.location.search);
            if (!params.get('m')) {
              if (typeof data.settings.targetYear === 'number') {
                setActiveYear(data.settings.targetYear);
              }
              if (typeof data.settings.targetMonth === 'number') {
                setActiveMonth(data.settings.targetMonth);
              }
            }
          }
          return;
        }
      }
      throw new Error('API unreachable');
    } catch {
      // Offline / Vercel static fallback
      const savedActs = localStorage.getItem('rdv_nov_activities');
      const parsed = savedActs ? JSON.parse(savedActs) : INITIAL_ACTIVITIES;
      const seen = new Set<string>();
      const unique = parsed.filter((a: Activity) => {
        if (!a?.id || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      setActivities(unique);

      const savedProps = localStorage.getItem('rdv_nov_proposals');
      setProposals(savedProps ? JSON.parse(savedProps) : []);

      const savedSlots = localStorage.getItem('rdv_nov_slots');
      setScheduleSlots(savedSlots ? JSON.parse(savedSlots) : []);

      const savedSugs = localStorage.getItem('rdv_nov_suggestions');
      setSuggestions(savedSugs ? JSON.parse(savedSugs) : []);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Real-time Firestore synchronization across all devices & friends
  useEffect(() => {
    // Initial fetch for immediate load
    loadServerData(false);

    // 1. Subscribe to Activities in real-time
    const unsubActivities = subscribeActivities((liveActivities) => {
      if (liveActivities && liveActivities.length > 0) {
        const seen = new Set<string>();
        const unique = liveActivities.filter((act) => {
          if (!act?.id || seen.has(act.id)) return false;
          seen.add(act.id);
          return true;
        });
        setActivities(unique);
      }
      setIsLoading(false);
    });

    // 2. Subscribe to Proposals in real-time
    const unsubProposals = subscribeProposals((liveProposals) => {
      setProposals(liveProposals);
    });

    // 3. Subscribe to Schedule Slots in real-time
    const unsubSlots = subscribeScheduleSlots((liveSlots) => {
      setScheduleSlots(liveSlots);
    });

    // 4. Subscribe to global Settings in real-time
    const unsubSettings = subscribeSettings((liveSettings) => {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('m')) {
        if (typeof liveSettings.targetYear === 'number') {
          setActiveYear(liveSettings.targetYear);
        }
        if (typeof liveSettings.targetMonth === 'number') {
          setActiveMonth(liveSettings.targetMonth);
        }
      }
    });

    // 5. Subscribe to Activity Suggestions in real-time
    const unsubSuggestions = subscribeActivitySuggestions((liveSuggestions) => {
      setSuggestions(liveSuggestions);
    });

    // 6. Auth State Listener
    const unsubAuth = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsOrganizerUnlocked(true);
          localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    // Light polling fallback to catch server changes
    const pollInterval = setInterval(() => {
      loadServerData(false);
    }, 10000);

    return () => {
      unsubActivities?.();
      unsubProposals?.();
      unsubSlots?.();
      unsubSettings?.();
      unsubSuggestions?.();
      unsubAuth?.();
      clearInterval(pollInterval);
    };
  }, []);

  // Notifications live listener for admin (strictly silent, no popup toast banners)
  useEffect(() => {
    if (googleUser?.email && googleUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const unsubNotifs = subscribeNotifications((liveNotifs) => {
        setNotifications(liveNotifs);
      });
      return () => unsubNotifs?.();
    }
  }, [googleUser]);

  // Sync to localStorage as backup
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('rdv_nov_activities', JSON.stringify(activities));
    }
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('rdv_nov_proposals', JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem('rdv_nov_slots', JSON.stringify(scheduleSlots));
  }, [scheduleSlots]);

  const handleGoogleLoginSuccess = (user: FirebaseUser, token: string) => {
    setGoogleUser(user);
    setGoogleToken(token);
    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setIsOrganizerUnlocked(true);
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleToken(null);
    setIsOrganizerUnlocked(false);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setCurrentView('friend');
  };

  const [showShareModal, setShowShareModal] = useState(false);

  // Get public shareable URL (replaces internal ais-dev- with public ais-pre-)
  const getPublicShareUrl = (year = activeYear, month = activeMonth) => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    const monthFormatted = String(month + 1).padStart(2, '0');
    return `${origin}/?m=${year}-${monthFormatted}`;
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const url = getPublicShareUrl();
    try {
      navigator.clipboard.writeText(url);
    } catch {}
    setCopiedLink(true);
    setShowShareModal(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Submit a proposal (friend view)
  const handleCreateProposal = async (data: Omit<Proposal, 'id' | 'status' | 'createdAt'>) => {
    const newProp: Proposal = {
      ...data,
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 1. Direct Firestore write (propagates immediately to admin)
    try {
      await createProposalInFirestore(newProp);
    } catch (e) {
      console.warn('Erreur création proposition Firestore:', e);
    }

    // 2. Server persistence fallback
    try {
      await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProp),
      });
    } catch {}

      setProposals((prev) => [newProp, ...prev]);

    // Save proposal to friend's browser storage for live status tracking
    setGuestProposalIds((prev) => {
      const updated = [newProp.id, ...prev.filter((id) => id !== newProp.id)];
      try {
        localStorage.setItem('rdv_guest_proposals', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearGuestProposals = () => {
    setGuestProposalIds([]);
    setGuestSuggestionIds([]);
    try {
      localStorage.removeItem('rdv_guest_proposals');
      localStorage.removeItem('rdv_guest_suggestions');
    } catch {}
    setShowGuestProposalsModal(false);
  };

  const handleCancelGuestProposal = async (proposalId: string) => {
    setGuestProposalIds((prev) => {
      const updated = prev.filter((id) => id !== proposalId);
      try {
        localStorage.setItem('rdv_guest_proposals', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await handleDeclineProposal(proposalId, 'Demande annulée par l’invité');
  };

  // Guest submits an activity suggestion
  const handleCreateSuggestion = async (
    data: Omit<ActivitySuggestion, 'id' | 'status' | 'createdAt'>
  ) => {
    const newSug: ActivitySuggestion = {
      ...data,
      id: `sug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await createActivitySuggestionInFirestore(newSug);
    } catch (e) {
      console.warn('Erreur creation suggestion Firestore:', e);
    }

    try {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSug),
      });
    } catch {}

    setSuggestions((prev) => [newSug, ...prev]);

    setGuestSuggestionIds((prev) => {
      const updated = [newSug.id, ...prev.filter((id) => id !== newSug.id)];
      try {
        localStorage.setItem('rdv_guest_suggestions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Organizer converts suggestion to a full public activity card
  const handleConvertToActivity = async (suggestion: ActivitySuggestion) => {
    const newAct: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category || 'Gastronomie',
      duration: suggestion.duration || '2h',
      locationType: suggestion.locationType || 'En ville',
      energyLevel: 'Modéré',
      accentGradient: 'from-amber-600 via-orange-500 to-amber-700',
      iconName: suggestion.category || 'Calendar',
      isOrganizerCustom: true,
      monthKey: suggestion.monthKey || activeMonthKey,
    };

    await handleAddActivity(newAct);

    try {
      await updateActivitySuggestionStatusInFirestore(
        suggestion.id,
        'converted_to_activity',
        `Ajoutée aux activités pour tout le monde (${suggestion.monthKey || activeMonthKey})`,
        { resultingActivityId: newAct.id }
      );
    } catch (e) {
      console.warn('Erreur conversion suggestion Firestore:', e);
    }

    try {
      await fetch(`/api/suggestions/${suggestion.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'converted_to_activity',
          adminNote: `Ajoutée aux activités`,
          extraFields: { resultingActivityId: newAct.id },
        }),
      });
    } catch {}

    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestion.id
          ? {
              ...s,
              status: 'converted_to_activity',
              adminNote: 'Ajoutée aux activités',
              resultingActivityId: newAct.id,
            }
          : s
      )
    );
  };

  // Organizer accepts suggestion directly as a 1-on-1 outing
  const handleAcceptDuo = async (
    suggestion: ActivitySuggestion,
    date: string,
    slot: SlotType
  ) => {
    try {
      await saveScheduleSlotToFirestore({
        date,
        slot,
        proposalId: suggestion.id,
        activityId: `sug-${suggestion.id}`,
        activityTitle: suggestion.title,
        friendName: suggestion.suggestedBy,
        note: `Sortie à 2 suggérée par ${suggestion.suggestedBy}.${
          suggestion.description ? ` Détails : ${suggestion.description}` : ''
        }`,
      });
    } catch (e) {
      console.warn('Erreur réservation créneau duo Firestore:', e);
    }

    try {
      await updateActivitySuggestionStatusInFirestore(
        suggestion.id,
        'accepted_duo',
        `Sortie à 2 validée pour le ${date} !`,
        { resultingSlotDate: date, resultingSlotType: slot }
      );
    } catch (e) {
      console.warn('Erreur mise à jour suggestion duo Firestore:', e);
    }

    try {
      await fetch(`/api/suggestions/${suggestion.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted_duo',
          adminNote: `Sortie à 2 validée pour le ${date} !`,
          extraFields: { resultingSlotDate: date, resultingSlotType: slot },
        }),
      });
    } catch {}

    setScheduleSlots((prev) => [
      ...prev.filter((s) => !(s.date === date && s.slot === slot)),
      {
        date,
        slot,
        proposalId: suggestion.id,
        activityId: `sug-${suggestion.id}`,
        activityTitle: suggestion.title,
        friendName: suggestion.suggestedBy,
        note: `Sortie à 2 suggérée par ${suggestion.suggestedBy}.${
          suggestion.description ? ` Détails : ${suggestion.description}` : ''
        }`,
      },
    ]);

    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestion.id
          ? {
              ...s,
              status: 'accepted_duo',
              adminNote: `Sortie à 2 validée pour le ${date} !`,
              resultingSlotDate: date,
              resultingSlotType: slot,
            }
          : s
      )
    );

    // Automatic Google Calendar sync for this 1-on-1 outing
    const directUrl = createGoogleCalendarWebUrl({
      title: suggestion.title,
      friendName: suggestion.suggestedBy,
      date,
      slot,
      note: suggestion.description,
    });

    const token = googleToken || getStoredAccessToken();
    if (token) {
      try {
        await addEventToGoogleCalendar(token, {
          title: suggestion.title,
          friendName: suggestion.suggestedBy,
          date,
          slot,
          note: suggestion.description,
        });
        setCalendarSyncNotice({
          type: 'success',
          message: `Sortie à 2 « ${suggestion.title} avec ${suggestion.suggestedBy} » ajoutée automatiquement à votre Google Calendar !`,
          directUrl,
        });
      } catch (calErr: any) {
        setCalendarSyncNotice({
          type: 'warning',
          message: `Créneau à 2 bloqué. Synchronisation Google Agenda en attente (${calErr?.message || 'reconnexion nécessaire'}).`,
          directUrl,
        });
      }
    } else {
      setCalendarSyncNotice({
        type: 'info',
        message: `Sortie à 2 bloquée au planning. Vous pouvez l'ajouter à votre Google Calendar :`,
        directUrl,
      });
    }
  };

  // Organizer cancels a duo outing (frees slot and sets suggestion back to pending)
  const handleCancelDuo = async (suggestion: ActivitySuggestion) => {
    const date = suggestion.resultingSlotDate;
    const slot = suggestion.resultingSlotType;
    if (date && slot) {
      await handleRemoveSlot(date, slot);
    } else {
      const matchingSlot = scheduleSlots.find(
        (s) => s.proposalId === suggestion.id || s.activityTitle === suggestion.title
      );
      if (matchingSlot) {
        await handleRemoveSlot(matchingSlot.date, matchingSlot.slot);
      }
    }

    try {
      await updateActivitySuggestionStatusInFirestore(
        suggestion.id,
        'pending',
        'Sortie à 2 annulée par l’organisateur'
      );
    } catch (e) {
      console.warn('Erreur annulation sortie à 2 Firestore:', e);
    }

    try {
      await fetch(`/api/suggestions/${suggestion.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          adminNote: 'Sortie à 2 annulée par l’organisateur',
        }),
      });
    } catch {}

    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestion.id
          ? {
              ...s,
              status: 'pending',
              adminNote: 'Sortie à 2 annulée par l’organisateur',
              resultingSlotDate: undefined,
              resultingSlotType: undefined,
            }
          : s
      )
    );
  };

  // Organizer declines suggestion
  const handleDeclineSuggestion = async (suggestionId: string, adminNote?: string) => {
    try {
      await updateActivitySuggestionStatusInFirestore(suggestionId, 'declined', adminNote);
    } catch (e) {
      console.warn('Erreur refus suggestion Firestore:', e);
    }

    try {
      await fetch(`/api/suggestions/${suggestionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined', adminNote }),
      });
    } catch {}

    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'declined', adminNote } : s))
    );
  };

  // Organizer deletes suggestion
  const handleDeleteSuggestion = async (suggestionId: string) => {
    try {
      await deleteActivitySuggestionFromFirestore(suggestionId);
    } catch (e) {
      console.warn('Erreur suppression suggestion Firestore:', e);
    }

    try {
      await fetch(`/api/suggestions/${suggestionId}`, { method: 'DELETE' });
    } catch {}

    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  // Join an existing confirmed slot (friend joins group activity)
  const handleJoinSlot = async (
    date: string,
    slot: SlotType,
    participant: { name: string; contact?: string; note?: string }
  ) => {
    try {
      const updated = await joinScheduleSlotInFirestore(date, slot, participant);
      if (updated) {
        setScheduleSlots((prev) =>
          prev.map((s) => (s.date === date && s.slot === slot ? updated : s))
        );
      }
    } catch (e) {
      console.warn('Erreur ajout participant Firestore:', e);
    }

    try {
      await fetch('/api/slots/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot, participant }),
      });
    } catch {}
  };

  // Accept a proposal (organizer) with automatic Google Calendar push
  const handleAcceptProposal = async (proposalId: string) => {
    const prop = proposals.find((p) => p.id === proposalId);
    try {
      await updateProposalStatusInFirestore(proposalId, 'accepted');
      if (prop) {
        await saveScheduleSlotToFirestore({
          date: prop.date,
          slot: prop.slot,
          proposalId: prop.id,
          activityId: prop.activityId,
          activityTitle: prop.activityTitle,
          friendName: prop.friendName,
          note: prop.note,
        });
      }
    } catch (e) {
      console.warn('Erreur acceptation proposition Firestore:', e);
    }

    try {
      await fetch(`/api/proposals/${proposalId}/accept`, { method: 'POST' });
    } catch {}

    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: 'accepted' as const } : p))
    );
    if (prop) {
      setScheduleSlots((prev) => [
        ...prev.filter((s) => !(s.date === prop.date && s.slot === prop.slot)),
        {
          date: prop.date,
          slot: prop.slot,
          proposalId: prop.id,
          activityId: prop.activityId,
          activityTitle: prop.activityTitle,
          friendName: prop.friendName,
          note: prop.note,
        },
      ]);

      // Direct & automatic Google Calendar synchronization
      const directUrl = createGoogleCalendarWebUrl({
        title: prop.activityTitle,
        friendName: prop.friendName,
        date: prop.date,
        slot: prop.slot,
        note: prop.note,
      });

      const token = googleToken || getStoredAccessToken();
      if (token) {
        try {
          await addEventToGoogleCalendar(token, {
            title: prop.activityTitle,
            friendName: prop.friendName,
            date: prop.date,
            slot: prop.slot,
            note: prop.note,
          });
          setCalendarSyncNotice({
            type: 'success',
            message: `« ${prop.activityTitle} avec ${prop.friendName} » a été automatiquement ajouté à votre Google Calendar !`,
            directUrl,
          });
        } catch (calErr: any) {
          console.warn('Erreur synchronisation automatique Google Calendar:', calErr);
          setCalendarSyncNotice({
            type: 'warning',
            message: `Créneau validé. Synchronisation Google Agenda en attente (${calErr?.message || 'reconnexion nécessaire'}).`,
            directUrl,
          });
        }
      } else {
        setCalendarSyncNotice({
          type: 'info',
          message: `Créneau validé. Vous pouvez l'ajouter directement à votre Google Calendar en 1 clic :`,
          directUrl,
        });
      }
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await signInWithGoogleCalendar();
      if (res) {
        handleGoogleLoginSuccess(res.user, res.accessToken);
        setCalendarSyncNotice({
          type: 'success',
          message: 'Google Calendar connecté avec succès ! La synchronisation automatique est active.',
        });
      }
    } catch (err: any) {
      console.error('Erreur connexion Google Calendar:', err);
      setCalendarSyncNotice({
        type: 'warning',
        message: err?.message || 'Impossible de se connecter à Google Calendar.',
      });
    }
  };

  // Decline a proposal (organizer)
  const handleDeclineProposal = async (proposalId: string, reason?: string) => {
    const prop = proposals.find((p) => p.id === proposalId);
    try {
      await updateProposalStatusInFirestore(proposalId, 'declined', reason);
      if (prop) {
        await deleteScheduleSlotFromFirestore(prop.date, prop.slot);
      }
    } catch (e) {
      console.warn('Erreur refus proposition Firestore:', e);
    }

    try {
      await fetch(`/api/proposals/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch {}

    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, status: 'declined' as const, declineReason: reason } : p
      )
    );
    if (prop) {
      setScheduleSlots((prev) => prev.filter((s) => s.proposalId !== proposalId));
    }
  };

  // Remove a schedule slot (organizer)
  const handleRemoveSlot = async (date: string, slot: string) => {
    try {
      await deleteScheduleSlotFromFirestore(date, slot);
    } catch (e) {
      console.warn('Erreur suppression créneau Firestore:', e);
    }

    try {
      await fetch(`/api/slots?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`, {
        method: 'DELETE',
      });
    } catch {}

    setScheduleSlots((prev) => prev.filter((s) => !(s.date === date && s.slot === slot)));
  };

  // Add activity (organizer - live Firestore broadcast)
  const handleAddActivity = async (newAct: Omit<Activity, 'id'>) => {
    const fullAct: Activity = {
      ...newAct,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      monthKey: newAct.monthKey || activeMonthKey,
    };

    // Optimistically add to local state without duplicates
    setActivities((prev) => {
      if (prev.some((a) => a.id === fullAct.id)) return prev;
      return [fullAct, ...prev];
    });

    try {
      await saveActivityToFirestore(fullAct);
    } catch (e) {
      console.warn('Erreur ajout activité Firestore:', e);
    }

    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullAct),
      });
    } catch {}
  };

  // Update activity (organizer)
  const handleUpdateActivity = async (updated: Activity) => {
    try {
      await saveActivityToFirestore(updated);
    } catch (e) {
      console.warn('Erreur mise à jour activité Firestore:', e);
    }

    try {
      await fetch(`/api/activities/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}

    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Delete activity (organizer)
  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivityFromFirestore(id);
    } catch (e) {
      console.warn('Erreur suppression activité Firestore:', e);
    }

    try {
      await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    } catch {}

    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  // Delete all activities at once (current month or all)
  const handleDeleteAllActivities = async (scope: 'current' | 'all') => {
    const targetMonthKey = scope === 'current' ? activeMonthKey : undefined;

    try {
      await deleteAllActivitiesFromFirestore(targetMonthKey);
    } catch (e) {
      console.warn('Erreur suppression groupée Firestore:', e);
    }

    try {
      await fetch('/api/activities/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, monthKey: targetMonthKey }),
      });
    } catch {}

    if (scope === 'current') {
      setActivities((prev) => prev.filter((a) => (a.monthKey || '2026-11') !== activeMonthKey));
    } else {
      setActivities([]);
    }
  };

  // Load starter suggestions if requested
  const handleLoadSuggestions = async () => {
    for (const act of INITIAL_ACTIVITIES) {
      await handleAddActivity({
        title: act.title,
        description: act.description,
        category: act.category,
        duration: act.duration,
        locationType: act.locationType,
        energyLevel: act.energyLevel,
        accentGradient: act.accentGradient,
        iconName: act.iconName,
        isOrganizerCustom: false,
      });
    }
  };

  // Update activity image
  const handleUpdateActivityImage = async (activityId: string, imageUrl: string) => {
    const act = activities.find((a) => a.id === activityId);
    if (!act) return;
    await handleUpdateActivity({ ...act, imageUrl });
  };

  // Category list for filters
  const categoriesList = ['all', 'Gastronomie', 'Sport', 'Culture', 'Soirée', 'Plein Air', 'Atelier', 'Jeux'];

  const activeMonthKey = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`;

  // Activities scoped to the currently displayed month (guaranteed unique by ID)
  const monthActivities = React.useMemo(() => {
    const seen = new Set<string>();
    return activities.filter((act) => {
      if (!act?.id || seen.has(act.id)) return false;
      seen.add(act.id);
      const actMonth = act.monthKey || '2026-11';
      return actMonth === activeMonthKey || act.monthKey === 'all';
    });
  }, [activities, activeMonthKey]);

  const filteredActivities = monthActivities.filter((act) => {
    const matchesCategory = selectedCategory === 'all' || act.category === selectedCategory;
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.locationType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;
  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'pending').length;
  const guestProposals = proposals.filter((p) => guestProposalIds.includes(p.id));
  const guestSuggestions = suggestions.filter((s) => guestSuggestionIds.includes(s.id));
  const guestTotalCount = guestProposals.length + guestSuggestions.length;
  const hasAcceptedGuestProposal =
    guestProposals.some((p) => p.status === 'accepted') ||
    guestSuggestions.some((s) => s.status === 'accepted_duo' || s.status === 'converted_to_activity');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Bar following 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand title */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-4 h-4" />
              </span>
              <span>Sorties</span>
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          {isOrganizerUnlocked ? (
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
              <button
                onClick={() => setCurrentView('friend')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'friend' ? 'text-amber-700 font-semibold underline underline-offset-8' : ''
                }`}
              >
                Vue Invités
              </button>
              <button
                onClick={() => {
                  setCurrentView('organizer');
                  setOrganizerTab('calendar');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'organizer' && organizerTab === 'calendar'
                    ? 'text-amber-700 font-semibold underline underline-offset-8'
                    : ''
                }`}
              >
                Planning
              </button>
              <button
                onClick={() => {
                  setCurrentView('organizer');
                  setOrganizerTab('inbox');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'organizer' && organizerTab === 'inbox'
                    ? 'text-amber-700 font-semibold underline underline-offset-8'
                    : ''
                }`}
              >
                <span>Propositions</span>
                {pendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setCurrentView('organizer');
                  setOrganizerTab('suggestions');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'organizer' && organizerTab === 'suggestions'
                    ? 'text-amber-700 font-semibold underline underline-offset-8'
                    : ''
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Suggestions</span>
                {pendingSuggestionsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingSuggestionsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setCurrentView('organizer');
                  setOrganizerTab('activities');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'organizer' && organizerTab === 'activities'
                    ? 'text-amber-700 font-semibold underline underline-offset-8'
                    : ''
                }`}
              >
                Mes Activités ({activities.length})
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{MONTH_NAMES[activeMonth]} {activeYear}</span>
              </span>
              <span>Choix des idées et propositions de créneaux</span>
            </div>
          )}

          {/* Zone 3: 1 Primary Action (Mode Toggle & Copy Link for organizer only) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Guest live request status tracker */}
            {guestTotalCount > 0 && currentView === 'friend' && (
              <button
                type="button"
                onClick={() => setShowGuestProposalsModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Consulter l'état de vos propositions et suggestions"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Mes demandes ({guestTotalCount})</span>
                {hasAcceptedGuestProposal && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Une demande a été validée !" />
                )}
              </button>
            )}

            {/* Share link button ONLY visible to the organizer */}
            {isOrganizerUnlocked && (
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copier le lien pour l'envoyer à vos amis"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Partager aux amis</span>
                  </>
                )}
              </button>
            )}

            {isOrganizerUnlocked ? (
              <div className="flex items-center gap-1.5">
                {googleUser && googleUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                  <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Admin : {ADMIN_EMAIL}</span>
                  </span>
                )}

                <OrganizerNotifications
                  notifications={notifications}
                  onMarkAsRead={handleMarkNotifAsRead}
                  onMarkAllAsRead={handleMarkAllNotifsAsRead}
                  onDeleteNotification={handleDeleteNotif}
                  onClearAll={handleClearAllNotifs}
                  onNavigateToProposal={handleNavigateToProposal}
                />

                <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 inline-flex text-xs font-semibold">
                  <button
                    onClick={() => setCurrentView('friend')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      currentView === 'friend'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Vue Invités
                  </button>
                  <button
                    onClick={() => setCurrentView('organizer')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      currentView === 'organizer'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>Espace Organisateur</span>
                    {pendingCount > 0 && currentView !== 'organizer' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setShowChangePinModal(true)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Modifier votre code PIN secret"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={handleLockOrganizer}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Verrouiller ou se déconnecter"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPinModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Accès réservé à l'organisateur"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Accès Organisateur</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'friend' ? (
          /* ======================================================== */
          /* FRIEND VIEW (Vue Invité pour choisir et proposer)        */
          /* ======================================================== */
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Clean header section with interactive Month Navigation for guests */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Sorties & Activités
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Choisissez une activité pour convenir d'une date et d'un créneau ensemble, ou suggérez votre propre idée.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-2xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  title="Vous avez une envie ou une idée de sortie ? Proposez-la directement à l'organisateur !"
                >
                  <Lightbulb className="w-4 h-4 text-amber-200" />
                  <span>Suggérer une activité</span>
                </button>

                {/* Guest Interactive Month Navigator */}
                <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                  disabled={isAtMinMonth}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={isAtMinMonth ? 'Novembre 2026 est le premier mois disponible' : 'Mois précédent'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={activeMonthKey}
                    onChange={(e) => {
                      const found = guestAvailableMonths.find((m) => m.key === e.target.value);
                      if (found) {
                        handleSetActiveMonth(found.year, found.month);
                      }
                    }}
                    className="bg-amber-50/80 border border-amber-200 text-amber-900 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    {guestAvailableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isAtMinMonth && (
                  <button
                    type="button"
                    onClick={() => handleSetActiveMonth(2026, 10)}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                    title="Revenir à Novembre 2026"
                  >
                    Novembre 2026
                  </button>
                )}

                <span className="text-slate-300 mx-1 hidden sm:inline">|</span>

                <span className="text-xs text-slate-600 font-semibold px-1">
                  {monthActivities.length} idée{monthActivities.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

            {/* Filter & Search Bar (only if activities exist for this month) */}
            {monthActivities.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'all' ? 'Toutes les envies' : cat}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher une idée..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Activities Grid or Empty State */}
            {monthActivities.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Aucune activité proposée pour {MONTH_NAMES[activeMonth]} {activeYear}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  L'organisateur n'a pas encore ajouté d'activités pour ce mois. Vous pouvez changer de mois ci-dessus pour découvrir les activités proposées sur les autres périodes !
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleSetActiveMonth(2026, 10)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Voir les activités de Novembre 2026
                  </button>
                  {isOrganizerUnlocked && (
                    <button
                      onClick={() => {
                        setCurrentView('organizer');
                        setOrganizerTab('activities');
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Ajouter des activités à ce mois
                    </button>
                  )}
                </div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Aucune activité ne correspond à cette recherche.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-amber-700 underline font-medium cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isOrganizerView={false}
                    onSelectForBooking={(act) => setSelectedActivityForBooking(act)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : !isOrganizerUnlocked ? (
          /* ======================================================== */
          /* ORGANIZER LOCKED GATE (Accès Restreint par Code PIN)    */
          /* ======================================================== */
          <div className="max-w-sm mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Accès Organisateur
              </h2>
            </div>
            <form onSubmit={handleGateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-left">
                  Code PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={8}
                    autoFocus
                    placeholder="Code d'accès"
                    value={gatePin}
                    onChange={(e) => {
                      setGatePin(e.target.value);
                      setGateError(false);
                    }}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-center text-base tracking-widest font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      gateError
                        ? 'border-rose-400 ring-2 ring-rose-200 text-rose-700'
                        : 'border-slate-200 focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {gateError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 text-left">
                    Code incorrect.
                  </p>
                )}
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isGateVerifying || !gatePin.trim()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isGateVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <span>Valider</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('friend')}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Retourner à la vue Invités
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ======================================================== */
          /* ORGANIZER VIEW (Espace Gestion & Planning)               */
          /* ======================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Organizer Tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setOrganizerTab('activities')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    organizerTab === 'activities'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Mes Activités ({activities.length})</span>
                </button>

                <button
                  onClick={() => setOrganizerTab('inbox')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    organizerTab === 'inbox'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Boîte de Réception</span>
                  {pendingCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setOrganizerTab('suggestions')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    organizerTab === 'suggestions'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Idées d'invités</span>
                  {pendingSuggestionsCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {pendingSuggestionsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setOrganizerTab('calendar')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    organizerTab === 'calendar'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Emploi du Temps</span>
                </button>

                <button
                  onClick={() => setOrganizerTab('ai-studio')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    organizerTab === 'ai-studio'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Studio IA & Visuels</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChangePinModal(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                  title="Changer votre code PIN secret"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Changer PIN</span>
                </button>

                <button
                  onClick={handleLockOrganizer}
                  className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200"
                  title="Verrouiller la session organisateur"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Verrouiller</span>
                </button>

                <button
                  onClick={() => loadServerData(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Actualiser les données"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Tab Panel */}
            {organizerTab === 'activities' && (
              <div className="space-y-6">
                {activities.length === 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-3">
                    <h3 className="text-base font-bold text-amber-900">
                      Votre catalogue est actuellement vide
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Comme souhaité, aucune fausse proposition n'est chargée : vous commencez à zéro ! Vous pouvez ajouter vos activités personnalisées une par une, ou charger une sélection d'idées si vous voulez gagner du temps.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={handleLoadSuggestions}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Charger des suggestions d'inspiration
                      </button>
                    </div>
                  </div>
                )}

                <OrganizerActivityManager
                  activities={activities}
                  onAddActivity={handleAddActivity}
                  onUpdateActivity={handleUpdateActivity}
                  onDeleteActivity={handleDeleteActivity}
                  onDeleteAllActivities={handleDeleteAllActivities}
                  onResetDefaults={() => setActivities([])}
                  activeYear={activeYear}
                  activeMonth={activeMonth}
                  monthNames={MONTH_NAMES}
                  onChangeActiveMonth={handleSetActiveMonth}
                  onImportActivities={handleImportActivities}
                />
              </div>
            )}

            {organizerTab === 'inbox' && (
              <OrganizerInbox
                proposals={proposals}
                onAcceptProposal={handleAcceptProposal}
                onDeclineProposal={handleDeclineProposal}
                googleToken={googleToken || getStoredAccessToken()}
                onConnectGoogleCalendar={handleConnectGoogleCalendar}
                calendarSyncNotice={calendarSyncNotice}
                onDismissSyncNotice={() => setCalendarSyncNotice(null)}
              />
            )}

            {organizerTab === 'suggestions' && (
              <OrganizerSuggestionsManager
                suggestions={suggestions}
                onConvertToActivity={handleConvertToActivity}
                onAcceptDuo={handleAcceptDuo}
                onCancelDuo={handleCancelDuo}
                onDeclineSuggestion={handleDeclineSuggestion}
                onDeleteSuggestion={handleDeleteSuggestion}
                activeYear={activeYear}
                activeMonth={activeMonth}
              />
            )}

            {organizerTab === 'calendar' && (
              <OrganizerCalendar
                scheduleSlots={scheduleSlots}
                proposals={proposals}
                onRemoveSlot={handleRemoveSlot}
                googleUser={googleUser}
                googleToken={googleToken}
                onGoogleLoginSuccess={handleGoogleLoginSuccess}
                onGoogleLogout={handleGoogleLogout}
                activeTargetMonth={{ year: activeYear, month: activeMonth }}
                onSetActiveTargetMonth={handleSetActiveMonth}
              />
            )}

            {organizerTab === 'ai-studio' && (
              <OrganizerAIStudio
                activities={activities}
                onAddActivity={handleAddActivity}
                onUpdateActivityImage={handleUpdateActivityImage}
              />
            )}
          </div>
        )}
      </main>

      {/* Booking Modal (opened from Friend View) */}
      {selectedActivityForBooking && (
        <BookingModal
          activity={selectedActivityForBooking}
          existingSlots={scheduleSlots}
          onClose={() => setSelectedActivityForBooking(null)}
          onSubmitProposal={(data) => {
            handleCreateProposal(data);
          }}
          onJoinSlot={handleJoinSlot}
          onRemoveSlot={handleRemoveSlot}
          isOrganizer={isOrganizerUnlocked}
          defaultYear={activeYear}
          defaultMonth={activeMonth}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Share2 className="w-4 h-4 text-amber-600" />
                <span>Partager l'application à vos amis</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target month picker */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Mois ciblé pour vos sorties :</span>
                <span className="text-[11px] font-normal text-slate-500">Inclus dans le lien</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={activeMonth}
                  onChange={(e) => handleSetActiveMonth(activeYear, parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => {
                    const isDisabled = activeYear === 2026 && idx < 10;
                    return (
                      <option key={name} value={idx} disabled={isDisabled}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={activeYear}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value, 10);
                    handleSetActiveMonth(yr, activeMonth);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer font-mono"
                >
                  {[2026, 2027, 2028].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Lien public à partager :
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={getPublicShareUrl()}
                  className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 font-mono select-all px-1"
                />
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(getPublicShareUrl());
                    } catch {}
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  {copiedLink ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Sorties · Partagez vos envies et organisez vos sorties entre amis.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('friend')}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Vue Invités
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={() => {
                if (isOrganizerUnlocked) {
                  setCurrentView('organizer');
                  setOrganizerTab('calendar');
                } else {
                  setShowPinModal(true);
                }
              }}
              className="hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              {!isOrganizerUnlocked && <Lock className="w-3 h-3 text-slate-400" />}
              <span>Planning</span>
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={() => {
                if (isOrganizerUnlocked) {
                  setCurrentView('organizer');
                  setOrganizerTab('inbox');
                } else {
                  setShowPinModal(true);
                }
              }}
              className="hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              {!isOrganizerUnlocked && <Lock className="w-3 h-3 text-slate-400" />}
              <span>Propositions {isOrganizerUnlocked && `(${pendingCount})`}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Organizer PIN Modals */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleUnlockSuccess}
        onVerifyPin={handleVerifyPin}
        savedPin={savedPin}
      />

      <ChangePinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        onSavePin={handleChangePinCentralized}
      />

      {/* Guest Proposals & Suggestions Live Tracker Modal */}
      <GuestProposalsModal
        isOpen={showGuestProposalsModal}
        onClose={() => setShowGuestProposalsModal(false)}
        proposals={guestProposals}
        suggestions={guestSuggestions}
        onClearHistory={handleClearGuestProposals}
        onCancelProposal={handleCancelGuestProposal}
      />

      {/* Guest Suggestion Modal */}
      <SuggestActivityModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onSubmitSuggestion={handleCreateSuggestion}
        currentMonthKey={activeMonthKey}
      />
    </div>
  );
}
