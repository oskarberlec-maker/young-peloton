import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import run
from confirmations import calendar_candidates, dates_only

RACE = {'id':'old-race', 'name':'Junior Tour', 'date':'2026-05-04', 'enddate':'2026-05-04', 'countryCode':'SI', 'country':'Slovenija', 'sex':'M', 'duplicate':0, 'state':'active', 'sourceUrl':'https://example.org/tour'}

def page(date, end=None):
    event={'@type':'SportsEvent', 'name':RACE['name'], 'startDate':date, 'location':{'name':'Changed venue'}}
    if end:event['endDate']=end
    return '<script type="application/ld+json">'+json.dumps(event)+'</script>'

class Confirmations(unittest.TestCase):
    def test_only_explicit_2027_dates(self):
        for value in ('2026-05-04','2028-05-04','May 4','2027-02-30'):
            self.assertIsNone(dates_only(page(value),'text/html',RACE,RACE['sourceUrl']))
        result=dates_only(page('2027-05-05'),'text/html',RACE,RACE['sourceUrl'])
        self.assertEqual(result['fields'],{'date':'2027-05-05','enddate':'2027-05-05'})
        self.assertIsNone(dates_only(page('2027-05-05'),'text/html',{**RACE,'enddate':'2026-05-07'},RACE['sourceUrl']))

    def test_create_update_repeat_and_failure_preserve_archive(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root);fixtures=path/'fixtures';fixtures.mkdir()
            file=fixtures/(hashlib.sha256(RACE['sourceUrl'].encode()).hexdigest()+'.html')
            args=argparse.Namespace(output=str(path/'out'),fixtures=str(fixtures),limit=0,workers=1)
            def scan():
                with patch.object(run,'load_races',return_value=[RACE]),contextlib.redirect_stdout(io.StringIO()):run.run(args)
                return json.loads((path/'out/overrides.json').read_text())
            file.write_text(page('2026-06-08'))
            self.assertFalse(scan()['confirmed2027'])
            file.write_text(page('2027-05-05'))
            first=scan();self.assertEqual(len(first['confirmed2027']),1)
            rid=next(iter(first['confirmed2027']))
            self.assertEqual(first['confirmed2027'][rid]['source2026Id'],RACE['id'])
            self.assertNotIn(RACE['id'],first['races'])
            self.assertEqual(len(scan()['confirmed2027']),1)
            file.write_text(page('2027-05-06'))
            changed=scan();self.assertEqual(changed['races'][rid]['fields'],{'date':'2027-05-06','enddate':'2027-05-06'})
            self.assertNotIn(RACE['id'],changed['races'])
            file.unlink();self.assertEqual(scan()['races'],changed['races'])

    def test_calendar_requires_known_name_country_actual_year_and_europe(self):
        event={'name':RACE['name'],'continentCode':'EUR','country':'SLO','dates':'05 May 2027','detailsLink':{'url':'/competition-details/2027/ROA/123'}}
        def candidates(e):return list(calendar_candidates({'items':[{'items':[{'items':[e,e]}]}]},[RACE]))
        self.assertEqual(len(candidates(event)),1)
        for change in ({'country':'ITA'},{'name':'Unknown Tour'},{'continentCode':'AFR'},{'dates':'05 May 2026'}):
            self.assertEqual(candidates({**event,**change}),[])
