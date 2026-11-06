import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Animated links, adapted from Skiper 40 by Skiper UI (https://skiper-ui.com/v1/skiper40).
 * Free version, attribution is shown in the site footers.
 *
 * Changes from the source: real focus states as well as hover, one component with
 * variants, and the rise and fill links use a brand colour behind the text instead
 * of a white mix-blend-difference block, which turned orange on royal blue.
 */
type Variant = 'slide' | 'grow' | 'center' | 'rise' | 'fill';

const LINE = "before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:h-[0.07em] before:min-h-px before:w-full before:bg-current before:content-[''] before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:before:transition-none hover:before:scale-x-100 focus-visible:before:scale-x-100";
const BLOCK = "isolate px-2 before:pointer-events-none before:absolute before:left-0 before:-z-10 before:w-full before:bg-[var(--ink-inverse)] before:content-[''] before:transition-all before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:before:transition-none transition-colors duration-300 motion-reduce:transition-none hover:text-[var(--brand-blue)] focus-visible:text-[var(--brand-blue)]";

const VARIANTS: Record<Variant, string> = {
  slide: `${LINE} before:origin-right hover:before:origin-left focus-visible:before:origin-left`,
  grow: `${LINE} before:origin-left hover:before:origin-right focus-visible:before:origin-right`,
  center: `${LINE} before:origin-center`,
  rise: `${BLOCK} before:bottom-0 before:h-0 hover:before:h-full focus-visible:before:h-full`,
  fill: `${BLOCK} before:top-0 before:h-full before:origin-left before:scale-x-0 hover:before:scale-x-100 focus-visible:before:scale-x-100`,
};

function Arrow() {
  return (
    <svg data-link-arrow aria-hidden fill="none" viewBox="0 0 10 10" className="ml-[0.3em] size-[0.55em] shrink-0 translate-y-1 opacity-0 transition-all duration-300 group-hover/link:translate-y-0 group-hover/link:opacity-100 group-focus-visible/link:translate-y-0 group-focus-visible/link:opacity-100 motion-reduce:transition-none">
      <path d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnimatedLink({ href, variant = 'slide', arrow, className, children }: { href: string; variant?: Variant; arrow?: boolean; className?: string; children: ReactNode }) {
  const classes = cn('group/link relative inline-flex w-fit items-center', VARIANTS[variant], className);
  if (/^https?:/.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{children}{arrow !== false && <Arrow />}</a>;
  }
  if (href.startsWith('#')) return <a href={href} className={classes}>{children}{arrow && <Arrow />}</a>;
  return <Link href={href} className={classes}>{children}{arrow && <Arrow />}</Link>;
}
