import argparse
import contextlib
from email.message import Message
import hashlib
import io
import json
import socket
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error
from core import Page
from conflicts import reconcile
from discovery import edition_links
from confirmations import dates_only
from transport import Fetcher, DeferredSource
import run


def http_error(code, retry_after=None):
    headers = Message()
    if retry_after:
        headers['Retry-After'] = retry_after
    return urllib.error.HTTPError('https://example.org/race', code, 'failure', headers, None)


def response():
    headers = Message()
    headers['Content-Type'] = 'text/html'
    return Mock(headers=headers, status=200, read=Mock(return_value=b'<html>ok</html>'))


class FetchReliability(unittest.TestCase):
    def fetcher(self, results):
        fetcher = Fetcher()
        fetcher.safe = Mock()
        fetcher.opener = Mock(open=Mock(side_effect=results))
        return fetcher

    @patch('transport.time.sleep')
    def test_temporary_dns_failure_retries_before_request(self, sleep):
        fetcher = self.fetcher([response()])
        fetcher.safe.side_effect = [socket.gaierror(socket.EAI_AGAIN, 'Temporary failure in name resolution'), None]
        self.assertEqual(fetcher.get('https://example.org/race', {})['httpStatus'], 200)
        self.assertEqual(fetcher.requests, 1)
        self.assertEqual(fetcher.retries, 1)

    @patch('transport.time.sleep')
    def test_transient_failure_retries_then_succeeds(self, sleep):
        fetcher = self.fetcher([http_error(503), TimeoutError(), response()])
        self.assertEqual(fetcher.get('https://example.org/race', {})['httpStatus'], 200)
        self.assertEqual(fetcher.requests, 3)
        self.assertEqual(fetcher.retries, 2)

    @patch('transport.time.sleep')
    def test_no_retry_for_denials_and_host_stops_after_three(self, sleep):
        fetcher = self.fetcher([http_error(403) for _ in range(3)])
        for i in range(3):
            with self.assertRaises(urllib.error.HTTPError):
                fetcher.get('https://example.org/race/' + str(i), {})
        with self.assertRaises(DeferredSource):
            fetcher.get('https://example.org/another', {})
        self.assertEqual(fetcher.requests, 3)
        self.assertEqual(fetcher.retries, 0)

    @patch('transport.time.sleep')
    def test_rate_limit_is_not_retried_and_long_pause_survives_next_run(self, sleep):
        fetcher = self.fetcher([http_error(429, '172800')])
        with self.assertRaises(urllib.error.HTTPError):
            fetcher.get('https://example.org/race', {})
        next_run = self.fetcher([])
        next_run.cooldowns = fetcher.cooldowns.copy()
        with self.assertRaises(DeferredSource):
            next_run.get('https://example.org/another', {})
        self.assertEqual(next_run.requests, 0)

    @patch('transport.time.sleep')
    def test_redirect_drops_validators(self, sleep):
        redirect = http_error(302)
        redirect.headers['Location'] = '/2027/race'
        fetcher = self.fetcher([redirect, response()])
        result = fetcher.get('https://example.org/race', {'etag': 'old-resource'})
        requests = [call.args[0] for call in fetcher.opener.open.call_args_list]
        self.assertEqual(requests[0].get_header('If-none-match'), 'old-resource')
        self.assertIsNone(requests[1].get_header('If-none-match'))
        self.assertTrue(result['redirectedHost'])

    @patch('transport.time.sleep')
    def test_not_found_is_never_retried(self, sleep):
        fetcher = self.fetcher([http_error(404)])
        with self.assertRaises(urllib.error.HTTPError):
            fetcher.get('https://example.org/race', {})
        self.assertEqual(fetcher.requests, 1)


class DiscoveryAndConflicts(unittest.TestCase):
    def test_linked_ffc_edition_can_publish_a_new_id_only_with_exact_name_and_season(self):
        race = {**PipelineReliability.race, 'id': 'FR-FFC-OLD'}
        text = "<h1>Junior Tour</h1><p>N° d'épreuve</p><p>NEW</p><p>Saison</p><p>2027</p><p>vendredi 07 mai 2027</p><p>Durée</p><p>1 jour</p>"
        url = 'https://competitions.ffc.fr/2027/NEW/tour/'
        self.assertIsNone(dates_only(text, 'text/html', race, url))
        result = dates_only(text, 'text/html', race, url, linked_edition=True)
        self.assertEqual(result['fields']['date'], '2027-05-07')
        self.assertIsNone(dates_only(text.replace('Junior Tour', 'Other Tour'), 'text/html', race, url, linked_edition=True))

    def test_only_explicit_same_origin_edition_links(self):
        page = Page('<h1>Junior Tour</h1><a href="/2027/tour">2027 edition</a>'
                    '<a href="/2027/tour#top">Again</a><a href="https://other.org/2027/tour">2027</a>'
                    '<a href="/2027/results.pdf">PDF</a><a href="/2026/tour">Old</a>')
        self.assertEqual(edition_links(page, {'name': 'Junior Tour'}, 'https://example.org/2026/tour'), ['https://example.org/2027/tour'])
        self.assertEqual(edition_links(page, {'name': 'Different Race'}, 'https://example.org/2026/tour'), [])

    def test_conflicting_dates_are_not_decided_by_source_order(self):
        def change(day, url):
            return {'raceId': 'race', 'sourceUrl': url, 'fields': {'date': day, 'enddate': day}}
        changes = [change('2027-05-01', 'https://a.org'), change('2027-05-02', 'https://b.org')]
        for proposals in (changes, list(reversed(changes))):
            accepted, _, review = reconcile(proposals, [])
            self.assertFalse(accepted)
            self.assertEqual(len(review), 1)
        # A source which confirms the existing date still counts as contradictory evidence.
        self.assertFalse(reconcile(changes[:1], [], changes[1:])[0])
        self.assertEqual(len(reconcile(changes[:1] * 2, [])[0]), 1)

    def test_new_edition_conflict_does_not_create_a_race(self):
        race = {'id': 'old', 'name': 'Junior Tour', 'countryCode': 'SI', 'sex': 'M'}
        candidates = [{'newEdition': {**race, 'date': day, 'enddate': day}, 'sourceUrl': 'https://example.org/' + day}
                      for day in ('2027-05-01', '2027-05-02')]
        self.assertFalse(reconcile([], candidates)[1])


class PipelineReliability(unittest.TestCase):
    race = {'id': 'old', 'name': 'Junior Tour', 'date': '2026-05-01', 'enddate': '2026-05-01',
            'sex': 'M', 'countryCode': 'SI', 'state': 'active', 'duplicate': 0,
            'sourceUrl': 'https://example.org/2026/tour', 'bucket': 'confirmed'}

    def scan(self, path, fixtures, race=None, fetcher=None):
        args = argparse.Namespace(output=str(path / 'out'), fixtures=str(fixtures) if fixtures else None, limit=0, workers=1)
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch.object(run, 'load_races', return_value=[race or self.race]))
            stack.enter_context(patch.object(run, 'linked_source_catalogue', return_value=({}, {})))
            stack.enter_context(patch.object(run, 'excel_result_sources', return_value={}))
            stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
            if fetcher:
                stack.enter_context(patch.object(run, 'Fetcher', return_value=fetcher))
                stack.enter_context(patch.object(run, 'calendar_entries', return_value=[]))
            run.run(args)
        return {name: json.loads((path / 'out' / (name + '.json')).read_text()) for name in ('overrides', 'status', 'state', 'report')}

    def fixture(self, fixtures, url, text):
        (fixtures / (hashlib.sha256(url.encode()).hexdigest() + '.html')).write_text(text)

    def test_discovers_2027_page_and_keeps_it_in_the_next_run_registry(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp); fixtures = path / 'fixtures'; fixtures.mkdir()
            self.fixture(fixtures, self.race['sourceUrl'], '<h1>Junior Tour</h1><a href="/2027/tour">2027 edition</a>')
            self.fixture(fixtures, 'https://example.org/2027/tour', '<script type="application/ld+json">' + json.dumps({
                '@type': 'SportsEvent', 'name': 'Junior Tour', 'startDate': '2027-05-07'}) + '</script>')
            first = self.scan(path, fixtures)
            self.assertEqual(first['status']['discovered2027Sources'], 1)
            self.assertEqual(first['status']['attempted'], 2)
            self.assertTrue(first['status']['complete'])
            self.assertEqual(len(first['overrides']['confirmed2027']), 1)
            second = self.scan(path, fixtures)
            self.assertEqual(second['status']['discovered2027Sources'], 0)
            self.assertEqual(second['status']['attempted'], 2)
            self.assertEqual(len(second['overrides']['confirmed2027']), 1)

    def test_2026_churn_does_not_create_2027_review_noise(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp); fixtures = path / 'fixtures'; fixtures.mkdir()
            for text in ('<h1>Junior Tour 2026</h1><p>Old</p>', '<h1>Junior Tour 2026</h1><p>Changed</p>'):
                self.fixture(fixtures, self.race['sourceUrl'], text)
                result = self.scan(path, fixtures)
                self.assertEqual(result['status']['needsReview'], 0)
                self.assertEqual(result['status']['historicalSources'], 1)
                self.assertFalse(result['overrides']['confirmed2027'])

    def test_deferred_source_is_counted_separately_and_keeps_prior_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            fetcher = Mock(requests=0, retries=0, blocked={'example.org': 'denied'}, cooldowns={})
            fetcher.get.side_effect = lambda url, prev: {'body': b'{}'} if url == run.CALENDAR else (_ for _ in ()).throw(DeferredSource('denied'))
            result = self.scan(path, None, fetcher=fetcher)
            self.assertEqual(result['status']['deferred'], 1)
            self.assertEqual(result['status']['errors'], 0)
            self.assertTrue(result['status']['complete'])
            self.assertFalse(result['overrides']['confirmed2027'])

    def test_304_evidence_is_reconsidered_after_a_date_conflict_resolves(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            race = {**self.race, 'date': '2027-05-01', 'enddate': '2027-05-01',
                    'sourceUrl': 'https://example.org/2027/a', 'proofUrl': 'https://example.org/2027/b'}
            unchanged = set()
            days = {race['sourceUrl']: '2027-05-07', race['proofUrl']: '2027-05-01'}
            def get(url, previous):
                if url == run.CALENDAR:
                    return {'body': b'{}'}
                if url in unchanged:
                    return {'notModified': True, 'httpStatus': 304}
                body = '<script type="application/ld+json">' + json.dumps({
                    '@type': 'SportsEvent', 'name': 'Junior Tour', 'startDate': days[url]}) + '</script>'
                return {'body': body.encode(), 'contentType': 'text/html', 'finalUrl': url,
                        'redirectedHost': False, 'httpStatus': 200}
            fetcher = Mock(requests=0, retries=0, blocked={}, cooldowns={})
            fetcher.get.side_effect = get
            first = self.scan(path, None, race=race, fetcher=fetcher)
            self.assertEqual(first['status']['dateConflicts'], 1)
            self.assertFalse(first['overrides']['races'])
            unchanged.add(race['sourceUrl'])
            days[race['proofUrl']] = '2027-05-07'
            second = self.scan(path, None, race=race, fetcher=fetcher)
            self.assertEqual(second['status']['dateConflicts'], 0)
            self.assertEqual(second['status']['notModified'], 1)
            self.assertEqual(second['overrides']['races'][race['id']]['fields']['date'], '2027-05-07')

    def test_lost_2027_evidence_remains_flagged_on_later_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp); fixtures = path / 'fixtures'; fixtures.mkdir()
            self.fixture(fixtures, self.race['sourceUrl'], '<script type="application/ld+json">' + json.dumps({
                '@type': 'SportsEvent', 'name': 'Junior Tour', 'startDate': '2027-05-07'}) + '</script>')
            self.scan(path, fixtures)
            self.fixture(fixtures, self.race['sourceUrl'], '<h1>Junior Tour</h1><p>2026 archive</p>')
            for _ in range(2):
                result = self.scan(path, fixtures)
                self.assertEqual(result['status']['needsReview'], 1)
                self.assertEqual(len(result['overrides']['confirmed2027']), 1)
