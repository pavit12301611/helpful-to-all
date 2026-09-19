import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="card-surface p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Sign in to OpenHub</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Enter your details to continue.</p>

      <div className="mt-5">
        <LoginForm />
      </div>

      <Alert tone="info" title="Demo accounts" className="mt-6">
        <ul className="mt-1 space-y-1">
          <li>
            <code>admin@openhub.test</code> / <code>OpenHub!2345</code> — administrator
          </li>
          <li>
            <code>priya@openhub.test</code> / <code>OpenHub!2345</code> — member &amp; student
          </li>
          <li>
            <code>rahul@openhub.test</code> / <code>OpenHub!2345</code> — volunteer &amp; organiser
          </li>
        </ul>
      </Alert>

      <p className="mt-6 text-sm text-muted-foreground">
        New to OpenHub?{' '}
        <Link href="/register" className="link font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
