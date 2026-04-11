import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface ImageResult {
  title: string;
  imageUrl: string;
  link: string;
}

export interface SearchResponse {
  searchResults: SearchResult[];
  images: ImageResult[];
  knowledgeGraph?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
}

@Injectable()
export class SerperService {
  private readonly logger = new Logger(SerperService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://google.serper.dev';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SERPER_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('SERPER_API_KEY not configured - web search will be disabled');
    }
  }

  async search(query: string, num: number = 5): Promise<SearchResponse> {
    if (!this.apiKey) {
      return { searchResults: [], images: [] };
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: 'fr',
          hl: 'fr',
          num,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Serper API error: ${response.status}`);
        return { searchResults: [], images: [] };
      }

      const data = await response.json();

      const searchResults: SearchResult[] = (data.organic || []).map(
        (item: any, index: number) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet || '',
          position: index + 1,
        }),
      );

      const images: ImageResult[] = (data.images || []).slice(0, 3).map(
        (item: any) => ({
          title: item.title || '',
          imageUrl: item.imageUrl,
          link: item.link || '',
        }),
      );

      return {
        searchResults,
        images,
        knowledgeGraph: data.knowledgeGraph
          ? {
              title: data.knowledgeGraph.title,
              description: data.knowledgeGraph.description || '',
              imageUrl: data.knowledgeGraph.imageUrl,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Serper search error:', error);
      return { searchResults: [], images: [] };
    }
  }

  async searchImages(query: string, num: number = 5): Promise<ImageResult[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/images`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: 'fr',
          hl: 'fr',
          num,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Serper Images API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      return (data.images || []).map((item: any) => ({
        title: item.title || '',
        imageUrl: item.imageUrl,
        link: item.link || '',
      }));
    } catch (error) {
      this.logger.error('Serper images error:', error);
      return [];
    }
  }

  // Format search results as markdown links for the AI response
  formatResultsAsContext(results: SearchResponse, maxSources: number = 3): string {
    if (results.searchResults.length === 0) {
      return '';
    }

    let context = '\n\n---\n**Sources:**\n';
    results.searchResults.slice(0, maxSources).forEach((result, index) => {
      context += `${index + 1}. [${result.title}](${result.link})\n`;
    });

    return context;
  }
}
