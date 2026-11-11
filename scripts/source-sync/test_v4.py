import json
from pathlib import Path
import unittest
from unittest.mock import patch
from core import Page, read_ld
from discovery import edition_links
from catalogue import linked_source_catalogue
from pdf_evidence import pdf_evidence
from confirmations import dates_only
import test_reliability as reliability


class DiscoveryTests(unittest.TestCase):
    def test_yearless_link_with_explicit_anchor_or_calendar_season(self):
        race = {'name': 'Junior Tour'}
        for markup in ('<h1>Junior Tour</h1><a href="/race?id=8">Edition 2027</a>',
                       '<h1>Calendar 2027</h1><a href="/race?id=8">Junior Tour</a>'):
            self.assertEqual(edition_links(Page(markup), race, 'https://example.org/calendar'), ['https://example.org/race?id=8'])
        self.assertFalse(edition_links(Page('<h1>Calendar 2027</h1><a href="/news">News</a>'), race, 'https://example.org/calendar'))

    def test_nested_calendar_event_needs_country_and_junior_category(self):
        race = {**reliability.PipelineReliability.race, 'date': '2027-01-01', 'enddate': '2027-01-01', 'countryCode': 'BE'}
        event = {'@type': 'SportsEvent', 'name': race['name'], 'startDate': '2027-05-07', 'url': 'https://example.org/event/8',
                 'category': 'U19 road', 'location': {'address': {'addressCountry': 'BE'}}}
        def parse(e):
            page = Page('<script type="application/ld+json">' + json.dumps({'@type': 'ItemList', 'itemListElement': [{'item': e}]}) + '</script>')
            return read_ld(page, race, 'https://example.org/calendar')
        self.assertEqual(parse(event)['fields']['date'], '2027-05-07')
        self.assertIsNone(parse({**event, 'category': 'Elite'}))
        self.assertIsNone(parse({**event, 'location': {'address': {'addressCountry': 'NL'}}}))
        self.assertIsNone(parse({**event, 'category': 'U19 cyclocross'}))

    def test_linked_page_without_category_country_cannot_publish(self):
        body = '<script type="application/ld+json">' + json.dumps({'@type':'SportsEvent','name':'Junior Tour','startDate':'2027-05-07'}) + '</script>'
        self.assertIsNone(dates_only(body, 'text/html', reliability.PipelineReliability.race, 'https://example.org/event', linked_edition=True))

    def test_stable_fci_id_ignores_display_query_and_preserves_alias(self):
        race = {**reliability.PipelineReliability.race, 'id': 'IT-123', 'countryCode': 'IT',
                'sourceUrl': 'https://www.federciclismo.it/ricerca-gare/dettaglio-gara/?raceid=123&mese=03'}
        legacy = {'xl-1': ['https://www.federciclismo.it/ricerca-gare/dettaglio-gara/?mese=04&raceid=123']}
        with patch('catalogue.source_catalogue', return_value=legacy), patch('catalogue.excel_result_sources', return_value={}):
            result, metrics = linked_source_catalogue([race])
            self.assertEqual(result['xl-1'], result['IT-123'])
            self.assertEqual(metrics['legacyIdsMapped'], 1)
            result, metrics = linked_source_catalogue([race, {**race, 'id': 'IT-other'}])
            self.assertNotIn('IT-123', result)
            self.assertEqual(metrics['legacyAmbiguousIds'], 1)

    def test_pdf_evidence_is_always_review_only(self):
        def extract(args, **kwargs):
            Path(args[-1]).write_text('Official calendar 2027\n07/05/2027 Junior Tour U19\n')
            return type('Result', (), {'returncode': 0})()
        with patch('pdf_evidence.shutil.which', return_value='/usr/bin/pdftotext'), patch('pdf_evidence.subprocess.run', side_effect=extract):
            evidence = pdf_evidence(b'%PDF-1.4')
            self.assertTrue(evidence['has2027'])
            self.assertEqual(evidence['publication'], 'manual-review-only')
            self.assertTrue(evidence['snippets'])
        with self.assertRaises(ValueError):
            pdf_evidence(b'not a pdf')

    @patch('transport.time.sleep')
    def test_retry_after_on_last_attempt_is_preserved(self, sleep):
        fetcher = reliability.FetchReliability().fetcher([reliability.http_error(503), reliability.http_error(503), reliability.http_error(503, '86400')])
        with self.assertRaises(Exception):
            fetcher.get('https://example.org/event', {})
        self.assertIn('example.org', fetcher.cooldowns)

class UciReuseTests(unittest.TestCase):
    def test_detail_download_reused_and_304_revalidates_cached_full_detail(self):
        import argparse
        import contextlib
        import io
        import tempfile
        from unittest.mock import Mock
        import run
        url = 'https://www.uci.org/competition-details/2027/ROA/123'
        race = {**reliability.PipelineReliability.race, 'id': 'uci-2027-123', 'sourceUrl': url,
                'date': '2027-05-07', 'enddate': '2027-05-07'}
        candidate = {**race, 'countryCode': 'SI'}
        props = {'competitionDetails': {'name': race['name'], 'dates': '07 May 2027', 'competitionClass': '1.1'},
                 'schedule': {'items': [{'races': [{'category': 'Men Junior'}]}]}}
        import html
        body = ('<div data-component="CompetitionDetailsModule" data-props="' + html.escape(json.dumps(props), quote=True) + '"></div>').encode()
        fetcher = Mock(requests=0, retries=0, blocked={}, cooldowns={})
        unchanged = False
        def get(request_url, previous):
            if request_url == run.CALENDAR:
                return {'body': b'{}'}
            if unchanged:
                return {'notModified': True, 'httpStatus': 304}
            return {'body': body, 'contentType':'text/html','httpStatus':200,'redirectedHost':False}
        fetcher.get.side_effect = get
        with tempfile.TemporaryDirectory() as folder, patch.object(run, 'load_races', return_value=[race]), patch.object(run, 'linked_source_catalogue', return_value=({}, {})), patch.object(run, 'excel_result_sources', return_value={}), patch.object(run, 'calendar_entries', return_value=[candidate]), patch.object(run, 'Fetcher', return_value=fetcher), contextlib.redirect_stdout(io.StringIO()):
            args = argparse.Namespace(output=folder, fixtures=None, limit=0, workers=1)
            for cached in (False, True):
                unchanged = cached
                fetcher.get.reset_mock()
                run.run(args)
                status = json.loads((Path(folder) / 'status.json').read_text())
                self.assertEqual(status['calendarVerified2027'], 1)
                self.assertEqual(sum(call.args[0] == url for call in fetcher.get.call_args_list), 1)
                self.assertEqual(status['notModified'], int(cached))
            candidate['date'] = '2027-05-08'
            run.run(args)
            status = json.loads((Path(folder) / 'status.json').read_text())
            self.assertEqual(status['calendarVerified2027'], 0)
            self.assertEqual(status['updatedRaces'], 0)
