import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, CalendarDays, RotateCcw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SITE = {
  brand: "Young Peloton",
  title: "Young Peloton — Evropski koledar cestnih dirk U19",
  description: "Evropski koledar cestnih kolesarskih dirk za U19 moške in U19 ženske. Podatke dodajamo in preverjamo državo po državo na podlagi uradnih razpisov.",
  intro: "Evropski koledar cestnih kolesarskih dirk za U19 moške in U19 ženske. Na enem mestu, z uradnimi razpisi kot virom.",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE.title },
      { name: "description", content: SITE.description },
      { property: "og:title", content: SITE.title },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://oskar-osebna.lovable.app/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://oskar-osebna.lovable.app/" }],
  }),
  component: Index,
});

// Možnosti filtrov niso podatki o dirkah ali potrditev pokritosti države.
const COUNTRIES = ["Albanija", "Andora", "Avstrija", "Belgija", "Belorusija", "Bosna in Hercegovina", "Bolgarija", "Ciper", "Češka", "Črna gora", "Danska", "Estonija", "Finska", "Francija", "Grčija", "Hrvaška", "Irska", "Islandija", "Italija", "Kosovo", "Latvija", "Lihtenštajn", "Litva", "Luksemburg", "Madžarska", "Malta", "Moldavija", "Monako", "Nemčija", "Nizozemska", "Norveška", "Poljska", "Portugalska", "Romunija", "Rusija", "San Marino", "Severna Makedonija", "Slovaška", "Slovenija", "Srbija", "Španija", "Švedska", "Švica", "Turčija", "Ukrajina", "Vatikan", "Združeno kraljestvo"];
const CATEGORIES = [{ value: "U19M", label: "U19M — moški" }, { value: "U19Ž", label: "U19Ž — ženske" }];
const RACE_TYPES = ["Enodnevna dirka", "Etapna dirka", "Posamični kronometer", "Ekipni kronometer", "Kriterij"];

const PROVISIONAL_LABEL = "Okvirni datum — čaka se uradna potrditev";
const MONTHS = ["januar", "februar", "marec", "april", "maj", "junij", "julij", "avgust", "september", "oktober", "november", "december"];
const PERIOD_LABEL = { early: "začetek", mid: "sredina", late: "konec", "mid-late": "sredina/konec", any: "" } as const;

// Okvirni (neuradni) vnosi za Slovenijo. Brez točnih dni — samo okvirno obdobje meseca,
// izpeljano iz vzorca koledarja 2026. Popravimo jih, ko bodo objavljeni uradni datumi.
type Race = {
  id: string; name: string; place: string; country: string; categories: string[];
  type: string | null; month: number; period: keyof typeof PERIOD_LABEL; extraTentative?: boolean;
};
const RACES: Race[] = [
  { id: "piran", name: "Piran", place: "Piran", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 3, period: "late" },
  { id: "kamnik", name: "Kamnik", place: "Kamnik", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "domzale", name: "Domžale", place: "Domžale", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "ptuj", name: "Ptuj", place: "Ptuj", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 5, period: "any", extraTentative: true },
  { id: "maribor", name: "Maribor", place: "Maribor", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 6, period: "early" },
  { id: "dptt", name: "DPTT — državno prvenstvo v vožnji na čas", place: "Slovenija", country: "Slovenija", categories: ["U19M", "U19Ž"], type: "Posamični kronometer", month: 6, period: "late" },
  { id: "dproad", name: "DProad — državno prvenstvo v cestni dirki", place: "Slovenija", country: "Slovenija", categories: ["U19M", "U19Ž"], type: "Enodnevna dirka", month: 6, period: "late" },
  { id: "gorje", name: "Gorje", place: "Gorje", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid" },
  { id: "pokljuka", name: "Pokljuka", place: "Pokljuka", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid-late" },
  { id: "kriterij-tp", name: "Kriterij Tadeja Pogačarja (Kriterij TP)", place: "Slovenija", country: "Slovenija", categories: ["U19M", "U19Ž"], type: "Kriterij", month: 7, period: "late" },
  { id: "sencur", name: "Šenčur", place: "Šenčur", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 8, period: "late" },
  { id: "kranj-kriterij", name: "Kranj kriterij", place: "Kranj", country: "Slovenija", categories: ["U19M", "U19Ž"], type: "Kriterij", month: 8, period: "late" },
  { id: "kranj-cestna", name: "Kranj cestna dirka", place: "Kranj", country: "Slovenija", categories: ["U19M", "U19Ž"], type: "Enodnevna dirka", month: 8, period: "late" },
  { id: "vn-dm", name: "VN DM", place: "Slovenija", country: "Slovenija", categories: ["U19M", "U19Ž"], type: null, month: 10, period: "any" },
];

function windowLabel(race: Race) {
  const p = PERIOD_LABEL[race.period];
  return p ? `${p} ${MONTHS[race.month - 1]}a`.replace("ja" + "a", "ja") : MONTHS[race.month - 1];
}

function FilterSelect({ id, label, value, onChange, allLabel, options }: {
  id: string; label: string; value: string; onChange: (value: string) => void; allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 shadow-none"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Index() {
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState("");
  const [raceType, setRaceType] = useState("all");
  const filtered = country !== "all" || category !== "all" || date !== "" || raceType !== "all";
  function resetFilters() {
    setCountry("all"); setCategory("all"); setDate(""); setRaceType("all");
  }

  return (
    <div id="vrh" className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-6 py-6 sm:py-8">
        <a href="#vrh" className="font-serif text-xl font-medium transition-colors hover:text-lime-foreground">{SITE.brand}</a>
        <nav aria-label="Glavna navigacija" className="flex gap-5 text-sm text-muted-foreground sm:gap-8">
          <a href="#koledar" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Koledar</a>
          <a href="#viri" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Viri in preverjanje</a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-border py-14 sm:py-20">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="bg-lime px-2.5 py-1 text-lime-foreground">V pripravi</span>
            <span className="text-muted-foreground">Evropa · Cestno kolesarstvo · U19</span>
          </div>
          <h1 className="font-serif text-5xl leading-tight font-medium sm:text-7xl">{SITE.brand}</h1>
          <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug sm:text-3xl">Naslednja dirka se začne tukaj.</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{SITE.intro}</p>
          <Button asChild variant="link" className="mt-7 h-11 px-0 text-foreground underline decoration-lime decoration-2 underline-offset-8">
            <a href="#koledar">Poglej koledar <ArrowDown aria-hidden="true" /></a>
          </Button>
        </section>

        <section id="koledar" className="scroll-mt-6 border-b border-border py-12 sm:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-3xl font-medium sm:text-4xl">Koledar dirk</h2>
            <span className="text-xs text-muted-foreground">U19M / U19Ž</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Podatke dodajamo in preverjamo državo po državo. Prve preverjene dirke bodo objavljene kmalu.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-4">
            <FilterSelect id="drzava" label="Država" value={country} onChange={setCountry} allLabel="Vse države" options={COUNTRIES.map((value) => ({ value, label: value }))} />
            <FilterSelect id="kategorija" label="Kategorija" value={category} onChange={setCategory} allLabel="Obe kategoriji" options={CATEGORIES} />
            <div className="space-y-2">
              <label htmlFor="datum" className="text-xs font-medium">Datum</label>
              <Input id="datum" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 min-w-0 shadow-none" />
            </div>
            <FilterSelect id="tip-dirke" label="Tip dirke" value={raceType} onChange={setRaceType} allLabel="Vsi tipi" options={RACE_TYPES.map((value) => ({ value, label: value }))} />
          </div>
          <div className="mt-4 flex min-h-9 items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>0 objavljenih dirk</span>
            <Button variant="ghost" size="sm" disabled={!filtered} onClick={resetFilters}><RotateCcw aria-hidden="true" />Ponastavi filtre</Button>
          </div>
          <div role="status" aria-live="polite" className="mt-5 border-y border-border py-14 text-center sm:py-16">
            <CalendarDays aria-hidden="true" className="mx-auto mb-5 size-8 text-muted-foreground" strokeWidth={1.25} />
            <h3 className="font-serif text-2xl font-medium">Koledar je v pripravi.</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Trenutno še ni objavljenih preverjenih dirk{filtered ? " za izbrane filtre" : ""}. Ne prikazujemo vzorčnih ali nepotrjenih podatkov.</p>
            <p className="mt-5 text-xs font-medium">Najprej preverimo. Nato objavimo.</p>
          </div>
        </section>

        <section id="viri" className="scroll-mt-6 grid gap-6 py-12 sm:grid-cols-[1fr_1.5fr] sm:gap-16 sm:py-16">
          <h2 className="font-serif text-3xl font-medium">Uradni viri.<br />Preverjeni podatki.</h2>
          <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
            <p>Vir za podatke bodo uradni razpisi organizatorjev in kolesarskih zvez. Ob vsaki objavljeni dirki bo povezava do uradnega razpisa.</p>
            <p>Države vključujemo postopoma. Pred objavo preverimo datum, kraj, kategorijo in tip dirke. Izbira države v filtru še ne pomeni, da so njene dirke že preverjene ali dodane.</p>
            <p>Za končne informacije o izvedbi in prijavi bo vedno merodajen uradni razpis organizatorja.</p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-6 text-xs text-muted-foreground">
        <span className="font-serif text-base text-foreground">{SITE.brand}</span>
        <span>Evropski koledar cestnih dirk U19</span>
        <a href="#vrh" aria-label="Nazaj na vrh" className="inline-flex min-h-11 items-center gap-1 hover:text-foreground">Na vrh <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
