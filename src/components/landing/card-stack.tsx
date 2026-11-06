'use client';

import * as React from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface StackCard {
  id: string;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/**
 * Screens that stack as you scroll, each one rising over the last as it shrinks and
 * tilts away. Adapted from Skiper 17 (StickyCard_002) by Skiper UI
 * (https://skiper-ui.com/v1/skiper17). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: cards hold a title and a real screen, and pinning starts
 * only from script with motion allowed, so otherwise the cards are a plain column.
 * Cleanup removes this stack's own trigger, where the source killed every
 * ScrollTrigger on the page.
 */
export function CardStack({ cards }: { cards: StackCard[] }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);

  useGSAP(() => {
    const node = stage.current;
    const elements = cardRefs.current;
    if (!node || !elements[0] || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    node.dataset.pinned = 'true';

    gsap.set(elements[0], { y: '0%', scale: 1, rotation: 0 });
    for (let i = 1; i < elements.length; i++) gsap.set(elements[i], { y: '110%', scale: 1, rotation: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: { trigger: node, start: 'top top', end: () => `+=${window.innerHeight * (elements.length - 1)}`, pin: true, scrub: 0.5, invalidateOnRefresh: true },
    });
    for (let i = 0; i < elements.length - 1; i++) {
      timeline.to(elements[i], { scale: 0.7, rotation: 5, duration: 1, ease: 'none' }, i);
      timeline.to(elements[i + 1], { y: '0%', duration: 1, ease: 'none' }, i);
    }
    return () => {
      delete node.dataset.pinned;
    };
  }, { scope: stage });

  return (
    <div ref={stage} className="stack-stage">
      <div className="stack-frame">
        {cards.map((card, index) => (
          <figure key={card.id} ref={(element) => { cardRefs.current[index] = element; }} className="stack-card rounded-[var(--radius-xl)] bg-[var(--surface-card)] p-2 sm:p-3">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 pb-3 pt-2">
              <span className="text-xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-2xl">{card.title}</span>
              <span className="text-sm text-[var(--ink-secondary)] sm:text-base">{card.body}</span>
            </figcaption>
            <div className="stack-shot relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]">{card.shot}</div>
          </figure>
        ))}
      </div>
    </div>
  );
}
