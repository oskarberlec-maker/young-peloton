import { ArrowUpRight } from "lucide-react";
import { RACE_SOURCES } from "@/routes/-young-peloton-race-sources";

type RaceSourceLinksProps = {
  raceId: string;
};

export function RaceSourceLinks({ raceId }: RaceSourceLinksProps) {
  const source = RACE_SOURCES[raceId];

  const links = [
    ...(source?.officialUrl
      ? [{ url: source.officialUrl, label: "Official source" }]
      : []),
    ...(source?.otherUrls ?? []).map((url, index) => ({
      url,
      label: `Additional source ${index + 1}`,
    })),
  ];

  if (links.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Source not available in the current source list.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {links.map(({ url, label }) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center gap-1 text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {label}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
