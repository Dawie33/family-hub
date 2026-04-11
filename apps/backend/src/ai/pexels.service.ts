import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

@Injectable()
export class PexelsService {
  private readonly logger = new Logger(PexelsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pexels.com/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PEXELS_API_KEY') || '';
  }

  async searchImages(query: string, perPage: number = 1): Promise<string | null> {
    try {
      this.logger.log(`Searching Pexels for: ${query}`);

      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            Authorization: this.apiKey,
          },
        },
      );

      if (!response.ok) {
        this.logger.error(`Pexels API error: ${response.status}`);
        return null;
      }

      const data: PexelsSearchResponse = await response.json();

      if (data.photos && data.photos.length > 0) {
        // Return medium size for good quality without being too large
        const imageUrl = data.photos[0].src.medium;
        this.logger.log(`Found image: ${imageUrl}`);
        return imageUrl;
      }

      this.logger.warn(`No images found for query: ${query}`);
      return null;
    } catch (error) {
      this.logger.error(`Pexels search error: ${error.message}`);
      return null;
    }
  }

  async searchRecipeImage(recipeName: string): Promise<string | null> {
    // Search with food-related terms for better results
    const searchQuery = `${recipeName} food dish`;
    return this.searchImages(searchQuery);
  }
}
