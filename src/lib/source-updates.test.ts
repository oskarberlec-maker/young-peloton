import { describe,it,expect } from 'vitest';
import { applySourceUpdates, mergeConfirmed2027 } from './source-updates';
import { UCI_2027_RACES } from './uci-2027';
import ffcFeed from '../../scripts/source-sync/data/fixtures/ffc/expected-feed.json';
import { getRaceLevel } from './race-level';
const race = UCI_2027_RACES[0]!;
const payload = (fields: Record<string,unknown>) => ({schemaVersion:1,races:{[race.id]:{fields,updatedAt:'2026-10-28T05:00:00Z',sourceUrl:race.sourceUrl,adapter:'uci-competition-v1'}}});
describe('verified source overlays',()=>{
 it('updates exact IDs without adding duplicates or mutating the snapshot',()=>{
  const result=applySourceUpdates([race],payload({date:'2027-03-01',enddate:'2027-03-01'}));
  expect(result).toHaveLength(1);expect(result[0]!.id).toBe(race.id);expect(result[0]!.date).toBe('2027-03-01');expect(race.date).toBe('2027-02-28');
 });
 it('keeps original data when the feed fails or is malformed',()=>{
  for(const data of [null,{},payload({id:'other'}),payload({date:'2028-03-01',enddate:'2028-03-01'}),payload({date:'2027-02-30'}),payload({lat:999})])expect(applySourceUpdates([race],data)[0]).toEqual(race);
 });
 it('uses live official classifications ahead of the frozen workbook',()=>{
  const result=applySourceUpdates([race],payload({liveLevel:'national'}));expect(getRaceLevel(result[0]!).level).toBe('national');
 });
 it('accepts cancellation but never deletes an event',()=>{
  const result=applySourceUpdates([race],payload({state:'cancelled'}));expect(result).toHaveLength(1);expect(result[0]!.state).toBe('cancelled');
 });
});

describe('confirmed 2027 editions',()=>{
 it('adds an edition once and retains the 2026 record',()=>{
  const old={...race,id:'old-id',date:'2026-02-28',enddate:'2026-02-28'};
  const fresh={...race,id:'confirmed-2027-1234567890abcdef1234',source2026Id:old.id,sourceUpdatedAt:'2026-11-01T00:00:00Z'};
  const feed={schemaVersion:1,confirmed2027:{[fresh.id]:fresh}};
  const result=mergeConfirmed2027([old],feed);
  expect(result).toHaveLength(2);expect(result[0]).toEqual(old);
  expect(mergeConfirmed2027(result,feed)).toHaveLength(2);
  expect(mergeConfirmed2027([race],feed)).toHaveLength(1);
 });
 it('rejects missing, invalid or wrong-year dates',()=>{
  const fresh={...race,id:'confirmed-2027-1234567890abcdef1234',source2026Id:'old-id',sourceUpdatedAt:'2026-11-01T00:00:00Z'};
  for(const patch of [{date:''},{date:'2026-02-28'},{enddate:'2027-02-30'},{lat:1000}]) {
   expect(mergeConfirmed2027([],{schemaVersion:1,confirmed2027:{[fresh.id]:{...fresh,...patch}}})).toHaveLength(0);
  }
 });
});

// Produced by the Python reader from two real FFC event fragments.
it('accepts new FFC races without a 2026 ancestor through the existing live feed',()=>{
 const result=mergeConfirmed2027([],ffcFeed);
 expect(result).toHaveLength(2);
 expect(result.map(r=>r.date).sort()).toEqual(['2027-03-06','2027-03-07']);
 expect(result.every(r=>r.source2026Id==='' && r.lat===null)).toBe(true);
 expect(mergeConfirmed2027(result,ffcFeed)).toHaveLength(2);
});
