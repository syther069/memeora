'use client';

import * as React from 'react';
import { ArrowRight, NavArrowLeft } from 'iconoir-react';
import { IntegrationLogo } from '@/components/brand/integration-logo';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface Slide {
  title: string;
  /** Shown beside the title when the slide is about that integration. */
  logo?: 'walrus' | 'sui';
  /** A real screen, captured with a throwaway wallet and sample data. */
  image?: { src: string; alt: string };
  points: string[];
}

const SLIDES: Slide[] = [
  {
    title: 'What Memeora does',
    image: { src: '/guide/overview.jpg', alt: 'The Personal overview, with money left over, a budget gauge, saved rules and a six-month chart.' },
    points: [
      'Memeora keeps your income, spending, budgets and goals, and adds them up exactly.',
      'You save the rules you want followed, and the Assistant applies them when you ask about your money.',
      'It only knows what you record. It cannot see your bank balance, and it is not a financial adviser.',
    ],
  },
  {
    title: 'Choose Personal or Business',
    image: { src: '/guide/business.jpg', alt: 'The Business overview, with profit, runway, spend limit and monthly revenue and expenses.' },
    points: [
      'Personal is for daily spending, crypto and saving. Business adds revenue, burn, runway, clients and vendors, and CSV export.',
      'Each has its own transactions, budget, goals and memories. Use the switch at any time.',
      'Runway uses a cash figure you enter. Memeora does not read your bank or wallet balance.',
    ],
  },
  {
    title: 'Record your transactions',
    image: { src: '/guide/transactions.jpg', alt: 'The Transactions page, with add and import buttons, filters and a list of entries.' },
    points: [
      'Select Add transaction on an overview or on Transactions, or press N.',
      'Import from Sui wallet reads your transactions from Sui. Token, amount and date come from the chain, and you confirm the value. Past values use today’s rate, so they are marked as estimates.',
      'For other chains, enter the hash and amount yourself. These stay marked “Not verified, added by you”.',
    ],
  },
  {
    title: 'Set a budget and goals',
    image: { src: '/guide/budgets.jpg', alt: 'The Budgets and goals page, with a monthly budget bar and a savings goal.' },
    points: [
      'Set a monthly limit, and Memeora compares it with what you have recorded.',
      'Add a goal with a target date, and the Assistant counts this month’s share when you ask about a purchase.',
    ],
  },
  {
    title: 'Save rules with Walrus Memory',
    logo: 'walrus',
    image: { src: '/guide/memory.jpg', alt: 'The Memory page, with the memory switch and a list of saved rules.' },
    points: [
      'Nothing is stored until you turn memory on and save something. Only the text you save goes to Walrus, encrypted. Your transactions do not.',
      'Your memories guide advice. They are not your financial records: those stay in Memeora’s database, which is what all sums use.',
      'First use: your wallet creates its own Walrus account and approves Memeora’s key, with no gas fee to you. That key can read your memories until you remove it.',
      'Hide a memory at any time. Deleting it from Walrus needs your wallet and a small SUI fee, and copies in caches can last a while.',
    ],
  },
  {
    title: 'Ask the Assistant',
    image: { src: '/guide/assistant.jpg', alt: 'The Assistant page, showing a question, an answer, the figures used and the memory it followed.' },
    points: [
      'Ask something like “Can I afford this?”. The sums are worked out by the server, and AI only explains them.',
      'Each answer shows the figures, which memories it used, and whether they came from Walrus or from Memeora’s saved list.',
      'If Walrus or the AI model is unavailable, you still get an answer from your exact figures, and it says so.',
    ],
  },
  {
    title: 'Check it on Sui',
    logo: 'sui',
    image: { src: '/guide/proof.jpg', alt: 'The On-chain proof page, with memory checks and live Sui Mainnet checks.' },
    points: [
      'On-chain proof reads Sui Mainnet through Tatum and checks each memory’s Walrus object against what Memeora recorded.',
      'This proves the memory is stored and in your namespace. It cannot prove what the text says, because it is encrypted.',
    ],
  },
  {
    title: 'Your first five minutes',
    points: [
      '1. Add a transaction, or import one from your Sui wallet.',
      '2. Set a budget.',
      '3. Turn on memory and save one rule.',
      '4. Ask the Assistant a question, and see the rule in its answer.',
      '5. Open On-chain proof and verify your memory.',
      'Tip: press Ctrl K (Cmd K on a Mac) to reach any action from anywhere.',
    ],
  },
];

/** A step-by-step guide. Modal supplies the focus trap, Escape, close button and phone sheet. */
export function GuideDialog({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = React.useState(0);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const moved = React.useRef(false);
  const [failedImages, setFailedImages] = React.useState<ReadonlySet<string>>(new Set());

  const goTo = React.useCallback((next: number) => {
    moved.current = true;
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  }, []);

  // Tells keyboard and screen-reader users the slide changed.
  React.useEffect(() => {
    if (!moved.current) return;
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    // Back to the top of the dialog, so the title and close button are in view.
    const panel = heading?.closest<HTMLElement>('[tabindex="-1"].overflow-y-auto');
    if (panel) panel.scrollTop = 0;
  }, [index]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(index + 1);
      if (event.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goTo, index]);

  return (
    <Modal isOpen onClose={onClose} title="How to use Memeora" className="sm:max-w-3xl">
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium tabular-nums text-[var(--ink-secondary)]">Step {index + 1} of {SLIDES.length}</p>
          <div className="flex gap-1">
            {SLIDES.map((item, dot) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goTo(dot)}
                aria-label={`Go to step ${dot + 1}: ${item.title}`}
                aria-current={dot === index ? 'step' : undefined}
                className="group flex-1 cursor-pointer py-2"
              >
                <span className={cn('block h-1.5 rounded-full transition-colors group-hover:bg-[var(--brand-blue-bright)]', dot <= index ? 'bg-[var(--brand-blue)]' : 'bg-[var(--surface-sunken)]')} />
              </button>
            ))}
          </div>
        </div>

        <div key={slide.title} className="[animation:page-enter_200ms_var(--ease-out)]">
          <h3 ref={headingRef} tabIndex={-1} className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[var(--ink-primary)] focus:outline-none">{slide.logo && <IntegrationLogo name={slide.logo} size={26} decorative />}{slide.title}</h3>
          {slide.image && (
            <figure className="mt-3">
              {failedImages.has(slide.image.src)
                ? <p className="grid aspect-[8/5] w-full place-items-center rounded-[var(--radius-md)] border border-[var(--border-card)] bg-[var(--surface-sunken)] p-4 text-center text-sm text-[var(--ink-secondary)]">This picture could not be loaded. The steps below are still correct.</p>
                : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fixed screenshots with a reserved aspect ratio */}
                    <img src={slide.image.src} alt={slide.image.alt} width={1280} height={800} className="aspect-[8/5] w-full rounded-[var(--radius-md)] border border-[var(--border-card)] bg-[var(--surface-sunken)] object-cover object-top" onError={() => setFailedImages((failed) => new Set(failed).add(slide.image!.src))} />
                  </>
                )}
              <figcaption className="mt-1 text-xs text-[var(--ink-muted)]">Sample data, not a real account. The sample memories shown were not written to Walrus.</figcaption>
            </figure>
          )}
          <ul className="mt-3 space-y-2">
            {slide.points.map((point) => <li key={point} className="text-sm leading-relaxed text-[var(--ink-secondary)]">{point}</li>)}
          </ul>
        </div>

        {/* Stays in view on short screens, so moving on never needs a scroll first. */}
        <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-3 sm:-mx-7 sm:px-7">

          <Button type="button" variant="ghost" allowRepeatClicks disabled={index === 0} onClick={() => goTo(index - 1)} leftIcon={<NavArrowLeft className="h-4 w-4" />}>Previous step</Button>
          {isLast
            ? <Button type="button" variant="primary" onClick={onClose}>Finish guide</Button>
            : <Button type="button" variant="primary" allowRepeatClicks onClick={() => goTo(index + 1)} rightIcon={<ArrowRight className="h-4 w-4" />}>Next step</Button>}
        </div>
      </div>
    </Modal>
  );
}
