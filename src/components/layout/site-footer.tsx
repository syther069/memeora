import Link from 'next/link';

/** A quiet line that says what the product stands on. Only links that exist. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--ink-muted)]">
        <p>Memeora keeps your records. It is not a bank or a financial adviser.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4">
          <Link href="/verification" className="hit hover:text-[var(--ink-primary)] hover:underline">On-chain proof</Link>
          <a href="https://docs.wal.app/walrus-memory" target="_blank" rel="noopener noreferrer" className="hit hover:text-[var(--ink-primary)] hover:underline">Walrus Memory</a>
          <a href="https://docs.tatum.io/" target="_blank" rel="noopener noreferrer" className="hit hover:text-[var(--ink-primary)] hover:underline">Tatum</a>
        </nav>
      </div>
    </footer>
  );
}
