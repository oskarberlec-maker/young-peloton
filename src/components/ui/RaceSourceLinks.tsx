import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

type ExtraSources = Record<string,string[]>;
const indexFor = (id:string) => [...id].reduce((sum,char)=>sum+char.charCodeAt(0),0)%16;
const safeUrl = (value:unknown):value is string =>
  typeof value==='string' && /^https?:\/\//i.test(value) && value.length<4000;

export function RaceSourceLinks({raceId}:{raceId:string}) {
  const [links,setLinks]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const abort=new AbortController();
    setLinks([]);setLoading(true);
    fetch('/data/2026/source-links-'+indexFor(raceId)+'.json',{signal:abort.signal})
      .then(async response => {if(!response.ok)throw new Error('Source index unavailable');return response.json() as Promise<ExtraSources>})
      .then(data=>{if(!abort.signal.aborted)setLinks(Array.isArray(data[raceId])?data[raceId].filter(safeUrl):[]);})
      .catch(()=>{if(!abort.signal.aborted)setLinks([]);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[raceId]);
  const unique=useMemo(()=>[...new Set(links)], [links]);
  if(loading)return <p className="mt-2 text-xs text-muted-foreground">Loading additional source links…</p>;
  if(!unique.length)return <p className="mt-2 text-xs text-muted-foreground">
    No independently linked auxiliary sources for this race. The original race source is listed above.
  </p>;
  return <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
    {unique.slice(0,35).map((url,i)=><a key={url} href={url}
      target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 break-all text-sky-700 underline underline-offset-4 hover:text-sky-900">
      Additional source {i+1}<ArrowUpRight size={13} aria-hidden="true"/>
    </a>)}
    {unique.length>35&&<p className="basis-full text-xs text-muted-foreground">
      {unique.length-35} other archived URLs are recorded but not shown here.
    </p>}
  </div>;
}
