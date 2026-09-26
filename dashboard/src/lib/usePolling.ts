import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` — and when the tab regains focus — while the tab is visible. */
export function usePolling(fn: () => void, ms: number, enabled = true) {
  const latest = useRef(fn);
  latest.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (!document.hidden) latest.current();
    };
    const timer = setInterval(tick, ms);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [ms, enabled]);
}
