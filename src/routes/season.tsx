import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Bookmark, CalendarDays, Download, Upload } from 'lucide-react';
import { countryLabel, loadU19Races, niceDate, type U19Race } from '@/lib/u19-data';
import { downloadIcs } from '@/lib/race-calendar';
import { useRacingSeason } from '@/lib/use-racing-season';
import { safeSavedIds } from '@/lib/season-storage';
import { getRaceLevel } from '@/lib/race-level';

export const Route = createFileRoute('/season')({
  head: () => ({ meta: [
    { title: 'Saved races on this device — Young Peloton' },
    { name: 'description', content: 'Your locally saved European U19 cycling races, available without an account.' },
  ] }),
  component: SavedPage,
});

const raceYear = (id: string) => id.startsWith('uci-2027-') || id.startsWith('confirmed-2027-') ? 2027 : 2026;

function SavedPage() {
  const { saved, ready, error, toggle, clearAll, importIds } = useRacingSeason();
  const [races, setRaces] = useState<U19Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const years = useMemo(() => [...new Set(saved.map(raceYear))].sort().join(','), [saved]);

  useEffect(() => {
    if (!ready) return;
    if (!years) { setRaces([]); setLoading(false); setLoadError(''); return; }
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    void Promise.all(years.split(',').map(y => loadU19Races(undefined, controller.signal, Number(y))))
      .then(results => { if (!controller.signal.aborted) setRaces(results.flatMap(x => x.races)); })
      .catch(reason => { if (!controller.signal.aborted) setLoadError(String(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ready, years]);

  const savedSet = useMemo(() => new Set(saved), [saved]);
  const selected = useMemo(() => races.filter(r => savedSet.has(r.id))
    .sort((a,b) => a.date.localeCompare(b.date)), [races, savedSet]);
  const missing = !loading && !loadError ? saved.filter(id => !races.some(r => r.id === id)) : [];

  const exportBackup = () => {
    const data = JSON.stringify({ format: 'young-peloton-bookmarks-v1', savedRaceIds: saved }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'young-peloton-saved-races.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('File is too large.');
      const data: unknown = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' ||
        (data as { format?: unknown }).format !== 'young-peloton-bookmarks-v1' ||
        !Array.isArray((data as { savedRaceIds?: unknown }).savedRaceIds))
        throw new Error('Not a Young Peloton saved-races backup.');
      const ids = safeSavedIds((data as { savedRaceIds: unknown }).savedRaceIds);
      setImportMessage(importIds(ids) ? `Imported ${ids.length} race IDs into this device.` : 'Could not save the imported races.');
    } catch (reason) {
      setImportMessage(reason instanceof Error ? reason.message : 'Could not read backup.');
    }
  };

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Link to="/" className="text-xl font-black tracking-tight">YOUNG <span className="text-sky-700">PELOTON</span></Link>
        <Link to="/" className="text-sm text-sky-700 underline">Explore races</Link>
      </div>
    </header>
    <div className="mx-auto max-w-6xl space-y-7 px-5 py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-sky-700">No login required</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">Saved races on this device</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Tap Save on any race to keep it here. Your list is stored in this browser, not in an online account. It is not synced to other devices.</p>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Clearing your browser's website data or using another browser or device can remove this list. Export a backup to keep a copy. Previously cloud-saved races are not automatically transferred.
      </p>
      <section className="space-y-4" aria-label="Saved races">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Bookmark size={20}/> Saved races ({saved.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportBackup} disabled={!ready || saved.length === 0} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50"><Download size={15}/> Backup (.json)</button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Upload size={15}/> Restore backup
              <input className="sr-only" type="file" accept=".json,application/json" onChange={e => void importBackup(e)} aria-label="Restore saved races backup" />
            </label>
            <button disabled={selected.length === 0} onClick={() => downloadIcs(selected)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50"><CalendarDays size={15}/> Calendar (.ics)</button>
          </div>
        </div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {importMessage && <p role="status" className="text-sm">{importMessage}</p>}
        {(!ready || loading) && <p role="status" className="text-sm text-muted-foreground">Loading saved races…</p>}
        {loadError && <p role="alert" className="text-red-700">Could not load race details: {loadError}</p>}
        {ready && !loading && saved.length === 0 && <div className="rounded-xl border p-8 text-center">
          <p>You have no saved races yet.</p>
          <Link to="/" className="mt-3 inline-block rounded-md bg-slate-950 px-5 py-2 font-semibold text-white">Explore races</Link>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map(r => <article key={r.id} className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-sky-700">{niceDate(r.date)}</p>
            <h3 className="mt-2 font-bold"><Link to="/race/$raceId" params={{raceId:r.id}} className="hover:underline">{r.name}</Link></h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.place} · {countryLabel(r.countryCode, r.country)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{getRaceLevel(r).label}</p>
            <button className="mt-3 rounded-md border px-3 py-1 text-sm" onClick={() => void toggle(r.id)}>Remove from device</button>
          </article>)}
        </div>
        {missing.length > 0 && !loading && !loadError && <p className="text-sm text-amber-800">{missing.length} saved race(s) are not in the currently published calendar. Their saved IDs are preserved in your backup.</p>}
        {saved.length > 0 && <button onClick={() => { if (window.confirm('Remove all saved races from this device?')) void clearAll(); }}
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">Remove all saved races</button>}
      </section>
    </div>
  </main>;
}
