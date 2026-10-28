#!/usr/bin/env python3
"""Read every distinct stored source, update supported fields, publish audit data.
No API credentials are needed for crawling. Publishing is a separate workflow step.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import socket
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit, urljoin
from core import transport_url, canonical, extract, validate, changes_from_previous, Page

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 8 * 1024 * 1024
UA = 'YoungPelotonSourceMonitor/1.0 (+https://young-peloton.vercel.app/)'


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


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Fetcher:
    def __init__(self):
        self.lock = threading.Lock()
        self.host_locks = {}
        self.last = {}
        self.blocked = set()
        self.opener = urllib.request.build_opener(NoRedirect())

    def safe(self, url):
        p = urlsplit(canonical(url))
        if p.port not in (None, 80, 443):
            raise ValueError('Non-public port')
        addresses = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == 'https' else 80), type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
            raise ValueError('Non-public address')

    def get(self, url, previous):
        original_host = urlsplit(url).hostname
        original_resource = (urlsplit(url).path.rstrip('/'), urlsplit(url).query)
        for redirect in range(5):
            self.safe(url)
            host = urlsplit(url).hostname
            with self.lock:
                lock = self.host_locks.setdefault(host, threading.Lock())
            with lock:
                if host in self.blocked:
                    raise ValueError('Host rate-limited; deferred until next daily run')
                time.sleep(max(0, 1.0 - (time.monotonic() - self.last.get(host, 0))))
                headers = {'User-Agent': UA, 'Accept': 'text/html,application/json,application/pdf;q=0.8,*/*;q=0.5'}
                if previous.get('etag'):
                    headers['If-None-Match'] = previous['etag']
                if previous.get('lastModified'):
                    headers['If-Modified-Since'] = previous['lastModified']
                try:
                    response = self.opener.open(urllib.request.Request(transport_url(url), headers=headers), timeout=25)
                    try:
                        body = response.read(MAX_BYTES + 1)
                    finally:
                        response.close()
                    if len(body) > MAX_BYTES:
                        raise ValueError('Source exceeds 8 MiB limit; manual reader required')
                    content_type = response.headers.get_content_type()
                    return {'body': body, 'contentType': content_type, 'etag': response.headers.get('ETag'), 'lastModified': response.headers.get('Last-Modified'), 'finalUrl': url, 'redirectedHost': host != original_host or (urlsplit(url).path.rstrip('/'), urlsplit(url).query) != original_resource, 'httpStatus': response.status}
                except urllib.error.HTTPError as e:
                    if e.code == 304:
                        return {'notModified': True, 'httpStatus': 304}
                    if e.code in (301, 302, 303, 307, 308):
                        url = canonical(urljoin(url, e.headers.get('Location', '')))
                        previous = {}  # Validators belong to the resource that issued them.
                        continue
                    if e.code == 429:
                        self.blocked.add(host)
                    raise
                finally:
                    self.last[host] = time.monotonic()
        raise ValueError('Too many redirects')


def run(args):
    now = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    previous = read_json(out / 'state.json', {'sources': {}})
    old_overlay = read_json(out / 'overrides.json', {'schemaVersion': 1, 'races': {}})
    overlay = json.loads(json.dumps(old_overlay))
    history = read_json(out / 'history.json', {'changes': []})
    races = load_races()
    by_id = {r['id']: {**r, **overlay['races'].get(r['id'], {}).get('fields', {})} for r in races}
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
            entry = registry.setdefault(url, {'races': set(), 'primary': set()})
            entry['races'].add(r['id'])
            if field == 'sourceUrl' and r.get('state') != 'merged' and not r.get('duplicate'):
                entry['primary'].add(r['id'])
    # Interleave hosts so thousands of one federation's pages don't block all workers.
    from collections import defaultdict, deque
    groups = defaultdict(deque)
    for u in sorted(registry):
        groups[urlsplit(u).hostname].append(u)
    priority = [u for u in registry if any(i.startswith('uci-2027-') for i in registry[u]['races'])]
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
    state = {'schemaVersion': 1, 'sources': dict(previous.get('sources', {}))}
    proposed = []
    counts = {'totalSources': len(registry), 'attempted': 0, 'successful': 0, 'errors': 0, 'supportedSources': 0, 'changedSources': 0, 'needsReview': 0, 'updatedRaces': 0}
    review = []
    fixtures = Path(args.fixtures) if args.fixtures else None

    def check(url):
        prev = previous.get('sources', {}).get(url, {})
        record = {**prev, 'lastAttemptAt': now}
        try:
            if fixtures:
                fixture = fixtures / (hashlib.sha256(url.encode()).hexdigest() + '.html')
                if not fixture.exists():
                    raise ValueError('No test fixture for source')
                result = {'body': fixture.read_bytes(), 'contentType': 'text/html', 'finalUrl': url, 'redirectedHost': False, 'httpStatus': 200}
            else:
                result = fetcher.get(url, prev)
            if result.get('notModified'):
                # 304 means the previous successful representation is still current,
                # not that an unsupported page has suddenly been parsed.
                if not prev.get('hash'):
                    raise ValueError('304 without a prior successful baseline')
                record.update(status='ok', lastCheckedAt=now, httpStatus=304, changed=False)
                record.pop('error', None)
                pending_review = {'sourceUrl': url, 'reason': 'Previously detected source change still needs a supported reader or review'} if record.get('needsReview') else None
                return url, record, [], pending_review
            body = result.pop('body')
            raw_hash = hashlib.sha256(body).hexdigest()
            decoded = body.decode('utf-8', errors='replace')
            page_hash = raw_hash
            if 'html' in result['contentType']:
                page = Page(decoded)
                # Exclude scripts/tokens and style churn from unsupported-page notices.
                page_hash = hashlib.sha256('\n'.join(page.lines).encode()).hexdigest()
            observations = dict(prev.get('observations', {}))
            updates, parse_errors = [], []
            supported = 0
            if not result['redirectedHost']:
                # Shared calendar URLs cannot safely identify individual subraces
                # unless the reader itself verifies a stable ID.
                for rid in sorted(registry[url]['primary']):
                    race = by_id[rid]
                    try:
                        observed = extract(decoded, result['contentType'], race, url)
                        if observed:
                            fields = validate(observed['fields'], race)
                            supported += 1
                            old = prev.get('observations', {}).get(rid)
                            if old and set(old['fields']) - set(fields):
                                parse_errors.append({'raceId': rid, 'reason': 'Previously readable fields disappeared'})
                            delta = changes_from_previous(old.get('fields') if old else None, fields, race)
                            if delta:
                                # Validate the merged result, not just changed fields.
                                validate({**{k:v for k,v in fields.items() if k in ('date','enddate')}, **delta}, race)
                                updates.append({'raceId': rid, 'fields': delta, 'sourceUrl': url, 'adapter': observed['adapter'], 'previousFields': old['fields']})
                            observations[rid] = observed
                    except (ValueError, KeyError, TypeError) as e:
                        parse_errors.append({'raceId': rid, 'reason': str(e)[:200]})
            changed = bool(prev.get('hash') and prev['hash'] != page_hash)
            if supported:
                # For supported readers, actual field changes are the meaningful signal.
                changed = bool(updates or parse_errors)
            needs_review = bool(parse_errors or result['redirectedHost'] or (changed and not supported) or (prev.get('observations') and not supported) or (prev.get('needsReview') and not supported))
            record.update(result, hash=page_hash, rawHash=raw_hash, status='ok', lastCheckedAt=now, observations=observations, supportedRecords=supported, changed=changed, needsReview=needs_review)
            for key in ('error',):
                record.pop(key, None)
            reason = {'sourceUrl': url, 'reason': 'Changed or unparseable source; no speculative update', 'details': parse_errors[:10]} if needs_review else None
            return url, record, updates, reason
        except Exception as e:
            # A fetch failure is never an event cancellation or a deletion.
            record.update(status='error', error=str(e)[:250], changed=False)
            return url, record, [], {'sourceUrl': url, 'reason': record['error']}

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for url, record, updates, issue in pool.map(check, urls):
            state['sources'][url] = record
            counts['attempted'] += 1
            counts['successful' if record['status'] == 'ok' else 'errors'] += 1
            counts['supportedSources'] += int(record['status'] == 'ok' and record.get('supportedRecords', 0) > 0)
            counts['changedSources'] += int(record.get('changed', False))
            if issue:
                counts['needsReview'] += 1
                review.append(issue)
            proposed.extend(updates)
            if counts['attempted'] % 100 == 0:
                print(json.dumps(counts), flush=True)

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
                state['sources'][p['sourceUrl']]['observations'][p['raceId']]['fields'] = p['previousFields']
            else:
                kept.append(p)
        proposed = kept
    # Stop a broken reader or source redesign from silently rewriting the archive.
    if len(proposed) > max(25, int(len(by_id) * .02)):
        review.append({'reason': 'Mass-change circuit breaker', 'proposedUpdates': len(proposed)})
        for p in proposed:
            state['sources'][p['sourceUrl']]['observations'][p['raceId']]['fields'] = p['previousFields']
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
    counts['updatedRaces'] = len({p['raceId'] for p in proposed})
    # Keep history complete in the data branch (Git also preserves prior snapshots).
    status = {'schemaVersion': 1, 'lastRunAt': now, 'complete': len(urls) == len(registry), 'mode': 'fixture' if fixtures else 'live', **counts, 'invalidSourceCount': len(invalid), 'review': review, 'supportedAdapters': ['UCI 2027 competition details', 'FFC event records', 'FCI event records', 'Schema.org Event with exact name and season'], 'note': 'All stored source/proof/result URLs are monitored. Unsupported pages and PDFs are change-detected only; failed sources never alter race data.'}
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
