import datetime as dt
import unittest
import urllib.error
import tempfile
from pathlib import Path
from unittest.mock import patch
from reporting import coverage
from schedule_guard import should_scan
import test_reliability as reliability
from test_reliability import http_error, response
from transport import DeferredSource
from core import Page
from federation_calendar import has_year_dates


class ScheduleTests(unittest.TestCase):
    def test_only_complete_live_same_local_day_skips_schedule(self):
        now = dt.datetime.fromisoformat('2026-11-15T05:00:00+00:00')
        report = {'mode': 'live', 'complete': True, 'lastRunAt': '2026-11-15T04:30:00Z'}
        self.assertFalse(should_scan('schedule', report, now))
        for event in ('push', 'workflow_dispatch'):
            self.assertTrue(should_scan(event, report, now))
        for replacement in ({'mode': 'fixture'}, {'complete': False}, {'lastRunAt': 'invalid'},
                            {'lastRunAt': '2026-11-15T06:00:00Z'},
                            {'lastRunAt': '2026-11-15T04:30:00'}, {'lastRunAt': None},
                            {'lastRunAt': '2026-11-14T14:00:00Z'}):
            self.assertTrue(should_scan('schedule', report | replacement, now))
        self.assertTrue(should_scan('schedule', {}, now))

    def test_local_midnight_and_summer_time(self):
        for now, completed in [('2026-11-15T00:30:00+00:00', '2026-11-14T23:30:00Z'),
                               ('2027-06-15T00:30:00+00:00', '2027-06-14T22:30:00Z')]:
            self.assertFalse(should_scan('schedule', {'mode': 'live', 'complete': True,
                              'lastRunAt': completed}, dt.datetime.fromisoformat(now)))


class HostFailureTests(unittest.TestCase):
    @patch('transport.time.sleep')
    def test_exhausted_timeouts_defer_host_but_not_another_host(self, sleep):
        fetcher = reliability.FetchReliability().fetcher([TimeoutError('timed out')] * 9 + [response()])
        for i in range(3):
            with self.assertRaises(TimeoutError):
                fetcher.get(f'https://example.org/{i}', {})
        with self.assertRaises(DeferredSource):
            fetcher.get('https://example.org/fourth', {})
        self.assertEqual(fetcher.requests, 9)
        self.assertEqual(fetcher.get('https://other.org/race', {})['httpStatus'], 200)
        self.assertEqual(fetcher.retries, 6)

    @patch('transport.time.sleep')
    def test_success_and_304_reset_failure_streak(self, sleep):
        for success in (response(), http_error(304)):
            fetcher = reliability.FetchReliability().fetcher([http_error(503) for _ in range(6)] + [success]
                                               + [http_error(503) for _ in range(6)])
            for i in range(2):
                with self.assertRaises(urllib.error.HTTPError):
                    fetcher.get(f'https://example.org/{i}', {})
            fetcher.get('https://example.org/recovered', {})
            for i in range(2):
                with self.assertRaises(urllib.error.HTTPError):
                    fetcher.get(f'https://example.org/again/{i}', {})
            self.assertNotIn('example.org', fetcher.blocked)

    @patch('transport.time.sleep')
    def test_missing_individual_pages_do_not_close_host(self, sleep):
        fetcher = reliability.FetchReliability().fetcher([http_error(404) for _ in range(4)] + [response()])
        for i in range(4):
            with self.assertRaises(urllib.error.HTTPError):
                fetcher.get(f'https://example.org/{i}', {})
        self.assertEqual(fetcher.get('https://example.org/valid', {})['httpStatus'], 200)


class CoverageTests(unittest.TestCase):
    def test_pipeline_reports_homepage_as_unknown_not_historical(self):
        helper = reliability.PipelineReliability()
        race = helper.race | {'sourceUrl': 'https://example.org/calendar'}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            fixtures = path / 'fixtures'
            fixtures.mkdir()
            helper.fixture(fixtures, race['sourceUrl'], '<h1>Calendar</h1><footer>Copyright 2026</footer>')
            result = helper.scan(path, fixtures, race=race)
            self.assertEqual(result['status']['historicalSources'], 0)
            self.assertEqual(result['status']['sourceOutcomes'], {'noTargetEvidenceDetected': 1})
            self.assertEqual(result['status']['countryCoverage'][0]['countryCode'], 'SI')
            self.assertFalse(result['overrides']['confirmed2027'])

    def test_copyright_is_not_evidence_of_an_archived_calendar(self):
        self.assertFalse(has_year_dates(Page('<h1>Calendar</h1><footer>Copyright 2026</footer>'), 2026))
        for date in ('2026-05-07', '07/05/2026', '7 mai 2026'):
            self.assertTrue(has_year_dates(Page('<p>' + date + '</p>'), 2026))

    def test_success_does_not_mean_parsed_and_stale_success_is_not_counted(self):
        now = '2026-11-15T05:00:00Z'
        rows = {
            'https://swecyclingonline.se/': {'status': 'ok'},
            'https://example.org/old': {'status': 'ok', 'historicalOnly': True},
            'https://example.org/new': {'status': 'ok', 'supportedRecords': 1},
            'https://example.org/error': {'status': 'error', 'supportedRecords': 1},
            'https://example.org/review': {'status': 'ok', 'targetYearEvidence': True},
            'https://example.org/deferred': {'status': 'deferred'},
        }
        sources = {url: record | {'lastAttemptAt': now} for url, record in rows.items()}
        sources['https://example.org/stale'] = {'status': 'ok', 'supportedRecords': 1,
                                               'lastAttemptAt': '2026-11-14T05:00:00Z'}
        registry = {url: {'races': {'a', 'b'}} for url in sources}
        result = coverage(registry, sources, {'a': {'countryCode': 'SE'}, 'b': {'countryCode': 'SE'}}, now)
        self.assertEqual(sum(result['sourceOutcomes'].values()), 6)
        self.assertEqual(result['countryCoverage'][0]['total'], 6)
        self.assertEqual(result['sourceOutcomes']['structuredEvidence'], 1)
        self.assertEqual(result['sourceOutcomes']['noTargetEvidenceDetected'], 1)
        self.assertEqual(result['sourceOutcomes']['needsReaderOrReview'], 1)
        self.assertEqual(result['sourceOutcomes']['error'], 1)


if __name__ == '__main__':
    unittest.main()
