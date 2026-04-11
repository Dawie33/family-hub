import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { ChatMessage } from './types';

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);
  private client: InferenceClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    this.client = new InferenceClient(apiKey?.trim());
  }

 /**
* Génère une réponse pour une conversation en utilisant l'API de complétion de chat HuggingFace.
* @param {ChatMessage[]} messages - Les messages de l'utilisateur et du système.
* @param {string} [modelName] - Le nom du modèle à utiliser (par défaut : 'meta-llama/Llama-3.2-3B-Instruct').
* @returns {Promise<string>} - La réponse de l'agent.
*/
  async chat(
    messages: ChatMessage[],
    modelName: string = 'meta-llama/Llama-3.2-3B-Instruct',
  ): Promise<string> {
    try {
      const response = await this.client.chatCompletion({
        model: modelName,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`HuggingFace API error: ${error.message}`);
      throw error;
    }
  }
}
