import { readLocalSavedIds } from './season-storage';

type PushConfig = { enabled:boolean;publicKey:string|null };
export type PushStatus = {supported:boolean;subscribed:boolean;permission:string;message?:string};

function supported(): boolean {
  return typeof window!=='undefined' && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window &&
    window.isSecureContext;
}
function keyBytes(base64url:string): Uint8Array<ArrayBuffer> {
  const binary=atob(base64url.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(base64url.length/4)*4,'='));
  return Uint8Array.from(binary, c=>c.charCodeAt(0));
}
async function config():Promise<PushConfig> {
  const res=await fetch('/api/push-config',{cache:'no-store'});
  if(!res.ok)throw new Error('Could not check Web Push configuration.');
  const data=await res.json() as PushConfig;
  if(!data.enabled||!data.publicKey)throw new Error('Push delivery is temporarily unavailable.');
  return data;
}
function saved2026():string[] {
  return readLocalSavedIds().filter(id=>
    !id.startsWith('uci-2027-') && !id.startsWith('confirmed-2027-'));
}
export async function devicePushStatus():Promise<PushStatus> {
  if(!supported())return {supported:false,subscribed:false,permission:'unsupported'};
  const permission=Notification.permission;
  try{
    const registration=await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.getSubscription();
    return {supported:true,subscribed:Boolean(subscription),permission};
  }catch{return {supported:true,subscribed:false,permission};}
}
async function sendSubscription(subscription:PushSubscription):Promise<void> {
  const response=await fetch('/api/push-subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({subscription:subscription.toJSON(),saved2026Ids:saved2026()}),
  });
  if(!response.ok)throw new Error('Could not register this device for notifications.');
}
export async function enableDevicePush():Promise<void> {
  if(!supported())throw new Error(
    'Push requires a supported browser and HTTPS. On iPhone, first install Young Peloton to the Home Screen and open it there.');
  // Permission MUST be requested synchronously from the button interaction.
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Please allow Young Peloton notifications in your browser or phone settings.');
  const result=await config();
  const registration=await navigator.serviceWorker.register('/service-worker.js');
  const existing=await registration.pushManager.getSubscription();
  const subscription=existing || await registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:keyBytes(result.publicKey!),
  });
  try{
    await sendSubscription(subscription);
  }catch(error){
    if(!existing)await subscription.unsubscribe().catch(()=>false);
    throw error;
  }
}
export async function disableDevicePush():Promise<void> {
  if(!supported())return;
  const registration=await navigator.serviceWorker.ready;
  const subscription=await registration.pushManager.getSubscription();
  if(!subscription)return;
  try{
    await fetch('/api/push-subscribe',{
      method:'DELETE',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:subscription.toJSON()}),
    });
  }finally{
    // Even if the network is unavailable, revoking the browser endpoint
    // prevents any future pushes to this device.
    await subscription.unsubscribe();
  }
}
let syncing:Promise<void>|null=null;
export function syncDevicePushRaces():Promise<void> {
  if(!supported())return Promise.resolve();
  if(syncing)return syncing;
  syncing=(async()=>{
    const registration=await navigator.serviceWorker.getRegistration('/service-worker.js');
    const subscription=await registration?.pushManager.getSubscription();
    if(subscription)await sendSubscription(subscription);
  })().finally(()=>{syncing=null;});
  return syncing;
}
