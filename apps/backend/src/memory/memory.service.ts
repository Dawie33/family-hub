import { Inject, Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import { AgentMemory, MemoryType } from './entities/memory.entity';
import { IMemoryRepository, MEMORY_REPOSITORY } from './repositories/memory.repository.interface';
import { MEMORY_EXTRACTION_PROMPT, MEMORY_CATEGORY_MAPPING, BRIEFING_MEMORY_MAPPING } from './memory.constants';
import { ZepService } from './zep.service';

interface ExtractedMemory {
  subject: string;
  content: string;
  memory_type: MemoryType;
  category: string;
  confidence: number;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: IMemoryRepository,
    private readonly aiService: AIService,
    private readonly zepService: ZepService,
  ) {}

  /**
   * Charge les mémoires pertinentes et les formate en bloc markdown pour le system prompt.
   */
  async getMemoriesForPrompt(sessionId: string, agentCategory: string): Promise<string> {
    // 1. Contexte Zep sémantique (mémoire longue durée cross-sessions)
    const [zepContext, localBlock] = await Promise.all([
      this.zepService.getMemoryContext(sessionId),
      this.getLocalMemoriesBlock(sessionId, agentCategory),
    ]);

    return zepContext + localBlock;
  }

  private async getLocalMemoriesBlock(sessionId: string, agentCategory: string): Promise<string> {
    const categories = MEMORY_CATEGORY_MAPPING[agentCategory] || [];
    const memories = await this.memoryRepository.findAllActive(
      categories.length > 0 ? categories : undefined,
    );

    if (memories.length === 0) return '';

    const ids = memories.map(m => m.id);
    this.memoryRepository.markAccessed(ids).catch(() => {});

    const constraints = memories.filter(m => m.memory_type === 'constraint');
    const preferences = memories.filter(m => m.memory_type === 'preference');
    const facts = memories.filter(m => m.memory_type === 'fact');
    const contexts = memories.filter(m => m.memory_type === 'context');

    let block = '\n\n## Mémoire utilisateur';

    if (constraints.length > 0) {
      block += '\n**Contraintes importantes (à respecter impérativement) :**';
      constraints.forEach(m => { block += `\n- ${m.content}`; });
    }
    if (preferences.length > 0) {
      block += '\n**Préférences :**';
      preferences.forEach(m => { block += `\n- ${m.content}`; });
    }
    if (facts.length > 0) {
      block += '\n**Informations connues :**';
      facts.forEach(m => { block += `\n- ${m.content}`; });
    }
    if (contexts.length > 0) {
      block += '\n**Contexte :**';
      contexts.forEach(m => { block += `\n- ${m.content}`; });
    }

    return block;
  }

  /**
   * Charge les mémoires pertinentes pour un briefing (sans session) et les formate en bloc markdown.
   */
  async getMemoriesForBriefing(briefingCategory: string): Promise<string> {
    const categories = BRIEFING_MEMORY_MAPPING[briefingCategory];
    const memories = await this.memoryRepository.findAllActive(categories);

    if (memories.length === 0) return '';

    // Fire-and-forget: mettre à jour last_accessed_at
    const ids = memories.map(m => m.id);
    this.memoryRepository.markAccessed(ids).catch(() => {});

    // Grouper par type
    const constraints = memories.filter(m => m.memory_type === 'constraint');
    const preferences = memories.filter(m => m.memory_type === 'preference');
    const facts = memories.filter(m => m.memory_type === 'fact');
    const contexts = memories.filter(m => m.memory_type === 'context');

    let block = '\n\n## Informations sur la famille';

    if (constraints.length > 0) {
      block += '\n**Contraintes importantes (à respecter impérativement) :**';
      constraints.forEach(m => { block += `\n- ${m.content}`; });
    }

    if (preferences.length > 0) {
      block += '\n**Préférences :**';
      preferences.forEach(m => { block += `\n- ${m.content}`; });
    }

    if (facts.length > 0) {
      block += '\n**Informations connues :**';
      facts.forEach(m => { block += `\n- ${m.content}`; });
    }

    if (contexts.length > 0) {
      block += '\n**Contexte :**';
      contexts.forEach(m => { block += `\n- ${m.content}`; });
    }

    return block;
  }

  /**
   * Extrait les faits personnels d'un échange et les stocke en base.
   * Méthode fire-and-forget, ne doit jamais throw.
   */
  async extractAndStoreMemories(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    agentCategory: string,
  ): Promise<void> {
    // Envoyer l'échange à Zep en parallèle (fire-and-forget)
    this.zepService.addMessages(sessionId, userMessage, assistantResponse)
      .catch(err => this.logger.error(`Zep addMessages error: ${err.message}`));

    try {
      const conversationSnippet = `Message utilisateur: ${userMessage}\n\nRéponse assistant: ${assistantResponse}`;

      const result = await this.aiService.generateAgentResponse(
        conversationSnippet,
        MEMORY_EXTRACTION_PROMPT,
        'openai',
        'gpt-4o-mini',
        [],
      );

      // Parser le JSON retourné
      let parsed: { memories: ExtractedMemory[] };
      try {
        parsed = JSON.parse(result);
      } catch {
        this.logger.debug('Memory extraction returned non-JSON, skipping');
        return;
      }

      if (!parsed.memories || !Array.isArray(parsed.memories)) return;

      // Filtrer par confiance >= 0.7
      const validMemories = parsed.memories.filter(m => m.confidence >= 0.7);

      for (const extracted of validMemories) {
        await this.upsertMemory(sessionId, extracted, agentCategory, userMessage);
      }

      if (validMemories.length > 0) {
        this.logger.log(`Extracted ${validMemories.length} memories for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Memory extraction failed: ${error.message}`);
    }
  }

  /**
   * Insert ou met à jour une mémoire en se basant sur le sujet normalisé.
   */
  private async upsertMemory(
    sessionId: string,
    extracted: ExtractedMemory,
    agentCategory: string,
    sourceMessage: string,
  ): Promise<void> {
    const existing = await this.memoryRepository.findBySessionAndSubject(
      sessionId,
      extracted.subject,
    );

    if (existing) {
      // Mise à jour si le nouveau contenu est différent et confiance >= existante
      if (extracted.content !== existing.content && extracted.confidence >= existing.confidence) {
        await this.memoryRepository.update(existing.id, {
          content: extracted.content,
          confidence: extracted.confidence,
          memory_type: extracted.memory_type,
          source_message: sourceMessage,
        });
        this.logger.debug(`Updated memory: ${extracted.subject}`);
      }
    } else {
      await this.memoryRepository.create({
        session_id: sessionId,
        memory_type: extracted.memory_type,
        category: extracted.category || agentCategory,
        subject: extracted.subject.toLowerCase().trim(),
        content: extracted.content,
        source_message: sourceMessage,
        confidence: extracted.confidence,
      });
      this.logger.debug(`Created memory: ${extracted.subject}`);
    }
  }
}
