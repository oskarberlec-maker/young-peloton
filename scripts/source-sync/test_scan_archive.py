import json
from pathlib import Path
import tempfile
import unittest
from scan_archive import append_scan


class ScanArchiveTest(unittest.TestCase):
    def test_preserves_multiple_daily_runs_and_deduplicates_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            first = {'lastRunAt': '2026-11-13T05:00:00Z', 'updatedRaces': 0}
            (root / 'scans.json').write_text(json.dumps({'schemaVersion': 1, 'runs': [first]}))
            second = {'lastRunAt': '2026-11-13T15:00:00Z', 'updatedRaces': 1, 'review': ['large']}
            path = append_scan(root, second, 'owner/repo')
            append_scan(root, second, 'owner/repo')
            result = json.loads((root / 'scans.json').read_text())['runs']
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]['updatedRaces'], 1)
            self.assertEqual(result[1]['updatedRaces'], 0)
            self.assertNotIn('review', result[0])
            self.assertEqual(path, 'scans/20261113150000.json')
            self.assertTrue(result[0]['reportUrl'].endswith(path))
