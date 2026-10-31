import React, { useState, useEffect } from 'react';
import { Activity, Proposal, ScheduleSlot, AppView, OrganizerTab } from './types';
import { INITIAL_ACTIVITIES } from './data/defaultActivities';
import { ActivityCard } from './components/ActivityCard';
import { BookingModal } from './components/BookingModal';
import { OrganizerInbox } from './components/OrganizerInbox';
import { OrganizerCalendar } from './components/OrganizerCalendar';
import { OrganizerActivityManager } from './components/OrganizerActivityManager';
import { OrganizerAIStudio } from './components/OrganizerAIStudio';
import {
  Clock,
  Sparkles,
  Calendar,
  Inbox,
  LayoutGrid,
  Search,
  CheckCircle2,
  Share2,
  Check,
  Plus,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
  KeyRound,
  X,
} from 'lucide-react';
import { PinModal, ChangePinModal } from './components/PinModal';
import { initAuth, logoutGoogle } from './services/calendarService';
import { User as FirebaseUser } from 'firebase/auth';

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
  const [isLoading, setIsLoading] = useState(true);

  // Modal & filter state
  const [selectedActivityForBooking, setSelectedActivityForBooking] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Google Calendar Auth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Target planning month chosen by the organizer (or loaded via ?m=YYYY-MM)
  const [activeYear, setActiveYear] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      if (mParam && /^\d{4}-\d{2}$/.test(mParam)) {
        return parseInt(mParam.split('-')[0], 10);
      }
      const saved = localStorage.getItem('rdv_target_year');
      if (saved) return parseInt(saved, 10);
    }
    return new Date().getFullYear();
  });

  const [activeMonth, setActiveMonth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      if (mParam && /^\d{4}-\d{2}$/.test(mParam)) {
        const m = parseInt(mParam.split('-')[1], 10) - 1;
        if (m >= 0 && m <= 11) return m;
      }
      const saved = localStorage.getItem('rdv_target_month');
      if (saved) return parseInt(saved, 10);
    }
    return new Date().getMonth();
  });

  const handleSetActiveMonth = (year: number, month: number) => {
    setActiveYear(year);
    setActiveMonth(month);
    localStorage.setItem('rdv_target_year', String(year));
    localStorage.setItem('rdv_target_month', String(month));
    const url = new URL(window.location.href);
    url.searchParams.set('m', `${year}-${String(month + 1).padStart(2, '0')}`);
    window.history.replaceState({}, '', url.toString());
  };

  // Organizer Security (PIN protection)
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
  const [newPinInput, setNewPinInput] = useState('');
  const [gatePin, setGatePin] = useState('');
  const [gateError, setGateError] = useState(false);

  const handleUnlockSuccess = () => {
    setIsOrganizerUnlocked(true);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    setCurrentView('organizer');
    setShowPinModal(false);
    setGatePin('');
    setGateError(false);
  };

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gatePin === savedPin) {
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

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length >= 4) {
      setSavedPin(newPinInput.trim());
      localStorage.setItem(STORAGE_KEY_PIN, newPinInput.trim());
      setShowChangePinModal(false);
      setNewPinInput('');
    }
  };

  // Fetch initial data with automatic fallback for static hosts (Vercel)
  const loadServerData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivities(data.activities && data.activities.length > 0 ? data.activities : INITIAL_ACTIVITIES);
          setProposals(data.proposals || []);
          setScheduleSlots(data.scheduleSlots || []);
          return;
        }
      }
      throw new Error('API unreachable');
    } catch {
      // Offline / Vercel static fallback
      const savedActs = localStorage.getItem('rdv_nov_activities');
      setActivities(savedActs ? JSON.parse(savedActs) : INITIAL_ACTIVITIES);

      const savedProps = localStorage.getItem('rdv_nov_proposals');
      setProposals(savedProps ? JSON.parse(savedProps) : []);

      const savedSlots = localStorage.getItem('rdv_nov_slots');
      setScheduleSlots(savedSlots ? JSON.parse(savedSlots) : []);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    loadServerData();
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleGoogleLoginSuccess = (user: FirebaseUser, token: string) => {
    setGoogleUser(user);
    setGoogleToken(token);
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleToken(null);
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
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.proposal) {
          setProposals((prev) => [resData.proposal, ...prev]);
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      // Fallback local creation
      const localProp: Proposal = {
        ...data,
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setProposals((prev) => [localProp, ...prev]);
    }
  };

  // Accept a proposal (organizer)
  const handleAcceptProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProposals((prev) =>
            prev.map((p) => (p.id === proposalId ? { ...p, status: 'accepted' as const } : p))
          );
          if (data.scheduleSlots) {
            setScheduleSlots(data.scheduleSlots);
          }
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      // Fallback local accept
      const prop = proposals.find((p) => p.id === proposalId);
      if (prop) {
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? { ...p, status: 'accepted' as const } : p))
        );
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
      }
    }
  };

  // Decline a proposal (organizer)
  const handleDeclineProposal = async (proposalId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProposals((prev) =>
            prev.map((p) =>
              p.id === proposalId ? { ...p, status: 'declined' as const, declineReason: reason } : p
            )
          );
          if (data.scheduleSlots) {
            setScheduleSlots(data.scheduleSlots);
          }
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: 'declined' as const, declineReason: reason } : p
        )
      );
      setScheduleSlots((prev) => prev.filter((s) => s.proposalId !== proposalId));
    }
  };

  // Remove a schedule slot (organizer)
  const handleRemoveSlot = async (date: string, slot: string) => {
    try {
      const res = await fetch(`/api/slots?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.scheduleSlots) {
          setScheduleSlots(data.scheduleSlots);
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      setScheduleSlots((prev) => prev.filter((s) => !(s.date === date && s.slot === slot)));
    }
  };

  // Add activity (organizer)
  const handleAddActivity = async (newAct: Omit<Activity, 'id'>) => {
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAct),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.activity) {
          setActivities((prev) => [data.activity, ...prev]);
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      const localAct: Activity = {
        ...newAct,
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setActivities((prev) => [localAct, ...prev]);
    }
  };

  // Update activity (organizer)
  const handleUpdateActivity = async (updated: Activity) => {
    try {
      const res = await fetch(`/api/activities/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.activity) {
          setActivities((prev) => prev.map((a) => (a.id === updated.id ? data.activity : a)));
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    }
  };

  // Delete activity (organizer)
  const handleDeleteActivity = async (id: string) => {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivities((prev) => prev.filter((a) => a.id !== id));
          return;
        }
      }
      throw new Error('API offline');
    } catch {
      setActivities((prev) => prev.filter((a) => a.id !== id));
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

  const filteredActivities = activities.filter((act) => {
    const matchesCategory = selectedCategory === 'all' || act.category === selectedCategory;
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.locationType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;

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
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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

          {/* Zone 3: 1 Primary Action (Mode Toggle & Copy Link) */}
          <div className="flex items-center gap-2 shrink-0">
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

            {isOrganizerUnlocked ? (
              <div className="flex items-center gap-1.5">
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
                  title="Verrouiller l'espace organisateur"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Verrouiller</span>
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
            {/* Clean header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Planning de {MONTH_NAMES[activeMonth]} {activeYear}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                  Sorties & Activités
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Choisissez une activité pour convenir d'une date et d'un créneau ensemble.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 font-medium shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{activities.length} idée{activities.length > 1 ? 's' : ''} disponible{activities.length > 1 ? 's' : ''}</span>
                </span>
                {isOrganizerUnlocked && (
                  <button
                    onClick={() => {
                      setCurrentView('organizer');
                      setOrganizerTab('calendar');
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-4 cursor-pointer"
                  >
                    Changer de mois
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Bar (only if activities exist) */}
            {activities.length > 0 && (
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
            {activities.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  La liste est en cours de préparation !
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Les activités sont en train d'être préparées.
                  Revenez très bientôt ou basculez sur l'Espace Organisateur pour ajouter les premières propositions.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setCurrentView('organizer');
                      setOrganizerTab('activities');
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Ajouter mes premières activités
                  </button>
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
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Valider
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
                  onClick={loadServerData}
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
                  onResetDefaults={() => setActivities([])}
                />
              </div>
            )}

            {organizerTab === 'inbox' && (
              <OrganizerInbox
                proposals={proposals}
                onAcceptProposal={handleAcceptProposal}
                onDeclineProposal={handleDeclineProposal}
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
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  value={activeYear}
                  onChange={(e) => handleSetActiveMonth(parseInt(e.target.value, 10), activeMonth)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer font-mono"
                >
                  {[activeYear - 1, activeYear, activeYear + 1, activeYear + 2].map((yr) => (
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
        savedPin={savedPin}
      />

      <ChangePinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        onSave={(newPin) => {
          setSavedPin(newPin);
          localStorage.setItem(STORAGE_KEY_PIN, newPin);
        }}
        currentPin={savedPin}
      />
    </div>
  );
}
