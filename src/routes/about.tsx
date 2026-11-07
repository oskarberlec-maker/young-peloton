import { createFileRoute, Link } from '@tanstack/react-router';
export const Route = createFileRoute('/about')({
  head: () => ({ meta: [
    { title: 'About & Methodology — Young Peloton' },
    { name: 'description', content: 'How Young Peloton collects, verifies and presents European U19 road cycling event information.' },
    { property: 'og:url', content: 'https://www.youngpeloton.eu/about' },
  ], links: [{ rel:'canonical',href:'https://www.youngpeloton.eu/about' }] }),
  component: About,
});
function About() {
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-slate-950 px-5 py-5 text-white"><div className="mx-auto max-w-4xl"><Link to="/" className="font-black tracking-tight">YOUNG <span className="text-cyan-400">PELOTON</span></Link></div></header>
    <article className="mx-auto max-w-4xl space-y-7 px-5 py-12 leading-relaxed">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">About the project</p><h1 className="mt-2 text-4xl font-bold">Making junior cycling races easier to find</h1></div>
      <p>Young Peloton is an independent European U19 cycling race discovery project designed for riders, coaches and clubs. The aim is to bring fragmented national calendar information into a searchable archive with links to original sources.</p>
      <section className="space-y-2"><h2 className="text-2xl font-semibold">What the calendar includes</h2><p>Entries reflect published source records. Inclusion is not proof of U19 eligibility, event format, date, race status or successful completion. Some records are unconfirmed, conditional, cancelled, merged or under review. Always consult the organizer before travel or registration.</p></section>
      <section className="space-y-2"><h2 className="text-2xl font-semibold">Sources and verification</h2><p>Race cards link to their original source and, where available, eligibility evidence and results. Labels distinguish confirmed U19 eligibility from conditional or unverified entries. Dates reflect the sourced calendar, not guaranteed event outcomes. Duplicate and merged source records are hidden by default, but can be viewed in the archive.</p><p>The 2026 dataset is dated October 22, 2026 and is not marked complete. Map markers are approximate town, area or country centres, never guaranteed start coordinates.</p></section>
      <section className="space-y-2"><h2 className="text-2xl font-semibold">Data corrections</h2><p>If a race has an incorrect category, date, location or other details, report it with a public link to official evidence. No GitHub account is needed.</p><Link to="/report" className="font-medium text-sky-700 underline">Report a correction with evidence</Link></section>
      <section className="space-y-2"><h2 className="text-2xl font-semibold">Using the planner</h2><p>You can filter by country, month, category, race type, U19 verification and date interval; save races directly in your current browser without an account; share race links; and export calendar or CSV files. Saved races do not synchronize between devices. Export a JSON backup from Saved races to move your list to another device or keep a copy before clearing browser data.</p></section>
      <Link to="/" className="inline-block rounded-md bg-slate-900 px-5 py-3 font-medium text-white">Back to race calendar</Link>
    </article></main>;
}