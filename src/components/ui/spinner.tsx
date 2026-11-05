'use client';

import { Dual } from 'loading-dev';

/** The dual spinner from loading.dev. It inherits the text color and respects reduced motion. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Dual size={size} className={className} />;
}
