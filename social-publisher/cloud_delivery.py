#!/usr/bin/env python3
"""Run the EB28 publisher beside its existing GitHub secret, without exporting it.

The dedicated state branch persists the SQLite reservation BEFORE Buffer writes.
Workflow concurrency serializes all EB28 delivery executions. A killed runner
therefore leaves a reservation that the next runner reconciles, never retries.
"""
import base64,json,os,sys,urllib.error,urllib.parse,urllib.request
from pathlib import Path
import buffer_delivery as delivery

ROOT=Path(__file__).resolve().parent
REPO='richducat/eb28.co'
BRANCH='social-delivery-state'
STATE='social-publisher-state/delivery.sqlite3'

class StateStore:
 def __init__(self):
  if os.environ.get('GITHUB_REPOSITORY')!=REPO:raise delivery.Blocked('Cloud publisher is scoped to the EB28 repository.')
  self.sha=None;self.branch_exists=True
 def request(self,path,method='GET',payload=None):
  req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/'+path,method=method,
   data=json.dumps(payload).encode() if payload is not None else None,
   headers={'Authorization':'Bearer '+os.environ['GH_STATE_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'EB28-social-delivery'})
  try:
   with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
  except urllib.error.HTTPError as exc:
   if exc.code==404:return None
   raise delivery.Blocked(f'Cloud state HTTP {exc.code}; no unrecorded Buffer writes.') from None
 def load(self):
  branch=self.request('git/ref/heads/'+BRANCH);self.branch_exists=bool(branch)
  if not branch:return
  result=self.request('contents/'+STATE+'?ref='+BRANCH)
  if result:
   self.sha=result['sha']
   blob=result if result.get('encoding')=='base64' else self.request('git/blobs/'+self.sha)
   (ROOT/'delivery.sqlite3').write_bytes(base64.b64decode(blob['content']))
 def save(self):
  if not self.branch_exists:
   main=self.request('git/ref/heads/main')
   self.request('git/refs','POST',{'ref':'refs/heads/'+BRANCH,'sha':main['object']['sha']});self.branch_exists=True
  payload={'message':'Persist EB28 social delivery reservation or receipt','branch':BRANCH,'content':base64.b64encode((ROOT/'delivery.sqlite3').read_bytes()).decode()}
  if self.sha:payload['sha']=self.sha
  result=self.request('contents/'+STATE,'PUT',payload)
  if not result:raise delivery.Blocked('Cloud state was not saved.')
  self.sha=result['content']['sha']

def main():
 store=StateStore();store.load()
 package=json.loads(os.environ['SOCIAL_PACKAGE'])
 if package.get('brand')!='eb28':raise delivery.Blocked('Only EB28 packages run in this executor.')
 policy=json.loads((ROOT/'daily-policy.json').read_text())
 config=json.loads((ROOT/'connections.json').read_text())['brands']['eb28']
 reconciled=[]
 for prior in delivery.ledger.status(ROOT):
  if prior['brand']=='eb28' and prior['state']!='sent':
   reconciled.append({'day':prior['day'],'channelId':prior['channel'],**delivery.reconcile(prior,config,ROOT)})
 if os.environ.get('SOCIAL_RECONCILE')=='true':
  if delivery.ledger.status(ROOT):store.save()
  result={'state':'reconciled','deliveries':reconciled}
  (ROOT/'cloud-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));return 0
 url=package.get('mediaUrl','');base=policy['mediaBaseUrl'].rstrip('/')+'/'
 parsed=urllib.parse.urlparse(url)
 if not url.startswith(base) or parsed.query or parsed.fragment:raise delivery.Blocked('Image must come from the approved permanent host.')
 with urllib.request.build_opener(delivery.NoRedirect).open(url,timeout=25) as r:
  data=r.read(8_000_001)
 if len(data)>8_000_000:raise delivery.Blocked('Image exceeds the approved size.')
 path=ROOT/'cloud-image.jpg';path.write_bytes(data);package['image']=path.name
 result=None
 try:
  result=delivery.deliver(package,config,policy,ROOT,os.environ.get('SOCIAL_SEND')=='true',reservation_hook=store.save)
 except Exception as exc:result={'state':'blocked','reason':str(exc)}
 finally:
  if (ROOT/'delivery.sqlite3').is_file() and delivery.ledger.status(ROOT):store.save()
 (ROOT/'cloud-result.json').write_text(json.dumps({'brand':'eb28','channelId':package['channelId'],'date':package['date'],'reconciled':reconciled,**result},indent=2)+'\n')
 print(json.dumps(result,indent=2))
 return 1 if result['state'] in ('failed','unknown','blocked') else 0

if __name__=='__main__':sys.exit(main())
