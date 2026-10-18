#!/usr/bin/env python3
"""Move EB28 manual jobs to this Mac. Provider state remains on its existing branch."""
import argparse,datetime,fcntl,json,os,subprocess,sys,uuid
from pathlib import Path
HOME=Path.home();H=HOME/'hermes-handoff';W=H/'workspaces/actions-migration';ROOT=Path(__file__).resolve().parents[2]
os.umask(0o077)
sys.path.insert(0,str(W/'tyfys-benefits/ops/local-ci'));from cpanel import envfile

def run(cmd,env):return subprocess.run(cmd,cwd=ROOT,env=env,check=True,timeout=900)
def main():
 p=argparse.ArgumentParser();p.add_argument('job',choices=['audit','delivery','organic','fundmanager']);p.add_argument('--package');p.add_argument('--reconcile',action='store_true');p.add_argument('--send',action='store_true');p.add_argument('--slot',choices=['auto','am','pm'],default='auto');p.add_argument('--dry-run',action='store_true');a=p.parse_args()
 lock=(W/'eb28.lock').open('a')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise SystemExit('EB28 job already running')
 folder=W/'runs'/('eb28-'+a.job)/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:8]);folder.mkdir(parents=True)
 receipt={'job':'eb28-'+a.job,'state':'running','started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'log':str(folder/'job.log')};code=0
 env={**os.environ,**envfile(H/'private/actions-migration/jobs.env')};env.pop('NODE_ENV',None);env['PATH']='/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:'+env.get('PATH','')
 with (folder/'job.log').open('w') as log:
  old1,old2=os.dup(1),os.dup(2);sys.stdout.flush();os.dup2(log.fileno(),1);os.dup2(log.fileno(),2)
  try:
   if a.job=='fundmanager':
    print('DISABLED: existing private-data exposure stop preserved. No generator or public upload executed.');receipt['detail']='disabled_private_data_exposure'
   elif a.job=='audit':
    if not env.get('BUFFER_API_KEY'):raise RuntimeError('BUFFER_API_KEY for social@eb28.co is stored only in GitHub; encrypted secrets cannot be exported')
    env.update(EB28_BUFFER_EXPECTED_ACCOUNT_EMAIL='social@eb28.co')
    run(['node','scripts/publish-eb28-buffer.mjs','--verify'],env)
   elif a.job=='delivery':
    if not env.get('EB28_BUFFER_API_KEY') and env.get('BUFFER_API_KEY'):env['EB28_BUFFER_API_KEY']=env['BUFFER_API_KEY']
    if not env.get('EB28_BUFFER_API_KEY'):raise RuntimeError('Missing account-specific EB28 Buffer key in private jobs.env')
    env['GH_STATE_TOKEN']=subprocess.check_output(['gh','auth','token'],text=True).strip()
    env.update(GITHUB_REPOSITORY='richducat/eb28.co',SOCIAL_PACKAGE=Path(a.package).read_text() if a.package else '{"brand":"eb28"}',SOCIAL_SEND=str(a.send).lower(),SOCIAL_RECONCILE=str(a.reconcile).lower())
    run([sys.executable,'social-publisher/cloud_delivery.py'],env)
    result=ROOT/'social-publisher/cloud-result.json'
    if result.exists():(folder/'provider-receipt.json').write_bytes(result.read_bytes())
   else:
    command=['node','scripts/eb28-content-engine.mjs','--slot',a.slot]
    if not a.dry_run:command+=['--write']
    run(command,env)
    if not a.dry_run:
     run(['node','scripts/generate-eb28-blog.mjs'],env)
     run(['node','scripts/publish-eb28-buffer.mjs','--prepare','--slot',a.slot],env)
     run(['npm','run','check:eb28-seo'],env);run(['git','diff','--check'],env)
     run(['git','add','content/eb28/articles.json','content/eb28/content-state.json','content/eb28/topic-backlog.json','content/eb28/seo-outreach-queue.md','docs/blog','docs/data/eb28-blog-feed.json','docs/sitemap.xml','output/eb28-social'],env)
     if subprocess.call(['git','diff','--cached','--quiet'],cwd=ROOT):
      run(['git','-c','user.name=OG Kush','-c','user.email=codex@local','commit','-m','Update EB28 organic growth content'],env)
      run(['git','pull','--rebase','origin','main'],env);run(['git','push','origin','HEAD:main'],env)
  except BaseException as exc:code=1;print(type(exc).__name__+': '+str(exc));receipt['error']=str(exc)
  finally:sys.stdout.flush();sys.stderr.flush();os.dup2(old1,1);os.dup2(old2,2);os.close(old1);os.close(old2)
 receipt.update(state='failure' if code else 'success',finished=datetime.datetime.now(datetime.timezone.utc).isoformat())
 (folder/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');dest=H/'issues/local-jobs'/('eb28-'+a.job+'.json');tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps(receipt)+'\n');tmp.replace(dest)
 print(json.dumps(receipt));return code
if __name__=='__main__':raise SystemExit(main())
