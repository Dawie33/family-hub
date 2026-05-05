'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useFamilyStore } from '@/stores/familyStore';
import { EventCategory } from '@/lib/supabase';

const TYPE_COLORS: Record<EventCategory, string> = {
  school:      '#4784EC',
  vacation:    '#6CC8C1',
  birthday:    '#DC2626',
  appointment: '#7C3AED',
  sport:       '#16A34A',
  meal:        '#FFBB72',
  family:      '#F59E0B',
  other:       '#999999',
};


export default function RightPanel() {
  const { events, fetchEvents } = useFamilyStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((ev) => new Date(ev.start_date.slice(0, 10) + 'T00:00:00') >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  return (
    <aside
      className="hidden xl:flex flex-col fixed top-14 right-0 bottom-0 z-40 w-72 border-l overflow-y-auto"
      style={{ backgroundColor: '#fff', borderColor: '#EBEBEB' }}
    >
      {/* Header */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#EBEBEB' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#32325D' }}>
          Prochains événements
        </h2>
      </div>

      {/* Liste */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {upcoming.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-xs" style={{ color: '#999' }}>Aucun événement à venir</p>
          </div>
        ) : (
          upcoming.map((ev) => {
            const date = new Date(ev.start_date.slice(0, 10) + 'T00:00:00');
            const day = date.getDate();
            const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
            const color = TYPE_COLORS[ev.category] ?? '#4784EC';
            return (
              <div key={ev.id} className="flex items-center gap-3 py-2">
                <div
                  className="w-10 h-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center gap-0"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-base font-bold leading-none text-white">
                    {day}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#32325D' }}>
                    {ev.title}
                  </p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: '#999' }}>
                    {weekday} · Toute la journée
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lien calendrier */}
      <div className="px-5 py-4 border-t" style={{ borderColor: '#EBEBEB' }}>
        <Link
          href="/calendar"
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: '#4784EC' }}
        >
          Aller au calendrier →
        </Link>
      </div>

      {/* Section derniers éléments de liste */}
      <div className="border-t" style={{ borderColor: '#EBEBEB' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#EBEBEB' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#32325D' }}>
            Derniers éléments de liste
          </h2>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-xs mb-3" style={{ color: '#999' }}>
            Aucun élément récent
          </p>
          <Link
            href="/lists"
            className="text-xs font-semibold"
            style={{ color: '#4784EC' }}
          >
            Voir les listes →
          </Link>
        </div>
      </div>
    </aside>
  );
}
