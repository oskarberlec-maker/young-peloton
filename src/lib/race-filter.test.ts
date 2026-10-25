import { describe,it,expect } from 'vitest';
import { DEFAULT_FILTERS,overlap,filterRaces,paginate,parseRaceFilters } from './race-filter';
import { racesToIcs } from './race-calendar';
import type { U19Race } from './u19-data';
const make=(patch:Partial<U19Race>={})=>({
 id:'1',name:'Junior Stage Race',date:'2026-02-21',enddate:'2026-04-12',state:'active',duplicate:0,
 sex:'M',countryCode:'SI',country:'Slovenia',place:'Ljubljana',region:'',type:'Etapna dirka',bucket:'confirmed',
 sourceUrl:'https://example.com/race',confirmation:'',status:'',proofUrl:'',resultUrl:'',
 roadUnconfirmed:0,lat:null,lon:null,precision:'town',...patch,
} as U19Race);
describe('race filtering',()=>{
 it('includes multi-day events overlapping a chosen date range',()=>expect(overlap(make(),'2026-03-10','2026-03-12')).toBe(true));
 it('excludes non-overlapping events',()=>expect(overlap(make(),'2026-05-01','2026-05-03')).toBe(false));
 it('does not include cancelled races by default',()=>expect(filterRaces([make({state:'cancelled'})],DEFAULT_FILTERS,'2026-01-01')).toHaveLength(0));
 it('includes spanning events in March',()=>expect(filterRaces([make()],{...DEFAULT_FILTERS,month:3},'2026-01-01')).toHaveLength(1));
 it('allows explicit 2027 selection without implying data exists',()=>expect(parseRaceFilters(new URLSearchParams('year=2027')).year).toBe(2027));
 it('safely bounds pagination',()=>expect(paginate([1,2,3],99,2)).toMatchObject({page:2,pages:2,total:3,rows:[3]}));
});
describe('calendar export',()=>it('uses exclusive end date for multi-day all-day events',()=>{
 const result=racesToIcs([make()]);expect(result).toContain('DTSTART;VALUE=DATE:20260221');
 expect(result).toContain('DTEND;VALUE=DATE:20260413');
}));
