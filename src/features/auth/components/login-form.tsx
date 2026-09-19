'use client';

import { useRouter } from 'next/navigation';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { Field, Input, Checkbox } from '@/components/ui/field';
import { loginAction } from '@/features/auth/actions';

export function LoginForm() {
  const router = useRouter();

  return (
    <ServerForm
      action={async (formData) => {
        const result = await loginAction({
          email: formData.get('email'),
          password: formData.get('password'),
          remember: formData.get('remember') === 'on',
        });
        if (result.ok) {
          router.push('/dashboard');
          router.refresh();
        }
        return result;
      }}
      successMessage="Signed in."
      ariaLabel="Sign in"
    >
      {({ errors, pending }) => (
        <div className="space-y-4">
          <Field label="Email address" name="email" error={errors.email} required>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            )}
          </Field>

          <Field label="Password" name="password" error={errors.password} required>
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••"
              />
            )}
          </Field>

          <Checkbox name="remember" label="Keep me signed in on this device" defaultChecked />

          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </div>
      )}
    </ServerForm>
  );
}
