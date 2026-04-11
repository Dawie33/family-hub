# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projets

Ce dépôt contient deux applications distinctes partageant le même backend Supabase :

- `family-hub-web/` — Application web Next.js 16 (App Router, port 3002)
- `family-hub-app/` — Application mobile Expo/React Native (expo-router) — répertoire décrit dans README mais pas encore présent

## Commandes

### family-hub-web

```bash
cd family-hub-web

npm run dev        # Serveur de dev sur http://localhost:3002
npm run build      # Build de production
npm run start      # Démarrer le serveur de production
npm run lint       # ESLint
```

### family-hub-app (si présent)

```bash
cd family-hub-app

npm start                  # ou: npx expo start
npx expo start -c          # Vider le cache au démarrage
npx expo run:android       # Android
npm run lint               # ESLint
npm run typecheck          # tsc --noEmit
```

## Architecture

### Backend : Supabase (API centrale)

Schéma dans `supabase/schema.sql`. Tables principales :
- `families` — groupe d'utilisateurs
- `family_members` — membres avec rôles (`admin`, `member`, `child`) et couleur calendrier
- `family_events` — événements avec catégorie (`school`, `vacation`, `birthday`, `appointment`, `sport`, `meal`, `family`, `other`) et récurrence
- `integrations` — connexions aux APIs externes (Training-Camp, Recipe-AI)

Le client Supabase est instancié dans `src/lib/supabase.ts` et réexporte aussi les types partagés (`Family`, `FamilyMember`, `CalendarEvent`).

### family-hub-web : Next.js 16

> **Attention** : Next.js 16 introduit des breaking changes — consulter la documentation avant d'écrire du code.

Structure `src/` :
- `app/` — Routes App Router : `agent/`, `recipes/`, `training/`, `settings/`, page principale
- `components/Navigation.tsx` — Navigation globale (bottom nav)
- `lib/` — Clients API : `supabase.ts`, `api.ts`, `recipeAiApi.ts`, `trainingCampApi.ts`
- `stores/familyStore.ts` — Store Zustand v5 (état global famille + événements)

Le layout racine (`app/layout.tsx`) inclut la `Navigation` en bas de page et englobe toutes les routes.

### State management

- **family-hub-web** : Zustand v5 — le store `useFamilyStore` gère `family`, `events`, `isLoading`, `error` et expose `fetchFamily`, `fetchEvents`, `addEvent`
- **family-hub-app** : Zustand v4

### Styling (family-hub-web)

Tailwind CSS v4 via `@tailwindcss/postcss` — pas de `tailwind.config.js`, configuration CSS uniquement dans `globals.css`.

### Intégrations externes

Deux APIs tierces documentées dans `integration-guides/` :
- **Training-Camp** — séances sport (`src/lib/trainingCampApi.ts`)
- **Recipe-AI** — suggestions de repas (`src/lib/recipeAiApi.ts`)

## Variables d'environnement

**family-hub-web** :
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**family-hub-app** :
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Conventions TypeScript

- `type` pour les unions et types simples, `interface` pour les shapes avec méthodes
- Retours de fonctions explicitement typés
- Blocs `catch` avec `error: unknown` puis narrowing
- Imports ordonnés : React → libs tierces → services/stores internes → types → imports relatifs
- Constantes de config en `SCREAMING_SNAKE_CASE`
