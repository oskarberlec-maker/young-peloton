import { loadSourceSyncStatus, sourceReportUrl, type SourceSyncStatus } from './source-updates';

export type ScanRun = SourceSyncStatus & { reportUrl?: string };
const ROOT = 'https://raw.githubusercontent.com/oskarberlec-maker/young-peloton/';
export function parseScanRuns(data: unknown): ScanRun[] {
  const value = data as { schemaVersion?: number; runs?: unknown[] } | null;
  if (value?.schemaVersion !== 1 || !Array.isArray(value.runs)) return [];
  return value.runs.filter((item): item is ScanRun => {
    const r = item as ScanRun | null;
    return !!r && typeof r.lastRunAt === 'string' && Number.isFinite(Date.parse(r.lastRunAt))
      && typeof r.complete === 'boolean'
      && ['totalSources','successful','errors','updatedRaces'].every(k => {
        const n = (r as unknown as Record<string,unknown>)[k];
        return typeof n === 'number' && Number.isFinite(n) && n >= 0;
      });
  }).map(r => ({ ...r, reportUrl: typeof r.reportUrl === 'string' && r.reportUrl.startsWith(ROOT) ? r.reportUrl : '' }));
}
export function mergeScanRuns(...groups: ScanRun[][]): ScanRun[] {
  const runs = new Map<string,ScanRun>();
  for (const group of groups) for (const run of group) runs.set(run.lastRunAt,run);
  return [...runs.values()].sort((a,b)=>Date.parse(b.lastRunAt)-Date.parse(a.lastRunAt));
}
// One explicit timezone avoids moving runs between days during hydration or travel.
export const scanDay = (at: string) => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Ljubljana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
export async function loadScanHistory(signal: AbortSignal): Promise<{runs:ScanRun[];archiveUnavailable:boolean}> {
  async function read(url:string) {
    try {
      const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
      if(!response.ok)return [];
      return parseScanRuns(await response.json());
    } catch { return []; }
  }
  const [seed,remote,latest]=await Promise.all([
    read('/data/scan-history.json'),read(ROOT+'race-source-data/scans.json'),loadSourceSyncStatus(signal),
  ]);
  // Prefer permanent archived links over the latest-report fallback.
  return {runs:mergeScanRuns(latest?[{...latest,reportUrl:sourceReportUrl}]:[],seed,remote),archiveUnavailable:remote.length===0};
}
