import argparse
import contextlib
import hashlib
import html
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import run
from uci_discovery import (
    calendar_entries, confirmed_uci_detail, edition_from_uci_calendar,
    matching_2026_edition,
)

OLD = {
    'id':'SI-2026-1','name':'Junior Tour','date':'2026-05-01','enddate':'2026-05-01',
    'countryCode':'SI','country':'Slovenija','sex':'M','type':'Road race','place':'Ljubljana',
    'lat':46.05,'lon':14.51,'precision':'town','duplicate':0,'state':'active',
    'sourceUrl':'https://example.org/old','proofUrl':'','resultUrl':'',
}
CALENDAR_URL = 'https://www.uci.org/competition-details/2027/ROA/98765'

def calendar_event(name='Junior Tour', dates='05 May 2027', country='SLO', continent='EUR', rid='98765'):
    return {
        'name':name,'dates':dates,'country':country,'continentCode':continent,
        'detailsLink':{'url':'/competition-details/2027/ROA/'+rid},
    }

def calendar(events):
    return {'items':[{'items':[{'items':events}]}]}

def details(name='Junior Tour', dates='05 May 2027', category='Men Junior', klass='1.1'):
    props = {
        'competitionDetails':{
            'name':name,'dates':dates,'competitionClass':klass+' - Race',
            'venue':'Ljubljana',
        },
        'schedule':{'items':[{'races':[{'category':category}]}]},
    }
    return '<div data-component="CompetitionDetailsModule" data-props="' + html.escape(
        json.dumps(props), quote=True) + '"></div>'

class UciDiscovery(unittest.TestCase):
    def test_calendar_requires_2027_europe_and_valid_uci_id(self):
        candidates=calendar_entries(calendar([
            calendar_event(), calendar_event(),
            calendar_event(name='Unlisted Senior',rid='444',continent='AFR'),
            calendar_event(name='Old race',rid='445',dates='05 May 2026'),
            calendar_event(name='Unknown country',rid='446',country='???'),
        ]))
        self.assertEqual(len(candidates),1)
        self.assertEqual(candidates[0]['id'],'uci-2027-98765')

    def test_calendar_rejects_conflicting_details_for_same_id(self):
        candidates=calendar_entries(calendar([
            calendar_event(),calendar_event(dates='06 May 2027')
        ]))
        self.assertEqual(candidates,[])

    def test_detail_checks_name_date_class_and_junior_category(self):
        candidate=calendar_entries(calendar([calendar_event()]))[0]
        self.assertEqual(confirmed_uci_detail(details(),candidate)['date'],'2027-05-05')
        self.assertIsNone(confirmed_uci_detail(details(name='Other Tour'),candidate))
        self.assertIsNone(confirmed_uci_detail(details(dates='06 May 2027'),candidate))
        self.assertIsNone(confirmed_uci_detail(details(category='Men Elite'),candidate))
        self.assertIsNone(confirmed_uci_detail(details(klass='1.2'),candidate))

    def test_exact_name_and_country_link_to_2026_or_are_left_unlinked(self):
        candidate=calendar_entries(calendar([calendar_event()]))[0]
        self.assertEqual(matching_2026_edition(candidate,[OLD])['id'],OLD['id'])
        self.assertIsNone(matching_2026_edition(candidate,[OLD,{**OLD,'id':'a-second-race'}]))
        self.assertIsNone(matching_2026_edition(candidate,[{**OLD,'sex':'Ž'}]))
        new=edition_from_uci_calendar(candidate,confirmed_uci_detail(details(),candidate),
                                     '2026-11-06T05:00:00Z',linked=OLD)
        self.assertEqual(new['id'],'uci-2027-98765')
        self.assertEqual(new['source2026Id'],OLD['id'])
        self.assertEqual((new['lat'],new['lon']),(46.05,14.51))
        unlinked=edition_from_uci_calendar(candidate,confirmed_uci_detail(details(),candidate),
                                          '2026-11-06T05:00:00Z')
        self.assertEqual(unlinked['source2026Id'],'')
        self.assertIsNone(unlinked['lat'])
        self.assertEqual(unlinked['countryCode'],'SI')

    def test_daily_pipeline_discovers_new_uci_id_and_reuses_it_without_duplicates(self):
        event=calendar_event()
        stored_calendar=calendar([event])
        responses={
            run.CALENDAR:(json.dumps(stored_calendar).encode(),'application/json'),
            OLD['sourceUrl']:(b'<html><body>Old 2026 race</body></html>','text/html'),
            CALENDAR_URL:(details().encode(),'text/html'),
        }
        class FakeFetcher:
            requests = retries = 0
            blocked = {}
            def get(self,url,previous):
                body,kind=responses[url]
                return dict(body=body,contentType=kind,finalUrl=url,
                            redirectedHost=False,httpStatus=200)
        with tempfile.TemporaryDirectory() as tmp:
            args=argparse.Namespace(output=str(Path(tmp)/'out'),fixtures=None,limit=0,workers=1)
            def scan():
                with patch.object(run,'load_races',return_value=[OLD]), patch.object(run,'Fetcher',FakeFetcher),contextlib.redirect_stdout(io.StringIO()):
                    run.run(args)
                folder=Path(tmp)/'out'
                return (json.loads((folder/'overrides.json').read_text()),
                        json.loads((folder/'status.json').read_text()))
            first,status=scan()
            self.assertEqual(len(first['confirmed2027']),1)
            self.assertEqual(first['confirmed2027']['uci-2027-98765']['date'],'2027-05-05')
            self.assertNotIn(OLD['id'],first['races'])
            self.assertEqual(status['calendarNewCandidates2027'],1)
            self.assertEqual(status['calendarVerified2027'],1)
            self.assertEqual(status['updatedRaces'],1)
            second,status=scan()
            self.assertEqual(len(second['confirmed2027']),1)
            self.assertEqual(status['calendarNewCandidates2027'],0)
            self.assertEqual(status['updatedRaces'],0)

    def test_rejected_detail_never_adds_unrelated_event(self):
        self.assertIsNone(confirmed_uci_detail(
            details(name='Unrelated category'),calendar_entries(calendar([calendar_event()]))[0]))

if __name__=='__main__':
    unittest.main()
