import { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCcw, Trash2 } from 'lucide-react';
import {
  ALERT_EVENT, checkSavedRaceChanges, clearSavedRaceAlerts,
  readLastSavedCheck, readSavedRaceAlerts, setDesktopNotificationsEnabled,
  type SavedRaceAlert,
} from '@/lib/saved-race-alerts';
import { devicePushStatus, enableDevicePush, disableDevicePush } from '@/lib/push-client';

export function SavedRaceAlertsPanel({ savedCount }: { savedCount: number }) {
  const [alerts, setAlerts] = useState<SavedRaceAlert[]>([]);
  const [lastCheck, setLastCheck] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(true);
  const [permission, setPermission] = useState('default');
  const [working, setWorking] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => {
      setAlerts(readSavedRaceAlerts());
      setLastCheck(readLastSavedCheck());
    };
    refresh();
    void devicePushStatus().then(status => {
      setPushAvailable(status.supported);
      setPushSubscribed(status.subscribed);
      setPermission(status.permission);
    }).catch(() => setPushAvailable(false));
    window.addEventListener(ALERT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ALERT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const checkNow = async () => {
    setWorking(true); setMessage('');
    try {
      if (!navigator.onLine) {
        setMessage('You appear to be offline. Changes will be checked when you reconnect.');
        return;
      }
      const found = await checkSavedRaceChanges(true);
      setMessage(found.length ? `${found.length} saved race(s) changed.` : 'No new verified changes were found in your saved races.');
    } catch {
      setMessage('Could not check updates. Try again when you have a connection.');
    } finally { setWorking(false); }
  };

  const toggleNotifications = async () => {
    if (enabling) return;
    setMessage('');
    setEnabling(true);
    try {
      if (pushSubscribed) {
        await disableDevicePush();
        setDesktopNotificationsEnabled(false);
        setPushSubscribed(false);
        setMessage('Push alerts have been turned off on this device.');
      } else {
        await enableDevicePush();
        setDesktopNotificationsEnabled(true);
        setPushSubscribed(true);
        setPermission('granted');
        setMessage('Push alerts enabled! You can receive notifications about saved 2026 races when their 2027 dates are officially confirmed, even if the app is closed.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update notification settings.');
    } finally { setEnabling(false); }
  };

  return <section aria-label="Saved race updates" className="space-y-4 rounded-xl border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Bell size={19}/> Notifications for saved races</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Receive an alert when a race saved from 2026 gets its official date for 2027.
          No account or Supabase required. Other race changes are checked when you open Young Peloton.
        </p>
      </div>
      <button type="button" disabled={working || savedCount===0} onClick={() => void checkNow()}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">
        <RefreshCcw size={15}/> {working ? 'Checking…' : 'Check for changes'}
      </button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <div className="text-sm">
        <p className="font-semibold">2027 date push alerts {pushSubscribed && permission==='granted' ? 'on' : 'off'}</p>
        <p className="mt-1 text-xs text-slate-600">
          {lastCheck ? 'Last local comparison: '+new Date(lastCheck).toLocaleString('en-GB') : 'No local check completed yet.'}
        </p>
      </div>
      <button type="button" disabled={enabling || !pushAvailable} onClick={() => void toggleNotifications()}
        className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm disabled:opacity-50">
        {pushSubscribed ? <BellOff size={15}/> : <Bell size={15}/>}
        {enabling ? 'Updating…' : pushSubscribed ? 'Disable push alerts' : 'Enable push alerts'}
      </button>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">
      Push notifications can arrive when the browser or app is closed on compatible devices. On iPhone,
      add Young Peloton to your Home Screen and open the installed app first. Permission is optional.
      Saved races remain in your browser. To send relevant alerts, the notification service privately stores
      a device push subscription and cryptographic fingerprints of your saved 2026 race IDs.
      Notification timing depends on the daily official-source check and your device settings.
    </p>
    {!pushAvailable && <p className="text-sm text-amber-800">Web Push is unavailable here. On iPhone, install Young Peloton on your Home Screen. You can still check in-app updates without push notifications.</p>}
    {message && <p role="status" className="text-sm text-sky-800">{message}</p>}
    {alerts.length > 0 ? <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">Recent changes ({alerts.length})</h3>
        <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-600 underline"
          onClick={() => clearSavedRaceAlerts()}><Trash2 size={13}/> Clear history</button>
      </div>
      <div className="max-h-[400px] space-y-3 overflow-y-auto">
        {alerts.map(item => <article className="rounded-md border border-sky-200 p-3" key={item.id}>
          <h4 className="font-semibold">{item.raceName}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(item.checkedAt).toLocaleString('en-GB')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{item.changes.map((change,i) => <li key={i}>{change}</li>)}</ul>
        </article>)}
      </div>
    </> : <p className="text-sm text-muted-foreground">No changes to your saved races recorded on this device yet.</p>}
  </section>;
}
