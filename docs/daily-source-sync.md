## Verified ID reconciliation and auditable failures (9 November 2026)

The original generated legacy source catalogue uses `xl-*` row IDs, not the
actual race IDs in the 2026 archive. It is no longer safe to treat those IDs
as current races. The scanner now resolves each legacy entry only when its
**official source URL** points to exactly one active, non-duplicate 2026 race.
Shared federation/calendar links and unmatched rows remain **read-only
monitored links**, not authorities for race date or eligibility updates.
The original 28,975 Excel source rows already use actual race IDs and retain
all unique ID-to-URL associations.

The app build now generates 16 compact per-ID source-link indexes at
`/data/2026/source-links-N.json`; the race detail page loads just one index
rather than bundling the >2 MiB legacy `xl-*` source file. A small, conservative
`/data/2027/edition-links.json` links a 2027 UCI competition to a 2026 race
only when the normalized **full name, country, and Men Junior category** match
exactly one non-merged archived 2026 race. The Saved page shows 2027 dates
when that association is verified. Similar names and ambiguous identities
are never auto-merged.

The public daily `status.json` includes `legacyIdsMapped`,
`legacyIdsUnmapped`, `legacyAmbiguousIds`, `reviewCategories`,
`topReviewHosts`, and `topErrorHosts`. Full `report.json` entries also carry
a `category` and `host` (403, 429, missing page, timeout, oversized document,
identity conflict, unparsed source, etc.). The scanner **still checks each
distinct URL only once per run**, with every race association preserved.
Unsupported pages, access failures and ambiguous IDs never become guessed
2027 dates. 2026 archive data is immutable.

---

## Complete Excel result sources (9 November 2026)

The `Viri izidov` worksheet in the user's `Evropa_U19_2026_vse_dirke_in_podatki.xlsx`
contains **28,975** ID–source rows. The immutable compressed import at
`scripts/source-sync/data/excel-result-sources-2026.json.gz` contains
**28,944 unique ID–URL pairs, 9,926 race IDs and 10,327 distinct URL strings**.
Each source is retained under every applicable race ID. The daily crawler
merges these links with its pre-existing archive catalogue, then canonicalizes
and checks **each distinct HTTP(S) resource at most once per run**, even if many
race IDs reference it. Unsupported link types, PDFs and broad result indices
are still monitored but cannot assert a 2027 edition unless a supported parser
matches an unambiguous race identity.

Original race IDs that were archived, merged, or not published are preserved
as read-only source associations; they **cannot trigger speculative data changes**.
The daily `status.json` exposes `excelSourceRows`, `excelUniquePairs`,
`excelRaceIds`, `excelUnmappedRaceIds`, `catalogueLinks` and
`totalSources`. The 28,975 rows are **not** 28,975 distinct websites.

---

## 2027 ID-based discovery (6 November 2026)

Every scheduled scan still checks all stored source/proof/result links for changes, and known official event records are checked for explicit 2027 dates. In addition, the scan now enumerates **every European Men Junior road competition ID** from the official UCI 2027 MJ calendar, including races that were **not listed in the 2026 archive**. For each new UCI competition ID it downloads the linked detail page and only publishes when the name, 2027 dates, competition class and category evidence agree with the calendar. Unrelated events, unsupported classes, contradictory dates and missing detail data are held for review. URL year alone is never proof.

Existing 2027 UCI IDs receive confirmed date corrections from the same authoritative calendar + detail pair. New UCI IDs are stable entries in `overrides.json.confirmed2027`; when name, country and junior category match exactly one archived 2026 race, its ID and approximate coordinates are carried forward. Otherwise the new race still appears under **2027** with a country-level **amber map marker**, not a guessed precise start location. The 2026 archive remains unchanged. All published editions are de-duplicated against existing UCI records and previously confirmed 2027 editions.

The public `status.json` also exposes `calendarCandidates2027`, `calendarVerified2027` and `calendarNewCandidates2027`. All updates remain transparent in `history.json`. Only sources with an unambiguous event identity and explicit 2027 confirmation are auto-published; unsupported websites/PDFs still require additional readers or manual verification.

---

## 2027 date-confirmation scope (1 November 2026)

The daily job now seeks explicit **2027 dates of known races only**. It keeps all 2026 archive records and previously published overrides intact. It changes only the date pair for an existing 2027 edition; new confirmed editions are stored separately in `overrides.json.confirmed2027` and loaded by the 2027 list, map and detail pages.

The supported federation/Schema.org readers check existing primary source URLs for an explicit 2027 date. The public UCI 2027 MJ calendar also locates new detail URLs for known names and countries. A UCI detail must confirm Men Junior and a supported junior class; championship-wide envelopes are not treated as junior race dates. No new unrelated races are discovered. Unsupported pages, PDFs, changed URLs outside the UCI calendar and ambiguous identities still need a reader or review. An unavailable source does not delete records or erase dates.

Dates are never inferred from 2026 or from the year in a URL. One-day dates may supply the end date only for a known one-day event. Names/country/category identities prevent duplicate editions. New non-UCI editions have an unverified 2027 level; a date confirmation alone does not establish classification. Existing approximate map locations carry over as requested, not as confirmed start coordinates.

The first confirmed read can establish a 2027 date; subsequent changes update the same edition and audit history. Reader version 2 forces a fresh fetch after this upgrade rather than reusing old 304 baselines. The existing 04:17 UTC daily GitHub Actions schedule and data-only publishing branch are retained.

---

# Daily official-source monitoring

The `Daily race source sync` workflow runs at **04:17 UTC daily** (05:17 Ljubljana in winter, 06:17 in summer), on relevant main-branch code changes, and manually from Actions. GitHub schedules are best-effort, not a precise-time SLA. The calendar displays an overdue warning after 48 hours without a published report. GitHub can disable schedules on public repositories after 60 days without activity; monitor the report timestamp and re-enable the workflow if necessary.

## Coverage and behavior

The crawler builds its inventory each run from all `sourceUrl`, `proofUrl`, and `resultUrl` values in the current 2026 archive and 2027 UCI dataset. Fragment-only variants are deduplicated, but event-identifying query parameters are preserved. Initial inventory: **9,188 distinct URLs**. There is no automatic discovery of every external website or newly announced race.

All registered URLs are attempted daily. A successful HTTP response means the resource was reached, not necessarily that its race data was understood. PDFs, JavaScript-only shells, and unsupported HTML can be change-detected but **cannot yet be automatically corrected**. The report explicitly separates reachable resources from supported structured sources. Primary source links can confirm exact 2027 editions. Result and eligibility links can also confirm an edition, but **only** when their HTML contains one unambiguous Schema.org Event for the same named race and an explicit 2027 date; generic result lists and prose mentions cannot drive corrections.

Supported readers:

- UCI competition detail properties for the 69 imported 2027 MJ events: name, exact dates, venue, UCI class/rank. Exact category, stable competition URL, known class and same season are required. Multi-category 2026 championship envelopes are not applied to individual races.
- FFC records: stable event number, explicitly labelled one-day dates and regional/national classification.
- FCI records: stable race ID, explicitly labelled single-day dates, venue, known race type, regional/national classification, and explicit cancellation.
- Schema.org Event/SportsEvent: one unambiguous exact-name, same-season event; explicit date(s), location and cancellation. No arbitrary date extraction from prose.

The first readable snapshot establishes a baseline. A later verified change to a supported field is applied automatically, without per-change user approval. Missing values, classification outside the known mapping, category changes, renamed unmatched events, conflicting dates, redirects to a different resource, HTTP errors, and parsing failures preserve existing data and are flagged. Disappearance does not mean cancellation. The circuit breakers hold unusually large changes for review. Changing a venue clears obsolete map coordinates rather than inventing new ones.

This implementation does **not** claim universal semantic understanding of every page, PDF, or federation API. Adding another federation means implementing and testing another reader in `scripts/source-sync/core.py`, using real source examples and stable event identity. Never map a broad calendar or competition envelope onto individual subevents merely because their names look similar.

## Storage and publication

No additional API keys, paid AI services, or database credentials are required. The workflow uses its repository-scoped `GITHUB_TOKEN`, with `contents: write`, only during restore and publication. The crawler itself receives no publishing token.

Snapshots are atomically committed to the public **`race-source-data`** branch:

- `overrides.json`: verified corrections by stable race ID.
- `status.json`: small public run/coverage summary.
- `report.json`: detailed source errors and review items.
- `history.json`: before/after values, race IDs, timestamps and source evidence.
- `state.json`: hashes, HTTP validators and prior parsed observations; no page bodies or credentials.

The app reads the corrections independently of deployments. The bundled archive remains a fallback, with its checksum validation unchanged. Browser-local cached corrections protect against a temporary feed outage. Corrections are strictly allowlisted and cannot modify IDs, URLs, eligibility, or executable content. Source updates re-sort the calendar by date. The data branch is separate from main, so the daily commit does not trigger an application rebuild.

Publishing requires a complete scan attempt and the expected previous data-branch head; it never force-pushes. Source errors are reported and do not prevent safe independent changes from other sources. A complete attempt is not the same as every source succeeding. An interrupted run does not replace the last published snapshot. Error details and coverage are available in the Actions artifact and report.

## Operation and recovery

- Actions → Daily race source sync → Run workflow runs a full live check.
- `python -m unittest discover -s scripts/source-sync -p 'test_*.py' -v` tests readers and the full baseline/change/repeat/failure pipeline without network access.
- `python scripts/source-sync/run.py --limit 10 --output /tmp/source-smoke` performs a limited smoke check. Limited/fixture runs cannot be published.
- The worker caps response bodies, limits each host to one request per second, bounds request time, defers a rate-limited host, rejects private-network URLs, and does not interpret page instructions or execute scripts.
- A reviewed rollback is a new data-branch commit adjusting/removing the affected override and restoring its prior observation in state.json. Keep the audit record and do not rewrite pushed history. A corrected reader can then re-evaluate the source on the next run.
- Disable the workflow in GitHub Actions to pause checking. Existing verified corrections continue to be served.

GitHub documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
# Reader version 3: reliable 2027 monitoring

The scanner still runs on the existing daily schedule and preserves the 2026 archive. It now:

- Reuses a single parsed page for every race associated with that source.
- Gives explicit 2027 URLs and known 2027 editions priority. It follows at most three explicit, same-origin 2027 links from a known race page, with a budget of 200 new URLs per run and one discovery hop. URLs are never guessed by replacing the year. Discovered URLs and their parent race associations persist in `state.json` and are revisited on future runs even when the parent returns HTTP 304.
- Accepts a changed federation ID on a discovered edition page only when the exact known race heading and explicit 2027 dates are verified. FFC also requires the explicit 2027 season. Other structured event readers retain their identity/date validation.
- Retries timeouts and selected transient HTTP errors at most twice. It never retries HTTP 403, 404 or 429. Three consecutive 403 responses from a host defer its remaining URLs for that run; a 429 stops requests to that host immediately. Long/date-based `Retry-After` pauses are recorded and persist across runs. No access-control bypass is attempted.
- Compares all current supported date evidence, including sources that confirm the existing date and cached 304 observations. Conflicting date pairs block an update or a new edition and are recorded with their evidence. Resolving a conflict is re-evaluated even if one source remains unchanged.
- Separates historical 2026 page changes from 2027 review issues. Previously observed 2027 evidence disappearing remains an issue on later runs; it is never silently treated as an irrelevant archive page or a race cancellation.

Reports include the start and finish times, duration, HTTP request/retry counts, unchanged responses, historical sources, discovered 2027 pages, date conflicts, real errors and deferred sources. `complete` means every registered URL has an accounted outcome, not that every URL was successfully fetched. `successful + errors + deferred == attempted`; deferred URLs are never counted as successful reads. `needsReview` excludes temporary host deferrals, while `report.json` preserves those individual outcomes and `deferredHosts` explains the host-level decisions.

New fields are optional in the website reader, so the last version-2 report remains readable until a version-3 full scan finishes. The existing publication rule still rejects fixture and limited scans. All checked dates still need a supported source with an exact race identity and an explicit 2027 date range; PDFs and unsupported page layouts remain review-only.

## Reader version 4: bounded discovery and evidence review

This incremental update retains v3 transport, reconciliation, budgets and publication.
At implementation time the latest published snapshot was still the 11 November
05:10 UTC pre-v3 report; its coverage figures cannot measure v3's effectiveness.

- Same-origin discovery accepts explicit 2027 anchor text even without a year in
  the destination URL, and exact race-name links on an explicitly 2027 calendar.
  Generic navigation, guessed URLs, cross-origin discovery and additional hops
  remain excluded. Linked destinations now require junior category and country
  evidence as well as the existing exact identity and explicit date checks.
- Existing JSON-LD readers also traverse ItemList/item and subEvent/event wrappers.
  Calendar events with separate event URLs require exact name/year, country and
  junior category evidence. FFC/FCI can fall back to this existing reader.
- Legacy aliases retain their original associations. A unique stable FFC, FCI
  or KNWU event ID can reconcile URL display/query variants with an active
  same-country archived event. Shared IDs remain ambiguous; names are not merged.
- PDF text extraction is **review-only**, with no dates published automatically.
  Poppler runs in a separate process with a 12-second timeout, 10-second CPU,
  256 MiB address-space, 2 MiB output and 40-page limit. Scans retain at most
  20 short 2027 evidence excerpts; encrypted, scanned or malformed files remain
  review items. No OCR, paid API or new Python dependency is used.
- UCI detail responses already fetched in the run are reused for calendar
  verification. Failures are not immediately retried in the calendar phase.
  A 304 can reuse previously fully validated detail evidence only when the
  current calendar identity/country/dates still agree; changed calendars wait
  for fresh detail evidence or review.
- Retry-After persists even on the last retry/non-retryable response. Reports add
  recognized2027Sources, sourcesWith2027Evidence, newlyConfirmedRaceDates,
  new2027RacesDiscovered and importantUnresolvedSources. Evidence mentions are
  explicitly distinct from validated date observations.

Limitations: PDFs cannot auto-publish; Belgian JSON APIs and JavaScript-only
Dutch calendars still need validated real response fixtures and dedicated
readers. No discovery-yield increase is claimed until a full live report exists.
The daily 04:17 UTC schedule and independent race-source-data publication remain.

## Reader version 5: event dates instead of navigation-year matches

A targeted inspection of live FFC/FCI pages on 12 November 2026 identified two
reader defects: FFC's shared Haute-Savoie UCI 2027 navigation was counted as race
evidence, and FCI's PISTA/FUORISTRADA navigation could invalidate a road race.
Evidence now requires an explicit full 2027 date; federation category checks use
race-specific fields and published FFC junior codes (MJ/WJ, 1.14/2.14 and
1.21/2.21, including the displayed .0 variant), excluding unrelated navigation.

The scanner now queries the official FFC road calendar in 27 supported 14-day
windows covering 2027. The form supports only 1–14 days: a 365-day request is
silently reduced to one day. Scoped event cards supply exact names, road
discipline, explicit dates and official detail links. A matching known French
race is followed and independently verified by the existing detail reader.
Calendar/detail date disagreements block publication. No event URL is guessed.
The existing discovery budget, transport protections and one-hop bound remain.
Discovery leads survive 304 responses and budget exhaustion.

FFC's explicit French multi-day ranges now publish both dates when season and
stated duration agree. Supported federation detail URLs in secondary sources
can also supply verified dates. First confirmations enter confirmed2027;
subsequent verified changes use the existing overrides feed. The website already
consumes this feed without an application deployment; no UI changes are needed.
2026 records, existing verified dates and conflict protections remain intact.

Live source examples used for validation:
- https://competitions.ffc.fr/calendrier/?discipline=1&debut=01%2F03%2F2027&nbjours=14
- https://competitions.ffc.fr/calendrier/?discipline=1&debut=01%2F06%2F2027&nbjours=14
- https://competitions.ffc.fr/calendrier/competition/2026/4221073005/la-cote-dor-classic-u19/
- https://www.federciclismo.it/ricerca-gare/dettaglio-gara/?raceid=179377&site=strada_it&mese=03
- FFC codification: https://ffc.fr/app/uploads/sites/2/2024/04/Codification-epreuves-route-bareme-points.pdf

Regression dates in test_federation_dates.py are explicitly synthetic; they are
never published. A separate targeted replay of downloaded live pages exercises
the same confirmation/overlay pipeline, without publishing fixture output.
Unsupported prose/PDF calendars and newly named non-UCI races still need further
readers or identity review; a page-wide year alone is not sufficient evidence.

## V6: FFC races absent from the archive

V5's completed run 43219083704 (12 November 2026) inventoried 14,029 sources,
accessed 10,168 successfully, failed 65 and deferred 3,796. It published 24 new
2027 editions of known races. Its calendar evidence contained 242 road detail
URLs, only 111 of which were inventoried. New names were the measured gap.

V6 follows all explicitly dated FFC road calendar entries within the existing
200-link discovery budget, including unknown names. Publication requires exact
calendar/detail name and event ID agreement, a single Route header, an explicit
metropolitan French department, a supported U19 men/women event code, season
2027, explicit dates and matching duration. It reuses the FFC date reader.
Unknown categories, overseas/unknown locations and ambiguous records require
review. A URL's year does not prove the event's season. No coordinates are guessed.

New races use the existing confirmed2027 hashed IDs and complete website schema;
source2026Id is empty when no unique archive match exists. Calendar and detail
links are retained in sourceLinks and scanner state. Exact name/country/category
deduplication and stable-ID conflict checks prevent duplicate publication.
Calendar/detail evidence survives 304s; only sources successfully checked in the
current run authorize a new publication. Conflicts are reported even when neither
detail proposes a change to the currently published date.

Reports add official2027CalendarEntriesDiscovered (unique FFC detail URLs),
calendarEntriesMatchedToKnownRace (verified identities),
federationDetailPagesVerified, duplicatesSkipped and existingDatesUpdated.
Existing UCI calendar counters remain separate. A parsed calendar is discovery
information, not a confirmed date. Known non-U19/ambiguous calendar entries are
retained as review candidates until a reader can establish eligibility.

Real event markup in data/fixtures/ffc was captured on 12 November 2026 from:
- https://competitions.ffc.fr/calendrier/?discipline=1&debut=01%2F03%2F2027&nbjours=14
- https://competitions.ffc.fr/calendrier/competition/2027/4436272001/classic-coeur-de-brenne-u19/
- https://competitions.ffc.fr/calendrier/competition/2027/4877114003/boucles-de-seine-et-marne-souvenir-bernard-maillet/

The fixtures retain event markup, omitting navigation and contact forms. A
three-response replay proves publication with neither race in the archive,
repeat/304 persistence, conflicts and stable-ID rename rejection. This replay
is test output, never production feed publication. The real KNWU sample
https://mijn.knwu.nl/calendar/races/100578 returned 403; no restriction was
bypassed and no speculative KNWU parser was added. Italy/Belgium and ambiguous
legacy IDs remain follow-up work. PDF evidence remains manual-review-only.

The V6 upgrade invalidates only FFC validators; unchanged V5 readers retain
their conditional-request caches. Subsequent checks of a newly discovered FFC
race revalidate its strict category and stable ID even without a discovery alias.
