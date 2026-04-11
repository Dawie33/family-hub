export interface TrainingSession {
  id: string;
  workout_id?: string;
  personalized_workout_id?: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  notes?: string;
  results?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joint depuis workouts
  workout_name?: string;
  // Champs calculés pour l'affichage
  name: string;
  date: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  type: string;
  completed: boolean;
}

export class TrainingNotLinkedError extends Error {
  constructor() { super('NOT_LINKED'); }
}

export async function getTrainingSessions(limit = 10): Promise<TrainingSession[]> {
  const response = await fetch(`/api/training/sessions?limit=${limit}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'NOT_LINKED' || data.code === 'TOKEN_EXPIRED') {
      throw new TrainingNotLinkedError();
    }
    throw new Error(data.error ?? 'Erreur Training-Camp');
  }

  const data = await response.json();
  const rows = data.rows ?? data;

  return rows.map((s: TrainingSession) => ({
    ...s,
    name: s.workout_name || 'Séance',
    date: s.started_at,
    duration: s.completed_at
      ? Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)
      : 0,
    intensity: 'medium' as const,
    type: 'Workout',
    completed: !!s.completed_at,
  }));
}

function getMockSessions(): TrainingSession[] {
  const today = new Date();
  return [
    {
      id: '1',
      user_id: 'mock',
      started_at: today.toISOString(),
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
      workout_name: 'Upper Body',
      name: 'Upper Body',
      date: today.toISOString(),
      duration: 45,
      intensity: 'medium',
      type: 'Strength',
      completed: false,
    },
    {
      id: '2',
      user_id: 'mock',
      started_at: new Date(today.getTime() + 86400000).toISOString(),
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
      workout_name: 'HIIT Cardio',
      name: 'HIIT Cardio',
      date: new Date(today.getTime() + 86400000).toISOString(),
      duration: 30,
      intensity: 'high',
      type: 'Cardio',
      completed: false,
    },
    {
      id: '3',
      user_id: 'mock',
      started_at: new Date(today.getTime() + 172800000).toISOString(),
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
      workout_name: 'Lower Body',
      name: 'Lower Body',
      date: new Date(today.getTime() + 172800000).toISOString(),
      duration: 50,
      intensity: 'high',
      type: 'Strength',
      completed: false,
    },
  ];
}
