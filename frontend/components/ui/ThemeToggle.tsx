'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'see-theme';
const CYCLE: Theme[] = ['light', 'dark', 'system'];

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme:dark)').matches;
}

function applyTheme(theme: Theme) {
  const isDark = resolveIsDark(theme);
  document.documentElement.classList.toggle('dark', isDark);
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
  }
}

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'dark' || v === 'light') return v;
  return 'system';
}

const ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStored());
    setMounted(true);
  }, []);

  // 监听系统偏好变化（仅 system 模式需要）
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme:dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const toggle = useCallback(() => {
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setTheme(next);
    applyTheme(next);
  }, [theme]);

  // SSR / hydration: 渲染占位避免闪烁
  if (!mounted) {
    return <div className="w-7 h-7" />;
  }

  const Icon = ICON[theme];

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-7 h-7 rounded-lg text-secondary-token hover:text-action-text hover:bg-action-surface transition-colors"
      title={LABEL[theme]}
      aria-label={`Theme: ${LABEL[theme]}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
