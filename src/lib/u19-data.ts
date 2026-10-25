/** European U19 2026 race archive (user-supplied source ZIP dated 2026-10-23).
 * Each row is an original record; 'merged' and duplicate rows remain auditable but
 * are not treated as distinct races in the default list or on the map.
 */
export type U19Race = {
  id: string; date: string; enddate: string; name: string; place: string;
  countryCode: string; country: string; sex: string; type: string;
  confirmation: string; status: string; sourceUrl: string; proofUrl: string;
  resultUrl: string; bucket: string; state: string;
  lat: number | null; lon: number | null; precision: string;
  region: string; roadUnconfirmed: number; duplicate: number;
};
export type RaceManifest = {
  year: number; asOf: string; sourceMeta: { total: number; cancelled: number; complete: boolean };
  rawEuropeanRecords: number; uniqueVisibleRecords: number;
  mergedRecords: number; semanticDuplicateRecords: number; missingDates: number;
  allHaveSource: boolean; fields: (keyof U19Race)[]; parts: string[];
  sourceMap?: { method: string; sources: { name: string; url: string }[] };
};
const ROOT = '/data/2026/';
export const visibleRace = (r: U19Race) => r.state !== 'merged' && !r.duplicate;
export const safeUrl = (url?: string) => typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '';
export const countryLabel = (code: string, fallback: string) => {
  if (code === 'XK') return 'Kosovo';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || fallback; }
  catch { return fallback || code; }
};
export const niceDate = (date?: string) => {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date unconfirmed';
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? 'Date unconfirmed' : new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d);
};
export async function loadU19Races(onProgress?: (loaded: number,total: number) => void, signal?: AbortSignal): Promise<{ manifest: RaceManifest, races: U19Race[] }> {
  const m = await fetch(ROOT + 'manifest.json', {signal});
  if (!m.ok) throw new Error(`Failed to load race manifest (${m.status})`);
  const manifest: RaceManifest = await m.json();
  const races: U19Race[] = [];
  // Four concurrent downloads avoid a large burst on slow mobile connections.
  // Retry transient failures, but never silently display an incomplete archive.
  const workerCount = Math.min(4, manifest.parts.length);
  const getPart = async (part: string): Promise<unknown[][]> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const resp = await fetch(ROOT + part, { signal });
        if (!resp.ok) throw new Error(`Failed to load ${part} (${resp.status})`);
        return await resp.json();
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw lastError;
  };
  let next = 0, loaded = 0;
  await Promise.all(Array.from({length:workerCount}, async () => {
    while (next < manifest.parts.length) {
      const i = next++;
      const rows = await getPart(manifest.parts[i]);
      for (const row of rows) {
        const race = {} as U19Race;
        manifest.fields.forEach((field,j) => { (race as unknown as Record<string, unknown>)[field] = row[j]; });
        races.push(race);
      }
      onProgress?.(++loaded,manifest.parts.length);
    }
  }));
  // Sorting also makes chunk fetch completion order irrelevant.
  races.sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999') || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  if (races.length !== manifest.rawEuropeanRecords) throw new Error(`Incomplete archive: ${races.length} / ${manifest.rawEuropeanRecords} rows`);
  if (new Set(races.map(r=>r.id)).size !== races.length) throw new Error('Duplicate source IDs detected');
  if (races.filter(visibleRace).length !== manifest.uniqueVisibleRecords) throw new Error('Deduplication checksum mismatch');
  if (races.some(r=>!safeUrl(r.sourceUrl))) throw new Error('Missing or unsafe source URL');
  return {manifest,races};
}