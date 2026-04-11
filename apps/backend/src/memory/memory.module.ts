import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryRepository } from './repositories/memory.repository';
import { MEMORY_REPOSITORY } from './repositories/memory.repository.interface';
import { ZepService } from './zep.service';

@Module({
  providers: [
    ZepService,
    MemoryService,
    {
      provide: MEMORY_REPOSITORY,
      useClass: MemoryRepository,
    },
  ],
  exports: [MemoryService, ZepService],
})
export class MemoryModule {}
