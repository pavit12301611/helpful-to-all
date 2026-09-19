import Link from 'next/link';
import { Heart } from 'lucide-react';
import { currentUser } from '@/server/core/guards';

/**
 * Layout for public pages (landing, policies, docs).
 *
 * Deliberately lighter than the app shell: no sidebar, no personal data, just a
 * header with the two things a visitor needs — sign in, or get started.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" aria-hidden="true" />
            </span>
            OpenHub
          </Link>

          <nav aria-label="Public pages" className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/guidelines" className="hover:text-foreground">
              Guidelines
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold text-foreground">OpenHub</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A free, self-hostable community utility platform. Community help, groups, student tools, safety, volunteering and small
              business tools in one place.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Licensed AGPL-3.0. Source code included in this repository.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Policies</p>
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <li>
                <Link href="/guidelines" className="hover:text-foreground">
                  Community guidelines
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms of use
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-foreground">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Safety</p>
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <li>
                <Link href="/safety" className="hover:text-foreground">
                  Safety hub
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-foreground">
                  Community help
                </Link>
              </li>
              <li>
                <Link href="/volunteer" className="hover:text-foreground">
                  Volunteer & donate
                </Link>
              </li>
              <li>
                <Link href="/members" className="hover:text-foreground">
                  Member directory
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Hosting your own</p>
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground">
                  Setup guide
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-foreground">
                  Environment variables
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-foreground">
                  Utility tools
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
            OpenHub is not a replacement for official emergency services. Medical, legal and financial information shared by members
            is not professional advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
