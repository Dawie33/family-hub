export const MEMORY_EXTRACTION_PROMPT = `Tu es un extracteur d'informations personnelles. Analyse la conversation ci-dessous et extrais UNIQUEMENT les faits personnels durables sur l'utilisateur et sa famille.

Règles strictes :
- Extrais UNIQUEMENT les informations personnelles durables (allergies, prénoms, âges, préférences alimentaires, contraintes, habitudes, etc.)
- NE PAS extraire les questions ponctuelles, demandes de recettes, ou informations éphémères
- NE PAS extraire les informations sur l'assistant ou le système
- Chaque fait doit avoir un "subject" normalisé en minuscules, court et unique (ex: "allergie cacahuetes", "prenom fils", "regime vegetarien")
- Le "content" doit être une phrase complète et autonome
- Attribue un score de confiance (0.0 à 1.0) selon la certitude de l'information
- Ne retourne QUE les faits avec une confiance >= 0.7

Catégories disponibles :
- "nutrition" : allergies, régimes, préférences alimentaires, ingrédients détestés/adorés
- "education" : prénoms et âges des enfants, niveau scolaire, activités extra-scolaires
- "vacances" : destinations préférées, contraintes de voyage, budget vacances
- "general" : informations transversales (composition famille, ville, animaux, etc.)

Types de mémoire :
- "constraint" : interdictions, allergies, restrictions (PRIORITAIRE dans les prompts)
- "preference" : goûts, préférences, habitudes
- "fact" : faits objectifs (âge, prénom, ville...)
- "context" : contexte situationnel durable (ex: "déménagement prévu en mars")

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication :
{"memories":[{"subject":"clé normalisée","content":"phrase complète","memory_type":"constraint|preference|fact|context","category":"nutrition|education|vacances|general","confidence":0.95}]}

Si aucune information personnelle durable n'est trouvée, réponds : {"memories":[]}`;

export const BRIEFING_MEMORY_MAPPING: Record<string, string[] | undefined> = {
  meteo: undefined, // toutes les mémoires (activités, contraintes)
  sport: ['general'],
  actualites: ['general'],
  culture: ['education', 'general'],
  citation: ['general'],
  nutrition: ['nutrition', 'general'],
};

export const MEMORY_CATEGORY_MAPPING: Record<string, string[]> = {
  nutrition: ['nutrition', 'general'],
  education: ['education', 'general'],
  vacances: ['vacances', 'general'],
  general: [],
  agenda: ['general'],
  loisirs: ['loisirs', 'general'],
};
