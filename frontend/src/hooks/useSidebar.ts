import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sidebar_collapsed';

export function useSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { collapsed, toggle, expand };
}
