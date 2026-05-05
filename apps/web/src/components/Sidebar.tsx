'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Calendar, Gift, List, Wallet, FolderOpen, Clock,
  Utensils, Dumbbell, Mail, MessageCircle, Images, Users,
  Settings, HelpCircle, LogOut, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';

interface NavItem { href: string; Icon: LucideIcon; label: string }

const NAV_ITEMS: NavItem[] = [
  { href: '/',          Icon: Home,           label: 'Activité' },
  { href: '/calendar',  Icon: Calendar,       label: 'Calendrier' },
  { href: '/birthdays', Icon: Gift,           label: 'Anniversaires' },
  { href: '/lists',     Icon: List,           label: 'Listes' },
  { href: '/budget',    Icon: Wallet,         label: 'Budget' },
  { href: '/documents', Icon: FolderOpen,     label: 'Documents' },
  { href: '/schedule',  Icon: Clock,          label: 'Emploi du temps' },
  { href: '/recipes',   Icon: Utensils,       label: 'Repas' },
  { href: '/training',  Icon: Dumbbell,       label: 'Sport' },
  { href: '/emails',    Icon: Mail,           label: 'Emails' },
  { href: '/agent',     Icon: MessageCircle,  label: 'Messages' },
  { href: '/gallery',   Icon: Images,         label: 'Galerie' },
  { href: '/directory', Icon: Users,          label: 'Répertoire' },
  { href: '/settings',  Icon: Settings,       label: 'Paramètres' },
  { href: '/help',      Icon: HelpCircle,     label: 'Aide' },
];

const MOBILE_ITEMS: NavItem[] = [
  { href: '/',         Icon: Home,          label: 'Accueil' },
  { href: '/calendar', Icon: Calendar,      label: 'Agenda' },
  { href: '/lists',    Icon: List,          label: 'Listes' },
  { href: '/recipes',  Icon: Utensils,      label: 'Repas' },
  { href: '/agent',    Icon: MessageCircle, label: 'Messages' },
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
        className="hidden lg:flex flex-col fixed top-14 left-0 bottom-0 z-40 w-56 border-r"
        style={{ backgroundColor: '#fff', borderColor: '#EBEBEB' }}
      >
        {/* Logo / famille */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#EBEBEB' }}>
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
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
          {NAV_ITEMS.map(({ href, Icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: '#EFF4FD', color: '#4784EC' }
                    : { color: '#555', backgroundColor: 'transparent' }
                }
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#F7F8FA';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={17} className="flex-shrink-0" strokeWidth={1.75} />
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
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-semibold transition-colors"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              <LogOut size={13} strokeWidth={2} />
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
          {MOBILE_ITEMS.map(({ href, Icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
              >
                <Icon
                  size={22}
                  strokeWidth={1.75}
                  style={{ color: isActive ? '#4784EC' : '#999' }}
                />
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
