import { createContext, useContext, useEffect, useState } from 'react';
import type { AppSettings } from '../types';

type Theme = AppSettings['theme'];

const THEME_KEY = 'study_plan_theme';
const DEFAULT_THEME: Theme = 'dark';

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const [isDark, setIsDark] = useState(false);

  const setTheme = (t: Theme) => {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
    setThemeState(t);
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const update = () => {
      const dark =
        theme === 'dark' || (theme === 'system' && mq.matches);
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };

    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
