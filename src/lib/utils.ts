import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conditional logic. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL safe slug used for groups, businesses and guides. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function truncate(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Split a CSV string stored in the database into clean values. */
export function parseCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toCsv(values: string[] | null | undefined): string {
  return Array.from(new Set((values ?? []).map((v) => v.trim()).filter(Boolean))).join(',');
}

/** Initials for avatars when no photo is set. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function formatDate(value: Date | string | null | undefined, locale = 'en-GB'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined, locale = 'en-GB'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Number.isNaN(date.getTime())) return '—';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** Money is stored in integer minor units; this renders it for humans. */
export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    cents / 100,
  );
}

export function parseMoneyToCents(value: string | number): number {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Deterministic colour for avatars / labels so lists stay scannable. */
export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/** Turn a raw enum value ("in_progress") into a readable label ("In Progress"). */
export function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Escape a string for use inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
