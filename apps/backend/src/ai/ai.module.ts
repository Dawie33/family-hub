import { Module, Global } from '@nestjs/common';
import { AIService } from './ai.service';
import { HuggingFaceService } from './huggingface.service';
import { OpenAIService } from './openai.service';
import { PexelsService } from './pexels.service';
import { SerperService } from './serper.service';

@Global()
@Module({
  providers: [AIService, HuggingFaceService, OpenAIService, PexelsService, SerperService],
  exports: [AIService, OpenAIService, PexelsService, SerperService],
})
export class AIModule {}
