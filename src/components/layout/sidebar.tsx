'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import { NAV_SECTIONS } from '@/lib/navigation';

/**
 * Primary navigation.
 *
 * Desktop: fixed sidebar grouped by section.
 * Mobile: the same list inside a drawer, opened from the header, with focus
 * trapping and Escape to close.
 */

export function SidebarNav({
  items,
  mobileOpen,
  onCloseMobile,
}: {
  items: NavItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  const list = (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {NAV_SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => item.section === section.key);
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.key} className="mb-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {sectionItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <Logo />
          </div>
          {list}
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Logo />
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {list}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="OpenHub home">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9h14v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      </span>
      {!compact ? <span className="text-base font-semibold tracking-tight">OpenHub</span> : null}
    </Link>
  );
}
