/**
 * Minimal, dependency-free localisation layer.
 *
 * English and Hindi ship today; adding a language means adding a file in
 * `messages/` and its key to LOCALES. Keys are typed so a missing translation is
 * a compile error rather than a runtime surprise.
 */
import en from '../../../messages/en.json';
import hi from '../../../messages/hi.json';

export const dictionaries = { en, hi } as const;

export type Locale = keyof typeof dictionaries;
export type MessageKey = keyof typeof en;

/** Deep-ish fallback: missing keys fall back to English, then to the key itself. */
export function translate(locale: string, key: MessageKey, vars?: Record<string, string | number>): string {
  const dict = (dictionaries[locale as Locale] ?? dictionaries.en) as Record<string, string>;
  const template = dict[key] ?? (dictionaries.en as Record<string, string>)[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function getTranslator(locale: string): Translator {
  return (key, vars) => translate(locale, key, vars);
}

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];
