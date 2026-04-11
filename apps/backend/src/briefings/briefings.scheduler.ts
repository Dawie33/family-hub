import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BriefingsService } from './briefings.service';

@Injectable()
export class BriefingsScheduler {
  private readonly logger = new Logger(BriefingsScheduler.name);

  constructor(private briefingsService: BriefingsService) {}

  @Cron('0 6 * * *', { timeZone: 'Europe/Paris' })
  async handleMorningBriefing() {
    this.logger.log('Starting daily morning briefings generation...');
    try {
      await this.briefingsService.generateDailyBriefings();
      this.logger.log('Daily briefings completed successfully');
    } catch (error) {
      this.logger.error(`Daily briefings failed: ${error.message}`);
    }
  }
}
