import type { U19Race } from './u19-data';
import { readLocalSavedIds } from './season-storage';

export const ALERT_EVENT = 'young-peloton-race-alerts';
const SNAPSHOTS_KEY = 'yp-saved-race-snapshots-v1';
const NEW_2027_KEY = 'yp-new-2027-confirmations-v1';
const ALERTS_KEY = 'yp-saved-race-alerts-v1';
const NOTIFY_KEY = 'yp-saved-notifications-enabled-v1';
const LAST_CHECK_KEY = 'yp-saved-last-check-v1';
const MIN_INTERVAL_MS = 5 * 60 * 1000;

const labels = {
  date: 'Start date', enddate: 'End date', name: 'Race name',
  place: 'Location', state: 'Race status', type: 'Race type',
  bucket: 'U19 verification', confirmation: 'Eligibility',
  uciClass: 'UCI class', liveLevel: 'Race level',
  sourceUrl: 'Official source', proofUrl: 'Eligibility source',
  resultUrl: 'Results link', status: 'Race note',
} as const;

export type TrackedField = keyof typeof labels;
export type RaceSnapshot = { id: string; fields: Record<TrackedField, string> };
export type SavedRaceAlert = {
  id: string; raceId: string; raceName: string;
  checkedAt: string; changes: string[];
};

export const raceSnapshot = (race: U19Race): RaceSnapshot => ({
  id: race.id,
  fields: Object.fromEntries((Object.keys(labels) as TrackedField[])
    .map(k => [k, String(race[k] ?? '')])) as Record<TrackedField, string>,
});
export function compareSnapshots(before: RaceSnapshot, after: RaceSnapshot): string[] {
  if (before.id !== after.id) return [];
  return (Object.keys(labels) as TrackedField[])
    .filter(field => before.fields[field] !== after.fields[field])
    .map(field => `${labels[field]}: ${before.fields[field] || 'not listed'} → ${after.fields[field] || 'not listed'}`);
}
function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; }
  catch { return fallback; }
}
function readSnapshots(): Record<string, RaceSnapshot> {
  const value = readJson<unknown>(SNAPSHOTS_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, RaceSnapshot> : {};
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* browser storage unavailable */ }
}
export const readSavedRaceAlerts = (): SavedRaceAlert[] => {
  const result = readJson<unknown>(ALERTS_KEY, []);
  return Array.isArray(result) ? result.filter((a): a is SavedRaceAlert =>
    a && typeof a.id === 'string' && typeof a.raceId === 'string' &&
    typeof a.raceName === 'string' && Array.isArray(a.changes)).slice(0, 60) : [];
};
export const readLastSavedCheck = (): string => readJson<string>(LAST_CHECK_KEY, '');
export const desktopNotificationsEnabled = (): boolean => readJson<boolean>(NOTIFY_KEY, false);
export const setDesktopNotificationsEnabled = (enabled: boolean) => {writeJson(NOTIFY_KEY, enabled);};
export function clearSavedRaceAlerts(): void {
  writeJson(ALERTS_KEY, []);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ALERT_EVENT));
}
export function rememberSavedRace(race: U19Race): void {
  const snapshots = readSnapshots();
  snapshots[race.id] = raceSnapshot(race);
  writeJson(SNAPSHOTS_KEY, snapshots);
}
export function forgetSavedRace(id: string): void {
  const snapshots = readSnapshots();
  delete snapshots[id];
  writeJson(SNAPSHOTS_KEY, snapshots);
}
let activeCheck: Promise<SavedRaceAlert[]> | null = null;
export async function checkSavedRaceChanges(force = false): Promise<SavedRaceAlert[]> {
  if (typeof window === 'undefined') return [];
  if (activeCheck) return activeCheck;
  const ids = readLocalSavedIds();
  if (!ids.length) return [];
  const lastCheck = Date.parse(readLastSavedCheck());
  if (!force && Number.isFinite(lastCheck) && Date.now() - lastCheck < MIN_INTERVAL_MS) return [];
  activeCheck = (async () => {
    // Load fresh published edits, not guesses from changed HTML of external sources.
    const { loadU19Races } = await import('./u19-data');
    const { loadSourceUpdates } = await import('./source-updates');
    const years = [...new Set(ids.map(id =>
      id.startsWith('uci-2027-') || id.startsWith('confirmed-2027-') ? 2027 : 2026))];
    const [datasets,published] = await Promise.all([
      Promise.all(years.map(year => loadU19Races(undefined, undefined, year))),
      loadSourceUpdates(),
    ]);
    const savedIds = new Set(readLocalSavedIds());
    const current = datasets.flatMap(dataset => dataset.races).filter(r => savedIds.has(r.id));
    const before = readSnapshots();
    const at = new Date().toISOString();
    const alerts: SavedRaceAlert[] = [];
    for (const race of current) {
      const snapshot = raceSnapshot(race);
      const old = before[race.id];
      if (old && typeof old === 'object' && old.id === race.id && old.fields && typeof old.fields === 'object') {
        const changes = compareSnapshots(old, snapshot);
        if (changes.length) alerts.push({
          id: race.id + ':' + at, raceId: race.id, raceName: race.name, checkedAt: at, changes,
        });
      }
      before[race.id] = snapshot;
    }
    // A new 2027 edition uses a different ID from its saved 2026 race.
    // Compare published confirmations against device-local previous observations.
    const previousKnown = readJson<Record<string,string>>(NEW_2027_KEY, {});
    const hasBaseline = typeof localStorage.getItem(NEW_2027_KEY) === 'string';
    const confirmations = (published && typeof published === 'object' &&
      (published as {confirmed2027?: unknown}).confirmed2027) as Record<string,unknown> | undefined;
    if (confirmations && typeof confirmations === 'object') {
      const known = {...previousKnown};
      for (const [editionId,value] of Object.entries(confirmations)) {
        if (!value || typeof value !== 'object') continue;
        const race=value as {source2026Id?: unknown;date?: unknown;name?: unknown;sourceUpdatedAt?: unknown};
        if (typeof race.date !== 'string' || !/^2027-\d\d-\d\d$/.test(race.date)) continue;
        known[editionId]=race.date;
        if (previousKnown[editionId] || typeof race.source2026Id !== 'string' ||
          !savedIds.has(race.source2026Id) || typeof race.name !== 'string') continue;
        const newerThanPreviousCheck = Number.isFinite(lastCheck) &&
          typeof race.sourceUpdatedAt === 'string' && Date.parse(race.sourceUpdatedAt) > lastCheck;
        if (hasBaseline || newerThanPreviousCheck) alerts.push({
          id:editionId+':'+at,raceId:editionId,raceName:race.name,checkedAt:at,
          changes:['2027 race date confirmed: '+race.date],
        });
      }
      writeJson(NEW_2027_KEY, known);
    }
    // Do not erase a saved race's snapshot simply because its source is missing.
    writeJson(SNAPSHOTS_KEY, before);
    writeJson(LAST_CHECK_KEY, at);
    if (alerts.length) {
      const existing = readSavedRaceAlerts();
      writeJson(ALERTS_KEY, [...alerts, ...existing].slice(0, 60));
    }
    window.dispatchEvent(new Event(ALERT_EVENT));
    if (alerts.length && desktopNotificationsEnabled() &&
      'Notification' in window && Notification.permission === 'granted' &&
      'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Young Peloton: saved races updated', {
          body: alerts.length === 1
            ? `${alerts[0]!.raceName}: ${alerts[0]!.changes[0]}`
            : `${alerts.length} saved races changed. Open Young Peloton to see the details.`,
          tag: 'young-peloton-saved-updates',
          icon: '/icons/icon-192.png',
          data: { url: '/season' },
        });
      } catch { /* Keep in-app change log if OS notifications unavailable. */ }
    }
    return alerts;
  })().finally(() => {activeCheck = null;});
  return activeCheck;
}
