export type EventCategory = 'school' | 'vacation' | 'birthday' | 'appointment' | 'sport' | 'meal' | 'family' | 'other';
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly' | null;

export class Event {
  id: string;
  family_id: string | null;
  user_id: string | null;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  reminder_minutes: number | null;
  recurrence: Recurrence;
  category: EventCategory | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}
