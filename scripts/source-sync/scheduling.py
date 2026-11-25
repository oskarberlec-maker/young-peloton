"""Decide which sources are checked today and which hosts are parked.

Sources that can affect 2027 data are checked daily. Sources whose last full
read found no 2027 evidence at all are revisited on a weekly rotation. Hosts
that refuse access for several consecutive days are parked and probed weekly
instead of being re-denied (and reported as thousands of deferrals) every day.
"""
import datetime as dt
import hashlib
from urllib.parse import urlsplit

COLD_INTERVAL_DAYS = 7
HOST_PARK_AFTER_DAYS = 3
HOST_PROBE_INTERVAL_DAYS = 7


def had_2027_evidence(record):
    """Validated 2027 observations only; legacy hadTargetEvidence is ignored.

    Earlier reader versions set hadTargetEvidence from 2026-era observations,
    which then kept thousands of 2026 pages permanently in review.
    """
    if 'had2027Evidence' in record:
        return bool(record['had2027Evidence'])
    return bool(record.get('observations'))


def is_cold(record, reader_version):
    """A source whose last full read found nothing that can affect 2027 data."""
    if not record or record.get('status') != 'ok' or record.get('readerVersion') != reader_version:
        return False
    if record.get('notModified') and not record.get('hash'):
        return False
    return not any((
        record.get('observations'), record.get('supportedRecords'), record.get('targetYearEvidence'),
        had_2027_evidence(record), record.get('ffcCalendarEntries'), record.get('ffcDetail'),
        record.get('ffcNonJunior'), record.get('uciDetail'), record.get('reviewReasons'),
        record.get('discoveryCandidates'),
    ))


def rotation_slot(url, interval=COLD_INTERVAL_DAYS):
    return int(hashlib.sha256(url.encode()).hexdigest()[:8], 16) % interval


def cold_due(url, record, today, interval=COLD_INTERVAL_DAYS):
    """Weekly rotation, with a catch-up when a slot was missed (e.g. skipped run)."""
    if today.toordinal() % interval == rotation_slot(url, interval):
        return True
    try:
        last = dt.date.fromisoformat(str(record.get('lastCheckedAt', ''))[:10])
    except ValueError:
        return True
    return (today - last).days > interval


def parked_hosts(blocks):
    return {host for host, block in blocks.items() if block.get('days', 0) >= HOST_PARK_AFTER_DAYS}


def probe_due(block, today):
    try:
        last = dt.date.fromisoformat(str(block.get('lastProbeAt', ''))[:10])
    except ValueError:
        return True
    return (today - last).days >= HOST_PROBE_INTERVAL_DAYS


def choose_probes(urls, sources, parked, blocks, today):
    """One URL per parked host whose weekly probe is due: the least recently tried."""
    by_host = {}
    for url in urls:
        host = urlsplit(url).hostname
        if host in parked and probe_due(blocks[host], today):
            by_host.setdefault(host, []).append(url)
    return {host: min(candidates, key=lambda u: (str(sources.get(u, {}).get('lastAttemptAt', '')), u))
            for host, candidates in by_host.items()}


def reachable(record):
    """The host answered: success, 304 or a page-level 404/410."""
    return record.get('status') == 'ok' or record.get('httpStatus') in (404, 410)


def update_host_blocks(blocks, attempted, run_blocked, probed, today, now):
    """Count consecutive blocked days per host. One increment per calendar day.

    attempted: {host: [records attempted this run]}
    run_blocked: {host: reason} hosts the fetcher deferred during this run
    probed: hosts whose parked probe was attempted this run
    """
    result = {host: dict(block) for host, block in blocks.items()}
    for host, records in attempted.items():
        if any(reachable(record) for record in records):
            result.pop(host, None)
            continue
        blocked = host in run_blocked or host in probed
        if not blocked:
            continue
        block = result.setdefault(host, {'days': 0, 'since': now})
        if block.get('lastBlockedDay') != today.isoformat():
            block['days'] = block.get('days', 0) + 1
            block['lastBlockedDay'] = today.isoformat()
        block['reason'] = run_blocked.get(host) or block.get('reason') or 'Parked host probe failed'
        if host in probed:
            block['lastProbeAt'] = now
    # A newly parked host gets its first probe one interval later.
    for host, block in result.items():
        if block.get('days', 0) >= HOST_PARK_AFTER_DAYS and 'lastProbeAt' not in block:
            block['lastProbeAt'] = now
    return result
