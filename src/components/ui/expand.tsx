'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { NavArrowDown } from 'iconoir-react';
import { cn } from '@/lib/utils';

/**
 * Original Memeora expands. The way an open row parts from its group takes its idea
 * from the Skiper 103 preview (https://skiper-ui.com/v1/skiper103). Its source is
 * paid and was not used.
 */
const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 } as const;

function Panel({ id, open, children }: { id: string; open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div key="panel" id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** One line that opens what sits under it, such as a table behind a chart. */
export function Expand({ label, className, summaryClassName, children }: { label: string; className?: string; summaryClassName?: string; children: React.ReactNode }) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  return (
    <MotionConfig reducedMotion="user">
      <div className={className}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className={cn('hit flex w-fit cursor-pointer items-center gap-1 font-semibold text-[var(--brand-blue)]', summaryClassName)}>
          {label}
          <NavArrowDown aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
        </button>
        <Panel id={id} open={open}>{children}</Panel>
      </div>
    </MotionConfig>
  );
}

/** A group of rows. An open row parts from its neighbours and the others stay joined. */
export function ExpandGroup({ items, className }: { items: { title: string; body: React.ReactNode }[]; className?: string }) {
  const baseId = React.useId();
  const [openRows, setOpenRows] = React.useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number) => setOpenRows((current) => {
    const next = new Set(current);
    if (!next.delete(index)) next.add(index);
    return next;
  });

  return (
    <MotionConfig reducedMotion="user">
      <ul className={className}>
        {items.map((item, index) => {
          const open = openRows.has(index);
          const parted = index > 0 && (open || openRows.has(index - 1));
          const roundTop = index === 0 || parted;
          const roundBottom = index === items.length - 1 || open || openRows.has(index + 1);
          return (
            <motion.li
              key={item.title}
              layout="position"
              animate={{ marginTop: parted ? 10 : 0, borderTopLeftRadius: roundTop ? 22 : 0, borderTopRightRadius: roundTop ? 22 : 0, borderBottomLeftRadius: roundBottom ? 22 : 0, borderBottomRightRadius: roundBottom ? 22 : 0 }}
              initial={false}
              transition={SPRING}
              className="overflow-hidden bg-[var(--surface-card)]"
            >
              <h3>
                <button type="button" aria-expanded={open} aria-controls={`${baseId}-${index}`} onClick={() => toggle(index)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-lg font-semibold text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface-hover)] sm:px-6">
                  {item.title}
                  <NavArrowDown aria-hidden className={cn('h-5 w-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')} />
                </button>
              </h3>
              <Panel id={`${baseId}-${index}`} open={open}>
                <div className="max-w-3xl px-5 pb-5 text-base leading-relaxed text-[var(--ink-body)] sm:px-6">{item.body}</div>
              </Panel>
            </motion.li>
          );
        })}
      </ul>
    </MotionConfig>
  );
}
