/**
 * Inline script injected into <head> before first paint.
 * Reads localStorage("theme") and applies .dark to <html> immediately,
 * preventing a flash of light mode for dark-mode users (FOUC).
 */
export const DARK_INIT =
  "(function(){" +
  "var s=localStorage.getItem('theme');" +
  "var d=window.matchMedia('(prefers-color-scheme:dark)').matches;" +
  "if(s==='dark'||(s===null&&d))document.documentElement.classList.add('dark');" +
  "})();";
