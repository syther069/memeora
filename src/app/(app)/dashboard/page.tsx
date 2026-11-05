'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';

/** "Overview" means the active workspace's overview. */
export default function DashboardRedirect() {
  const { mode } = useAppSession();
  const router = useRouter();

  React.useEffect(() => {
    router.replace(`/${mode}`);
  }, [mode, router]);

  return <p role="status" className="py-10 text-center text-sm text-[var(--ink-muted)]">Opening your overview…</p>;
}
