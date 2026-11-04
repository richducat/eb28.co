import hashlib,io,json,sys,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import cloud_delivery as cloud

class CloudRecoveryTests(unittest.TestCase):
 def test_missing_existing_state_never_initializes_empty_ledger(self):
  with patch.dict(cloud.os.environ,{'GITHUB_REPOSITORY':cloud.REPO}):
   for responses in ([None],[{'ref':'existing'},None],[{'ref':'existing'},{'sha':'a','encoding':'base64','content':''}]):
    store=cloud.StateStore();store.request=Mock(side_effect=responses)
    with tempfile.TemporaryDirectory() as tmp,patch.object(cloud,'ROOT',Path(tmp)):
     with self.assertRaises(cloud.delivery.Blocked):store.load()
     self.assertFalse((Path(tmp)/'delivery.sqlite3').exists())
 def test_transient_reads_retry_but_auth_and_missing_state_do_not(self):
  for code, attempts in ((500,3),(503,3),(401,1),(403,1),(404,1)):
   error=urllib.error.HTTPError('https://api.github.com',code,'error',{},None)
   with patch.dict(cloud.os.environ,{'GITHUB_REPOSITORY':cloud.REPO,'GH_STATE_TOKEN':'test'}),patch.object(cloud.urllib.request,'urlopen',side_effect=error) as request,patch.object(cloud.time,'sleep'):
    store=cloud.StateStore()
    if code==404:self.assertIsNone(store.request('state'))
    else:
     with self.assertRaises(cloud.delivery.Blocked):store.request('state')
    self.assertEqual(request.call_count,attempts)
 def test_transient_read_recovers(self):
  response=Mock();response.__enter__=Mock(return_value=io.BytesIO(b'{"sha":"ok"}'));response.__exit__=Mock(return_value=False)
  error=urllib.error.HTTPError('https://api.github.com',500,'error',{},None)
  with patch.dict(cloud.os.environ,{'GITHUB_REPOSITORY':cloud.REPO,'GH_STATE_TOKEN':'test'}),patch.object(cloud.urllib.request,'urlopen',side_effect=[error,response]),patch.object(cloud.time,'sleep'):
   self.assertEqual(cloud.StateStore().request('state'),{'sha':'ok'})
 def test_save_recovers_only_after_readback(self):
  data=b'ledger';expected=hashlib.sha1(b'blob 6\0'+data).hexdigest()
  cases=[([cloud.TransientStateError('500'),{'sha':expected}],expected,2),
         ([cloud.TransientStateError('500'),{'sha':'old'},{'content':{'sha':expected}}],expected,3),
         ([cloud.TransientStateError('500'),{'sha':'changed'}],None,2),
         ([cloud.TransientStateError('500'),None],None,2),
         ([cloud.TransientStateError('500'),{'sha':'old'}]*3,None,6)]
  with patch.dict(cloud.os.environ,{'GITHUB_REPOSITORY':cloud.REPO}),tempfile.TemporaryDirectory() as tmp,patch.object(cloud,'ROOT',Path(tmp)),patch.object(cloud.time,'sleep'):
   (Path(tmp)/'delivery.sqlite3').write_bytes(data)
   for responses,sha,count in cases:
    store=cloud.StateStore();store.sha='old';store.request=Mock(side_effect=responses)
    if sha:store.save();self.assertEqual(store.sha,sha)
    else:
     with self.assertRaises(cloud.delivery.Blocked):store.save()
    self.assertEqual(store.request.call_count,count)
 def test_early_failure_retains_actionable_receipt(self):
  with tempfile.TemporaryDirectory() as tmp,patch.object(cloud,'ROOT',Path(tmp)),patch.object(cloud,'main',side_effect=cloud.delivery.Blocked('State host unavailable')),patch.dict(cloud.os.environ,{'SOCIAL_PACKAGE':json.dumps({'channelId':'target','date':'2026-09-12'})}):
   self.assertEqual(cloud.run(),1)
   receipt=json.loads((Path(tmp)/'cloud-result.json').read_text())
   self.assertEqual(receipt['channelId'],'target');self.assertEqual(receipt['date'],'2026-09-12');self.assertEqual(receipt['state'],'blocked')

if __name__=='__main__':unittest.main()
