"""Skip redundant scheduled scans after a complete live publication that day."""
import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

LOCAL = ZoneInfo('Europe/Ljubljana')


def should_scan(event, status, now):
    # Manual runs and code upgrades must always execute.
    if event != 'schedule' or status.get('complete') is not True or status.get('mode') != 'live':
        return True
    try:
        finished = dt.datetime.fromisoformat(status['lastRunAt'].replace('Z', '+00:00'))
        if finished.tzinfo is None or finished > now:
            return True
        return finished.astimezone(LOCAL).date() != now.astimezone(LOCAL).date()
    except (KeyError, TypeError, ValueError, AttributeError):
        return True


def main():
    path = Path('sync-data/status.json')
    try:
        status = json.loads(path.read_text()) if path.exists() else {}
        if not isinstance(status, dict):
            status = {}
    except (ValueError, OSError):
        status = {}
    run = should_scan(os.environ.get('GITHUB_EVENT_NAME'), status, dt.datetime.now(dt.timezone.utc))
    message = ('Starting source scan.' if run else
               'Skipped redundant scheduled scan: a complete live report was already published today (Europe/Ljubljana).')
    print(message)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write('run=' + str(run).lower() + '\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write(message + '\n')


if __name__ == '__main__':
    main()
