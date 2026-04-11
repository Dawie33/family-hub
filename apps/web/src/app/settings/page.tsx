'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const INTEGRATIONS = [
  {
    key: 'google',
    icon: '📅',
    label: 'Google Calendar',
    description: 'Synchroniser vos événements',
    color: '#4784EC',
    bg: '#EFF4FD',
  },
  {
    key: 'training',
    icon: '💪',
    label: 'Training Camp',
    description: 'Suivi des entraînements',
    color: '#6CC8C1',
    bg: '#EDF9F8',
  },
  {
    key: 'recipe',
    icon: '🍽️',
    label: 'Recipe AI',
    description: 'Planification des repas',
    color: '#FFBB72',
    bg: '#FFF7EE',
  },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const searchParams = useSearchParams();

  const [connected, setConnected] = useState<Record<string, boolean>>({
    google: false,
    training: false,
    recipe: true,
  });
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleFeedback, setGoogleFeedback] = useState<'success' | 'error' | null>(null);

  // Charge l'état réel des intégrations
  useEffect(() => {
    fetch('/api/training/status')
      .then((r) => r.json())
      .then((d) => { if (d.linked) setConnected((p) => ({ ...p, training: true })); })
      .catch(() => {});

    fetch('/api/google/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.linked) {
          setConnected((p) => ({ ...p, google: true }));
          setGoogleEmail(d.email ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const [googleErrorMsg, setGoogleErrorMsg] = useState<string | null>(null);

  // Feedback après retour OAuth
  useEffect(() => {
    const result = searchParams.get('google');
    if (result === 'success') {
      setGoogleFeedback('success');
      setConnected((p) => ({ ...p, google: true }));
    } else if (result === 'error') {
      setGoogleFeedback('error');
      setGoogleErrorMsg(searchParams.get('msg'));
    }
  }, [searchParams]);

  // Formulaire liaison Training-Camp
  const [showTcForm, setShowTcForm] = useState(false);
  const [tcEmail, setTcEmail] = useState('');
  const [tcPassword, setTcPassword] = useState('');
  const [tcLoading, setTcLoading] = useState(false);
  const [tcError, setTcError] = useState<string | null>(null);

  const toggle = async (key: string) => {
    if (key === 'google') {
      if (!connected.google) {
        // Redirige vers le flux OAuth Google
        window.location.href = '/api/auth/google';
      } else {
        await fetch('/api/google/status', { method: 'DELETE' });
        setConnected((p) => ({ ...p, google: false }));
        setGoogleEmail(null);
      }
      return;
    }
    if (key === 'training') {
      if (!connected.training) {
        setShowTcForm(true);
      } else {
        await fetch('/api/training/link', { method: 'DELETE' });
        setConnected((p) => ({ ...p, training: false }));
      }
      return;
    }
    setConnected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLinkTrainingCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTcLoading(true);
    setTcError(null);
    try {
      const res = await fetch('/api/training/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tcEmail, password: tcPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTcError(data.error || 'Erreur de connexion');
      } else {
        setConnected((prev) => ({ ...prev, training: true }));
        setShowTcForm(false);
        setTcEmail('');
        setTcPassword('');
      }
    } catch {
      setTcError('Erreur réseau');
    } finally {
      setTcLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
          Paramètres
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999' }}>Connexions et préférences</p>
      </div>

      {/* Feedback OAuth Google */}
      {googleFeedback === 'success' && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
          Google Calendar connecté avec succès {googleEmail ? `(${googleEmail})` : ''}
        </div>
      )}
      {googleFeedback === 'error' && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          <p className="font-bold">La connexion Google a échoué.</p>
          {googleErrorMsg && <p className="mt-1 font-mono text-xs">{googleErrorMsg}</p>}
        </div>
      )}

      {/* Intégrations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Intégrations</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {INTEGRATIONS.map(({ key, icon, label, description, color, bg }) => (
            <div key={key} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: bg }}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#32325D' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#999' }}>
                    {key === 'google' && connected.google && googleEmail ? googleEmail : description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggle(key)}
                className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                style={
                  connected[key]
                    ? { backgroundColor: '#DCFCE7', color: '#16A34A' }
                    : { backgroundColor: '#F7F8FA', color: '#999' }
                }
              >
                {connected[key] ? 'Connecté' : 'Connecter'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire liaison Training-Camp */}
      {showTcForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Lier Training-Camp</h2>
            <button onClick={() => setShowTcForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <form onSubmit={handleLinkTrainingCamp} className="px-5 py-4 space-y-4">
            <p className="text-xs" style={{ color: '#999' }}>
              Entrez vos identifiants Training-Camp pour synchroniser vos séances.
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Email Training-Camp</label>
              <input
                type="email"
                value={tcEmail}
                onChange={(e) => setTcEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                style={{ color: '#32325D' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>Mot de passe Training-Camp</label>
              <input
                type="password"
                value={tcPassword}
                onChange={(e) => setTcPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                style={{ color: '#32325D' }}
              />
            </div>
            {tcError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{tcError}</p>}
            <button
              type="submit"
              disabled={tcLoading}
              className="w-full py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#6CC8C1' }}
            >
              {tcLoading ? 'Connexion...' : 'Lier mon compte'}
            </button>
          </form>
        </div>
      )}

      {/* Compte */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>Compte connecté</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F7F8FA' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: '#4784EC' }}>
              {user?.email?.[0].toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#32325D' }}>{user?.email}</p>
              <p className="text-xs" style={{ color: '#999' }}>Connecté via Supabase</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-full text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* À propos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>À propos</h2>
        </div>
        <div className="px-5 py-4 space-y-1">
          <p className="text-xs" style={{ color: '#999' }}>Version 1.0.0</p>
          <p className="text-xs" style={{ color: '#999' }}>Family Hub — Hub familial pour gérer sport, repas et activités</p>
        </div>
      </div>

    </div>
  );
}
