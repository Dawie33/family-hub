import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';
import { ChatMessage } from './types';

export interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatWithToolsResult {
  content: string | null;
  functionCalls: FunctionCall[];
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(
    messages: ChatMessage[],
    modelName: string = 'gpt-4o-mini',
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: messages,
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`OpenAI API error: ${(error as Error).message}`);
      throw error;
    }
  }

  async chatStream(
    messages: ChatMessage[],
    modelName: string = 'gpt-4o-mini',
    onToken: (token: string) => void,
  ): Promise<string> {
    try {
      let fullResponse = '';

      const stream = await this.client.chat.completions.create({
        model: modelName,
        messages: messages,
        max_tokens: 1024,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      }

      return fullResponse;
    } catch (error) {
      this.logger.error(`OpenAI streaming error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Chat avec support des outils (function calling)
   */
  async chatWithTools(
    messages: ChatMessage[],
    tools: ChatCompletionTool[],
    modelName: string = 'gpt-4o-mini',
    toolChoice: 'auto' | 'required' | 'none' = 'auto',
  ): Promise<ChatWithToolsResult> {
    try {
      const openaiMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: openaiMessages,
        tools,
        tool_choice: toolChoice,
        max_tokens: 1024,
      });

      const message = response.choices[0]?.message;
      const functionCalls: FunctionCall[] = [];

      if (message?.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            functionCalls.push({
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
            });
          }
        }
      }

      return {
        content: message?.content || null,
        functionCalls,
      };
    } catch (error) {
      this.logger.error(`OpenAI API error with tools: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Génère une image avec DALL-E 3
   * @param prompt - Description de l'image à générer
   * @param size - Taille de l'image (1024x1024, 1792x1024, 1024x1792)
   * @param quality - Qualité (standard ou hd)
   * @returns URL de l'image générée
   */
  async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
    quality: 'standard' | 'hd' = 'standard',
  ): Promise<string | null> {
    try {
      this.logger.log(`Generating image with DALL-E 3: ${prompt.substring(0, 50)}...`);

      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality,
      });

      const imageUrl = response.data[0]?.url;
      if (imageUrl) {
        this.logger.log('Image generated successfully');
        return imageUrl;
      }

      return null;
    } catch (error) {
      this.logger.error(`DALL-E API error: ${(error as Error).message}`);
      return null;
    }
  }
}
