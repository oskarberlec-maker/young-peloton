import { useCallback, useEffect, useState } from 'react';
import { readLocalSavedIds, safeSavedIds, writeLocalSavedIds } from './season-storage';
import { forgetSavedRace, rememberSavedRace } from './saved-race-alerts';
import type { U19Race } from './u19-data';

/** Device-only bookmarks. Never contacts an account provider or database. */
export function useRacingSeason() {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setSaved(readLocalSavedIds());
    sync();
    setReady(true);
    window.addEventListener('storage', sync);
    window.addEventListener('young-peloton-saved-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('young-peloton-saved-change', sync);
    };
  }, []);

  const persist = useCallback((ids: string[]) => {
    const next = safeSavedIds(ids);
    if (!writeLocalSavedIds(next)) {
      setError('Your browser is blocking local storage. Enable site storage to save races on this device.');
      return false;
    }
    setSaved(next);
    setError('');
    window.dispatchEvent(new Event('young-peloton-saved-change'));
    return true;
  }, []);

  // The second parameter is accepted for compatibility with race cards, but
  // every saved race is keyed by its stable ID, regardless of season year.
  const toggle = useCallback(async (id: string, _year?: number, race?: U19Race) => {
    const current = readLocalSavedIds();
    if (current.includes(id)) {
      if (persist(current.filter(x => x !== id))) forgetSavedRace(id);
    } else if (persist([...current, id]) && race) rememberSavedRace(race);
  }, [persist]);

  const clearAll = useCallback(async () => {
    const ids = readLocalSavedIds();
    if (persist([])) ids.forEach(forgetSavedRace);
  }, [persist]);
  const importIds = useCallback((ids: string[]) =>
    persist([...readLocalSavedIds(), ...ids]), [persist]);

  return { saved, ready, error, toggle, clearAll, importIds };
}
