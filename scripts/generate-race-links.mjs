/** Generate compact, ID-keyed auxiliary sources and verified 2026/2027 edition links.
 * The old xl-* identifiers are NOT actual calendar IDs. Never infer an identity
 * from a shared federation/calendar URL or a similar-looking name alone.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
const ROOT = process.cwd();
const archive=path.join(ROOT,'public/data/2026');
const manifest=JSON.parse(await readFile(path.join(archive,'manifest.json'),'utf8'));
const indices=Object.fromEntries(manifest.fields.map((key,i)=>[key,i]));
const rows=(await Promise.all(manifest.parts.map(p=>readFile(path.join(archive,p),'utf8').then(JSON.parse)))).flat();
const races=rows.map(values=>Object.fromEntries(manifest.fields.map((k,j)=>[k,values[j]])));
const byId=new Map(races.map(r=>[r.id,r]));
const canonical=url=>{
  try {const p=new URL(url);if(!['https:','http:'].includes(p.protocol)||p.username||p.password)return null;p.hash='';return p.toString();}
  catch{return null;}
};
const sourceIds=new Map();
const add=(id,urls)=>{
  if(!byId.has(id)||!Array.isArray(urls))return;
  const set=sourceIds.get(id)||new Set();
  for(const u of urls){const value=canonical(u);if(value)set.add(value);}
  sourceIds.set(id,set);
};
const imported=JSON.parse(gunzipSync(await readFile(path.join(ROOT,'scripts/source-sync/data/excel-result-sources-2026.json.gz'))).toString('utf8'));
for(const [id,urls] of Object.entries(imported))add(id,urls);
const legacyText=await readFile(path.join(ROOT,'src/routes/-young-peloton-race-sources.ts'),'utf8');
const anchored=new Map();
for(const race of races){
  if(race.state==='merged'||race.duplicate||!race.sourceUrl)continue;
  const url=canonical(race.sourceUrl);
  if(!url)continue;
  if(!anchored.has(url))anchored.set(url,new Set());
  anchored.get(url).add(race.id);
}
let mapped=0, ambiguous=0, unresolved=0;
const entries=legacyText.matchAll(/["']([^"'\n]{3,180})["']\s*:\s*\{([^{}]{0,12000})\}/g);
for(const [,legacyId,body] of entries){
  if(!body.includes('officialUrl')&&!body.includes('otherUrls'))continue;
  const links=[...body.matchAll(/https?:\/\/[^\s"'<>\\]+/g)].map(v=>v[0]);
  let id=byId.has(legacyId)?legacyId:null;
  if(!id&&legacyId.startsWith('xl-')&&links.length){
    const options=anchored.get(canonical(links[0]))||new Set();
    if(options.size===1)id=[...options][0];
    else if(options.size>1)ambiguous++;
  }
  if(id){add(id,links);mapped++;}else unresolved++;
}
const shards=Array.from({length:16},()=>({}));
const index=id=>[...id].reduce((sum,char)=>sum+char.charCodeAt(0),0)%16;
for(const [id,set] of sourceIds){
  if(set.size)shards[index(id)][id]=[...set].sort();
}
for(let i=0;i<16;i++){
  await writeFile(path.join(archive,'source-links-'+i+'.json'),JSON.stringify(shards[i]));
}
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const keys=new Map();
for(const r of races){
  if(r.state==='merged'||r.duplicate||!['M','U19M'].includes(r.sex))continue;
  const key=normalize(r.name)+'|'+r.countryCode;
  if(!keys.has(key))keys.set(key,[]);
  keys.get(key).push(r);
}
const uciFile=await readFile(path.join(ROOT,'src/lib/uci-2027.ts'),'utf8');
const match=uciFile.match(/export const UCI_2027_RACES[^=]*=\s*(\[[\s\S]*\]);/);
if(!match)throw Error('Unable to parse UCI 2027 races');
const editions=JSON.parse(match[1]);
const links={}, unlinked=[];
for(const r of editions){
  const candidates=keys.get(normalize(r.name)+'|'+r.countryCode)||[];
  if(candidates.length===1)links[r.id]=candidates[0].id;
  else unlinked.push({id:r.id,name:r.name,count:candidates.length});
}
await mkdir(path.join(ROOT,'public/data/2027'),{recursive:true});
await writeFile(path.join(ROOT,'public/data/2027/edition-links.json'),JSON.stringify(links));
await writeFile(path.join(ROOT,'public/data/2026/source-link-status.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),archiveIds:races.length,linkedIds:sourceIds.size,
  importedIds:Object.keys(imported).length,oldIdsMatched:mapped,
  oldIdsAmbiguous:ambiguous,oldIdsUnresolved:unresolved,
  uci2027Count:editions.length,uci2027Matched:Object.keys(links).length,uci2027Unmatched:unlinked.length,
}));
console.log(JSON.stringify({archive:races.length,linked:sourceIds.size,oldMapped:mapped,oldAmbiguous:ambiguous,oldUnresolved:unresolved,uci2027:editions.length,editionLinks:Object.keys(links).length}));
