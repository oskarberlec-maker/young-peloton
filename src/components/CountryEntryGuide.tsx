import { COUNTRY_REQUIREMENTS } from '@/lib/country-requirements';
import { countryLabel } from '@/lib/u19-data';

const clubLabel = {
  required:'Club required for regular Junior racing',
  usually:'Club normally used; exceptions not confirmed',
  optional:'Club not universally mandatory',
  conditional:'Depends on licence, age or race category',
  uncertain:'Club requirement is not yet established',
  unknown:'Club requirement is not yet established',
};
const soloLabel = {
  possible:'Individual / unattached pathway exists (check event rules)',
  conditional:'Individual entry depends on race and licence',
  'club-route':'Regular competition route is via club',
  unconfirmed:'Independent entry has not been verified',
};
export function CountryEntryGuide({codes}:{codes:string[]}) {
  if(!codes.length)return null;
  return <section aria-label="Junior racing entry requirements by selected country" className="my-5 rounded-xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
    <h3 className="text-base font-bold text-slate-900">What do I need to race in the selected {codes.length===1?'country':'countries'}?</h3>
    <p className="mt-1 text-xs text-slate-600">U19 entry guidance from national federation websites and direct 2026 replies. Club/licence information describes the domestic system; visiting riders may have different requirements. The organiser's regulations always take priority. Unknown does not mean permitted or forbidden.</p>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {codes.map(code=>{
        const info=COUNTRY_REQUIREMENTS[code];
        return <article key={code} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h4 className="mb-3 font-bold text-slate-950">{countryLabel(code,code)}</h4>
          {info ? <dl className="space-y-2">
            <div><dt className="font-semibold text-slate-700">Club / team</dt><dd>{clubLabel[info.club]}</dd></div>
            <div><dt className="font-semibold text-slate-700">Can I enter alone?</dt><dd>{soloLabel[info.solo]}</dd></div>
            <div><dt className="font-semibold text-slate-700">Licence</dt><dd>{info.licence}</dd></div>
            <div><dt className="font-semibold text-slate-700">Other conditions</dt><dd>{info.note}</dd></div>
            {info.federationEmail && <div className="rounded-md border border-sky-100 bg-sky-50 p-3">
              <dt className="font-semibold text-slate-800">Foreign U19 riders — federation reply</dt>
              <dd className="mt-1 text-slate-700">
                <span className="font-medium">{info.federationEmail.status === 'allowed-with-exceptions' ? 'Allowed with exceptions' : info.federationEmail.status === 'conditional' ? 'Allowed subject to entry conditions' : 'Not confirmed by the federation'}</span>
                <span className="ml-1 text-xs text-slate-500">(reply: {info.federationEmail.replyDate})</span>
                <p className="mt-1">{info.federationEmail.details}</p>
                {info.federationEmail.calendarUrl && <a href={info.federationEmail.calendarUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sky-800 underline">Official event calendar</a>}
              </dd>
            </div>}
            <div className="pt-1"><a href={info.source} target="_blank" rel="noopener noreferrer" className="text-sky-800 underline">Domestic licence / club evidence</a></div>
          </dl> : <p className="text-amber-800">No verified entry checklist in the workbook for this country. Check the national federation and each race organiser.</p>}
        </article>;
      })}
    </div>
  </section>;
}
