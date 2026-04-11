# Intégration Training-Camp avec Family-Hub

## Overview

Training-Camp peut fonctionner de manière autonome ou être intégré au Family-Hub via l'API.

## Option 1 : Standalone (sans hub)

Training-Camp fonctionne indépendamment. Les séances sont créées et gérées directement dans l'app.

## Option 2 : Intégration avec Family-Hub

### A. Configuration

1. Dans Family-Hub, ajouter l'intégration Training-Camp :

```typescript
// family-hub-app/src/services/trainingCampApi.ts
const TRAINING_CAMP_API_URL = 'https://training-camp-api.example.com';
```

2. Configurer la connexion dans Supabase :

```sql
INSERT INTO integrations (family_id, provider, status)
VALUES ('your-family-id', 'training-camp', 'active');
```

### B. Sync automatique

Les séances Training-Camp peuvent être automatiquement ajoutées au calendrier famille :

```typescript
import { syncSessionToHub } from '../services/trainingCampApi';

// Après création d'une séance dans Training-Camp
await syncSessionToHub(familyId, {
  id: 'session-123',
  name: 'Entraînement musculation',
  date: '2024-03-15T10:00:00Z',
  duration: 60,
  type: 'Musculation',
  intensity: 'medium',
});
```

### C. API REST (alternative)

```
POST /api/sync-session
{
  "family_id": "uuid",
  "session": {
    "name": "Séance",
    "date": "2024-03-15T10:00:00",
    "duration": 60
  }
}
```

## Démarrer le service (optionnel)

```bash
cd training-camp-api
npm run dev
```

## Webhooks (avancé)

Pour une sync en temps réel, configurer un webhook :

```
Training-Camp ──(webhook)──> Family-Hub/Supabase
```

1. Créer une Edge Function dans Supabase
2. Configurer le webhook dans Training-Camp
3. La fonction met à jour la table `family_events`

##FAQ

**Q: Est-ce que Training-Camp doit être connecté à internet ?**
R: Oui, pour la sync. En mode offline, les séances restent locales.

**Q: Puis-je utiliser Training-Camp sans Family-Hub ?**
R: Absolument, les deux peuvent fonctionner indépendamment.