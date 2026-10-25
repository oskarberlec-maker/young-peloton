import type { U19Race } from './u19-data';
const escape=(s:string)=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const icsDate=(date:string)=>/^\d{4}-\d\d-\d\d$/.test(date)?date.replace(/-/g,''):'';
const plusDay=(value:string)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
export function racesToIcs(races:U19Race[]):string {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Young Peloton//U19 Racing Calendar//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Young Peloton races'];
  for(const r of races){const start=icsDate(r.date);if(!start)continue;
    const end=icsDate(plusDay(r.enddate&&r.enddate>=r.date?r.enddate:r.date));
    const source=/^https?:\/\//.test(r.sourceUrl)?r.sourceUrl:'';
    lines.push('BEGIN:VEVENT','UID:'+escape(r.id)+'@youngpeloton','DTSTART;VALUE=DATE:'+start,'DTEND;VALUE=DATE:'+end,
      'SUMMARY:'+escape(r.name),'LOCATION:'+escape([r.place,r.country].filter(Boolean).join(', ')),
      'DESCRIPTION:'+escape('Source: '+source+' | U19 eligibility must be verified with the organizer.'),
      ...(source?['URL:'+source]:[]),'END:VEVENT');
  }
  return [...lines,'END:VCALENDAR',''].join('\r\n');
}
export function downloadIcs(races:U19Race[]):void {
  const url=URL.createObjectURL(new Blob([racesToIcs(races)],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='young-peloton-races.ics';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
