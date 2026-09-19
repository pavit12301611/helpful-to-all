import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/feedback';
import { ThemeProvider, themeInitScript } from '@/components/layout/theme';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: {
    default: 'OpenHub - community utilities for everyday life',
    template: '%s · OpenHub',
  },
  description:
    'OpenHub is a free, self-hostable platform for tasks, groups, community help, student tools, local resources, volunteering, safety and small business utilities.',
  applicationName: 'OpenHub',
  keywords: ['community', 'self-hosted', 'tasks', 'groups', 'volunteer', 'local resources', 'students'],
  openGraph: {
    title: 'OpenHub',
    description: 'An all-in-one community utility platform you can host yourself.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = store.get('openhub-theme')?.value ?? 'system';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider initialTheme={theme}>
          <ToastProvider>
            <a href="#main" className="skip-link">
              Skip to main content
            </a>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
