'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const memberId   = useAuthStore((s) => s.memberId);
  const fetchFamily = useFamilyStore((s) => s.fetchFamily);
  const family      = useFamilyStore((s) => s.family);

  // Lance l'initialisation de la session au montage
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Dès que memberId est disponible (session immédiate ou restaurée via onAuthStateChange),
  // charge les données famille si elles ne sont pas encore là
  useEffect(() => {
    if (memberId && !family) {
      fetchFamily();
    }
  }, [memberId, family, fetchFamily]);

  return <>{children}</>;
}
