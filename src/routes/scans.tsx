import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { loadScanHistory, scanDay, type ScanRun } from '@/lib/scan-history';

export const Route = createFileRoute('/scans')({
  head:()=>({meta:[{title:'Daily scan history — Young Peloton'},{name:'description',content:'Daily race source checks, verified updates and source coverage reports for Young Peloton.'}],links:[{rel:'canonical',href:'https://www.youngpeloton.eu/scans'}]}),
  component:ScanHistory,
});
const count=(n:number|undefined)=>typeof n==='number'?n.toLocaleString('en-GB'):'Not recorded';
const time=(at:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Ljubljana',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));
function ScanHistory(){
  const [runs,setRuns]=useState<ScanRun[]>([]);
  const [loading,setLoading]=useState(true);
  const [archiveUnavailable,setArchiveUnavailable]=useState(false);
  const [day,setDay]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);
    loadScanHistory(controller.signal).then(result=>{if(!controller.signal.aborted){setRuns(result.runs);setArchiveUnavailable(result.archiveUnavailable);setLoading(false);}});
    return ()=>controller.abort();
  },[attempt]);
  const days=[...new Set(runs.map(r=>scanDay(r.lastRunAt)))];
  const selected=days.includes(day)?day:days[0]||'';
  const daily=runs.filter(r=>scanDay(r.lastRunAt)===selected);
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-slate-950 px-5 py-5 text-white"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><Link to="/" className="font-black tracking-tight">YOUNG <span className="text-cyan-400">PELOTON</span></Link><Link to="/" className="text-sm underline">Back to races</Link></div></header>
    <div className="mx-auto max-w-5xl space-y-7 px-5 py-10">
      <div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Source monitoring</p><h1 className="mt-2 text-4xl font-bold">Daily scan history</h1><p className="mt-3 text-slate-600">See what each published source check found. Reports are grouped by day, with every published run kept when checks ran more than once.</p><p className="mt-2 text-sm text-slate-500">Times use Europe/Ljubljana. Days without a published report are not listed. This is an archive, not a live progress indicator.</p></div>
      {loading?<p role="status">Loading scan history…</p>:runs.length===0?<div role="alert" className="rounded-lg border p-5"><p>Scan history could not be loaded. Race data is still available.</p><button onClick={()=>setAttempt(x=>x+1)} className="mt-3 underline">Try again</button></div>:<>
        {archiveUnavailable&&<p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Showing the bundled report archive and latest available report. The live history archive is currently unavailable.</p>}
        {Date.now()-Date.parse(runs[0]!.lastRunAt)>48*3600000&&<p role="status" className="text-amber-800">The latest published report is more than 48 hours old.</p>}
        <div className="flex flex-wrap items-end justify-between gap-4"><label className="text-sm font-semibold">Scan date<select value={selected} onChange={e=>setDay(e.target.value)} className="mt-2 block min-h-11 rounded-md border bg-white px-3 py-2">{days.map(d=><option key={d} value={d}>{d} · {runs.filter(r=>scanDay(r.lastRunAt)===d).length} run(s)</option>)}</select></label><p className="text-sm text-slate-600">{runs.length} published runs · {days.length} days</p></div>
        {daily.map((run,i)=><article key={run.lastRunAt} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{selected} · {time(run.lastRunAt)}</h2><span className={'rounded-full px-3 py-1 text-xs font-semibold '+(run.complete?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900')}>{run.complete?'Completed report':'Partial report'}</span></div>
          <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">{([
            ['Registered sources',run.totalSources],['Sources reached',run.successful],['Read errors',run.errors],['Deferred sources',run.deferred],['Races updated',run.updatedRaces],['2027 editions added',run.confirmed2027Added],
          ] as const).map(([label,value])=><div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{count(value)}</dd></div>)}</dl>
          <p className="mt-5 text-sm text-slate-600">Deferred sources were not rechecked; previous data was retained. A completed report does not mean every source was readable.</p>
          <details open={i===0} className="mt-5 border-t pt-4"><summary className="cursor-pointer font-semibold">Report details</summary><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{([
            ['Supported data sources',run.supportedSources],['Sources changed',run.changedSources],['Review entries',run.needsReview],['Date conflicts held for review',run.dateConflicts],['Verified UCI 2027 competitions',run.calendarVerified2027],['Historical pages without 2027 evidence',run.historicalSources],['Unchanged responses',run.notModified],['Retries',run.retries],['Linked legacy IDs',run.legacyIdsMapped],['Unresolved legacy IDs',run.legacyIdsUnmapped],
          ] as const).map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{count(value)}</dd></div>)}</dl>
          <p className="mt-4 text-sm">Duration: {typeof run.durationSeconds==='number'?`${Math.ceil(run.durationSeconds/60)} minutes`:'Not recorded'}{run.readerVersion?` · Scanner version ${run.readerVersion}`:''}</p>
          {run.reviewCategories&&<div className="mt-5"><h3 className="font-semibold">Review breakdown</h3><ul className="mt-2 space-y-1 text-sm">{Object.entries(run.reviewCategories).sort((a,b)=>b[1]-a[1]).map(([label,n])=><li key={label}>{label.replaceAll('_',' ')}: {count(n)}</li>)}</ul></div>}
          {!!run.topErrorHosts?.length&&<div className="mt-5"><h3 className="font-semibold">Sources with read errors</h3><ul className="mt-2 space-y-1 break-words text-sm">{run.topErrorHosts.map(h=><li key={h.host}>{h.host}: {count(h.count)}</li>)}</ul></div>}
          </details>
          {run.reportUrl&&<a href={run.reportUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-semibold text-sky-700 underline">Open full report (JSON)</a>}
        </article>)}
      </>}
      <nav className="flex flex-wrap gap-5 border-t pt-5 text-sm"><Link to="/" className="underline">Race calendar</Link><Link to="/about" className="underline">About & methodology</Link></nav>
    </div>
  </main>;
}
