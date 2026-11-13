"""Conflicting official dates need review; iteration order must never decide."""
from collections import defaultdict
from confirmations import identity


def unique_evidence(items):
    # Multiple race aliases/calendar windows may repeat the same observation.
    seen, result = set(), []
    for item in items:
        dates = item.get('fields', item)
        key = (item['sourceUrl'], dates['date'], dates['enddate'])
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def reconcile(proposals, new_editions, verified=()):
    review = []
    accepted = []
    grouped = defaultdict(list)
    for change in proposals:
        grouped[change['raceId']].append(change)
    for item in verified:
        grouped.setdefault(item['raceId'], [])
    for rid, changes in sorted(grouped.items()):
        evidence = changes + [item for item in verified if item['raceId'] == rid]
        pairs = {(item['fields']['date'], item['fields']['enddate']) for item in evidence}
        if len(pairs) > 1:
            review.append({'raceId': rid, 'sourceUrl': evidence[0]['sourceUrl'],
                           'category': 'date_conflict', 'reason': 'Conflicting 2027 dates from supported sources; existing dates retained',
                           'evidence': unique_evidence([{'sourceUrl': item['sourceUrl'], 'fields': item['fields']} for item in evidence])})
        elif changes:
            accepted.append(changes[0])
    editions = []
    grouped = defaultdict(list)
    for item in new_editions:
        grouped[identity(item['newEdition'])].append(item)
    for _, candidates in sorted(grouped.items()):
        pairs = {(item['newEdition']['date'], item['newEdition']['enddate']) for item in candidates}
        if len(pairs) > 1:
            review.append({'sourceUrl': candidates[0]['sourceUrl'],
                           'category': 'date_conflict', 'reason': 'Conflicting 2027 edition dates; no new edition added',
                           'evidence': unique_evidence([{'sourceUrl': item['sourceUrl'], 'date': item['newEdition']['date'],
                                         'enddate': item['newEdition']['enddate']} for item in candidates])})
        else:
            editions.extend(candidates)
    return accepted, editions, review
