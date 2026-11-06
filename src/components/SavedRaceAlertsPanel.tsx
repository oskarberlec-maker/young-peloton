import { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCcw, Trash2 } from 'lucide-react';
import {
  ALERT_EVENT, checkSavedRaceChanges, clearSavedRaceAlerts, desktopNotificationsEnabled,
  readLastSavedCheck, readSavedRaceAlerts, setDesktopNotificationsEnabled,
  type SavedRaceAlert,
} from '@/lib/saved-race-alerts';

export function SavedRaceAlertsPanel({ savedCount }: { savedCount: number }) {
  const [alerts, setAlerts] = useState<SavedRaceAlert[]>([]);
  const [lastCheck, setLastCheck] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState('unsupported');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => {
      setAlerts(readSavedRaceAlerts());
      setLastCheck(readLastSavedCheck());
      setEnabled(desktopNotificationsEnabled());
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
    };
    refresh();
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
    setMessage('');
    if (enabled) {
      setDesktopNotificationsEnabled(false); setEnabled(false);
      setMessage('System notifications turned off for Young Peloton.');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setMessage('System notifications are not available here. In-app updates still work.');
      return;
    }
    try {
      // Must be called directly after the user's button click, before other async work.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setMessage('Notification permission was not granted. You can still view changes here.');
        return;
      }
      setDesktopNotificationsEnabled(true);
      setEnabled(true);
      setMessage('Notifications enabled while Young Peloton is running. Alerts when the app is fully closed require a future push service.');
    } catch {
      setMessage('Notification permission is unavailable. On iPhone, install the app to your Home Screen first.');
    }
  };

  return <section aria-label="Saved race updates" className="space-y-4 rounded-xl border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Bell size={19}/> Updates to saved races</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          We compare your saved races with Young Peloton's published data when you open or return to the app.
          Your saved list stays on this device, with no account or Supabase.
        </p>
      </div>
      <button type="button" disabled={working || savedCount===0} onClick={() => void checkNow()}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">
        <RefreshCcw size={15}/> {working ? 'Checking…' : 'Check for changes'}
      </button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <div className="text-sm">
        <p className="font-semibold">System notifications {enabled && permission==='granted' ? 'on' : 'off'}</p>
        <p className="mt-1 text-xs text-slate-600">
          {lastCheck ? 'Last comparison: '+new Date(lastCheck).toLocaleString('en-GB') : 'No check completed yet.'}
        </p>
      </div>
      <button type="button" onClick={() => void toggleNotifications()} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
        {enabled ? <BellOff size={15}/> : <Bell size={15}/>} {enabled ? 'Disable notifications' : 'Enable notifications'}
      </button>
    </div>
    <p className="text-xs text-muted-foreground">
      Updates and system notifications work when you open or use the site or app.
      Notifications delivered while it is completely closed are not enabled yet.
      Changes only appear once official data is published, not merely because an external page changed.
    </p>
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
