import { Agent } from '../entities/agent.entity';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';

export const AGENTS_REPOSITORY = Symbol('AGENTS_REPOSITORY');

export interface IAgentsRepository {
  findAll(): Promise<Agent[]>;
  findById(id: string): Promise<Agent | null>;
  findByName(name: string): Promise<Agent | null>;
  findByCategory(category: string): Promise<Agent[]>;
  create(data: CreateAgentDto): Promise<Agent>;
  update(id: string, data: UpdateAgentDto): Promise<Agent | null>;
  delete(id: string): Promise<boolean>;
}
