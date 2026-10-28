import {afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
vi.mock('./source-updates',()=>({loadSourceUpdates:vi.fn(async()=>null),applySourceUpdates:(r:unknown)=>r}));
import {loadU19Race,loadU19Races} from './u19-data';
afterEach(()=>vi.unstubAllGlobals());
describe('season and detail loading',()=>{
 it('loads 2027 without fetching the 2026 archive',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const data=await loadU19Races(undefined,undefined,2027);
  expect(data.races).toHaveLength(69);expect(data.manifest.year).toBe(2027);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await loadU19Race('uci-2027-80539'))?.date).toBe('2027-02-28');
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('loads one 2026 detail from exactly one archive part with its original rank',async()=>{
  const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>JSON.parse(readFileSync('public'+url,'utf8'))}));
  vi.stubGlobal('fetch',fetcher);
  const race=await loadU19Race('AT-UCI-78311-MJ');
  expect(race?.id).toBe('AT-UCI-78311-MJ');expect(race?.levelSymbol).toBe('9');
  expect(fetcher.mock.calls.filter(([url])=>url.includes('/events-'))).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(3);
 });
});
