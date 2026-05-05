import { Controller, Post } from '@nestjs/common'
import { EmailAnalyzerService } from './email-analyzer.service'

@Controller('gmail')
export class GmailController {
  constructor(private readonly emailAnalyzer: EmailAnalyzerService) {}

  @Post('analyze')
  triggerAnalysis(): Promise<{ emails: number; saved: number; archived: number }> {
    return this.emailAnalyzer.analyzeNewEmails(true, 100)
  }
}
