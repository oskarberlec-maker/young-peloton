import { useEffect, useMemo, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { niceDate, countryLabel, type U19Race } from '@/lib/u19-data';
import { getRaceLevel } from '@/lib/race-level';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const pad = (n: number) => String(n).padStart(2, '0');
const firstOfMonth = (year:number,month:number) => `${year}-${pad(month)}-01`;
const lastOfMonth = (year:number,month:number) => `${year}-${pad(month)}-${pad(new Date(Date.UTC(year,month,0)).getUTCDate())}`;
const overlaps = (race:U19Race,date:string) =>
  race.date <= date && (race.enddate && race.enddate >= race.date ? race.enddate : race.date) >= date;

export function RaceMonthCalendar({ races, year, saved, onToggleSaved }: {
  races: U19Race[];
  year: number;
  saved: string[];
  onToggleSaved: (id: string, year: number, race?: U19Race) => Promise<void>;
}) {
  const [month,setMonth]=useState(1);
  const [selectedDay,setSelectedDay]=useState('');
  const [showAll,setShowAll]=useState(false);

  useEffect(()=>{
    const today=new Date();
    const currentMonth=today.getFullYear()===year?today.getMonth()+1:1;
    setMonth(currentMonth);
    setSelectedDay('');
    setShowAll(false);
  },[year]);

  const prefix=`${year}-${pad(month)}-`;
  const first=firstOfMonth(year,month),last=lastOfMonth(year,month);
  const firstWeekday=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  const bookmarked=useMemo(()=>new Set(saved),[saved]);
  const dayMap=useMemo(()=>{
    const map=new Map<string,U19Race[]>();
    const relevant=races.filter(r=>r.date<=last && (r.enddate>=r.date?r.enddate:r.date)>=first);
    for(let day=1;day<=daysInMonth;day++){
      const date=prefix+pad(day);
      map.set(date,relevant.filter(r=>overlaps(r,date)));
    }
    return map;
  },[races,first,last,prefix,daysInMonth]);

  // In the current month highlight today; otherwise select the first day with a race.
  const today=new Date();
  const todayISO=today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate());
  const firstRaceDay=Array.from(dayMap).find(([,items])=>items.length>0)?.[0];
  const activeDay=selectedDay.startsWith(prefix)?selectedDay:
    todayISO.startsWith(prefix)?todayISO:(firstRaceDay||first);
  const selectedNumber=Number(activeDay.slice(8));
  const weekIndex=Math.floor((firstWeekday+selectedNumber-1)/7)*7;
  const weekDays=Array.from({length:7},(_,idx)=>{
    const day=weekIndex+idx-firstWeekday+1;
    return day>=1&&day<=daysInMonth?day:null;
  });
  const cells=Array.from({length:Math.ceil((firstWeekday+daysInMonth)/7)*7},(_,idx)=>{
    const day=idx-firstWeekday+1;
    return day>=1&&day<=daysInMonth?day:null;
  });
  const chosen=dayMap.get(activeDay)||[];
  const visibleChosen=showAll?chosen:chosen.slice(0,10);
  const currentMonthTotal=races.filter(r=>r.date<=last && (r.enddate>=r.date?r.enddate:r.date)>=first).length;
  const savedMonthCount=races.filter(r=>bookmarked.has(r.id)&&r.date<=last&&(r.enddate>=r.date?r.enddate:r.date)>=first).length;
  const select=(iso:string)=>{setSelectedDay(iso);setShowAll(false);};
  const changeMonth=(next:number)=>{
    if(next<1||next>12)return;
    setMonth(next);setSelectedDay('');setShowAll(false);
  };
  const renderDay=(day:number|null,key:string,compact:boolean)=>{
    if(!day)return <div key={key} aria-hidden="true" className={compact?'rounded-lg bg-slate-50':'min-h-[95px] border-b border-r bg-slate-50/50'}/>;
    const iso=prefix+pad(day),events=dayMap.get(iso)||[];
    const savedEvents=events.filter(r=>bookmarked.has(r.id)).length;
    const active=iso===activeDay;
    return <button key={iso} type="button" aria-pressed={active}
      aria-label={`${day} ${MONTHS[month-1]}: ${events.length} races, ${savedEvents} saved`}
      onClick={()=>select(iso)}
      className={compact
        ? `min-w-0 rounded-xl border px-1 py-3 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 ${active?'border-sky-600 bg-sky-700 text-white':'border-slate-200 bg-white text-slate-900'}`
        : `min-h-[100px] min-w-0 border-b border-r p-2 text-left transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 ${active?'bg-sky-100 ring-2 ring-inset ring-sky-600':'bg-white'}`}>
      <span className={compact?'block text-base font-bold tabular-nums':'block text-sm font-bold tabular-nums'}>{day}</span>
      {events.length>0&&<span className={compact
        ? `mx-auto mt-2 block w-fit rounded-md px-1.5 py-0.5 text-[11px] font-bold ${active?'bg-white/20 text-white':'bg-sky-100 text-sky-900'}`
        :'mt-2 inline-block rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900'}>
        {events.length}</span>}
      {!compact&&events.length>0&&<span className="mt-1 block truncate text-xs text-slate-600">{events[0]?.name}</span>}
      {savedEvents>0&&<span className={compact?'mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-amber-400':'mt-1 block truncate text-[11px] font-bold text-amber-700'}>{compact?'':`${savedEvents} saved`}</span>}
    </button>;
  };

  return <section aria-label="Race calendar" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950"><CalendarDays size={21}/> {MONTHS[month-1]} {year}</h3>
        <p className="mt-1 text-sm text-slate-600">{currentMonthTotal} matching races · {savedMonthCount} saved</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={month===1} onClick={()=>changeMonth(month-1)} aria-label="Previous month"
          className="rounded-lg border border-slate-300 p-2.5 disabled:opacity-30"><ChevronLeft size={19}/></button>
        <select aria-label="Calendar month" value={month} onChange={e=>changeMonth(Number(e.target.value))}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
          {MONTHS.map((name,i)=><option key={name} value={i+1}>{name}</option>)}
        </select>
        <button type="button" disabled={month===12} onClick={()=>changeMonth(month+1)} aria-label="Next month"
          className="rounded-lg border border-slate-300 p-2.5 disabled:opacity-30"><ChevronRight size={19}/></button>
      </div>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:hidden">
      <p className="mb-3 text-sm font-semibold text-slate-700">Select a day</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((name,i)=><span key={i} className="text-center text-xs font-semibold text-slate-500">{name}</span>)}
        {weekDays.map((day,i)=>renderDay(day,'week-'+i,true))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Use the arrows above to change month. Numbers show matching races; an amber dot indicates a saved race.</p>
    </div>
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
      <div className="grid grid-cols-7 border-b bg-slate-50">
        {WEEKDAYS.map((day,i)=><div key={i} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">{cells.map((day,i)=>renderDay(day,'cell-'+i,false))}</div>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-bold text-slate-950">{niceDate(activeDay)}</h4>
          <p className="text-sm text-slate-600">{chosen.length} matching {chosen.length===1?'race':'races'} on this day</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">{selectedNumber} {MONTHS[month-1]}</span>
      </div>
      {chosen.length===0&&<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No races match your filters on this day. Try another date or adjust filters above.</p>}
      <div className="space-y-3">
        {visibleChosen.map(r=><article key={r.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0 flex-1">
            <Link to="/race/$raceId" params={{raceId:r.id}} className="font-semibold text-slate-950 hover:text-sky-800 hover:underline">{r.name}</Link>
            <p className="mt-1 text-sm text-slate-600">{r.place||'Location unconfirmed'} · {countryLabel(r.countryCode,r.country)} · {getRaceLevel(r).label}</p>
            <p className="mt-1 text-xs text-slate-500">{niceDate(r.date)}{r.enddate&&r.enddate!==r.date?' – '+niceDate(r.enddate):''}</p>
          </div>
          <button type="button" onClick={()=>void onToggleSaved(r.id,year,r)}
            className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border px-3 py-2 text-sm font-semibold sm:self-auto ${bookmarked.has(r.id)?'border-amber-300 bg-amber-50 text-amber-900':'border-slate-300 bg-white text-slate-700'}`}>
            <Bookmark size={16}/>{bookmarked.has(r.id)?'Saved':'Save'}
          </button>
        </article>)}
      </div>
      {chosen.length>10&&<button type="button" onClick={()=>setShowAll(!showAll)}
        className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-sky-800">
        {showAll?'Show fewer races':`Show all ${chosen.length} races`}
      </button>}
    </div>
  </section>;
}
