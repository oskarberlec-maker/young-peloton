import { englishPlace } from '@/lib/u19-english';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { U19Race } from '@/lib/u19-data';
import { niceDate, safeUrl, countryLabel } from '@/lib/u19-data';
import { Link } from '@tanstack/react-router';
import { sourceLabel } from '@/lib/source-label';
import { mappedRaceLocation } from '@/lib/country-centres';
import { englishCategory, englishConfirmation, englishRaceType } from '@/lib/u19-english';

// Use the archived, locally served Leaflet dependencies; no extra npm package is required.
const LEAFLET_ROOT = '/vendor/leaflet/';
let loadPromise: Promise<void> | undefined;
function loadLeaflet() {
  if (loadPromise) return loadPromise;
  const stylesheet = (href: string) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
      document.head.appendChild(link);
    }
  };
  const clusterStyleId = 'young-peloton-cluster-style';
  if (!document.getElementById(clusterStyleId)) {
    const style = document.createElement('style');
    style.id = clusterStyleId;
    style.textContent = `.marker-cluster { background:rgba(14,116,144,.26); border-radius:50%; } .marker-cluster div { display:flex; align-items:center; justify-content:center; width:30px; height:30px; margin:5px; border-radius:50%; background:#0e7490; color:white; font-weight:700; font-size:12px; } .marker-cluster-medium div {background:#0369a1} .marker-cluster-large div {background:#164e63}`;
    document.head.appendChild(style);
  }
  const script = (src: string) => new Promise<void>((resolve,reject) => {
    if ((src.endsWith('/leaflet.js') && (window as any).L) || (src.endsWith('/leaflet.markercluster.js') && (window as any).L?.markerClusterGroup)) return resolve();
    const s = document.createElement('script'); s.src=src; s.async=true;
    s.onload=()=>resolve();s.onerror=()=>reject(new Error(`Map script failed: ${src}`));document.head.appendChild(s);
  });
  stylesheet(LEAFLET_ROOT + 'leaflet.css');
  stylesheet(LEAFLET_ROOT + 'MarkerCluster.css');
  loadPromise=script(LEAFLET_ROOT+'leaflet.js').then(()=>script(LEAFLET_ROOT+'leaflet.markercluster.js')).catch(e=>{loadPromise=undefined;throw e;});
  return loadPromise;
}

type Point = { lat:number; lon:number; precision:string; place:string; races:U19Race[] };
export function U19Map({races,returnTo='/',focusRaceId}:{races:U19Race[];returnTo?:string;focusRaceId?:string}) {
  const holder=useRef<HTMLDivElement>(null);
  const mapRef=useRef<any>(null);
  const layerRef=useRef<any>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [selected,setSelected]=useState<Point|null>(null);
  const [selectedLimit,setSelectedLimit]=useState(40);
  const locations=useMemo(()=>{
    const grouped = new Map<string,Point>();
    for(const r of races) {
      const location=mappedRaceLocation(r);
      if (!location) continue;
      const key=`${location.lat.toFixed(5)}:${location.lon.toFixed(5)}`;
      let point=grouped.get(key);
      if(!point){point={lat:location.lat,lon:location.lon,precision:location.precision,place:location.estimated?countryLabel(r.countryCode,r.country):(r.place&&englishPlace(r.place)!=='Venue not specified'?englishPlace(r.place):countryLabel(r.countryCode,r.country)),races:[]};grouped.set(key,point);}
      point.races.push(r);
    }
    return [...grouped.values()];
  },[races]);
  useEffect(()=>{
    let active=true;
    loadLeaflet().then(()=>{
      if(!active||!holder.current)return;
      const L=(window as any).L;
      if(!L)return;
      const map=L.map(holder.current,{zoomControl:true,worldCopyJump:false}).setView([49.5,13],4);
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        maxZoom:18
      }).addTo(map);
      layerRef.current=L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:55,showCoverageOnHover:false});
      map.addLayer(layerRef.current);
      setError('');setReady(true);
    }).catch(e=>{if(active)setError(String(e?.message||e));});
    return ()=>{active=false;if(mapRef.current){mapRef.current.remove();mapRef.current=null;layerRef.current=null;}};
  },[]);
  useEffect(()=>{
    const L=(window as any).L,layer=layerRef.current;
    if(!L||!layer)return;
    layer.clearLayers();
    const markers=locations.map(point=>{
      const count=point.races.length;
      const size=count>100?24:count>10?20:16;
      const fill=point.precision==='country'?'#efbd79':'#39b6c8';
      const outline=point.precision==='country'?'#b87933':'#125f78';
      const icon=L.divIcon({className:'',iconSize:[size,size],iconAnchor:[size/2,size/2],
        html:`<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2px solid ${outline};box-shadow:0 1px 5px #0005"></span>`});
      const marker=L.marker([point.lat,point.lon],{icon});
      marker.on('click',()=>{setSelected(point);setSelectedLimit(40);requestAnimationFrame(()=>document.getElementById('selected-map-location')?.scrollIntoView({behavior:'smooth',block:'nearest'}));});
      return marker;
    });
    layer.addLayers(markers);
    const focused=focusRaceId?locations.find(point=>point.races.some(r=>r.id===focusRaceId)):undefined;
    setSelected(focused||null);setSelectedLimit(40);
    if(focused)mapRef.current?.setView([focused.lat,focused.lon],focused.precision==='country'?6:11);
    else mapRef.current?.setView([49.5,13],4);
  },[locations,ready,focusRaceId]);
  const listed=selected?.races.slice(0,selectedLimit)||[];
  const locatedCount=useMemo(()=>races.filter(r=>mappedRaceLocation(r)!==null).length,[races]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{locations.length.toLocaleString('en')} mapped places · {locatedCount.toLocaleString('en')} race records with approximate map markers</span><span>Dots show approximate locations, not verified start lines. Amber = country-level only.</span></div>
    {error&&<p role="alert" className="text-red-600">Map unavailable: {error}</p>}
    <div ref={holder} className="h-[440px] md:h-[580px] w-full rounded-xl border border-border bg-muted" aria-label="Map of European U19 race locations" />
    <p className="text-xs text-muted-foreground">Geocoding supplied in the source archive (GeoNames / Natural Earth). Map tiles © OpenStreetMap contributors. Zoom in or select a marker to inspect races at that location.</p>
    {races.some(r=>r.date.startsWith('2027-'))&&<p className="text-xs text-muted-foreground">Markers use archived approximate locations when available; otherwise 2027 races are placed near the country centre and shown in amber. Neither is a confirmed 2027 starting point.</p>}
    {selected&&<section id="selected-map-location" className="rounded-xl border border-border p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{selected.place} — {selected.races.length} race records</h3><button className="text-sm underline" onClick={()=>setSelected(null)}>Close</button></div>
      {selected.precision==='country'&&<p className="text-amber-700 text-sm">Only a country-level location is known for these records.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {listed.map(r=><div key={r.id} className="rounded-md border border-border px-3 py-2 text-sm">
          <Link to="/race/$raceId" params={{raceId:r.id}} search={{returnTo}} className="font-semibold text-sky-800 underline">{r.name}</Link><div className="text-muted-foreground">{niceDate(r.date)} · {englishCategory(r.sex)}{r.type?` · ${englishRaceType(r.type)}`:''}</div>
          <div className="text-xs text-muted-foreground">{englishConfirmation(r.confirmation)}</div>
          {r.state==='cancelled'&&<p className="text-xs font-semibold text-red-700">Cancelled</p>}
          <Link to="/race/$raceId" params={{raceId:r.id}} search={{returnTo}} className="mr-4 inline-block py-2 text-sky-800 underline">View race details →</Link>
          {safeUrl(r.sourceUrl)&&<a className="text-sky-700 underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(r.sourceUrl)} ↗</a>}
        </div>)}
      </div>
      {selected.races.length>listed.length&&<button type="button" onClick={()=>setSelectedLimit(n=>n+40)} className="mt-3 rounded-md border px-3 py-2 text-sm">Show more races ({selected.races.length-listed.length} remaining)</button>}
    </section>}
  </div>;
}
