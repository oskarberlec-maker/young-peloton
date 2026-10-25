import type { U19Race } from './u19-data';
import { englishRaceType } from './u19-english';

export type RaceFilters = {
  year: number; q: string; country: string; month: number; category: string;
  verification: string; state: string; type: string; from: string; to: string;
  futureOnly: boolean; ids: string[];
};
export const DEFAULT_FILTERS: RaceFilters = {
  year: 2026, q: '', country: 'all', month: 0, category: 'all',
  verification: 'all', state: 'active', type: 'all', from: '', to: '',
  futureOnly: false, ids: [],
};
const validDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
export const overlap = (r: U19Race, from: string, to: string): boolean => {
  if (!validDate(r.date)) return !from && !to;
  const last = validDate(r.enddate) && r.enddate >= r.date ? r.enddate : r.date;
  return (!from || last >= from) && (!to || r.date <= to);
};
export function parseRaceFilters(params: URLSearchParams): RaceFilters {
  const get=(key:string,limit=120)=> (params.get(key)||'').slice(0,limit);
  const year = Number(get('year',4)) === 2027 ? 2027 : 2026;
  const month = Number(get('month',2));
  const safeDate = (key:string)=> {const value=get(key,10);return validDate(value)?value:'';};
  return {
    year, q:get('q',150), country:get('country',4)||'all',
    month: Number.isInteger(month)&&month>=1&&month<=12 ? month : 0,
    category:get('category',12)||'all',
    verification:get('verification',20)||'all',
    state:get('state',20)||'active', type:get('type',30)||'all',
    from:safeDate('from'),to:safeDate('to'),
    futureOnly:get('future')==='true',
    ids:get('ids',5000).split(',').filter(Boolean).slice(0,150),
  };
}
export function filterRaces(races: U19Race[], f: RaceFilters, nowISO: string): U19Race[] {
  const q=f.q.trim().toLocaleLowerCase();
  const allowed=new Set(f.ids);
  const monthStart = f.month ? f.year+'-'+String(f.month).padStart(2,'0')+'-01' : '';
  const monthEnd = f.month ? new Date(Date.UTC(f.year,f.month,0)).toISOString().slice(0,10) : '';
  return races.filter(r=>{
    if(r.state==='merged'||r.duplicate)return false;
    if(f.ids.length&&!allowed.has(r.id))return false;
    if(f.state==='active' && r.state!=='active')return false;
    if(f.state==='cancelled' && r.state!=='cancelled')return false;
    if(f.country!=='all'&&r.countryCode!==f.country)return false;
    if(f.category==='men'&&!r.sex.includes('M'))return false;
    if(f.category==='women'&&!r.sex.includes('Ž')&&!/women|female/i.test(r.sex))return false;
    if(f.verification!=='all'&&r.bucket!==f.verification)return false;
    if(f.type!=='all'&&!englishRaceType(r.type).toLocaleLowerCase().includes(f.type))return false;
    if(f.futureOnly && !overlap(r,nowISO,''))return false;
    if(!overlap(r,f.from,f.to))return false;
    if(f.month&&!overlap(r,monthStart,monthEnd))return false;
    if(q&&![
      r.name,r.place,r.region,r.country,r.countryCode,r.type,
      englishRaceType(r.type),r.sex,r.confirmation,
    ].join(' ').toLocaleLowerCase().includes(q))return false;
    return true;
  });
}
export function paginate<T>(items: T[],page: number,pageSize=48) {
  const safePage=Math.max(1,Math.min(Math.ceil(items.length/pageSize)||1,Math.floor(page)||1));
  return { page:safePage, pages:Math.max(1,Math.ceil(items.length/pageSize)), total:items.length,
    rows:items.slice((safePage-1)*pageSize,safePage*pageSize) };
}
