'use client';

import { useState } from 'react';
import { Camera, CalendarPlus, CheckSquare, MapPin, Film, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const POST_ACTIONS = [
  { Icon: Camera,      label: 'Photo/Vidéo', color: '#4784EC', bg: '#EFF4FD' },
  { Icon: CalendarPlus,label: 'Événement',   color: '#DC2626', bg: '#FEE2E2' },
  { Icon: CheckSquare, label: 'À faire',     color: '#16A34A', bg: '#DCFCE7' },
  { Icon: MapPin,      label: 'Je suis là',  color: '#0891B2', bg: '#CFFAFE' },
  { Icon: Film,        label: 'GIF',         color: '#7C3AED', bg: '#EDE9FE' },
];

const FILTER_OPTIONS = ['Messages', 'Photos', 'Événements', 'À faire'];
const SORT_OPTIONS   = ['Date de modification (par défaut)', 'Date de création', 'Popularité'];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('Messages');
  const [sort, setSort]     = useState('Date de modification (par défaut)');

  const initiale = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Zone de publication */}
      <div className="bg-white rounded-xl border mb-4" style={{ borderColor: '#EBEBEB' }}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: '#4784EC' }}
            >
              {initiale}
            </div>
            <div
              className="flex-1 rounded-full px-4 py-2.5 text-sm select-none"
              style={{ backgroundColor: '#F7F8FA', color: '#BBBBBB' }}
            >
              Exprimez-vous…
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: '#EBEBEB' }} />

        <div className="px-3 py-2.5 flex items-center gap-1 flex-wrap">
          {POST_ACTIONS.map(({ Icon, label, color, bg }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50"
              style={{ color: '#585858' }}
            >
              <span
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon size={12} strokeWidth={2} style={{ color }} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Barre filtre / tri */}
      <div className="flex items-center justify-between mb-5">
        <div className="relative flex items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none text-sm font-semibold rounded-lg border px-3 py-1.5 pr-7 bg-white cursor-pointer"
            style={{ borderColor: '#EBEBEB', color: '#32325D' }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2" style={{ color: '#999' }} />
        </div>

        <div className="relative flex items-center">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none text-xs rounded-lg border px-3 py-1.5 pr-7 bg-white cursor-pointer"
            style={{ borderColor: '#EBEBEB', color: '#585858' }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2" style={{ color: '#999' }} />
        </div>
      </div>

      {/* État vide */}
      <div className="text-center py-16 px-6">
        <div className="relative inline-block mb-5">
          <span className="text-7xl leading-none select-none">📖</span>
          <span
            className="absolute -bottom-1 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xl font-bold shadow"
            style={{ backgroundColor: '#4784EC' }}
          >
            +
          </span>
        </div>
        <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#AAAAAA' }}>
          Votre mur est vide pour le moment. Vous pouvez dès maintenant partager vos premières
          photos et évènements ou inviter vos proches à rejoindre votre Famille.
        </p>
      </div>

    </div>
  );
}
