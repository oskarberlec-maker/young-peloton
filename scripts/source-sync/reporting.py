"""Classify review items without confusing 'unambiguous' with 'ambiguous'."""
import re
from collections import Counter, defaultdict
from urllib.parse import urlsplit


REVIEW_REASONS = {
    'lost_2027_evidence': 'Previously verified 2027 evidence is no longer readable',
    'unsupported_or_changed': 'Supported reader could not parse this source; no speculative update',
    'needs_reader_2027': 'Source shows 2027 dates but no supported reader can verify them',
    'pdf_2027_review': 'PDF mentions 2027; manual identity and category review required',
    'redirected': 'Source redirects to a different resource; update the stored URL',
}
# Categories assigned explicitly by callers, never inferred from message text.
EXPLICIT_CATEGORIES = {'date_conflict', 'identity_conflict', 'eligibility_unverified', 'detail_unavailable',
                       'host_parked', *REVIEW_REASONS}


def review_reasons(target_year, supported, parse_errors, redirected, had_2027):
    """Why a freshly read source needs a person, most important first.

    A changed page without 2027 evidence is not a reason: 2026 pages change
    constantly and their churn buried the actionable items.
    """
    reasons = []
    if had_2027 and not supported:
        reasons.append('lost_2027_evidence')
    if parse_errors:
        reasons.append('unsupported_or_changed')
    if target_year and not supported and not had_2027:
        reasons.append('needs_reader_2027')
    if redirected:
        reasons.append('redirected')
    return reasons


def legacy_review_reasons(record):
    """Reclassify a pre-V10 record on a 304, from its stored evidence only."""
    from scheduling import had_2027_evidence
    if record.get('supportedRecords') or record.get('ffcCalendarEntries'):
        return []
    if had_2027_evidence(record):
        return ['lost_2027_evidence']
    if record.get('pdfEvidence'):
        return ['pdf_2027_review'] if record['pdfEvidence'].get('has2027') else []
    if record.get('targetYearEvidence') and not record.get('ffcNonJunior'):
        return ['needs_reader_2027']
    return []


def review_issue(url, reasons, details=()):
    if not reasons:
        return None
    issue = {'sourceUrl': url, 'reason': REVIEW_REASONS[reasons[0]], 'category': reasons[0], 'reasons': list(reasons)}
    if details:
        issue['details'] = list(details)[:10]
    return issue


def host_summaries(review, registry, sources, started_at, limit=25):
    """Group review items and reader gaps by host so a person can act per site.

    reviewByHost: non-deferred review items per host with their categories.
    hostsWithoutReader: sources reached this run that no reader could use,
    ranked by the number of distinct races they are linked to. This is the
    priority list for writing new readers.
    """
    by_host = defaultdict(Counter)
    for item in review:
        if not item.get('deferred'):
            by_host[item.get('host') or urlsplit(item.get('sourceUrl', '')).hostname or 'unknown'][item.get('category', 'other')] += 1
    review_rows = sorted(({'host': host, 'items': sum(c.values()), 'categories': dict(sorted(c.items()))}
                          for host, c in by_host.items()), key=lambda r: (-r['items'], r['host']))
    gaps = defaultdict(lambda: {'sources': 0, 'races': set(), 'with2027Dates': 0})
    for url, record in sources.items():
        if (record.get('lastAttemptAt') != started_at or record.get('status') != 'ok' or record.get('supportedRecords')
                or record.get('ffcCalendarEntries') or record.get('ffcNonJunior') or record.get('historicalOnly')):
            continue
        row = gaps[urlsplit(url).hostname or 'unknown']
        row['sources'] += 1
        row['races'].update(registry.get(url, {}).get('races', ()))
        row['with2027Dates'] += int(bool(record.get('targetYearEvidence')))
    gap_rows = sorted(({'host': host, 'sources': row['sources'], 'races': len(row['races']),
                        'with2027Dates': row['with2027Dates']} for host, row in gaps.items()),
                      key=lambda r: (-r['races'], -r['sources'], r['host']))
    return {'reviewByHost': review_rows[:limit], 'hostsWithoutReader': gap_rows[:limit]}


def coverage(registry, sources, races, started_at, skipped=None):
    """Disjoint outcomes per country, using only this run's source attempts.

    Reachability and readable race evidence are different. No detected evidence
    does not establish that the federation has not published its calendar.
    Shared URLs count once per associated country; country totals may overlap.
    Sources deliberately not checked this run (weekly rotation, parked host)
    are reported as their own outcomes, never as successes.
    """
    skipped = skipped or {}
    countries = defaultdict(Counter)
    totals = Counter()
    for url, links in registry.items():
        record = sources.get(url, {})
        status = record.get('status')
        if url in skipped:
            outcome = skipped[url]
        elif record.get('lastAttemptAt') != started_at:
            continue
        elif status in ('error', 'deferred'):
            outcome = status
        elif status != 'ok':
            continue
        elif record.get('supportedRecords'):
            outcome = 'structuredEvidence'
        elif record.get('ffcCalendarEntries'):
            outcome = 'calendarRead'
        elif record.get('ffcNonJunior'):
            outcome = 'nonJunior'
        elif record.get('needsReview') or record.get('targetYearEvidence'):
            outcome = 'needsReaderOrReview'
        elif record.get('historicalOnly'):
            outcome = 'historicalOnly'
        else:
            outcome = 'noTargetEvidenceDetected'
        totals[outcome] += 1
        codes = {races[rid].get('countryCode') for rid in links['races'] if rid in races}
        # Discovery seeds have no race ID yet.
        host = urlsplit(url).hostname
        if host == 'competitions.ffc.fr':
            codes.add('FR')
        if host == 'swecyclingonline.se':
            codes.add('SE')
        for code in codes - {None, ''}:
            countries[code][outcome] += 1
            countries[code]['total'] += 1
    return {'sourceOutcomes': dict(sorted(totals.items())),
            'countryCoverage': [{'countryCode': code, **dict(sorted(counts.items()))}
                                for code, counts in sorted(countries.items())]}


def review_category(item):
    reason = str(item.get('reason', ''))
    lower = reason.lower()
    if item.get('deferred'):
        return 'deferred_host'
    if 'HTTP Error 403' in reason or 'Forbidden' in reason:
        return 'blocked_403'
    if 'HTTP Error 429' in reason or 'rate-limit' in lower:
        return 'rate_limited'
    if 'HTTP Error 404' in reason:
        return 'not_found_404'
    if 'timed out' in lower or 'timeout' in lower:
        return 'timeout'
    if 'exceeds 8 MiB' in reason:
        return 'too_large'
    if any(s in lower for s in ('http error', '<urlopen error', 'name resolution', 'name or service not known')):
        return 'other_network_error'
    # New callers provide structured categories; keep the fallback compatible
    # with older readers and stored review messages.
    if item.get('category') in EXPLICIT_CATEGORIES:
        return item['category']
    if re.search(r'\b(conflicting|contradictory)\b.*\bdates\b', lower):
        return 'date_conflict'
    if re.search(r'\b(ambiguous|conflict|conflicting|contradictory)\b', lower):
        return 'identity_conflict'
    if 'awaits unambiguous u19 road detail verification' in lower:
        return 'eligibility_unverified'
    if 'mass-change' in lower:
        return 'safety_circuit_breaker'
    if item.get('details') or 'unparseable' in lower or 'supported reader' in lower:
        return 'unsupported_or_changed'
    return 'needs_manual_review'
