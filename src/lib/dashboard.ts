/**
 * Dashboard widget registry.
 *
 * Widgets are declarative so the dashboard page, the customisation sheet and
 * the tests all read the same list. Adding a widget = adding an entry here plus
 * a component in `src/features/dashboard/widgets`.
 */

export type WidgetKey =
  | 'tasks'
  | 'events'
  | 'habits'
  | 'community'
  | 'nearbyHelp'
  | 'suggestedSkills'
  | 'saved'
  | 'expenses'
  | 'reminders'
  | 'groups'
  | 'volunteer'
  | 'emergency';

export type WidgetDefinition = {
  key: WidgetKey;
  title: string;
  description: string;
  /** Spans two columns on desktop when true. */
  wide?: boolean;
  defaultVisible: boolean;
};

export const WIDGETS: WidgetDefinition[] = [
  { key: 'tasks', title: "Today's tasks", description: 'What is due today and what is overdue.', defaultVisible: true },
  { key: 'events', title: 'Upcoming events', description: 'Your next personal, group and trip events.', defaultVisible: true },
  { key: 'habits', title: 'Habit progress', description: 'Streaks and completion for this week.', defaultVisible: true },
  { key: 'reminders', title: 'Important reminders', description: 'Exam, deadline and assignment reminders.', defaultVisible: true },
  { key: 'nearbyHelp', title: 'Help requests near you', description: 'Open requests from your city.', defaultVisible: true },
  { key: 'community', title: 'Recent community posts', description: 'Latest public help requests.', defaultVisible: true, wide: true },
  { key: 'expenses', title: 'Expense summary', description: 'Spending this month by category.', defaultVisible: false },
  { key: 'groups', title: 'Recommended groups', description: 'Public groups you could join.', defaultVisible: true },
  { key: 'volunteer', title: 'Volunteer opportunities', description: 'Open opportunities you can join.', defaultVisible: true },
  { key: 'saved', title: 'Saved resources', description: 'Things you saved for later.', defaultVisible: false },
  { key: 'suggestedSkills', title: 'Skills to learn', description: 'People nearby who can teach you.', defaultVisible: false },
  { key: 'emergency', title: 'Emergency shortcut', description: 'Quick access to local emergency numbers.', defaultVisible: true },
];

export const WIDGET_KEYS = WIDGETS.map((widget) => widget.key);

export type WidgetState = { key: WidgetKey; visible: boolean; order: number };

export const DEFAULT_WIDGETS: WidgetState[] = WIDGETS.map((widget, index) => ({
  key: widget.key,
  visible: widget.defaultVisible,
  order: index,
}));

/** Parse the JSON stored in DashboardPreference.widgets, tolerating bad input. */
export function parseWidgets(raw: string | null | undefined): WidgetState[] {
  const fallback = new Map(DEFAULT_WIDGETS.map((widget) => [widget.key, widget]));
  if (!raw) return DEFAULT_WIDGETS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WIDGETS;
    const seen = new Set<WidgetKey>();
    const states: WidgetState[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as { key?: unknown; visible?: unknown; order?: unknown };
      const key = candidate.key as WidgetKey;
      if (!WIDGET_KEYS.includes(key) || seen.has(key)) continue;
      seen.add(key);
      states.push({
        key,
        visible: candidate.visible !== false,
        order: typeof candidate.order === 'number' ? candidate.order : states.length,
      });
    }

    // Add widgets introduced after the user saved their layout.
    for (const [key, widget] of fallback) {
      if (!seen.has(key)) states.push({ ...widget });
    }

    return states.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function serializeWidgets(states: WidgetState[]): string {
  return JSON.stringify(states.map((state, index) => ({ ...state, order: index })));
}

export function moveWidget(states: WidgetState[], key: WidgetKey, direction: -1 | 1): WidgetState[] {
  const index = states.findIndex((state) => state.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= states.length) return states;
  const next = [...states];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next.map((state, order) => ({ ...state, order }));
}

export function toggleWidget(states: WidgetState[], key: WidgetKey): WidgetState[] {
  return states.map((state) => (state.key === key ? { ...state, visible: !state.visible } : state));
}

export function visibleWidgets(states: WidgetState[]): WidgetState[] {
  return states.filter((state) => state.visible);
}
