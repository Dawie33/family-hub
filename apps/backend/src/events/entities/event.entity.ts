export type EventCategory = 'rdv' | 'tache' | 'rappel' | 'anniversaire' | 'autre';
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly' | null;

export class Event {
  id: number;
  user_id: number | null;
  title: string;
  description: string | null;
  start_date: Date;
  end_date: Date | null;
  all_day: boolean;
  location: string | null;
  reminder_minutes: number | null;
  recurrence: Recurrence;
  category: EventCategory | null;
  created_at: Date;
  updated_at: Date;
}
