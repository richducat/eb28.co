import hashlib,json,sys,tempfile,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import buffer_delivery as m

class API:
 def __init__(self):
  self.writes=[];self.history=[];self.timeout=False;self.error=None
  self.channel={'id':'channel','name':'brand','service':'instagram','isQueuePaused':False,'isDisconnected':False,'isLocked':False}
  self.account={'email':'brand@example.com','organizations':[{'id':'org'}]}
 def context(self,org):return {'account':self.account,'channels':[self.channel]}
 def posts(self,org,channel):return self.history
 def create(self,payload):
  self.writes.append(payload)
  if self.timeout:raise TimeoutError('Timed out after request')
  if self.error:return self.error
  return {'post':{'id':'receipt','channelId':'channel','text':payload['text'],'status':'scheduled','dueAt':payload['dueAt'],'createdAt':'2026-09-10T16:00:00Z'}}

class DeliveryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  self.api=API();self.now=datetime(2026,9,10,16,tzinfo=timezone.utc)
  self.content=b'\xff\xd8\xffJPEG fixture';(self.root/'art.jpg').write_bytes(self.content)
  self.package={'brand':'test','date':'2026-09-10','channelId':'channel','platform':'instagram','caption':'Fresh warm copy.','image':'art.jpg','mimeType':'image/jpeg','sha256':hashlib.sha256(self.content).hexdigest(),'mediaUrl':'https://example.com/media/art.jpg','sourceChecked':True,'editorialChecked':True,'visualChecked':True}
  self.config={'brand':'test','accountEmail':'brand@example.com','organizationId':'org','channels':{'channel':{'platform':'instagram','handle':'brand'}}}
  self.policy={'timezone':'America/New_York','publishingAuthorized':True,'mediaBaseUrl':'https://example.com/media','brands':{'test':{'enabled':True,'channelIds':['channel'],'preferredPublishTime':'10:30'}}}
  (self.root/'daily-policy.json').write_text(json.dumps(self.policy))
  (self.root/'connections.json').write_text(json.dumps({'brands':{'test':self.config}}))
  (self.root/'LIVE_STATUS.json').write_text(json.dumps({'channels':{}}))
 def run_delivery(self,send=True):return m.deliver(self.package,self.config,self.policy,self.root,send,self.now,self.api,lambda *args:None)
 def test_preflight_cannot_write_or_reserve(self):
  self.assertEqual(self.run_delivery(False)['state'],'ready');self.assertEqual(self.api.writes,[]);self.assertEqual(m.ledger.status(self.root),[])
 def test_exact_scheduling_and_receipt(self):
  r=self.run_delivery();self.assertEqual(r['state'],'scheduled');self.assertEqual(r['providerId'],'receipt')
  self.assertEqual(r['date'],self.package['date'])
  self.assertEqual(self.api.writes[0]['mode'],'customScheduled');self.assertEqual(self.api.writes[0]['dueAt'],'2026-09-10T16:10:00+00:00')
 def test_timeout_does_not_retry(self):
  self.api.timeout=True;self.assertEqual(self.run_delivery()['state'],'unknown');self.run_delivery();self.assertEqual(len(self.api.writes),1)
 def test_timeout_reconciles_late_success_without_resending(self):
  self.api.timeout=True;self.run_delivery()
  self.api.history=[{'id':'late','text':self.package['caption'],'channelId':'channel','status':'sent','sentAt':'2026-09-10T16:10:00Z','createdAt':'2026-09-10T16:00:00Z'}]
  self.assertEqual(self.run_delivery()['state'],'sent');self.assertEqual(len(self.api.writes),1)
 def test_receipt_keeps_original_package_for_recovery(self):
  self.run_delivery();row=m.ledger.status(self.root)[0];self.assertEqual(json.loads(row['package_json'])['caption'],self.package['caption'])
 def test_sending_is_known_in_progress_not_unknown(self):
  self.run_delivery();prior=m.ledger.status(self.root)[0]
  self.api.history=[{'id':'receipt','text':self.package['caption'],'channelId':'channel','status':'sending','createdAt':'2026-09-10T16:00:00Z'}]
  self.assertEqual(m.reconcile(prior,self.config,self.root,self.api)['state'],'sending')
 def test_wrong_account_cannot_send(self):
  self.api.account['email']='other@example.com'
  with self.assertRaises(m.Blocked):self.run_delivery()
  self.assertEqual(self.api.writes,[])
 def test_wrong_organization_cannot_send(self):
  self.api.account['organizations']=[]
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_cloud_owned_brand_cannot_send_from_local_runner(self):
  self.config['executor']='github_actions:richducat/eb28.co'
  with self.assertRaises(m.Blocked):self.run_delivery()
  self.assertEqual(self.api.writes,[])
 def test_changed_handle_cannot_send(self):
  self.api.channel['name']='anotherbrand'
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_wrong_channel_cannot_send(self):
  self.package['channelId']='wrong'
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_disconnected_channel_only_is_blocked(self):
  self.api.channel['isDisconnected']=True
  with self.assertRaises(m.Blocked):self.run_delivery()
  self.assertEqual(m.ledger.status(self.root),[])
  self.api.channel['isDisconnected']=False;self.assertEqual(self.run_delivery()['state'],'scheduled')
 def test_existing_remote_post_honors_daily_limit(self):
  self.api.history=[{'id':'existing','text':'Earlier post','channelId':'channel','status':'sent','sentAt':'2026-09-10T12:00:00Z'}]
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_local_day_uses_eastern_not_utc(self):
  self.api.history=[{'id':'existing','text':'Earlier post','channelId':'channel','status':'sent','sentAt':'2026-09-10T02:00:00Z'}]
  self.assertEqual(self.run_delivery()['state'],'scheduled')
 def test_duplicate_caption_is_blocked(self):
  self.api.history=[{'id':'existing','text':self.package['caption'],'channelId':'channel','status':'error','createdAt':'2026-09-09T12:00:00Z'}]
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_changed_media_cannot_send(self):
  (self.root/'art.jpg').write_bytes(b'\xff\xd8\xffchanged')
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_stale_campaign_cannot_send(self):
  self.package['date']='2026-09-09'
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_missing_review_cannot_send(self):
  self.package['visualChecked']=False
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_late_run_never_schedules_next_day(self):
  self.now=datetime(2026,9,11,3,55,tzinfo=timezone.utc)
  with self.assertRaises(m.Blocked):self.run_delivery()
 def test_typed_error_is_recorded_without_retry(self):
  self.api.error={'__typename':'LimitReachedError','message':'Queue full'}
  self.assertEqual(self.run_delivery()['state'],'failed');self.run_delivery();self.assertEqual(len(self.api.writes),1)
 def test_unexpected_error_is_uncertain(self):
  self.api.error={'__typename':'UnexpectedError','message':'Server error'}
  self.assertEqual(self.run_delivery()['state'],'unknown')
 def test_signed_and_unapproved_media_urls_are_rejected(self):
  for url in ('http://example.com/media/art.jpg','https://example.com.evil/media/art.jpg','https://example.com/media/art.jpg?signature=expires'):
   self.package['mediaUrl']=url
   with self.assertRaises(m.Blocked):m.verify_media(self.package,self.content,'https://example.com/media')
 def test_cloud_persistence_failure_prevents_buffer_write(self):
  def fail():raise m.Blocked('State host unavailable')
  with self.assertRaises(m.Blocked):m.deliver(self.package,self.config,self.policy,self.root,True,self.now,self.api,lambda *args:None,fail)
  self.assertEqual(self.api.writes,[])
 def test_previous_day_receipt_can_be_reconciled_without_resending(self):
  self.run_delivery();prior=m.ledger.status(self.root)[0]
  self.api.history=[{'id':'receipt','text':self.package['caption'],'channelId':'channel','status':'sent','sentAt':'2026-09-10T16:10:00Z','createdAt':'2026-09-10T16:00:00Z'}]
  (self.root/'art.jpg').unlink()
  self.assertEqual(m.reconcile(prior,self.config,self.root,self.api)['state'],'sent');self.assertEqual(len(self.api.writes),1)
 def test_reconciling_yesterday_keeps_todays_summary_and_updates_old_ledger(self):
  self.run_delivery();prior=m.ledger.status(self.root)[0]
  m.write_health(self.root,'test','channel',{'date':'2026-09-11','state':'scheduled','providerId':'today','dueAt':'2026-09-11T14:30:00Z'})
  self.api.history=[{'id':'receipt','text':self.package['caption'],'channelId':'channel','status':'sent','sentAt':'2026-09-11T15:00:00Z','createdAt':'2026-09-10T16:00:00Z'}]
  result=m.reconcile(prior,self.config,self.root,self.api)
  self.assertEqual(result['date'],'2026-09-10')
  self.assertEqual(m.ledger.status(self.root)[0]['state'],'sent')
  summary=json.loads((self.root/'LIVE_STATUS.json').read_text())['channels']['test_instagram']
  self.assertEqual((summary['date'],summary['providerId'],summary['state']),('2026-09-11','today','scheduled'))
 def test_new_day_failure_does_not_inherit_old_post_receipt(self):
  self.run_delivery()
  m.write_health(self.root,'test','channel',{'day':'2026-09-11','state':'blocked','reason':'Disconnected'})
  summary=json.loads((self.root/'LIVE_STATUS.json').read_text())['channels']['test_instagram']
  self.assertEqual(summary['date'],'2026-09-11');self.assertNotIn('day',summary)
  for key in ('providerId','dueAt','sentAt','externalLink'):self.assertNotIn(key,summary)
 def test_same_day_receipt_moves_from_scheduled_to_sent(self):
  self.run_delivery()
  m.write_health(self.root,'test','channel',{'day':'2026-09-10','state':'sent','providerId':'receipt','externalLink':'https://example.com/post'})
  summary=json.loads((self.root/'LIVE_STATUS.json').read_text())['channels']['test_instagram']
  self.assertEqual(summary['state'],'sent');self.assertEqual(summary['externalLink'],'https://example.com/post');self.assertNotIn('day',summary)
 def test_undated_result_cannot_overwrite_dated_summary(self):
  self.run_delivery()
  with self.assertRaises(ValueError):m.write_health(self.root,'test','channel',{'state':'sent','providerId':'unknown-day'})

if __name__=='__main__':unittest.main()
