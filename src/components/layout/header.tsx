'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme';
import { Avatar } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/features/auth/actions';

/** Top bar: search, notifications, theme, account menu and the mobile drawer trigger. */
export function AppHeader({
  unreadNotifications,
  user,
  onOpenNav,
}: {
  unreadNotifications: number;
  user: { username: string; displayName: string | null; avatarUrl: string | null; role: string } | null;
  onOpenNav: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenNav}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <form
          className="relative flex-1 sm:max-w-md"
          role="search"
          action="/search"
          onSubmit={(event) => {
            if (!query.trim()) event.preventDefault();
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Search OpenHub
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="global-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search help, groups, resources…"
            className="input-base pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                ) : null}
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted"
                >
                  <Avatar name={user.displayName ?? user.username} src={user.avatarUrl} size={28} />
                  <span className="hidden text-sm font-medium sm:inline">{user.displayName ?? user.username}</span>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-medium">{user.displayName ?? user.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <MenuItem href={`/members/${user.username}`} icon={<User className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      My public profile
                    </MenuItem>
                    <MenuItem href="/settings" icon={<Settings className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Settings & privacy
                    </MenuItem>
                    <MenuItem href="/activity" icon={<Bell className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Activity history
                    </MenuItem>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        await logoutAction();
                        router.push('/login');
                        router.refresh();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className={cn('rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90')}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
    >
      {icon}
      {children}
    </Link>
  );
}
