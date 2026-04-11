import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AGENTS_REPOSITORY, IAgentsRepository } from './repositories/agents.repository.interface';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Agent } from './entities/agent.entity';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AGENTS_REPOSITORY)
    private readonly agentsRepository: IAgentsRepository,
  ) {}

  /**
   * Récupère tous les agents actifs.
   */
  async findAll(): Promise<Agent[]> {
    return this.agentsRepository.findAll();
  }

  /**
   * Récupère les agents actifs pour une catégorie donnée.
   */
  async findByCategory(category: string): Promise<Agent[]> {
    return this.agentsRepository.findByCategory(category);
  }

  /**
   * Récupère un agent par son identifiant.
   * @throws {NotFoundException} Si l'agent n'est pas trouvé.
   */
  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent #${id} not found`);
    }
    return agent;
  }

  /**
   * Récupère un agent par son nom.
   */
  async findOneByName(name: string): Promise<Agent | null> {
    return this.agentsRepository.findByName(name);
  }

  /**
   * Crée un nouvel agent.
   */
  async create(data: CreateAgentDto): Promise<Agent> {
    return this.agentsRepository.create(data);
  }

  /**
   * Met à jour un agent existant.
   * @throws {NotFoundException} Si l'agent n'est pas trouvé.
   */
  async update(id: string, data: UpdateAgentDto): Promise<Agent> {
    const agent = await this.agentsRepository.update(id, data);
    if (!agent) {
      throw new NotFoundException(`Agent #${id} not found`);
    }
    return agent;
  }

  /**
   * Supprime un agent (soft delete).
   * @throws {NotFoundException} Si l'agent n'est pas trouvé.
   */
  async remove(id: string): Promise<void> {
    const deleted = await this.agentsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Agent #${id} not found`);
    }
  }
}
