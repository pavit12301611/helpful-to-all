import Link from 'next/link';
import { Logo } from '@/components/layout/sidebar';

/** Centered layout for sign in / sign up / public policy pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          About OpenHub
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        <Link className="link" href="/guidelines">
          Community guidelines
        </Link>
        <span className="mx-2">·</span>
        <Link className="link" href="/privacy">
          Privacy policy
        </Link>
        <span className="mx-2">·</span>
        <Link className="link" href="/terms">
          Terms
        </Link>
      </footer>
    </div>
  );
}
