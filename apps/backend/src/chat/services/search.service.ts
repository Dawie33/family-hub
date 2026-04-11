import { Injectable, Logger } from '@nestjs/common';
import { PexelsService } from '../../ai/pexels.service';
import { SerperService, SearchResponse } from '../../ai/serper.service';
import { CATEGORY_CONFIG } from '../chat.contantes';

export interface SearchEnrichment {
  searchResults: SearchResponse | null;
  searchContext: string;
  image?: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly serperService: SerperService,
    private readonly pexelsService: PexelsService,
  ) {}

  /**
   * Détermine si une recherche web est nécessaire
   */
  shouldSearch(message: string, keywords: string[]): boolean {
    if (keywords.length === 0) return false;
    const lowerMessage = message.toLowerCase();
    return keywords.some((k) => lowerMessage.includes(k));
  }

  /**
   * Effectue une recherche web enrichie
   */
  async performSearch(
    query: string,
    resultCount: number = 5,
  ): Promise<SearchResponse | null> {
    try {
      this.logger.log(`Searching web for: ${query.substring(0, 50)}... (${resultCount} results)`);
      return await this.serperService.search(query, resultCount);
    } catch (error) {
      this.logger.error('Search error:', error);
      return null;
    }
  }

  /**
   * Effectue plusieurs recherches ciblées pour les vacances et combine les résultats
   */
  async performVacationSearch(
    message: string,
    resultCount: number = 5,
  ): Promise<SearchResponse | null> {
    try {
      // Extraire la destination et les infos clés du message
      const destination = this.extractDestination(message);
      if (!destination) {
        return this.performSearch(message, resultCount);
      }

      this.logger.log(`Vacation search for destination: ${destination}`);

      // Lancer plusieurs recherches ciblées en parallèle
      const queries = [
        `${destination} tarif billet prix officiel 2025 2026`,
        `${destination} hébergement hôtel prix nuit`,
        `${destination} transport train avion prix depuis`,
      ];

      const searchPromises = queries.map(q => this.serperService.search(q, 3));
      const results = await Promise.all(searchPromises);

      // Combiner tous les résultats
      const combined: SearchResponse = {
        searchResults: [],
        images: [],
      };

      for (const result of results) {
        if (result.searchResults.length > 0) {
          combined.searchResults.push(...result.searchResults);
        }
        if (result.images && result.images.length > 0 && combined.images.length === 0) {
          combined.images = result.images;
        }
        if (result.knowledgeGraph && !combined.knowledgeGraph) {
          combined.knowledgeGraph = result.knowledgeGraph;
        }
      }

      // Dédupliquer par URL
      const seen = new Set<string>();
      combined.searchResults = combined.searchResults.filter(r => {
        if (seen.has(r.link)) return false;
        seen.add(r.link);
        return true;
      });

      this.logger.log(`Vacation search combined: ${combined.searchResults.length} results`);
      return combined.searchResults.length > 0 ? combined : null;
    } catch (error) {
      this.logger.error('Vacation search error:', error);
      return this.performSearch(message, resultCount);
    }
  }

  /**
   * Extrait la destination principale du message utilisateur
   */
  private extractDestination(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Destinations connues (parcs, villes populaires)
    const knownDestinations = [
      'disneyland paris', 'disneyland', 'disney',
      'paris', 'lyon', 'marseille', 'nice', 'bordeaux', 'toulouse',
      'barcelone', 'rome', 'londres', 'amsterdam', 'lisbonne', 'berlin', 'madrid', 'venise', 'prague',
      'new york', 'tokyo', 'bali', 'thaïlande', 'grèce', 'crète', 'corse', 'sardaigne',
      'marrakech', 'tunisie', 'portugal', 'espagne', 'italie', 'croatie',
      'puy du fou', 'futuroscope', 'astérix', 'europa park', 'port aventura',
    ];

    for (const dest of knownDestinations) {
      if (lowerMessage.includes(dest)) {
        return dest;
      }
    }

    // Pattern: "à/vers/pour [Destination]"
    const patterns = [
      /(?:à|vers|pour|destination)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/,
      /(?:aller|partir|voyager)\s+(?:à|en|au|aux)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1] && match[1].length > 2) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Construit le contexte de recherche pour l'IA
   */
  buildSearchContext(results: SearchResponse, maxResults: number = 3): string {
    let context = '';

    // Knowledge Graph si disponible
    if (results.knowledgeGraph) {
      context += `**${results.knowledgeGraph.title}**: ${results.knowledgeGraph.description}\n\n`;
    }

    // Résultats de recherche
    context += 'Résultats de recherche:\n';
    results.searchResults.slice(0, maxResults).forEach((result, i) => {
      context += `${i + 1}. "${result.title}" - ${result.snippet} (Source: ${result.link})\n`;
    });

    return context;
  }

  /**
   * Formate les résultats de recherche comme sources
   */
  formatResultsAsSources(results: SearchResponse, maxSources: number = 3): string {
    return this.serperService.formatResultsAsContext(results, maxSources);
  }

  /**
   * Recherche une image pertinente
   */
  async searchImage(
    category: string,
    query: string,
    searchResults?: SearchResponse | null,
  ): Promise<string | undefined> {
    try {
      // Utiliser Pexels pour la nourriture
      if (category === 'nutrition') {
        const imageUrl = await this.pexelsService.searchRecipeImage(query);
        if (imageUrl) return imageUrl;
      }

      // Utiliser l'image de la recherche web si disponible
      if (searchResults?.images && searchResults.images.length > 0) {
        return searchResults.images[0].imageUrl;
      }

      // Recherche d'images spécifique
      const suffix = this.getCategoryImageSuffix(category);
      const images = await this.serperService.searchImages(`${query} ${suffix}`, 1);
      if (images.length > 0) {
        return images[0].imageUrl;
      }
    } catch (error) {
      this.logger.error('Image search error:', error);
    }

    return undefined;
  }

  /**
   * Retourne le suffixe de recherche d'image selon la catégorie
   */
  private getCategoryImageSuffix(category: string): string {
    const suffixes: Record<string, string> = {
      divertissement: 'game cover art',
      culture: 'book cover',
      vacances: 'travel destination landscape',
      general: '',
    };
    return suffixes[category] || '';
  }

  /**
   * Extrait la requête d'image appropriée selon le contexte
   */
  extractImageQuery(
    category: string,
    message: string,
    response: string,
  ): string | null {
    const config = CATEGORY_CONFIG[category];
    if (!config?.imageEnabled) return null;

    const combinedText = `${message} ${response}`.toLowerCase();

    // Vérifier si le contenu justifie une image
    const hasKeyword =
      config.imageKeywords.length === 0 ||
      config.imageKeywords.some((k) => combinedText.includes(k));

    if (!hasKeyword) return null;

    // Extraire le sujet principal selon la catégorie
    switch (category) {
      case 'nutrition':
        return this.extractRecipeName(response) || this.extractFoodFromMessage(message);
      case 'divertissement':
        return this.extractMediaTitle(response) || this.extractFromBold(response);
      case 'culture':
        return this.extractBookTitle(response) || this.extractFromBold(response);
      default:
        return this.extractFromBold(response);
    }
  }

  /**
   * Extrait un nom de plat du message utilisateur
   */
  private extractFoodFromMessage(message: string): string | null {
    const patterns = [
      /recette\s+(?:de(?:s)?|du|de la|d')\s*(.+?)(?:\s*\?|$)/i,
      /(?:préparer?|cuisiner?|faire)\s+(?:de(?:s)?|du|de la|d'|un(?:e)?|les?)\s*(.+?)(?:\s*\?|$)/i,
      /(?:lasagnes?|pizza|pâtes|salade|soupe|gâteau|tarte|poulet|boeuf|poisson)\s*(?:au|aux|à la|de)?\s*([a-zéèêàùâîôûç\s]+)?/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const result = match[1]?.trim() || match[0]?.trim();
        if (result && result.length > 2 && result.length < 50) {
          return result;
        }
      }
    }

    // Fallback: chercher des mots-clés de nourriture
    const foodKeywords = [
      'lasagne', 'pizza', 'pâtes', 'salade', 'soupe', 'gâteau',
      'tarte', 'poulet', 'boeuf', 'poisson', 'risotto', 'gratin', 'quiche',
    ];
    const lowerMessage = message.toLowerCase();

    for (const food of foodKeywords) {
      if (lowerMessage.includes(food)) {
        const regex = new RegExp(`(${food}[a-zéèêàùâîôûç\\s]{0,20})`, 'i');
        const match = message.match(regex);
        if (match?.[1]) {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  /**
   * Extrait le nom d'une recette de la réponse
   */
  private extractRecipeName(response: string): string | null {
    const patterns = [
      /\*\*([^*]+)\*\*/,
      /recette[:\s]+(?:de|du|des|d')?\s*([^.!?\n]+)/i,
      /(?:voici|je te propose)[:\s]+(?:une?|la|le)?\s*([^.!?\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 80) {
          return name;
        }
      }
    }

    const firstLine = response.split('\n')[0].replace(/[#*]/g, '').trim();
    if (firstLine.length > 3 && firstLine.length < 50) {
      return firstLine;
    }

    return null;
  }

  /**
   * Extrait un titre de média (jeu/film/série)
   */
  private extractMediaTitle(response: string): string | null {
    const patterns = [
      /(?:jeu|film|série)[:\s]+[«"]?([^»".\n]+)[»"]?/i,
      /(?:joue[rz]? à|regarde[rz]?)[:\s]+[«"]?([^»".\n]+)[»"]?/i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extrait un titre de livre
   */
  private extractBookTitle(response: string): string | null {
    const patterns = [
      /(?:livre|roman|bd|manga)[:\s]+[«"]([^»"]+)[»"]/i,
      /[«"]([^»"]+)[»"].*(?:de|par)\s+([A-Z][a-z]+)/,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extrait le texte en gras comme sujet
   */
  private extractFromBold(response: string): string | null {
    const match = response.match(/\*\*([^*]+)\*\*/);
    if (match?.[1]) {
      const text = match[1].trim();
      if (text.length > 2 && text.length < 60) {
        return text;
      }
    }
    return null;
  }
}
