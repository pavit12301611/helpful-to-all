'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Banknote,
  Binary,
  Braces,
  Cake,
  CalendarRange,
  CaseSensitive,
  Check,
  Copy,
  Dices,
  Download,
  Fingerprint,
  Globe,
  Hash,
  KeyRound,
  Link as LinkIcon,
  Palette,
  Percent,
  QrCode,
  Receipt,
  Ruler,
  Scale,
  ShieldCheck,
  Table as TableIcon,
  TextCursor,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { TOOLS, TOOL_CATEGORIES, type ToolDefinition } from './registry';

/* ------------------------------------------------------------------ shared */

function useCopy() {
  const [copied, setCopied] = React.useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return { copied, copy };
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => copy(value)} disabled={!value}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function Result({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="label">{label}</p>
      <pre
        className={`mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value || '—'}
      </pre>
    </div>
  );
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'qr-code': QrCode,
  'key-round': KeyRound,
  'shield-check': ShieldCheck,
  'text-cursor': TextCursor,
  dices: Dices,
  'case-sensitive': CaseSensitive,
  hash: Hash,
  braces: Braces,
  table: TableIcon,
  binary: Binary,
  link: LinkIcon,
  fingerprint: Fingerprint,
  ruler: Ruler,
  banknote: Banknote,
  globe: Globe,
  palette: Palette,
  percent: Percent,
  scale: Scale,
  receipt: Receipt,
  cake: Cake,
  'calendar-range': CalendarRange,
  timer: Timer,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? QrCode;
  return <Icon className={className} aria-hidden="true" />;
}

/** Sidebar list of tools; links to /tools?tool=key so the page stays linkable. */
export function ToolPicker({ active, category }: { active: string; category: string }) {
  const visible = TOOLS.filter((tool) => category === 'all' || tool.category === category);
  return (
    <nav aria-label="Utility tools" className="grid gap-1">
      {visible.map((tool) => {
        const Icon = ToolIcon;
        const selected = tool.key === active;
        return (
          <Link
            key={tool.key}
            href={`/tools?tool=${tool.key}`}
            aria-current={selected ? 'page' : undefined}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
              selected ? 'border-primary bg-primary/5 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon name={tool.icon} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{tool.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{tool.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ToolCategoryLinks({ active }: { active: string }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Tool categories">
      {TOOL_CATEGORIES.map((entry) => (
        <Link
          key={entry.key}
          href={entry.key === 'all' ? `/tools?tool=${active}` : `/tools?tool=${active}&category=${entry.key}`}
          role="tab"
          aria-selected={entry.key === active}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
            entry.key === active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {entry.label}
        </Link>
      ))}
    </div>
  );
}

export function ToolShell({ tool, children }: { tool: ToolDefinition; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader
        title={tool.label}
        description={tool.description}
        icon={<ToolIcon name={tool.icon} className="h-5 w-5" />}
        action={<Badge tone="neutral">runs in your browser</Badge>}
      />
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- QR codes */

export function QrTool() {
  const [text, setText] = React.useState('https://openhub.example');
  const [size, setSize] = React.useState(384);
  const encoded = encodeURIComponent(text);
  const src = text.trim() ? `/api/tools/qr?text=${encoded}&size=${size}` : '';

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="Text or link" name="qr-text" hint="Nothing is stored — the image is generated on demand.">
          {({ id }) => <Input id={id} value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} />}
        </Field>
        <Field label="Size (px)" name="qr-size">
          {({ id }) => (
            <Select id={id} value={String(size)} onChange={(event) => setSize(Number(event.target.value))}>
              <option value="192">192</option>
              <option value="384">384</option>
              <option value="768">768</option>
            </Select>
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`QR code for ${text}`}
            width={Math.min(size, 240)}
            height={Math.min(size, 240)}
            className="rounded-lg border border-border bg-white p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Type something to generate a QR code.</p>
        )}
        <div className="flex gap-2">
          <CopyButton value={text} label="Copy text" />
          {src ? (
            <a
              href={src}
              download="openhub-qr.png"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download PNG
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- passwords */

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};

function randomChar(pool: string) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return pool[bytes[0] % pool.length];
}

export function generatePassword(length: number, use: Record<keyof typeof SETS, boolean>) {
  const pools = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((key) => use[key]);
  if (pools.length === 0) return '';
  const pool = pools.map((key) => SETS[key]).join('');
  const chars = pools.map((key) => randomChar(SETS[key]));
  while (chars.length < length) chars.push(randomChar(pool));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Deterministic strength estimate so it can be unit tested. */
export function passwordScore(value: string) {
  if (!value) return { score: 0, label: 'Empty', advice: 'Type or generate a password.' };
  const pools = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(value)).length;
  const length = value.length;
  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  score += Math.max(0, pools - 1);
  if (/(.)\1{2,}/.test(value)) score -= 1;
  if (/^(?:\d+|[a-z]+)$/i.test(value)) score -= 1;
  const common = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin'];
  const lowered = value.toLowerCase();
  if (common.some((word) => lowered.includes(word))) score -= 2;
  const bounded = Math.max(0, Math.min(5, score));
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const advice =
    bounded >= 4
      ? 'Strong. Use a unique password for every site.'
      : bounded >= 3
        ? 'Good. Add length or symbols to make it stronger.'
        : 'Weak. Use at least 12 characters mixing letters, numbers and symbols.';
  return { score: bounded, label: labels[bounded], advice };
}

export function PasswordGenerator() {
  const [length, setLength] = React.useState(16);
  const [use, setUse] = React.useState({ lower: true, upper: true, digits: true, symbols: true });
  const [value, setValue] = React.useState('');
  const strength = passwordScore(value);

  return (
    <>
      <Alert tone="info">
        Passwords are generated with <code>crypto.getRandomValues</code> in your browser. OpenHub never receives, stores or logs
        them.
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Length" name="pw-length">
          {({ id }) => (
            <Input id={id} type="number" min={8} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} />
          )}
        </Field>
        <fieldset className="grid grid-cols-2 gap-2 self-end">
          <legend className="label">Character sets</legend>
          {(Object.keys(SETS) as (keyof typeof SETS)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={use[key]}
                onChange={(event) => setUse((current) => ({ ...current, [key]: event.target.checked }))}
              />
              {key}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setValue(generatePassword(Math.min(64, Math.max(8, length)), use))}>
          Generate password
        </Button>
        <CopyButton value={value} label="Copy password" />
      </div>
      <Result label="Password" value={value} />
      {value ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="presentation">
              <div
                className={`h-full ${strength.score >= 4 ? 'bg-success' : strength.score >= 3 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <Badge tone={strength.score >= 4 ? 'success' : strength.score >= 3 ? 'warning' : 'danger'}>{strength.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{strength.advice}</p>
        </div>
      ) : null}
    </>
  );
}

export function PasswordChecker() {
  const [value, setValue] = React.useState('');
  const strength = passwordScore(value);
  return (
    <>
      <Alert tone="info">Checking happens in your browser. Do not paste a password you use anywhere important.</Alert>
      <Field label="Password to check" name="pw-check">
        {({ id }) => (
          <Input id={id} type="text" value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" />
        )}
      </Field>
      {value ? (
        <div className="grid gap-2">
          <Badge tone={strength.score >= 4 ? 'success' : strength.score >= 3 ? 'warning' : 'danger'}>{strength.label}</Badge>
          <p className="text-sm text-muted-foreground">{strength.advice}</p>
          <p className="text-sm text-muted-foreground">
            {value.length} characters · {strength.score}/5
          </p>
        </div>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------- text */

export function LoremTool() {
  const [paragraphs, setParagraphs] = React.useState(3);
  const [text, setText] = React.useState('');
  const words =
    'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
      ' ',
    );

  function generate() {
    const output: string[] = [];
    for (let p = 0; p < paragraphs; p += 1) {
      const sentences: string[] = [];
      for (let s = 0; s < 4; s += 1) {
        const wordsInSentence = 8 + ((p * 4 + s) % 7);
        const start = (p * 37 + s * 13) % words.length;
        const sentence = Array.from({ length: wordsInSentence }, (_, i) => words[(start + i) % words.length]).join(' ');
        sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
      }
      output.push(sentences.join(' '));
    }
    setText(output.join('\n\n'));
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Paragraphs" name="lorem-count" className="w-32">
          {({ id }) => (
            <Input id={id} type="number" min={1} max={20} value={paragraphs} onChange={(event) => setParagraphs(Number(event.target.value))} />
          )}
        </Field>
        <Button type="button" onClick={generate}>
          Generate
        </Button>
        <CopyButton value={text} label="Copy text" />
      </div>
      <Result label="Placeholder text" value={text} mono={false} />
    </>
  );
}

export function RandomTool() {
  const [min, setMin] = React.useState(1);
  const [max, setMax] = React.useState(6);
  const [count, setCount] = React.useState(1);
  const [numbers, setNumbers] = React.useState<number[]>([]);
  const [dice, setDice] = React.useState<number[]>([]);
  const [names, setNames] = React.useState('');
  const [picked, setPicked] = React.useState('');

  function pick(pool: string[], howMany: number) {
    const values = pool.map((value) => value.trim()).filter(Boolean);
    if (values.length === 0) return [];
    return Array.from({ length: howMany }, () => {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return values[bytes[0] % values.length];
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Minimum" name="rand-min">
          {({ id }) => <Input id={id} type="number" value={min} onChange={(event) => setMin(Number(event.target.value))} />}
        </Field>
        <Field label="Maximum" name="rand-max">
          {({ id }) => <Input id={id} type="number" value={max} onChange={(event) => setMax(Number(event.target.value))} />}
        </Field>
        <Field label="How many" name="rand-count">
          {({ id }) => <Input id={id} type="number" min={1} max={100} value={count} onChange={(event) => setCount(Number(event.target.value))} />}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            const low = Math.min(min, max);
            const high = Math.max(min, max);
            setNumbers(
              Array.from({ length: Math.min(100, Math.max(1, count)) }, () => {
                const bytes = new Uint32Array(1);
                crypto.getRandomValues(bytes);
                return low + (bytes[0] % (high - low + 1));
              }),
            );
          }}
        >
          Generate numbers
        </Button>
        <Button type="button" variant="outline" onClick={() => setDice(pick(['1', '2', '3', '4', '5', '6'], 2).map(Number))}>
          Roll two dice
        </Button>
      </div>
      <Result label="Numbers" value={numbers.join(', ')} />
      <Result label="Dice" value={dice.map((value) => `⚀⚁⚂⚃⚄⚅`[value - 1] ?? String(value)).join(' ')} />
      <Field label="Names or options (one per line)" name="rand-names" hint="Pick a name for chores, teams or who goes first.">
        {({ id }) => <Textarea id={id} rows={4} value={names} onChange={(event) => setNames(event.target.value)} placeholder={'Asha\nRohit\nMeera'} />}
      </Field>
      <div className="flex gap-2">
        <Button type="button" onClick={() => setPicked(pick(names.split('\n'), 1)[0] ?? '')}>
          Pick one
        </Button>
        <CopyButton value={picked} label="Copy pick" />
      </div>
      <Result label="Picked" value={picked} mono={false} />
    </>
  );
}

export function caseConvert(value: string, mode: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  switch (mode) {
    case 'upper':
      return value.toUpperCase();
    case 'lower':
      return value.toLowerCase();
    case 'title':
      return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    case 'sentence':
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'camel':
      return words.map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())).join('');
    case 'pascal':
      return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
    case 'snake':
      return words.map((word) => word.toLowerCase()).join('_');
    case 'kebab':
      return words.map((word) => word.toLowerCase()).join('-');
    case 'constant':
      return words.map((word) => word.toUpperCase()).join('_');
    default:
      return value;
  }
}

export function CaseTool() {
  const [value, setValue] = React.useState('');
  const modes = ['upper', 'lower', 'title', 'sentence', 'camel', 'pascal', 'snake', 'kebab', 'constant'];
  return (
    <>
      <Field label="Text" name="case-text">
        {({ id }) => <Textarea id={id} rows={4} value={value} onChange={(event) => setValue(event.target.value)} placeholder="openHub makes life easier" />}
      </Field>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <Button key={mode} type="button" variant="outline" size="sm" onClick={() => setValue(caseConvert(value, mode))}>
            {mode}
          </Button>
        ))}
      </div>
      <Result label="Result" value={value} />
      <CopyButton value={value} label="Copy result" />
    </>
  );
}

export function countText(value: string) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const sentences = value.trim() ? (value.match(/[.!?]+(\s|$)/g)?.length ?? 1) : 0;
  const paragraphs = value.trim() ? value.split(/\n{2,}/).filter((block) => block.trim()).length : 0;
  return {
    characters: value.length,
    charactersNoSpaces: value.replace(/\s/g, '').length,
    words,
    sentences,
    paragraphs,
    readingMinutes: Math.max(words === 0 ? 0 : 1, Math.round(words / 200)),
  };
}

export function CounterTool() {
  const [value, setValue] = React.useState('');
  const stats = countText(value);
  return (
    <>
      <Field label="Text" name="counter-text">
        {({ id }) => (
          <Textarea
            id={id}
            rows={6}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Paste an essay, message or note…"
          />
        )}
      </Field>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ['Words', stats.words],
          ['Characters', stats.characters],
          ['Without spaces', stats.charactersNoSpaces],
          ['Sentences', stats.sentences],
          ['Paragraphs', stats.paragraphs],
          ['Reading time', `${stats.readingMinutes} min`],
        ].map(([label, stat]) => (
          <div key={String(label)} className="rounded-lg border border-border px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">{stat}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function JsonTool() {
  const [value, setValue] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function run(indent: number) {
    try {
      const parsed: unknown = JSON.parse(value);
      setOutput(JSON.stringify(parsed, null, indent));
      setError(null);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Invalid JSON.');
      setOutput('');
    }
  }

  return (
    <>
      <Field label="JSON" name="json-input" error={error}>
        {({ id }) => <Textarea id={id} rows={8} value={value} onChange={(event) => setValue(event.target.value)} className="font-mono text-xs" placeholder='{"name": "OpenHub", "open": true}' />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => run(2)}>
          Format
        </Button>
        <Button type="button" variant="outline" onClick={() => run(0)}>
          Minify
        </Button>
        <CopyButton value={output} label="Copy JSON" />
      </div>
      <Result label="Output" value={output} />
    </>
  );
}

/** Minimal, predictable CSV parsing (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

export function csvToJson(text: string) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  return rest.map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index] ?? ''])));
}

export function jsonToCsv(text: string) {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Expected a non-empty JSON array of objects.');
  const keys = Array.from(
    new Set(parsed.flatMap((entry) => (entry && typeof entry === 'object' ? Object.keys(entry as Record<string, unknown>) : []))),
  );
  const escape = (value: unknown) => {
    const text2 = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text2) ? `"${text2.replace(/"/g, '""')}"` : text2;
  };
  return [keys.join(','), ...parsed.map((entry) => keys.map((key) => escape((entry as Record<string, unknown>)[key])).join(','))].join('\n');
}

export function CsvTool() {
  const [input, setInput] = React.useState('name,city\nAsha,Pune\nRohit,Kochi');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  return (
    <>
      <Field label="Input" name="csv-input" error={error}>
        {({ id }) => <Textarea id={id} rows={6} value={input} onChange={(event) => setInput(event.target.value)} className="font-mono text-xs" />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            try {
              setOutput(JSON.stringify(csvToJson(input), null, 2));
              setError(null);
            } catch (csvError) {
              setError(csvError instanceof Error ? csvError.message : 'Could not convert.');
            }
          }}
        >
          CSV → JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            try {
              setOutput(jsonToCsv(input));
              setError(null);
            } catch (csvError) {
              setError(csvError instanceof Error ? csvError.message : 'Could not convert.');
            }
          }}
        >
          JSON → CSV
        </Button>
        <CopyButton value={output} label="Copy result" />
      </div>
      <Result label="Output" value={output} />
    </>
  );
}

export function Base64Tool() {
  const [value, setValue] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function encode() {
    try {
      setOutput(btoa(String.fromCharCode(...new TextEncoder().encode(value))));
      setError(null);
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : 'Could not encode.');
    }
  }

  function decode() {
    try {
      const bytes = Uint8Array.from(atob(value.trim()), (char) => char.charCodeAt(0));
      setOutput(new TextDecoder().decode(bytes));
      setError(null);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : 'That is not valid Base64.');
    }
  }

  return (
    <>
      <Field label="Text or Base64" name="b64-input" error={error}>
        {({ id }) => <Textarea id={id} rows={4} value={value} onChange={(event) => setValue(event.target.value)} />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={encode}>
          Encode
        </Button>
        <Button type="button" variant="outline" onClick={decode}>
          Decode
        </Button>
        <CopyButton value={output} label="Copy result" />
      </div>
      <Result label="Output" value={output} />
    </>
  );
}

export function UrlTool() {
  const [value, setValue] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  return (
    <>
      <Field label="Text or URL" name="url-input" error={error}>
        {({ id }) => <Textarea id={id} rows={3} value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://example.com/search?q=hello world" />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => { setOutput(encodeURIComponent(value)); setError(null); }}>
          Encode
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            try {
              setOutput(decodeURIComponent(value));
              setError(null);
            } catch (decodeError) {
              setError(decodeError instanceof Error ? decodeError.message : 'Could not decode.');
            }
          }}
        >
          Decode
        </Button>
        <CopyButton value={output} label="Copy result" />
      </div>
      <Result label="Output" value={output} />
    </>
  );
}

export async function hashText(value: string, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512') {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function HashTool() {
  const [value, setValue] = React.useState('');
  const [algorithm, setAlgorithm] = React.useState<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-256');
  const [output, setOutput] = React.useState('');

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end">
        <Field label="Algorithm" name="hash-algo">
          {({ id }) => (
            <Select id={id} value={algorithm} onChange={(event) => setAlgorithm(event.target.value as 'SHA-1' | 'SHA-256' | 'SHA-512')}>
              <option value="SHA-1">SHA-1</option>
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-512">SHA-512</option>
            </Select>
          )}
        </Field>
        <Field label="Text" name="hash-text">
          {({ id }) => <Input id={id} value={value} onChange={(event) => setValue(event.target.value)} />}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={async () => setOutput(await hashText(value, algorithm))}>
          Hash
        </Button>
        <CopyButton value={output} label="Copy hash" />
      </div>
      <Result label={`${algorithm} digest`} value={output} />
      <p className="text-sm text-muted-foreground">
        Hashing runs through the Web Crypto API in your browser. SHA-1 is provided for compatibility with older checksums, not for
        security.
      </p>
    </>
  );
}
