export class Briefing {
  id: number;
  briefing_date: string;
  category: string;
  title: string;
  content: string;
  icon: string;
  agent_name: string | null;
  agent_id: number | null;
  status: 'pending' | 'running' | 'completed' | 'error';
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
