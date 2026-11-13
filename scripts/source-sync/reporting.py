"""Classify review items without confusing 'unambiguous' with 'ambiguous'."""
import re


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
    if item.get('category') in ('date_conflict', 'identity_conflict', 'eligibility_unverified', 'detail_unavailable'):
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
