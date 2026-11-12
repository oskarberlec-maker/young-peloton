#!/usr/bin/env python3
"""Read every distinct stored source, update supported fields, publish audit data.
No API credentials are needed for crawling. Publishing is a separate workflow step.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import re
from pathlib import Path
import time
from urllib.parse import urlsplit
from confirmations import dates_only, edition, identity, CALENDAR
from uci_discovery import calendar_entries, matching_2026_edition, confirmed_uci_detail, edition_from_uci_calendar
from core import canonical, Page, normalized
from catalogue import linked_source_catalogue, excel_result_sources
from transport import Fetcher, DeferredSource
from discovery import edition_links
from federation_calendar import calendar_seeds, FFCCalendar, calendar_links, has_2027_dates, calendar_date_evidence
from pdf_evidence import pdf_evidence
from conflicts import reconcile
from ffc_discovery import calendar_entries as ffc_entries, detail as ffc_detail

ROOT = Path(__file__).resolve().parents[2]
READER_VERSION = 6
MAX_DISCOVERED_PER_RUN = 200


def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def load_races():
    folder = ROOT / 'public/data/2026'
    manifest = read_json(folder / 'manifest.json', {})
    races = [dict(zip(manifest['fields'], row)) for part in manifest['parts'] for row in read_json(folder / part, [])]
    text = (ROOT / 'src/lib/uci-2027.ts').read_text()
    races += json.loads(text.split('= ', 1)[1].rsplit(';', 1)[0])
    if len({r['id'] for r in races}) != len(races):
        raise ValueError('Duplicate race IDs')
    return races



def run(args):
    started = time.monotonic()
    now = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    previous = read_json(out / 'state.json', {'sources': {}})
    old_overlay = read_json(out / 'overrides.json', {'schemaVersion': 1, 'races': {}})
    overlay = json.loads(json.dumps(old_overlay))
    history = read_json(out / 'history.json', {'changes': []})
    races = load_races()
    confirmed = overlay.setdefault('confirmed2027', {})
    races += [r for rid, r in confirmed.items() if rid not in {x['id'] for x in races}]
    by_id = {r['id']: {**r, **overlay['races'].get(r['id'], {}).get('fields', {})} for r in races}
    known_2027 = {}
    for race in by_id.values():
        if race['date'].startswith('2027-'):
            known_2027.setdefault(identity(race), []).append(race)
    registry = {}
    invalid = []
    for r in races:
        for field in ('sourceUrl', 'proofUrl', 'resultUrl'):
            if not r.get(field):
                continue
            try:
                url = canonical(r[field])
            except ValueError:
                invalid.append({'raceId': r['id'], 'field': field})
                continue
            entry = registry.setdefault(url, {'races': set(), 'primary': set(), 'secondary': set()})
            entry['races'].add(r['id'])
            if r.get('state') != 'merged' and not r.get('duplicate'):
                if field == 'sourceUrl':
                    entry['primary'].add(r['id'])
                else:
                    entry['secondary'].add(r['id'])
    # The website's generated archive also stores additional official sources.
    # Scan these sources daily too. Secondary links cannot independently assert
    # new editions without one unambiguous structured Event and matching ID/name.
    catalog, link_metrics = linked_source_catalogue(races)
    imported_excel = excel_result_sources()
    catalog_count = 0
    unmapped_excel_ids = set(imported_excel) - set(by_id)
    imported_pairs = sum(map(len, imported_excel.values()))
    for rid, links in catalog.items():
        if args.fixtures:
            if rid not in by_id:
                continue
        # Check URLs even when an archival race ID was merged or excluded.
        # Never use such orphaned links to alter a race without a matching ID.
        for original in links:
            try:
                url = canonical(original)
            except ValueError:
                invalid.append({'raceId': rid, 'field': 'catalogue'})
                continue
            entry = registry.setdefault(url, {'races': set(), 'primary': set(), 'secondary': set()})
            entry['races'].add(rid)
            if rid in by_id:
                entry['secondary'].add(rid)
            catalog_count += 1
    print(json.dumps({**link_metrics,'catalogueRaces':len(catalog),'catalogueLinks':catalog_count,'uniqueSources':len(registry),
        'excelRows':28975,'excelUniquePairs':imported_pairs,'excelRaceIds':len(imported_excel),
        'excelUnmappedRaceIds':len(unmapped_excel_ids)}),flush=True)
    # Query the federation's documented date filters instead of guessing edition URLs.
    # These 27 small windows cover the complete 2027 road calendar.
    federation_seeds = list(calendar_seeds()) if not args.fixtures and any(r.get('countryCode') == 'FR' for r in races) else []
    for url in federation_seeds:
        registry.setdefault(url, {'races': set(), 'primary': set(), 'secondary': set()})
    known_names = {}
    for race in races:
        known_names.setdefault(normalized(race['name']), []).append(race)
    # Revisit verified discovery links on every run, including when the parent returns 304.
    discovery_registry = previous.get('discoveredSources', {})
    for url, evidence in discovery_registry.items():
        try:
            if canonical(url) != url or canonical(evidence['parent']) not in registry:
                continue
            if urlsplit(url).netloc != urlsplit(evidence['parent']).netloc:
                continue
            ids = set(evidence['raceIds']) & set(by_id)
            if ids or (evidence.get('federationCandidate') and urlsplit(url).hostname == 'competitions.ffc.fr'):
                registry.setdefault(url, {'races': set(), 'primary': set(), 'secondary': set()})['primary'].update(ids)
                registry[url]['races'].update(ids)
        except (ValueError, KeyError, TypeError):
            continue
    # Interleave hosts so thousands of one federation's pages don't block all workers.
    from collections import defaultdict, deque
    groups = defaultdict(deque)
    for u in sorted(registry):
        groups[urlsplit(u).hostname].append(u)
    priority = [u for u in registry if re.search(r'(?<!\d)2027(?!\d)', u) or any(by_id.get(i, {}).get('date', '').startswith('2027-') for i in registry[u]['races'])]
    urls = list(priority)
    priority = set(priority)
    while groups:
        for host in list(groups):
            u = groups[host].popleft()
            if u not in priority:
                urls.append(u)
            if not groups[host]:
                del groups[host]
    if args.limit:
        urls = urls[:args.limit]
    fetcher = Fetcher()
    fetcher.cooldowns = {host: until for host, until in previous.get('hostCooldowns', {}).items()
                         if isinstance(until, (int, float)) and until > time.time()}
    state = {'schemaVersion': 1, 'sources': dict(previous.get('sources', {})), 'discoveredSources': dict(discovery_registry)}
    proposed = []
    new_editions = []
    counts = {**link_metrics,'excelSourceRows':28975,'excelUniquePairs':imported_pairs,
              'excelRaceIds':len(imported_excel),'excelUnmappedRaceIds':len(unmapped_excel_ids),
              'catalogueRaces':len(catalog),'catalogueLinks':catalog_count,'totalSources': len(registry), 'attempted': 0, 'successful': 0, 'errors': 0, 'supportedSources': 0, 'changedSources': 0, 'needsReview': 0, 'updatedRaces': 0, 'deferred': 0, 'notModified': 0, 'historicalSources': 0, 'discovered2027Sources': 0}
    review = []
    fixtures = Path(args.fixtures) if args.fixtures else None

    def interpret_observation(rid, observed, url):
        race = by_id[rid]
        fields = observed['fields']
        targets = [race] if race['date'].startswith('2027') else known_2027.get(identity(race), [])
        if len(targets) > 1:
            raise ValueError('Ambiguous existing 2027 identity')
        if targets:
            target = targets[0]
            changes = []
            if any(target.get(k) != v for k, v in fields.items()):
                changes.append({'raceId': target['id'], 'fields': fields, 'sourceUrl': url,
                                'adapter': observed['adapter'], 'previousFields': {k: target[k] for k in fields}})
            return changes, {**observed, 'targetRaceId': target['id']}
        if race.get('bucket', 'confirmed') != 'confirmed':
            raise ValueError('2027 date found but U19 eligibility needs confirmation')
        return [{'newEdition': edition(race, fields, url, now), 'sourceUrl': url, 'adapter': observed['adapter']}], observed

    uci_responses = {}

    def check(url):
        prev = previous.get('sources', {}).get(url, {})
        record = {**prev, 'observations': dict(prev.get('observations', {})), 'lastAttemptAt': now}
        candidates = []
        try:
            if fixtures:
                fixture = fixtures / (hashlib.sha256(url.encode()).hexdigest() + '.html')
                if not fixture.exists():
                    raise ValueError('No test fixture for source')
                result = {'body': fixture.read_bytes(), 'contentType': 'text/html', 'finalUrl': url, 'redirectedHost': False, 'httpStatus': 200}
            else:
                # Re-read after the reader upgrade even when the source's ETag is unchanged.
                compatible = prev.get('readerVersion') == READER_VERSION or (
                    prev.get('readerVersion') == 5 and urlsplit(url).hostname != 'competitions.ffc.fr')
                result = fetcher.get(url, prev if compatible else {})
            if url.startswith('https://www.uci.org/competition-details/2027/ROA/'):
                uci_responses[url] = dict(result)
            if result.get('notModified'):
                # 304 means the previous successful representation is still current,
                # not that an unsupported page has suddenly been parsed.
                if not prev.get('hash'):
                    raise ValueError('304 without a prior successful baseline')
                record.update(status='ok', lastCheckedAt=now, httpStatus=304, changed=False, notModified=True)
                record.pop('error', None)
                # Cached evidence must be compared again after a previously blocked conflict.
                updates = []
                for rid, observed in prev.get('observations', {}).items():
                    if rid in by_id:
                        changes, evidence = interpret_observation(rid, observed, url)
                        updates.extend(changes)
                        record.setdefault('observations', {})[rid] = evidence
                pending_review = {'sourceUrl': url, 'reason': 'Previously detected source change still needs a supported reader or review'} if record.get('needsReview') else None
                return url, record, updates, pending_review, [tuple(item) for item in prev.get('discoveryCandidates', [])]
            record.pop('uciDetail', None)
            record.pop('ffcDetail', None)
            body = result.pop('body')
            raw_hash = hashlib.sha256(body).hexdigest()
            decoded = body.decode('utf-8', errors='replace')
            page_hash = raw_hash
            page = None
            if 'html' in result['contentType']:
                page = Page(decoded)
                if urlsplit(url).hostname == 'competitions.ffc.fr' and urlsplit(url).path.rstrip('/') == '/calendrier':
                    page.ffc_calendar = FFCCalendar(decoded).entries
                # Exclude scripts/tokens and style churn from unsupported-page notices.
                page_hash = hashlib.sha256(('\n'.join(page.lines) + json.dumps(page.ld, sort_keys=True) + json.dumps(page.props, sort_keys=True)).encode()).hexdigest()
            if result['contentType'] == 'application/pdf':
                try:
                    evidence = pdf_evidence(body)
                except ValueError as error:
                    evidence = {'has2027': False, 'snippets': [], 'publication': 'manual-review-only', 'error': str(error)}
                record.update(result, readerVersion=READER_VERSION, hash=raw_hash, rawHash=raw_hash,
                              status='ok', lastCheckedAt=now, observations={}, supportedRecords=0,
                              notModified=False, changed=False, needsReview=True, pdfEvidence=evidence,
                              targetYearEvidence=evidence['has2027'])
                return url, record, [], {'sourceUrl': url, 'reason': 'PDF calendar requires manual identity and category review',
                                         'pdfEvidence': evidence}, []
            observations = {}
            updates, parse_errors = [], []
            supported = 0
            if not result['redirectedHost']:
                # Shared calendar URLs cannot safely identify individual subraces
                # unless the reader itself verifies a stable ID.
                # Result and eligibility links may also publish structured 2027
                # editions. Only process secondary URLs with explicit Schema.org
                # data; broad result lists and plain-text year mentions do not qualify.
                secondary = (registry[url]['secondary'] - registry[url]['primary']) if (page is not None and has_2027_dates(page) and
                    ('application/ld+json' in decoded.lower() or urlsplit(url).hostname in ('competitions.ffc.fr', 'www.federciclismo.it'))) else set()
                for rid in sorted(registry[url]['primary'] | secondary):
                    race = by_id[rid]
                    try:
                        observed = dates_only(decoded, result['contentType'], race, url, page=page,
                                              linked_edition=url in state['discoveredSources'])
                        if observed:
                            supported += 1
                            changes, evidence = interpret_observation(rid, observed, url)
                            updates.extend(changes)
                            observations[rid] = evidence
                    except (ValueError, KeyError, TypeError) as e:
                        parse_errors.append({'raceId': rid, 'reason': str(e)[:200]})
            record['ffcCalendarEntries'] = []
            if page is not None and not result['redirectedHost']:
                record['ffcCalendarEntries'] = ffc_entries(page, url)
                try:
                    record['ffcDetail'] = ffc_detail(page, url, now)
                    if record['ffcDetail']:
                        supported = max(1, supported)
                except (ValueError, KeyError, TypeError) as e:
                    parse_errors.append({'reason': str(e)[:200]})
                candidates.extend(calendar_links(page, url, known_names))
                for rid in sorted(registry[url]['primary']):
                    if rid in by_id:
                        candidates.extend((link, rid) for link in edition_links(page, by_id[rid], url))
                candidates.extend((entry['sourceUrl'], None) for entry in record['ffcCalendarEntries'])
            record['calendarDateEvidence'] = calendar_date_evidence(page, url) if page is not None else {}
            record['discoveryCandidates'] = [list(item) for item in dict.fromkeys(candidates)][:500]
            for missing_id in sorted(set(prev.get('observations', {})) - set(observations)):
                parse_errors.append({'raceId': missing_id, 'reason': 'Previously supported 2027 evidence is no longer present'})
            target_year = bool(page is not None and has_2027_dates(page))
            had_target_evidence = bool(prev.get('hadTargetEvidence') or prev.get('observations'))
            historical = bool(page is not None and '2026' in url + '\n'.join(page.lines) + json.dumps(page.ld)
                              and not target_year and not supported and not had_target_evidence)
            changed = bool(prev.get('hash') and prev['hash'] != page_hash)
            if historical:
                changed = False
            if supported:
                # For supported readers, actual field changes are the meaningful signal.
                changed = bool(updates or parse_errors)
            calendar_read = bool(record['ffcCalendarEntries'])
            if calendar_read:
                changed = False
            needs_review = not calendar_read and bool((target_year and not supported) or parse_errors or result['redirectedHost'] or (changed and not supported and not historical) or (prev.get('observations') and not supported) or (prev.get('needsReview') and not supported and not historical))
            record.update(result, readerVersion=READER_VERSION, historicalOnly=historical, targetYearEvidence=target_year, hadTargetEvidence=bool(had_target_evidence or observations), notModified=False, hash=page_hash, rawHash=raw_hash, status='ok', lastCheckedAt=now, observations=observations, supportedRecords=supported, changed=changed, needsReview=needs_review)
            for key in ('error',):
                record.pop(key, None)
            reason = {'sourceUrl': url, 'reason': 'Changed or unparseable source; no speculative update', 'details': parse_errors[:10]} if needs_review else None
            return url, record, updates, reason, candidates
        except Exception as e:
            if url.startswith('https://www.uci.org/competition-details/2027/ROA/'):
                uci_responses[url] = e
            # A fetch failure is never an event cancellation or a deletion.
            record.update(status='deferred' if isinstance(e, DeferredSource) else 'error', error=str(e)[:250],
                          httpStatus=getattr(e, 'code', None), changed=False, notModified=False)
            return url, record, [], {'sourceUrl': url, 'reason': record['error'], 'deferred': isinstance(e, DeferredSource)}, []

    discovered = {}

    def collect(results):
        for url, record, updates, issue, candidates in results:
            state['sources'][url] = record
            counts['attempted'] += 1
            counts['successful' if record['status'] == 'ok' else 'deferred' if record['status'] == 'deferred' else 'errors'] += 1
            counts['notModified'] += int(record.get('notModified', False))
            counts['historicalSources'] += int(record['status'] == 'ok' and record.get('historicalOnly', False))
            counts['supportedSources'] += int(record['status'] == 'ok' and record.get('supportedRecords', 0) > 0)
            counts['changedSources'] += int(record.get('changed', False))
            if issue:
                review.append(issue)
            new_editions.extend(p for p in updates if 'newEdition' in p)
            proposed.extend(p for p in updates if 'newEdition' not in p)
            for child, rid in candidates:
                if child in registry:
                    if rid is not None and rid not in registry[child]['primary']:
                        entry = state['discoveredSources'].setdefault(child, {'parent': url, 'raceIds': []})
                        entry['raceIds'] = sorted(set(entry['raceIds']) | {rid})
                    continue
                if child not in discovered and len(discovered) >= MAX_DISCOVERED_PER_RUN:
                    continue
                entry = discovered.setdefault(child, {'races': set(), 'primary': set(), 'secondary': set(), 'parent': url})
                if rid is not None:
                    entry['races'].add(rid)
                    entry['primary'].add(rid)
            if counts['attempted'] % 100 == 0:
                print(json.dumps(counts), flush=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        collect(pool.map(check, urls))
        # One discovery hop only, with a hard daily budget and the same strict readers.
        if not args.limit:
            children = list(discovered)
            for url in children:
                entry = discovered[url]
                registry[url] = entry
                state['discoveredSources'][url] = {'parent': entry['parent'], 'raceIds': sorted(entry['races']), 'federationCandidate': not entry['races']}
            counts['discovered2027Sources'] = len(children)
            counts['totalSources'] = len(registry)
            collect(pool.map(check, children))

    # All calendar/detail requests share the registry and bounded discovery pool.
    # On 304 the validated fields and calendar identities remain available; only
    # representations successfully checked in THIS run can authorize publication.
    current_sources = {url: rec for url, rec in state['sources'].items()
                       if rec.get('status') == 'ok' and rec.get('lastCheckedAt') == now}
    ffc_candidates = {}
    for parent, rec in current_sources.items():
        for candidate in rec.get('ffcCalendarEntries', []):
            ffc_candidates.setdefault(candidate['sourceUrl'], []).append((parent, candidate))
    counts['official2027CalendarEntriesDiscovered'] = len(ffc_candidates)
    counts['calendarEntriesMatchedToKnownRace'] = 0
    counts['federationDetailPagesVerified'] = 0
    counts['duplicatesSkipped'] = 0
    for url, candidates in ffc_candidates.items():
        details = current_sources.get(url, {}).get('ffcDetail')
        if not details:
            # Discovery is evidence to investigate, never a confirmed date.
            review.append({'sourceUrl': url, 'reason': 'FFC calendar entry awaits unambiguous U19 road detail verification'})
            continue
        if any(normalized(candidate['name']) != normalized(details['name']) or
               'FR-FFC-' + candidate['eventId'] != details['officialEventId'] for _, candidate in candidates):
            review.append({'sourceUrl': url, 'reason': 'Conflicting FFC calendar/detail event identity'})
            continue
        counts['federationDetailPagesVerified'] += 1
        matches = [r for r in by_id.values() if identity(r) == identity(details)
                   and not r.get('duplicate') and r.get('state') != 'merged']
        if matches:
            counts['calendarEntriesMatchedToKnownRace'] += 1
        # A reused stable event ID with a changed identity is not a new race.
        stable = [r for r in by_id.values() if r.get('officialEventId') == details['officialEventId']]
        if any(identity(r) != identity(details) for r in stable):
            review.append({'sourceUrl': url, 'reason': 'Conflicting FFC stable event identity'})
            continue
        existing = [r for r in matches if r['date'].startswith('2027-')]
        fields = {k: details[k] for k in ('date', 'enddate')}
        if len(existing) > 1:
            review.append({'sourceUrl': url, 'reason': 'Ambiguous existing FFC race identity'})
            continue
        if existing:
            target = existing[0]
            if target.get('officialEventId') and target['officialEventId'] != details['officialEventId']:
                review.append({'sourceUrl': url, 'reason': 'Conflicting official IDs for duplicate FFC event identity'})
                counts['duplicatesSkipped'] += 1
                continue
            # Reuse normal observation/conflict handling for an existing edition.
            observed = {'fields': fields, 'adapter': 'ffc-calendar-and-detail-v1'}
            changes, evidence = interpret_observation(target['id'], observed, url)
            proposed.extend(change for change in changes if not any(
                p['raceId'] == change['raceId'] and p['fields'] == change['fields'] and p['sourceUrl'] == url for p in proposed))
            current_sources[url].setdefault('observations', {})[target['id']] = evidence
            current_sources[url]['supportedRecords'] = max(1, current_sources[url].get('supportedRecords', 0))
            counts['duplicatesSkipped'] += 1
            continue
        originals = [r for r in matches if not r['date'].startswith('2027-')]
        if len(originals) > 1:
            review.append({'sourceUrl': url, 'reason': 'Ambiguous known FFC race identity'})
            continue
        entry = {**details, 'sourceUpdatedAt': now,
                 'source2026Id': originals[0]['id'] if originals else '',
                 'sourceLinks': sorted({url, *(parent for parent, _ in candidates)})}
        new_editions.append({'newEdition': entry, 'sourceUrl': url, 'adapter': 'ffc-calendar-and-detail-v1'})

    calendar_verified = []
    if not fixtures and not args.limit:
        try:
            response = fetcher.get(CALENDAR, {})
            candidates = calendar_entries(json.loads(response['body']))
            counts['calendarCandidates2027'] = len(candidates)
            counts['calendarVerified2027'] = 0
            counts['calendarNewCandidates2027'] = 0
            for candidate in candidates:
                rid = candidate['id']
                if rid not in by_id:
                    counts['calendarNewCandidates2027'] += 1
                try:
                    result = uci_responses.get(candidate['sourceUrl'])
                    if isinstance(result, Exception):
                        raise result
                    if result is None:
                        result = fetcher.get(candidate['sourceUrl'], {})
                    if result.get('notModified'):
                        # Cached full UCI validation is required, not just date observations.
                        cached = previous.get('sources', {}).get(candidate['sourceUrl'], {}).get('uciDetail')
                        if not cached or any(cached.get(k) != candidate.get(k) for k in ('name', 'date', 'enddate', 'countryCode')):
                            raise ValueError('UCI cached detail cannot verify changed calendar; manual review required')
                        detail = cached
                    else:
                        detail = None
                    if result.get('redirectedHost'):
                        raise ValueError('UCI competition detail redirected to a different resource')
                    if not result.get('notModified') and result.get('contentType') != 'text/html':
                        raise ValueError('UCI competition detail did not provide HTML')
                    if not result.get('notModified'):
                        detail = confirmed_uci_detail(result['body'].decode('utf-8', errors='replace'), candidate)
                    if not detail:
                        raise ValueError('UCI Men Junior calendar and competition detail do not agree on name, date, category or class')
                    if candidate['sourceUrl'] in state['sources']:
                        state['sources'][candidate['sourceUrl']]['uciDetail'] = {**detail, 'name': candidate['name'], 'countryCode': candidate['countryCode']}
                    counts['calendarVerified2027'] += 1
                    if rid in by_id:
                        # Exact UCI competition ID resolves the edition even if its name
                        # changed; do not silently rewrite a whole event from a calendar.
                        race = by_id[rid]
                        if not race['date'].startswith('2027-'):
                            review.append({'sourceUrl': candidate['sourceUrl'], 'reason': 'Existing UCI ID belongs to a different year'})
                            continue
                        fields = {'date': detail['date'], 'enddate': detail['enddate']}
                        calendar_verified.append({'raceId': rid, 'fields': fields, 'sourceUrl': candidate['sourceUrl']})
                        if all(race.get(key) == value for key, value in fields.items()):
                            continue
                        already = [p for p in proposed if p['raceId'] == rid]
                        if already:
                            if any(p['fields'].get('date') != fields['date'] or p['fields'].get('enddate') != fields['enddate'] for p in already):
                                review.append({'sourceUrl': candidate['sourceUrl'], 'reason': 'Contradictory UCI updates for one competition ID'})
                            continue
                        proposed.append({'raceId': rid, 'fields': fields, 'sourceUrl': candidate['sourceUrl'],
                                         'adapter': 'uci-competition-v1',
                                         'previousFields': {key: race.get(key) for key in fields}})
                        continue
                    linked = matching_2026_edition(candidate, races)
                    entry = edition_from_uci_calendar(candidate, detail, now, linked)
                    new_editions.append({'newEdition': entry, 'sourceUrl': candidate['sourceUrl'],
                                         'adapter': 'uci-calendar-and-detail-v1'})
                except Exception as e:
                    review.append({'sourceUrl': candidate['sourceUrl'], 'reason': str(e)[:250],
                                   'raceId': rid})
            counts['calendarChecked'] = True
        except Exception as e:
            counts['calendarChecked'] = False
            review.append({'sourceUrl': CALENDAR, 'reason': str(e)[:250]})

    verified = [
        {'raceId': observed.get('targetRaceId', rid), 'fields': observed['fields'], 'sourceUrl': url}
        for url, record in state['sources'].items()
        if record.get('status') == 'ok' and record.get('lastCheckedAt') == now and record.get('supportedRecords', 0)
        for rid, observed in record.get('observations', {}).items()
        if observed.get('targetRaceId', rid) in by_id and by_id[observed.get('targetRaceId', rid)]['date'].startswith('2027-')
    ]
    # A federation calendar and its detail are independent current observations.
    # Preserve the existing edition when those two official surfaces disagree.
    federation_dates = {}
    for parent, record in state['sources'].items():
        if record.get('status') == 'ok' and record.get('lastCheckedAt') == now:
            for child, pairs in record.get('calendarDateEvidence', {}).items():
                for pair in pairs:
                    federation_dates.setdefault(child, []).append((parent, pair))
    for item in list(new_editions):
        for parent, pair in federation_dates.get(item['sourceUrl'], []):
            new_editions.append({**item, 'sourceUrl': parent, 'newEdition': {**item['newEdition'], 'date': pair[0], 'enddate': pair[1]}})
    for item in proposed + verified:
        for parent, pair in federation_dates.get(item['sourceUrl'], []):
            calendar_verified.append({'raceId': item['raceId'], 'sourceUrl': parent,
                                      'fields': {'date': pair[0], 'enddate': pair[1]}})
    proposed, new_editions, conflicts = reconcile(proposed, new_editions, verified + calendar_verified)
    review.extend(conflicts)
    counts['dateConflicts'] = len(conflicts)

    existing_identities = {identity(r) for r in races if r['date'].startswith('2027')}
    added = 0
    added_ids = set()
    # Prefer official UCI competition IDs when both a federation page and
    # the UCI calendar identify the same 2027 edition.
    for item in sorted(new_editions, key=lambda x: (not x['newEdition']['id'].startswith('uci-2027-'), x['newEdition']['id'])):
        race = item['newEdition']
        if identity(race) in existing_identities:
            continue
        # Ambiguous archive identities need review instead of merging distinct races.
        originals = {r['id'] for r in races if not r['date'].startswith('2027') and identity(r) == identity(race) and not r.get('duplicate') and r.get('state') != 'merged'}
        if len(originals) > 1 and not race['id'].startswith('uci-2027-'):
            review.append({'sourceUrl': item['sourceUrl'], 'reason': 'Ambiguous known race identity; 2027 edition not added'})
            continue
        confirmed[race['id']] = race
        existing_identities.add(identity(race))
        added += 1
        added_ids.add(race['id'])
        history['changes'].append({'at': now, 'raceId': race['id'], 'sourceUrl': item['sourceUrl'], 'adapter': item['adapter'], 'before': None, 'after': race})
    counts['confirmed2027Added'] = added

    # A source-wide template change should not rewrite many races at once.
    from collections import Counter
    adapter_counts = Counter(o['adapter'] for rec in state['sources'].values() for o in rec.get('observations', {}).values())
    changed_counts = Counter(p['adapter'] for p in proposed)
    blocked_adapters = {a for a,n in changed_counts.items() if n > 10 and n > adapter_counts[a] * .25}
    if blocked_adapters:
        review.append({'reason': 'Adapter mass-change circuit breaker', 'adapters': sorted(blocked_adapters)})
        kept = []
        for p in proposed:
            if p['adapter'] in blocked_adapters:
                pass  # Keep evidence; unchanged race data causes another comparison next run.
            else:
                kept.append(p)
        proposed = kept
    # Stop a broken reader or source redesign from silently rewriting the archive.
    if len(proposed) > max(25, int(len(by_id) * .02)):
        review.append({'reason': 'Mass-change circuit breaker', 'proposedUpdates': len(proposed)})
        proposed = []
    for change in proposed:
        rid = change['raceId']
        existing = overlay['races'].get(rid, {'fields': {}})
        before = {k: by_id[rid].get(k) for k in change['fields']}
        merged = {**existing['fields'], **change['fields']}
        # Place changes invalidate the old approximate map location.
        if 'place' in change['fields']:
            merged.update(lat=None, lon=None, precision='')
        overlay['races'][rid] = {'fields': merged, 'updatedAt': now, 'sourceUrl': change['sourceUrl'], 'adapter': change['adapter']}
        history['changes'].append({'at': now, 'raceId': rid, 'sourceUrl': change['sourceUrl'], 'adapter': change['adapter'], 'before': before, 'after': change['fields']})
    counts['existingDatesUpdated'] = len({p['raceId'] for p in proposed})
    counts['updatedRaces'] = len({p['raceId'] for p in proposed}) + added
    # Review categories distinguish access failures, unsupported readers,
    # and genuine identity/date conflicts. Large source lists must be
    # understandable without downloading thousands of individual rows.
    from collections import Counter
    category_counts = Counter()
    hosts = Counter()
    host_errors = Counter()
    for item in review:
        reason = str(item.get('reason', ''))
        if item.get('deferred'):
            category = 'deferred_host'
        elif 'HTTP Error 403' in reason or 'Forbidden' in reason:
            category = 'blocked_403'
        elif 'HTTP Error 429' in reason or 'rate-limit' in reason.lower():
            category = 'rate_limited'
        elif 'HTTP Error 404' in reason:
            category = 'not_found_404'
        elif 'timed out' in reason.lower() or 'timeout' in reason.lower():
            category = 'timeout'
        elif 'exceeds 8 MiB' in reason:
            category = 'too_large'
        elif 'HTTP Error' in reason or '<urlopen error' in reason or 'name resolution' in reason.lower() or 'Name or service not known' in reason:
            category = 'other_network_error'
        elif 'ambiguous' in reason.lower() or 'conflict' in reason.lower() or 'contradict' in reason.lower():
            category = 'identity_conflict'
        elif 'Mass-change' in reason or 'mass-change' in reason.lower():
            category = 'safety_circuit_breaker'
        elif item.get('details') or 'unparseable' in reason.lower() or 'supported reader' in reason:
            category = 'unsupported_or_changed'
        else:
            category = 'needs_manual_review'
        item['category'] = category
        host = urlsplit(item.get('sourceUrl', '')).hostname or 'unknown'
        item['host'] = host
        category_counts[category] += 1
        if not item.get('deferred'):
            hosts[host] += 1
        if category in ('blocked_403','rate_limited','not_found_404','timeout','too_large','other_network_error'):
            host_errors[host] += 1
    counts['reviewCategories'] = dict(sorted(category_counts.items()))
    counts['topReviewHosts'] = [{'host': h, 'count': n} for h,n in hosts.most_common(20)]
    counts['topErrorHosts'] = [{'host': h, 'count': n} for h,n in host_errors.most_common(15)]
    counts['needsReview'] = sum(not item.get('deferred', False) for item in review)
    counts['recognized2027Sources'] = counts['supportedSources']
    counts['sourcesWith2027Evidence'] = sum(rec.get('status') == 'ok' and rec.get('lastCheckedAt') == now and
                                            bool(rec.get('targetYearEvidence') or rec.get('observations'))
                                            for rec in state['sources'].values())
    counts['newlyConfirmedRaceDates'] = added
    counts['new2027RacesDiscovered'] = len({item['newEdition']['id'] for item in new_editions if not item['newEdition'].get('source2026Id')
                                          and item['newEdition']['id'] in added_ids})
    priority_review = sorted((item for item in review if not item.get('deferred')), key=lambda item: (
        item.get('category') != 'identity_conflict',
        not state['sources'].get(item.get('sourceUrl'), {}).get('targetYearEvidence', False),
        item.get('host') not in ('competitions.ffc.fr', 'www.federciclismo.it', 'cycling.vlaanderen', 'mijn.knwu.nl'),
        item.get('sourceUrl', '')))
    counts['importantUnresolvedSources'] = [{k: item[k] for k in ('sourceUrl', 'reason', 'category') if k in item}
                                           for item in priority_review[:20]]
    counts['reportEntries'] = len(review)
    counts['httpRequests'] = fetcher.requests
    counts['retries'] = fetcher.retries
    counts['deferredHosts'] = dict(sorted(fetcher.blocked.items()))
    counts['durationSeconds'] = round(time.monotonic() - started, 2)
    state['hostCooldowns'] = {host: until for host, until in fetcher.cooldowns.items() if until > time.time()}
    finished = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    # Keep history complete in the data branch (Git also preserves prior snapshots).
    status = {'schemaVersion': 1, 'lastRunAt': finished, 'startedAt': now, 'readerVersion': READER_VERSION, 'complete': counts['attempted'] == len(registry), 'mode': 'fixture' if fixtures else 'live', **counts, 'invalidSourceCount': len(invalid), 'review': review, 'supportedAdapters': ['UCI 2027 competition details', 'FFC event records', 'FCI event records', 'Schema.org Event with exact name and season'], 'targetYear': 2027, 'updateScope': 'verified 2027 dates of known or uniquely identified new UCI/FFC U19 road races', 'note': 'All source URLs are accounted for. Transient failures receive bounded retries; repeated access denials defer the remaining host sources until the next run without bypassing restrictions. Explicit same-site 2027 links are checked with the same identity and date rules. Conflicting dates are retained for review. 2026 archives are preserved.'}
    overlay['updatedAt'] = now
    for name, data in [('state', state), ('overrides', overlay), ('history', history), ('status', {k:v for k,v in status.items() if k != 'review'}), ('report', status)]:
        (out / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(status | {'review': len(review)}, ensure_ascii=False), flush=True)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
            f.write('## Daily source check\n\n' + '\n'.join(f'- {k}: {v}' for k,v in counts.items()) + '\n\nUnsupported or failed sources preserve existing race data. Full details: status.json artifact.\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='sync-data')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--workers', type=int, default=12)
    parser.add_argument('--fixtures')
    run(parser.parse_args())
