import json,sys,tempfile,unittest
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
 def test_early_failure_retains_actionable_receipt(self):
  with tempfile.TemporaryDirectory() as tmp,patch.object(cloud,'ROOT',Path(tmp)),patch.object(cloud,'main',side_effect=cloud.delivery.Blocked('State host unavailable')),patch.dict(cloud.os.environ,{'SOCIAL_PACKAGE':json.dumps({'channelId':'target','date':'2026-09-12'})}):
   self.assertEqual(cloud.run(),1)
   receipt=json.loads((Path(tmp)/'cloud-result.json').read_text())
   self.assertEqual(receipt['channelId'],'target');self.assertEqual(receipt['date'],'2026-09-12');self.assertEqual(receipt['state'],'blocked')

if __name__=='__main__':unittest.main()
