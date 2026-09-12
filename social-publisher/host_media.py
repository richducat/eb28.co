#!/usr/bin/env python3
"""Publish only a reviewed image to the dedicated permanent media repository."""
import argparse, base64, hashlib, json, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from buffer_delivery import ROOT, Blocked, MediaNotReady, verify_media

def wait_for_media(package, content, media_base, wait_seconds=180, *, check=verify_media,
                   clock=time.monotonic, sleep=time.sleep, progress=None):
    """Poll only the public GET. Never retry an upload or a Buffer mutation."""
    deadline=clock()+max(0, wait_seconds)
    attempts=0
    while True:
        attempts+=1
        try:
            check(package,content,media_base)
            return {'state':'ready','verified':True,'checks':attempts}
        except MediaNotReady as exc:
            remaining=deadline-clock()
            if remaining<=0:
                return {'state':'media_pending','verified':False,'checks':attempts,
                        'reason':str(exc),'nextAction':'Repeat --verify-only; do not submit to Buffer until verified.'}
            if progress:progress({'state':'media_pending','checks':attempts,'reason':str(exc)})
            sleep(min(10,remaining))

def gh(*args, payload=None):
    command=['gh','api',*args]
    if payload is not None:command+=['--input','-']
    result=subprocess.run(command,input=json.dumps(payload) if payload is not None else None,text=True,capture_output=True)
    if result.returncode:raise Blocked('GitHub asset operation failed: '+result.stderr.strip())
    return json.loads(result.stdout)

def host(file, wait_seconds=180, verify_only=False, progress=None):
    package=json.loads(file.read_text());policy=json.loads((ROOT/'daily-policy.json').read_text())
    if package.get('date')!=datetime.now(ZoneInfo(policy['timezone'])).date().isoformat():raise Blocked('Only current-day reviewed artwork may be hosted.')
    if package.get('brand') not in policy['brands'] or not all(package.get(k) is True for k in ('sourceChecked','editorialChecked','visualChecked')):raise Blocked('Brand and completed review required.')
    path=(ROOT/package['image']).resolve()
    if not path.is_relative_to(ROOT) or path.suffix.lower() not in ('.jpg','.jpeg','.png'):raise Blocked('Only approved image exports inside the system may be hosted.')
    content=path.read_bytes();digest=hashlib.sha256(content).hexdigest()
    if len(content)>8_000_000 or digest!=package.get('sha256'):raise Blocked('Export is too large or changed after review.')
    remote=f"{package['date']}/{package['brand']}-{digest[:16]}{path.suffix.lower()}"
    endpoint=f"repos/{policy['mediaRepository']}/contents/{remote}"
    if not verify_only:
        try:existing=gh(endpoint)
        except Blocked as exc:
            if '404' not in str(exc):raise
            gh('--method','PUT',endpoint,payload={'message':f"Host {package['brand']} campaign for {package['date']}",'content':base64.b64encode(content).decode(),'branch':'main'})
        else:
            git_digest=hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
            if existing.get('sha')!=git_digest:raise Blocked('Immutable asset path already exists with different bytes.')
    package['mediaUrl']=policy['mediaBaseUrl'].rstrip('/')+'/'+remote
    file.write_text(json.dumps(package,indent=2)+'\n')
    result=wait_for_media(package,content,policy['mediaBaseUrl'],wait_seconds,progress=progress)
    package['mediaHosting']={**result,'checkedAt':datetime.now(timezone.utc).isoformat()}
    file.write_text(json.dumps(package,indent=2)+'\n')
    return {'mediaUrl':package['mediaUrl'],'sha256':digest,**result}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package',required=True,type=Path)
    p.add_argument('--wait-seconds',type=int,default=180)
    p.add_argument('--verify-only',action='store_true',help='Recheck the public image without any GitHub or Buffer write.')
    a=p.parse_args()
    try:
        result=host(a.package,a.wait_seconds,a.verify_only,lambda value:print(json.dumps(value),file=sys.stderr,flush=True))
        print(json.dumps(result,indent=2))
        if not result['verified']:raise SystemExit(2)
    except Blocked as exc:print(json.dumps({'verified':False,'reason':str(exc)}));raise SystemExit(1)
