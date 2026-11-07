import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Send, ShieldCheck } from 'lucide-react';
import { REPORT_TYPES, type ReportType } from '@/lib/issue-report';

type ReportSearch = { raceId?: string; raceName?: string };
export const Route = createFileRoute('/report')({
  validateSearch: (search:Record<string,unknown>):ReportSearch => ({
    ...(typeof search['raceId']==='string' && search['raceId'].length<=180 ? {raceId:search['raceId']} : {}),
    ...(typeof search['raceName']==='string' && search['raceName'].length<=200 ? {raceName:search['raceName']} : {}),
  }),
  head:()=>({
    meta:[
      {title:'Report incorrect race information | Young Peloton'},
      {name:'description',content:'Report a mistake in the European U19 cycling race calendar, including a link to official evidence. No account required.'},
      {name:'robots',content:'noindex,follow'},
    ],
    links:[{rel:'canonical',href:'https://www.youngpeloton.eu/report'}],
  }),
  component: ReportPage,
});
function ReportPage(){
  const {raceId='',raceName=''}=Route.useSearch();
  const [id,setId]=useState(raceId);
  const [name,setName]=useState(raceName);
  const [kind,setKind]=useState<ReportType>('Wrong date');
  const [description,setDescription]=useState('');
  const [proofUrl,setProofUrl]=useState('');
  const [website,setWebsite]=useState('');
  const [startedAt,setStartedAt]=useState(()=>Date.now());
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState('');
  const [error,setError]=useState('');

  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(submitting)return;
    setSubmitting(true);setError('');
    try{
      const response=await fetch('/api/report-issue',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({raceId:id,raceName:name,issueType:kind,description,proofUrl,website,startedAt}),
      });
      const result=await response.json() as {success?:boolean;reference?:string;error?:string};
      if(!response.ok || !result.success) throw new Error(result.error||'Could not submit the report.');
      setSuccess(result.reference||'submitted');
      setDescription('');setProofUrl('');
    }catch(reason){
      setError(reason instanceof Error ? reason.message : 'Unable to send report.');
      setStartedAt(Date.now());
    }finally{setSubmitting(false);}
  };

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-5">
        <Link to="/" className="font-black tracking-tight">YOUNG <span className="text-sky-700">PELOTON</span></Link>
      </div>
    </header>
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"><ArrowLeft size={16}/> Back to races</Link>
      <div className="mt-7 flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-800"><AlertTriangle size={22}/></div>
        <div><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Report incorrect race information</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Found an incorrect date, category, cancellation or other mistake? Send a correction with a link to evidence so we can verify it. No account required.</p></div>
      </div>
      {success ? <div className="mt-8 rounded-xl border border-emerald-200 bg-white p-6" role="status">
        <div className="flex items-center gap-2 font-bold text-emerald-800"><ShieldCheck size={20}/> Report received</div>
        <p className="mt-2 text-sm">Thank you. Your report was stored for manual review. Reference: <code className="break-all">{success}</code>.</p>
        <p className="mt-2 text-xs text-slate-600">Reports do not automatically change published race information. We verify the supporting source first.</p>
        <button type="button" onClick={()=>{setSuccess('');setStartedAt(Date.now());}} className="mt-4 rounded-lg border px-4 py-2 text-sm">Report another issue</button>
      </div> : <form onSubmit={e=>void submit(e)} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Race name <span className="text-red-700">*</span>
            <input required maxLength={200} minLength={3} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Course de la Paix Juniors" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          </label>
          <label className="block text-sm font-semibold">Race ID <span className="font-normal text-slate-500">(optional)</span>
            <input maxLength={180} value={id} onChange={e=>setId(e.target.value)} placeholder="Automatically filled from race page" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          </label>
        </div>
        <label className="block text-sm font-semibold">What is incorrect? <span className="text-red-700">*</span>
          <select value={kind} onChange={e=>setKind(e.target.value as ReportType)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">
            {REPORT_TYPES.map(type=><option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">What should the correct information be? <span className="text-red-700">*</span>
          <textarea required minLength={12} maxLength={1800} rows={4} value={description} onChange={e=>setDescription(e.target.value)}
            placeholder="Explain the error and provide the correct date, category or detail." className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
        </label>
        <label className="block text-sm font-semibold">Link to official evidence <span className="text-red-700">*</span>
          <input required type="url" pattern="https://.*" maxLength={1500} value={proofUrl} onChange={e=>setProofUrl(e.target.value)}
            placeholder="https://organizer.example.com/official-race-announcement"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-600">
            Required. Please link to the organizer, national federation or another publicly accessible confirmation of the correct information. <ExternalLink size={12} className="inline"/>
          </span>
        </label>
        <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
        {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p className="text-xs text-slate-600">Submitted details and evidence are kept privately for manual verification. Please do not include personal information.</p>
        <button disabled={submitting} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"><Send size={16}/>{submitting?'Sending…':'Submit correction'}</button>
      </form>}
    </div>
  </main>;
}
