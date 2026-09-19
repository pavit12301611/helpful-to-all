/**
 * Navigation model shared by the desktop sidebar, the mobile drawer, the bottom
 * bar and the command palette. Kept as data (not JSX) so tests and the
 * accessibility helpers can reason about it.
 */

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
  /** Section grouping used by the sidebar. */
  section: 'main' | 'personal' | 'community' | 'tools' | 'admin';
  /** Only shown to these roles (empty = everyone). */
  roles?: string[];
  staffOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Your day at a glance', icon: 'layout-dashboard', section: 'main' },
  { href: '/search', label: 'Search', description: 'Search everything you can see', icon: 'search', section: 'main' },
  { href: '/notifications', label: 'Notifications', description: 'Updates about your activity', icon: 'bell', section: 'main' },
  { href: '/messages', label: 'Messages', description: 'Private conversations', icon: 'message-square', section: 'main' },

  { href: '/tasks', label: 'Tasks', description: 'To-dos, subtasks and repeats', icon: 'check-square', section: 'personal' },
  { href: '/notes', label: 'Notes', description: 'Private notes with tags', icon: 'notebook-pen', section: 'personal' },
  { href: '/habits', label: 'Habits', description: 'Streaks and progress', icon: 'repeat', section: 'personal' },
  { href: '/calendar', label: 'Calendar', description: 'Day, week and month view', icon: 'calendar', section: 'personal' },
  { href: '/expenses', label: 'Expenses', description: 'Track spending, export CSV', icon: 'wallet', section: 'personal' },
  { href: '/bookmarks', label: 'Bookmarks', description: 'Saved links', icon: 'bookmark', section: 'personal' },
  { href: '/timers', label: 'Timers', description: 'Pomodoro, stopwatch, countdown', icon: 'timer', section: 'personal' },

  { href: '/help', label: 'Community help', description: 'Ask, answer and offer help', icon: 'life-buoy', section: 'community' },
  { href: '/groups', label: 'Groups', description: 'Friends, family, class, neighbourhood', icon: 'users', section: 'community' },
  { href: '/events', label: 'Events', description: 'Public community events', icon: 'calendar-days', section: 'community' },
  { href: '/resources', label: 'Local resources', description: 'Hospitals, libraries, shelters', icon: 'map-pin', section: 'community' },
  { href: '/volunteer', label: 'Volunteer & donate', description: 'Opportunities and drives', icon: 'hand-heart', section: 'community' },
  { href: '/skills', label: 'Skill exchange', description: 'Teach and learn together', icon: 'graduation-cap', section: 'community' },
  { href: '/students', label: 'Student center', description: 'Notes, flashcards, exams', icon: 'book-open', section: 'community' },
  { href: '/safety', label: 'Safety hub', description: 'Emergency numbers and guides', icon: 'shield', section: 'community' },
  { href: '/trips', label: 'Trip planner', description: 'Plan trips with friends', icon: 'luggage', section: 'tools' },
  { href: '/business', label: 'Business tools', description: 'Invoices, inventory, customers', icon: 'store', section: 'tools' },
  { href: '/tools', label: 'Utility tools', description: 'QR, converters, generators', icon: 'wrench', section: 'tools' },
  { href: '/saved', label: 'Saved items', description: 'Everything you saved', icon: 'heart', section: 'tools' },
  { href: '/activity', label: 'Activity history', description: 'What you did on OpenHub', icon: 'history', section: 'tools' },

  { href: '/admin', label: 'Admin & moderation', description: 'Reports, members, verification', icon: 'shield-check', section: 'admin', staffOnly: true },
];

export const NAV_SECTIONS: { key: NavItem['section']; label: string }[] = [
  { key: 'main', label: 'Overview' },
  { key: 'personal', label: 'My productivity' },
  { key: 'community', label: 'Community' },
  { key: 'tools', label: 'Tools' },
  { key: 'admin', label: 'Moderation' },
];

/** Items shown in the mobile bottom bar (max five, always accessible). */
export const MOBILE_NAV_HREFS = ['/dashboard', '/help', '/groups', '/search', '/tools'];

export function navItemsForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.staffOnly && role !== 'moderator' && role !== 'admin') return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });
}
