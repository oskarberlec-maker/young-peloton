# Daily official-source monitoring

The `Daily race source sync` workflow runs at **04:17 UTC daily** (05:17 Ljubljana in winter, 06:17 in summer), on relevant main-branch code changes, and manually from Actions. GitHub schedules are best-effort, not a precise-time SLA. The calendar displays an overdue warning after 48 hours without a published report. GitHub can disable schedules on public repositories after 60 days without activity; monitor the report timestamp and re-enable the workflow if necessary.

## Coverage and behavior

The crawler builds its inventory each run from all `sourceUrl`, `proofUrl`, and `resultUrl` values in the current 2026 archive and 2027 UCI dataset. Fragment-only variants are deduplicated, but event-identifying query parameters are preserved. Initial inventory: **9,188 distinct URLs**. There is no automatic discovery of every external website or newly announced race.

All registered URLs are attempted daily. A successful HTTP response means the resource was reached, not necessarily that its race data was understood. PDFs, JavaScript-only shells, and unsupported HTML can be change-detected but **cannot yet be automatically corrected**. The report explicitly separates reachable resources from supported structured sources. Result and eligibility links are monitored, but only primary race sources can drive corrections.

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
