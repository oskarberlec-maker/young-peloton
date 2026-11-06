import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  browserLabels,
  detectInstallEnvironment,
  getInstallGuidance,
  platformLabels,
  type InstallBrowser,
  type InstallEnvironment,
  type InstallPlatform,
} from '@/lib/pwa-install';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const initialEnvironment: InstallEnvironment = { browser: 'other', platform: 'other' };

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [environment, setEnvironment] = useState<InstallEnvironment>(initialEnvironment);
  const [message, setMessage] = useState('');
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setEnvironment(detectInstallEnvironment(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ));
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstructions(false);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!instructions) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInstructions(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [instructions]);

  if (installed) return null;

  const showInstall = async () => {
    setMessage('');
    if (!promptEvent) {
      setInstructions(true);
      return;
    }
    setPrompting(true);
    try {
      // Only browsers exposing beforeinstallprompt can be asked to install directly.
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      setPromptEvent(null);
      if (result.outcome !== 'accepted') {
        setMessage('You can also install from your browser menu using these instructions.');
        setInstructions(true);
      }
    } catch {
      setPromptEvent(null);
      setMessage('Your browser could not start installation automatically. Follow these steps instead.');
      setInstructions(true);
    } finally {
      setPrompting(false);
    }
  };

  const guidance = getInstallGuidance(environment);
  return <>
    <button
      type="button"
      disabled={prompting}
      onClick={() => void showInstall()}
      className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-100 disabled:opacity-60"
      aria-haspopup="dialog"
    >
      <Download size={15}/> {prompting ? 'Installing…' : 'Install app'}
    </button>
    {instructions && <div
      role="presentation"
      onClick={() => setInstructions(false)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="yp-install-title"
        onClick={event => event.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 text-left text-slate-900 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">No account needed</p>
            <h2 id="yp-install-title" className="mt-1 text-xl font-extrabold">Install Young Peloton</h2>
            <p className="mt-1 text-sm text-slate-600">Add Young Peloton to your Home Screen, Start menu or desktop.</p>
          </div>
          <button
            type="button"
            onClick={() => setInstructions(false)}
            aria-label="Close installation instructions"
            className="rounded-md border p-2"
          ><X size={17}/></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">
            Browser
            <select
              value={environment.browser}
              onChange={event => setEnvironment(previous => ({
                ...previous, browser: event.target.value as InstallBrowser,
              }))}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              aria-label="Choose your browser"
            >
              {Object.entries(browserLabels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Device
            <select
              value={environment.platform}
              onChange={event => setEnvironment(previous => ({
                ...previous, platform: event.target.value as InstallPlatform,
              }))}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              aria-label="Choose your device"
            >
              {Object.entries(platformLabels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
        </div>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6">
          {guidance.steps.map((step, index) => <li key={index}>{step}</li>)}
        </ol>
        <p className="mt-4 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-950">{guidance.note}</p>
        {message && <p role="status" className="mt-3 text-sm text-amber-800">{message}</p>}
        <p className="mt-4 text-xs leading-5 text-slate-600">
          Installing is free. The website still works in every browser even when standalone installation is unavailable.
          Bookmarks are saved separately by different browsers and may also be separate inside an installed app.
          Transfer saved races using <strong>Saved → Backup (.json) / Restore backup</strong>.
        </p>
        <button
          type="button"
          onClick={() => setInstructions(false)}
          className="mt-4 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
        >Done</button>
      </section>
    </div>}
  </>;
}
