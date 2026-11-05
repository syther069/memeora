'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';
import { ModeSwitcher } from './mode-switcher';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

/** App frame. During first-run setup there is no navigation: setup comes first. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode } = useAppSession();

  if (pathname === '/onboarding') {
    return (
      <div className="min-h-screen app-mesh-canvas text-[var(--ink-body)]">
        <main id="main-content" className="w-full px-4 py-10 sm:px-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen app-mesh-canvas text-[var(--ink-body)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-[var(--brand-deep-current)] text-white px-5 py-2.5 rounded-full font-bold shadow-[var(--shadow-hero)] transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--brand-bright-current)]"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-7xl w-full mx-auto pb-28 lg:pb-14 focus:outline-none"
        >
          <ModeSwitcher className="mb-6 w-full max-w-xs lg:hidden" />
          {/* A workspace switch remounts the page, so it loads that workspace's data. */}
          <React.Fragment key={mode}>{children}</React.Fragment>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
