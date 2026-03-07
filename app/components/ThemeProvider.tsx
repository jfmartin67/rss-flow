'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Font = 'red-hat' | 'ibm-plex';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  font: Font;
  toggleFont: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  font: 'red-hat',
  toggleFont: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [font, setFont] = useState<Font>('red-hat');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    const savedFont = localStorage.getItem('rss-flow:font') as Font | null;
    if (savedFont) setFont(savedFont);
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (mounted) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  useEffect(() => {
    const root = document.documentElement;
    if (font === 'ibm-plex') {
      root.classList.add('font-ibm-plex');
    } else {
      root.classList.remove('font-ibm-plex');
    }
    if (mounted) {
      localStorage.setItem('rss-flow:font', font);
    }
  }, [font, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleFont = () => {
    setFont(prev => prev === 'red-hat' ? 'ibm-plex' : 'red-hat');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, font, toggleFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context;
}
