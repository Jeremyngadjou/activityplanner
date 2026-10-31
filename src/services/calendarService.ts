import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SlotType } from '../types';

export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Safe Firebase App and Auth initialization
let app: any = null;
let auth: any = null;
let provider: any = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.warn('Firebase Auth non initialisé (mode hors-ligne ou configuration restreinte):', e);
}

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth Listener safely
export const initAuth = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  if (!auth) {
    onFailure();
    return () => {};
  }

  try {
    return onAuthStateChanged(auth, async (user) => {
      if (user && cachedAccessToken) {
        onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onFailure();
      }
    });
  } catch (err) {
    console.warn('Error in onAuthStateChanged:', err);
    onFailure();
    return () => {};
  }
};

// Sign in with Google Popup
export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('Google Calendar Auth n’est pas disponible sur cet appareil.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Impossible de récupérer le jeton d’accès Google Calendar');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async () => {
  if (auth) {
    try {
      await signOut(auth);
    } catch {}
  }
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Helper to calculate exact start and end times
const getSlotDateTime = (date: string, slot: SlotType) => {
  switch (slot) {
    case 'morning':
      return {
        start: `${date}T09:00:00`,
        end: `${date}T12:30:00`,
      };
    case 'afternoon':
      return {
        start: `${date}T14:00:00`,
        end: `${date}T18:30:00`,
      };
    case 'evening':
    default:
      return {
        start: `${date}T19:00:00`,
        end: `${date}T23:30:00`,
      };
  }
};

// Create a real Google Calendar Event
export const addEventToGoogleCalendar = async (
  token: string,
  event: {
    title: string;
    friendName: string;
    date: string;
    slot: SlotType;
    note?: string;
    location?: string;
  }
) => {
  const { start, end } = getSlotDateTime(event.date, event.slot);

  const eventPayload = {
    summary: `${event.title} (avec ${event.friendName})`,
    description: `Activité organisée via Rendez-Vous Novembre avec ${event.friendName}.${
      event.note ? `\n\nMot de ${event.friendName} : « ${event.note} »` : ''
    }`,
    location: event.location || undefined,
    start: {
      dateTime: `${start}:00`,
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: `${end}:00`,
      timeZone: 'Europe/Paris',
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erreur lors de la création de l’événement sur Google Calendar.');
  }

  return await response.json();
};
