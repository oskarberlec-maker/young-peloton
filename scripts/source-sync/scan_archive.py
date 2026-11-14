"""Small run index with permanent report paths; never confuse edits with scans."""
import json
from pathlib import Path


def append_scan(out, status, repo, report_url=None):
    out = Path(out)
    source = out / 'scans.json'
    if not source.exists():
        source = Path(__file__).resolve().parents[2] / 'public/data/scan-history.json'
    archive = json.loads(source.read_text()) if source.exists() else {'schemaVersion': 1, 'runs': []}
    # Numeric timestamp characters only; safe as a path even for unexpected input.
    key = ''.join(c for c in status['lastRunAt'] if c.isdigit())
    if not key:
        raise ValueError('Missing scan timestamp')
    report_path = 'scans/' + key + '.json'
    run = {k: v for k, v in status.items() if k != 'review'}
    run['reportUrl'] = report_url or f'https://raw.githubusercontent.com/{repo}/race-source-data/{report_path}'
    runs = {r['lastRunAt']: r for r in archive['runs']}
    runs[run['lastRunAt']] = run
    archive = {'schemaVersion': 1, 'runs': sorted(runs.values(), key=lambda r: r['lastRunAt'], reverse=True)}
    (out / 'scans.json').write_text(json.dumps(archive, ensure_ascii=False, separators=(',', ':')) + '\n')
    return report_path
