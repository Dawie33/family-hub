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

const TYPE_LABELS: Record<EventCategory, string> = {
  school:      'École',
  vacation:    'Vacances',
  birthday:    'Anniversaire',
  appointment: 'Rendez-vous',
  sport:       'Sport',
  meal:        'Repas',
  family:      'Famille',
  other:       'Autre',
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

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
      className="hidden xl:flex flex-col fixed top-0 right-0 bottom-0 z-40 w-72 border-l overflow-y-auto"
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
            const color = TYPE_COLORS[ev.category] ?? '#4784EC';
            return (
              <div key={ev.id} className="flex items-center gap-3 py-2">
                {/* Bloc date coloré */}
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                  style={{ backgroundColor: color + '18' }}
                >
                  <span className="text-base font-bold leading-none" style={{ color }}>
                    {day}
                  </span>
                </div>
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#32325D' }}>
                    {ev.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#999' }}>
                    {formatEventDate(ev.start_date)} · {TYPE_LABELS[ev.category]}
                  </p>
                </div>
                {/* Barre couleur */}
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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

      {/* Section membres */}
      <div className="border-t" style={{ borderColor: '#EBEBEB' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#EBEBEB' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#32325D' }}>
            Membres
          </h2>
        </div>
        <MembersSection />
      </div>
    </aside>
  );
}

function MembersSection() {
  const family = useFamilyStore((s) => s.family);
  const members = family?.members ?? [];

  if (members.length === 0) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-xs" style={{ color: '#999' }}>Aucun membre</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-1.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: '#4784EC' }}
          >
            {m.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#32325D' }}>{m.name}</p>
            <p className="text-xs" style={{ color: '#999' }}>
              {m.role === 'parent' ? 'Parent' : 'Enfant'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
