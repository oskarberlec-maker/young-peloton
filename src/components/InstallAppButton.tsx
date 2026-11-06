import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & {standalone?: boolean}).standalone);
    setInstalled(standalone);
    setIsAppleMobile(/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setInstructions(false); setPromptEvent(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  const install = async () => {
    if (!promptEvent) {setInstructions(v => !v); return;}
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    setPromptEvent(null);
  };
  return <div className="relative">
    <button type="button" onClick={() => void install()}
      className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-100">
      <Download size={15}/> Install app
    </button>
    {instructions && <div role="dialog" aria-label="Install Young Peloton" className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,90vw)] rounded-lg border bg-white p-4 text-sm text-slate-900 shadow-xl">
      <button type="button" className="float-right" aria-label="Close install help" onClick={() => setInstructions(false)}><X size={16}/></button>
      <strong>Install Young Peloton</strong>
      <p className="mt-2">{isAppleMobile
        ? 'In Safari, tap Share (the square with an arrow), select Add to Home Screen, and confirm Add.'
        : 'Open your browser menu and choose Install app or Add to Home Screen.'}</p>
      <p className="mt-2 text-xs text-slate-600">The app opens from your home screen, without a normal browser tab. No account needed. Browser and installed app storage may be separate; use Saved races → Backup / Restore to transfer your list.</p>
    </div>}
  </div>;
}
