'use client';

import type { ReactElement, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Tooltip with a border arrow, adapted from Skiper 101 by Skiper UI
 * (https://skiper-ui.com/v1/skiper101). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: Memeora tokens, a short delay, and its entrance lives
 * in globals.css. A tooltip only ever repeats a control's accessible name, so the
 * button keeps its own aria-label and works on touch without it.
 */
function TipArrow() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden className="ml-px -mt-px">
      <path d="M10.3356 7.39793L15.1924 3.02682C15.9269 2.36577 16.8801 2 17.8683 2H20V0H0V2H1.4651C2.4532 2 3.4064 2.36577 4.1409 3.02682L8.9977 7.39793C9.378 7.7402 9.9553 7.74021 10.3356 7.39793Z" fill="var(--surface-elevated)" />
      <path d="M9.6667 6.65461L14.5235 2.28352C15.4416 1.45721 16.6331 1 17.8683 1H20V2H17.8683C16.8801 2 15.9269 2.36577 15.1924 3.02682L10.3356 7.39793C9.9553 7.74021 9.378 7.7402 8.9977 7.39793L4.1409 3.02682C3.4064 2.36577 2.4532 2 1.4651 2H0V1H1.4651C2.7002 1 3.8917 1.45722 4.8099 2.28352L9.6667 6.65461Z" fill="var(--border-strong)" />
    </svg>
  );
}

export function Tooltip({ label, side = 'top', children }: { label: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactElement }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={2} collisionPadding={8} className="tip z-[80] w-fit max-w-64 text-balance rounded-[var(--radius-xs)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] outline outline-1 outline-[var(--border-strong)]">
            {label}
            <TooltipPrimitive.Arrow asChild><span><TipArrow /></span></TooltipPrimitive.Arrow>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
