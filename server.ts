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
const port = parseInt(process.env.PORT || '3000', 10);

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
interface AppStore {
  activities: any[];
  proposals: any[];
  scheduleSlots: any[];
}

const readStore = async (): Promise<AppStore> => {
  try {
    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    const defaultData: AppStore = { activities: [], proposals: [], scheduleSlots: [] };
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
    res.json({ success: true, ...store });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new activity (organizer)
app.post('/api/activities', async (req, res) => {
  try {
    const store = await readStore();
    const newActivity = {
      ...req.body,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    store.activities.unshift(newActivity);
    await writeStore(store);
    res.json({ success: true, activity: newActivity });
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
    await writeStore(store);
    res.json({ success: true, proposal: newProposal });
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

    await writeStore(store);
    res.json({ success: true, proposal, scheduleSlots: store.scheduleSlots });
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
    const empty: AppStore = { activities: [], proposals: [], scheduleSlots: [] };
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
      server: { middlewareMode: true },
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
