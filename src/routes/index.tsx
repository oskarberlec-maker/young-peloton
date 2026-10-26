import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, CalendarDays, MapPinned, RotateCcw, Search, AlertTriangle, Share2, Bookmark } from 'lucide-react';
import { U19Map } from '@/components/U19Map';
import { englishCategory, englishRaceType, englishConfirmation, englishRaceNote } from '@/lib/u19-english';
import { countryLabel, loadU19Races, niceDate, safeUrl, visibleRace, type RaceManifest, type U19Race } from '@/lib/u19-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@tanstack/react-router';
import { useRacingSeason } from '@/lib/use-racing-season';
import { downloadIcs } from '@/lib/race-calendar';

export const Route = createFileRoute('/')({
  head:()=>({ meta:[
    { title:'Young Peloton — European U19 Race Calendar 2026' },
    { name:'description',content:'European junior road cycling races in 2026: dates, original sources and an interactive map of venues. Data and confirmation status are clearly labelled.' },
    { property:'og:title',content:'Young Peloton — European U19 Race Calendar' },
    { property:'og:type',content:'website' },
  ]}),component:Index,
});

const MONTHS=['All months','January','February','March','April','May','June','July','August','September','October','November','December'];
const PAGE_SIZE=24;
const todayISO = () => new Date().toISOString().slice(0,10);
const raceOverlaps = (r: U19Race, start: string, end: string) =>
  (!start || (r.enddate || r.date) >= start) && (!end || (r.date || r.enddate) <= end);
const raceTypeLabel = (r: U19Race) => englishRaceType(r.type).toLowerCase();
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
  const [verification,setVerification]=useState('confirmed');
  const [state,setState]=useState('active');const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const [raceType,setRaceType]=useState('all');
  const [year,setYear]=useState(2026);
  const [advanced,setAdvanced]=useState(false);
  const [futureOnly,setFutureOnly]=useState(false);
  const { saved, toggle: toggleSaved, user } = useRacingSeason();
  const [savedOnly,setSavedOnly]=useState(false);
  const [linkedRace,setLinkedRace]=useState('');

  const jump=(target:'calendar'|'map')=>{setTab(target);requestAnimationFrame(()=>document.getElementById('race-results')?.scrollIntoView({behavior:'smooth',block:'start'}));};
  const shareRace=async(r:U19Race)=>{const url=new URL(window.location.href);url.searchParams.set('race',r.id);try{await navigator.clipboard.writeText(url.toString());}catch{window.prompt('Copy race link:',url.toString());}};
  useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('year')==='2027')setYear(2027);if(params.has('race'))setLinkedRace(params.get('race')||'');if(params.has('country'))setCountry(params.get('country')||'all');if(params.has('month'))setMonth(params.get('month')||'0');if(params.has('category'))setCategory(params.get('category')||'all');if(params.has('from'))setFrom(params.get('from')||'');if(params.has('to'))setTo(params.get('to')||'');if(params.has('q'))setQuery(params.get('q')||'');if(params.has('type'))setRaceType(params.get('type')||'all');},[]);
  useEffect(()=>{const url=new URL(window.location.href);for(const k of ['year','country','month','category','from','to','q','type'])url.searchParams.delete(k);
    for(const [k,v] of Object.entries({year:year===2027?'2027':'',country,month,category,from,to,q:query,type:raceType}))if(v&&v!=='all'&&v!=='0')url.searchParams.set(k,v);
    window.history.replaceState(null,'',url.toString());
  },[year,country,month,category,from,to,query,raceType]);
  const [showArchived,setShowArchived]=useState(false);
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(PAGE_SIZE);
  useEffect(()=>{
    const controller=new AbortController();
    loadU19Races((done,total)=>setLoadStatus(`Loading races ${done} of ${total}…`),controller.signal)
      .then(({races,manifest})=>{setRaces(races);setManifest(manifest);setLoadStatus('');setLoadError('');})
      .catch(err=>{if(!controller.signal.aborted)setLoadError(String(err?.message||err));});
    return ()=>controller.abort();
  },[]);
  const countries=useMemo(()=>[...new Map(races.map(r=>[r.countryCode,countryLabel(r.countryCode,r.country)])).entries()].sort((a,b)=>a[1].localeCompare(b[1])),[races]);
  const selectedLinkedRace=races.find(r=>r.id===linkedRace);
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase();
    return races.filter(r=>{
      if(year===2027)return false;
      if(linkedRace)return r.id===linkedRace;
      if(!showArchived&&!visibleRace(r))return false;
      if(savedOnly&&!saved.includes(r.id))return false;
      if(futureOnly && (r.enddate||r.date)<todayISO())return false;
      if(country!=='all'&&r.countryCode!==country)return false;
      if(month!=='0' && !raceOverlaps(r,`2026-${month.padStart(2,'0')}-01`,new Date(Date.UTC(2026,Number(month),0)).toISOString().slice(0,10)))return false;
      if(category==='men'&&!r.sex.includes('M'))return false;
      if(category==='women'&&!r.sex.includes('Ž')&&!/women|female/i.test(r.sex))return false;
      if(verification!=='all'&&r.bucket!==verification)return false;
      if(state!=='all'&&r.state!==state)return false;
      if(raceType!=='all'&&!raceTypeLabel(r).includes(raceType))return false;
      if((from||to)&&!raceOverlaps(r,from,to))return false;
      if(q&&!`${r.name} ${r.place} ${r.region} ${r.country} ${countryLabel(r.countryCode,r.country)} ${englishCategory(r.sex)} ${englishRaceType(r.type)} ${englishConfirmation(r.confirmation)} ${englishRaceNote(r.status)}`.toLocaleLowerCase().includes(q))return false;
      return true;
    });
  },[races,showArchived,country,month,category,verification,state,from,to,query,raceType,futureOnly,savedOnly,saved,linkedRace,year]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pages);
  const shown=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const reset=()=>{setYear(2026);setLinkedRace('');const url=new URL(window.location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url.toString());setQuery('');setCountry('all');setMonth('0');setCategory('all');setVerification('confirmed');setState('active');setFrom('');setTo('');setRaceType('all');setFutureOnly(false);setSavedOnly(false);setShowArchived(false);setPage(1);};
  const resetPage=()=>{setLinkedRace('');const url=new URL(window.location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url.toString());setPage(1);};
  const controlClass='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';
  const dateForCalendar = (year === 2026 ? filtered : []);
  return <main className="min-h-screen bg-background text-foreground">
    <header className="yp-site-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Young Peloton home">
          <img src="/yp-favicon.svg" alt="" width="40" height="40" className="rounded-lg" />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-[-0.035em] text-slate-950">YOUNG <span className="text-sky-700">PELOTON</span></span>
            <span className="mt-1 text-[9px] font-bold tracking-[0.22em] text-slate-500">EUROPEAN JUNIOR RACING</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
          <button type="button" onClick={()=>jump('calendar')} className={tab==='calendar'?'yp-nav-link yp-nav-active':'yp-nav-link'}>Races</button>
          <button type="button" onClick={()=>jump('map')} className={tab==='map'?'yp-nav-link yp-nav-active':'yp-nav-link'}>Map</button>
          <Link to="/season" className="ml-1 inline-flex items-center rounded-md bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-sky-900 sm:ml-3 sm:px-4">{user?'My season':'Build my season'} <ArrowUpRight size={14} className="ml-1 hidden sm:inline"/></Link>
        </nav>
      </div>
    </header>
    <section className="yp-hero relative isolate overflow-hidden bg-[#061a30] text-white">
      <div className="yp-hero-grid absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.3fr_0.7fr] lg:gap-12 lg:py-20">
        <div>
          <div className="mb-6 flex items-center gap-3"><span className="h-[2px] w-10 bg-cyan-400" aria-hidden="true" /><span className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">The junior race index · Europe</span></div>
          <h1 className="yp-display max-w-3xl text-[clamp(2.9rem,6vw,5.1rem)] leading-[1.04] tracking-[-0.055em]">Find your next <span className="italic text-cyan-300">U19 cycling race</span> in Europe.</h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-300 md:text-base">Search European junior cycling events by country, date and race type. Compare verified race information and plan your season in one place.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button onClick={()=>jump('calendar')} className="h-11 rounded-md bg-cyan-300 px-5 font-bold text-slate-950 hover:bg-cyan-200"><CalendarDays size={17}/> Explore races</Button>
            <Link to="/season" className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-white/10">My racing season <ArrowUpRight size={16} className="ml-2"/></Link>
          </div>
          <p className="mt-6 text-[11px] leading-5 text-slate-400">Race information is sourced from event listings. Always confirm entry details with the organiser.</p>
        </div>
        <div className="yp-season-graphic relative hidden min-h-[345px] overflow-hidden border border-white/15 lg:block" aria-hidden="true">
          <div className="absolute left-7 top-7 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">YP / Race calendar</div>
          <div className="yp-speed-stripes absolute right-[-8%] top-[20%] h-[160px] w-[120%] rotate-[-18deg]" />
          <div className="absolute bottom-14 left-7 text-[120px] font-black leading-none tracking-[-0.12em] text-white/90">26<span className="ml-3 align-top text-lg font-medium tracking-normal text-cyan-300">/ 27</span></div>
          <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/30 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65"><span>Road · TT · Stage</span><span>EST. 2026</span></div>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-5 py-10">
      {manifest&&<div className="yp-index-stats mb-10 grid gap-4 border-y border-slate-200 py-3 sm:grid-cols-3">
        <div className="yp-stat py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">European source records</p><p className="mt-1 font-mono text-[27px] font-semibold tracking-tight text-slate-950 tabular-nums">{manifest.rawEuropeanRecords.toLocaleString('en')}</p></div>
        <div className="yp-stat py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Distinct listed entries</p><p className="mt-1 font-mono text-[27px] font-semibold tracking-tight text-slate-950 tabular-nums">{manifest.uniqueVisibleRecords.toLocaleString('en')}</p></div>
        <div className="yp-stat py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Countries / regions</p><p className="mt-1 font-mono text-[27px] font-semibold tracking-tight text-slate-950 tabular-nums">{countries.length}</p></div>
      </div>}
      {loadError&&<div role="alert" className="mb-6 rounded-lg border border-red-300 p-4"><strong>Could not load races.</strong> {loadError} <button className="ml-2 underline" onClick={()=>window.location.reload()}>Retry</button></div>}
      {!manifest&&!loadError&&<p role="status" className="my-10 text-center text-muted-foreground">{loadStatus}</p>}
      {manifest&&<>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="season">Season</label>
          <select id="season" className="rounded-md border bg-background px-3 py-2" value={year} onChange={e=>{setYear(Number(e.target.value));setPage(1);}}>
            <option value={2026}>2026 archive</option><option value={2027}>2027 upcoming season</option>
          </select>
          {year===2027&&<span role="status" className="text-sm text-amber-800">No verified 2027 race records have been published to Young Peloton yet.</span>}
        </div>
        {linkedRace&&<div role="status" className="mb-5 rounded-lg border border-sky-300 bg-sky-50 p-4 text-slate-900">{selectedLinkedRace?<>Showing linked race: <strong>{selectedLinkedRace.name}</strong></>:'This race link is not in the current archive.'} <button type="button" className="ml-3 underline" onClick={reset}>Show all races</button></div>}
        <div id="race-results" className="mb-5 flex flex-wrap items-center justify-between gap-3 scroll-mt-4">
          <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.17em] text-sky-700">Season planning / {year}</p><h2 className="yp-section-heading text-3xl font-semibold tracking-tight text-slate-950">{tab==='calendar'?'Find a race':'Racing across Europe'}</h2></div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">{filtered.length.toLocaleString('en')} matching records</span><Button variant="outline" onClick={()=>downloadCsv(dateForCalendar)} disabled={year!==2026}><ArrowDownToLine size={16}/> CSV</Button>
          <Button variant="outline" onClick={()=>downloadIcs(dateForCalendar)} disabled={year!==2026||dateForCalendar.length===0}><CalendarDays size={16}/> Export calendar (.ics)</Button></div>
        </div>
        <div className="yp-filter-panel mb-7 rounded-lg border border-slate-200 bg-white p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between sm:hidden"><strong className="text-sm">Find races</strong><button type="button" className="rounded-md border px-3 py-2 text-sm" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{advanced?'Hide advanced filters':'Advanced filters'}</button></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm"><span className="mb-1 block font-medium">Search name or place</span><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input value={query} onChange={e=>{setQuery(e.target.value);resetPage();}} placeholder="Race, town, region…" className="pl-9"/></div></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Country</span><select className={controlClass} value={country} onChange={e=>{setCountry(e.target.value);resetPage();}}><option value="all">All countries</option>{countries.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Month</span><select className={controlClass} value={month} onChange={e=>{setMonth(e.target.value);resetPage();}}>{MONTHS.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block font-medium">Category</span><select className={controlClass} value={category} onChange={e=>{setCategory(e.target.value);resetPage();}}><option value="all">U19 men & women / unspecified</option><option value="men">Men</option><option value="women">Women</option></select></label>
            <label className={advanced?'block text-sm':'hidden text-sm sm:block'}><span className="mb-1 block font-medium">U19 verification</span><select className={controlClass} value={verification} onChange={e=>{setVerification(e.target.value);resetPage();}}>{statusOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label className={advanced?'block text-sm':'hidden text-sm sm:block'}><span className="mb-1 block font-medium">Race state</span><select className={controlClass} value={state} onChange={e=>{setState(e.target.value);resetPage();}}><option value="all">All including cancelled</option><option value="active">Not marked cancelled</option><option value="cancelled">Cancelled</option>{showArchived&&<option value="merged">Merged / archived</option>}</select></label>
            <label className={advanced?'block text-sm':'hidden text-sm sm:block'}><span className="mb-1 block font-medium">From</span><input type="date" className={controlClass} value={from} onChange={e=>{setFrom(e.target.value);resetPage();}} /></label>
            <label className={advanced?'block text-sm':'hidden text-sm sm:block'}><span className="mb-1 block font-medium">Until</span><input type="date" className={controlClass} value={to} onChange={e=>{setTo(e.target.value);resetPage();}} /></label>
          <label className={advanced?'block text-sm':'hidden text-sm sm:block'}><span className="mb-1 block font-medium">Race type</span><select className={controlClass} value={raceType} onChange={e=>{setRaceType(e.target.value);resetPage();}}><option value="all">All race types</option><option value="road">Road race</option><option value="time trial">Time trial</option><option value="stage">Stage race</option><option value="criterium">Criterium</option><option value="hill climb">Hill climb</option></select></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={futureOnly} onChange={e=>{setFutureOnly(e.target.checked);resetPage();}}/>Upcoming only</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={savedOnly} onChange={e=>{setSavedOnly(e.target.checked);resetPage();}}/>Saved races ({saved.length})</label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={e=>{setShowArchived(e.target.checked);setState('active');resetPage();}} />Show archived merged / duplicate source records ({manifest.mergedRecords+manifest.semanticDuplicateRecords})</label>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm text-sky-700 hover:underline"><RotateCcw size={14}/> Reset filters</button>
          </div>
        </div>
        {tab==='map'?<U19Map races={filtered} />:<>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" role="status">
              Showing {filtered.length?(currentPage-1)*pageSize+1:0}–{Math.min(currentPage*pageSize,filtered.length)} of {filtered.length.toLocaleString('en')} races
            </p>
            <label htmlFor="races-per-page" className="flex items-center gap-3 text-sm font-medium text-slate-700">
              Races per page
              <select id="races-per-page" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
                {[12,24,48,96].map(size=><option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(r=><article key={r.id} className="yp-race-card flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition-all duration-200">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold tabular-nums text-sky-800">{niceDate(r.date)}{r.enddate&&r.enddate!==r.date?` – ${niceDate(r.enddate)}`:''}</span><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${raceClasses[r.bucket]||'bg-muted'}`}>{bucketText[r.bucket]||r.bucket}</span></div>
                <h3 className="text-[17px] font-bold leading-snug tracking-[-0.018em] text-slate-950"><Link to="/race/$raceId" params={{raceId:r.id}} className="hover:text-sky-700 hover:underline">{r.name}</Link></h3>
                <div className="mt-2 flex gap-2"><button onClick={()=>void toggleSaved(r.id,year)} aria-label={saved.includes(r.id)?'Remove saved race':'Save race'} className="rounded-md border px-2 py-1 text-xs"><Bookmark size={14} className="inline"/> {saved.includes(r.id)?'Saved':'Save'}</button><button onClick={()=>shareRace(r)} className="rounded-md border px-2 py-1 text-xs" title="Copy direct link"><Share2 size={14} className="inline"/> Copy link</button></div>
                <p className="mt-2 text-sm text-muted-foreground">{r.place||'Venue not specified'} · {countryLabel(r.countryCode,r.country)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-muted px-2 py-1">{englishCategory(r.sex)||'Category unconfirmed'}</span>{r.type&&<span className="rounded bg-muted px-2 py-1">{englishRaceType(r.type)}</span>}{r.state==='cancelled'&&<span className="rounded bg-red-100 px-2 py-1 font-semibold text-red-800">CANCELLED</span>}{r.state==='merged'&&<span className="rounded bg-amber-100 px-2 py-1">MERGED RECORD</span>}{!!r.duplicate&&<span className="rounded bg-amber-100 px-2 py-1">DUPLICATE SOURCE RECORD</span>}</div>
                {r.confirmation&&<p className="mt-3 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">Verification:</span> {englishConfirmation(r.confirmation)}</p>}
                {r.status&&<p className="mt-2 text-xs leading-relaxed text-muted-foreground">{englishRaceNote(r.status)}</p>}
                {r.roadUnconfirmed===1&&<p className="mt-2 text-xs text-amber-700">Road discipline not independently verified</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm"><Source url={r.sourceUrl}>Original source</Source>{r.proofUrl&&r.proofUrl!==r.sourceUrl&&<Source url={r.proofUrl}>U19 evidence</Source>}{r.resultUrl&&<Source url={r.resultUrl}>Results</Source>}</div>
            </article>)}
          </div>
          {year===2027&&<p className="mb-4 rounded-xl border border-amber-300 p-4 text-sm">2027 season: verified event dates, registration deadlines, distances and elevation will be added only when supported by official sources. The 2026 archive remains available above.</p>}
          {filtered.length===0&&<p className="rounded-xl border border-border p-10 text-center text-muted-foreground">No races match these filters. Try a different date, country or verification status.</p>}
          {pages>1&&<nav aria-label="Race results pages" className="mt-8 flex items-center justify-center gap-4"><Button disabled={currentPage<=1} variant="outline" onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button><span className="text-sm tabular-nums">Page {currentPage} of {pages}</span><Button variant="outline" disabled={currentPage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</Button></nav>}
        </>}
        <aside className="mt-10 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><strong className="text-foreground">Source and verification notes.</strong> The 2026 source archive was updated {manifest.asOf}. It is not marked complete. Dates are the dates listed in the source archive, not independently confirmed event outcomes. {manifest.missingDates} source entries have no exact date; those show “Date unconfirmed.” U19 participation is not verified for every listed event. Cancelled races are labelled and excluded from neither the total nor the calendar. {manifest.mergedRecords} merged and {manifest.semanticDuplicateRecords} duplicate source records remain available in the archive filter but are hidden by default to prevent double counting. The map uses approximate settlement / area / country centres, not race start coordinates.</div></div>
        </aside>
      </>}
    </div>
    <footer className="mt-8 border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
      <p>Young Peloton · European U19 road cycling archive · 2026 · Official event names remain in their published language</p>
      <nav aria-label="Project information" className="mt-3 flex flex-wrap justify-center gap-4"><Link to="/season" className="underline">My Racing Season</Link><a className="underline" href="/about">About & methodology</a><a className="underline" href="https://github.com/oskarberlec-maker/young-peloton/issues/new" target="_blank" rel="noopener noreferrer">Report incorrect race information</a></nav>
    </footer>
  </main>;
}