import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth, ADMIN_EMAIL } from '../firebase';
import { SlotType } from '../types';

export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

let provider: any = null;
try {
  provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.warn('Firebase Auth provider non initialisé:', e);
}

const STORAGE_KEY_GOOGLE_TOKEN = 'rdv_google_cal_token';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const storeAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_GOOGLE_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_GOOGLE_TOKEN);
    }
  } catch {}
};

export const getStoredAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GOOGLE_TOKEN);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {}
  return null;
};

// Initialize Auth Listener safely with token restoration
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
      const token = getStoredAccessToken();
      if (user && token) {
        onSuccess(user, token);
      } else if (user) {
        // User logged in via Firebase Auth, pass token if found or empty string
        onSuccess(user, token || '');
      } else if (!isSigningIn) {
        storeAccessToken(null);
        onFailure();
      }
    });
  } catch (err) {
    console.warn('Error in onAuthStateChanged:', err);
    onFailure();
    return () => {};
  }
};

// Sign in with Google Popup and persist access token
export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('Google Calendar Auth n’est pas disponible sur cet appareil.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Impossible de récupérer le jeton d’accès Google Calendar. Veuillez autoriser l’accès à votre agenda.');
    }

    storeAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    if (
      error?.code === 'auth/unauthorized-domain' ||
      (error?.message && error.message.includes('unauthorized-domain'))
    ) {
      throw new Error(
        `Le domaine ${typeof window !== 'undefined' ? window.location.hostname : 'Vercel'} n'est pas encore autorisé dans Firebase Console (Authentication > Paramètres > Domaines autorisés).`
      );
    }
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
  storeAccessToken(null);
};

export const getAccessToken = (): string | null => {
  return getStoredAccessToken();
};

// Helper to calculate exact start and end times
export const getSlotDateTime = (date: string, slot: SlotType) => {
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

// Generate direct Google Calendar 1-click web URL (works without any OAuth or login required!)
export const createGoogleCalendarWebUrl = (event: {
  title: string;
  friendName: string;
  date: string;
  slot: SlotType;
  note?: string;
  location?: string;
}): string => {
  const { start, end } = getSlotDateTime(event.date, event.slot);
  // Basic ISO format for Google Calendar: YYYYMMDDTHHmmss
  const cleanStart = start.replace(/[-:]/g, '');
  const cleanEnd = end.replace(/[-:]/g, '');
  const title = encodeURIComponent(`${event.title} (avec ${event.friendName})`);
  const details = encodeURIComponent(
    `Activité : ${event.title}\nParticipant : ${event.friendName}${
      event.note ? `\nNote : « ${event.note} »` : ''
    }\nOrganisé via Sorties.`
  );
  const loc = event.location ? `&location=${encodeURIComponent(event.location)}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${cleanStart}/${cleanEnd}&ctz=Europe/Paris&details=${details}${loc}`;
};

// Create a real Google Calendar Event via API
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
    description: `Activité organisée via Sorties avec ${event.friendName}.${
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

  if (response.status === 401) {
    storeAccessToken(null);
    throw new Error('Jeton Google Calendar expiré. Veuillez vous reconnecter.');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erreur lors de la création de l’événement sur Google Calendar.');
  }

  return await response.json();
};
