import type { U19Race } from './u19-data';

const ROOT = 'https://raw.githubusercontent.com/oskarberlec-maker/young-peloton/race-source-data/';
export type SourceSyncStatus = {
  schemaVersion: number; lastRunAt: string; complete: boolean;
  totalSources: number; attempted: number; successful: number; errors: number;
  supportedSources: number; changedSources: number; needsReview: number; updatedRaces: number;
  calendarCandidates2027?: number; calendarVerified2027?: number; calendarNewCandidates2027?: number;
  confirmed2027Added?: number;
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

/** Add only complete, explicitly dated 2027 editions from the verified feed. */
export function mergeConfirmed2027(races: U19Race[], payload: unknown): U19Race[] {
  const data = payload as {schemaVersion?:number; confirmed2027?:Record<string,U19Race>};
  if (!data || data.schemaVersion !== 1 || !data.confirmed2027 || typeof data.confirmed2027 !== 'object') return races;
  const key = (r:U19Race) => [r.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' '),r.countryCode,({M:'U19M','Ž':'U19W'} as Record<string,string>)[r.sex] || r.sex].join('|');
  const result = [...races];
  const ids = new Set(races.map(r=>r.id));
  const identities = new Set(races.filter(r=>r.date.startsWith('2027-')).map(key));
  for (const [id,r] of Object.entries(data.confirmed2027)) {
    if (!r || typeof r !== 'object' || r.id !== id || !/^(uci-2027-\d+|confirmed-2027-[a-f0-9]{20})$/.test(id) || ids.has(id)) continue;
    const strings = ['name','place','countryCode','country','sex','type','confirmation','status','sourceUrl','proofUrl','resultUrl','bucket','state','precision','region','source2026Id','sourceUpdatedAt'] as const;
    if (strings.some(k=>typeof r[k] !== 'string' || r[k]!.length>1000 || /[<>\u0000-\u0008]/.test(r[k]!))) continue;
    if (!r.name || !/^[A-Z]{2}$/.test(r.countryCode) || !/^https?:\/\//.test(r.sourceUrl) || !isDate(r.date) || !isDate(r.enddate)
      || !r.date.startsWith('2027-') || !r.enddate.startsWith('2027-') || r.date>r.enddate
      || Date.parse(r.enddate)-Date.parse(r.date)>31*86400000 || Number.isNaN(Date.parse(r.sourceUpdatedAt!))) continue;
    if (r.state!=='active' || r.duplicate!==0 || r.bucket!=='confirmed' || typeof r.roadUnconfirmed!=='number') continue;
    if ((r.lat!==null && (typeof r.lat!=='number' || !Number.isFinite(r.lat) || Math.abs(r.lat)>90))
      || (r.lon!==null && (typeof r.lon!=='number' || !Number.isFinite(r.lon) || Math.abs(r.lon)>180))) continue;
    if (identities.has(key(r))) continue;
    result.push({...r}); ids.add(id); identities.add(key(r));
  }
  return result;
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
