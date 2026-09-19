'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Checkbox } from '@/components/ui/field';
import { registerAction } from '@/features/auth/actions';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';
import { USER_TYPES } from '@/lib/enums';
import { labelize } from '@/components/ui/card';

/**
 * Registration form.
 *
 * Uses React Hook Form + the same Zod schema the server enforces, so the user
 * sees the exact validation rules before submitting.
 */
export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { userType: undefined, acceptGuidelines: false },
  });

  const password = watch('password') ?? '';

  async function onSubmit(values: RegisterInput) {
    const result = await registerAction(values);
    if (result.ok) {
      toast.push({ tone: 'success', title: 'Welcome to OpenHub!' });
      router.push('/dashboard');
      router.refresh();
    } else {
      toast.push({ tone: 'danger', title: 'Could not create the account', description: result.error });
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        setValue(key as keyof RegisterInput, undefined as never, { shouldValidate: false });
        // Surface server-side field errors in the form.
        (errors as Record<string, unknown>)[key] = { message };
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Create account">
      <Field label="Display name" name="displayName" error={errors.displayName?.message} required>
        {(props) => <Input {...props} {...register('displayName')} autoComplete="name" placeholder="Priya Sharma" />}
      </Field>

      <Field
        label="Username"
        name="username"
        error={errors.username?.message}
        hint="Lowercase letters, numbers, dot, dash or underscore."
        required
      >
        {(props) => <Input {...props} {...register('username')} autoComplete="username" placeholder="priya.s" />}
      </Field>

      <Field label="Email address" name="email" error={errors.email?.message} required>
        {(props) => <Input {...props} {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" />}
      </Field>

      <Field
        label="Password"
        name="password"
        error={errors.password?.message}
        hint="At least 10 characters. Mix letters, numbers and a symbol."
        required
      >
        {(props) => (
          <Input {...props} {...register('password')} type="password" autoComplete="new-password" />
        )}
      </Field>

      {password ? (
        <PasswordMeter password={password} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" name="city" error={errors.city?.message}>
          {(props) => <Input {...props} {...register('city')} placeholder="Pune" autoComplete="address-level2" />}
        </Field>
        <Field label="Country" name="country" error={errors.country?.message}>
          {(props) => <Input {...props} {...register('country')} placeholder="India" autoComplete="country-name" />}
        </Field>
      </div>

      <Field label="I am joining mainly as" name="userType" error={errors.userType?.message}>
        {(props) => (
          <Select {...props} {...register('userType')}>
            <option value="">Just exploring</option>
            {USER_TYPES.map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <Checkbox
          {...register('acceptGuidelines')}
          label="I will follow the community guidelines"
          hint="Be kind, be honest, and never share other people's private information."
        />
        {errors.acceptGuidelines?.message ? (
          <p role="alert" className="mt-1 text-xs font-medium text-danger">
            {errors.acceptGuidelines.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Create account
      </Button>
    </form>
  );
}

function PasswordMeter({ password }: { password: string }) {
  const checks = [
    { label: '10+ characters', ok: password.length >= 10 },
    { label: 'upper & lower case', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'a number', ok: /\d/.test(password) },
    { label: 'a symbol', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((check) => check.ok).length;

  return (
    <div aria-live="polite" className="rounded-lg border border-border bg-muted/50 px-3 py-2">
      <p className="text-xs font-medium text-foreground">
        Password strength: {['very weak', 'weak', 'fair', 'strong'][Math.max(0, score - 1)] ?? 'very weak'}
      </p>
      <div className="mt-1.5 flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < score ? 'bg-success' : 'bg-muted-foreground/30'}`}
          />
        ))}
      </div>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {checks.map((check) => (
          <li key={check.label} className={check.ok ? 'text-success' : undefined}>
            {check.ok ? '✓' : '○'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
