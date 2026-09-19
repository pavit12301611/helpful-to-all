'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/feedback';
import { Spinner } from '@/components/ui/button';
import type { ActionResult } from '@/server/core/action';

/**
 * Reusable wrapper for forms that call a server action.
 *
 * It owns the three things every form needs and no form should re-implement:
 * pending state, toast feedback, and per-field error messages from Zod.
 */

export type FormRenderProps = {
  errors: Record<string, string>;
  pending: boolean;
  formError: string | null;
};

export function ServerForm({
  action,
  children,
  successMessage,
  onSuccess,
  resetOnSuccess = false,
  className,
  id,
  ariaLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  children: (props: FormRenderProps) => React.ReactNode;
  successMessage?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setErrors({});
        setFormError(null);
        toast.push({ tone: 'success', title: successMessage ?? result.message ?? 'Saved.' });
        if (resetOnSuccess) formRef.current?.reset();
        router.refresh();
        onSuccess?.();
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        toast.push({ tone: 'danger', title: 'Could not save', description: result.error });
      }
    });
  }

  return (
    <form
      ref={formRef}
      id={id}
      aria-label={ariaLabel}
      onSubmit={onSubmit}
      className={className}
      noValidate
    >
      {formError ? (
        <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      {children({ errors, pending, formError })}
    </form>
  );
}

export function SubmitButton({
  children = 'Save',
  pending,
  variant = 'primary',
  className,
}: {
  children?: React.ReactNode;
  pending?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60 ${tones[variant]} ${className ?? ''}`}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
