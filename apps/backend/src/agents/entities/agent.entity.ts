export type ModelProvider = 'openai' | 'huggingface';

export class Agent {
  id: string;
  /** Identifiant technique (ex: "chercheur_web") */
  name: string;
  /** Nom d'affichage (ex: "Chercheur Web") */
  label: string;
  description: string | null;
  system_prompt: string;
  category: string | null;
  is_active: boolean;
  model_provider: ModelProvider;
  model_name: string;
  voice_enabled: boolean;
  created_at: Date;
}
