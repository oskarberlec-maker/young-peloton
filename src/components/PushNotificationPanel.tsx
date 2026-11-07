import { useEffect, useState } from 'react';
import { BellRing, BellOff, ShieldCheck } from 'lucide-react';
import { devicePushStatus, enableDevicePush, disableDevicePush, type PushStatus } from '@/lib/push-client';

const EMPTY: PushStatus = {supported:false,subscribed:false,permission:'unsupported'};

export function PushNotificationPanel({savedCount}:{savedCount:number}) {
  const [status,setStatus]=useState<PushStatus>(EMPTY);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let active=true;
    void devicePushStatus()
      .then(next=>{if(active)setStatus(next);})
      .catch(()=>undefined)
      .finally(()=>{if(active)setChecking(false);});
    return ()=>{active=false;};
  },[]);

  const toggle=async()=>{
    setBusy(true);
    setMessage('');
    try {
      if(status.subscribed){
        await disableDevicePush();
        setMessage('2027 push notifications have been disabled on this device.');
      }else{
        await enableDevicePush();
        setMessage('Enabled! You will receive an alert when a race saved from 2026 gets a verified 2027 date.');
      }
    }catch(error){
      setMessage(error instanceof Error?error.message:'Notifications could not be enabled.');
    }finally{
      setStatus(await devicePushStatus().catch(()=>EMPTY));
      setBusy(false);
    }
  };

  return <section aria-label="2027 push notifications" className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-2xl">
        <h2 className="flex items-center gap-2 text-lg font-bold"><BellRing size={19}/> Get a notification when a 2026 race is confirmed for 2027</h2>
        <p className="mt-2 text-sm text-slate-700">
          Save your favourite races from 2026, then enable notifications.
          When Young Peloton verifies a new 2027 edition with an official date,
          we'll notify this device—even if the app is closed.
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {checking?'Checking notification support…':status.subscribed?'Push notifications enabled':'Push notifications off'}
          {savedCount===0?' · Save a 2026 race to follow it.':''}
        </p>
      </div>
      <button type="button" disabled={busy||checking||!status.supported} onClick={()=>void toggle()}
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {status.subscribed?<BellOff size={17}/>:<BellRing size={17}/>}
        {busy?'Updating…':status.subscribed?'Turn off 2027 alerts':'Enable 2027 alerts'}
      </button>
    </div>
    {!checking&&!status.supported&&<p className="mt-3 text-sm text-amber-800">
      Push isn't supported in this browser or installation. On iPhone, open Young Peloton from the Home Screen
      (iOS 16.4 or later), then tap Enable. On computers and Android, use an up-to-date compatible browser.
      In-app change notices remain available.
    </p>}
    {message&&<p role="status" className="mt-3 text-sm text-sky-900">{message}</p>}
    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
      <ShieldCheck size={15} className="mt-0.5 shrink-0"/>
      No account required. To deliver relevant alerts, the server stores your device's push subscription
      and protected fingerprints of the 2026 race IDs you've saved—not your name or email. You can disable notifications at any time.
      Browser and installed-app saved lists may be separate.
    </p>
  </section>;
}
