import { useEffect, useMemo, useRef, useState } from 'react';
import type { U19Race } from '@/lib/u19-data';
import { niceDate, safeUrl } from '@/lib/u19-data';
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
export function U19Map({races}:{races:U19Race[]}) {
  const holder=useRef<HTMLDivElement>(null);
  const mapRef=useRef<any>(null);
  const layerRef=useRef<any>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [selected,setSelected]=useState<Point|null>(null);
  const locations=useMemo(()=>{
    const grouped = new Map<string,Point>();
    for(const r of races) {
      if (r.lat==null || r.lon==null || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
      const key=`${r.lat.toFixed(5)}:${r.lon.toFixed(5)}`;
      let point=grouped.get(key);
      if(!point){point={lat:r.lat,lon:r.lon,precision:r.precision,place:r.place||r.country,races:[]};grouped.set(key,point);}
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
      marker.on('click',()=>setSelected(point));
      return marker;
    });
    layer.addLayers(markers);
  },[locations,ready]);
  const listed=selected?.races.slice(0,40)||[];
  const locatedCount=useMemo(()=>races.filter(r=>r.lat!==null&&r.lon!==null).length,[races]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{locations.length.toLocaleString('en')} mapped places · {locatedCount.toLocaleString('en')} race records with map locations</span><span>Dots show approximate locations, not verified start lines. Amber = country-level only.</span></div>
    {error&&<p role="alert" className="text-red-600">Map unavailable: {error}</p>}
    <div ref={holder} className="h-[440px] md:h-[580px] w-full rounded-xl border border-border bg-muted" aria-label="Map of European U19 race locations" />
    <p className="text-xs text-muted-foreground">Geocoding supplied in the source archive (GeoNames / Natural Earth). Map tiles © OpenStreetMap contributors. Zoom in or select a marker to inspect races at that location.</p>
    {selected&&<section className="rounded-xl border border-border p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{selected.place} — {selected.races.length} race records</h3><button className="text-sm underline" onClick={()=>setSelected(null)}>Close</button></div>
      {selected.precision==='country'&&<p className="text-amber-700 text-sm">Only a country-level location is known for these records.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {listed.map(r=><div key={r.id} className="rounded-md border border-border px-3 py-2 text-sm">
          <div className="font-semibold">{r.name}</div><div className="text-muted-foreground">{niceDate(r.date)} · {englishCategory(r.sex)}{r.type?` · ${englishRaceType(r.type)}`:''}</div>
          <div className="text-xs text-muted-foreground">{englishConfirmation(r.confirmation)}</div>
          {safeUrl(r.sourceUrl)&&<a className="text-sky-700 underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a>}
        </div>)}
      </div>
      {selected.races.length>listed.length&&<p className="mt-2 text-xs text-muted-foreground">Showing first {listed.length} records at this location. Filter the calendar for more.</p>}
    </section>}
  </div>;
}