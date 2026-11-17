import { ArrowUpRight } from 'lucide-react';
import { RACE_ENTRY } from '@/lib/race-entry';

// Only explicitly categorized planning links are published. The legacy
// auxiliary archive mixes calendar evidence with result portals.
export function RaceSourceLinks({raceId}:{raceId:string}) {
  const entry = RACE_ENTRY[raceId];
  const links = [
    {url: entry?.technicalGuideUrl, label: 'Technical guide'},
    {url: entry?.registrationUrl, label: 'Registration'},
  ].filter((link): link is {url:string;label:string} =>
    typeof link.url === 'string' && /^https?:\/\//i.test(link.url));
  if (!links.length) return <p className="mt-2 text-xs text-muted-foreground">
    No separate technical guide or registration link is available. Consult the official race source.
  </p>;
  return <div className="mt-2 flex flex-wrap gap-4 text-xs">
    {links.map(({url,label}) => <a key={label} href={url} target="_blank"
      rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 underline">
      {label}<ArrowUpRight size={13} aria-hidden="true"/>
    </a>)}
  </div>;
}
