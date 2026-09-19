import { describe, expect, it } from 'vitest';
import {
  UNIT_GROUPS,
  ageFromDates,
  bmiCategory,
  contrastRatio,
  convertTemperature,
  convertUnit,
  dateDifference,
  formatInZone,
  hexToRgb,
  rgbToHsl,
} from '@/features/tools/calculators';
import { formatClock, nextPomodoroState } from '@/features/timers/components';

const length = UNIT_GROUPS.find((group) => group.key === 'length')!;
const weight = UNIT_GROUPS.find((group) => group.key === 'weight')!;

describe('convertUnit', () => {
  it('converts within a group using the metre as the base', () => {
    expect(convertUnit(length, 'km', 'm', 1)).toBeCloseTo(1000, 6);
    expect(convertUnit(length, 'ft', 'in', 1)).toBeCloseTo(12, 4);
  });

  it('converts weights both ways', () => {
    expect(convertUnit(weight, 'kg', 'lb', 1)).toBeCloseTo(2.2046, 3);
    expect(convertUnit(weight, 'lb', 'kg', 2.2046226)).toBeCloseTo(1, 4);
  });

  it('returns the input when a unit is unknown', () => {
    expect(convertUnit(length, 'zz', 'm', 5)).toBe(5);
  });
});

describe('convertTemperature', () => {
  it('converts between Celsius, Fahrenheit and Kelvin', () => {
    expect(convertTemperature('c', 'f', 100)).toBeCloseTo(212, 6);
    expect(convertTemperature('f', 'c', 32)).toBeCloseTo(0, 6);
    expect(convertTemperature('c', 'k', 0)).toBeCloseTo(273.15, 6);
    expect(convertTemperature('k', 'c', 273.15)).toBeCloseTo(0, 6);
  });
});

describe('hexToRgb and rgbToHsl', () => {
  it('parses three and six digit hex values', () => {
    expect(hexToRgb('#0af')).toEqual({ r: 0, g: 170, b: 255 });
    expect(hexToRgb('#2563eb')).toEqual({ r: 37, g: 99, b: 235 });
  });

  it('rejects values that are not hex', () => {
    expect(hexToRgb('not-a-colour')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
  });

  it('converts pure colours to HSL', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('flags low contrast pairs', () => {
    const ratio = contrastRatio('#cccccc', '#ffffff');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeLessThan(3);
  });

  it('returns null when a colour cannot be parsed', () => {
    expect(contrastRatio('nope', '#ffffff')).toBeNull();
  });
});

describe('formatInZone', () => {
  it('renders the same moment in another zone', () => {
    const moment = new Date('2026-03-10T12:00:00.000Z');
    expect(formatInZone(moment, 'Asia/Kolkata')).toContain('2026');
    expect(formatInZone(moment, 'UTC')).toContain('2026');
  });
});

describe('bmiCategory', () => {
  it('uses the standard adult bands', () => {
    expect(bmiCategory(17).label).toBe('Underweight');
    expect(bmiCategory(22).label).toBe('Healthy range');
    expect(bmiCategory(27).label).toBe('Overweight');
    expect(bmiCategory(32).label).toBe('Obese');
  });
});

describe('ageFromDates', () => {
  it('handles a birthday that has not happened yet this year', () => {
    const age = ageFromDates(new Date('2000-06-15T00:00:00.000Z'), new Date('2026-03-10T00:00:00.000Z'));
    expect(age).toMatchObject({ years: 25, months: 8 });
  });

  it('counts days lived', () => {
    const age = ageFromDates(new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-11T00:00:00.000Z'));
    expect(age.totalDays).toBe(10);
  });
});

describe('dateDifference', () => {
  it('reports days, weeks and months regardless of order', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    const b = new Date('2026-02-05T00:00:00.000Z');
    expect(dateDifference(a, b).days).toBe(35);
    expect(dateDifference(b, a).days).toBe(35);
    expect(dateDifference(a, b).weeks).toBe(5);
  });
});

describe('timer helpers', () => {
  it('formats seconds as mm:ss or h:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('switches mode and counts completed focus blocks', () => {
    expect(nextPomodoroState({ mode: 'focus', completed: 0 }, true)).toEqual({ mode: 'break', completed: 1 });
    expect(nextPomodoroState({ mode: 'break', completed: 1 }, true)).toEqual({ mode: 'focus', completed: 1 });
    expect(nextPomodoroState({ mode: 'focus', completed: 2 }, false)).toEqual({ mode: 'focus', completed: 2 });
  });
});
