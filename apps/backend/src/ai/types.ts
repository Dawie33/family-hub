export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ModelProvider = 'openai' | 'huggingface';
