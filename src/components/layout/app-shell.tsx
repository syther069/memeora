'use client';

import * as React from 'react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { GuestView } from '@/components/auth/guest-view';
import { GuideDialog } from '@/components/guide/guide-dialog';
import { CommandMenu } from './command-menu';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { ModeSwitcher } from './mode-switcher';
import { Sidebar } from './sidebar';
import { SiteFooter } from './site-footer';

/** App frame. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, isGuest } = useAppSession();
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-dvh text-[var(--ink-body)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 z-[70] rounded-full bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-[var(--ink-inverse)]">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenCommand={() => setIsCommandOpen(true)} onOpenGuide={() => setIsGuideOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-[calc(6rem+var(--safe-bottom))] pt-2 focus:outline-none sm:px-6 lg:px-8 lg:pb-8">
          <ModeSwitcher className="mb-4 w-full max-w-xs lg:hidden" />
          {/* A workspace switch remounts the page, so it loads that workspace's data. */}
          <React.Fragment key={mode}>
            <React.ViewTransition>{isGuest ? <GuestView /> : children}</React.ViewTransition>
          </React.Fragment>
          <SiteFooter className="mt-8" />
        </main>
      </div>
      <MobileNav />
      <CommandMenu isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} onOpenGuide={() => setIsGuideOpen(true)} />
      {isGuideOpen && <GuideDialog onClose={() => setIsGuideOpen(false)} />}
    </div>
  );
}
