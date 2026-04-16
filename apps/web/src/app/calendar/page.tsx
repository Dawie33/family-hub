'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { useFamilyStore } from '@/stores/familyStore';
import { EventCategory } from '@/lib/supabase';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  school:      '#4784EC',
  vacation:    '#6CC8C1',
  birthday:    '#DC2626',
  appointment: '#7C3AED',
  sport:       '#16A34A',
  meal:        '#FFBB72',
  family:      '#F59E0B',
  other:       '#999999',
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  school:      'École',
  vacation:    'Vacances',
  birthday:    'Anniversaire',
  appointment: 'Rendez-vous',
  sport:       'Sport',
  meal:        'Repas',
  family:      'Famille',
  other:       'Autre',
};

interface GoogleRawEvent {
  id: string;
  summary?: string;
  start: { date?: string; dateTime?: string };
}

export default function CalendarPage() {
  const { family, events, fetchEvents, fetchFamily, addEvent, deleteEvent } = useFamilyStore();
  const [googleEvents, setGoogleEvents] = useState<{
    id: string; title: string; start: string;
    backgroundColor: string; borderColor: string;
    extendedProps: { source: string };
  }[]>([]);
  const [googleLinked, setGoogleLinked] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [form, setForm] = useState<{ title: string; category: EventCategory; description: string; time: string; allDay: boolean }>({
    title: '',
    category: 'other',
    description: '',
    time: '09:00',
    allDay: false,
  });
  const [saving, setSaving] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<{
    id: string; title: string; category: EventCategory; date: string; source: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!family) fetchFamily().catch(() => {});
    fetchEvents();
  }, [family, fetchFamily, fetchEvents]);

  function loadGoogleEvents(year: number, month: number) {
    fetch(`/api/google/events?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((items) => {
        if (!Array.isArray(items)) return;
        setGoogleLinked(true);
        setGoogleEvents(items.map((item: GoogleRawEvent) => ({
          id: `google-${item.id}`,
          title: item.summary ?? '(sans titre)',
          start: (item.start.date ?? item.start.dateTime ?? '').slice(0, 10),
          backgroundColor: '#4784EC',
          borderColor: '#4784EC',
          extendedProps: { source: 'google' },
        })));
      })
      .catch(() => {});
  }

  useEffect(() => {
    const now = new Date();
    loadGoogleEvents(now.getFullYear(), now.getMonth());
  }, []);

  const localEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: ev.start_date.slice(0, 10),
    end: ev.end_date ? ev.end_date.slice(0, 10) : undefined,
    backgroundColor: CATEGORY_COLORS[ev.category] ?? '#999',
    borderColor: CATEGORY_COLORS[ev.category] ?? '#999',
    extendedProps: { source: 'local', category: ev.category, description: ev.description },
  }));

  // Exclut les events Google qui sont déjà présents comme événements locaux (synchro bidirectionnelle)
  const syncedGoogleIds = new Set(
    events
      .map((ev) => (ev as CalendarEvent & { google_event_id?: string }).google_event_id)
      .filter(Boolean)
  );
  const filteredGoogleEvents = googleEvents.filter(
    (gev) => !syncedGoogleIds.has(gev.id.replace('google-', ''))
  );

  const allEvents = [...localEvents, ...filteredGoogleEvents];

  async function handleDeleteEvent() {
    if (!selectedEvent) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(selectedEvent.id);
      setSelectedEvent(null);
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    // new Date('YYYY-MM-DDTHH:mm:ss') est interprété comme heure locale par le navigateur
    // .toISOString() le convertit ensuite en UTC pour Supabase
    const startDate = form.allDay
      ? selectedDate
      : new Date(`${selectedDate}T${form.time}:00`).toISOString();
    await addEvent({
      title: form.title,
      category: form.category,
      description: form.description,
      start_date: startDate,
      end_date: startDate,
    });
    setForm({ title: '', category: 'other', description: '', time: '09:00', allDay: false });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Agenda
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            Calendrier familial
            {googleLinked && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8F0FE', color: '#4784EC' }}>
                + Google
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setSelectedDate(new Date().toISOString().slice(0, 10)); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: '#4784EC' }}
        >
          <span className="text-base leading-none">+</span> Événement
        </button>
      </div>

      {/* FullCalendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={frLocale}
          events={allEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          height="auto"
          selectable={true}
          dateClick={(info) => {
            setSelectedDate(info.dateStr);
            setShowForm(true);
          }}
          eventClick={(info) => {
            const source = info.event.extendedProps.source as string;
            if (source === 'google') return; // pas de suppression pour les events Google
            setSelectedEvent({
              id: info.event.id,
              title: info.event.title,
              category: (info.event.extendedProps.category as EventCategory) ?? 'other',
              date: info.event.startStr.slice(0, 10),
              source,
            });
          }}
          datesSet={(info) => {
            const mid = new Date((info.start.getTime() + info.end.getTime()) / 2);
            loadGoogleEvents(mid.getFullYear(), mid.getMonth());
          }}
          eventContent={(arg) => {
            const isGoogle = arg.event.extendedProps.source === 'google';
            return (
              <div className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden">
                <span className="text-xs">{isGoogle ? '📆' : '•'}</span>
                <span className="text-xs font-medium truncate text-white">{arg.event.title}</span>
              </div>
            );
          }}
          dayCellClassNames="cursor-pointer hover:bg-blue-50"
          buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine' }}
        />
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(CATEGORY_COLORS) as [EventCategory, string][]).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs" style={{ color: '#999' }}>{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4784EC' }} />
          <span className="text-xs" style={{ color: '#999' }}>Google Calendar</span>
        </div>
      </div>

      {/* Modal détail / suppression */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSelectedEvent(null); setDeleteError(null); } }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Détail de l&apos;événement</h2>
              <button onClick={() => { setSelectedEvent(null); setDeleteError(null); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[selectedEvent.category] }}
                />
                <p className="text-sm font-semibold" style={{ color: '#32325D' }}>{selectedEvent.title}</p>
              </div>
              <p className="text-xs" style={{ color: '#999' }}>
                {CATEGORY_LABELS[selectedEvent.category]} · {new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="w-full py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#DC2626' }}
              >
                {deleting ? 'Suppression...' : 'Supprimer cet événement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Nouvel événement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAddEvent} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Nom de l'événement"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  style={{ color: '#32325D' }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value as EventCategory }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  style={{ color: '#32325D' }}
                >
                  {(Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm(f => ({ ...f, allDay: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-xs font-semibold" style={{ color: '#585858' }}>Journée entière</span>
                </label>
              </div>
              {!form.allDay && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Heure</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                    style={{ color: '#32325D' }}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Note (optionnel)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Détails supplémentaires"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  style={{ color: '#32325D' }}
                />
              </div>
              <p className="text-xs" style={{ color: '#999' }}>
                Date : {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#4784EC' }}
              >
                {saving ? 'Enregistrement...' : "Ajouter l'événement"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
