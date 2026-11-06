import type { CSSProperties, ReactNode } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { ArrowRight, Brain, Building, Database, GraphUp, User, Wallet } from 'iconoir-react';
import { IntegrationLogo } from '@/components/brand/integration-logo';
import { AffordDemo } from '@/components/landing/afford-demo';
import { CardStack } from '@/components/landing/card-stack';
import { ExpandCards } from '@/components/landing/expand-cards';
import { FrameZoom } from '@/components/landing/frame-zoom';
import { Drift, PointerStage, Recede } from '@/components/landing/motion';
import { ParallaxGallery } from '@/components/landing/parallax-gallery';
import { Preloader } from '@/components/landing/preloader';
import { RemembersList } from '@/components/landing/remembers-list';
import { Reveal } from '@/components/landing/reveal';
import { SmoothScroll } from '@/components/landing/smooth-scroll';
import { WhereList } from '@/components/landing/where-list';
import { BrandMark } from '@/components/layout/brand-mark';
import { AnimatedLink } from '@/components/ui/animated-link';
import { linkButtonClass } from '@/components/ui/button';
import { ExpandGroup } from '@/components/ui/expand';
import assistant from '../../public/guide/assistant.jpg';
import budgets from '../../public/guide/budgets.jpg';
import business from '../../public/guide/business.jpg';
import memory from '../../public/guide/memory.jpg';
import overview from '../../public/guide/overview.jpg';
import proof from '../../public/guide/proof.jpg';
import transactions from '../../public/guide/transactions.jpg';

const SHOT_WIDTH = 1280;
const HEADING = 'text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em]';
const WORDMARK = 'Memeora';

/** Marks a part of a section, and its place in the order the section arrives. */
const rise = (order: number) => ({ 'data-rise': true, style: { '--i': order } as CSSProperties });

/** A real part of a Memeora screen, cut from a 1280 px capture without stretching it. */
function Crop({ src, x, y, w, h, alt }: { src: StaticImageData; x: number; y: number; w: number; h: number; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" style={{ aspectRatio: `${w} / ${h}` }}>
      <Image
        src={src}
        alt={alt}
        sizes="(max-width: 768px) 200vw, 1280px"
        placeholder="blur"
        className="absolute max-w-none"
        style={{ width: `${(SHOT_WIDTH / w) * 100}%`, height: 'auto', left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
      />
    </div>
  );
}

/** A crop scaled to the space left in a flex column, so it never overflows or stretches. */
function FitCrop(props: Parameters<typeof Crop>[0]) {
  return (
    <div className="min-h-0 flex-1 [container-type:size]">
      <div style={{ width: `min(100cqw, calc(100cqh * ${props.w / props.h}))` }}><Crop {...props} /></div>
    </div>
  );
}

/** A whole screen filling its frame, past the navigation rail when the frame is narrow. */
function Shot({ src, alt, position = '30% 0%' }: { src: StaticImageData; alt: string; position?: string }) {
  return <Image src={src} alt={alt} fill sizes="(max-width: 768px) 200vw, 100vw" placeholder="blur" className="object-cover" style={{ objectPosition: position }} />;
}

function ScreenCard({ caption, tilt, order = 0, from, className, children }: { caption: string; tilt: string; order?: number; from?: string; className?: string; children: ReactNode }) {
  return (
    <figure className={`landing-card rounded-[var(--radius-md)] bg-[var(--surface-elevated)] p-2 ${className ?? ''}`} style={{ '--tilt': tilt, '--i': order, '--from': from } as CSSProperties}>
      {children}
      <figcaption className="px-1 pb-1 pt-2 text-center text-sm font-semibold text-[var(--ink-primary)]">{caption}</figcaption>
    </figure>
  );
}

function LogoCard({ name, caption, tilt, order }: { name: 'walrus' | 'sui'; caption: string; tilt: string; order: number }) {
  return (
    <ScreenCard caption={caption} tilt={tilt} order={order}>
      <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]"><IntegrationLogo name={name} size={72} /></div>
    </ScreenCard>
  );
}

/** One hero card's place: its own drift on scroll and its own depth under the pointer. */
function HeroSpot({ speed, depth, className, children }: { speed: number; depth: string; className: string; children: ReactNode }) {
  return <Drift speed={speed} className={`landing-float ${className}`} style={{ '--depth': depth } as CSSProperties}>{children}</Drift>;
}

/** Large flat circles, one tone step from the blue ground, each drifting at its own pace. */
const SCALLOPS = [
  { left: '6%', top: '2%', width: '30rem', speed: 0.05 },
  { left: '92%', top: '3%', width: '34rem', speed: 0.09 },
  { left: '0%', top: '30%', width: '36rem', speed: -0.04 },
  { left: '100%', top: '62%', width: '44rem', speed: -0.07 },
  { left: '10%', top: '97%', width: '32rem', speed: -0.03 },
];

const WHERE_THINGS_LIVE = [
  {
    mark: <span className="grid h-12 w-12 place-items-center rounded-[22%] bg-[var(--surface-card)] text-[var(--brand-blue)]"><Database aria-hidden className="h-6 w-6" /></span>,
    title: 'Your records stay in your private ledger',
    body: 'Transactions, budgets and goals live in Memeora’s database, separate for each wallet. Every sum comes from here.',
    shot: <Shot src={transactions} alt="" position="45% 0%" />,
  },
  {
    mark: <IntegrationLogo name="walrus" size={48} decorative />,
    title: 'Your rules are kept on Walrus',
    body: 'Only what you choose to save goes there, encrypted, in an account your wallet owns. Nothing is stored until you turn memory on. Rules guide advice and never replace your records.',
    shot: <Shot src={memory} alt="" position="45% 0%" />,
  },
  {
    mark: <IntegrationLogo name="sui" size={48} decorative />,
    title: 'You can check them on Sui',
    body: 'On-chain proof reads Sui Mainnet through Tatum and compares each memory’s Walrus object with what Memeora recorded. It shows a memory is stored. It cannot show what the encrypted text says.',
    shot: <Shot src={proof} alt="" position="45% 0%" />,
  },
];

const EXAMPLE_RULES = [
  'to keep $300 untouched.',
  'that rent comes first.',
  'to ask before anything over $500.',
  'that you get paid on the 1st.',
  'to save for a trip in March.',
  'that payroll comes before tools.',
  'to hold six months of runway.',
];

const STACK = [
  { id: 'overview', title: 'Overview', body: 'What is left this month, and the rules being followed.', shot: <Shot src={overview} alt="The overview, with money left this month, spending and saved rules, in sample figures." /> },
  { id: 'transactions', title: 'Transactions', body: 'Add by hand, or import from your Sui wallet.', shot: <Shot src={transactions} alt="The Transactions page, with add and import buttons, filters and sample entries." /> },
  { id: 'budgets', title: 'Budgets and goals', body: 'Your monthly limit and what you are saving for.', shot: <Shot src={budgets} alt="The Budgets and goals page, with a monthly budget and savings goals, in sample figures." /> },
  { id: 'assistant', title: 'Assistant', body: 'Answers from your records and the rules you saved.', shot: <Shot src={assistant} alt="The Assistant answering a question, with the exact sums it used, in sample figures." /> },
  { id: 'memory', title: 'Memory', body: 'Your saved rules, and a choice over each one.', shot: <Shot src={memory} alt="The Memory page, listing saved rules in sample text." /> },
];

const WORKSPACES = [
  {
    id: 'personal',
    icon: <User aria-hidden className="h-7 w-7" />,
    title: 'Personal',
    hint: 'Your own ledger',
    detail: <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4"><p className="max-w-lg text-base leading-relaxed">Everyday income and spending, your monthly budget and your savings goals.</p><FitCrop src={overview} x={300} y={132} w={386} h={270} alt="Money left over this month, in sample figures." /></div>,
  },
  {
    id: 'business',
    icon: <Building aria-hidden className="h-7 w-7" />,
    title: 'Business',
    hint: 'Revenue and profit',
    detail: <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4"><p className="max-w-lg text-base leading-relaxed">A separate ledger with clients, vendors and invoice references, and a monthly spend limit.</p><FitCrop src={business} x={300} y={132} w={386} h={310} alt="Business profit, revenue and expenses for the month, in sample figures." /></div>,
  },
  {
    id: 'runway',
    icon: <GraphUp aria-hidden className="h-7 w-7" />,
    title: 'Runway',
    hint: 'Burn and months left',
    detail: <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4"><p className="max-w-lg text-base leading-relaxed">Worked out from your own records and a cash figure you enter.</p><FitCrop src={business} x={702} y={132} w={305} h={310} alt="Months of runway, monthly burn and cash held, in sample figures." /></div>,
  },
  {
    id: 'memories',
    icon: <Brain aria-hidden className="h-7 w-7" />,
    title: 'Memories',
    hint: 'A separate set for each',
    detail: <p className="mt-3 max-w-lg text-base leading-relaxed">Each workspace saves to its own Walrus namespace, and the Assistant answers from the one you are in. A business rule never shapes your personal advice, or the other way round.</p>,
  },
];

const QUESTIONS = [
  { title: 'Is Memeora a bank?', body: 'No. It keeps your records and answers questions about them. It does not hold your money, and a purchase fitting your budget is not financial advice.' },
  { title: 'Do I need a wallet?', body: 'Not to look around. You sign in with a Sui wallet when you want to keep your own records.' },
  { title: 'What gets saved to Walrus?', body: 'Only the memories you choose to save, encrypted, after you turn memory on. Your transactions stay in your private ledger.' },
  { title: 'What if Walrus or Tatum is down?', body: 'Your records, budgets and goals keep working, because they live in Memeora’s own database. Saving memories and on-chain proof come back when the service does.' },
  { title: 'Can it verify other chains?', body: 'No. Memeora reads Sui through Tatum. Transactions you add from other chains stay marked as not verified.' },
];

const SITEMAP = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/memory', label: 'Memory' },
  { href: '/verification', label: 'Proof' },
];

export default function LandingPage() {
  return (
    <div className="landing relative overflow-clip bg-[var(--brand-blue)] text-[var(--ink-body)]">
      <Preloader />
      <SmoothScroll />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SCALLOPS.map(({ speed, ...circle }) => <Drift key={circle.left + circle.top} speed={speed} className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-blue-hover)]" style={circle} />)}
      </div>

      <Recede className="relative mx-auto max-w-[90rem] px-3 pt-[calc(0.75rem+var(--safe-top))] sm:px-6 sm:pt-6">
        <div className="relative rounded-[var(--radius-xl)] bg-[var(--surface-base)] px-4 pb-10 sm:px-8">
          <header className="flex items-center justify-between gap-3 py-4 sm:py-6">
            <Link href="/" className="flex items-center gap-2.5 rounded-[var(--radius-sm)]">
              <BrandMark />
              <span className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">Memeora</span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
              <AnimatedLink href="#ask" variant="center" className="hit mx-3 hidden py-1 text-sm font-medium text-[var(--ink-primary)] md:inline-flex">Ask before you buy</AnimatedLink>
              <AnimatedLink href="#where" variant="center" className="hit mx-3 hidden py-1 text-sm font-medium text-[var(--ink-primary)] md:inline-flex">Where it lives</AnimatedLink>
              <Link href="/sign-in" className={linkButtonClass('primary', 'sm')}><Wallet aria-hidden className="h-4 w-4" />Connect a wallet</Link>
            </nav>
          </header>

          <PointerStage className="landing-hero relative mx-auto max-w-[78rem] lg:min-h-[47rem]">
            <div className="relative z-10 mx-auto max-w-5xl pb-10 pt-8 text-center lg:pt-56">
              <h1 className="lines text-[clamp(2.35rem,6.4vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--ink-primary)]">
                <span className="line"><span data-line style={{ '--i': 0 } as CSSProperties}>Money advice that</span></span>{' '}
                <span className="line"><span data-line style={{ '--i': 1 } as CSSProperties}>remembers your rules.</span></span>
              </h1>
              <p className="landing-load mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-body)]" style={{ '--d': '380ms' } as CSSProperties}>Record what you earn and spend, save the rules you want followed, and ask before you buy. The sums are exact, and your rules come with you.</p>
              <div className="landing-load mt-8 flex flex-wrap justify-center gap-3" style={{ '--d': '460ms' } as CSSProperties}>
                <Link href="/dashboard" className={linkButtonClass('primary', 'lg')}>Open the dashboard<ArrowRight aria-hidden className="h-4 w-4" /></Link>
              </div>
              <p className="landing-load mt-4 text-sm text-[var(--ink-secondary)]" style={{ '--d': '520ms' } as CSSProperties}>Look around first. You only need a wallet to keep your own records.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:contents">
              <HeroSpot speed={-0.1} depth="-22px" className="lg:absolute lg:left-0 lg:top-2 lg:w-60"><ScreenCard caption="Exact sums" tilt="-5deg" order={0}><Crop src={overview} x={300} y={132} w={386} h={270} alt="Money left over this month, with income and spending, in sample figures." /></ScreenCard></HeroSpot>
              <HeroSpot speed={-0.06} depth="18px" className="lg:absolute lg:right-0 lg:top-0 lg:w-64"><ScreenCard caption="Rules it follows" tilt="4deg" order={1}><Crop src={overview} x={943} y={132} w={305} h={205} alt="Two saved rules, shown on the overview, in sample text." /></ScreenCard></HeroSpot>
              <HeroSpot speed={-0.03} depth="30px" className="lg:absolute lg:bottom-12 lg:left-8 lg:w-44"><LogoCard name="walrus" caption="Kept on Walrus" tilt="5deg" order={2} /></HeroSpot>
              <HeroSpot speed={-0.08} depth="-14px" className="lg:absolute lg:bottom-16 lg:right-8 lg:w-44"><LogoCard name="sui" caption="Checked on Sui" tilt="-4deg" order={3} /></HeroSpot>
            </div>
            <p className="pt-6 text-center text-sm text-[var(--ink-secondary)] lg:absolute lg:inset-x-0 lg:bottom-0">Screens show sample data, not a real account.</p>
          </PointerStage>
        </div>
      </Recede>

      <section id="ask" className="relative scroll-mt-6 px-4 py-20 sm:px-8 lg:py-32">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="text-[var(--ink-inverse)]">
            <h2 className={HEADING} {...rise(0)}>Ask before you buy.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--ink-on-blue-muted)]" {...rise(1)}>Memeora answers the question you have right now, using your month and the rule you saved. Move the slider to see how the answer changes.</p>
          </div>
          <div {...rise(2)}><AffordDemo /></div>
        </Reveal>
      </section>

      <section aria-label="What Memeora remembers" className="relative bg-[var(--surface-base)] px-4 sm:px-8">
        <RemembersList lead="Memeora remembers" rules={EXAMPLE_RULES} />
        <p className="mx-auto max-w-6xl pb-12 text-sm text-[var(--ink-secondary)]">Examples. You write your own rules, in your own words.</p>
      </section>

      <section className="relative pt-20 lg:pt-32">
        <Reveal className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className={`max-w-2xl text-[var(--ink-inverse)] ${HEADING}`} {...rise(0)}>All your money in one place.</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-on-blue-muted)]" {...rise(1)}>Every screen below shows sample data, not a real account.</p>
        </Reveal>
        <CardStack cards={STACK} />
        <Reveal className="mx-auto mt-10 grid max-w-6xl gap-8 px-4 pb-20 text-base leading-relaxed text-[var(--ink-inverse)] sm:px-8 md:grid-cols-3 lg:pb-32">
          <p {...rise(0)}><strong className="block text-lg">Add it in seconds.</strong> Enter income and spending by hand, or press N from anywhere once you are signed in.</p>
          <p {...rise(1)}><strong className="block text-lg">Bring in your Sui wallet.</strong> Import transactions with the token, amount and date read from the chain.</p>
          <p {...rise(2)}><strong className="block text-lg">Other chains stay honest.</strong> Add them with a hash, and they stay marked as not verified.</p>
        </Reveal>
      </section>

      <section aria-label="Record, remember, ask, verify" className="relative bg-[var(--surface-base)]">
        <FrameZoom shot={<Shot src={overview} alt="The Memeora overview, in sample figures." />}>
          <Link href="/dashboard" className={linkButtonClass('primary', 'lg')}>Open the dashboard<ArrowRight aria-hidden className="h-4 w-4" /></Link>
          <span className="rounded-full bg-[var(--surface-card)] px-3 py-1 text-sm font-medium text-[var(--ink-primary)]">Sample data</span>
        </FrameZoom>
        <Reveal className="px-4 pb-20 pt-8 text-center sm:px-8 lg:pb-32">
          <h2 className="text-[clamp(3rem,11vw,9.5rem)] font-bold leading-[0.92] tracking-[-0.045em] text-[var(--ink-primary)]">
            <span className="block" {...rise(0)}>Record.</span>
            <span className="block" {...rise(1)}>Remember.</span>
            <span className="block" {...rise(2)}>Ask.</span>
            <span className="block text-[var(--brand-blue)]" {...rise(3)}>Verify.</span>
          </h2>
        </Reveal>
      </section>

      <WhereList
        heading={<h2 className={`max-w-3xl ${HEADING}`}>You can see where each thing lives.</h2>}
        items={WHERE_THINGS_LIVE}
      />

      <section className="relative bg-[var(--surface-base)] px-4 py-20 sm:px-8 lg:py-32">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className={`text-[var(--ink-primary)] ${HEADING}`} {...rise(0)}>Keep business and life apart.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--ink-body)]" {...rise(1)}>Personal and Business are separate workspaces, each with its own ledger, budget, goals and memories. Open a card to see what each one keeps.</p>
          </div>
          <div {...rise(2)}><ExpandCards cards={WORKSPACES} /></div>
        </Reveal>
      </section>

      <section aria-label="Screens from the app, in sample data" className="relative">
        <ParallaxGallery />
      </section>

      <section className="relative bg-[var(--surface-base)] px-4 py-20 sm:px-8 lg:py-32">
        <Reveal className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.5fr]">
          <h2 className={`text-[var(--ink-primary)] ${HEADING}`} {...rise(0)}>Frequently asked questions</h2>
          <div {...rise(1)}><ExpandGroup items={QUESTIONS} className="rounded-[var(--radius-lg)]" /></div>
        </Reveal>
      </section>

      <footer className="relative px-4 pb-[calc(2rem+var(--safe-bottom))] pt-20 text-[var(--ink-inverse)] sm:px-8 lg:pt-32">
        <Reveal className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <h2 className={`max-w-3xl ${HEADING}`} {...rise(0)}>See your month, then save your first rule.</h2>
              <div className="mt-8 flex flex-wrap gap-3" {...rise(1)}>
                <Link href="/dashboard" className={linkButtonClass('cream', 'lg')}>Open the dashboard<ArrowRight aria-hidden className="h-4 w-4" /></Link>
                <Link href="/sign-in" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--ink-on-blue-muted)] px-6 text-sm font-semibold transition-colors hover:bg-white/10">Connect a wallet</Link>
              </div>
            </div>
            <nav aria-label="Pages" className="on-blue flex flex-col items-start gap-1 text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight tracking-tight" {...rise(2)}>
              {SITEMAP.map((page) => <AnimatedLink key={page.href} href={page.href} variant="fill" arrow>{page.label}</AnimatedLink>)}
            </nav>
          </div>
          <p aria-hidden className="landing-wordmark mt-16 select-none text-[clamp(4rem,19vw,17rem)] font-bold leading-[0.95] tracking-[-0.05em]">
            {WORDMARK.split('').map((letter, index) => <span key={index} style={{ '--i': index } as CSSProperties}>{letter}</span>)}
          </p>
          <div className="on-blue mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm text-[var(--ink-on-blue-muted)]">
            <p>Memeora keeps your records. It is not a bank or a financial adviser.</p>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <AnimatedLink href="https://github.com/syther069/memora" className="hit">GitHub</AnimatedLink>
              <AnimatedLink href="https://docs.wal.app/walrus-memory" variant="grow" className="hit gap-1.5"><IntegrationLogo name="walrus" size={18} decorative />Walrus Memory</AnimatedLink>
              <AnimatedLink href="https://docs.sui.io/" variant="grow" className="hit gap-1.5"><IntegrationLogo name="sui" size={18} decorative />Sui</AnimatedLink>
              <AnimatedLink href="https://docs.tatum.io/" className="hit">Tatum</AnimatedLink>
            </nav>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}
