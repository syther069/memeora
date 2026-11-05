'use client';

import * as React from 'react';
import Link from 'next/link';
import { Refresh } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from './brand-mark';

/** Shown when a screen fails. The technical detail goes to the console, never onto the page. */
export function ErrorScreen({ error, retry, fullPage }: { error: unknown; retry: () => void; fullPage?: boolean }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={`mx-auto flex w-full max-w-md flex-col items-center px-5 text-center ${fullPage ? 'min-h-dvh justify-center py-10' : 'py-16'}`}>
      <BrandMark />
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--ink-primary)]">This screen could not load</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">Something went wrong on our side. Nothing you saved was lost. Try again, or go back to your overview.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" onClick={retry} leftIcon={<Refresh className="h-4 w-4" />}>Try again</Button>
        {/* A plain link: it must work even if client navigation is what broke. */}
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full border border-[var(--border-pill)] px-4 text-sm font-medium text-[var(--ink-primary)] hover:bg-[var(--surface-hover)]">Go to your overview</Link>
      </div>
    </section>
  );
}
