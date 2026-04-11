# Intégration Recipe-AI avec Family-Hub

## Overview

Recipe-AI peut fonctionner de manière autonome ou être intégré au Family-Hub pour la planification des repas.

## Option 1 : Standalone (sans hub)

Recipe-AI fonctionne indépendamment. Les recettes sont générées et stockées dans l'app.

## Option 2 : Intégration avec Family-Hub

### A. Configuration

1. Dans Family-Hub, ajouter l'intégration Recipe-AI :

```typescript
// family-hub-app/src/services/recipeAiApi.ts
const RECIPE_AI_API_URL = 'https://recipe-ai-api.example.com';
```

2. Configurer la connexion dans Supabase :

```sql
INSERT INTO integrations (family_id, provider, status)
VALUES ('your-family-id', 'recipe-ai', 'active');
```

### B. Planification des repas

Quando Recipe-AI génère une recette, elle peut être automatiquement planifiée dans le calendrier famille :

```typescript
import { planMeal } from '../services/recipeAiApi';

// Après génération d'une recette dans Recipe-AI
await planMeal(familyId, {
  id: 'recipe-123',
  name: 'Poulet rôti aux légumes',
  ingredients: ['poulet', 'carottes', 'pommes de terre'],
  instructions: [...],
  prepTime: 15,
  cookTime: 45,
  servings: 4,
}, '2024-03-15', 4);
```

### C. Génération automatique de liste de courses

```typescript
import { generateShoppingList } from '../services/recipeAiApi';

const shoppingList = await generateShoppingList(
  familyId,
  '2024-03-11',  // Début semaine
  '2024-03-17'   // Fin semaine
);

// Résultat: ['poulet', 'carottes', 'pommes de terre', 'riz', ...]
```

### D. API REST (alternative)

```
POST /api/plan-meal
{
  "family_id": "uuid",
  "recipe_id": "recipe-123",
  "recipe_name": "Poulet rôti",
  "date": "2024-03-15",
  "servings": 4
}

GET /api/shopping-list?family_id=uuid&start=2024-03-11&end=2024-03-17
```

## Flux de travail recommandé

1. **Génération** : L'utilisateur demande une recette à Recipe-AI
2. **Validation** : Recipe-AI affiche la recette
3. **Planification** : L'utilisateur clique "Planifier" → crée l'événement repas dans Family-Hub
4. **Courses** : En fin de semaine, génère la liste de courses depuis les repas planifiés

## Synchronisation inverse

Family-Hub peut aussi notify Recipe-AI des restrictions alimentaires :

```typescript
// Dans Family-Hub
await supabase
  .from('family_members')
  .update({ settings: { dietary_restrictions: ['sans-gluten'] } })
  .eq('id', memberId);

// Recipe-AI lit ces restrictions lors de la génération de recettes
```

## FAQ

**Q: Recipe-AI doit être connecté à internet ?**
R: Oui, pour générer des recettes via l'IA. En local, on peut utiliser des recettes sauvegardées.

**Q: Puis-je utiliser Recipe-AI sans Family-Hub ?**
R: Absolument, les deux peuvent fonctionner indépendamment.

**Q: Comment les repas planifiés apparaissent-ils dans Google Calendar ?**
R: Via la sync Google Calendar de Family-Hub. Les événements "meal" sont automatiquement exportés.