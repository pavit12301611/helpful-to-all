import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Pagination, tabs and small layout helpers shared by every list page. */

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value && key !== 'page') params.set(key, value);
    }
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <p className="text-xs text-muted-foreground">
        Showing page {page} of {pageCount} ({total} result{total === 1 ? '' : 's'})
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function Tabs({
  tabs,
  current,
  basePath,
  searchParams,
}: {
  tabs: { key: string; label: string; count?: number }[];
  current: string;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filters">
      {tabs.map((tab) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams ?? {})) {
          if (value && key !== 'tab') params.set(key, value);
        }
        if (tab.key !== 'all') params.set('tab', tab.key);
        const href = params.toString() ? `${basePath}?${params.toString()}` : basePath;
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' ? <span className="ml-1.5 opacity-70">{tab.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function Row({
  title,
  subtitle,
  href,
  meta,
  actions,
  icon,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  href?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        {meta ? <div className="mt-1.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
    </div>
  );

  return (
    <li className="table-row-hover flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {href ? (
        <Link href={href} className="min-w-0 flex-1 hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </li>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
}

export function KeyValueGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{item.value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}
