import { Module } from '@nestjs/common'
import { GmailService } from './gmail.service'
import { EmailAnalyzerService } from './email-analyzer.service'
import { GmailController } from './gmail.controller'
import { AIModule } from '../ai/ai.module'

@Module({
  imports: [AIModule],
  controllers: [GmailController],
  providers: [GmailService, EmailAnalyzerService],
})
export class GmailModule {}
