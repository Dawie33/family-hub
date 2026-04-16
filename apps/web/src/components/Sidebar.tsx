'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';

const NAV_ITEMS = [
  { href: '/',           icon: '🏠', label: 'Activité' },
  { href: '/calendar',   icon: '📅', label: 'Calendrier' },
  { href: '/birthdays',  icon: '🎂', label: 'Anniversaires' },
  { href: '/lists',      icon: '📝', label: 'Listes' },
  { href: '/budget',     icon: '💰', label: 'Budget' },
  { href: '/documents',  icon: '📁', label: 'Documents' },
  { href: '/schedule',   icon: '🗓️', label: 'Emploi du temps' },
  { href: '/recipes',    icon: '🍴', label: 'Repas' },
  { href: '/training',   icon: '💪', label: 'Sport' },
  { href: '/emails',     icon: '✉️', label: 'Emails' },
  { href: '/agent',      icon: '💬', label: 'Messages' },
  { href: '/gallery',    icon: '🖼️', label: 'Galerie' },
  { href: '/directory',  icon: '👥', label: 'Répertoire' },
  { href: '/settings',   icon: '⚙️', label: 'Paramètres' },
  { href: '/help',       icon: '❓', label: 'Aide' },
];

const MOBILE_ITEMS = [
  { href: '/',          icon: '🏠', label: 'Accueil' },
  { href: '/calendar',  icon: '📅', label: 'Agenda' },
  { href: '/lists',     icon: '📝', label: 'Listes' },
  { href: '/recipes',   icon: '🍴', label: 'Repas' },
  { href: '/agent',     icon: '💬', label: 'Messages' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const family = useFamilyStore((s) => s.family);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const memberCount = family?.members?.length ?? 0;

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 w-56 border-r"
        style={{ backgroundColor: '#fff', borderColor: '#EBEBEB' }}
      >
        {/* Logo / famille */}
        <div className="px-4 py-5 border-b" style={{ borderColor: '#EBEBEB' }}>
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4784EC, #32325D)' }}
            >
              {family?.name?.[0]?.toUpperCase() ?? 'F'}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
                {family?.name ?? 'Famille'}
              </p>
              <p className="text-xs" style={{ color: '#999' }}>
                {memberCount} membre{memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: '#EFF4FD', color: '#4784EC' }
                    : { color: '#444', backgroundColor: 'transparent' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#F7F8FA';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Utilisateur */}
        {user && (
          <div className="px-3 py-4 border-t" style={{ borderColor: '#EBEBEB' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#4784EC' }}
              >
                {user.email?.[0].toUpperCase() ?? '?'}
              </div>
              <p className="text-xs truncate font-medium" style={{ color: '#32325D' }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-xs py-2 rounded-xl font-semibold transition-colors"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* ── Bottom nav mobile ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ backgroundColor: '#fff', borderColor: '#EBEBEB' }}
      >
        <div className="flex justify-around py-2">
          {MOBILE_ITEMS.map(({ href, icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium" style={{ color: isActive ? '#4784EC' : '#999' }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
