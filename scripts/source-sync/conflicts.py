"""Conflicting official dates need review; iteration order must never decide."""
from collections import defaultdict
from confirmations import identity


def reconcile(proposals, new_editions, verified=()):
    review = []
    accepted = []
    grouped = defaultdict(list)
    for change in proposals:
        grouped[change['raceId']].append(change)
    for rid, changes in sorted(grouped.items()):
        evidence = changes + [item for item in verified if item['raceId'] == rid]
        pairs = {(item['fields']['date'], item['fields']['enddate']) for item in evidence}
        if len(pairs) > 1:
            review.append({'raceId': rid, 'sourceUrl': changes[0]['sourceUrl'],
                           'reason': 'Conflicting 2027 dates from supported sources; existing dates retained',
                           'evidence': [{'sourceUrl': item['sourceUrl'], 'fields': item['fields']} for item in evidence]})
        else:
            accepted.append(changes[0])
    editions = []
    grouped = defaultdict(list)
    for item in new_editions:
        grouped[identity(item['newEdition'])].append(item)
    for _, candidates in sorted(grouped.items()):
        pairs = {(item['newEdition']['date'], item['newEdition']['enddate']) for item in candidates}
        if len(pairs) > 1:
            review.append({'sourceUrl': candidates[0]['sourceUrl'],
                           'reason': 'Conflicting 2027 edition dates; no new edition added',
                           'evidence': [{'sourceUrl': item['sourceUrl'], 'date': item['newEdition']['date'],
                                         'enddate': item['newEdition']['enddate']} for item in candidates]})
        else:
            editions.extend(candidates)
    return accepted, editions, review
