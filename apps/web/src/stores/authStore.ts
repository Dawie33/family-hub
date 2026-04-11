'use client';

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  memberId: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  memberId: null,
  isLoading: true,

  initialize: async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    let memberId: string | null = null;
    if (user) {
      const { data } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id)
        .single();
      memberId = data?.id ?? null;
    }

    set({ user, memberId, isLoading: false });

    // Écoute les changements de session
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      let mid: string | null = null;
      if (currentUser) {
        const { data } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        mid = data?.id ?? null;
      }
      set({ user: currentUser, memberId: mid });
    });
  },

  signIn: async (email, password) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    set({ user: null, memberId: null });
  },
}));
