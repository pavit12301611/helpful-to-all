import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WIDGETS,
  WIDGET_KEYS,
  moveWidget,
  parseWidgets,
  serializeWidgets,
  toggleWidget,
  visibleWidgets,
  type WidgetState,
} from '@/lib/dashboard';

const states: WidgetState[] = [
  { key: 'tasks', visible: true, order: 0 },
  { key: 'events', visible: true, order: 1 },
  { key: 'habits', visible: false, order: 2 },
];

describe('parseWidgets', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(parseWidgets(null)).toEqual(DEFAULT_WIDGETS);
    expect(parseWidgets('not json')).toEqual(DEFAULT_WIDGETS);
    expect(parseWidgets('{"key":"tasks"}')).toEqual(DEFAULT_WIDGETS);
  });

  it('ignores unknown or duplicated keys', () => {
    const parsed = parseWidgets(
      JSON.stringify([
        { key: 'tasks', visible: false, order: 0 },
        { key: 'tasks', visible: true, order: 1 },
        { key: 'nonsense', visible: true, order: 2 },
      ]),
    );
    expect(parsed.filter((state) => state.key === 'tasks')).toHaveLength(1);
    expect(parsed.some((state) => state.key === ('nonsense' as never))).toBe(false);
  });

  it('adds widgets that did not exist when the layout was saved', () => {
    const parsed = parseWidgets(JSON.stringify([{ key: 'tasks', visible: true, order: 0 }]));
    expect(parsed.map((state) => state.key).sort()).toEqual([...WIDGET_KEYS].sort());
  });

  it('round-trips the saved layout and appends the widgets it does not mention', () => {
    const parsed = parseWidgets(serializeWidgets(states));
    expect(parsed.slice(0, 3).map((state) => state.key)).toEqual(['tasks', 'events', 'habits']);
    expect(parsed).toHaveLength(WIDGET_KEYS.length);
  });
});

describe('moveWidget', () => {
  it('swaps neighbours and renumbers the order', () => {
    const moved = moveWidget(states, 'tasks', 1);
    expect(moved.map((state) => state.key)).toEqual(['events', 'tasks', 'habits']);
    expect(moved.map((state) => state.order)).toEqual([0, 1, 2]);
  });

  it('does not move past either end', () => {
    expect(moveWidget(states, 'tasks', -1)).toEqual(states);
    expect(moveWidget(states, 'habits', 1)).toEqual(states);
  });

  it('ignores an unknown widget', () => {
    expect(moveWidget(states, 'volunteer', 1)).toEqual(states);
  });
});

describe('toggleWidget and visibleWidgets', () => {
  it('flips only the widget that was clicked', () => {
    const toggled = toggleWidget(states, 'habits');
    expect(toggled.find((state) => state.key === 'habits')?.visible).toBe(true);
    expect(toggled.find((state) => state.key === 'tasks')?.visible).toBe(true);
  });

  it('lists only what is visible', () => {
    expect(visibleWidgets(states).map((state) => state.key)).toEqual(['tasks', 'events']);
  });
});
