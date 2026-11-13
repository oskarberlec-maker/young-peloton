import {afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
vi.mock('./source-updates',async(importOriginal)=>({...await importOriginal<typeof import('./source-updates')>(),loadSourceUpdates:vi.fn(async()=>null)}));
import {loadSourceUpdates} from './source-updates';
import {UCI_2027_RACES} from './uci-2027';
import {loadU19Race,loadU19Races,visibleRace} from './u19-data';
afterEach(()=>{vi.unstubAllGlobals();vi.mocked(loadSourceUpdates).mockResolvedValue(null);});
describe('season and detail loading',()=>{
 it('loads 2027 without fetching the 2026 archive',async()=>{
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({'uci-2027-81168':'CZ-UCI-78159-MJ'})}));vi.stubGlobal('fetch',fetcher);
  const data=await loadU19Races(undefined,undefined,2027);
  expect(data.races).toHaveLength(69);expect(data.manifest.year).toBe(2027);
  expect(data.races.find(r=>r.id==='uci-2027-81168')?.source2026Id).toBe('CZ-UCI-78159-MJ');
  expect((await loadU19Race('uci-2027-80539'))?.date).toBe('2027-02-28');
  expect(fetcher).toHaveBeenCalledWith('/data/2027/edition-links.json',{signal:null});
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('loads newly confirmed editions, counts and detail without the archive',async()=>{
  const fresh={...UCI_2027_RACES[0]!,id:'confirmed-2027-1234567890abcdef1234',name:'Another known race',source2026Id:'old-id',sourceUpdatedAt:'2026-11-01T00:00:00Z'};
  vi.mocked(loadSourceUpdates).mockResolvedValue({schemaVersion:1,races:{},confirmed2027:{[fresh.id]:fresh}});
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({})}));vi.stubGlobal('fetch',fetcher);
  const data=await loadU19Races(undefined,undefined,2027);
  expect(data.races).toHaveLength(70);expect(data.manifest.uniqueVisibleRecords).toBe(70);
  expect(await loadU19Race(fresh.id)).toEqual(fresh);expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('loads one 2026 detail from exactly one archive part with its original rank',async()=>{
  const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>JSON.parse(readFileSync('public'+url,'utf8'))}));
  vi.stubGlobal('fetch',fetcher);
  const race=await loadU19Race('AT-UCI-78311-MJ');
  expect(race?.id).toBe('AT-UCI-78311-MJ');expect(race?.levelSymbol).toBe('9');
  expect(fetcher.mock.calls.filter(([url])=>url.includes('/events-'))).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(3);
 });
 it('keeps reviewed discipline corrections in detail and list after live updates',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>JSON.parse(readFileSync('public'+url,'utf8'))})));
  vi.mocked(loadSourceUpdates).mockResolvedValue({schemaVersion:1,races:{'CH-SC-9170-M':{fields:{type:'Road race'},updatedAt:'2026-11-13T00:00:00Z',sourceUrl:'https://swisscycling.ch/'}}});
  const detail=await loadU19Race('CH-SC-9170-M');
  expect(detail?.type).toBe('Running');
  expect(visibleRace(detail!)).toBe(false);
  const data=await loadU19Races(undefined,undefined,2026);
  expect(data.races.find(r=>r.id===detail?.id)?.type).toBe('Running');
  expect(data.manifest.uniqueVisibleRecords).toBe(data.races.filter(visibleRace).length);
  expect((await loadU19Race('CH-SC-9170-M'))?.type).toBe('Running');
  for(const id of ['FR-FFC-C4174043003','FR-FFC-C4174048019','FR-FFC-C4174016043']) {
    const race=data.races.find(r=>r.id===id)!;
    expect(race.type).toContain('Discipline unconfirmed');
    expect(race.roadUnconfirmed).toBe(1);
  }
  expect(data.races.find(r=>r.id==='GB-CTT-47082')?.type).toBe('Posamični kronometer');
  expect(data.races.find(r=>r.id==='DE-RAD-43049-M')?.type).toBe('Cestna dirka');
 });

});
