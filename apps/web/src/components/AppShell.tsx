'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

const NO_SHELL_ROUTES = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_SHELL_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Sidebar gauche */}
      <Sidebar />

      {/* Contenu principal */}
      <main
        className="flex-1 overflow-y-auto pb-20 lg:pb-0"
        style={{ marginLeft: 0 }}
      >
        {/* Décalage desktop pour la sidebar fixe */}
        <div className="lg:ml-56 xl:mr-72">
          {children}
        </div>
      </main>

      {/* Panneau droit */}
      <RightPanel />
    </div>
  );
}
