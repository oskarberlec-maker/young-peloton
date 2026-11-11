import { englishPlace } from '@/lib/u19-english';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useRacingSeason } from '@/lib/use-racing-season';
import { loadU19Race, niceDate, countryLabel, safeUrl, type U19Race } from '@/lib/u19-data';
import { englishCategory,englishRaceType,englishConfirmation,englishRaceNote } from '@/lib/u19-english';
import { getRaceLevel } from '@/lib/race-level';
import { RaceSourceLinks } from '@/components/ui/RaceSourceLinks';
import { RaceEntryGuide } from '@/components/RaceEntryGuide';
import { raceMapUrl } from '@/lib/race-navigation';
import { sourceLabel } from '@/lib/source-label';
export const Route=createFileRoute('/race/$raceId')({
 validateSearch:(search:Record<string,unknown>):{returnTo?:string}=>typeof search['returnTo']==='string' && /^\/(?:\?|$)/.test(search['returnTo'])?{returnTo:search['returnTo']}:{},
 head:({params})=>({
   meta:[
     {title:'U19 cycling race '+params.raceId+' | Young Peloton'},
     {name:'description',content:'Dates, category, status and official source for a European U19 cycling race. Check the original organizer information.'},
     {property:'og:type',content:'article'},
     {property:'og:url',content:'https://www.youngpeloton.eu/race/'+encodeURIComponent(params.raceId)},
   ],
   links:[{rel:'canonical',href:'https://www.youngpeloton.eu/race/'+encodeURIComponent(params.raceId)}],
 }),
 component:RacePage,
});
function RacePage(){
 const {raceId}=Route.useParams();
 const {saved,toggle,error:saveError}=useRacingSeason();
 const {returnTo}=Route.useSearch();
 const calendarUrl=returnTo || ((raceId.startsWith('uci-2027-') || raceId.startsWith('confirmed-2027-'))?'/?year=2027':'/');
 const [race,setRace]=useState<U19Race|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setRace(null);
   loadU19Race(raceId,controller.signal).then(race=>{if(!controller.signal.aborted)setRace(race);})
     .catch(e=>{if(!controller.signal.aborted)setError(String(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
   return ()=>controller.abort();
 },[raceId]);
 useEffect(()=>{
   if(!race)return;
   const title=race.name+' ('+race.date.slice(0,4)+') — U19 Cycling | Young Peloton';
   document.title=title.slice(0,125);
   const description=[race.name, race.date, race.place, countryLabel(race.countryCode,race.country),'European junior cycling race information and original source.'].filter(Boolean).join(' · ').slice(0,200);
   const setMeta=(selector:string,attribute:string,content:string)=>{
     let node=document.head.querySelector<HTMLMetaElement>(selector);
     if(!node){node=document.createElement('meta');node.setAttribute(attribute,selector.includes('og:')?'og:title':'description');document.head.appendChild(node);}
     node.setAttribute('content',content);
   };
   setMeta('meta[name="description"]','name',description);
   // The initial server-side canonical URL remains stable; detailed text updates on navigation.
 },[race]);
 return <main className="min-h-screen bg-background text-foreground">
 <header className="bg-slate-950 p-5 text-white"><div className="mx-auto max-w-4xl"><Link to="/" className="font-bold">YOUNG PELOTON</Link></div></header>
 <article className="mx-auto max-w-4xl space-y-5 p-5 py-10">
 <a href={calendarUrl} className="text-sky-700 underline">← Race calendar</a>
 {loading&&<p role="status">Loading race details…</p>}
 {error&&<p role="alert">Unable to load event information: {error}</p>}
 {!loading&&!error&&!race&&<h1 className="text-3xl font-bold">Race not found</h1>}
 {race&&<><p className="text-sm font-semibold text-sky-700">{niceDate(race.date)}{race.enddate&&race.enddate!==race.date?' – '+niceDate(race.enddate):''}</p>
 <h1 className="text-4xl font-extrabold">{race.name}</h1>
 <p className="font-mono text-xs text-muted-foreground">Official archive programme ID: {race.id}</p>
 <div className="flex flex-wrap items-center gap-3"><button type="button" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50" onClick={()=>void toggle(race.id,race.date.startsWith("2027-")?2027:2026,race)}><Bookmark size={16}/>{saved.includes(race.id)?"Saved on this device":"Save on this device"}</button><Link to="/season" className="text-sm text-sky-700 underline">View saved races</Link></div>
 {saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}
 <p>{englishPlace(race.place)} · {countryLabel(race.countryCode,race.country)}</p>
 <dl className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
 <div><dt className="text-sm text-muted-foreground">Date / end date</dt><dd>{niceDate(race.date)}{race.enddate&&race.enddate!==race.date?' – '+niceDate(race.enddate):''}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Location</dt><dd>{englishPlace(race.place)} · {countryLabel(race.countryCode,race.country)}</dd><p className="mt-1 text-xs text-muted-foreground">Map position: {race.lat!=null&&race.lon!=null?`${Number(race.lat).toFixed(5)}, ${Number(race.lon).toFixed(5)} (${race.precision||'approximate'} precision)`:'Not established'} · Not a verified start line.</p><a className="text-sm text-sky-700 underline" href={raceMapUrl(race.id,race.date.startsWith('2027-')?2027:2026,calendarUrl)}>View on Young Peloton map</a></div>
 <div><dt className="text-sm text-muted-foreground">Eligibility</dt><dd>{englishConfirmation(race.confirmation)||'Not confirmed'}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Category</dt><dd>{englishCategory(race.sex)}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Discipline</dt><dd>{englishRaceType(race.type)}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Race level</dt><dd className="font-semibold">{getRaceLevel(race).label}</dd><p className="mt-1 text-sm text-muted-foreground">{getRaceLevel(race).subtype}</p><p className="mt-1 text-xs text-muted-foreground"><strong>Evidence:</strong> {getRaceLevel(race).method} — {getRaceLevel(race).basis}</p></div>
 {race.sourceUpdatedAt&&<div><dt className="text-sm text-muted-foreground">Last automatic correction</dt><dd>{new Date(race.sourceUpdatedAt).toLocaleString('en-GB')}</dd>{safeUrl(race.updateSourceUrl)&&<a className="text-sky-700 underline" href={race.updateSourceUrl} target="_blank" rel="noopener noreferrer">Verified change source</a>}</div>}
 <div><dt className="text-sm text-muted-foreground">Event status</dt><dd>{race.state==='cancelled'?'Cancelled':race.state==='merged'?'Merged / archived':race.state==='active'?'Listed (not necessarily held)':race.state}{race.duplicate?' · duplicate source entry':''}</dd><p className="mt-1 text-sm">{englishRaceNote(race.status)}</p></div>
 </dl>
 <RaceEntryGuide race={race}/>
 <p className="rounded-lg border p-4 text-sm">{race.id.startsWith('uci-2027-')?'The 2027 competition level comes from the official UCI junior calendar.':race.id.startsWith('confirmed-2027-')?'The official source confirms the 2027 date. The 2027 competition level has not yet been verified.':'Competition levels were imported from the 2026 Young Peloton race-classification workbook.'} Not every linked source has been checked live. Entry deadline, race distance, elevation gain and start coordinates: not independently verified in this dataset. Please consult the official organizer. Being listed does not guarantee eligibility or that this event takes place.</p>
 <div className="flex flex-wrap gap-4">{safeUrl(race.resultUrl)&&<a className="text-sky-700 underline" href={race.resultUrl} target="_blank" rel="noopener noreferrer">Results / results portal</a>}{safeUrl(race.sourceUrl)&&<a className="text-sky-700 underline" href={race.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(race.sourceUrl)}</a>}{safeUrl(race.proofUrl)&&<a className="text-sky-700 underline" href={race.proofUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(race.proofUrl,'U19 eligibility evidence')}</a>}</div>
 <section className="rounded-xl border p-4"><h2 className="text-base font-semibold">Results, technical guide & registration</h2><p className="mt-1 text-sm text-muted-foreground">Links are labelled by their destination where recognisable. Some lead to a calendar or portal rather than a race document; check the linked page.</p><RaceSourceLinks raceId={race.id}/></section>
 <div className="mt-7 border-t pt-5"><Link to="/report" search={{raceId:race.id,raceName:race.name}} className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100">Report incorrect information (with evidence link)</Link></div>
 </>}
 </article></main>;
}
