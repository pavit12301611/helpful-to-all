'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Alerts, empty states, loading skeletons and the toast system. */

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneStyles: Record<Tone, { wrapper: string; icon: React.ReactNode }> = {
  info: { wrapper: 'border-info/30 bg-info/10 text-info', icon: <Info className="h-4 w-4" aria-hidden="true" /> },
  success: {
    wrapper: 'border-success/30 bg-success/10 text-success',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'border-warning/30 bg-warning/10 text-warning',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
  danger: {
    wrapper: 'border-danger/30 bg-danger/10 text-danger',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const style = toneStyles[tone];
  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', style.wrapper, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-1', 'leading-relaxed')}>{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <span className="mb-3 text-muted-foreground">{icon ?? <Inbox className="h-8 w-8" aria-hidden="true" />}</span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function LoadingBlock({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */

type Toast = { id: number; tone: Tone; title: string; description?: string };

type ToastContextValue = { push: (toast: Omit<Toast, 'id'>) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    // Outside the provider (e.g. unit tests) fail softly instead of crashing.
    return { push: () => undefined };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const push = React.useCallback((toast: Omit<Toast, 'id'>) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);

  const value = React.useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-4"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto animate-fade-in rounded-lg border bg-card px-4 py-3 text-sm shadow-lg',
              toneStyles[toast.tone].wrapper,
            )}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <span className="mt-0.5">{toneStyles[toast.tone].icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{toast.title}</p>
                  {toast.description ? <p className="mt-0.5 text-muted-foreground">{toast.description}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
