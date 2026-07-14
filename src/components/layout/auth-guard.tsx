'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { hasPageAccess } from '@/lib/admin-pages';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const firstAllowedPage = user?.allowedPages?.[0];
  const allowed = hasPageAccess(user?.allowedPages ?? [], pathname);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace('/login');
    } else if (!allowed) {
      router.replace(firstAllowedPage ?? '/dashboard');
    }
  }, [hasHydrated, token, allowed, firstAllowedPage, router]);

  // Wait for the persisted store to load; never render admin content unauthenticated
  // or a page this staff member isn't permitted to see.
  if (!hasHydrated || !token || !allowed) return null;

  return <>{children}</>;
}
