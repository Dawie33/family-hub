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
            enum: ['appointment', 'birthday', 'sport', 'meal', 'school', 'vacation', 'family', 'other'],
            description: "Catégorie : appointment=rendez-vous, birthday=anniversaire, sport, meal=repas, school=école, vacation=vacances, family=famille, other=autre",
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

// Outils Recipe AI pour coach_nutrition
export const RECIPE_AI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_recipe',
      description: "Génère une recette personnalisée via Recipe AI à partir d'ingrédients ou d'une demande. Utilise cet outil quand l'utilisateur demande une recette, une idée de plat, ou comment cuisiner quelque chose.",
      parameters: {
        type: 'object',
        properties: {
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: "Liste des ingrédients disponibles (ex: ['poulet', 'tomates', 'riz']). Si l'utilisateur ne précise pas, déduis des ingrédients courants selon sa demande.",
          },
          filters: {
            type: 'array',
            items: { type: 'string' },
            description: "Contraintes alimentaires (ex: ['végétarien', 'sans gluten', 'sans lactose'])",
          },
          platTypes: {
            type: 'array',
            items: { type: 'string' },
            description: "Types de plat souhaités (ex: ['entrée', 'plat principal', 'dessert', 'soupe'])",
          },
          difficulty: {
            type: 'string',
            enum: ['débutant', 'intermédiaire', 'chef'],
            description: 'Niveau de difficulté souhaité',
          },
          maxDuration: {
            type: 'string',
            description: "Temps de préparation maximum (ex: '30 minutes', '1 heure')",
          },
        },
        required: ['ingredients'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_meal_plan',
      description: "Génère un planning repas pour la semaine + liste de courses consolidée via Recipe AI. Utilise cet outil quand l'utilisateur demande un menu de la semaine, un planning repas, ou une liste de courses.",
      parameters: {
        type: 'object',
        properties: {
          numberOfMeals: {
            type: 'number',
            description: "Nombre de repas à planifier (ex: 7 pour une semaine de dîners, 14 pour déjeuners + dîners)",
          },
          numberOfPeople: {
            type: 'number',
            description: 'Nombre de personnes (défaut: 4)',
          },
          filters: {
            type: 'array',
            items: { type: 'string' },
            description: "Contraintes alimentaires de la famille",
          },
          difficulty: {
            type: 'string',
            enum: ['débutant', 'intermédiaire', 'chef'],
            description: 'Niveau de difficulté souhaité',
          },
          maxDuration: {
            type: 'string',
            description: "Temps de préparation maximum par repas",
          },
        },
        required: ['numberOfMeals', 'numberOfPeople'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_saved_recipes',
      description: "Récupère les recettes sauvegardées dans Recipe AI. Utilise cet outil quand l'utilisateur demande ses recettes favorites, l'historique de recettes, ou cherche une recette déjà faite.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_recipe_to_recipeai',
      description: "Sauvegarde une recette dans Recipe AI. Utilise cet outil après avoir généré une recette et que l'utilisateur dit qu'il l'aime ou veut la garder.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre de la recette' },
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: "Ingrédients avec quantités",
          },
          steps: {
            type: 'array',
            items: { type: 'string' },
            description: "Étapes de préparation",
          },
          duration: { type: 'string', description: "Durée totale (ex: '45 minutes')" },
          difficulty: {
            type: 'string',
            enum: ['débutant', 'intermédiaire', 'chef'],
          },
        },
        required: ['title', 'ingredients', 'steps', 'duration', 'difficulty'],
      },
    },
  },
]

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

// Outil de notification push
export const PUSH_NOTIFICATION_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'send_push_notification',
    description:
      "Envoie une notification push à tous les membres de la famille. " +
      "Utilise cet outil quand l'utilisateur demande d'envoyer un rappel, une alerte ou une notification à la famille.",
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: "Titre court de la notification (ex: 'Rappel dentiste')",
        },
        body: {
          type: 'string',
          description: "Corps du message (ex: 'RDV dentiste demain à 14h !')",
        },
      },
      required: ['title', 'body'],
    },
  },
}

// Outil d'extraction de recette depuis une URL
export const RECIPE_URL_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_recipe_from_url',
    description:
      "Extrait une recette depuis une URL (blog culinaire, site de recettes, etc.) et la sauvegarde. " +
      "Utilise cet outil quand l'utilisateur partage un lien et demande d'importer, récupérer ou sauvegarder la recette.",
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: "L'URL complète de la page contenant la recette (ex: https://marmiton.org/recettes/...)",
        },
        save: {
          type: 'boolean',
          description: 'Si true, sauvegarde automatiquement la recette extraite dans Recipe AI (défaut: true)',
        },
      },
      required: ['url'],
    },
  },
}
