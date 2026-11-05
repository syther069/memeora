import { cn } from '@/lib/utils';

/** Memeora's mark: an M resting on a ledger rule, with a dot for the memory it keeps. */
export function BrandMark({ className, tone = 'blue' }: { className?: string; tone?: 'blue' | 'cream' }) {
  const ground = tone === 'blue' ? 'bg-[var(--brand-blue)] text-[var(--brand-cream)]' : 'bg-[var(--brand-cream)] text-[var(--brand-blue)]';
  return (
    <span aria-hidden className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)]', ground, className)}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16V5l8 8 8-8v11" />
        <path d="M4 21h11" />
        <circle cx="20" cy="21" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
