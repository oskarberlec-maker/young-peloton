import { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCcw, Trash2 } from 'lucide-react';
import { devicePushStatus,enableDevicePush,disableDevicePush } from '@/lib/push-client';
import {
  ALERT_EVENT, checkSavedRaceChanges, clearSavedRaceAlerts,
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
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
    };
    refresh();
    void devicePushStatus().then(value => {setEnabled(value.subscribed);setPermission(value.permission);}).catch(()=>undefined);
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
    try {
      if (enabled) {
        await disableDevicePush();
        setEnabled(false);
        setDesktopNotificationsEnabled(false);
        setMessage('2027 race alerts are disabled on this device.');
      } else {
        await enableDevicePush();
        setEnabled(true);
        setPermission('granted');
        // Avoid a duplicate notification from the foreground-only legacy watcher.
        setDesktopNotificationsEnabled(false);
        setMessage('Enabled: when a saved 2026 race receives a confirmed 2027 date, Young Peloton can notify you even while the app is closed.');
      }
    } catch(error) {
      setMessage(error instanceof Error ? error.message : 'Could not update notification settings.');
      const status = await devicePushStatus();
      setEnabled(status.subscribed);setPermission(status.permission);
    }
  };

  return <section aria-label="Saved race updates" className="space-y-4 rounded-xl border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Bell size={19}/> Updates to saved races</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Get notified when a race you saved from 2026 receives a verified date for 2027.
          Allow notifications once to receive alerts even when Young Peloton is closed.
          No login or Supabase account is required.
        </p>
      </div>
      <button type="button" disabled={working || savedCount===0} onClick={() => void checkNow()}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">
        <RefreshCcw size={15}/> {working ? 'Checking…' : 'Check for changes'}
      </button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <div className="text-sm">
        <p className="font-semibold">2027 push notifications {enabled && permission==='granted' ? 'on' : 'off'}</p>
        <p className="mt-1 text-xs text-slate-600">
          {lastCheck ? 'Last comparison: '+new Date(lastCheck).toLocaleString('en-GB') : 'No check completed yet.'}
        </p>
      </div>
      <button type="button" onClick={() => void toggleNotifications()} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
        {enabled ? <BellOff size={15}/> : <Bell size={15}/>} {enabled ? 'Disable 2027 alerts' : 'Enable 2027 alerts'}
      </button>
    </div>
    <p className="text-xs text-muted-foreground">
      Enabling push saves this device's subscription and its followed 2026 race IDs privately on the notification server solely for matching alerts; your full race collection still belongs to this browser.
      On iPhone, install Young Peloton to the Home Screen before enabling push. Other supported browsers can receive notifications without installing.
      An alert is sent only when the official 2027 confirmation is published after you subscribe, not from an unverified link change.
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
