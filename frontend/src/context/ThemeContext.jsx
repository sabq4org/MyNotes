import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mynotes:theme';
const VALID = new Set(['light', 'dark', 'system']);

const LIGHT_THEME_COLOR = '#ffffff';
const DARK_THEME_COLOR = '#0d0d11';

const ThemeContext = createContext(null);

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.has(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyResolved(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStored());
  const [resolved, setResolved] = useState(() => {
    const pref = readStored();
    return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
  });

  const recompute = useCallback((pref) => {
    const next = pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
    setResolved(next);
    applyResolved(next);
    return next;
  }, []);

  useEffect(() => {
    recompute(preference);
  }, [preference, recompute]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (preference === 'system') recompute('system');
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, [preference, recompute]);

  const setPreference = useCallback((next) => {
    if (!VALID.has(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setPreference]);

  const value = useMemo(
    () => ({ preference, resolved, isDark: resolved === 'dark', setPreference, toggle }),
    [preference, resolved, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
