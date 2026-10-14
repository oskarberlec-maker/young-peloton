import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, CalendarDays, RotateCcw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SITE = {
  brand: "Young Peloton",
  title: "Young Peloton — European U19 Road Race Calendar",
  description: "A European road cycling race calendar for U19 Men and U19 Women. We add and verify races country by country, based on official race notices.",
  intro: "A European road cycling race calendar for U19 Men and U19 Women. All in one place, with official race notices as the source.",
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

// Filter options are not race data or confirmation of country coverage.
const COUNTRIES = ["Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Kingdom", "Vatican City"];
const CATEGORIES = [{ value: "U19M", label: "U19 Men" }, { value: "U19Ž", label: "U19 Women" }];
const RACE_TYPES = ["Road race", "Stage race", "Individual time trial", "Team time trial", "Criterium"];

const PROVISIONAL_LABEL = "Approximate date — awaiting official confirmation";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PERIOD_LABEL = { early: "Early", mid: "Mid", late: "Late", "mid-late": "Mid/late", any: "" } as const;

// Provisional (unofficial) entries for Slovenia. No exact days — only an approximate window within the month,
// based on the 2026 calendar pattern. Corrected once official dates are published.
type Race = {
  id: string; name: string; place: string; country: string; categories: string[];
  type: string | null; month: number; period: keyof typeof PERIOD_LABEL; extraTentative?: boolean;
};
const RACES: Race[] = [
  { id: "piran", name: "Piran", place: "Piran", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 3, period: "late" },
  { id: "kamnik", name: "Kamnik", place: "Kamnik", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "domzale", name: "Domžale", place: "Domžale", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "ptuj", name: "Ptuj", place: "Ptuj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 5, period: "any", extraTentative: true },
  { id: "maribor", name: "Maribor", place: "Maribor", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 6, period: "early" },
  { id: "dptt", name: "DPTT — Slovenian National Time Trial Championships", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "late" },
  { id: "dproad", name: "DProad — Slovenian National Road Race Championships", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "late" },
  { id: "gorje", name: "Gorje", place: "Gorje", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid" },
  { id: "pokljuka", name: "Pokljuka", place: "Pokljuka", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid-late" },
  { id: "kriterij-tp", name: "Kriterij Tadeja Pogačarja (Tadej Pogačar Criterium)", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Criterium", month: 7, period: "late" },
  { id: "sencur", name: "Šenčur", place: "Šenčur", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 8, period: "late" },
  { id: "kranj-kriterij", name: "Kranj Criterium", place: "Kranj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Criterium", month: 8, period: "late" },
  { id: "kranj-cestna", name: "Kranj Road Race", place: "Kranj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Road race", month: 8, period: "late" },
  { id: "vn-dm", name: "VN DM", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 10, period: "any" },
];

function windowLabel(race: Race) {
  const p = PERIOD_LABEL[race.period];
  return p ? `${p} ${MONTHS[race.month - 1]}` : MONTHS[race.month - 1];
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
  const dateMonth = date ? Number(date.slice(5, 7)) : null;
  const races = RACES.filter((r) =>
    (country === "all" || r.country === country) &&
    (category === "all" || r.categories.includes(category)) &&
    (raceType === "all" || r.type === raceType) &&
    (dateMonth === null || r.month === dateMonth));
  function resetFilters() {
    setCountry("all"); setCategory("all"); setDate(""); setRaceType("all");
  }

  return (
    <div id="vrh" className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-6 py-6 sm:py-8">
        <a href="#vrh" className="font-serif text-xl font-medium transition-colors hover:text-lime-foreground">{SITE.brand}</a>
        <nav aria-label="Main navigation" className="flex gap-5 text-sm text-muted-foreground sm:gap-8">
          <a href="#koledar" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Calendar</a>
          <a href="#viri" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Sources & verification</a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-border py-14 sm:py-20">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="bg-lime px-2.5 py-1 text-lime-foreground">In progress</span>
            <span className="text-muted-foreground">Europe · Road cycling · U19</span>
          </div>
          <h1 className="font-serif text-5xl leading-tight font-medium sm:text-7xl">{SITE.brand}</h1>
          <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug sm:text-3xl">The next race starts here.</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{SITE.intro}</p>
          <Button asChild variant="link" className="mt-7 h-11 px-0 text-foreground underline decoration-lime decoration-2 underline-offset-8">
            <a href="#koledar">View the calendar <ArrowDown aria-hidden="true" /></a>
          </Button>
        </section>

        <section id="koledar" className="scroll-mt-6 border-b border-border py-12 sm:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-3xl font-medium sm:text-4xl">Race calendar</h2>
            <span className="text-xs text-muted-foreground">U19 Men / U19 Women</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">We add and verify races country by country. Provisional entries without exact dates are listed for Slovenia — all approximate dates will be corrected once official dates are published.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-4">
            <FilterSelect id="drzava" label="Country" value={country} onChange={setCountry} allLabel="All countries" options={COUNTRIES.map((value) => ({ value, label: value }))} />
            <FilterSelect id="kategorija" label="Category" value={category} onChange={setCategory} allLabel="Both categories" options={CATEGORIES} />
            <div className="space-y-2">
              <label htmlFor="datum" className="text-xs font-medium">Date</label>
              <Input id="datum" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 min-w-0 shadow-none" />
            </div>
            <FilterSelect id="tip-dirke" label="Race type" value={raceType} onChange={setRaceType} allLabel="All types" options={RACE_TYPES.map((value) => ({ value, label: value }))} />
          </div>
          <div className="mt-4 flex min-h-9 items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{races.length} provisional {races.length === 1 ? "entry" : "entries"} · 0 officially confirmed</span>
            <Button variant="ghost" size="sm" disabled={!filtered} onClick={resetFilters}><RotateCcw aria-hidden="true" />Reset filters</Button>
          </div>
          <div role="status" aria-live="polite" className="mt-5">
            {races.length > 0 ? (
              <>
                <p className="border-y border-border bg-lime/30 px-4 py-3 text-xs font-medium">{PROVISIONAL_LABEL}. Dates are approximate windows based on the 2026 calendar pattern and are not confirmed. The official race notice will be authoritative.</p>
                <ul className="divide-y divide-border border-b border-border">
                  {races.map((r) => (
                    <li key={r.id} className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-6">
                      <div className="text-sm">
                        <span className="font-medium">Approx.: {windowLabel(r)}</span>
                        {r.extraTentative && <span className="mt-1 block text-xs text-muted-foreground">Highly tentative — date unknown</span>}
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-medium">{r.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{r.place}, {r.country} · {r.categories.map((c) => CATEGORIES.find((x) => x.value === c)?.label ?? c).join(" / ")} · {r.type ?? "Race type not yet confirmed"}</p>
                      </div>
                      <span className="w-fit border border-border px-2 py-1 text-xs text-muted-foreground">{PROVISIONAL_LABEL}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="border-y border-border py-14 text-center sm:py-16">
                <CalendarDays aria-hidden="true" className="mx-auto mb-5 size-8 text-muted-foreground" strokeWidth={1.25} />
                <h3 className="font-serif text-2xl font-medium">No entries match the selected filters.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">We don’t show sample or made-up data. Provisional entries are currently available for Slovenia only.</p>
              </div>
            )}
          </div>
        </section>

        <section id="viri" className="scroll-mt-6 grid gap-6 py-12 sm:grid-cols-[1fr_1.5fr] sm:gap-16 sm:py-16">
          <h2 className="font-serif text-3xl font-medium">Official sources.<br />Verified data.</h2>
          <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
            <p>Our data will come from official race notices published by organisers and cycling federations. Every published race will link to its official notice.</p>
            <p>We add countries gradually. Before publishing, we check the date, location, category and race type. A country appearing in the filter doesn’t mean its races have been verified or added yet.</p>
            <p>For final details on the event and registration, the organiser’s official race notice always takes precedence.</p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-6 text-xs text-muted-foreground">
        <span className="font-serif text-base text-foreground">{SITE.brand}</span>
        <span>European U19 road race calendar</span>
        <a href="#vrh" aria-label="Back to top" className="inline-flex min-h-11 items-center gap-1 hover:text-foreground">Back to top <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
