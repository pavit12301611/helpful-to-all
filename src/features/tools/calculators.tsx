'use client';

import * as React from 'react';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';

/* ------------------------------------------------------------ unit converter */

type UnitGroup = {
  key: string;
  label: string;
  units: { key: string; label: string; factor: number }[];
};

export const UNIT_GROUPS: UnitGroup[] = [
  {
    key: 'length',
    label: 'Length',
    units: [
      { key: 'mm', label: 'Millimetre', factor: 0.001 },
      { key: 'cm', label: 'Centimetre', factor: 0.01 },
      { key: 'm', label: 'Metre', factor: 1 },
      { key: 'km', label: 'Kilometre', factor: 1000 },
      { key: 'in', label: 'Inch', factor: 0.0254 },
      { key: 'ft', label: 'Foot', factor: 0.3048 },
      { key: 'mi', label: 'Mile', factor: 1609.344 },
    ],
  },
  {
    key: 'weight',
    label: 'Weight',
    units: [
      { key: 'g', label: 'Gram', factor: 0.001 },
      { key: 'kg', label: 'Kilogram', factor: 1 },
      { key: 't', label: 'Tonne', factor: 1000 },
      { key: 'oz', label: 'Ounce', factor: 0.0283495 },
      { key: 'lb', label: 'Pound', factor: 0.453592 },
    ],
  },
  {
    key: 'volume',
    label: 'Volume',
    units: [
      { key: 'ml', label: 'Millilitre', factor: 0.001 },
      { key: 'l', label: 'Litre', factor: 1 },
      { key: 'tsp', label: 'Teaspoon (US)', factor: 0.00492892 },
      { key: 'tbsp', label: 'Tablespoon (US)', factor: 0.0147868 },
      { key: 'cup', label: 'Cup (US)', factor: 0.24 },
      { key: 'gal', label: 'Gallon (US)', factor: 3.78541 },
    ],
  },
];

export function convertUnit(group: UnitGroup, from: string, to: string, amount: number) {
  const source = group.units.find((unit) => unit.key === from);
  const target = group.units.find((unit) => unit.key === unit.key && unit.key === to);
  if (!source || !target) return amount;
  return (amount * source.factor) / target.factor;
}

export function convertTemperature(from: string, to: string, amount: number) {
  const toCelsius = (value: number) => (from === 'f' ? ((value - 32) * 5) / 9 : from === 'k' ? value - 273.15 : value);
  const celsius = toCelsius(amount);
  if (to === 'f') return (celsius * 9) / 5 + 32;
  if (to === 'k') return celsius + 273.15;
  return celsius;
}

export function UnitTool() {
  const [groupKey, setGroupKey] = React.useState('length');
  const group = UNIT_GROUPS.find((entry) => entry.key === groupKey) ?? UNIT_GROUPS[0];
  const [from, setFrom] = React.useState(group.units[0].key);
  const [to, setTo] = React.useState(group.units[1].key);
  const [amount, setAmount] = React.useState(1);
  const isTemperature = groupKey === 'temperature';
  const result = isTemperature ? convertTemperature(from, to, amount) : convertUnit(group, from, to, amount);

  React.useEffect(() => {
    if (groupKey === 'temperature') {
      setFrom('c');
      setTo('f');
    } else {
      setFrom(group.units[0].key);
      setTo(group.units[1].key);
    }
  }, [groupKey, group]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category" name="unit-group">
          {({ id }) => (
            <Select id={id} value={groupKey} onChange={(event) => setGroupKey(event.target.value)}>
              {[...UNIT_GROUPS, { key: 'temperature', label: 'Temperature', units: [] }].map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Amount" name="unit-amount">
          {({ id }) => <Input id={id} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />}
        </Field>
        <div className="grid grid-cols-2 gap-2 self-end">
          <Field label="From" name="unit-from">
            {({ id }) => (
              <Select id={id} value={from} onChange={(event) => setFrom(event.target.value)}>
                {(isTemperature
                  ? [
                      { key: 'c', label: 'Celsius' },
                      { key: 'f', label: 'Fahrenheit' },
                      { key: 'k', label: 'Kelvin' },
                    ]
                  : group.units
                ).map((unit) => (
                  <option key={unit.key} value={unit.key}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="To" name="unit-to">
            {({ id }) => (
              <Select id={id} value={to} onChange={(event) => setTo(event.target.value)}>
                {(isTemperature
                  ? [
                      { key: 'c', label: 'Celsius' },
                      { key: 'f', label: 'Fahrenheit' },
                      { key: 'k', label: 'Kelvin' },
                    ]
                  : group.units
                ).map((unit) => (
                  <option key={unit.key} value={unit.key}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-foreground">
        {amount} {from} = <span className="text-primary">{Number(result.toFixed(6))}</span> {to}
      </p>
    </>
  );
}

/* ---------------------------------------------------------- currency (rates) */

/**
 * Reference rates are shown so the tool works with no API key. Enter your own
 * rate (or set CURRENCY_API_KEY and use the fetch button) for a real figure.
 */
export const REFERENCE_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  AED: 0.044,
  AUD: 0.018,
  SGD: 0.016,
  JPY: 1.8,
  CAD: 0.016,
};

export function CurrencyTool() {
  const [amount, setAmount] = React.useState(1000);
  const [from, setFrom] = React.useState('INR');
  const [to, setTo] = React.useState('USD');
  const [rate, setRate] = React.useState(REFERENCE_RATES.USD / REFERENCE_RATES.INR);
  const [notice, setNotice] = React.useState<string | null>(null);

  const result = amount * rate;
  const currencies = Object.keys(REFERENCE_RATES);

  return (
    <>
      <Alert tone="warning">
        Rates are indicative. The reference table below is a static sample so the tool works offline — enter the rate you actually
        need, or set <code>CURRENCY_API_KEY</code> and press “Fetch rate”. OpenHub never converts money on your behalf.
      </Alert>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Amount" name="cur-amount">
          {({ id }) => <Input id={id} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />}
        </Field>
        <Field label="From" name="cur-from">
          {({ id }) => (
            <Select
              id={id}
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setRate(REFERENCE_RATES[event.target.value] ? rate : rate);
              }}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="To" name="cur-to">
          {({ id }) => (
            <Select
              id={id}
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                if (REFERENCE_RATES[from] && REFERENCE_RATES[event.target.value]) {
                  setRate(REFERENCE_RATES[event.target.value] / REFERENCE_RATES[from]);
                }
              }}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`Rate (1 ${from} = ? ${to})`} name="cur-rate" hint="Edit this to use a live rate.">
          {({ id }) => <Input id={id} type="number" step="0.000001" value={rate} onChange={(event) => setRate(Number(event.target.value))} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {amount.toLocaleString()} {from} ≈ <span className="text-primary">{result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> {to}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const response = await fetch(`/api/tools/rate?from=${from}&to=${to}`);
              if (!response.ok) throw new Error('Rates are not configured on this server.');
              const data = (await response.json()) as { rate?: number };
              if (data.rate) {
                setRate(data.rate);
                setNotice('Rate fetched from the configured provider.');
              }
            } catch {
              setNotice('No currency API key is configured, so the reference rate stays in place.');
            }
          }}
        >
          Fetch rate
        </Button>
      </div>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </>
  );
}

/* -------------------------------------------------------------- time zones */

export const ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export function formatInZone(date: Date, zone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function TimezoneTool() {
  const [value, setValue] = React.useState(() => new Date().toISOString().slice(0, 16));
  const date = value ? new Date(value) : new Date();
  return (
    <>
      <Field label="Pick a moment" name="tz-moment">
        {({ id }) => <Input id={id} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} />}
      </Field>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ZONES.map((zone) => (
          <li key={zone} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-muted-foreground">{zone}</span>
            <span className="text-sm font-medium tabular-nums text-foreground">{formatInZone(date, zone)}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Conversion uses your browser's time zone database — no external service is called.</p>
    </>
  );
}

/* ------------------------------------------------------- colour & contrast */

export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function luminance(r: number, g: number, b: number) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  if (!first || !second) return null;
  const l1 = luminance(first.r, first.g, first.b);
  const l2 = luminance(second.r, second.g, second.b);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Number(ratio.toFixed(2));
}

export function ColorTool() {
  const [hex, setHex] = React.useState('#2563eb');
  const [background, setBackground] = React.useState('#ffffff');
  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
  const ratio = contrastRatio(hex, background);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Colour (HEX)" name="color-hex">
          {({ id }) => <Input id={id} value={hex} onChange={(event) => setHex(event.target.value)} />}
        </Field>
        <Field label="Background (HEX)" name="color-bg">
          {({ id }) => <Input id={id} value={background} onChange={(event) => setBackground(event.target.value)} />}
        </Field>
      </div>
      {rgb && hsl ? (
        <>
          <div className="flex h-20 items-center justify-center rounded-lg border border-border text-lg font-semibold" style={{ background, color: hex }}>
            Sample text
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">HEX</dt>
              <dd className="font-mono text-sm text-foreground">{hex}</dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">RGB</dt>
              <dd className="font-mono text-sm text-foreground">
                {rgb.r}, {rgb.g}, {rgb.b}
              </dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">HSL</dt>
              <dd className="font-mono text-sm text-foreground">
                {hsl.h}, {hsl.s}%, {hsl.l}%
              </dd>
            </div>
          </dl>
          {ratio ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={ratio >= 4.5 ? 'success' : ratio >= 3 ? 'warning' : 'danger'}>contrast {ratio}:1</Badge>
              <span className="text-sm text-muted-foreground">
                {ratio >= 4.5
                  ? 'Passes WCAG AA for normal text.'
                  : ratio >= 3
                    ? 'Passes WCAG AA for large text only.'
                    : 'Fails WCAG AA. Increase the contrast.'}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Enter a valid HEX colour such as #2563eb or #0af.</p>
      )}
    </>
  );
}

/* -------------------------------------------------------------- percentages */

export function PercentageTool() {
  const [a, setA] = React.useState(20);
  const [b, setB] = React.useState(250);
  const [part, setPart] = React.useState(50);
  const [total, setTotal] = React.useState(200);

  const ofResult = (a / 100) * b;
  const shareResult = total === 0 ? 0 : (part / total) * 100;
  const changeResult = b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="What is X% of Y?" name="pct-a">
          {({ id }) => (
            <span className="flex items-center gap-2">
              <Input id={id} type="number" value={a} onChange={(event) => setA(Number(event.target.value))} aria-label="Percent" />
              <span className="text-sm text-muted-foreground">% of</span>
              <Input type="number" value={b} onChange={(event) => setB(Number(event.target.value))} aria-label="Amount" />
            </span>
          )}
        </Field>
        <p className="self-end text-lg font-semibold tabular-nums text-foreground">= {Number(ofResult.toFixed(2))}</p>

        <Field label="X is what % of Y?" name="pct-part">
          {({ id }) => (
            <span className="flex items-center gap-2">
              <Input id={id} type="number" value={part} onChange={(event) => setPart(Number(event.target.value))} aria-label="Part" />
              <span className="text-sm text-muted-foreground">of</span>
              <Input type="number" value={total} onChange={(event) => setTotal(Number(event.target.value))} aria-label="Total" />
            </span>
          )}
        </Field>
        <p className="self-end text-lg font-semibold tabular-nums text-foreground">= {Number(shareResult.toFixed(2))}%</p>

        <Field label="Change from X to Y" name="pct-change">
          {({ id }) => (
            <span className="flex items-center gap-2">
              <Input id={id} type="number" value={b} onChange={(event) => setB(Number(event.target.value))} aria-label="From" />
              <span className="text-sm text-muted-foreground">→</span>
              <Input type="number" value={a} onChange={(event) => setA(Number(event.target.value))} aria-label="To" />
            </span>
          )}
        </Field>
        <p className="self-end text-lg font-semibold tabular-nums text-foreground">= {Number(changeResult.toFixed(2))}%</p>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- BMI */

export function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warning' as const };
  if (bmi < 25) return { label: 'Healthy range', tone: 'success' as const };
  if (bmi < 30) return { label: 'Overweight', tone: 'warning' as const };
  return { label: 'Obese', tone: 'danger' as const };
}

export function BmiTool() {
  const [heightCm, setHeightCm] = React.useState(170);
  const [weightKg, setWeightKg] = React.useState(65);
  const metres = heightCm / 100;
  const bmi = metres > 0 ? weightKg / (metres * metres) : 0;
  const category = bmiCategory(bmi);

  return (
    <>
      <Alert tone="info">
        BMI is a rough screening number for adults. It does not account for muscle, age, pregnancy or body composition and is not
        medical advice — talk to a health professional about your health.
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Height (cm)" name="bmi-height">
          {({ id }) => <Input id={id} type="number" value={heightCm} onChange={(event) => setHeightCm(Number(event.target.value))} />}
        </Field>
        <Field label="Weight (kg)" name="bmi-weight">
          {({ id }) => <Input id={id} type="number" value={weightKg} onChange={(event) => setWeightKg(Number(event.target.value))} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-semibold tabular-nums text-foreground">BMI {bmi.toFixed(1)}</p>
        <Badge tone={category.tone}>{category.label}</Badge>
      </div>
      <ul className="text-sm text-muted-foreground">
        <li>Under 18.5 — underweight</li>
        <li>18.5 to 24.9 — healthy range</li>
        <li>25 to 29.9 — overweight</li>
        <li>30 and above — obese</li>
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------- bill split */

export function SplitTool() {
  const [total, setTotal] = React.useState(1200);
  const [people, setPeople] = React.useState(4);
  const [tipPct, setTipPct] = React.useState(10);
  const withTip = total * (1 + tipPct / 100);
  const perPerson = people > 0 ? withTip / people : 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Bill total" name="split-total">
          {({ id }) => <Input id={id} type="number" value={total} onChange={(event) => setTotal(Number(event.target.value))} />}
        </Field>
        <Field label="Tip %" name="split-tip">
          {({ id }) => <Input id={id} type="number" value={tipPct} onChange={(event) => setTipPct(Number(event.target.value))} />}
        </Field>
        <Field label="People" name="split-people">
          {({ id }) => <Input id={id} type="number" min={1} value={people} onChange={(event) => setPeople(Number(event.target.value))} />}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">With tip</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{withTip.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Each person pays</p>
          <p className="text-lg font-semibold tabular-nums text-primary">{perPerson.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tip amount</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{(withTip - total).toFixed(2)}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        For unequal shares use the trip planner's shared expenses, which split evenly and track who has settled.
      </p>
    </>
  );
}

/* ------------------------------------------------------------- date & time */

export function ageFromDates(birth: Date, now: Date) {
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));
  return { years, months, days, totalDays };
}

export function AgeTool() {
  const [value, setValue] = React.useState('2000-01-01');
  const birth = value ? new Date(value) : null;
  const age = birth && !Number.isNaN(birth.getTime()) ? ageFromDates(birth, new Date()) : null;

  return (
    <>
      <Field label="Date of birth" name="age-dob" className="max-w-xs">
        {({ id }) => <Input id={id} type="date" value={value} onChange={(event) => setValue(event.target.value)} />}
      </Field>
      {age ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Years', age.years],
            ['Months', age.months],
            ['Days', age.days],
            ['Total days lived', age.totalDays],
          ].map(([label, stat]) => (
            <div key={String(label)} className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{stat}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick a date to calculate the age.</p>
      )}
    </>
  );
}

export function dateDifference(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  const days = Math.floor(ms / 86_400_000);
  return {
    days,
    weeks: Math.floor(days / 7),
    months: Math.floor(days / 30.44),
    years: Math.floor(days / 365.25),
  };
}

export function DateDiffTool() {
  const [from, setFrom] = React.useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = React.useState(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const a = new Date(from);
  const b = new Date(to);
  const diff = Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) ? null : dateDifference(a, b);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From" name="diff-from">
          {({ id }) => <Input id={id} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />}
        </Field>
        <Field label="To" name="diff-to">
          {({ id }) => <Input id={id} type="date" value={to} onChange={(event) => setTo(event.target.value)} />}
        </Field>
      </div>
      {diff ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Days', diff.days],
            ['Weeks', diff.weeks],
            ['Months (approx)', diff.months],
            ['Years (approx)', diff.years],
          ].map(([label, stat]) => (
            <div key={String(label)} className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{stat}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick two dates.</p>
      )}
    </>
  );
}

export function CountdownTool() {
  const [target, setTarget] = React.useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, new Date(target).getTime() - now);
  const seconds = Math.floor(remaining / 1000);
  const parts = {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    secs: seconds % 60,
  };

  return (
    <>
      <Field label="Count down to" name="countdown-target" className="max-w-xs">
        {({ id }) => <Input id={id} type="datetime-local" value={target} onChange={(event) => setTarget(event.target.value)} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-4" role="timer" aria-live="polite">
        {[
          ['Days', parts.days],
          ['Hours', parts.hours],
          ['Minutes', parts.minutes],
          ['Seconds', parts.secs],
        ].map(([label, stat]) => (
          <div key={String(label)} className="rounded-lg border border-border px-3 py-2 text-center">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{String(stat).padStart(2, '0')}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {remaining === 0 ? 'That moment has passed.' : 'The timer runs in your browser and stops when you leave the page.'}
      </p>
    </>
  );
}
