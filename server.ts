import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portArgIdx = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const val = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 3000;
}

const port = resolvePort();

// Resolve data directory safely (works both from root and from dist/)
const dataDir = fs.existsSync(path.join(__dirname, 'data'))
  ? path.join(__dirname, 'data')
  : path.resolve(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DATA_FILE = path.join(dataDir, 'store.json');

app.use(express.json({ limit: '10mb' }));

// Helper to safely read and write store data
interface AppNotification {
  id: string;
  type: 'proposal_received' | 'proposal_accepted' | 'proposal_declined' | 'system';
  title: string;
  message: string;
  proposalId?: string;
  friendName?: string;
  activityTitle?: string;
  date?: string;
  slot?: string;
  createdAt: string;
  read: boolean;
}

interface AppStore {
  organizerPin: string;
  settings: {
    targetYear: number;
    targetMonth: number;
  };
  activities: any[];
  proposals: any[];
  scheduleSlots: any[];
  notifications: AppNotification[];
  suggestions: any[];
}

const readStore = async (): Promise<AppStore> => {
  const defaultData: AppStore = {
    organizerPin: '1126',
    settings: {
      targetYear: 2026,
      targetMonth: 10, // Novembre 2026 (starting month)
    },
    activities: [],
    proposals: [],
    scheduleSlots: [],
    notifications: [],
    suggestions: [],
  };

  try {
    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const settings = parsed.settings || defaultData.settings;
    if (
      typeof settings.targetYear !== 'number' ||
      typeof settings.targetMonth !== 'number' ||
      settings.targetYear < 2026 ||
      (settings.targetYear === 2026 && settings.targetMonth < 10)
    ) {
      settings.targetYear = 2026;
      settings.targetMonth = 10;
    }

    return {
      organizerPin: parsed.organizerPin || '1126',
      settings,
      activities: parsed.activities || [],
      proposals: parsed.proposals || [],
      scheduleSlots: parsed.scheduleSlots || [],
      notifications: parsed.notifications || [],
      suggestions: parsed.suggestions || [],
    };
  } catch (err) {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
};

const writeStore = async (data: AppStore): Promise<void> => {
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// Helper to get GoogleGenAI instance safely
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// ==========================================
// DATA REST APIS (Multi-device shared store)
// ==========================================

// GET all shared data
app.get('/api/data', async (_req, res) => {
  try {
    const store = await readStore();
    const seen = new Set<string>();
    const uniqueActivities = store.activities.filter((a: any) => {
      if (!a?.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    res.json({
      success: true,
      activities: uniqueActivities,
      proposals: store.proposals,
      scheduleSlots: store.scheduleSlots,
      notifications: store.notifications,
      settings: store.settings,
      suggestions: store.suggestions || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized PIN verification (organizer login from any device)
app.post('/api/auth/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    const store = await readStore();
    const isValid = String(pin || '').trim() === String(store.organizerPin || '1126').trim();
    res.json({ success: true, valid: isValid });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized PIN change (synchronized across all devices)
app.post('/api/auth/change-pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const store = await readStore();
    if (String(currentPin || '').trim() !== String(store.organizerPin || '1126').trim()) {
      return res.status(400).json({ success: false, error: "L'ancien code PIN est incorrect." });
    }
    const cleanNewPin = String(newPin || '').trim();
    if (cleanNewPin.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Le nouveau code doit contenir au moins 4 caractères.',
      });
    }

    store.organizerPin = cleanNewPin;
    store.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'system',
      title: 'Sécurité mise à jour',
      message: 'Le code PIN organisateur a été mis à jour et synchronisé sur tous vos appareils.',
      createdAt: new Date().toISOString(),
      read: false,
    });

    await writeStore(store);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized Settings (target month/year synchronized)
app.put('/api/settings', async (req, res) => {
  try {
    const { targetYear, targetMonth } = req.body;
    const store = await readStore();
    if (typeof targetYear === 'number') store.settings.targetYear = targetYear;
    if (typeof targetMonth === 'number') store.settings.targetMonth = targetMonth;
    await writeStore(store);
    res.json({ success: true, settings: store.settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new activity (organizer)
app.post('/api/activities', async (req, res) => {
  try {
    const store = await readStore();
    const newActivity = {
      monthKey: req.body.monthKey || '2026-11',
      ...req.body,
      id: req.body.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    if (!store.activities.some((a: any) => a.id === newActivity.id)) {
      store.activities.unshift(newActivity);
      await writeStore(store);
    }
    res.json({ success: true, activity: newActivity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST import activities from JSON (organizer)
app.post('/api/activities/import', async (req, res) => {
  try {
    const { monthKey, activities: incomingActivities, mode = 'merge' } = req.body;
    if (!Array.isArray(incomingActivities)) {
      return res.status(400).json({
        success: false,
        error: "Format JSON invalide : un tableau 'activities' est requis.",
      });
    }

    const cleanMonthKey = monthKey || '2026-11';
    const store = await readStore();

    const formattedActivities = incomingActivities.map((item: any, idx: number) => ({
      ...item,
      id: item.id || `act-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      title: String(item.title || 'Activité sans titre').trim(),
      description: String(item.description || '').trim(),
      category: item.category || 'Gastronomie',
      duration: item.duration || '2h',
      locationType: item.locationType || 'En ville',
      energyLevel: item.energyLevel || 'Modéré',
      accentGradient: item.accentGradient || 'from-amber-600 via-orange-500 to-amber-700',
      iconName: item.iconName || item.category || 'Calendar',
      monthKey: item.monthKey || cleanMonthKey,
      isOrganizerCustom: true,
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    if (mode === 'replace') {
      store.activities = store.activities.filter(
        (a) => (a.monthKey || '2026-11') !== cleanMonthKey
      );
    }

    store.activities = [...formattedActivities, ...store.activities];

    store.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'system',
      title: 'Import JSON réussi',
      message: `${formattedActivities.length} activité(s) importée(s) pour le mois ${cleanMonthKey}.`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    await writeStore(store);
    res.json({ success: true, activities: store.activities, count: formattedActivities.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update an activity (organizer)
app.put('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    const index = store.activities.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Activité non trouvée' });
    }
    store.activities[index] = { ...store.activities[index], ...req.body };
    await writeStore(store);
    res.json({ success: true, activity: store.activities[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE an activity (organizer)
app.delete('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    store.activities = store.activities.filter((a) => a.id !== id);
    await writeStore(store);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE activities in bulk (current month or all)
app.post('/api/activities/delete-bulk', async (req, res) => {
  try {
    const { scope, monthKey } = req.body;
    const store = await readStore();
    const initialCount = store.activities.length;
    if (scope === 'current' && monthKey) {
      store.activities = store.activities.filter((a) => (a.monthKey || '2026-11') !== monthKey);
    } else {
      store.activities = [];
    }
    const deletedCount = initialCount - store.activities.length;
    await writeStore(store);
    res.json({ success: true, deletedCount, remainingCount: store.activities.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST submit a proposal (friend / participant)
app.post('/api/proposals', async (req, res) => {
  try {
    const store = await readStore();
    const newProposal = {
      ...req.body,
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    store.proposals.unshift(newProposal);

    // Create centralized notification for organizer
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'proposal_received',
      title: 'Nouvelle proposition',
      message: `${newProposal.friendName || 'Un ami'} a proposé : ${newProposal.activityTitle || 'Activité'}`,
      proposalId: newProposal.id,
      friendName: newProposal.friendName,
      activityTitle: newProposal.activityTitle,
      date: newProposal.date,
      slot: newProposal.slot,
      createdAt: new Date().toISOString(),
      read: false,
    };
    store.notifications.unshift(notif);
    if (store.notifications.length > 100) {
      store.notifications = store.notifications.slice(0, 100);
    }

    await writeStore(store);
    res.json({ success: true, proposal: newProposal, notification: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST accept a proposal (organizer)
app.post('/api/proposals/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    const proposal = store.proposals.find((p) => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposition introuvable' });
    }

    proposal.status = 'accepted';

    // Remove any previous slot on same date & time slot
    store.scheduleSlots = store.scheduleSlots.filter(
      (s) => !(s.date === proposal.date && s.slot === proposal.slot)
    );

    // Add new slot
    store.scheduleSlots.push({
      date: proposal.date,
      slot: proposal.slot,
      proposalId: proposal.id,
      activityId: proposal.activityId,
      activityTitle: proposal.activityTitle,
      friendName: proposal.friendName,
      note: proposal.note,
    });

    // Mark corresponding notification as read
    const notif = store.notifications.find((n) => n.proposalId === id);
    if (notif) notif.read = true;

    await writeStore(store);
    res.json({ success: true, proposal, scheduleSlots: store.scheduleSlots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST decline a proposal (organizer)
app.post('/api/proposals/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const store = await readStore();
    const proposal = store.proposals.find((p) => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposition introuvable' });
    }

    proposal.status = 'declined';
    proposal.declineReason = reason || undefined;

    // Remove from schedule slots if it was previously accepted
    store.scheduleSlots = store.scheduleSlots.filter((s) => s.proposalId !== id);

    // Mark corresponding notification as read
    const notif = store.notifications.find((n) => n.proposalId === id);
    if (notif) notif.read = true;

    await writeStore(store);
    res.json({ success: true, proposal, scheduleSlots: store.scheduleSlots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST join an existing schedule slot (group activity participation)
app.post('/api/slots/join', async (req, res) => {
  try {
    const { date, slot, participant } = req.body;
    const store = await readStore();
    const existing = store.scheduleSlots.find((s: any) => s.date === date && s.slot === slot);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' });
    }

    if (!Array.isArray(existing.participants)) {
      existing.participants = [];
    }

    const newPart = {
      name: String(participant.name || '').trim(),
      contact: participant.contact ? String(participant.contact).trim() : undefined,
      note: participant.note ? String(participant.note).trim() : undefined,
      joinedAt: new Date().toISOString(),
    };
    existing.participants.push(newPart);

    store.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'proposal_received',
      title: `${newPart.name} a rejoint une sortie`,
      message: `${newPart.name} s'est joint à la sortie « ${existing.activityTitle} » avec ${existing.friendName} le ${date}`,
      activityTitle: existing.activityTitle,
      friendName: newPart.name,
      date,
      slot,
      createdAt: new Date().toISOString(),
      read: false,
    });

    await writeStore(store);
    res.json({ success: true, slot: existing, scheduleSlots: store.scheduleSlots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Activity suggestions endpoints
app.post('/api/suggestions', async (req, res) => {
  try {
    const store = await readStore();
    if (!Array.isArray(store.suggestions)) store.suggestions = [];

    const newSuggestion = {
      ...req.body,
      id: req.body.id || `sug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: req.body.status || 'pending',
      createdAt: req.body.createdAt || new Date().toISOString(),
    };
    store.suggestions.unshift(newSuggestion);

    // Create organizer notification
    store.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'system',
      title: 'Nouvelle idée d’activité suggérée',
      message: `${newSuggestion.suggestedBy} a suggéré l’activité : « ${newSuggestion.title} ».`,
      activityTitle: newSuggestion.title,
      friendName: newSuggestion.suggestedBy,
      createdAt: new Date().toISOString(),
      read: false,
    });

    await writeStore(store);
    res.json({ success: true, suggestion: newSuggestion });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/suggestions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, extraFields } = req.body;
    const store = await readStore();
    if (!Array.isArray(store.suggestions)) store.suggestions = [];

    const found = store.suggestions.find((s) => s.id === id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Suggestion introuvable' });
    }

    if (status) found.status = status;
    if (adminNote !== undefined) found.adminNote = adminNote;
    if (extraFields && typeof extraFields === 'object') {
      Object.assign(found, extraFields);
    }

    await writeStore(store);
    res.json({ success: true, suggestion: found });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    if (!Array.isArray(store.suggestions)) store.suggestions = [];
    store.suggestions = store.suggestions.filter((s) => s.id !== id);
    await writeStore(store);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized Notifications endpoints
app.get('/api/notifications', async (_req, res) => {
  try {
    const store = await readStore();
    res.json({ success: true, notifications: store.notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    const notif = store.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      await writeStore(store);
    }
    res.json({ success: true, notifications: store.notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/read-all', async (_req, res) => {
  try {
    const store = await readStore();
    store.notifications.forEach((n) => (n.read = true));
    await writeStore(store);
    res.json({ success: true, notifications: store.notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readStore();
    store.notifications = store.notifications.filter((n) => n.id !== id);
    await writeStore(store);
    res.json({ success: true, notifications: store.notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/clear', async (_req, res) => {
  try {
    const store = await readStore();
    store.notifications = [];
    await writeStore(store);
    res.json({ success: true, notifications: [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a schedule slot
app.delete('/api/slots', async (req, res) => {
  try {
    const { date, slot } = req.query;
    const store = await readStore();
    store.scheduleSlots = store.scheduleSlots.filter(
      (s) => !(s.date === date && s.slot === slot)
    );
    await writeStore(store);
    res.json({ success: true, scheduleSlots: store.scheduleSlots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reset/clear all data (if organizer wants complete wipe)
app.post('/api/clear-all', async (_req, res) => {
  try {
    const empty: AppStore = {
      organizerPin: '1126',
      settings: {
        targetYear: new Date().getFullYear(),
        targetMonth: new Date().getMonth(),
      },
      activities: [],
      proposals: [],
      scheduleSlots: [],
      notifications: [],
      suggestions: [],
    };
    await writeStore(empty);
    res.json({ success: true, ...empty });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// GEMINI AI APIS
// ==========================================

// API: Suggest activities with Gemini
app.post('/api/generate-activity', async (req, res) => {
  try {
    const { theme = 'general', count = 3 } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.status(200).json({
        success: true,
        activities: [
          {
            title: `Session ${theme} & Découverte`,
            description: `Une super expérience conviviale axée sur le thème ${theme} pour partager un moment unique en novembre.`,
            category: 'Sortie',
            duration: '2h30',
            energyLevel: 'Modéré',
            locationType: 'Centre-ville',
            bestSlots: ['afternoon', 'evening'],
          },
        ],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Tu es un créateur d'expériences et sorties sociales pour novembre en France.
Génère ${count} idées d'activités captivantes, chaleureuses et concrètes basées sur le thème suivant : "${theme}".
Pour chaque activité, fournis un titre accrocheur, une description chaleureuse (2-3 phrases), la catégorie (ex: Gastronomie, Sport, Culture, Soirée, Détente, Atelier, Insolite), la durée estimée (ex: "2h", "Demi-journée"), le niveau d'énergie ("Détente", "Modéré", "Intense"), le type de lieu (ex: "En intérieur", "Plein air", "Bar/Resto") et les moments idéaux en novembre ("morning", "afternoon", "evening").`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              duration: { type: Type.STRING },
              energyLevel: { type: Type.STRING },
              locationType: { type: Type.STRING },
              bestSlots: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'description', 'category', 'duration', 'energyLevel', 'locationType'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    return res.json({ success: true, activities: parsed });
  } catch (error: any) {
    console.error('Error generating activities:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur lors de la génération des activités',
    });
  }
});

// API: Generate image with Gemini (gemini-3-pro-image-preview or nano banana)
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = '4:3',
      imageSize = '1K',
      model = 'gemini-3-pro-image-preview',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt requis' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: "Clé API Gemini non configurée sur le serveur.",
      });
    }

    const chosenModel = model || 'gemini-3-pro-image-preview';

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: {
        parts: [
          {
            text: `High quality photograph or artwork for: ${prompt}. Atmospheric autumn/cozy warm ambiance, aesthetic lighting, depth of field.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any,
        },
      },
    });

    let imageUrl: string | null = null;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(422).json({
        success: false,
        error: 'Aucune image générée par le modèle pour ce prompt.',
      });
    }

    return res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de la génération de l'image.",
    });
  }
});

// API: Polish Activity Description & Pitch
app.post('/api/enhance-pitch', async (req, res) => {
  try {
    const { title, notes } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        success: true,
        pitch: `Qui est chaud pour ${title} ce mois-ci ? Super occasion de se retrouver et passer un moment inoubliable !`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Tu rédiges une accroche amicale et entraînante pour une activité proposée à des amis en novembre.
Titre de l'activité: "${title}".
Notes/Détails: "${notes || ''}".
Génère un court paragraphe (2-3 phrases) percutant, chaleureux, style "qui est chaud pour... ?", en français naturel.`,
    });

    return res.json({
      success: true,
      pitch: response.text?.trim() || '',
    });
  } catch (error: any) {
    console.error('Error enhancing pitch:', error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Robust resolution of distPath whether running from root (/app/applet) or from dist/
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.resolve(__dirname, 'dist');

    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[dev-server] Port ${port} is in use; waiting for existing process to release...`);
    } else {
      console.error('[dev-server] Server error:', err);
    }
  });
}

startServer();
