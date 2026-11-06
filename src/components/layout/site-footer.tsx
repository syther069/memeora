import { AnimatedLink } from '@/components/ui/animated-link';
import { IntegrationLogo } from '@/components/brand/integration-logo';

/** A quiet line that says what the product stands on. Only links that exist. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--ink-muted)]">
        <p>Memeora keeps your records. It is not a bank or a financial adviser.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4">
          <AnimatedLink href="/verification" className="hit gap-1.5 hover:text-[var(--ink-primary)]"><IntegrationLogo name="sui" size={14} decorative />On-chain proof</AnimatedLink>
          <AnimatedLink href="https://docs.wal.app/walrus-memory" variant="grow" className="hit gap-1.5 hover:text-[var(--ink-primary)]"><IntegrationLogo name="walrus" size={14} decorative />Walrus Memory</AnimatedLink>
          <AnimatedLink href="https://docs.tatum.io/" className="hit hover:text-[var(--ink-primary)]">Tatum</AnimatedLink>
        </nav>
      </div>
    </footer>
  );
}
