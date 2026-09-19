/**
 * Utility tools registry.
 *
 * Every tool runs in the browser (or, for QR codes, generates an image on
 * demand and stores nothing). No tool output, input or generated password is
 * ever written to the database.
 */

export type ToolCategory = 'text' | 'convert' | 'generate' | 'calculate' | 'datetime';

export type ToolDefinition = {
  key: string;
  label: string;
  description: string;
  category: ToolCategory;
  icon: string;
};

export const TOOL_CATEGORIES: { key: ToolCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All tools' },
  { key: 'generate', label: 'Generators' },
  { key: 'text', label: 'Text' },
  { key: 'convert', label: 'Converters' },
  { key: 'calculate', label: 'Calculators' },
  { key: 'datetime', label: 'Date & time' },
];

export const TOOLS: ToolDefinition[] = [
  { key: 'qr', label: 'QR code generator', description: 'Turn a link or text into a QR code you can download.', category: 'generate', icon: 'qr-code' },
  { key: 'password', label: 'Password generator', description: 'Strong random passwords. Generated in your browser only.', category: 'generate', icon: 'key-round' },
  { key: 'password-check', label: 'Password strength check', description: 'Estimate strength and find weak patterns locally.', category: 'generate', icon: 'shield-check' },
  { key: 'lorem', label: 'Placeholder text', description: 'Lorem ipsum paragraphs for mock-ups.', category: 'generate', icon: 'text-cursor' },
  { key: 'random', label: 'Random picker & dice', description: 'Numbers, dice rolls and picking a name from a list.', category: 'generate', icon: 'dices' },
  { key: 'case', label: 'Text case converter', description: 'UPPER, lower, Title, camelCase, snake_case and more.', category: 'text', icon: 'case-sensitive' },
  { key: 'counter', label: 'Word & character counter', description: 'Counts words, characters, sentences and reading time.', category: 'text', icon: 'hash' },
  { key: 'json', label: 'JSON formatter & validator', description: 'Pretty-print, minify and validate JSON locally.', category: 'text', icon: 'braces' },
  { key: 'csv', label: 'CSV ⇄ JSON converter', description: 'Convert a CSV table to JSON or back.', category: 'text', icon: 'table' },
  { key: 'base64', label: 'Base64 encode / decode', description: 'Encode and decode Base64 with UTF-8 support.', category: 'text', icon: 'binary' },
  { key: 'url', label: 'URL encode / decode', description: 'Percent-encode and decode URL components.', category: 'text', icon: 'link' },
  { key: 'hash', label: 'SHA-256 checksum', description: 'Hash text with SHA-256, SHA-1 or SHA-512 in the browser.', category: 'text', icon: 'fingerprint' },
  { key: 'units', label: 'Unit converter', description: 'Length, weight, volume and temperature.', category: 'convert', icon: 'ruler' },
  { key: 'currency', label: 'Currency converter', description: 'Convert amounts using the rates you enter or an optional API key.', category: 'convert', icon: 'banknote' },
  { key: 'timezone', label: 'Time zone converter', description: 'See the same moment in several time zones.', category: 'convert', icon: 'globe' },
  { key: 'color', label: 'Colour converter & contrast', description: 'HEX, RGB and HSL plus WCAG contrast checking.', category: 'convert', icon: 'palette' },
  { key: 'percentage', label: 'Percentage calculator', description: 'Percentage of, increase/decrease and share of total.', category: 'calculate', icon: 'percent' },
  { key: 'bmi', label: 'BMI calculator', description: 'Body mass index with the standard adult bands.', category: 'calculate', icon: 'scale' },
  { key: 'split', label: 'Bill splitter', description: 'Split a bill with tip between any number of people.', category: 'calculate', icon: 'receipt' },
  { key: 'age', label: 'Age calculator', description: 'Exact age in years, months and days.', category: 'datetime', icon: 'cake' },
  { key: 'date-diff', label: 'Date difference', description: 'Days, weeks and months between two dates.', category: 'datetime', icon: 'calendar-range' },
  { key: 'countdown', label: 'Countdown timer', description: 'Count down to a date or run a simple timer.', category: 'datetime', icon: 'timer' },
];

export function findTool(key: string | undefined): ToolDefinition {
  return TOOLS.find((tool) => tool.key === key) ?? TOOLS[0];
}
