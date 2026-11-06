'use client';

import * as React from 'react';
import { LayoutGroup, motion, MotionConfig } from 'framer-motion';
import { cn } from '@/lib/utils';

export type DocsSection = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  content: React.ReactNode;
};

const INDICATOR_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;
/** A section is current once its top passes this share of the viewport. */
const ACTIVE_LINE = 0.3;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function currentSection(ids: string[]): string {
  const { scrollHeight } = document.documentElement;
  if (window.scrollY + window.innerHeight >= scrollHeight - 2) return ids[ids.length - 1];
  let current = ids[0];
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element && element.getBoundingClientRect().top <= window.innerHeight * ACTIVE_LINE) current = id;
  }
  return current;
}

/**
 * Follows the scroll position by measuring, so short sections and fast scrolling
 * cannot leave two items fighting. After a click the target stays active until the
 * scroll ends, so the indicator goes straight there.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(ids[0]);
  const clickedTarget = React.useRef<string | null>(null);
  const idsKey = ids.join('|');

  React.useEffect(() => {
    const list = idsKey.split('|');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!clickedTarget.current) setActive(currentSection(list));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Only unlocks: near the page end a clicked short section must stay active until the next scroll.
    const endClick = () => { clickedTarget.current = null; };
    const onHash = () => onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('scrollend', endClick);
    window.addEventListener('wheel', endClick, { passive: true });
    window.addEventListener('touchstart', endClick, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('scrollend', endClick);
      window.removeEventListener('wheel', endClick);
      window.removeEventListener('touchstart', endClick);
    };
  }, [idsKey]);

  const select = React.useCallback((id: string) => {
    clickedTarget.current = id;
    setActive(id);
    // shortcut: browsers without scrollend release after this delay; remove when all support it.
    window.setTimeout(() => { if (clickedTarget.current === id) clickedTarget.current = null; }, 1200);
  }, []);

  return { active, select };
}

function DocsNavigation({ sections, active, onSelect, variant }: { sections: DocsSection[]; active: string; onSelect: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void; variant: 'rail' | 'pills' }) {
  const stripRef = React.useRef<HTMLUListElement>(null);

  // Keeps the active pill in view by moving only the strip, never the page.
  React.useEffect(() => {
    const strip = stripRef.current;
    if (variant !== 'pills' || !strip || strip.offsetParent === null) return;
    const item = strip.querySelector<HTMLElement>('[aria-current="location"]');
    if (item) strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [active, variant]);

  if (variant === 'pills') {
    return (
      <LayoutGroup id="docs-pills">
        <nav aria-label="Documentation sections" className="sticky top-14 z-20 -mx-4 border-b border-[var(--border-subtle)] bg-[var(--surface-base)] sm:-mx-8 lg:hidden">
          <ul ref={stripRef} className="relative flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
            {sections.map((section) => {
              const isActive = section.id === active;
              return (
                <li key={section.id} className="shrink-0">
                  <a href={`#${section.id}`} aria-current={isActive ? 'location' : undefined} onClick={(event) => onSelect(event, section.id)} className={cn('relative flex min-h-10 items-center rounded-full px-4 text-sm transition-colors', isActive ? 'font-medium text-[var(--ink-inverse)]' : 'text-[var(--ink-secondary)]')}>
                    {isActive && <motion.span layoutId="active-indicator" transition={INDICATOR_SPRING} className="absolute inset-0 rounded-full bg-[var(--brand-blue)]" />}
                    <span className="relative">{section.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup id="docs-rail">
      <nav aria-label="Documentation sections" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] self-start overflow-y-auto lg:block">
        <ul className="border-l border-[var(--border-strong)]">
          {sections.map((section) => {
            const isActive = section.id === active;
            return (
              <li key={section.id} className="relative">
                {isActive && <motion.span layoutId="active-indicator" transition={INDICATOR_SPRING} className="absolute -left-[2px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--brand-blue)]" />}
                <a href={`#${section.id}`} aria-current={isActive ? 'location' : undefined} onClick={(event) => onSelect(event, section.id)} className={cn('flex min-h-10 items-center gap-2.5 rounded-r-[var(--radius-xs)] py-2 pl-4 pr-2 text-sm text-[var(--ink-primary)] transition-opacity duration-200 hover:opacity-100 motion-reduce:transition-none', isActive ? 'font-medium opacity-100' : 'opacity-70')}>
                  {section.icon && <span aria-hidden className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{section.icon}</span>}
                  <span className="min-w-0 flex-1">{section.title}</span>
                  {section.badge && <span className="shrink-0 rounded-full bg-[var(--surface-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-blue)]">{section.badge}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </LayoutGroup>
  );
}

/** A document with a scroll-aware section menu: a side rail on desktop, a pill bar on phones. */
export function DocsLayout({ sections }: { sections: DocsSection[] }) {
  const { active, select } = useActiveSection(sections.map((section) => section.id));

  const onSelect = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    select(id);
    window.history.pushState(null, '', `#${id}`);
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    // Keyboard and screen reader users continue reading from the section they chose.
    target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <DocsNavigation sections={sections} active={active} onSelect={onSelect} variant="pills" />
      <div className="grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <DocsNavigation sections={sections} active={active} onSelect={onSelect} variant="rail" />
        <div className="min-w-0 max-w-3xl space-y-16 pt-8 lg:pt-0">
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-32 lg:scroll-mt-24">
              <h2 id={`${section.id}-title`} tabIndex={-1} className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-[var(--ink-primary)] outline-none">
                {section.title}
                {section.badge && <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-0.5 text-xs font-semibold tracking-normal text-[var(--brand-blue)]">{section.badge}</span>}
              </h2>
              <div className="docs-prose mt-4">{section.content}</div>
            </section>
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}
