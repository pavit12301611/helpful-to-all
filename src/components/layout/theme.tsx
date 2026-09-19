'use client';

import * as React from 'react';

/**
 * Theme handling.
 *
 * The stored preference is applied by an inline script before paint (see
 * app/layout.tsx) so there is no flash of the wrong theme. This provider only
 * handles switching and remembering the choice.
 */

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = React.createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: 'system',
  setTheme: () => undefined,
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: string }) {
  const [theme, setThemeState] = React.useState<Theme>(
    initialTheme === 'dark' || initialTheme === 'light' ? initialTheme : 'system',
  );

  React.useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem('openhub-theme', next);
    } catch {
      // Private mode: the inline script will fall back to the system preference.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

/** Inline script injected in <head>: applies the saved theme before first paint. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('openhub-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s?s==='dark'||(s==='system'&&m):m;var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
