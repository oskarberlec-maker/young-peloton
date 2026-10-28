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
from test_core import RACE, uci_page

class Pipeline(unittest.TestCase):
    def test_baseline_change_repeat_and_failure(self):
        race={**RACE,'sourceUrl':'https://www.uci.org/competition-details/2027/ROA/81168','proofUrl':'','resultUrl':'','duplicate':0}
        with tempfile.TemporaryDirectory() as root:
            fixtures=Path(root)/'fixtures';fixtures.mkdir()
            file=fixtures/(hashlib.sha256(race['sourceUrl'].encode()).hexdigest()+'.html')
            output=Path(root)/'output'
            args=argparse.Namespace(output=str(output),fixtures=str(fixtures),limit=0,workers=1)
            def scan():
                with patch.object(run,'load_races',return_value=[race]), contextlib.redirect_stdout(io.StringIO()):run.run(args)
                return json.loads((output/'overrides.json').read_text())
            file.write_text(uci_page())
            self.assertEqual(scan()['races'],{})
            file.write_text(uci_page('07 May - 10 May 2027'))
            result=scan();self.assertEqual(result['races'][race['id']]['fields']['date'],'2027-05-07')
            self.assertEqual(result['races'][race['id']]['fields']['enddate'],'2027-05-10')
            self.assertEqual(len(json.loads((output/'history.json').read_text())['changes']),1)
            scan();self.assertEqual(len(json.loads((output/'history.json').read_text())['changes']),1)
            file.unlink()
            self.assertEqual(scan()['races'],result['races'])
            self.assertEqual(json.loads((output/'status.json').read_text())['errors'],1)

    def test_different_year_or_category_never_updates(self):
        race={**RACE,'sourceUrl':'https://www.uci.org/competition-details/2027/ROA/81168','proofUrl':'','resultUrl':''}
        with tempfile.TemporaryDirectory() as root:
            path=Path(root);fixtures=path/'fixtures';fixtures.mkdir()
            file=fixtures/(hashlib.sha256(race['sourceUrl'].encode()).hexdigest()+'.html')
            args=argparse.Namespace(output=str(path/'out'),fixtures=str(fixtures),limit=0,workers=1)
            for html in [uci_page(),uci_page('06 May - 09 May 2028'),uci_page(category='Men Elite')]:
                file.write_text(html)
                with patch.object(run,'load_races',return_value=[race]), contextlib.redirect_stdout(io.StringIO()):run.run(args)
                self.assertEqual(json.loads((path/'out/overrides.json').read_text())['races'],{})

if __name__=='__main__':unittest.main()
