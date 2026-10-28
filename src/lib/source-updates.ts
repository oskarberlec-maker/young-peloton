import type { U19Race } from './u19-data';

const ROOT = 'https://raw.githubusercontent.com/oskarberlec-maker/young-peloton/race-source-data/';
export type SourceSyncStatus = {
  schemaVersion: number; lastRunAt: string; complete: boolean;
  totalSources: number; attempted: number; successful: number; errors: number;
  supportedSources: number; changedSources: number; needsReview: number; updatedRaces: number;
};
type Override = { fields: Partial<U19Race>; updatedAt: string; sourceUrl: string; adapter: string };
const fields = new Set(['date','enddate','name','place','type','state','liveLevel','uciClass','lat','lon','precision']);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

/** A failed or malformed live feed must never erase the bundled calendar. */
export function applySourceUpdates(races: U19Race[], payload: unknown): U19Race[] {
  const data = payload as {schemaVersion?: number; races?: Record<string, Override>};
  if (!data || data.schemaVersion !== 1 || !data.races || typeof data.races !== 'object') return races;
  return races.map(race => {
    const update = data.races?.[race.id];
    if (!update || !update.fields || typeof update.fields !== 'object' || typeof update.updatedAt !== 'string'
      || Number.isNaN(Date.parse(update.updatedAt)) || !/^https?:\/\//.test(update.sourceUrl || '')) return race;
    const patch = update.fields;
    if (Object.keys(patch).some(key => !fields.has(key))) return race;
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'lat' || key === 'lon') { if (value !== null) return race; continue; }
      if (typeof value !== 'string' || value.length > 500 || /[<>\u0000-\u0008]/.test(value)) return race;
    }
    if (patch.state && patch.state !== 'cancelled') return race;
    if (patch.liveLevel && !['uci','national','regional'].includes(patch.liveLevel)) return race;
    const updated = {...race,...patch};
    if ('date' in patch || 'enddate' in patch) {
      const year = (race.date || race.enddate).slice(0,4);
      if (!isDate(updated.date) || !isDate(updated.enddate) || updated.date > updated.enddate
        || updated.date.slice(0,4) !== year || updated.enddate.slice(0,4) !== year) return race;
    }
    return {...updated, sourceUpdatedAt: update.updatedAt, updateSourceUrl: update.sourceUrl};
  });
}

const CACHE_KEY = 'yp-source-overrides-v1';
function cachedUpdates(): unknown {
  try { return typeof window === 'undefined' ? null : JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null'); }
  catch { return null; }
}
export async function loadSourceUpdates(signal?: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(ROOT + 'overrides.json', {signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]), cache:'no-cache'});
    if (!response.ok) return cachedUpdates();
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !data.races || typeof data.races !== 'object') return cachedUpdates();
    try { if (typeof window !== 'undefined') window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* Storage may be disabled/full. */ }
    return data;
  } catch { return cachedUpdates(); }
}

export async function loadSourceSyncStatus(signal?: AbortSignal): Promise<SourceSyncStatus | null> {
  try {
    const response = await fetch(ROOT + 'status.json', {signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]), cache:'no-cache'});
    if (!response.ok) return null;
    const data = await response.json();
    return data.schemaVersion === 1 && typeof data.lastRunAt === 'string' && !Number.isNaN(Date.parse(data.lastRunAt))
      && ['totalSources','attempted','successful','errors','supportedSources','changedSources','needsReview','updatedRaces'].every(k => typeof data[k] === 'number' && data[k] >= 0) ? data : null;
  } catch { return null; }
}
export const sourceHistoryUrl = ROOT + 'history.json';
export const sourceReportUrl = ROOT + 'report.json';
