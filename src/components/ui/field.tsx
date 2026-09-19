import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Form fields.
 *
 * `Field` wires the label, hint, error text and aria attributes together so
 * every form in OpenHub is announced correctly by screen readers and shows the
 * same validation feedback.
 */

export function Label({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="label">
      {children}
      {required ? (
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function Hint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

type FieldProps = {
  label: string;
  /** Used to build the element id; omit only for standalone, non-server fields. */
  name?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
  className?: string;
};

export function Field({ label, name, hint, error, required, children, className }: FieldProps) {
  const generatedId = React.useId();
  const id = name ? `field-${name}` : `field-${generatedId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('w-full', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? <Hint id={hintId}>{hint}</Hint> : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn('input-base', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn('input-base resize-y', invalid && 'border-danger', className)}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn('input-base appearance-none pr-8', invalid && 'border-danger', className)}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 rounded border-input accent-primary" {...props} />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  name,
  onChange,
  id,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  name?: string;
  onChange?: (checked: boolean) => void;
  id?: string;
}) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-primary bg-primary' : 'border-input bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-card shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0.5',
          )}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
        {name ? <input type="hidden" name={name} value={checked ? 'on' : 'off'} /> : null}
      </button>
    </div>
  );
}
