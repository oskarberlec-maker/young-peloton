import { describe,it,expect } from 'vitest';
import { applySourceUpdates } from './source-updates';
import { UCI_2027_RACES } from './uci-2027';
import { getRaceLevel } from './race-level';
const race = UCI_2027_RACES[0];
const payload = (fields: Record<string,unknown>) => ({schemaVersion:1,races:{[race.id]:{fields,updatedAt:'2026-10-28T05:00:00Z',sourceUrl:race.sourceUrl,adapter:'uci-competition-v1'}}});
describe('verified source overlays',()=>{
 it('updates exact IDs without adding duplicates or mutating the snapshot',()=>{
  const result=applySourceUpdates([race],payload({date:'2027-03-01',enddate:'2027-03-01'}));
  expect(result).toHaveLength(1);expect(result[0].id).toBe(race.id);expect(result[0].date).toBe('2027-03-01');expect(race.date).toBe('2027-02-28');
 });
 it('keeps original data when the feed fails or is malformed',()=>{
  for(const data of [null,{},payload({id:'other'}),payload({date:'2028-03-01',enddate:'2028-03-01'}),payload({date:'2027-02-30'}),payload({lat:999})])expect(applySourceUpdates([race],data)[0]).toEqual(race);
 });
 it('uses live official classifications ahead of the frozen workbook',()=>{
  const result=applySourceUpdates([race],payload({liveLevel:'national'}));expect(getRaceLevel(result[0]).level).toBe('national');
 });
 it('accepts cancellation but never deletes an event',()=>{
  const result=applySourceUpdates([race],payload({state:'cancelled'}));expect(result).toHaveLength(1);expect(result[0].state).toBe('cancelled');
 });
});
