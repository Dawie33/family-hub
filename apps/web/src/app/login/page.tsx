'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email, password);
    if (err) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #4784EC 0%, #32325D 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🏡</span>
          <h1 className="text-3xl font-bold text-white mt-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Family<span style={{ color: '#FFE100' }}>Hub</span>
          </h1>
          <p className="text-white/70 text-sm mt-1">Votre hub familial</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="font-bold text-lg mb-5" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                style={{ color: '#32325D' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#585858' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                style={{ color: '#32325D' }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#4784EC' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
