'use client';

import './globals.css';
import { ErrorScreen } from '@/components/layout/error-screen';

/** The last resort, when the root layout itself fails. It replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen error={error} retry={retry} fullPage />
      </body>
    </html>
  );
}
