export type MemoryType = 'preference' | 'fact' | 'constraint' | 'context';

export class AgentMemory {
  id: string;
  session_id: string;
  user_id: string | null;
  memory_type: MemoryType;
  category: string;
  subject: string;
  content: string;
  source_message: string | null;
  confidence: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date | null;
}
