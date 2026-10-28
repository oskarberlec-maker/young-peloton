import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { seasonDatabase } from '@/lib/supabase-client';
import { niceDate, type U19Race } from '@/lib/u19-data';

type Profile={user_id:string;role:'coach'|'rider';display_name:string};
type LinkRow={coach_id:string;rider_id:string};
type Pick={user_id:string;race_id:string};
type Suggestion={coach_id:string;rider_id:string;race_id:string};
type Invite={id:string;expires_at:string};

export function TeamSeason({user,races,onAddRace}:{user:User;races:U19Race[];onAddRace:(id:string)=>Promise<void>}) {
  const db=seasonDatabase();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [name,setName]=useState('');
  const [role,setRole]=useState<'coach'|'rider'>('rider');
  const [members,setMembers]=useState<LinkRow[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [picks,setPicks]=useState<Pick[]>([]);
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [invite,setInvite]=useState<Invite|null>(null);
  const [invitePreview,setInvitePreview]=useState<string>('');
  const [inviteId,setInviteId]=useState<string>('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState('');
  const [selectedRider,setSelectedRider]=useState('');

  const refresh=useCallback(async()=>{
    if(!db)return;
    const result=await db.from('peloton_profiles').select('user_id,role,display_name').eq('user_id',user.id).maybeSingle();
    if(result.error){setError(result.error.message);return;}
    const me=result.data as Profile|null;setProfile(me);
    if(!me)return;
    const links=await db.from('coach_rider_links').select('coach_id,rider_id');
    if(links.error){setError(links.error.message);return;}
    const linked=(links.data??[]) as LinkRow[];setMembers(linked);
    const ids=linked.map(l=>me.role==='coach'?l.rider_id:l.coach_id);
    if(ids.length){
      const people=await db.from('peloton_profiles').select('user_id,role,display_name').in('user_id',ids);
      if(people.error)setError(people.error.message);else setProfiles((people.data??[]) as Profile[]);
    }else setProfiles([]);
    const suggested=await db.from('coach_race_suggestions').select('coach_id,rider_id,race_id');
    if(suggested.error)setError(suggested.error.message);else setSuggestions((suggested.data??[]) as Suggestion[]);
    if(me.role==='coach'&&ids.length){
      const saved=await db.from('racing_season_entries').select('user_id,race_id').in('user_id',ids);
      if(saved.error)setError(saved.error.message);else setPicks((saved.data??[]) as Pick[]);
      const codes=await db.from('coach_invites').select('id,expires_at').eq('coach_id',user.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1);
      if(!codes.error)setInvite((codes.data?.[0] as Invite)??null);
    }else if(me.role==='coach'){
      setPicks([]);
      const codes=await db.from('coach_invites').select('id,expires_at').eq('coach_id',user.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1);
      if(!codes.error)setInvite((codes.data?.[0] as Invite)??null);
    }
  },[db,user.id]);

  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('coachInvite');
    if(id&&/^[0-9a-f-]{36}$/i.test(id))setInviteId(id);
  },[]);
  useEffect(()=>{
    if(!db||!profile||!inviteId||profile.role!=='rider')return;
    let active=true;
    void db.rpc('preview_coach_invite',{p_invite_id:inviteId}).then(({data,error})=>{
      if(!active)return;
      if(error)setError(error.message);
      else setInvitePreview(data?.[0]?.coach_name||'');
    });
    return()=>{active=false;};
  },[db,profile,inviteId]);

  const act=async(operation:()=>Promise<void>)=>{
    setBusy(true);setError('');setNotice('');
    try{await operation();await refresh();}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const check=(e:{error:{message:string}|null})=>{if(e.error)throw Error(e.error.message);};
  const byId=(id:string)=>races.find(r=>r.id===id);
  const raceLabel=(id:string)=>byId(id)?.name||id;
  if(!db)return null;

  if(!profile)return <section className="rounded-xl border p-5 space-y-4">
    <h2 className="text-xl font-bold">Your Young Peloton profile</h2>
    <p className="text-sm text-muted-foreground">Choose your role to get started. Coaches can invite riders; riders keep control of their own race lists. Your role cannot be changed here.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {(['rider','coach'] as const).map(x=><button key={x} type="button" onClick={()=>setRole(x)} aria-pressed={role===x} className={`rounded-lg border p-4 text-left ${role===x?'border-sky-700 bg-sky-50 text-slate-900':'bg-background'}`}><strong>{x==='coach'?'Coach':'Rider'}</strong><p className="mt-1 text-sm">{x==='coach'?'Invite riders, view their chosen races and suggest events.':'Save your own races and choose whether to share them with a coach.'}</p></button>)}
    </div>
    <form onSubmit={e=>{e.preventDefault();void act(async()=>{const value=name.trim();if(value.length<2||value.length>60)throw Error('Enter a name between 2 and 60 characters.');check(await db.from('peloton_profiles').insert({user_id:user.id,role,display_name:value}));});}} className="flex flex-wrap gap-2">
      <input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Name shown to your connected team" aria-label="Profile name" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"/>
      <button disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50">Create profile</button>
    </form>
    {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
  </section>;

  const inviteUrl=invite?typeof window!=='undefined'?window.location.origin+'/season?coachInvite='+encodeURIComponent(invite.id):'':'';
  const athleteIds=members.map(x=>profile.role==='coach'?x.rider_id:x.coach_id);
  const chosen=selectedRider&&athleteIds.includes(selectedRider)?selectedRider:athleteIds[0];
  const relevant=races.filter(r=>r.name.toLowerCase().includes(search.toLowerCase())||r.country.toLowerCase().includes(search.toLowerCase())).slice(0,30);
  return <section className="space-y-4 rounded-xl border p-5" aria-label="Coaching team">
    <div><h2 className="text-xl font-bold">{profile.role==='coach'?'Coach dashboard':'My coaching team'}</h2><p className="text-sm text-muted-foreground">{profile.display_name} · {profile.role==='coach'?'Coach':'Rider'}</p></div>
    {profile.role==='coach'&&<>
      <p className="text-sm text-muted-foreground">Share this invitation with your riders. They must sign in, choose Rider and explicitly approve access to their selected races. Anyone holding the invite link can request to join; share it privately.</p>
      <button type="button" disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>void act(async()=>{const x=await db.from('coach_invites').insert({coach_id:user.id}).select('id,expires_at').single();check(x);setInvite(x.data as Invite);})}>Create new invite link</button>
      {inviteUrl&&<div className="space-y-2"><p className="break-all rounded-md bg-muted p-2 text-sm">{inviteUrl}</p><div className="flex gap-2"><button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={()=>void navigator.clipboard.writeText(inviteUrl)}>Copy invitation</button><button type="button" disabled={busy} className="rounded-md border px-3 py-2 text-sm" onClick={()=>void act(async()=>{check(await db.from('coach_invites').delete().eq('id',invite!.id));setInvite(null);})}>Revoke link</button></div><p className="text-xs text-muted-foreground">Expires {new Date(invite!.expires_at).toLocaleDateString('en-GB')}.</p></div>}
    </>}
    {profile.role==='rider'&&inviteId&&<div className="rounded-lg border border-sky-200 p-4 space-y-2">
      <h3 className="font-semibold">Coach invitation</h3>
      {invitePreview?<><p className="text-sm"><strong>{invitePreview}</strong> wants to link with you. If you accept, this coach can view your saved races and suggest new ones. They cannot change your personal selections. You may disconnect later.</p>
        <button type="button" disabled={busy} className="rounded-md bg-slate-950 px-3 py-2 text-white" onClick={()=>void act(async()=>{const x=await db.rpc('accept_coach_invite',{p_invite_id:inviteId});check(x);setInviteId('');setInvitePreview('');window.history.replaceState(null,'',window.location.pathname);setNotice('Coach connected.');})}>Accept invitation</button>
        <button type="button" className="ml-2 rounded-md border px-3 py-2" onClick={()=>{setInviteId('');setInvitePreview('');window.history.replaceState(null,'',window.location.pathname);}}>Decline</button>
      </>:<p className="text-sm">Checking invitation…</p>}
    </div>}
    <div><h3 className="font-semibold">{profile.role==='coach'?'My riders':'Connected coaches'} ({athleteIds.length})</h3>
      {athleteIds.length===0&&<p className="text-sm text-muted-foreground">No connections yet.</p>}
      <div className="mt-2 space-y-2">{members.map(l=>{
        const partner=profile.role==='coach'?l.rider_id:l.coach_id;
        const person=profiles.find(p=>p.user_id===partner);
        return <div key={partner} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
          <button type="button" onClick={()=>setSelectedRider(partner)} className="text-left text-sm font-medium hover:underline">{person?.display_name||'Connected member'}</button>
          <button type="button" disabled={busy} className="rounded-md border px-2 py-1 text-xs" onClick={()=>void act(async()=>{check(await db.from('coach_rider_links').delete().eq('coach_id',l.coach_id).eq('rider_id',l.rider_id));})}>Disconnect</button>
        </div>;
      })}</div>
    </div>
    {profile.role==='coach'&&chosen&&<div className="space-y-3 border-t pt-4">
      <h3 className="text-lg font-semibold">Racing season: {profiles.find(p=>p.user_id===chosen)?.display_name||'Rider'}</h3>
      <p className="text-xs text-muted-foreground">Rider picks and coach suggestions are different lists. You can add or remove your suggestions; only the rider can change their picks.</p>
      <h4 className="font-medium">Rider's selected races ({picks.filter(p=>p.user_id===chosen).length})</h4>
      {picks.filter(p=>p.user_id===chosen).length===0&&<p className="text-sm text-muted-foreground">No races selected by this rider yet.</p>}
      {picks.filter(p=>p.user_id===chosen).map(p=><p key={p.race_id} className="rounded-md bg-muted px-3 py-2 text-sm">{raceLabel(p.race_id)}</p>)}
      <h4 className="font-medium">Your suggested races ({suggestions.filter(s=>s.rider_id===chosen).length})</h4>
      {suggestions.filter(s=>s.rider_id===chosen).map(s=><div key={s.race_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"><span>{raceLabel(s.race_id)}</span><button type="button" disabled={busy} className="text-red-700 underline" onClick={()=>void act(async()=>{check(await db.from('coach_race_suggestions').delete().eq('coach_id',user.id).eq('rider_id',chosen).eq('race_id',s.race_id));})}>Remove</button></div>)}
      <label className="block text-sm font-medium" htmlFor="coach-race-search">Find a race to suggest</label>
      <input id="coach-race-search" className="w-full rounded-md border p-2" placeholder="Race name or country" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="max-h-80 space-y-2 overflow-y-auto">{relevant.map(r=><div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"><span>{niceDate(r.date)} · {r.name}</span><button type="button" disabled={busy||suggestions.some(s=>s.rider_id===chosen&&s.race_id===r.id)} className="shrink-0 rounded-md bg-slate-950 px-2 py-1 text-white disabled:opacity-50" onClick={()=>void act(async()=>{check(await db.from('coach_race_suggestions').insert({coach_id:user.id,rider_id:chosen,race_id:r.id}));})}>Suggest</button></div>)}</div>
    </div>}
    {profile.role==='rider'&&<div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Suggested by your coach</h3><p className="text-xs text-muted-foreground">A suggestion does not automatically add a race to your personal season.</p>
      {suggestions.length===0&&<p className="text-sm text-muted-foreground">No suggestions yet.</p>}
      {suggestions.map(s=><div key={s.coach_id+'-'+s.race_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><span>{raceLabel(s.race_id)} <span className="text-muted-foreground">· {profiles.find(p=>p.user_id===s.coach_id)?.display_name||'Coach'}</span></span><button type="button" disabled={busy} className="rounded-md bg-slate-950 px-3 py-2 text-white" onClick={()=>void act(async()=>{await onAddRace(s.race_id);setNotice('Race added to your personal season.');})}>Add to my season</button></div>)}
    </div>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <button type="button" disabled={busy} className="text-sm underline" onClick={()=>void act(async()=>{await refresh();})}>Refresh team</button>
  </section>;
}
