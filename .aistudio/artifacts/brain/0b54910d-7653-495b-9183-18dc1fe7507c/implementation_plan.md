# Rendez-Vous Novembre — Partage d'Activités & Planning Collaboratif

Une plateforme conviviale et élégante permettant à vos proches de choisir les activités qu'ils souhaitent découvrir avec vous en novembre et de poser leurs créneaux préférés (matinée, après-midi, soirée), que vous validez ou refusez directement dans votre emploi du temps interactif.

## Décisions Clés & Retours Utilisateur

> [!IMPORTANT]
> Les choix suivants ont été confirmés lors de la phase de cadrage :
> - **Gestion du catalogue** : Liste personnalisable à 100% que vous configurez vous-même selon vos envies (avec suggestions prêtes à l'emploi et générateur d'idées/visuels IA).
> - **Accès & Navigation** : Bascule fluide et intuitive intégrée entre la **Vue Ami** (sélection d'activités, choix du jour en novembre et du moment) et la **Vue Organisateur** (boîte de réception des demandes, acceptation/refus, planning du mois et gestion du catalogue).
> - **Disponibilité totale en novembre** : Comme vous êtes totalement disponible sur ce mois, vos proches sont libres de choisir n'importe quel jour de novembre ainsi que leur moment de prédilection (matin, après-midi ou soirée).
> - **IA Gemini & Génération d'images** : Génération de visuels d'activités haute qualité (gemini-3-pro-image-preview / nano banana avec sélecteur de format 1:1, 4:3, 16:9 et résolutions 1K, 2K, 4K) et suggestions intelligentes d'activités via Gemini (gemini-3.8-flash).

---

## 1. Vue d'Ensemble & Concept

- **Fonctionnement global** :
  1. **Vue Ami** : Vos proches découvrent les activités que vous avez envie d'expérimenter (sports, restos insolites, expos, ateliers créatifs, escape games, etc.), filtrent par catégorie ou durée, sélectionnent celle(s) qui les chauffent, choisissent un jour précis sur le calendrier de novembre 2026 et un moment de la journée (matin, après-midi, soirée), laissent leur prénom et un petit mot sympa, puis envoient leur proposition.
  2. **Vue Organisateur** : Vous recevez les demandes dans un centre de propositions avec statut (*En attente*, *Acceptée*, *Refusée*).
  3. **Gestion d'Emploi du Temps** : Dès qu'une proposition est acceptée, elle s'insère automatiquement dans votre calendrier de novembre sur le créneau correspondant. Si plusieurs personnes sont chaudes pour une même activité ou le même créneau, vous pouvez accepter un groupe ou arbitrer facilement.
  4. **Gestionnaire d'Activités & Studio IA** : Vous pouvez ajouter de nouvelles activités en un clic, modifier les existantes, et générer des cartes avec de superbes visuels IA et des résumés accrocheurs.
- **Public cible** : Votre cercle d'amis, collègues et proches qui souhaitent partager des moments forts avec vous sans friction d'organisation.
- **Bénéfice principal** : Fini les discussions interminables sur WhatsApp pour savoir « qui est chaud pour faire quoi et quand » : vos envies sont visibles, vos amis se positionnent, et votre mois de novembre se remplit de sorties mémorables !

---

## 2. Expérience Utilisateur & Design Visuel

### Parcours Utilisateur
- **Parcours Ami** :
  - **Accueil & Présentation chaleureuse** : Message d'accueil personnalisé invitant à profiter du mois de novembre ensemble.
  - **Exploration du catalogue** : Cartes visuelles soignées avec titre, description, durée estimée, niveau d'énergie/ambiance, et badge de catégorie.
  - **Modal de réservation simple en 3 étapes** :
    1. Sélection de l'activité (ou sélection multiple).
    2. Choix de la date sur le calendrier interactif de novembre (du 1er au 30 novembre) + choix du créneau horaire : **Matinée** (9h - 12h), **Après-midi** (14h - 18h), **Soirée** (19h - 23h).
    3. Coordonnées de l'ami (Prénom, pseudo/téléphone facultatif, petit message / motivation).
  - **Confirmation instantanée** : Écran de confirmation avec récapitulatif stylisé et message de remerciement.

- **Parcours Organisateur** :
  - **Barre d'outils supérieure discrète** : Bouton de bascule en mode Organisateur avec indicateur des demandes en attente.
  - **Onglet Planning de Novembre** : Calendrier mensuel interactif affichant les créneaux occupés, les activités confirmées, le prénom de l'ami, et les créneaux encore libres.
  - **Onglet Boîte de Réception** : Liste filtrable des demandes reçues avec détails complets (activité, date, créneau, ami, message), avec boutons d'action clairs **Accepter** (avec mise au planning) et **Refuser** (avec motif facultatif).
  - **Onglet Mes Activités & Studio IA** : Formulaire pour créer/éditer des activités, générateur de prompts d'activités via Gemini, et module de génération d'affiches/photos avec choix du ratio (1:1, 4:3, 16:9, etc.) et de la résolution (1K, 2K, 4K).

### Identité Visuelle & Direction Artistique
- **Ambiance & Palette** :
  - Style chaleureux d'automne / début d'hiver : fond neutre doux (`#FBFBFB` / `#F8FAFC`), surfaces épurées (`#FFFFFF`), bordures subtiles (`#E2E8F0`), et accents chaleureux terracotta/ambre (`#EA580C`, `#D97706`) associés à un bleu ardoise profond (`#0F172A`) pour les textes et contrastes.
- **Typographie** :
  - Titres et affiches : *Plus Jakarta Sans* / *Outfit* (chaleureux, moderne, accueillant).
  - Corps de texte et détails : *DM Sans* pour une lisibilité parfaite sur mobile comme sur desktop.
  - Dates et créneaux horaires : chiffres tabulaires pour un alignement sans faille.
- **Règles Anti-Slop** :
  - Aucune fausse télémétrie ni score arbitraire.
  - Métadonnées propres sans pilules statiques superposées.
  - Boutons interactifs avec retours tactiles immédiats (`motion`).

---

## 3. Décisions Clés & Architecture Fonctionnelle

- **Persistance des Données (Local & Exportable)** :
  - Données stockées en `localStorage` avec synchronisation instantanée entre la vue ami et la vue organisateur (permettant de tester immédiatement les deux rôles dans le navigateur).
  - Possibilité pour l'organisateur d'exporter le planning au format iCal (.ics) pour l'importer directement dans Google Calendar ou Apple Calendar.
  - Outil de réinitialisation ou d'injection d'exemples réalistes pour la démonstration.
- **Intégration Gemini & Studio Visuel** :
  - Endpoint serveur `/api/generate-activity` : utilise `gemini-3.8-flash` pour suggérer des activités originales et amusantes selon un thème (chill, sensations fortes, gastronomie, culture).
  - Endpoint serveur `/api/generate-image` : utilise l'API `@google/genai` avec gestion des résolutions (1K, 2K, 4K) et des ratios (1:1, 4:3, 16:9, etc.) pour illustrer les cartes d'activités personnalisées.

---

## 4. Architecture Technique & Modèle de Données

### Diagramme de Composants & Flux

```
┌─────────────────────────────────────────────────────────────────┐
│                          App Container                          │
│   (Mode Switcher: Vue Participant / Vue Organisateur / Stats)   │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
     [Vue Participant]                   [Vue Organisateur]
   ┌───────────────────────┐            ┌───────────────────────┐
   │ - Bannière d'accueil  │            │ - Boîte de Réception  │
   │ - Filtres par thèmes  │            │   (Valider / Décliner)│
   │ - Grille d'activités  │            │ - Calendrier Novembre │
   │ - Modal de créneau:   │            │   (Matin/Aprem/Soir)  │
   │   Date nov. + moment  │            │ - Gestionnaire d'act. │
   │   + Infos ami         │            │ - Studio IA (Gemini)  │
   └───────────┬───────────┘            └───────────┬───────────┘
               │                                    │
               └───────────────┬────────────────────┘
                               ▼
               ┌────────────────────────────────┐
               │    Local Storage & State       │
               │  - activities[]                │
               │  - proposals[] (status)        │
               │  - novemberSlots[] (schedule)  │
               └───────────────┬────────────────┘
                               │
                               ▼
               ┌────────────────────────────────┐
               │     Server Routes (/api/*)     │
               │  - POST /api/generate-activity │
               │  - POST /api/generate-image    │
               │  - GET /api/calendar/export    │
               └────────────────────────────────┘
```

### Modèle de Données TypeScript

- `Activity` : `{ id, title, description, category, duration, locationType, imageUrl, energyLevel, minParticipants, maxParticipants, isOrganizerCustom }`
- `Proposal` : `{ id, activityId, activityTitle, friendName, friendContact, note, date: string (YYYY-MM-DD), slot: 'morning' | 'afternoon' | 'evening', status: 'pending' | 'accepted' | 'declined', createdAt: string }`
- `ScheduleSlot` : `{ date: string, slot: 'morning' | 'afternoon' | 'evening', proposalId: string, activityTitle: string, friendName: string }`

---

## 5. Étapes de Mise en Œuvre Validées

1. **Serveur Express & Intégration Gemini** :
   - Mise en place du serveur full-stack avec les endpoints sécurisés pour la génération d'idées d'activités et d'images.
2. **Catalogue & Données Initiales** :
   - Bibliothèque de départ riche en activités de novembre (brunch cosy, session escalade, soirée jeux de société, dégustation de ramen, expo immersive, balade automnale, escape game, etc.) tout en restant 100% éditable par l'organisateur.
3. **Interface Participant (Vue Ami)** :
   - Navigation fluide, sélection d'activités, sélecteur de date interactif centré sur novembre avec créneaux (Matin / Après-midi / Soir), formulaire de contact express et modal de succès.
4. **Interface Organisateur (Vue Planning & Gestion)** :
   - Tableau de bord avec récapitulatif des demandes, boutons Valider / Refuser, vue calendrier mensuel détaillée avec vue par créneaux, et export iCal.
   - Formulaire d'ajout rapide d'activité avec assistant IA pour générer titre, pitch et image personnalisée.
5. **Vérification & Validation** :
   - Compilation TypeScript sans faute, tests des transitions d'état et vérification responsive mobile & desktop.
