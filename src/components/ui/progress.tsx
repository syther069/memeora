import { cn } from '@/lib/utils';

/** A ruled, hatched progress bar. Past 100% it turns to the danger hatch, and always has a label. */
export function ProgressBar({ percent, label, className }: { percent: number; label: string; className?: string }) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div role="progressbar" aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn('h-3 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${width}%`, backgroundImage: percent > 100 ? 'var(--hatch-danger)' : 'var(--hatch-blue)' }}
      />
    </div>
  );
}
