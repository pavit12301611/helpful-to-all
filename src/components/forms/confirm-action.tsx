'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/feedback';
import { buttonClasses } from '@/components/ui/button';
import type { ActionResult } from '@/server/core/action';

/**
 * Button that asks for confirmation before running a destructive server action.
 * Every delete / leave / cancel flow in OpenHub goes through this.
 */
export function ConfirmActionButton({
  action,
  label = 'Delete',
  title,
  description,
  confirmLabel,
  variant = 'outline',
  size = 'sm',
  successMessage = 'Done.',
  icon,
  className,
  redirectTo,
}: {
  action: () => Promise<ActionResult<unknown>>;
  label?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'outline' | 'danger' | 'ghost' | 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'icon';
  successMessage?: string;
  icon?: React.ReactNode;
  className?: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const toast = useToast();

  async function confirm() {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) {
        toast.push({ tone: 'success', title: successMessage });
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } else {
        toast.push({ tone: 'danger', title: 'Action failed', description: result.error });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses(variant, size, className)}>
        {icon}
        {label}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        title={title}
        description={description}
        confirmLabel={confirmLabel ?? label}
        pending={pending}
      />
    </>
  );
}

/** Small icon button variant used inside list rows. */
export function ConfirmIconAction({
  action,
  title,
  description,
  confirmLabel,
  label,
  icon,
}: {
  action: () => Promise<ActionResult<unknown>>;
  title: string;
  description: string;
  confirmLabel?: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <ConfirmActionButton
      action={action}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      label={label}
      variant="ghost"
      size="icon"
      icon={icon}
      className="text-muted-foreground"
    />
  );
}
