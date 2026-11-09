import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { REPORT_TYPES, type ReportType } from '@/lib/issue-report';

type ReportSearch = { raceId?: string; raceName?: string };
const GITHUB_NEW_ISSUE = 'https://github.com/oskarberlec-maker/young-peloton/issues/new';

export const Route = createFileRoute('/report')({
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    ...(typeof search['raceId'] === 'string' && search['raceId'].length <= 180 ? { raceId: search['raceId'] } : {}),
    ...(typeof search['raceName'] === 'string' && search['raceName'].length <= 200 ? { raceName: search['raceName'] } : {}),
  }),
  head: () => ({
    meta: [
      { title: 'Report incorrect race information | Young Peloton' },
      { name: 'description', content: 'Report a mistake in the European U19 cycling race calendar with a link to official evidence via GitHub Issues.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'canonical', href: 'https://www.youngpeloton.eu/report' }],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { raceId = '', raceName = '' } = Route.useSearch();
  const [id, setId] = useState(raceId);
  const [name, setName] = useState(raceName);
  const [kind, setKind] = useState<ReportType>('Wrong date');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // GitHub's issue form requires an authenticated user to confirm the post.
    // No administrator credentials or user-entered details are sent to a server.
    const raceId = id.trim();
    const raceName = name.trim();
    const body = [
      '### Race',
      raceName,
      '',
      '### Race ID',
      raceId || 'Not supplied',
      '',
      ...(raceId ? ['### Young Peloton race page', 'https://www.youngpeloton.eu/race/' + encodeURIComponent(raceId), ''] : []),
      '### What is incorrect?',
      kind,
      '',
      '### Suggested correction',
      description.trim(),
      '',
      '### Link to official evidence',
      proofUrl.trim(),
      '',
      '---',
      'Reported through the Young Peloton website. Please verify the source before editing race data.',
    ].join('\n');
    const params = new URLSearchParams({
      title: '[Race correction] ' + raceName + ' — ' + kind,
      body,
    });
    window.location.assign(GITHUB_NEW_ISSUE + '?' + params.toString());
  };

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-5">
        <Link to="/" className="font-black tracking-tight">YOUNG <span className="text-sky-700">PELOTON</span></Link>
      </div>
    </header>
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"><ArrowLeft size={16}/> Back to races</Link>
      <div className="mt-7 flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-800"><AlertTriangle size={22}/></div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Report incorrect race information</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Found an incorrect date, category, cancellation or other mistake? Describe it below and include a link to official evidence. We'll prepare a GitHub issue for you.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Race name <span className="text-red-700">*</span>
            <input required maxLength={200} minLength={3} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Course de la Paix Juniors" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          </label>
          <label className="block text-sm font-semibold">Race ID <span className="font-normal text-slate-500">(optional)</span>
            <input maxLength={180} value={id} onChange={e => setId(e.target.value)} placeholder="Automatically filled from race page" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          </label>
        </div>
        <label className="block text-sm font-semibold">What is incorrect? <span className="text-red-700">*</span>
          <select value={kind} onChange={e => setKind(e.target.value as ReportType)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">
            {REPORT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">What should the correct information be? <span className="text-red-700">*</span>
          <textarea required minLength={12} maxLength={1800} rows={4} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Explain the error and provide the correct date, category or detail." className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
        </label>
        <label className="block text-sm font-semibold">Link to official evidence <span className="text-red-700">*</span>
          <input required type="url" pattern="https://.*" maxLength={1500} value={proofUrl} onChange={e => setProofUrl(e.target.value)}
            placeholder="https://organizer.example.com/official-race-announcement"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal"/>
          <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-600">
            Please link to the organizer, national federation or another publicly accessible source. <ExternalLink size={12} className="inline"/>
          </span>
        </label>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          Clicking the button opens a pre-filled GitHub issue. <strong>You must sign in to GitHub and click “Submit new issue” there</strong> to finish reporting. GitHub issues are public, so don't include private information.
        </p>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto">
          <Github size={16}/> Continue to GitHub
        </button>
      </form>
    </div>
  </main>;
}
