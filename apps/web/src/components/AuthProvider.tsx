'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const fetchFamily = useFamilyStore((s) => s.fetchFamily);

  useEffect(() => {
    initialize().then(() => fetchFamily());
  }, [initialize, fetchFamily]);

  return <>{children}</>;
}
