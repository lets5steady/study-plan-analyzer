import { createContext, useContext, useEffect, useState } from 'react';
import type { AppSettings } from '../types';

type Theme = AppSettings['theme'];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

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
