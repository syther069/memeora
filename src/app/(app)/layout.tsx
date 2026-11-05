import * as React from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { AppSessionGuard } from '@/components/auth/app-session-guard';
import { AppShell } from '@/components/layout/app-shell';
import { LedgerProvider } from '@/components/layout/ledger-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppSessionGuard>
        <LedgerProvider>
          <AppShell>{children}</AppShell>
        </LedgerProvider>
      </AppSessionGuard>
    </ToastProvider>
  );
}
