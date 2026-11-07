import { del, get, list, put } from '@vercel/blob';
import { buildPushPayload, type PushSubscription as WebPushSubscription } from '@block65/webcrypto-web-push';

export type StoredSubscription = {
  subscription: WebPushSubscription;
  createdAt: string;
  updatedAt: string;
  sent: string[];
  saved2026Hashes: string[];
};

const PREFIX = 'push/v1/subscriptions/';
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;
export const pushConfigured = () => Boolean(blobToken() && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
const bodyHeaders = { 'Content-Type':'application/json', 'Cache-Control':'no-store' };

export function validSaved2026(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > 500 || input.some(id =>
    typeof id !== 'string' || id.length < 2 || id.length > 160 ||
    /[<>\\/\u0000-\u001f]/.test(id) || id.startsWith('uci-2027-') ||
    id.startsWith('confirmed-2027-'))) return null;
  return [...new Set(input as string[])];
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:bodyHeaders});
}
export function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
}

const pushHosts = (hostname: string) =>
  hostname === 'fcm.googleapis.com' ||
  hostname === 'updates.push.services.mozilla.com' ||
  hostname === 'web.push.apple.com' ||
  hostname.endsWith('.push.apple.com') ||
  hostname.endsWith('.notify.windows.com') ||
  hostname === 'notify.windows.com';

export function validateSubscription(input: unknown): WebPushSubscription | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string,unknown>;
  if (typeof s.endpoint !== 'string' || s.endpoint.length > 2500) return null;
  let url: URL;
  try { url = new URL(s.endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || !pushHosts(url.hostname) || url.username || url.password || url.port) return null;
  const keys = s.keys;
  if (!keys || typeof keys !== 'object') return null;
  const k = keys as Record<string, unknown>;
  if (typeof k.p256dh !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/.test(k.p256dh) ||
      typeof k.auth !== 'string' || !/^[A-Za-z0-9_-]{16,44}$/.test(k.auth)) return null;
  return {endpoint:url.toString(),expirationTime:null,keys:{p256dh:k.p256dh,auth:k.auth}};
}
async function keyPath(endpoint: string) {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return PREFIX + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('') + '.json';
}
async function readAt(path: string): Promise<StoredSubscription | null> {
  const result = await get(path, {access:'private',token:blobToken(),useCache:false});
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  try {
    const obj = await new Response(result.stream).json() as StoredSubscription;
    if (!validateSubscription(obj.subscription) || !Array.isArray(obj.sent) || typeof obj.createdAt !== 'string' ||
        !Array.isArray(obj.saved2026Hashes) || obj.saved2026Hashes.some(x => typeof x!=='string' || !/^[0-9a-f]{64}$/.test(x))) return null;
    return obj;
  } catch { return null; }
}
async function writeAt(path: string, entry: StoredSubscription) {
  await put(path, JSON.stringify(entry), {
    access:'private', allowOverwrite:true, addRandomSuffix:false,
    contentType:'application/json', token:blobToken(),
    cacheControlMaxAge:60,
  });
}
async function hash2026Id(id: string): Promise<string> {
  const secret=process.env.VAPID_PRIVATE_KEY;
  if (!secret) throw new Error('Push secret is not configured');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id));
  return Array.from(new Uint8Array(signed),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function saveSubscription(subscription: WebPushSubscription, saved2026Ids: string[]) {
  const path = await keyPath(subscription.endpoint);
  const old = await readAt(path);
  const now = new Date().toISOString();
  await writeAt(path, {
    subscription,
    createdAt:old?.createdAt||now,updatedAt:now,
    sent:old?.sent||[],
    saved2026Hashes:await Promise.all(saved2026Ids.map(hash2026Id)),
  });
}
export async function removeSubscription(endpoint: string) {
  await del(await keyPath(endpoint), {token:blobToken()});
}
export async function listSubscriptions(): Promise<{path:string;entry:StoredSubscription}[]> {
  const results: {path:string;entry:StoredSubscription}[] = [];
  let cursor: string | undefined;
  for(let page=0;page<2;page++) {
    const data = await list({prefix:PREFIX,limit:1000,cursor,token:blobToken()});
    for(const blob of data.blobs) {
      const entry=await readAt(blob.pathname);
      if(entry)results.push({path:blob.pathname,entry});
    }
    if(!data.hasMore || !data.cursor)break;
    cursor=data.cursor;
  }
  return results;
}
export async function saveUpdatedSubscription(path: string, entry: StoredSubscription) {
  await writeAt(path, entry);
}

export type PublishedConfirmation = {
  id:string; source2026Id:string; name:string; date:string; enddate:string;
  at:string;
};
export function extractNew2027Confirmations(history: unknown, published: unknown): PublishedConfirmation[] {
  if (!history || typeof history !== 'object' || !published || typeof published !== 'object') return [];
  const h = history as {changes?:unknown};
  const p = published as {confirmed2027?: Record<string,Record<string,unknown>>};
  if (!Array.isArray(h.changes) || !p.confirmed2027 || typeof p.confirmed2027 !== 'object') return [];
  const found=new Map<string,PublishedConfirmation>();
  for(const item of h.changes) {
    if (!item || typeof item !== 'object')continue;
    const r=item as Record<string,unknown>;
    const after=r.after as Record<string,unknown>|null;
    if (r.before !== null || !after || typeof after !== 'object')continue;
    const id=r.raceId;
    if (typeof id !== 'string' || typeof r.at !== 'string' || !Number.isFinite(Date.parse(r.at)))continue;
    const current=p.confirmed2027[id];
    if (!current || typeof current.source2026Id !== 'string' || !current.source2026Id)continue;
    const date=current.date,enddate=current.enddate,name=current.name;
    if (typeof date!=='string'||!/^2027-\d\d-\d\d$/.test(date)||
      typeof enddate!=='string'||!/^2027-\d\d-\d\d$/.test(enddate)||
      typeof name!=='string'|| !name || !/^https:\/\//.test(String(current.sourceUrl||'')))continue;
    found.set(id,{id,source2026Id:current.source2026Id,name:name.slice(0,160),
      date,enddate,at:r.at});
  }
  return [...found.values()].sort((a,b)=>a.at.localeCompare(b.at));
}
export async function pendingForSubscription(entry: StoredSubscription, events: PublishedConfirmation[]) {
  const sent=new Set(entry.sent);
  const since=Date.parse(entry.createdAt);
  const watched=new Set(entry.saved2026Hashes || []);
  const result: PublishedConfirmation[]=[];
  for(const event of events) {
    if (Date.parse(event.at)<=since || sent.has(event.id)) continue;
    if (watched.has(await hash2026Id(event.source2026Id))) result.push(event);
  }
  return result;
}
export async function deliverOne(subscription: WebPushSubscription, event: PublishedConfirmation) {
  const vapid={
    subject: process.env.VAPID_SUBJECT || 'https://young-peloton.vercel.app',
    publicKey:process.env.VAPID_PUBLIC_KEY || '',
    privateKey:process.env.VAPID_PRIVATE_KEY || '',
  };
  const url='/race/'+encodeURIComponent(event.id);
  const payload=await buildPushPayload({
    data:JSON.stringify({
      type:'confirmed-2027',title:'Young Peloton: 2027 date confirmed',
      body:event.name+' — '+event.date+(event.enddate!==event.date?' to '+event.enddate:''),
      raceId:event.id,source2026Id:event.source2026Id,url,
    }),
    options:{ttl:86400},
  },subscription,vapid);
  return fetch(subscription.endpoint,payload);
}
