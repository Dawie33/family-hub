import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  avatar?: string;
}

export type EventCategory = 'school' | 'vacation' | 'birthday' | 'appointment' | 'sport' | 'meal' | 'family' | 'other';

export interface CalendarEvent {
  id: string;
  family_id?: string;
  title: string;
  description?: string;
  category: EventCategory;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  assigned_member_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
