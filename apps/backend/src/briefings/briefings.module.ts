import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { MemoryModule } from '../memory/memory.module';
import { BriefingsController } from './briefings.controller';
import { BriefingsService } from './briefings.service';
import { BriefingsScheduler } from './briefings.scheduler';

@Module({
  imports: [AgentsModule, MemoryModule],
  controllers: [BriefingsController],
  providers: [BriefingsService, BriefingsScheduler],
  exports: [BriefingsService],
})
export class BriefingsModule {}
