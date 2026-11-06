import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { niceDate, countryLabel, type U19Race } from '@/lib/u19-data';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const pad = (n: number) => String(n).padStart(2, '0');
const inDay = (race: U19Race, day: string) => race.date <= day && (race.enddate && race.enddate >= race.date ? race.enddate : race.date) >= day;

export function RaceMonthCalendar({ races, year, saved, onToggleSaved }: {
  races: U19Race[];
  year: number;
  saved: string[];
  onToggleSaved: (id: string, year: number) => Promise<void>;
}) {
  const [month, setMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState('');
  useEffect(() => {
    const now = new Date();
    setMonth(now.getFullYear() === year ? now.getMonth() + 1 : 1);
    setSelectedDay('');
  }, [year]);

  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthPrefix = `${year}-${pad(month)}-`;
  const dayMap = useMemo(() => {
    const map = new Map<string, U19Race[]>();
    for (let day = 1; day <= daysInMonth; day++) {
      const key = monthPrefix + pad(day);
      map.set(key, races.filter(r => inDay(r, key)));
    }
    return map;
  }, [races, daysInMonth, monthPrefix]);
  const bookmarked = useMemo(() => new Set(saved), [saved]);
  const activeDay = selectedDay.startsWith(monthPrefix) ? selectedDay : '';
  const chosenRaces = activeDay ? dayMap.get(activeDay) ?? [] : [];
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const move = (direction: number) => {
    setMonth(m => Math.min(12, Math.max(1, m + direction)));
    setSelectedDay('');
  };

  return <section aria-label="Monthly race calendar" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
      <div>
        <h3 className="text-xl font-bold">{MONTHS[month-1]} {year}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Select a day to view every race taking place on that date. Multi-day races also appear on intermediate days.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md border p-2 disabled:opacity-40" aria-label="Previous month" disabled={month===1} onClick={() => move(-1)}><ChevronLeft size={18}/></button>
        <select aria-label="Calendar month" value={month} className="rounded-md border bg-background px-3 py-2 text-sm" onChange={e => {setMonth(Number(e.target.value));setSelectedDay('');}}>
          {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
        <button type="button" className="rounded-md border p-2 disabled:opacity-40" aria-label="Next month" disabled={month===12} onClick={() => move(1)}><ChevronRight size={18}/></button>
      </div>
    </div>
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="grid grid-cols-7 border-b bg-slate-50">{WEEKDAYS.map(day =>
        <div key={day} className="py-3 text-center text-[11px] font-semibold uppercase text-slate-600">{day}</div>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={'empty-'+idx} className="min-h-16 border-b border-r bg-slate-50/40 sm:min-h-24" aria-hidden="true"/>;
          const iso = monthPrefix + pad(day);
          const events = dayMap.get(iso) ?? [];
          const isSelected = activeDay === iso;
          return <button type="button" key={iso} aria-label={`${day} ${MONTHS[month-1]}: ${events.length} races`} aria-pressed={isSelected}
            onClick={() => setSelectedDay(isSelected?'':iso)}
            className={`min-h-16 border-b border-r p-1 text-left transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 sm:min-h-24 sm:p-2 ${isSelected?'bg-sky-100 ring-2 ring-inset ring-sky-600':''}`}>
            <span className="block text-xs font-semibold tabular-nums sm:text-sm">{day}</span>
            {events.length>0 && <span className="mt-1 inline-block rounded bg-sky-100 px-1 py-0.5 text-[10px] font-semibold text-sky-900 sm:text-xs">{events.length} {events.length===1?'race':'races'}</span>}
            {events.length>0 && <span className="mt-1 hidden max-w-full truncate text-[10px] text-slate-600 sm:block">{events[0]?.name}</span>}
          </button>;
        })}
      </div>
    </div>
    {activeDay ? <div className="space-y-3 rounded-xl border bg-white p-4" aria-live="polite">
      <h4 className="text-lg font-bold">{niceDate(activeDay)} — {chosenRaces.length} {chosenRaces.length===1?'race':'races'}</h4>
      {chosenRaces.length===0 && <p className="text-sm text-muted-foreground">No races match your filters on this day.</p>}
      <div className="grid gap-2 md:grid-cols-2">{chosenRaces.map(r =>
        <article key={r.id} className="rounded-lg border p-3">
          <Link to="/race/$raceId" params={{raceId:r.id}} className="font-semibold text-slate-950 hover:underline">{r.name}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{r.place||'Place unconfirmed'} · {countryLabel(r.countryCode,r.country)}</p>
          <button type="button" onClick={() => void onToggleSaved(r.id,year)} className="mt-2 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
            <Bookmark size={13}/>{bookmarked.has(r.id)?'Saved on device':'Save on device'}
          </button>
        </article>)}</div>
    </div> : <p className="text-sm text-muted-foreground">Choose a date in the calendar to see the races and save them directly to this device.</p>}
  </section>;
}
