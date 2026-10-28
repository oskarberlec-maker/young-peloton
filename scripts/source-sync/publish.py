#!/usr/bin/env python3
"""Restore/publish public data using a short-lived repository-scoped Actions token."""
import base64
import json
import os
from pathlib import Path
import sys
import urllib.request
import urllib.error

BRANCH = 'race-source-data'
FILES = ['state.json', 'overrides.json', 'history.json', 'status.json', 'report.json']
OUT = Path('sync-data')
REPO = os.environ['GITHUB_REPOSITORY']
TOKEN = os.environ['GH_TOKEN']


def api(path, data=None, method=None):
    req = urllib.request.Request('https://api.github.com/repos/' + REPO + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'YoungPelotonSourceMonitor'}, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def head():
    try:
        return api('/git/ref/heads/' + BRANCH)['object']['sha']
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def restore():
    OUT.mkdir(exist_ok=True)
    sha = head()
    (OUT / '_parent.txt').write_text(sha or '')
    if not sha:
        return
    commit = api('/git/commits/' + sha)
    tree = api('/git/trees/' + commit['tree']['sha'])
    entries = {x['path']: x for x in tree['tree']}
    for name in FILES:
        if name in entries:
            blob = api('/git/blobs/' + entries[name]['sha'])
            raw = base64.b64decode(blob['content'])
            json.loads(raw)  # Don't carry corrupt snapshots into a new run.
            (OUT / name).write_bytes(raw)


def publish():
    previous = (OUT / '_parent.txt').read_text().strip() or None
    if head() != previous:
        raise RuntimeError('Data branch changed concurrently; refusing to overwrite')
    status = json.loads((OUT / 'status.json').read_text())
    if status.get('mode') != 'live' or not status.get('complete'):
        raise RuntimeError('Only complete live scans may be published')
    tree = []
    for name in FILES:
        raw = (OUT / name).read_text()
        blob = api('/git/blobs', {'content': raw, 'encoding': 'utf-8'})
        tree.append({'path': name, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
    tree_sha = api('/git/trees', {'tree': tree})['sha']
    commit = api('/git/commits', {'message': 'Daily source check: ' + status['lastRunAt'] + ' (' + str(status['updatedRaces']) + ' race updates)', 'tree': tree_sha, 'parents': [previous] if previous else []})
    if previous:
        api('/git/refs/heads/' + BRANCH, {'sha': commit['sha'], 'force': False}, 'PATCH')
    else:
        api('/git/refs', {'ref': 'refs/heads/' + BRANCH, 'sha': commit['sha']})
    print('Published source snapshot ' + commit['sha'])


if __name__ == '__main__':
    {'restore': restore, 'publish': publish}[sys.argv[1]]()
