import { Module } from '@nestjs/common'
import { GmailService } from './gmail.service'
import { EmailAnalyzerService } from './email-analyzer.service'
import { AIModule } from '../ai/ai.module'

@Module({
  imports: [AIModule],
  providers: [GmailService, EmailAnalyzerService],
})
export class GmailModule {}
