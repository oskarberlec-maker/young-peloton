import { describe, expect, it } from 'vitest';
import type { U19Race } from '@/lib/u19-data';
const sample = (id:string,date:string,name:string):U19Race=>({
  id,date,name,enddate:date,place:'',countryCode:'SI',country:'Slovenia',sex:'M',
  type:'Cestna dirka',confirmation:'',status:'',sourceUrl:'https://example.org',
  proofUrl:'',resultUrl:'',bucket:'confirmed',state:'active',lat:null,lon:null,
  precision:'country',region:'',roadUnconfirmed:0,duplicate:0
});
const races=[sample('3','2026-06-02','A Race'),sample('1','2026-03-10','Race B'),
  sample('4','','Unconfirmed'),sample('2','2026-03-10','Race A')];
const ordered=(items:U19Race[])=>[...items].sort((a,b)=>
  (a.date||'9999').localeCompare(b.date||'9999')||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
describe('Chronological race ordering',()=>{
  it('sorts by dates, then name, with undated events last',()=>{
    expect(ordered(races).map(r=>r.id)).toEqual(['2','1','3','4']);
  });
  it('is stable regardless of incoming chunk order',()=>{
    expect(ordered([...races].reverse()).map(r=>r.id)).toEqual(ordered(races).map(r=>r.id));
  });
  it('preserves every record',()=>{
    expect(ordered(races)).toHaveLength(races.length);
    expect(ordered(races).map(r=>r.id).sort()).toEqual(races.map(r=>r.id).sort());
  });
});
