"""Regression layouts based on public FFC/FCI pages inspected 2026-11-12.
2027 values below are synthetic test dates, never live race confirmations.
"""
import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from core import Page, extract, normalized
from confirmations import dates_only
from federation_calendar import FFCCalendar, calendar_links, calendar_seeds, has_2027_dates
import run

RACE = {'id': 'FR-FFC-OLD', 'name': 'Tour U19', 'date': '2026-06-06', 'enddate': '2026-06-07',
        'countryCode': 'FR', 'sex': 'M', 'bucket': 'confirmed', 'state': 'active', 'duplicate': 0,
        'sourceUrl': 'https://competitions.ffc.fr/calendrier/'}
CHILD = 'https://competitions.ffc.fr/calendrier/competition/2027/4221073005/tour-u19/'


def ffc_detail(year='2027', name='Tour U19', code='MJ.2.1'):
    return f'''<nav>Haute-Savoie UCI 2027 Piste VTT</nav><div>Route</div>
    <div>Du samedi 06 juin {year} au dimanche 07 juin {year}</div><h1>{name}</h1>
    <p>N° d'épreuve</p><p>4221073005</p><p>Saison</p><p>{year}</p>
    <p>Durée</p><p>2 jours</p><p>Code épreuve</p><p>{code}</p>'''


def ffc_calendar(year='2027', discipline='Route', name='Tour U19'):
    return f'''<nav>Haute-Savoie UCI 2027</nav><a class="organisation-titre horizontal" href="{CHILD}">
    <div class="organisation-titre-text"><div class="organisation-titre-discipline">{discipline}</div>
    <div class="organisation-titre-jours">Du 06/06/{year} au 07/06/{year}</div>
    <div class="organisation-titre-libelle">{name}</div></div></a>'''


class FederationDates(unittest.TestCase):
    def test_multiday_ffc_matches_explicit_range_and_duration(self):
        result = dates_only(ffc_detail(), 'text/html', RACE, CHILD, linked_edition=True)
        self.assertEqual(result['fields'], {'date':'2027-06-06','enddate':'2027-06-07'})
        for body in (ffc_detail('2026'), ffc_detail(name='Other Race'),
                     ffc_detail().replace('2 jours', '1 jour'),
                     ffc_detail().replace('07 juin', '05 juin')):
            self.assertIsNone(dates_only(body, 'text/html', RACE, CHILD, linked_edition=True))

    def test_ffc_men_women_category_conflict_is_rejected(self):
        self.assertIsNone(dates_only(ffc_detail(code='WJ.2.1'), 'text/html', RACE, CHILD, linked_edition=True))

    def test_ffc_published_code_identifies_junior_event_without_u19_in_name(self):
        race={**RACE, 'name':'BOUCLES TEST'}
        self.assertIsNotNone(dates_only(ffc_detail(name='BOUCLES TEST',code='1.14.0'),'text/html',race,CHILD,linked_edition=True))
        self.assertIsNone(dates_only(ffc_detail(name='BOUCLES TEST',code='1.12.1'),'text/html',race,CHILD,linked_edition=True))

    def test_fci_navigation_cannot_override_event_category(self):
        race = {**RACE, 'id':'IT-OLD', 'countryCode':'IT', 'date':'2026-03-01','enddate':'2026-03-01','name':'COPPA TEST'}
        body = '''<nav>PISTA FUORISTRADA TRACK MTB</nav><h2>COPPA TEST</h2>
        <p>ID Gara: 123 | Data: 01/03/2027</p><p>Categoria:</p><p>(1.21 ) Juniores</p>
        <p>Categorie Ammesse:</p><p>JUNIORES (1.21)</p><p>Tipo di Gara:</p><p>In linea \\ strada</p>'''
        url = 'https://www.federciclismo.it/ricerca-gare/dettaglio-gara/?raceid=123'
        self.assertEqual(dates_only(body,'text/html',race,url,linked_edition=True)['fields']['date'],'2027-03-01')
        self.assertIsNone(dates_only(body.replace('Juniores','Elite').replace('JUNIORES','ELITE'),'text/html',race,url,linked_edition=True))

    def test_navigation_year_is_not_date_evidence(self):
        self.assertFalse(has_2027_dates(Page(ffc_detail('2026'))))
        self.assertTrue(has_2027_dates(Page(ffc_detail())))
        self.assertTrue(has_2027_dates(Page('<script type="application/ld+json">{"startDate":"2027-06-06"}</script>')))

    def test_calendar_entry_fields_remain_separate(self):
        for body, expected in ((ffc_calendar(), [(CHILD, RACE['id'])]),
                               (ffc_calendar('2026'), []), (ffc_calendar(discipline='Cyclo-Cross'), []),
                               (ffc_calendar(name='Similar Tour U19'), [])):
            page=Page(body);page.ffc_calendar=FFCCalendar(body).entries
            self.assertEqual(calendar_links(page,RACE['sourceUrl'],{normalized(RACE['name']):[RACE]}),expected)
        page=Page(ffc_calendar('2026') + ffc_calendar(name='Other'))
        page.ffc_calendar=FFCCalendar(ffc_calendar('2026') + ffc_calendar(name='Other')).entries
        self.assertFalse(calendar_links(page,RACE['sourceUrl'],{normalized(RACE['name']):[RACE]}))

    def test_seeds_cover_the_year_using_supported_windows(self):
        from urllib.parse import urlsplit, parse_qs
        from datetime import date, datetime, timedelta
        days=set()
        for url in calendar_seeds():
            q=parse_qs(urlsplit(url).query)
            self.assertEqual(q['nbjours'],['14'])
            day=datetime.strptime(q['debut'][0],'%d/%m/%Y').date()
            days.update(day+timedelta(days=i) for i in range(14))
        self.assertTrue(all(date(2027,1,1)+timedelta(days=i) in days for i in range(365)))
        self.assertEqual(len(list(calendar_seeds())),27)

    def test_calendar_detail_publish_repeat_and_conflict_pipeline(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);fixtures=root/'fixtures';fixtures.mkdir()
            def write(url,body):
                (fixtures/(hashlib.sha256(url.encode()).hexdigest()+'.html')).write_text(body)
            write(RACE['sourceUrl'], ffc_calendar());write(CHILD, ffc_detail())
            args=argparse.Namespace(output=str(root/'out'), fixtures=str(fixtures),limit=0,workers=1)
            def scan():
                with patch.object(run,'load_races',return_value=[RACE]), patch.object(run,'linked_source_catalogue',return_value=({},{})), patch.object(run,'excel_result_sources',return_value={}),contextlib.redirect_stdout(io.StringIO()):
                    run.run(args)
                return json.loads((root/'out/overrides.json').read_text()),json.loads((root/'out/status.json').read_text())
            overlay,status=scan()
            self.assertEqual(status['confirmed2027Added'],1)
            saved=next(iter(overlay['confirmed2027'].values()))
            self.assertEqual(saved['date'],'2027-06-06');self.assertEqual(saved['enddate'],'2027-06-07')
            self.assertEqual(saved['source2026Id'],RACE['id']);self.assertEqual(overlay['races'],{})
            overlay,status=scan();self.assertEqual(status['confirmed2027Added'],0)
            self.assertEqual(len(overlay['confirmed2027']),1)
            write(CHILD, ffc_detail().replace('06 juin', '08 juin').replace('07 juin', '09 juin'))
            overlay,status=scan()
            self.assertEqual(status['dateConflicts'],1)
            self.assertEqual(overlay['races'],{})
            self.assertEqual(next(iter(overlay['confirmed2027'].values()))['date'],'2027-06-06')
