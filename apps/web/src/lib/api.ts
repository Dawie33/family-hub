const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  agent_id?: string;
  session_id?: string;
  family_id?: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  image?: string;
  pdfUrl?: string;
  conversation_id?: string;
  agent?: {
    id: string;
    name: string;
    label: string;
    category: string;
    icon?: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  label: string;
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || 'Erreur lors de l\'envoi du message');
  }

  return response.json();
}

export async function getAgents(): Promise<Agent[]> {
  const response = await fetch(`${API_BASE_URL}/agents`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des agents');
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : data.value || [];
}
