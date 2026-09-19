import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <div className="card-surface p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Create your OpenHub account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free, no tracking, and you can delete your account at any time.
      </p>

      <div className="mt-5">
        <RegisterForm />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
