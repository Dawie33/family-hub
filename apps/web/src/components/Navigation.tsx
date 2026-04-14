'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/',          label: 'Tableau de bord', mobileLabel: 'Accueil',   icon: '🏠' },
  { href: '/calendar',  label: 'Agenda',          mobileLabel: 'Agenda',    icon: '📅' },
  { href: '/agent',     label: 'Assistant IA',    mobileLabel: 'Assistant', icon: '💬' },
  { href: '/recipes',   label: 'Repas',           mobileLabel: 'Repas',     icon: '🍽️' },
  { href: '/lists',     label: 'Listes',          mobileLabel: 'Listes',    icon: '🗂️' },
  { href: '/settings',  label: 'Paramètres',      mobileLabel: 'Réglages',  icon: '⚙️' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Top navbar — desktop */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <span
              className="text-xl font-bold"
              style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}
            >
              Family<span style={{ color: '#4784EC' }}>Hub</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: '#4784EC' } : {}}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Droite : settings + user */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/settings"
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              ⚙️ Paramètres
            </Link>
            {user && (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: isActive ? '#4784EC' : '#999999' }}
                >
                  {item.mobileLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
