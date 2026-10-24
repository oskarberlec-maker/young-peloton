import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, CalendarDays, MapPinned, RotateCcw, Search, AlertTriangle } from 'lucide-react';
import { U19Map } from '@/components/U19Map';
import { englishCategory, englishRaceType, englishConfirmation, englishRaceNote } from '@/lib/u19-english';
import { countryLabel, loadU19Races, niceDate, safeUrl, visibleRace, type RaceManifest, type U19Race } from '@/lib/u19-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/')({
  head:()=>({ meta:[
    { title:'Young Peloton — European U19 Race Calendar 2026' },
    { name:'description',content:'European junior road cycling races in 2026: dates, original sources and an interactive map of venues. Data and confirmation status are clearly labelled.' },
    { property:'og:title',content:'Young Peloton — European U19 Race Calendar' },
    { property:'og:type',content:'website' },
  ]}),component:Index,
});

const MONTHS=['All months','January','February','March','April','May','June','July','August','September','October','November','December'];
const PAGE_SIZE=48;
const DATE_MONTH=(s:string)=>s&&/^\d{4}-(\d\d)-\d\d$/.test(s)?Number(s.slice(5,7)):0;
const statusOptions=[['all','All U19 verification statuses'],['confirmed','U19 confirmed'],['conditional','Conditional U19'],['review','Needs review'],['no','U19 not confirmed']];
const raceClasses: Record<string,string>={confirmed:'bg-emerald-100 text-emerald-800',conditional:'bg-blue-100 text-blue-800',review:'bg-amber-100 text-amber-900',no:'bg-stone-200 text-stone-800'};
const bucketText: Record<string,string>={confirmed:'U19 confirmed',conditional:'Conditional U19',review:'Needs review',no:'U19 not confirmed'};

function downloadCsv(races:U19Race[]) {
  const cols:[string,(r:U19Race)=>string][]=[
    ['Race ID',r=>r.id],['Race',r=>r.name],['Country',r=>countryLabel(r.countryCode,r.country)],['Location',r=>r.place],
    ['Date',r=>r.date],['End date',r=>r.enddate],['Category',r=>englishCategory(r.sex)],['Type',r=>englishRaceType(r.type)],
    ['U19 status',r=>englishConfirmation(r.confirmation)],['Race state',r=>r.state],['Notice',r=>englishRaceNote(r.status)],
    ['Source',r=>r.sourceUrl],['U19 evidence',r=>r.proofUrl||r.sourceUrl],['Results',r=>r.resultUrl],
  ];
  const safeCell=(value:string)=>{
    let s=value||'';
    // Avoid CSV formula execution in spreadsheet applications.
    if (/^[=+@\-\t\r]/.test(s)) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  };
  const lines=[cols.map(c=>safeCell(c[0])).join(','),...races.map(r=>cols.map(c=>safeCell(c[1](r))).join(','))];
  const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='young-peloton-u19-2026.csv';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function Source({url,children}:{url:string;children:string}){
  return safeUrl(url)?<a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">{children}<ArrowUpRight size={12}/></a>:null;
}
function Index(){
  const [races,setRaces]=useState<U19Race[]>([]);
  const [manifest,setManifest]=useState<RaceManifest|null>(null);
  const [loadStatus,setLoadStatus]=useState('Loading 2026 races and original sources…');
  const [loadError,setLoadError]=useState('');
  const [tab,setTab]=useState<'calendar'|'map'>('calendar');
  const [query,setQuery]=useState('');const [country,setCountry]=useState('all');
  const [month,setMonth]=useState('0');const [category,setCategory]=useState('all');
  const [verification,setVerification]=useState('all');
  const [state,setState]=useState('all');const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const [showArchived,setShowArchived]=useState(false);
  const [page,setPage]=useState(1);
  useEffect(()=>{
    const controller=new AbortController();
    loadU19Races((done,total)=>setLoadStatus(`Loading races ${done} of ${total}…`),controller.signal)
      .then(({races,manifest})=>{setRaces(races);setManifest(manifest);setLoadStatus('');setLoadError('');})
      .catch(err=>{if(!controller.signal.aborted)setLoadError(String(err?.message||err));});
    return ()=>controller.abort();
  },[]);
  const countries=useMemo(()=>[...new Map(races.map(r=>[r.countryCode,countryLabel(r.countryCode,r.country)])).entries()].sort((a,b)=>a[1].localeCompare(b[1])),[races]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase();
    return races.filter(r=>{
      if(!showArchived&&!visibleRace(r))return false;
      if(country!=='all'&&r.countryCode!==country)return false;
      if(month!=='0'&&DATE_MONTH(r.date)!==Number(month))return false;
      if(category==='men'&&!r.sex.includes('M'))return false;
      if(category==='women'&&!r.sex.includes('Ž')&&!/women|female/i.test(r.sex))return false;
      if(verification!=='all'&&r.bucket!==verification)return false;
      if(state!=='all'&&r.state!==state)return false;
      if(from&&(!r.date||r.date<from))return false;
      if(to&&(!r.date||r.date>to))return false;
      if(q&&!`${r.name} ${r.place} ${r.region} ${r.country} ${countryLabel(r.countryCode,r.country)} ${englishCategory(r.sex)} ${englishRaceType(r.type)} ${englishConfirmation(r.confirmation)} ${englishRaceNote(r.status)}`.toLocaleLowerCase().includes(q))return false;
      return true;
    });
  },[races,showArchived,country,month,category,verification,state,from,to,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,pages);
  const shown=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const reset=()=>{setQuery('');setCountry('all');setMonth('0');setCategory('all');setVerification('all');setState('all');setFrom('');setTo('');setShowArchived(false);setPage(1);};
  const resetPage=()=>setPage(1);
  const controlClass='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <a href="/" className="text-xl font-black tracking-tight">YOUNG <span className="text-cyan-400">PELOTON</span></a>
        <nav aria-label="Primary" className="flex gap-2 text-sm">
          <button type="button" onClick={()=>setTab('calendar')} className={`rounded-lg px-4 py-2 ${tab==='calendar'?'bg-white text-slate-900':'text-slate-200 hover:bg-slate-800'}`}>Calendar</button>
          <button type="button" onClick={()=>setTab('map')} className={`rounded-lg px-4 py-2 ${tab==='map'?'bg-white text-slate-900':'text-slate-200 hover:bg-slate-800'}`}>Map of Europe</button>
        </nav>
        <span className="rounded-full border border-slate-600 px-3 py-1 text-xs tracking-wide">2026 · U19 MEN & WOMEN</span>
      </div>
    </header>
    <section className="border-b border-border bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[.25em] text-cyan-400">European junior road cycling</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">Your next race starts here.</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300">Explore European U19 road races, exact listed dates, sources and an interactive map. Entries are labelled by verification status; being listed does not guarantee U19 eligibility or that a race went ahead.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button onClick={()=>setTab('calendar')} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><CalendarDays size={17}/> Browse races</Button>
          <Button onClick={()=>setTab('map')} variant="outline" className="border-slate-400 bg-transparent text-white hover:bg-slate-800 hover:text-white"><MapPinned size={17}/> Explore the map</Button>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-5 py-8">
      {manifest&&<div className="mb-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">European source records</p><p className="mt-1 text-3xl font-bold tabular-nums">{manifest.rawEuropeanRecords.toLocaleString('en')}</p></div>
        <div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Distinct listed entries</p><p className="mt-1 text-3xl font-bold tabular-nums">{manifest.uniqueVisibleRecords.toLocaleString('en')}</p></div>
        <div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Countries / regions</p><p className="mt-1 text-3xl font-bold tabular-nums">{countries.length}</p></div>
      </div>}
      {loadError&&<div role="alert" className="mb-6 rounded-lg border border-red-300 p-4"><strong>Could not load races.</strong> {loadError} <button className="ml-2 underline" onClick={()=>window.location.reload()}>Retry</button></div>}
      {!manifest&&!loadError&&<p role="status" className="my-10 text-center text-muted-foreground">{loadStatus}</p>}
      {manifest&&<>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{tab==='calendar'?'Race calendar':'Race locations map'}</h2>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">{filtered.length.toLocaleString('en')} matching records</span><Button variant="outline" onClick={()=>downloadCsv(filtered)}><ArrowDownToLine size={16}/> Export CSV</Button></div>
        </div>
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm"><span className="mb-1 block font-medium">Search name or place</span><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input value={query} onChange={e=>{setQuery(e.target.value);resetPage();}} placeholder="Race, town, region…" className="pl-9"/></div></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Country</span><select className={controlClass} value={country} onChange={e=>{setCountry(e.target.value);resetPage();}}><option value="all">All countries</option>{countries.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Month</span><select className={controlClass} value={month} onChange={e=>{setMonth(e.target.value);resetPage();}}>{MONTHS.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Category</span><select className={controlClass} value={category} onChange={e=>{setCategory(e.target.value);resetPage();}}><option value="all">U19 men & women / unspecified</option><option value="men">Men</option><option value="women">Women</option></select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">U19 verification</span><select className={controlClass} value={verification} onChange={e=>{setVerification(e.target.value);resetPage();}}>{statusOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Race state</span><select className={controlClass} value={state} onChange={e=>{setState(e.target.value);resetPage();}}><option value="all">All including cancelled</option><option value="active">Not marked cancelled</option><option value="cancelled">Cancelled</option>{showArchived&&<option value="merged">Merged / archived</option>}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">From</span><input type="date" className={controlClass} value={from} onChange={e=>{setFrom(e.target.value);resetPage();}} /></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Until</span><input type="date" className={controlClass} value={to} onChange={e=>{setTo(e.target.value);resetPage();}} /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={e=>{setShowArchived(e.target.checked);setState('all');resetPage();}} />Show archived merged / duplicate source records ({manifest.mergedRecords+manifest.semanticDuplicateRecords})</label>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm text-sky-700 hover:underline"><RotateCcw size={14}/> Reset filters</button>
          </div>
        </div>
        {tab==='map'?<U19Map races={filtered.filter(visibleRace)} />:<>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(r=><article key={r.id} className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold tabular-nums text-sky-800">{niceDate(r.date)}{r.enddate&&r.enddate!==r.date?` – ${niceDate(r.enddate)}`:''}</span><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${raceClasses[r.bucket]||'bg-muted'}`}>{bucketText[r.bucket]||r.bucket}</span></div>
                <h3 className="text-base font-bold leading-snug">{r.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.place||'Venue not specified'} · {countryLabel(r.countryCode,r.country)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-muted px-2 py-1">{englishCategory(r.sex)||'Category unconfirmed'}</span>{r.type&&<span className="rounded bg-muted px-2 py-1">{englishRaceType(r.type)}</span>}{r.state==='cancelled'&&<span className="rounded bg-red-100 px-2 py-1 font-semibold text-red-800">CANCELLED</span>}{r.state==='merged'&&<span className="rounded bg-amber-100 px-2 py-1">MERGED RECORD</span>}{!!r.duplicate&&<span className="rounded bg-amber-100 px-2 py-1">DUPLICATE SOURCE RECORD</span>}</div>
                {r.confirmation&&<p className="mt-3 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">Verification:</span> {englishConfirmation(r.confirmation)}</p>}
                {r.status&&<p className="mt-2 text-xs leading-relaxed text-muted-foreground">{englishRaceNote(r.status)}</p>}
                {r.roadUnconfirmed===1&&<p className="mt-2 text-xs text-amber-700">Road discipline not independently verified</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm"><Source url={r.sourceUrl}>Original source</Source>{r.proofUrl&&r.proofUrl!==r.sourceUrl&&<Source url={r.proofUrl}>U19 evidence</Source>}{r.resultUrl&&<Source url={r.resultUrl}>Results</Source>}</div>
            </article>)}
          </div>
          {filtered.length===0&&<p className="rounded-xl border border-border p-10 text-center text-muted-foreground">No races match these filters. Try a different date, country or verification status.</p>}
          {pages>1&&<nav aria-label="Race results pages" className="mt-8 flex items-center justify-center gap-4"><Button disabled={currentPage<=1} variant="outline" onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button><span className="text-sm tabular-nums">Page {currentPage} of {pages}</span><Button variant="outline" disabled={currentPage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</Button></nav>}
        </>}
        <aside className="mt-10 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><strong className="text-foreground">Source and verification notes.</strong> The 2026 source archive was updated {manifest.asOf}. It is not marked complete. Dates are the dates listed in the source archive, not independently confirmed event outcomes. {manifest.missingDates} source entries have no exact date; those show “Date unconfirmed.” U19 participation is not verified for every listed event. Cancelled races are labelled and excluded from neither the total nor the calendar. {manifest.mergedRecords} merged and {manifest.semanticDuplicateRecords} duplicate source records remain available in the archive filter but are hidden by default to prevent double counting. The map uses approximate settlement / area / country centres, not race start coordinates.</div></div>
        </aside>
      </>}
    </div>
    <footer className="mt-8 border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">Young Peloton · European U19 road cycling archive · 2026 · Dates and evidence linked to original sources · Official event names remain in their published language</footer>
  </main>;
}