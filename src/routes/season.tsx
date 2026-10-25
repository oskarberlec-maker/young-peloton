import { createFileRoute,Link } from '@tanstack/react-router';
import { useEffect,useState } from 'react';
import { loadU19Races, niceDate,type U19Race } from '@/lib/u19-data';
import { downloadIcs } from '@/lib/race-calendar';
import { useRacingSeason } from '@/lib/use-racing-season';
import { cloudAccountsAvailable, googleProviderEnabled } from '@/lib/supabase-client';
import { GoogleIdentityButton } from '@/components/GoogleIdentityButton';
import { TeamSeason } from '@/components/TeamSeason';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const Route=createFileRoute('/season')({
  head:()=>({meta:[{title:'Build Your Racing Season — Young Peloton'},
    {name:'description',content:'Your private shortlist of European junior cycling races. Plan and export your U19 race calendar.'}]}),
  component:SeasonPage,
});
function SeasonPage() {
  const season=useRacingSeason();
  const [email,setEmail]=useState('');
  const [sent,setSent]=useState(false);
  const [googleReady,setGoogleReady]=useState<boolean|null>(null);
  useEffect(()=>{let mounted=true;void googleProviderEnabled().then(value=>{if(mounted)setGoogleReady(value);});return()=>{mounted=false;};},[]);
  const [races,setRaces]=useState<U19Race[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  useEffect(()=>{const controller=new AbortController();
    loadU19Races(undefined,controller.signal).then(x=>setRaces(x.races)).catch(e=>{if(!controller.signal.aborted)setLoadError(String(e));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return ()=>controller.abort();
  },[]);
  const selected=races.filter(r=>season.saved.includes(r.id)).sort((a,b)=>a.date.localeCompare(b.date));
  const missing=season.saved.filter(id=>!races.some(r=>r.id===id));
  const onSend=async(e:React.FormEvent)=>{e.preventDefault();try{await season.signIn(email.trim());setSent(true);}catch{}};
  return <main className="min-h-screen bg-background text-foreground">
    <header className="bg-slate-950 text-white"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
      <Link to="/" className="text-xl font-black tracking-tight">YOUNG <span className="text-cyan-400">PELOTON</span></Link>
      <Link to="/" className="text-sm underline">Explore races</Link></div></header>
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-sky-700">Your personal race calendar</p>
        <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Build Your Racing Season.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Save races while browsing and find your selected events in one place. Export the season to your calendar.</p>
      </div>
      <section className="rounded-xl border p-5 space-y-3" aria-label="Account">
        {!cloudAccountsAvailable&&<p className="text-sm text-amber-800">Cloud accounts are not enabled yet. Saved races are kept only in this browser until the site owner connects the account database.</p>}
        {cloudAccountsAvailable&&!season.user&&<><h2 className="text-xl font-semibold">Sign in to save your season</h2>
          <p className="text-sm text-muted-foreground">Use your Google account to save and sync races securely across devices.</p>
          {googleClientId && googleReady===true
            ? <GoogleIdentityButton clientId={googleClientId} onCredential={season.signInWithGoogleIdToken} />
            : <button type="button" disabled={season.busy||googleReady!==true} onClick={()=>void season.signInWithGoogle().catch(()=>{})}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                Continue with Google
              </button>}
          {!googleClientId&&googleReady===true&&<p className="text-center text-xs text-muted-foreground">Google's inline sign-in is being configured; the existing secure Google login remains available.</p>}
          {googleReady===false&&<p className="text-sm text-amber-800" role="status">Google sign-in is being set up. You can still sign in by email below.</p>}
          {googleReady===null&&<p className="text-sm text-muted-foreground" role="status">Checking Google sign-in availability…</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border"/><span>Or continue with email</span><div className="h-px flex-1 bg-border"/></div>
          <p className="text-sm text-muted-foreground">We'll email you a secure sign-in link. No password needed.</p>
          <form onSubmit={onSend} className="flex flex-wrap gap-2">
            <input type="email" autoComplete="email" required aria-label="Email address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"/>
            <button disabled={season.busy} className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50">Email me a sign-in link</button>
          </form>
          {sent&&<p role="status" className="text-sm text-emerald-700">Check your email and open the sign-in link.</p>}
        </>}
        {season.user&&<><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Signed in</h2><p className="text-sm text-muted-foreground">{season.user.email}</p></div>
          <button className="rounded-md border px-3 py-2 text-sm" onClick={()=>void season.signOut()}>Sign out</button></div>
          {season.localCount>0&&<div className="rounded-lg bg-muted p-3"><p className="text-sm">You have {season.localCount} races saved on this device. They will not be uploaded automatically.</p>
            <button disabled={season.busy} onClick={()=>void season.importLocal()} className="mt-2 rounded-md border bg-background px-3 py-2 text-sm font-medium">Import races from this device</button>
          </div>}
        </>}
        {season.error&&<p role="alert" className="text-sm text-red-700">{season.error}</p>}
        {!season.user&&<p className="text-xs text-muted-foreground">Without an account, your saved list stays in this browser. Your selections are private, and no public profile is created.</p>}
      </section>
      {season.user&&<TeamSeason user={season.user} races={races} onAddRace={async(id)=>{if(!season.saved.includes(id))await season.toggle(id);}}/>}
      <section className="space-y-4" aria-label="Saved races"><div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">My races ({season.saved.length})</h2>
        <button className="rounded-md border px-3 py-2 text-sm disabled:opacity-50" disabled={!selected.length} onClick={()=>downloadIcs(selected)}>Export calendar (.ics)</button>
      </div>
      {(loading||!season.ready)&&<p role="status">Loading your racing season…</p>}
      {loadError&&<p role="alert" className="text-red-700">{loadError}</p>}
      {!loading&&season.ready&&selected.length===0&&<div className="rounded-xl border p-8 text-center"><p>No races saved yet.</p>
        <Link to="/" className="mt-3 inline-block rounded-md bg-slate-950 px-5 py-2 font-semibold text-white">Find races to add</Link></div>}
      {season.saved.length>0&&<button type="button" disabled={season.busy} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50" onClick={()=>{if(window.confirm('Remove all races from your racing season? This cannot be undone.'))void season.clearAll();}}>Clear my saved races</button>}
      <div className="grid gap-3 sm:grid-cols-2">{selected.map(r=><article key={r.id} className="rounded-xl border p-4">
        <p className="text-sm font-semibold text-sky-700">{niceDate(r.date)}</p>
        <h3 className="mt-2 font-bold"><Link to="/race/$raceId" params={{raceId:r.id}} className="hover:underline">{r.name}</Link></h3>
        <p className="mt-1 text-sm text-muted-foreground">{r.place} · {r.country}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{r.state==='cancelled'?'Cancelled':r.bucket==='confirmed'?'U19 eligibility confirmed':'Check U19 eligibility'}</span>
          <button disabled={season.busy} className="ml-auto rounded-md border px-3 py-1 text-sm" onClick={()=>void season.toggle(r.id)}>Remove</button>
        </div>
      </article>)}</div>
      {missing.length>0&&!loading&&<p className="text-sm text-amber-800">{missing.length} saved race(s) are not in the current published archive. Your saved IDs are retained.</p>}
      </section>
    </div>
  </main>;
}
