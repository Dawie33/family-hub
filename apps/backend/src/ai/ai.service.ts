import { Injectable, Logger } from '@nestjs/common';
import { HuggingFaceService } from './huggingface.service';
import { OpenAIService } from './openai.service';
import { ChatMessage, ModelProvider } from './types';

export { ChatMessage, ModelProvider };

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private huggingFaceService: HuggingFaceService,
    private openAIService: OpenAIService,
  ) {}

  /**
   * Génère une réponse pour un agent avec son system prompt
   * @param {ChatMessage[]} messages - Les messages de l'utilisateur et du système
   * @param {ModelProvider} provider - Le fournisseur de modèle (huggingface ou openai)
   * @param {string} [modelName] - Le nom du modèle à utiliser (facultatif)
   * @returns {Promise<string>} - La réponse de l'agent
   */
  async chat(
    messages: ChatMessage[],
    provider: ModelProvider = 'huggingface',
    modelName?: string,
  ): Promise<string> {
    this.logger.log(`Using provider: ${provider}, model: ${modelName || 'default'}`);

    if (provider === 'openai') {
      return this.openAIService.chat(messages, modelName || 'gpt-4o-mini');
    }

    return this.huggingFaceService.chat(
      messages,
      modelName || 'mistralai/Mistral-7B-Instruct-v0.2',
    );
  }

  /**
   * Génère une réponse pour un agent avec son system prompt
   */
  async generateAgentResponse(
    userMessage: string,
    systemPrompt: string,
    provider: ModelProvider = 'huggingface',
    modelName?: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return this.chat(messages, provider, modelName);
  }

  /**
   * Génère une image avec DALL-E 3
   */
  async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
    quality: 'standard' | 'hd' = 'standard',
  ): Promise<string | null> {
    return this.openAIService.generateImage(prompt, size, quality);
  }
}
