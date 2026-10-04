import json
import unittest
from unittest.mock import patch
import test_buffer_delivery as fixtures
import buffer_delivery as m

class TikTokCaptionReceiptTests(unittest.TestCase):
    def setUp(self):
        self.prior={'provider_id':'receipt'}
        self.package={'channelId':'channel','platform':'tiktok','caption':'Hello world.\n\nVisit https://example.com/a @brand #tag'}
        self.config={'channels':{'channel':{'platform':'tiktok'}}}
        self.post={'id':'receipt','status':'sent','text':'Hello world. Visit https://example.com/a @brand #tag'}
    def test_exact_observed_one_way_transformation(self):
        self.assertTrue(m.receipt_caption_matches(self.prior,self.package,self.post,self.config))
    def test_meaningful_edits_are_rejected(self):
        for text in ['Helloworld. Visit https://example.com/a @brand #tag','Hello earth. Visit https://example.com/a @brand #tag','Hello world! Visit https://example.com/a @brand #tag','Hello world. Visit https://example.com/b @brand #tag','Hello world. Visit https://example.com/a @other #tag','Hello world.  Visit https://example.com/a @brand #tag','Hello world.\tVisit https://example.com/a @brand #tag']:
            with self.subTest(text=text):
                self.assertFalse(m.receipt_caption_matches(self.prior,self.package,{**self.post,'text':text},self.config))
    def test_only_identified_terminal_tiktok_receipt(self):
        for prior,package,post,config in [({},self.package,self.post,self.config),(self.prior,self.package,{**self.post,'id':'other'},self.config),(self.prior,self.package,{**self.post,'status':'scheduled'},self.config),(self.prior,{**self.package,'platform':'instagram'},self.post,self.config),(self.prior,self.package,self.post,{'channels':{'channel':{'platform':'instagram'}}})]:
            self.assertFalse(m.receipt_caption_matches(prior,package,post,config))
    def test_no_unicode_or_tab_normalization(self):
        for c in ['\t','\r','\u00a0','\u2003']:
            self.assertFalse(m.receipt_caption_matches(self.prior,{**self.package,'caption':self.package['caption'].replace('\n\n',c)},self.post,self.config))
    def test_existing_reservation_moves_to_sent_without_create(self):
        fixture=fixtures.DeliveryTests(); fixture.setUp()
        try:
            fixture.package.update(platform='tiktok',caption=self.package['caption'])
            fixture.config['channels']['channel']['platform']='tiktok'
            fixture.api.channel['service']='tiktok'
            fixture.run_delivery(); prior=m.ledger.status(fixture.root)[0]
            fixture.api.history=[{**self.post,'channelId':'channel'}]
            with patch.object(fixture.api,'create') as create:
                result=m.reconcile(prior,fixture.config,fixture.root,fixture.api)
                create.assert_not_called()
            after=m.ledger.status(fixture.root)
            self.assertEqual(len(after),1); self.assertEqual(after[0]['state'],'sent')
            for key in ['brand','day','channel','content_hash','provider_id','package_json']:
                self.assertEqual(after[0][key],prior[key])
            self.assertEqual(result['state'],'sent'); self.assertIsNone(result['externalLink'])
            fixture.api.history=[{**self.post,'channelId':'wrong'}]
            with patch.object(m,'record_post') as record:
                with self.assertRaises(m.Blocked):m.reconcile(prior,fixture.config,fixture.root,fixture.api)
                record.assert_not_called()
        finally:fixture.doCleanups()
