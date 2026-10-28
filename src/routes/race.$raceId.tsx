import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { loadU19Races, niceDate, countryLabel, safeUrl, type U19Race } from '@/lib/u19-data';
import { englishCategory,englishRaceType,englishConfirmation } from '@/lib/u19-english';
import { getRaceLevel } from '@/lib/race-level';
export const Route=createFileRoute('/race/$raceId')({
 head:()=>({meta:[{title:'Race details — Young Peloton'},{name:'description',content:'Junior road cycling race details and original verification sources.'}]}),
 component:RacePage,
});
function RacePage(){
 const {raceId}=Route.useParams();
 const [race,setRace]=useState<U19Race|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);
   loadU19Races(undefined,controller.signal).then(({races})=>setRace(races.find(r=>r.id===raceId)||null))
     .catch(e=>{if(!controller.signal.aborted)setError(String(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
   return ()=>controller.abort();
 },[raceId]);
 return <main className="min-h-screen bg-background text-foreground">
 <header className="bg-slate-950 p-5 text-white"><div className="mx-auto max-w-4xl"><Link to="/" className="font-bold">YOUNG PELOTON</Link></div></header>
 <article className="mx-auto max-w-4xl space-y-5 p-5 py-10">
 <Link to="/" className="text-sky-700 underline">← Race calendar</Link>
 {loading&&<p role="status">Loading race details…</p>}
 {error&&<p role="alert">Unable to load event information: {error}</p>}
 {!loading&&!error&&!race&&<h1 className="text-3xl font-bold">Race not found</h1>}
 {race&&<><p className="text-sm font-semibold text-sky-700">{niceDate(race.date)}{race.enddate&&race.enddate!==race.date?' – '+niceDate(race.enddate):''}</p>
 <h1 className="text-4xl font-extrabold">{race.name}</h1>
 <p>{race.place||'Venue not specified'} · {countryLabel(race.countryCode,race.country)}</p>
 <dl className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
 <div><dt className="text-sm text-muted-foreground">Eligibility</dt><dd>{englishConfirmation(race.confirmation)||'Not confirmed'}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Category</dt><dd>{englishCategory(race.sex)}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Discipline</dt><dd>{englishRaceType(race.type)}</dd></div>
 <div><dt className="text-sm text-muted-foreground">Race level</dt><dd className="font-semibold">{getRaceLevel(race).label}</dd><p className="mt-1 text-sm text-muted-foreground">{getRaceLevel(race).subtype}</p><p className="mt-1 text-xs text-muted-foreground"><strong>Evidence:</strong> {getRaceLevel(race).method} — {getRaceLevel(race).basis}</p></div>
 {race.sourceUpdatedAt&&<div><dt className="text-sm text-muted-foreground">Last automatic correction</dt><dd>{new Date(race.sourceUpdatedAt).toLocaleString('en-GB')}</dd>{safeUrl(race.updateSourceUrl)&&<a className="text-sky-700 underline" href={race.updateSourceUrl} target="_blank" rel="noopener noreferrer">Verified change source</a>}</div>}
 <div><dt className="text-sm text-muted-foreground">Status</dt><dd>{race.state}</dd></div>
 </dl>
 <p className="rounded-lg border p-4 text-sm">Competition levels were imported from the 2026 Young Peloton race-classification workbook. Not every linked source has been checked live. Entry deadline, race distance, elevation gain and start coordinates: not independently verified in this dataset. Please consult the official organizer. Being listed does not guarantee eligibility or that this event takes place.</p>
 <div className="flex flex-wrap gap-4">{safeUrl(race.sourceUrl)&&<a className="text-sky-700 underline" href={race.sourceUrl} target="_blank" rel="noopener noreferrer">Original source</a>}{safeUrl(race.proofUrl)&&<a className="text-sky-700 underline" href={race.proofUrl} target="_blank" rel="noopener noreferrer">Eligibility evidence</a>}</div>
 <a className="text-sky-700 underline" href="https://github.com/oskarberlec-maker/young-peloton/issues/new" target="_blank" rel="noopener noreferrer">Report incorrect information</a>
 </>}
 </article></main>;
}
