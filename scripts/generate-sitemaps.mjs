import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=process.cwd();
const base='https://www.youngpeloton.eu';
const publicDir=join(root,'public');
const encodeXml=(text)=>String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const entry=(url,lastmod)=>'  <url><loc>'+encodeXml(url)+'</loc>'+(lastmod?'<lastmod>'+lastmod+'</lastmod>':'')+'</url>';
const sitemap=urls=>'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.join('\n')+'\n</urlset>\n';

const archiveDir=join(publicDir,'data/2026');
const manifest=JSON.parse(await readFile(join(archiveDir,'manifest.json'),'utf8'));
const ix=Object.fromEntries(manifest.fields.map((key,i)=>[key,i]));
for(const needed of ['id','state','duplicate','bucket'])if(!(needed in ix))throw Error('Missing archive field '+needed);
const ids=new Set();
for(const part of manifest.parts){
  const rows=JSON.parse(await readFile(join(archiveDir,part),'utf8'));
  for(const row of rows){
    if(row[ix.state]==='merged' || row[ix.duplicate] || row[ix.bucket]!=='confirmed')continue;
    const id=row[ix.id];
    if(typeof id!=='string'||!id.trim()||id.length>180)continue;
    ids.add(id);
  }
}
const archiveIds=[...ids].sort();
const filenames=[];
const lastmod=/^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf)?manifest.asOf:'';
for(let i=0;i<archiveIds.length;i+=2000){
  const filename='sitemap-races-2026-'+String(1+i/2000).padStart(2,'0')+'.xml';
  const lines=archiveIds.slice(i,i+2000).map(id=>entry(base+'/race/'+encodeURIComponent(id),lastmod));
  await writeFile(join(publicDir,filename),sitemap(lines));
  filenames.push(filename);
}
const file=await readFile(join(root,'src/lib/uci-2027.ts'),'utf8');
const arrayStart=file.indexOf('[',file.indexOf('export const UCI_2027_RACES'));
const arrayEnd=file.lastIndexOf(']');
if(arrayStart<0||arrayEnd<arrayStart)throw Error('Cannot parse 2027 UCI calendar');
const calendar=JSON.parse(file.slice(arrayStart,arrayEnd+1));
const ids2027=[...new Set(calendar.filter(r=>r.bucket==='confirmed'&&r.state!=='merged'&&!r.duplicate)
  .map(r=>r.id))].sort();
await writeFile(join(publicDir,'sitemap-races-2027.xml'),
  sitemap(ids2027.map(id=>entry(base+'/race/'+encodeURIComponent(id),'2026-10-28'))));
filenames.push('sitemap-races-2027.xml');
await writeFile(join(publicDir,'sitemap-pages.xml'),sitemap([
  entry(base+'/'),entry(base+'/about'),
]));
filenames.unshift('sitemap-pages.xml');
const index='<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  filenames.map(file=>'  <sitemap><loc>'+base+'/'+file+'</loc></sitemap>').join('\n')+
  '\n</sitemapindex>\n';
await writeFile(join(publicDir,'sitemap.xml'),index);
console.log('Generated SEO sitemaps:',archiveIds.length,'verified 2026 records;',ids2027.length,'2027 UCI races;',filenames.length,'sitemap files.');
