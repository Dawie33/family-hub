import { ChatCompletionTool } from 'openai/resources/index'

// Icônes par catégorie (pour la réponse)
export const CATEGORY_ICONS: Record<string, string> = {
  nutrition: '🥗',
  productivite: '📅',
  education: '📚',
  general: '🤖',
  culture: '💡',
  divertissement: '🎮',
  jeux_enfant: '🧸',
  recherche: '🔍',
  vacances: '✈️',
  sports: '🏋️',
  famille: '👨‍👩‍👧‍👦',
}

// Configuration par catégorie pour la recherche
export const CATEGORY_CONFIG: Record<
  string,
  {
    searchEnabled: boolean
    imageEnabled: boolean
    imageGeneration: boolean
    imageKeywords: string[]
    searchKeywords: string[]
  }
> = {
  nutrition: {
    searchEnabled: false,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: ['recette', 'prépare', 'cuisine', 'ingrédients', 'plat', 'repas'],
    searchKeywords: [],
  },
  divertissement: {
    searchEnabled: true,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: ['jeu', 'film', 'série', 'anime', 'sortie'],
    searchKeywords: ['soluce', 'guide', 'astuce', 'boss', 'sortie', 'horaire', 'séance', 'avis'],
  },
  culture: {
    searchEnabled: true,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: ['livre', 'auteur', 'roman', 'bd', 'manga'],
    searchKeywords: ['livre', 'auteur', 'sortie', 'prix'],
  },
  education: {
    searchEnabled: true,
    imageEnabled: false,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: ['définition', 'histoire', 'science', 'fait', 'invention', 'découverte'],
  },
  general: {
    searchEnabled: true,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: ['comment', 'pourquoi', 'quand', 'où', 'qui'],
  },
  productivite: {
    searchEnabled: false,
    imageEnabled: false,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: [],
  },
  jeux_enfant: {
    searchEnabled: false,
    imageEnabled: false,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: [],
  },
  recherche: {
    searchEnabled: true,
    imageEnabled: false,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: [],
  },
  vacances: {
    searchEnabled: true,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: ['destination', 'plage', 'montagne', 'ville', 'paysage', 'hôtel', 'resort'],
    searchKeywords: [
      'vacances',
      'voyage',
      'séjour',
      'destination',
      'partir',
      'vol',
      'hôtel',
      'hotel',
      'airbnb',
      'billet',
      'prix',
      'budget',
      'coût',
      'tarif',
      'plage',
      'montagne',
      'camping',
      'gîte',
      'météo',
      'activités',
      'visite',
      'disneyland',
      'disney',
      'parc',
      'adulte',
      'enfant',
      'famille',
      'août',
      'juillet',
      'été',
      'hiver',
      'printemps',
      'semaine',
      'week-end',
      'nuit',
      'avion',
      'train',
      'voiture',
      'réserver',
      'réservation',
    ],
  },
  sports: {
    searchEnabled: true,
    imageEnabled: false,
    imageGeneration: false,
    imageKeywords: [],
    searchKeywords: [
      'exercice',
      'musculation',
      'cardio',
      'running',
      'crossfit',
      'technique',
      'form',
      'posture',
      'entraînement',
    ],
  },
  famille: {
    searchEnabled: false,
    imageEnabled: true,
    imageGeneration: false,
    imageKeywords: ['famille', 'généalogie', 'arbre'],
    searchKeywords: [],
  },
}

// Agents qui génèrent des images avec DALL-E (détection par nom technique)
export const IMAGE_GENERATION_AGENTS: Record<string, { isColoring: boolean }> = {
  createur_images: { isColoring: false },
  createur_coloriages: { isColoring: true },
}

// Outils pour le Gestionnaire Agenda
export const AGENDA_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: "Crée un nouvel événement dans l'agenda",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: "Titre de l'événement" },
          start_date: { type: 'string', description: 'Date et heure de début au format ISO (ex: 2024-01-25T14:00:00)' },
          end_date: { type: 'string', description: 'Date et heure de fin au format ISO (optionnel)' },
          description: { type: 'string', description: 'Description détaillée (optionnel)' },
          location: { type: 'string', description: "Lieu de l'événement (optionnel)" },
          all_day: { type: 'boolean', description: 'Événement toute la journée (optionnel)' },
          category: {
            type: 'string',
            enum: ['rdv', 'tache', 'rappel', 'anniversaire', 'autre'],
            description: "Catégorie de l'événement",
          },
          recurrence: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            description: 'Récurrence (optionnel)',
          },
        },
        required: ['title', 'start_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_events_today',
      description: 'Récupère les événements du jour',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_events_week',
      description: 'Récupère les événements de la semaine',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_events_range',
      description: 'Récupère les événements pour une période donnée',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Date de début au format ISO' },
          end_date: { type: 'string', description: 'Date de fin au format ISO' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Modifie un événement existant',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'number', description: "ID de l'événement à modifier" },
          title: { type: 'string', description: 'Nouveau titre (optionnel)' },
          start_date: { type: 'string', description: 'Nouvelle date de début au format ISO (optionnel)' },
          end_date: { type: 'string', description: 'Nouvelle date de fin au format ISO (optionnel)' },
          description: { type: 'string', description: 'Nouvelle description (optionnel)' },
          location: { type: 'string', description: 'Nouveau lieu (optionnel)' },
        },
        required: ['event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Supprime un événement',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'number', description: "ID de l'événement à supprimer" },
        },
        required: ['event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_events',
      description: 'Recherche des événements par titre ou description',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Terme de recherche' },
        },
        required: ['query'],
      },
    },
  },
]

// Outil de delegation vers l'agent Agenda (disponible pour certains agents)
export const DELEGATION_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delegate_to_agenda',
    description:
      "Delegue une tache de gestion d'agenda a l'agent specialise. Utilise cet outil quand l'utilisateur veut ajouter, modifier ou supprimer des evenements dans son calendrier.",
    parameters: {
      type: 'object',
      properties: {
        task_description: {
          type: 'string',
          description:
            "Description complete de la tache a effectuer dans l'agenda (ex: 'Ajouter les recettes suivantes au diner: lundi lasagnes, mardi poulet roti...')",
        },
        events: {
          type: 'array',
          description: 'Liste structuree des evenements a creer (optionnel, si les informations sont connues)',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: "Titre de l'evenement" },
              date: { type: 'string', description: 'Date au format YYYY-MM-DD' },
              time: { type: 'string', description: 'Heure au format HH:MM (optionnel, defaut 19:00 pour les repas)' },
              description: { type: 'string', description: 'Description (optionnel)' },
            },
            required: ['title', 'date'],
          },
        },
      },
      required: ['task_description'],
    },
  },
}

// Agents qui peuvent deleguer des taches a l'agent Agenda (noms techniques)
export const AGENTS_WITH_DELEGATION = [
  'coach_nutrition',
  'famille_organisateur',
  'aide_devoirs',
  'assistant_general',
  'planificateur_vacances',
]

// Outil pour générer un PDF de liste de courses
export const PDF_SHOPPING_LIST_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generate_shopping_list_pdf',
    description:
      "Génère un PDF téléchargeable de la liste de courses. Utilise cet outil quand l'utilisateur demande la liste de courses, veut télécharger la liste, ou confirme les recettes proposées.",
    parameters: {
      type: 'object',
      properties: {
        shopping_list: {
          type: 'array',
          description: 'Liste des ingrédients à acheter',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string', description: "Nom de l'ingrédient" },
              quantity: { type: 'string', description: 'Quantité (ex: 500g, 2 pièces)' },
              category: {
                type: 'string',
                description:
                  'Catégorie (Legumes, Fruits, Viande, Poisson, Epicerie, Produits laitiers, Surgeles, Autre)',
              },
            },
            required: ['item'],
          },
        },
        meal_plan_summary: {
          type: 'string',
          description: 'Résumé court du menu (ex: "Semaine du 28 jan: Lundi lasagnes, Mardi poulet...")',
        },
      },
      required: ['shopping_list'],
    },
  },
}

// Agents qui peuvent générer des PDF de liste de courses (noms techniques)
export const AGENTS_WITH_PDF = ['coach_nutrition', 'gestionnaire_agenda']

// Outil pour sauvegarder une recette dans les favoris
export const SAVE_RECIPE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'save_recipe',
    description:
      "Sauvegarde une recette dans les favoris de l'utilisateur. Utilise cet outil quand l'utilisateur demande de sauvegarder, garder, enregistrer une recette, ou dit qu'il l'aime bien.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre de la recette' },
        description: { type: 'string', description: 'Courte description de la recette' },
        ingredients: {
          type: 'array',
          description: 'Liste des ingrédients',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string', description: "Nom de l'ingrédient" },
              quantity: { type: 'string', description: 'Quantité (ex: 500g, 2 pièces)' },
              category: {
                type: 'string',
                description:
                  'Catégorie (Legumes, Fruits, Viande, Poisson, Epicerie, Produits laitiers, Surgeles, Autre)',
              },
            },
            required: ['item'],
          },
        },
        instructions: { type: 'string', description: 'Étapes de préparation (numérotées)' },
        servings: { type: 'number', description: 'Nombre de portions' },
        prep_time: { type: 'number', description: 'Temps de préparation en minutes' },
        cook_time: { type: 'number', description: 'Temps de cuisson en minutes' },
        category: {
          type: 'string',
          enum: ['entree', 'plat', 'dessert', 'gouter', 'autre'],
          description: 'Type de recette',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags (ex: végétarien, rapide, sans gluten, familial)',
        },
      },
      required: ['title', 'ingredients', 'instructions'],
    },
  },
}

// Agents qui peuvent sauvegarder des recettes (noms techniques)
export const AGENTS_WITH_RECIPES = ['coach_nutrition']

// Outils pour Training Camp (coach_sport)
export const TRAINING_CAMP_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description:
        "Récupère le profil sportif de l'utilisateur incluant son niveau, objectifs, équipements et blessures",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_active_program',
      description: "Récupère le programme d'entraînement actif de l'utilisateur avec les sessions de la semaine",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_training_history',
      description: "Récupère l'historique des séances d'entraînement récentes",
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Nombre de séances à récupérer (défaut: 10)', default: 10 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_weekly_program',
      description:
        "Génère un programme d'entraînement personnalisé avec l'IA. Les paramètres sont facultatifs et seront complétés automatiquement depuis le profil.",
      parameters: {
        type: 'object',
        properties: {
          goal: {
            type: 'string',
            description: 'Objectif principal (strength, endurance, weight_loss, muscle_gain, general_fitness)',
            enum: ['strength', 'endurance', 'weight_loss', 'muscle_gain', 'general_fitness'],
          },
          duration_weeks: { type: 'number', description: 'Durée du programme en semaines (défaut: 4)', default: 4 },
          sessions_per_week: { type: 'number', description: 'Nombre de séances par semaine (défaut: 3-5)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_program',
      description: "Sauvegarde le programme d'entraînement généré dans le profil de l'utilisateur",
      parameters: {
        type: 'object',
        properties: {
          program_preview: {
            type: 'object',
            description: 'Le programme généré à sauvegarder (avec name, description, weeks, sessions)',
          },
        },
        required: ['program_preview'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_workout',
      description: "Enregistre une séance d'entraînement terminée par l'utilisateur",
      parameters: {
        type: 'object',
        properties: {
          workout_id: { type: 'string', description: "ID de l'entraînement (optionnel)" },
          workout_name: {
            type: 'string',
            description: 'Nom de la séance (ex: "WOD - Fran", "Séance dos", "Course 5km")',
          },
          elapsed_time_seconds: { type: 'number', description: 'Durée de la séance en secondes' },
          rounds_completed: { type: 'number', description: 'Nombre de rounds complétés (pour WODs)' },
          exercises_completed: { type: 'number', description: "Nombre d'exercices réalisés" },
          notes: { type: 'string', description: 'Notes personnelles sur la séance (optionnel)' },
        },
        required: ['workout_name'],
      },
    },
  },
]

// Agents qui peuvent utiliser les outils Training Camp
export const AGENTS_WITH_TRAINING_CAMP = ['coach_sport']
