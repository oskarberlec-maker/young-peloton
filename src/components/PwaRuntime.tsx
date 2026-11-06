import { useEffect } from 'react';
import { checkSavedRaceChanges } from '@/lib/saved-race-alerts';

export function PwaRuntime() {
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    }
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void checkSavedRaceChanges().catch(() => undefined);
      }
    };
    check();
    const onVisibility = () => {if (document.visibilityState === 'visible') check();};
    const timer = window.setInterval(check, 15 * 60 * 1000);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    window.addEventListener('young-peloton-saved-change', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      window.removeEventListener('young-peloton-saved-change', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return null;
}
