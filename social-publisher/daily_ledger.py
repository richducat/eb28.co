#!/usr/bin/env python3
"""Single-Mac daily publishing reservations and evidence. Does not send posts."""
import argparse, hashlib, json, sqlite3
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parent

def connect(root=ROOT):
    db=sqlite3.connect(root/'delivery.sqlite3', timeout=30)
    db.row_factory=sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS deliveries (
      brand TEXT NOT NULL, day TEXT NOT NULL, channel TEXT NOT NULL,
      content_hash TEXT NOT NULL, state TEXT NOT NULL, evidence TEXT NOT NULL,
      provider_id TEXT, updated_at TEXT NOT NULL,
      PRIMARY KEY(brand,day,channel))''')
    db.execute('BEGIN IMMEDIATE')
    if 'package_json' not in {r['name'] for r in db.execute('PRAGMA table_info(deliveries)')}:
        db.execute("ALTER TABLE deliveries ADD COLUMN package_json TEXT NOT NULL DEFAULT '{}'")
    db.commit()
    return db

def reserve(brand,channel,package,root=ROOT,now=None):
    policy=json.loads((root/'daily-policy.json').read_text())
    now=now or datetime.now(ZoneInfo(policy['timezone']))
    day=now.astimezone(ZoneInfo(policy['timezone'])).date().isoformat()
    settings=policy['brands'].get(brand,{})
    if not policy['publishingAuthorized'] or not settings.get('enabled') or channel not in settings.get('channelIds',[]):
        raise ValueError('Publication is not authorized for this exact brand and channel.')
    if package.get('date')!=day or package.get('brand')!=brand:
        raise ValueError('Only a fresh package for today and this brand may be submitted.')
    if package.get('channelId',channel)!=channel:
        raise ValueError('Package channel does not match the reserved channel.')
    required=['sourceChecked','editorialChecked','visualChecked','accountChecked','remoteHistoryChecked']
    if not all(package.get(k) is True for k in required):
        raise ValueError('Complete source, editorial, visual, account and remote history checks before reserving.')
    text=package.get('caption','').strip()
    image=(root/package.get('image','')).resolve()
    if not text or not image.is_relative_to(root.resolve()) or not image.is_file() or image.suffix.lower() not in ('.jpg','.jpeg','.png','.mp4'):
        raise ValueError('Caption and actual supported media are required.')
    digest=hashlib.sha256(text.encode()+image.read_bytes()).hexdigest()
    with connect(root) as db:
        db.execute('BEGIN IMMEDIATE')
        prior=db.execute('SELECT * FROM deliveries WHERE brand=? AND day=? AND channel=?',(brand,day,channel)).fetchone()
        if prior:
            return {'reserved':False, 'existing':dict(prior),'instruction':'Reconcile this provider submission; do not submit again.'}
        recent=db.execute('SELECT day FROM deliveries WHERE brand=? AND channel=? AND content_hash=?',(brand,channel,digest)).fetchone()
        if recent:raise ValueError('Identical image and caption already reserved previously; create fresh content.')
        db.execute('INSERT INTO deliveries (brand,day,channel,content_hash,state,evidence,provider_id,updated_at,package_json) VALUES (?,?,?,?,?,?,?,?,?)',(brand,day,channel,digest,'submitting',json.dumps(package),None,now.isoformat(),json.dumps(package)))
    return {'reserved':True,'brand':brand,'day':day,'channel':channel,'contentHash':digest}

def record(brand,day,channel,state,evidence,provider_id=None,root=ROOT):
    if state not in ('scheduled','sending','sent','failed','unknown','cancelled') or not evidence.strip():
        raise ValueError('A supported state and observed provider evidence are required.')
    if state in ('scheduled','sending','sent') and not provider_id:
        raise ValueError('A Buffer post ID or native post URL is required, not just a toast.')
    with connect(root) as db:
        prior=db.execute('SELECT * FROM deliveries WHERE brand=? AND day=? AND channel=?',(brand,day,channel)).fetchone()
        if not prior:raise ValueError('Reserve before submitting; receipt has no reservation.')
        if prior['state']=='sent' and state!='sent':raise ValueError('A sent post cannot silently become unsent.')
        if prior['provider_id'] and provider_id and prior['provider_id']!=provider_id:raise ValueError('Provider identity changed; inspect for duplicate submission.')
        db.execute('UPDATE deliveries SET state=?,evidence=?,provider_id=?,updated_at=? WHERE brand=? AND day=? AND channel=?',
          (state,evidence,provider_id or prior['provider_id'],datetime.now().astimezone().isoformat(),brand,day,channel))
    return {'state':state,'providerId':provider_id}

def status(root=ROOT):
    with connect(root) as db:return [dict(r) for r in db.execute('SELECT * FROM deliveries ORDER BY day DESC,brand,channel')]

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);s=p.add_subparsers(dest='command',required=True)
    r=s.add_parser('reserve');r.add_argument('--brand',required=True);r.add_argument('--channel',required=True);r.add_argument('--package',type=Path,required=True)
    r=s.add_parser('record');r.add_argument('--brand',required=True);r.add_argument('--day',required=True);r.add_argument('--channel',required=True);r.add_argument('--state',required=True);r.add_argument('--evidence',required=True);r.add_argument('--provider-id')
    s.add_parser('status');a=p.parse_args()
    if a.command=='reserve':out=reserve(a.brand,a.channel,json.loads(a.package.read_text()))
    elif a.command=='record':out=record(a.brand,a.day,a.channel,a.state,a.evidence,a.provider_id)
    else:out=status()
    print(json.dumps(out,indent=2))
