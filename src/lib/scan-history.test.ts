import {describe,it,expect} from 'vitest';
import {parseScanRuns,mergeScanRuns,scanDay} from './scan-history';
const run={schemaVersion:1,lastRunAt:'2026-11-13T12:00:00Z',complete:true,totalSources:10,successful:8,errors:2,updatedRaces:0};
describe('scan history',()=>{
 it('rejects invalid reports and untrusted links',()=>{
  expect(parseScanRuns({schemaVersion:1,runs:[{}, {...run,errors:-1}]})).toEqual([]);
  expect(parseScanRuns({schemaVersion:1,runs:[{...run,reportUrl:'javascript:alert(1)'}]})[0]?.reportUrl).toBe('');
 });
 it('keeps zero-change and multiple same-day runs while deduplicating snapshots',()=>{
  const a=parseScanRuns({schemaVersion:1,runs:[run]});
  const b=parseScanRuns({schemaVersion:1,runs:[{...run,lastRunAt:'2026-11-13T15:00:00Z'},run]});
  const merged=mergeScanRuns(a,b);
  expect(merged).toHaveLength(2);expect(merged[0]?.lastRunAt).toBe('2026-11-13T15:00:00Z');expect(merged[1]?.updatedRaces).toBe(0);
 });
 it('groups midnight runs by Ljubljana date',()=>{expect(scanDay('2026-11-13T23:30:00Z')).toBe('2026-11-14');});
});
