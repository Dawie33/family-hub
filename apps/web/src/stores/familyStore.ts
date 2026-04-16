'use client';

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuthStore } from '@/stores/authStore';
import { Family, CalendarEvent } from '@/lib/supabase';

interface FamilyState {
  family: Family | null;
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;

  fetchFamily: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  events: [],
  isLoading: false,
  error: null,

  fetchFamily: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createSupabaseBrowserClient();

      // Utilise le memberId déjà chargé par authStore
      const memberId = useAuthStore.getState().memberId;
      console.log('[fetchFamily] memberId=', memberId);

      if (!memberId) {
        console.warn('[fetchFamily] memberId non disponible');
        return set({ isLoading: false });
      }

      // Récupère le family_id depuis ce membre
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('id, family_id, name, role')
        .eq('id', memberId)
        .single();

      console.log('[fetchFamily] member=', member, 'error=', memberError);

      if (memberError || !member?.family_id) {
        console.warn('[fetchFamily] famille non trouvée', memberError);
        return set({ isLoading: false });
      }

      // Charge la famille
      const { data: familyRow, error: familyError } = await supabase
        .from('families')
        .select('id, name')
        .eq('id', member.family_id)
        .single();

      if (familyError || !familyRow) {
        console.warn('[fetchFamily] erreur famille', familyError);
        return set({ isLoading: false });
      }

      // Charge tous les membres de la famille
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, role, color, avatar_url')
        .eq('family_id', member.family_id);

      set({
        family: {
          id: familyRow.id,
          name: familyRow.name,
          members: (members ?? []).map((m) => ({
            id: m.id,
            name: m.name ?? 'Membre',
            role: (m.role === 'admin' || m.role === 'member') ? 'parent' : 'child',
            avatar: m.avatar_url,
          })),
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('[fetchFamily]', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createSupabaseBrowserClient();
      const familyId = get().family?.id;

      let query = supabase.from('family_events').select('*').order('start_date', { ascending: true });
      if (familyId) query = query.eq('family_id', familyId);

      const { data, error } = await query;
      if (error) throw error;
      set({ events: data as CalendarEvent[], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addEvent: async (event) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createSupabaseBrowserClient();
      const { memberId } = useAuthStore.getState();
      const familyId = get().family?.id ?? null;

      const { data, error } = await supabase
        .from('family_events')
        .insert({
          ...event,
          family_id: familyId,
          created_by: memberId ?? null,
          all_day: event.all_day ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Ajoute l'événement dans le store immédiatement
      set((state) => ({
        events: [...state.events, data as CalendarEvent],
        isLoading: false,
      }));

      // Synchro Google Calendar (best-effort) — met à jour google_event_id dans le store après
      fetch('/api/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseEventId: data.id,
          title: data.title,
          start_date: data.start_date,
          end_date: data.end_date,
          all_day: data.all_day,
          description: data.description,
          location: data.location,
        }),
      }).then(async (res) => {
        if (!res.ok) return;
        const { google_event_id } = await res.json() as { google_event_id?: string };
        if (!google_event_id) return;
        // Met à jour le store avec le google_event_id pour que la suppression fonctionne
        set((state) => ({
          events: state.events.map((ev) =>
            ev.id === data.id ? { ...ev, google_event_id } : ev
          ),
        }));
      }).catch(() => {});
    } catch (error) {
      console.error('[addEvent]', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createSupabaseBrowserClient();

      // Récupère le google_event_id avant suppression
      const eventToDelete = get().events.find((ev) => ev.id === id);

      const { error, count } = await supabase
        .from('family_events')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;
      if (count === 0) throw new Error('Suppression refusée — vérifie les permissions Supabase');

      // Supprime aussi dans Google Calendar si l'événement y est synchronisé
      const googleEventId = (eventToDelete as (CalendarEvent & { google_event_id?: string }) | undefined)?.google_event_id;
      if (googleEventId) {
        fetch(`/api/google/events?googleEventId=${googleEventId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      set((state) => ({
        events: state.events.filter((ev) => ev.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error('[deleteEvent]', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
