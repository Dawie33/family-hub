import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentsRepository } from './repositories/agents.repository';
import { AGENTS_REPOSITORY } from './repositories/agents.repository.interface';

@Module({
  controllers: [AgentsController],
  providers: [
    AgentsService,
    {
      provide: AGENTS_REPOSITORY,
      useClass: AgentsRepository,
    },
  ],
  exports: [AgentsService],
})
export class AgentsModule {}
