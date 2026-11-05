import Link from 'next/link';
import { ArrowRight } from 'iconoir-react';
import { BrandMark } from '@/components/layout/brand-mark';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <section className="w-full max-w-md text-center">
        <BrandMark className="mx-auto" />
        <p className="mt-6 text-6xl font-bold tracking-tight tabular-nums text-[var(--brand-blue)]">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink-primary)]">This page is not in the ledger</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">The address may be mistyped, or the page has moved. Your records are safe.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand-blue)] px-5 text-sm font-semibold text-[var(--ink-inverse)] transition-colors hover:bg-[var(--brand-blue-hover)]">
          Go to your overview<ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
