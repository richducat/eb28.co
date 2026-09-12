import sys, unittest, urllib.error
from pathlib import Path
from unittest.mock import Mock, patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import buffer_delivery as delivery
import host_media

class MediaRecoveryTests(unittest.TestCase):
 def test_deploy_delay_recovers_using_reads_only(self):
  now=[0]
  check=Mock(side_effect=[delivery.MediaNotReady('404'),delivery.MediaNotReady('404'),None])
  result=host_media.wait_for_media({},b'image','https://example.test',30,check=check,clock=lambda:now[0],sleep=lambda n:now.__setitem__(0,now[0]+n))
  self.assertTrue(result['verified']);self.assertEqual(result['checks'],3)
 def test_pending_deploy_is_bounded_and_explicit(self):
  result=host_media.wait_for_media({},b'image','https://example.test',0,check=Mock(side_effect=delivery.MediaNotReady('404')))
  self.assertEqual(result['state'],'media_pending');self.assertFalse(result['verified']);self.assertEqual(result['checks'],1)
 def test_changed_bytes_or_mime_are_not_retried(self):
  check=Mock(side_effect=delivery.Blocked('Hosted media does not match'))
  with self.assertRaises(delivery.Blocked):host_media.wait_for_media({},b'image','https://example.test',check=check)
  self.assertEqual(check.call_count,1)
 def test_http_failure_categories(self):
  package={'mediaUrl':'https://example.test/a.jpg','mimeType':'image/jpeg'}
  for code in (404,408,429,500,503):
   opener=Mock();opener.open.side_effect=urllib.error.HTTPError(package['mediaUrl'],code,'error',{},None)
   with patch.object(delivery.urllib.request,'build_opener',return_value=opener),self.assertRaises(delivery.MediaNotReady):delivery.verify_media(package,b'image','https://example.test')
  for code in (301,401,403):
   opener=Mock();opener.open.side_effect=urllib.error.HTTPError(package['mediaUrl'],code,'error',{},None)
   with patch.object(delivery.urllib.request,'build_opener',return_value=opener),self.assertRaises(delivery.Blocked) as caught:delivery.verify_media(package,b'image','https://example.test')
   self.assertNotIsInstance(caught.exception,delivery.MediaNotReady)

if __name__=='__main__':unittest.main()
