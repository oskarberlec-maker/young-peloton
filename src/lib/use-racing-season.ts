import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { seasonDatabase } from './supabase-client';
import { readLocalSavedIds, safeSavedIds, writeLocalSavedIds } from './season-storage';

type SavedRow = { race_id: string; season_year: number };
export function useRacingSeason() {
  const [user,setUser]=useState<User|null>(null);
  const [ready,setReady]=useState(false);
  const [saved,setSaved]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const db=seasonDatabase();
  const activeLoad = useRef(0);
  const refresh=useCallback(async (who:User|null)=>{
    const version=++activeLoad.current;
    if(!db||!who){setSaved(readLocalSavedIds());return;}
    const result=await db.from('racing_season_entries').select('race_id,season_year').eq('user_id',who.id);
    if(version!==activeLoad.current)return; // Prevent a prior account's response from showing after logout/switch.
    if(result.error){setError('Could not load your season. '+result.error.message);return;}
    setSaved(safeSavedIds((result.data as SavedRow[]).map(x=>x.race_id)));
  },[db]);
  useEffect(()=>{
    if(!db){setSaved(readLocalSavedIds());setReady(true);return;}
    let active=true;
    db.auth.getUser().then(({data,error})=>{if(!active)return;
      if(error)setError(error.message);
      setUser(data.user||null);
      refresh(data.user||null).finally(()=>{if(active)setReady(true);});
    }).catch(e=>{if(active){setError(String(e));setReady(true);}});
    const {data:subscription}=db.auth.onAuthStateChange((_event,session)=>{
      if(!active)return;
      setUser(session?.user||null);
      // Avoid using Supabase methods synchronously from inside its auth callback.
      queueMicrotask(()=>{if(active)void refresh(session?.user||null);});
    });
    return ()=>{active=false;activeLoad.current++;subscription.subscription.unsubscribe();};
  },[db,refresh]);
  const signInWithGoogleIdToken=async(token:string, nonce:string)=>{
    if(!db)throw new Error('Cloud accounts have not been configured yet.');
    setBusy(true);setError('');
    try {
      const {error}=await db.auth.signInWithIdToken({provider:'google',token,nonce});
      if(error)throw error;
    }catch(e){setError(e instanceof Error?e.message:String(e));throw e;}
    finally{setBusy(false);}
  };
  const signInWithGoogle=async()=>{
    if(!db)throw new Error('Cloud accounts have not been configured yet.');
    setBusy(true);setError('');
    try {
      const {error}=await db.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:window.location.origin+'/season'},
      });
      if(error)throw error;
    }catch(e){setError(e instanceof Error?e.message:String(e));throw e;}
    finally{setBusy(false);}
  };
  const signIn=async(email:string)=>{
    if(!db)throw new Error('Cloud accounts have not been configured yet.');
    setBusy(true);setError('');
    try {const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+'/season'}});
      if(error)throw error;
    } catch(e){setError(String(e));throw e;} finally{setBusy(false);}
  };
  const signOut=async()=>{if(!db)return;setBusy(true);try{
    const {error}=await db.auth.signOut();if(error)throw error;
    activeLoad.current++;setUser(null);setSaved(readLocalSavedIds());
  }catch(e){setError(String(e));}finally{setBusy(false);}};
  const toggle=async(id:string,year=2026)=>{
    if(busy)return;
    const wasSaved=saved.includes(id);
    const next=wasSaved?saved.filter(x=>x!==id):safeSavedIds([...saved,id]);
    if(!user||!db){writeLocalSavedIds(next);setSaved(next);return;}
    setBusy(true);setError('');
    const result=wasSaved
      ? await db.from('racing_season_entries').delete().eq('user_id',user.id).eq('race_id',id)
      : await db.from('racing_season_entries').insert({user_id:user.id,race_id:id,season_year:year});
    if(result.error)setError('Could not save the change: '+result.error.message);
    else setSaved(next);
    setBusy(false);
  };
  const importLocal=async()=>{
    if(!user||!db)return;
    const ids=readLocalSavedIds().filter(id=>!saved.includes(id));
    if(!ids.length)return;
    setBusy(true);setError('');
    const rows=ids.map(id=>({user_id:user.id,race_id:id,season_year:2026}));
    const {error}=await db.from('racing_season_entries').upsert(rows,{onConflict:'user_id,race_id',ignoreDuplicates:true});
    if(error)setError('Could not import your saved races: '+error.message);
    else {await refresh(user);writeLocalSavedIds([]);}
    setBusy(false);
  };
  const clearAll=async()=>{
    if(busy)return;
    if(!user||!db){writeLocalSavedIds([]);setSaved([]);return;}
    setBusy(true);setError('');
    const {error}=await db.from('racing_season_entries').delete().eq('user_id',user.id);
    if(error)setError('Could not clear your racing season: '+error.message);
    else setSaved([]);
    setBusy(false);
  };
  return {user,ready,saved,busy,error,signIn,signInWithGoogle,signInWithGoogleIdToken,signOut,toggle,importLocal,clearAll,localCount:readLocalSavedIds().length};
}
