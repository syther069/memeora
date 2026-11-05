'use client';

import { ErrorScreen } from '@/components/layout/error-screen';

/** Keeps the navigation on screen, so one failing page does not take the app with it. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
