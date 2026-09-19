import * as React from 'react';
import Link from 'next/link';
import { BadgeCheck, Lock, Globe, Users, ShieldCheck } from 'lucide-react';
import { cn, initials, hueFromString, labelize } from '@/lib/utils';

export function Card({
  className,
  children,
  as: Component = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <Component className={cn('card-surface', className)}>{children}</Component>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5', className)}>
      <div className="flex items-start gap-3">
        {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-4 py-4 sm:px-5', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('border-t border-border px-4 py-3 sm:px-5', className)}>{children}</div>;
}

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export { labelize };

export function StatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === 'solved' || status === 'completed' || status === 'active' || status === 'paid' || status === 'found'
      ? 'success'
      : status === 'open' || status === 'pending'
        ? 'info'
        : status === 'closed' || status === 'cancelled' || status === 'void' || status === 'rejected'
          ? 'neutral'
          : status === 'urgent' || status === 'overdue'
            ? 'danger'
            : 'warning';
  return <Badge tone={tone}>{labelize(status)}</Badge>;
}

export function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <Badge tone="success" icon={<BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}>
      {label}
    </Badge>
  );
}

/** Privacy indicator shown next to anything with restricted visibility. */
export function PrivacyBadge({ visibility }: { visibility: string }) {
  if (visibility === 'public') {
    return (
      <Badge tone="info" icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}>
        Public
      </Badge>
    );
  }
  if (visibility === 'community' || visibility === 'invite') {
    return (
      <Badge tone="neutral" icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}>
        Members only
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" icon={<Lock className="h-3.5 w-3.5" aria-hidden="true" />}>
      Private
    </Badge>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    backgroundColor: src ? undefined : `hsl(${hueFromString(name)} 45% 42%)`,
    fontSize: Math.max(11, size / 2.6),
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={style}
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Progress({
  value,
  max = 100,
  label,
  tone = 'primary',
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: 'primary' | 'success' | 'warning';
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const barTone = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-primary';
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div className={cn('h-full rounded-full transition-all', barTone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SectionHeading({
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {icon}
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };
  return (
    <div className="card-surface p-4">
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MemberLink({
  username,
  name,
  avatarUrl,
  size = 28,
}: {
  username: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  return (
    <Link href={`/members/${username}`} className="inline-flex items-center gap-2 hover:underline">
      <Avatar name={name} src={avatarUrl} size={size} />
      <span className="text-sm font-medium">{name}</span>
    </Link>
  );
}

export function StaffBadge() {
  return (
    <Badge tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}>
      Staff
    </Badge>
  );
}
