"""Regression tests for real V6 reporting failures and FFC event markup."""
import argparse
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from core import Page
from ffc_discovery import non_junior_detail
from reporting import review_category
from conflicts import reconcile
from test_ffc_discovery import FIXTURES, PARENT
from confirmations import CALENDAR
import run

URLS = {
 'faun': 'https://competitions.ffc.fr/calendrier/competition/2027/4107012001/faun-drome-classic/',
 'faun-ardeche': 'https://competitions.ffc.fr/calendrier/competition/2027/4107012002/faun-ardeche-classic/',
 'paris-nice': 'https://competitions.ffc.fr/calendrier/competition/2027/4892426001/paris-nice/',
}
BODIES = {key: (FIXTURES / (key + '.html')).read_text() for key in URLS}


class Reporting(unittest.TestCase):
    def test_unambiguous_is_not_an_identity_conflict(self):
        self.assertEqual(review_category({'reason': 'FFC calendar entry awaits unambiguous U19 road detail verification'}), 'eligibility_unverified')
        for reason in ('Ambiguous existing FFC race identity', 'Conflicting FFC stable event identity', 'Contradictory UCI updates for one competition ID'):
            self.assertEqual(review_category({'reason': reason}), 'identity_conflict')
        self.assertEqual(review_category({'reason': 'Conflicting 2027 dates from supported sources; existing dates retained'}), 'date_conflict')
        self.assertEqual(review_category({'reason': 'HTTP Error 403: Forbidden'}), 'blocked_403')
        self.assertEqual(review_category({'reason': 'HTTP Error 429: Too Many Requests'}), 'rate_limited')
        self.assertEqual(review_category({'reason': 'Unparseable source; no speculative update'}), 'unsupported_or_changed')

    def test_conflict_report_keeps_distinct_sources_but_not_repeated_aliases(self):
        evidence = [{'raceId': 'one', 'sourceUrl': 'https://ffc.fr/a', 'fields': {'date': '2027-04-17', 'enddate': '2027-04-18'}},
                    {'raceId': 'one', 'sourceUrl': 'https://uci.org/b', 'fields': {'date': '2027-04-24', 'enddate': '2027-04-25'}}]
        proposals, editions, issues = reconcile([], [], evidence * 4)
        self.assertEqual((proposals, editions), ([], []))
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]['category'], 'date_conflict')
        self.assertEqual(len(issues[0]['evidence']), 2)

    def test_real_elite_codes_and_unknown_code(self):
        for key in ('faun', 'faun-ardeche'):
            self.assertEqual(non_junior_detail(Page(BODIES[key]), URLS[key])['code'], 'ME.1.PRO')
        # Paris-Nice is NOT excluded by its famous name: HIS.2.0 is unsupported.
        self.assertIsNone(non_junior_detail(Page(BODIES['paris-nice']), URLS['paris-nice']))
        for body in (BODIES['faun'].replace('ME.1.PRO', 'MJ.1.1'),
                     BODIES['faun'].replace('Faun Drome Classic', 'Faun Drome Classic U19'),
                     BODIES['faun'] + '<p>Catégorie</p><p>Elite et Juniors</p>',
                     BODIES['faun'].replace('4107012001', '4107012002'),
                     BODIES['faun'].replace('2027', '2026'),
                     BODIES['faun'].replace('Route', 'Piste')):
            self.assertIsNone(non_junior_detail(Page(body), URLS['faun']))

    def test_exclusions_304_unknown_and_failed_details_remain_distinct(self):
        archive = {'id':'inventory', 'name':'Unrelated', 'date':'2026-01-01', 'enddate':'2026-01-01',
                   'countryCode':'FR', 'sex':'M', 'sourceUrl':PARENT}
        names = {'faun':'Faun Drome Classic', 'faun-ardeche':'Faun-Ardèche Classic', 'paris-nice':'Paris-Nice'}
        dates = {'faun':'Le 28/02/2027', 'faun-ardeche':'Le 27/02/2027', 'paris-nice':'Du 07/03/2027 au 14/03/2027'}
        cards = ''.join(f'<a class="organisation-titre" href="{url}"><div class="organisation-titre-discipline">Route</div>'
                        f'<div class="organisation-titre-jours">{dates[key]}</div><div class="organisation-titre-libelle">{names[key]}</div></a>'
                        for key, url in URLS.items())
        bodies = {PARENT:cards, **{url:BODIES[key] for key,url in URLS.items()}}
        cached, failed = False, False
        calls = []
        def get(fetcher, url, prev):
            calls.append(url)
            if url == CALENDAR:
                return {'body':b'{"items":[]}'}
            if failed and url == URLS['faun']:
                raise TimeoutError('timed out')
            if cached and prev.get('hash'):
                return {'notModified':True, 'httpStatus':304}
            return {'body':bodies[url].encode(), 'contentType':'text/html', 'finalUrl':url, 'redirectedHost':False, 'httpStatus':200}
        with tempfile.TemporaryDirectory() as folder:
            def scan():
                calls.clear()
                with patch.object(run,'load_races',return_value=[archive]),patch.object(run,'calendar_seeds',return_value=[]), \
                     patch.object(run,'linked_source_catalogue',return_value=({},{})),patch.object(run,'excel_result_sources',return_value={}), \
                     patch.object(run.Fetcher,'get',get),contextlib.redirect_stdout(io.StringIO()):
                    run.run(argparse.Namespace(output=folder,fixtures=None,limit=0,workers=1))
                return json.loads((Path(folder)/'report.json').read_text())
            for repeat in range(2):
                report=scan()
                self.assertEqual(report['ffcNonJuniorEntries'],2)
                self.assertEqual(report['ffcEntriesAwaitingVerification'],1)
                self.assertEqual(report['reviewCategories'].get('identity_conflict',0),0)
                self.assertEqual(report['reviewCategories']['eligibility_unverified'],1)
                self.assertEqual(report['uniqueSourcesRequiringReview'],1)
                self.assertEqual(report['confirmed2027Added'],0)
                self.assertEqual(report['attempted'],4)
                self.assertEqual(len(calls),len(set(calls)))
                if repeat:
                    self.assertEqual(report['notModified'],4)
                cached=True
            failed=True
            report=scan()
            self.assertEqual(report['ffcNonJuniorEntries'],1)  # stale exclusion cannot hide a failed fetch
            self.assertEqual(report['reviewCategories']['detail_unavailable'],1)
            self.assertEqual(report['reviewCategories']['timeout'],1)
            self.assertEqual(report['uniqueSourcesRequiringReview'],2)

            failed=False
            cached=False
            bodies[PARENT]=cards.replace('Faun Drome Classic', 'Different event')
            report=scan()
            self.assertEqual(report['ffcNonJuniorEntries'],1)
            self.assertEqual(report['reviewCategories']['eligibility_unverified'],2)
            self.assertEqual(report['confirmed2027Added'],0)
