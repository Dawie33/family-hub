'use client';

import { useEffect, useState } from 'react';
import { getTrainingSessions, TrainingNotLinkedError, TrainingSession } from '@/lib/trainingCampApi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

const INTENSITY_CONFIG = {
  high:   { label: 'Intense',  bg: '#FEE2E2', color: '#DC2626' },
  medium: { label: 'Modéré',  bg: '#FEF9C3', color: '#CA8A04' },
  low:    { label: 'Léger',   bg: '#DCFCE7', color: '#16A34A' },
};

export default function TrainingScreen() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    getTrainingSessions(20)
      .then(setSessions)
      .catch((err) => {
        if (err instanceof TrainingNotLinkedError) {
          setNotLinked(true);
        } else {
          setApiError(err?.message ?? 'Erreur inconnue');
          console.error('[training page]', err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const completed = sessions.filter((s) => s.completed).length;

  if (notLinked) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Entraînements
          </h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center space-y-4">
          <p className="text-5xl">💪</p>
          <p className="font-semibold text-sm" style={{ color: '#32325D' }}>
            Compte Training-Camp non lié
          </p>
          <p className="text-xs" style={{ color: '#999' }}>
            Connectez votre compte Training-Camp pour voir vos séances ici.
          </p>
          <Link
            href="/settings"
            className="inline-block px-6 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: '#6CC8C1' }}
          >
            Lier mon compte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
          Entraînements
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999' }}>Vos séances Training-Camp</p>
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          <span className="font-bold">Erreur : </span>{apiError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: sessions.length, label: 'Séances',   color: '#4784EC', bg: '#EFF4FD' },
          { value: totalMinutes,    label: 'Minutes',   color: '#6CC8C1', bg: '#EDF9F8' },
          { value: completed,       label: 'Terminées', color: '#FFBB72', bg: '#FFF7EE' },
        ].map(({ value, label, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: bg }}>
            <p className="text-2xl font-bold" style={{ color, fontFamily: 'Nunito, sans-serif' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: '#999' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Liste des séances */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: '#EDF9F8' }}>
            💪
          </span>
          <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Séances récentes</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center" style={{ color: '#999' }}>
            <p className="text-4xl mb-2">🏋️</p>
            <p className="text-sm">Aucune séance enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map((session) => {
              const intensity = INTENSITY_CONFIG[session.intensity] ?? INTENSITY_CONFIG.medium;
              return (
                <div key={session.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: '#EDF9F8' }}>
                      🏋️
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#32325D' }}>{session.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#999' }}>
                        {format(new Date(session.date), 'EEEE d MMMM', { locale: fr })}
                        {session.duration > 0 && ` • ${session.duration} min`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: intensity.bg, color: intensity.color }}>
                      {intensity.label}
                    </span>
                    {session.completed && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
