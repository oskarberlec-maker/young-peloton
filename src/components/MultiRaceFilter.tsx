import { useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useCopy, type Translations } from '@/lib/i18n';

const COPY: Translations<{ all: string; selected: string; allOptions: string; clear: string; close: string; search: string; none: string; done: string }> = {
  en: { all: 'All', selected: 'selected', allOptions: 'All options', clear: 'Clear', close: 'Close', search: 'Search countries', none: 'No matches', done: 'Done' },
  sl: { all: 'Vse', selected: 'izbranih', allOptions: 'Vse možnosti', clear: 'Počisti', close: 'Zapri', search: 'Išči države', none: 'Ni zadetkov', done: 'Končano' },
  it: { all: 'Tutti', selected: 'selezionati', allOptions: 'Tutte le opzioni', clear: 'Cancella', close: 'Chiudi', search: 'Cerca paesi', none: 'Nessun risultato', done: 'Fatto' },
  de: { all: 'Alle', selected: 'ausgewählt', allOptions: 'Alle Optionen', clear: 'Zurücksetzen', close: 'Schließen', search: 'Länder suchen', none: 'Keine Treffer', done: 'Fertig' },
  fr: { all: 'Tous', selected: 'sélectionnés', allOptions: 'Toutes les options', clear: 'Effacer', close: 'Fermer', search: 'Rechercher un pays', none: 'Aucun résultat', done: 'Terminé' },
};

export type FilterChoice = { value: string; label: string };

export function MultiRaceFilter({label,choices,selected,onChange,searchable=false}:{label:string;choices:FilterChoice[];selected:string[];onChange:(values:string[])=>void;searchable?:boolean}) {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const t=useCopy(COPY);
  const visible=choices.filter(x=>!searchable||x.label.toLowerCase().includes(search.trim().toLowerCase()));
  const summary=selected.length===0?t.all:selected.length===1?(choices.find(x=>x.value===selected[0])?.label||selected[0]):selected.length+' '+t.selected;
  return <div className="relative min-w-0 text-sm">
    <span className="mb-1 block font-medium text-slate-800">{label}</span>
    <button type="button" aria-expanded={open} aria-label={label+': '+summary} onClick={()=>setOpen(!open)}
      className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-foreground hover:border-sky-500">
      <span className="truncate">{summary}</span><ChevronDown size={15} className="shrink-0"/>
    </button>
    {open&&<div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[220px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <span className="text-xs text-slate-500">{selected.length?selected.length+' '+t.selected:t.allOptions}</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>onChange([])} className="text-xs font-medium text-sky-800 hover:underline">{t.clear}</button>
          <button type="button" onClick={()=>setOpen(false)} className="rounded p-1 hover:bg-slate-100" aria-label={t.close+' '+label}><X size={15}/></button>
        </div>
      </div>
      {searchable&&<div className="relative mb-2"><Search size={14} className="absolute left-3 top-2.5 text-slate-500"/><input autoFocus={false} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} className="h-9 w-full rounded border border-slate-200 pl-9 pr-2 text-sm" aria-label={t.search}/></div>}
      <div className="max-h-60 space-y-0.5 overflow-y-auto" role="group" aria-label={label}>
        {visible.map(choice=><label key={choice.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-sky-50">
          <input type="checkbox" checked={selected.includes(choice.value)} onChange={e=>onChange(e.target.checked?[...selected,choice.value]:selected.filter(v=>v!==choice.value))} className="accent-sky-700"/>
          <span>{choice.label}</span>
        </label>)}
        {!visible.length&&<p className="px-2 py-3 text-sm text-slate-500">{t.none}</p>}
      </div>
      <button type="button" className="mt-2 w-full rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white" onClick={()=>setOpen(false)}>{t.done}</button>
    </div>}
  </div>;
}
