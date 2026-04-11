import { Controller, Get, Post, Query } from '@nestjs/common';
import { BriefingsService } from './briefings.service';

@Controller('briefings')
export class BriefingsController {
  constructor(private readonly briefingsService: BriefingsService) {}

  @Get()
/**
* Recherche les notes d'information par date.
* Si aucune date n'est fournie, renvoie les notes d'information du jour.
* @param date La date pour laquelle rechercher les notes d'information.
* @returns Une promesse qui renvoie un tableau de notes d'information.
*/
  findByDate(@Query('date') date?: string) {
    if (date) {
      return this.briefingsService.findByDate(date);
    }
    return this.briefingsService.findToday();
  }

  @Get('latest')
/**
 * Récupère les briefings les plus récents (fallback).
 * Si le générateur de briefings n'a pas encore généré de briefings pour le jour en cours,
 * cette fonction renvoie les briefings du jour précédent.
 * @returns Une promesse qui renvoie un tableau de briefings.
 */
  findLatest() {
    return this.briefingsService.findLatest();
  }

  @Post('generate')
/**
 * Génère tous les briefings quotidiens.
 * @param force - Si 'true', régénère même les briefings existants
 * @returns Une promesse qui renvoie un objet avec un message de confirmation.
 */
  async generate(@Query('force') force?: string) {
    await this.briefingsService.generateDailyBriefings(force === 'true');
    return { message: 'Briefings generation completed' };
  }
}
