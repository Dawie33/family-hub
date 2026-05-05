'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import TopHeader from './TopHeader';

const NO_SHELL_ROUTES = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_SHELL_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F7F8FA' }}>
      <TopHeader />

      <Sidebar />

      <main
        className="flex-1 overflow-y-auto pb-20 lg:pb-0 pt-14"
        style={{ marginLeft: 0 }}
      >
        <div className="lg:ml-56 xl:mr-72">
          {children}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
