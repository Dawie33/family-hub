export interface BriefingConfig {
  category: string;
  title: string;
  icon: string;
  searchQuery: string;
  /** Requêtes de recherche multiples (utilisées à la place de searchQuery si définies) */
  searchQueries?: string[];
  /** Nombre de résultats par requête (défaut: 5) */
  searchResultCount?: number;
  /** Nom de l'agent à utiliser pour générer ce briefing */
  agentName: string;
  /** Instructions spécifiques au briefing (combinées avec le prompt de l'agent) */
  briefingInstructions: string;
}
