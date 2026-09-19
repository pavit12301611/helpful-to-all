'use client';

import * as React from 'react';
import { SidebarNav } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { NavItem } from '@/lib/navigation';

/**
 * Application shell.
 *
 * Owns the only piece of navigation state that needs the browser: whether the
 * mobile drawer is open. Everything inside `children` is rendered on the server.
 */
export function AppShell({
  items,
  user,
  unreadNotifications,
  children,
}: {
  items: NavItem[];
  user: { username: string; displayName: string | null; avatarUrl: string | null; role: string } | null;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <SidebarNav items={items} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          unreadNotifications={unreadNotifications}
          user={user}
          onOpenNav={() => setMobileOpen(true)}
        />
        <main id="main" className="flex-1 px-3 pb-24 pt-4 sm:px-6 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-6 text-xs text-muted-foreground lg:pl-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
            <span>OpenHub — free, open source, self-hostable.</span>
            <a className="link" href="/guidelines">
              Community guidelines
            </a>
            <a className="link" href="/privacy">
              Privacy
            </a>
            <a className="link" href="/terms">
              Terms
            </a>
            <a className="link" href="/docs">
              Help
            </a>
            <a className="link" href="/safety">
              Safety hub
            </a>
          </div>
        </footer>
      </div>
      <MobileNav />
    </div>
  );
}
