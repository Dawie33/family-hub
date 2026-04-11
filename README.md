# Family-Hub - Architecture API-First

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Training-Camp  │  │    Recipe-AI    │  │   Family-Hub   │
│   (standalone)  │  │   (standalone)  │  │  (Dashboard +   │
│                 │  │                 │  │   Agent IA)     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   FAMILY-HUB   │
                    │      API        │
                    │  (Supabase)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Google        │  │  Training-Camp │  │    Recipe-AI    │
│   Calendar      │  │     API        │  │       API       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Structure du projet

```
family-hub/
├── docs/
│   └── architecture.md           # Ce document
│
├── supabase/
│   ├── schema.sql                # Tables et fonctions
│   ├── seed.sql                  # Données de test
│   └── .env.example              # Variables d'environnement
│
├── family-hub-app/               # App principale (Expo)
│   ├── src/
│   │   ├── components/           # Composants UI partagés
│   │   │   ├── calendar/
│   │   │   ├── common/
│   │   │   └── family/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CalendarScreen.tsx
│   │   │   ├── RecipesScreen.tsx
│   │   │   ├── AgentScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── services/              # API clients
│   │   │   ├── supabase.ts
│   │   │   ├── googleCalendar.ts
│   │   │   ├── trainingCampApi.ts
│   │   │   └── recipeAiApi.ts
│   │   ├── store/                # State management (Zustand)
│   │   │   ├── familyStore.ts
│   │   │   ├── calendarStore.ts
│   │   │   └── authStore.ts
│   │   ├── hooks/
│   │   │   ├── useFamilyEvents.ts
│   │   │   ├── useGoogleCalendar.ts
│   │   │   └── useAgent.ts
│   │   ├── types/                # TypeScript types
│   │   │   ├── index.ts
│   │   │   ├── family.ts
│   │   │   └── calendar.ts
│   │   └── utils/
│   │       ├── dateUtils.ts
│   │       └── notifications.ts
│   ├── App.tsx
│   ├── app.json
│   └── package.json
│
├── family-agent/                 # Agent IA
│   ├── src/
│   │   ├── prompts/
│   │   │   ├── system.ts         # Prompt principal
│   │   │   └── tools.ts          # Descriptions outils
│   │   ├── tools/
│   │   │   ├── calendar.ts       # Outils calendrier
│   │   │   ├── recipes.ts        # Outils recettes
│   │   │   ├── sport.ts          # Outils sport
│   │   │   └── google.ts         # Outils Google
│   │   ├── agent.ts              # Agent principal
│   │   └── index.ts
│   └── package.json
│
└── integration-guides/
    ├── training-camp.md          # Guide intégration Training-Camp
    └── recipe-ai.md             # Guide intégration Recipe-AI
```

## Démarrage rapide

### 1. Initialiser Supabase

```bash
# Créer un projet Supabase
# Aller dans SQL Editor et exécuter supabase/schema.sql

# Configurer les variables d'environnement
cp supabase/.env.example supabase/.env
# Remplir avec vos credentials
```

### 2. Configurer Google Calendar API

1. Aller dans Google Cloud Console
2. Créer un projet
3. Activer Google Calendar API
4. Créer des credentials OAuth 2.0
5. Configurer le redirect URI

### 3. Lancer l'app

```bash
cd family-hub-app
npm install
npx expo start
```

### 4. Connecter Training-Camp et Recipe-AI

Voir `integration-guides/`

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google |
| `GOOGLE_REDIRECT_URI` | URI de callback |
| `TRAINING_CAMP_API_URL` | URL de l'API Training-Camp |
| `RECIPE_AI_API_URL` | URL de l'API Recipe-AI |

## Fonctionnalités

### Family-Hub App
- Dashboard famille avec événements à venir
- Vue calendrier mensuelle/semaine
- Intégration Google Calendar (sync bidirectionnelle)
- Gestion des membres familiaux
- Planification de repas
- Interface agent IA

### Agent IA
- Commandes vocales/texte
- Planification d'événements
- Suggestions de repas basées sur Recipe-AI
- Intégration séances sport de Training-Camp
- Gestion du calendrier Google

### API
- CRUD événements familiaux
- Sync Google Calendar via webhooks
- Intégration Training-Camp (lecture/écriture)
- Intégration Recipe-AI (lecture des recettes)
- Authentification par membres