"""V10: weekly rotation for cold sources, parked hosts, actionable review reasons."""
import argparse
import contextlib
import datetime as dt
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import run
import scheduling
from reporting import review_reasons, legacy_review_reasons, review_issue, host_summaries
from scheduling import (had_2027_evidence, is_cold, cold_due, rotation_slot, parked_hosts,
                        choose_probes, update_host_blocks, HOST_PARK_AFTER_DAYS)
from test_reliability import PipelineReliability

V = run.READER_VERSION
TODAY = dt.date(2026, 11, 26)
COLD = {'status': 'ok', 'readerVersion': V, 'hash': 'h', 'observations': {}, 'supportedRecords': 0,
        'targetYearEvidence': False, 'historicalOnly': True, 'lastCheckedAt': '2026-11-25T05:00:00Z'}


class Scheduling(unittest.TestCase):
    def test_only_sources_without_any_2027_signal_are_cold(self):
        self.assertTrue(is_cold(COLD, V))
        for change in ({'observations': {'r': {}}}, {'supportedRecords': 1}, {'targetYearEvidence': True},
                       {'had2027Evidence': True}, {'ffcCalendarEntries': [{'id': 1}]}, {'ffcDetail': {'id': 1}},
                       {'ffcNonJunior': {'id': 1}}, {'uciDetail': {'id': 1}}, {'reviewReasons': ['redirected']},
                       {'discoveryCandidates': [['u', 'r']]},
                       {'status': 'error'}, {'status': 'deferred'}, {'readerVersion': V - 1}):
            self.assertFalse(is_cold(COLD | change, V), change)
        self.assertFalse(is_cold({}, V))
        self.assertFalse(is_cold(None, V))

    def test_legacy_had_target_flag_does_not_count_as_2027_evidence(self):
        self.assertFalse(had_2027_evidence({'hadTargetEvidence': True, 'observations': {}}))
        self.assertTrue(had_2027_evidence({'observations': {'r': {'fields': {}}}}))
        self.assertTrue(had_2027_evidence({'had2027Evidence': True}))
        self.assertFalse(had_2027_evidence({'had2027Evidence': False, 'hadTargetEvidence': True}))

    def test_weekly_rotation_spreads_sources_and_catches_up_missed_slots(self):
        urls = [f'https://example.org/{i}' for i in range(700)]
        due_per_day = [sum(cold_due(u, COLD, TODAY + dt.timedelta(days=d)) for u in urls) for d in range(7)]
        self.assertTrue(all(60 < n < 140 for n in due_per_day), due_per_day)
        # Every source is due exactly once in any 7-day window when runs happen daily.
        for u in urls[:50]:
            self.assertEqual(sum(cold_due(u, COLD | {'lastCheckedAt': '2026-11-25T05:00:00Z'},
                                          TODAY + dt.timedelta(days=d)) for d in range(7)), 1)
        stale = COLD | {'lastCheckedAt': '2026-11-10T05:00:00Z'}
        self.assertTrue(all(cold_due(u, stale, TODAY) for u in urls[:50]))
        self.assertTrue(cold_due(urls[0], COLD | {'lastCheckedAt': 'garbage'}, TODAY))

    def test_host_is_parked_after_consecutive_blocked_days_and_released_on_success(self):
        blocks = {}
        rec = {'status': 'deferred'}
        for day in range(HOST_PARK_AFTER_DAYS):
            today = TODAY + dt.timedelta(days=day)
            # Two runs on the same day count once.
            for _ in range(2):
                blocks = update_host_blocks(blocks, {'h.org': [rec]}, {'h.org': '403'}, set(), today, today.isoformat())
        self.assertEqual(blocks['h.org']['days'], HOST_PARK_AFTER_DAYS)
        self.assertEqual(parked_hosts(blocks), {'h.org'})
        self.assertIn('lastProbeAt', blocks['h.org'])
        # A host not blocked this run is unchanged; a reachable page (even 404) releases it.
        self.assertEqual(update_host_blocks(blocks, {'h.org': [{'status': 'error', 'httpStatus': 500}]}, {}, set(), TODAY, 'x'), blocks)
        self.assertEqual(update_host_blocks(blocks, {'h.org': [{'status': 'error', 'httpStatus': 404}]}, {}, set(), TODAY, 'x'), {})
        self.assertEqual(update_host_blocks(blocks, {'h.org': [{'status': 'ok'}]}, {}, {'h.org'}, TODAY, 'x'), {})

    def test_failed_probe_keeps_host_parked_and_schedules_next_probe(self):
        blocks = {'h.org': {'days': 5, 'lastProbeAt': '2026-11-01T00:00:00Z', 'lastBlockedDay': '2026-11-20'}}
        after = update_host_blocks(blocks, {'h.org': [{'status': 'error', 'httpStatus': 403}]}, {}, {'h.org'},
                                   TODAY, '2026-11-26T05:00:00Z')
        self.assertEqual(after['h.org']['days'], 6)
        self.assertEqual(after['h.org']['lastProbeAt'], '2026-11-26T05:00:00Z')

    def test_one_probe_per_due_host_least_recently_attempted(self):
        blocks = {'a.org': {'days': 3, 'lastProbeAt': '2026-11-01'}, 'b.org': {'days': 3, 'lastProbeAt': '2026-11-25'}}
        urls = ['https://a.org/1', 'https://a.org/2', 'https://b.org/1']
        sources = {'https://a.org/1': {'lastAttemptAt': '2026-11-20'}, 'https://a.org/2': {'lastAttemptAt': '2026-11-02'}}
        self.assertEqual(choose_probes(urls, sources, {'a.org', 'b.org'}, blocks, TODAY), {'a.org': 'https://a.org/2'})


class ReviewReasons(unittest.TestCase):
    def test_changed_page_without_2027_evidence_is_not_a_review_item(self):
        self.assertEqual(review_reasons(target_year=False, supported=False, parse_errors=False,
                                        redirected=False, had_2027=False), [])
        self.assertIsNone(review_issue('https://x.org', []))

    def test_reasons_are_ordered_by_importance(self):
        self.assertEqual(review_reasons(True, False, True, True, True),
                         ['lost_2027_evidence', 'unsupported_or_changed', 'redirected'])
        self.assertEqual(review_reasons(True, False, False, False, False), ['needs_reader_2027'])
        self.assertEqual(review_reasons(True, True, False, False, True), [])
        issue = review_issue('https://x.org', ['unsupported_or_changed'], [{'reason': 'e'}] * 20)
        self.assertEqual(issue['category'], 'unsupported_or_changed')
        self.assertEqual(len(issue['details']), 10)

    def test_legacy_records_are_reclassified_from_evidence_not_old_flags(self):
        sticky = {'needsReview': True, 'hadTargetEvidence': True, 'observations': {}, 'supportedRecords': 0}
        self.assertEqual(legacy_review_reasons(sticky), [])
        self.assertEqual(legacy_review_reasons(sticky | {'targetYearEvidence': True}), ['needs_reader_2027'])
        self.assertEqual(legacy_review_reasons(sticky | {'pdfEvidence': {'has2027': False}}), [])
        self.assertEqual(legacy_review_reasons(sticky | {'pdfEvidence': {'has2027': True}}), ['pdf_2027_review'])
        self.assertEqual(legacy_review_reasons({'observations': {'r': {}}}), ['lost_2027_evidence'])

    def test_host_summaries_rank_reader_gaps_by_linked_races(self):
        now = 'N'
        sources = {'https://a.org/1': {'lastAttemptAt': now, 'status': 'ok'},
                   'https://a.org/2': {'lastAttemptAt': now, 'status': 'ok', 'targetYearEvidence': True},
                   'https://b.org/1': {'lastAttemptAt': now, 'status': 'ok'},
                   'https://b.org/2': {'lastAttemptAt': now, 'status': 'ok', 'supportedRecords': 1},
                   'https://c.org/1': {'lastAttemptAt': 'old', 'status': 'ok'}}
        registry = {'https://a.org/1': {'races': {'r1'}}, 'https://a.org/2': {'races': {'r1'}},
                    'https://b.org/1': {'races': {'r2', 'r3'}}}
        review = [{'sourceUrl': 'https://a.org/2', 'category': 'needs_reader_2027'},
                  {'sourceUrl': 'https://z.org/', 'category': 'deferred_host', 'deferred': True}]
        result = host_summaries(review, registry, sources, now)
        self.assertEqual(result['reviewByHost'], [{'host': 'a.org', 'items': 1, 'categories': {'needs_reader_2027': 1}}])
        self.assertEqual(result['hostsWithoutReader'], [
            {'host': 'b.org', 'sources': 1, 'races': 2, 'with2027Dates': 0},
            {'host': 'a.org', 'sources': 2, 'races': 1, 'with2027Dates': 1}])


class Pipeline(unittest.TestCase):
    url = PipelineReliability.race['sourceUrl']

    def fetcher(self, pages, calls):
        def get(url, previous):
            if url == run.CALENDAR:
                return {'body': b'{}'}
            calls.append(url)
            page = pages[url]
            if isinstance(page, Exception):
                raise page
            if page == 304:
                return {'notModified': True, 'httpStatus': 304}
            return {'body': page.encode(), 'contentType': 'text/html', 'finalUrl': url,
                    'redirectedHost': False, 'httpStatus': 200}
        fetcher = Mock(requests=0, retries=0, blocked={}, cooldowns={})
        fetcher.get.side_effect = get
        return fetcher

    def seed(self, path, sources=None, host_blocks=None):
        out = path / 'out'
        out.mkdir(parents=True, exist_ok=True)
        (out / 'state.json').write_text(json.dumps({'schemaVersion': 1, 'sources': sources or {},
                                                    'hostBlocks': host_blocks or {}}))

    def scan(self, path, fetcher, race=None, full=False, races=None):
        args = argparse.Namespace(output=str(path / 'out'), fixtures=None, limit=0, workers=1, full=full)
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch.object(run, 'load_races', return_value=races or [race or PipelineReliability.race]))
            stack.enter_context(patch.object(run, 'linked_source_catalogue', return_value=({}, {})))
            stack.enter_context(patch.object(run, 'excel_result_sources', return_value={}))
            stack.enter_context(patch.object(run, 'Fetcher', return_value=fetcher))
            stack.enter_context(patch.object(run, 'calendar_entries', return_value=[]))
            stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
            run.run(args)
        return {name: json.loads((path / 'out' / (name + '.json')).read_text())
                for name in ('overrides', 'status', 'state', 'report')}

    def test_cold_source_waits_for_its_weekly_slot_and_full_scan_overrides(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            calls = []
            pages = {self.url: '<h1>Junior Tour</h1><p>7 May 2026</p>'}
            first = self.scan(path, self.fetcher(pages, calls))
            self.assertEqual(calls, [self.url])
            self.assertTrue(first['state']['sources'][self.url]['historicalOnly'])
            today = dt.datetime.now(dt.timezone.utc).date()
            with patch.object(scheduling, 'rotation_slot', return_value=(today.toordinal() + 1) % 7):
                second = self.scan(path, self.fetcher(pages, calls))
                self.assertEqual(calls, [self.url])
                self.assertEqual(second['status']['notDueToday'], 1)
                self.assertEqual(second['status']['attempted'], 0)
                self.assertTrue(second['status']['complete'])
                self.assertEqual(second['status']['sourceOutcomes'], {'notDueToday': 1})
                # The skipped source keeps its previous record untouched.
                self.assertEqual(second['state']['sources'][self.url]['lastCheckedAt'],
                                 first['state']['sources'][self.url]['lastCheckedAt'])
                self.scan(path, self.fetcher(pages, calls), full=True)
                self.assertEqual(calls, [self.url, self.url])

    def test_cold_source_linked_from_a_checked_page_is_checked_the_same_day(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            info = PipelineReliability.race | {'id': 'info', 'name': 'Junior Tour',
                                               'sourceUrl': 'https://example.org/info'}
            tour = PipelineReliability.race | {'id': 'tour', 'name': 'Junior Tour', 'countryCode': 'HR'}
            pages = {info['sourceUrl']: '<h1>Junior Tour</h1><p>7 May 2026</p>',
                     tour['sourceUrl']: '<h1>Junior Tour</h1><a href="/info">2027 edition</a>'}
            calls = []
            self.scan(path, self.fetcher(pages, calls), races=[info])
            self.assertEqual(calls, [info['sourceUrl']])
            today = dt.datetime.now(dt.timezone.utc).date()
            with patch.object(scheduling, 'rotation_slot', return_value=(today.toordinal() + 1) % 7):
                calls.clear()
                result = self.scan(path, self.fetcher(pages, calls), races=[info, tour])
            self.assertEqual(sorted(calls), sorted(pages))
            self.assertEqual(result['status']['promotedFromRotation'], 1)
            self.assertEqual(result['status']['notDueToday'], 0)
            self.assertTrue(result['status']['complete'])

    def test_2027_race_sources_are_checked_daily_even_without_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            race = PipelineReliability.race | {'date': '2027-05-01', 'enddate': '2027-05-01',
                                               'sourceUrl': 'https://example.org/tour'}
            calls = []
            pages = {race['sourceUrl']: '<h1>Junior Tour</h1>'}
            today = dt.datetime.now(dt.timezone.utc).date()
            with patch.object(scheduling, 'rotation_slot', return_value=(today.toordinal() + 1) % 7):
                for _ in range(2):
                    self.scan(path, self.fetcher(pages, calls), race=race)
            self.assertEqual(len(calls), 2)

    def test_parked_host_is_skipped_reported_once_and_probed_weekly(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            today = dt.datetime.now(dt.timezone.utc).date().isoformat()
            self.seed(path, host_blocks={'example.org': {'days': 4, 'since': '2026-11-01', 'reason': '403',
                                                         'lastProbeAt': today, 'lastBlockedDay': today}})
            calls = []
            result = self.scan(path, self.fetcher({}, calls))
            self.assertEqual(calls, [])
            self.assertEqual(result['status']['parkedHostSources'], 1)
            self.assertTrue(result['status']['complete'])
            self.assertEqual(result['status']['needsReview'], 1)
            self.assertEqual(result['report']['review'][0]['category'], 'host_parked')
            self.assertEqual(result['status']['parkedHosts']['example.org']['skippedSources'], 1)
            self.assertEqual(result['state']['hostBlocks']['example.org']['days'], 4)

            # A week later one probe is sent, even for a source the rotation would skip;
            # success releases the host.
            self.seed(path, sources={self.url: COLD | {'lastCheckedAt': dt.datetime.now(dt.timezone.utc).isoformat()}},
                      host_blocks={'example.org': {'days': 4, 'lastProbeAt': '2026-01-01'}})
            not_due = (dt.datetime.now(dt.timezone.utc).date().toordinal() + 1) % 7
            with patch.object(scheduling, 'rotation_slot', return_value=not_due):
                probe = self.scan(path, self.fetcher({self.url: '<h1>Junior Tour</h1><p>7 May 2026</p>'}, calls))
            self.assertEqual(calls, [self.url])
            self.assertEqual(probe['state']['hostBlocks'], {})
            self.assertEqual(probe['status']['parkedHosts'], {})

    def test_legacy_sticky_flags_are_cleared_on_reread_and_on_304(self):
        legacy = {'status': 'ok', 'readerVersion': V, 'hash': 'old', 'needsReview': True,
                  'hadTargetEvidence': True, 'observations': {}, 'supportedRecords': 0, 'targetYearEvidence': False}
        for page in ('<h1>Junior Tour</h1><p>Results 7 May 2026, updated</p>', 304):
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp)
                self.seed(path, sources={self.url: legacy})
                result = self.scan(path, self.fetcher({self.url: page}, []), full=True)
                record = result['state']['sources'][self.url]
                self.assertEqual(result['status']['needsReview'], 0, page)
                self.assertFalse(record['needsReview'])
                self.assertEqual(record['reviewReasons'], [])
                self.assertNotIn('hadTargetEvidence', record)


if __name__ == '__main__':
    unittest.main()
