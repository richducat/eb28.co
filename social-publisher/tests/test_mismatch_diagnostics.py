import json
import unittest
from unittest.mock import patch

import test_buffer_delivery as fixtures
import buffer_delivery as m


class MismatchDiagnosticsTests(unittest.TestCase):
    def test_normalization_is_described_without_accepting_it(self):
        prior = {'channel': 'channel'}
        package = {'caption': 'A\nB café'}
        post = {'id': 'receipt', 'channelId': 'channel', 'text': 'A\r\nB cafe\u0301', 'status': 'sent'}
        result = m.mismatch_diagnostics(prior, package, post)
        self.assertTrue(result['channelMatches'])
        self.assertFalse(result['captionMatches'])
        self.assertEqual(result['decision'], 'blocked_no_ledger_change_no_retry')
        self.assertNotIn(package['caption'], json.dumps(result))
        self.assertNotIn(post['text'], json.dumps(result))

    def test_line_ending_difference_is_detected(self):
        result = m.mismatch_diagnostics({'channel': 'c'}, {'caption': 'A\nB'}, {'id': 'p', 'channelId': 'c', 'text': 'A\r\nB', 'status': 'sent'})
        self.assertTrue(result['possibleNormalization']['lineEndingsOnly'])
        self.assertTrue(result['possibleNormalization']['whitespaceOnly'])

    def test_provider_fields_and_url_are_bounded(self):
        result = m.mismatch_diagnostics({'channel': 'c'}, {'caption': 'A'}, {'id': 'bad\nidentifier', 'channelId': 'wrong', 'text': 'changed private fixture', 'status': 'unexpected fixture', 'externalLink': 'https://tiktok.com/@brand/video/1?token=fixture'})
        self.assertFalse(result['channelMatches'])
        self.assertIsNone(result['providerId'])
        self.assertIsNone(result['observedNativeUrl'])
        self.assertEqual(result['observedStatus'], 'unrecognized')
        self.assertNotIn('changed private fixture', json.dumps(result))

    def test_reconcile_mismatch_preserves_ledger_and_never_sends(self):
        fixture = fixtures.DeliveryTests()
        fixture.setUp()
        try:
            fixture.run_delivery()
            prior = m.ledger.status(fixture.root)[0]
            fixture.api.history = [{'id': 'receipt', 'channelId': 'channel', 'text': 'Different caption', 'status': 'sent'}]
            with patch.object(m, 'record_post') as record, patch.object(fixture.api, 'create') as create:
                with self.assertRaisesRegex(m.Blocked, 'Diagnostics:') as caught:
                    m.reconcile(prior, fixture.config, fixture.root, fixture.api)
                record.assert_not_called()
                create.assert_not_called()
            self.assertEqual(m.ledger.status(fixture.root), [prior])
            self.assertEqual(len(fixture.api.writes), 1)
            detail = json.loads(str(caught.exception).split('Diagnostics: ', 1)[1])
            self.assertTrue(detail['channelMatches'])
            self.assertFalse(detail['captionMatches'])
            self.assertEqual(detail['observedStatus'], 'sent')
        finally:
            fixture.doCleanups()

    def test_wrong_channel_never_advances_ledger(self):
        fixture = fixtures.DeliveryTests()
        fixture.setUp()
        try:
            fixture.run_delivery()
            prior = m.ledger.status(fixture.root)[0]
            fixture.api.history = [{'id': 'receipt', 'channelId': 'wrong', 'text': fixture.package['caption'], 'status': 'sent'}]
            with patch.object(m, 'record_post') as record, patch.object(fixture.api, 'create') as create:
                with self.assertRaises(m.Blocked) as caught:
                    m.reconcile(prior, fixture.config, fixture.root, fixture.api)
                record.assert_not_called()
                create.assert_not_called()
            self.assertEqual(m.ledger.status(fixture.root), [prior])
            detail = json.loads(str(caught.exception).split('Diagnostics: ', 1)[1])
            self.assertFalse(detail['channelMatches'])
            self.assertTrue(detail['captionMatches'])
        finally:
            fixture.doCleanups()

    def test_malformed_native_link_cannot_override_blocked_result(self):
        detail = m.mismatch_diagnostics({'channel': 'c'}, {'caption': 'A'}, {'id': 'p', 'text': 'B', 'externalLink': 'https://[invalid'})
        self.assertIsNone(detail['observedNativeUrl'])
        self.assertEqual(detail['decision'], 'blocked_no_ledger_change_no_retry')


if __name__ == '__main__':
    unittest.main()
