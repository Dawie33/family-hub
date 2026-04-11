import { AgentMemory } from '../entities/memory.entity';

export const MEMORY_REPOSITORY = Symbol('MEMORY_REPOSITORY');

export interface IMemoryRepository {
  findBySession(sessionId: string, categories?: string[]): Promise<AgentMemory[]>;
  findBySessionAndSubject(sessionId: string, subject: string): Promise<AgentMemory | null>;
  create(data: Partial<AgentMemory>): Promise<AgentMemory>;
  update(id: string, data: Partial<AgentMemory>): Promise<AgentMemory | null>;
  markAccessed(ids: string[]): Promise<void>;
  deactivate(id: string): Promise<boolean>;
  findAllActive(categories?: string[]): Promise<AgentMemory[]>;
}
