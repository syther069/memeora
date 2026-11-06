import { cn } from '@/lib/utils';

/** Memeora's logo. On royal blue surfaces use tone="cream", as a blue tile would disappear there. Keep in step with src/app/icon.svg. */
export function BrandMark({ className, tone = 'blue' }: { className?: string; tone?: 'blue' | 'cream' }) {
  const [tile, ink] = tone === 'blue' ? ['var(--brand-blue)', 'var(--brand-cream)'] : ['var(--brand-cream)', 'var(--brand-blue)'];
  return (
    <span aria-hidden className={cn('grid h-10 w-10 shrink-0 place-items-center', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <rect width="100" height="100" rx="24" fill={tile} />
        <g fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 60V27l26 26 26-26v33" />
          <path d="M24 77h41" />
        </g>
        <circle cx="76" cy="77" r="4.5" fill={ink} />
      </svg>
    </span>
  );
}
