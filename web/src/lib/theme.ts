/**
 * Theme management: dark / light / follow-system.
 *
 * The choice is persisted in localStorage. `system` resolves via the
 * `prefers-color-scheme` media query and re-applies live when the OS theme
 * changes. Applying a theme toggles the `light` class on <html> (dark is the
 * default in CSS, so light is the only class we ever add).
 */

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'dvalincode-theme';

const media = (): MediaQueryList | null =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** The persisted preference, defaulting to `system`. localStorage access is
 * wrapped because it throws in sandboxed iframes and some privacy modes. */
export function getStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Resolve a preference to the concrete theme that should render right now. */
export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return media()?.matches ? 'dark' : 'light';
  return theme;
}

/** Apply the resolved theme to <html> without persisting. */
export function applyResolvedTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('light', resolved === 'light');
}

/** Persist a preference and apply it immediately. Applying still works even if
 * persistence fails (e.g. storage disabled). */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable — apply for this session without persisting
  }
  applyResolvedTheme(theme);
}

/**
 * Apply the stored theme on startup and keep `system` in sync with the OS.
 * Returns a cleanup function that removes the OS listener.
 */
export function initTheme(): () => void {
  applyResolvedTheme(getStoredTheme());

  const mq = media();
  if (!mq) return () => {};

  const onChange = () => {
    if (getStoredTheme() === 'system') applyResolvedTheme('system');
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
