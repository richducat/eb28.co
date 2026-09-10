#!/usr/bin/env python3
"""Account-scoped Buffer delivery. Preflight by default; --send writes once.

No queue edits, backlog retries, account fallback, or browser publishing.
An uncertain write stays reserved until a provider receipt is found.
"""
import argparse
import fcntl
import hashlib
import json
import os
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import daily_ledger as ledger

ROOT = Path(__file__).resolve().parent
POST_FIELDS = 'id text channelId status dueAt sentAt externalLink createdAt'


class Blocked(Exception):
    pass


class BufferAPI:
    def __init__(self, key):
        self.key = key

    def query(self, query, variables=None):
        request = urllib.request.Request('https://api.buffer.com',
            data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
            headers={'Authorization': 'Bearer ' + self.key, 'Content-Type': 'application/json'})
        # A timeout may follow an accepted mutation. Never retry this request here.
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                result = json.load(response)
        except urllib.error.HTTPError as exc:
            raise Blocked(f'Buffer HTTP {exc.code}; no automatic mutation retry.') from None
        except (urllib.error.URLError, TimeoutError, ValueError):
            raise Blocked('Buffer response unavailable; no automatic mutation retry.') from None
        if result.get('errors'):
            codes = [e.get('extensions', {}).get('code', 'GRAPHQL_ERROR') for e in result['errors']]
            raise Blocked('Buffer GraphQL error: ' + ', '.join(codes))
        if not isinstance(result.get('data'), dict):
            raise Blocked('Buffer returned no data.')
        return result['data']

    def context(self, org):
        return self.query('''query Context($input: ChannelsInput!) {
          account { id email organizations { id name } }
          channels(input:$input) { id name displayName service isQueuePaused isDisconnected isLocked }
        }''', {'input': {'organizationId': org}})

    def posts(self, org, channel):
        posts, cursor, seen = [], None, set()
        for _ in range(10):
            result = self.query('''query History($input: PostsInput!, $after: String) {
              posts(first:100,after:$after,input:$input) {
                pageInfo { hasNextPage endCursor }
                edges { node { ''' + POST_FIELDS + ''' } }
              }
            }''', {'input': {'organizationId': org, 'filter': {'channelIds': [channel]},
                             'sort': [{'field': 'createdAt', 'direction': 'desc'}]}, 'after': cursor})['posts']
            posts.extend(e['node'] for e in result['edges'])
            if not result['pageInfo']['hasNextPage']:
                return posts
            cursor = result['pageInfo']['endCursor']
            if not cursor or cursor in seen:
                raise Blocked('Buffer pagination did not advance; history is incomplete.')
            seen.add(cursor)
        raise Blocked('History exceeds 1,000 posts; narrow the verified history before sending.')

    def create(self, payload):
        return self.query('''mutation Publish($input: CreatePostInput!) {
          createPost(input:$input) {
            __typename
            ... on PostActionSuccess { post { ''' + POST_FIELDS + ''' } }
            ... on MutationError { message }
          }
        }''', {'input': payload})['createPost']


def instant(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')) if value else None


def local_day(value, tz):
    parsed = instant(value)
    return parsed.astimezone(tz).date().isoformat() if parsed else None


def key_for(config):
    key = os.environ.get(config.get('keyEnv', ''), '').strip()
    if key:
        return key
    filename = config.get('keyFile')
    if filename and Path(filename).is_file():
        path = Path(filename)
        if stat.S_IMODE(path.stat().st_mode) & 0o077:
            raise Blocked('Integration key file must be readable only by its owner (0600).')
        return path.read_text().strip()
    raise Blocked('Account-specific API key unavailable on this executor.')


def validate_package(package, config, root, now, tz):
    if package.get('brand') != config['brand'] or package.get('date') != now.astimezone(tz).date().isoformat():
        raise Blocked('Package must be for this brand and the current local day.')
    if not all(package.get(k) is True for k in ('sourceChecked', 'editorialChecked', 'visualChecked')):
        raise Blocked('Source, copy and visual review must be complete.')
    channel = config['channels'].get(package.get('channelId'))
    if not channel or channel['platform'] != package.get('platform'):
        raise Blocked('Exact channel/platform is outside this brand configuration.')
    if not config.get('accountEmail') or not config.get('organizationId'):
        raise Blocked('Account email and organization must be verified and pinned first.')
    if not package.get('caption', '').strip():
        raise Blocked('Caption is empty.')
    path = (root / package.get('image', '')).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise Blocked('Media must be an existing file inside the social system.')
    content = path.read_bytes()
    if len(content) > 8_000_000 or path.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
        raise Blocked('This publisher accepts JPEG/PNG image campaigns up to 8 MB.')
    expected_mime = 'image/jpeg' if content.startswith(b'\xff\xd8\xff') else 'image/png' if content.startswith(b'\x89PNG\r\n\x1a\n') else None
    if expected_mime is None or expected_mime != package.get('mimeType'):
        raise Blocked('Media bytes do not match the declared image format.')
    if hashlib.sha256(content).hexdigest() != package.get('sha256'):
        raise Blocked('Artwork changed after review; refresh the verified package.')
    return channel, content


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def verify_media(package, content, media_base):
    url = package.get('mediaUrl') or ''
    parsed = urllib.parse.urlparse(url)
    if (parsed.scheme != 'https' or not url.startswith(media_base.rstrip('/') + '/')
            or parsed.query or parsed.fragment or parsed.username or parsed.password):
        raise Blocked('Media needs a permanent direct URL on the configured public asset host.')
    request = urllib.request.Request(url, headers={'User-Agent': 'SocialMediaPreflight/1.0'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=25) as response:
            remote = response.read(len(content) + 1)
            mime = response.headers.get_content_type()
    except (urllib.error.URLError, TimeoutError):
        raise Blocked('Public media is not directly reachable yet; preserve package and try preflight later.') from None
    if remote != content or mime != package['mimeType']:
        raise Blocked('Hosted media does not exactly match the reviewed export or MIME type.')


def verify_identity(context, config, package):
    account = context.get('account', {})
    if account.get('email', '').lower() != config['accountEmail'].lower():
        raise Blocked('API key belongs to a different Buffer account.')
    if config['organizationId'] not in {o['id'] for o in account.get('organizations', [])}:
        raise Blocked('Expected organization is not available to this account.')
    channel = next((c for c in context.get('channels', []) if c['id'] == package['channelId']), None)
    expected = config['channels'][package['channelId']]
    if not channel or channel['service'] != package['platform']:
        raise Blocked('Expected channel/platform is unavailable.')
    if channel.get('name', '').lstrip('@').lower() != expected['handle'].lstrip('@').lower():
        raise Blocked('Channel handle changed; verify the account mapping before sending.')
    return channel


def record_post(package, post, root):
    mapping = {'sent': 'sent', 'scheduled': 'scheduled', 'error': 'failed'}
    state = mapping.get(post['status'], 'unknown')
    ledger.record(package['brand'], package['date'], package['channelId'], state,
                  json.dumps({'provider': post, 'checkedAt': datetime.now(timezone.utc).isoformat()}), post['id'], root)
    result = {'state': state, 'providerId': post['id'], 'dueAt': post.get('dueAt'),
              'sentAt': post.get('sentAt'), 'externalLink': post.get('externalLink')}
    write_health(root, package['brand'], package['channelId'], result)
    return result


def write_health(root, brand, channel_id, result):
    filename = root / 'LIVE_STATUS.json'
    if not filename.is_file():
        return
    config = json.loads((root / 'connections.json').read_text())['brands'][brand]
    platform = config['channels'][channel_id]['platform']
    key = ('inspection' if brand == 'inspection-rent' else brand) + '_' + platform
    with (root / '.live-status.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        document = json.loads(filename.read_text())
        entry = document.setdefault('channels', {}).setdefault(key, {})
        if result['state'] in ('scheduled', 'sent'):
            entry.pop('reason', None)
            entry.pop('needs', None)
        entry.update(result)
        entry['checkedAt'] = datetime.now(timezone.utc).isoformat()
        document['updatedAt'] = entry['checkedAt']
        temporary = filename.with_suffix(f'.{os.getpid()}.tmp')
        temporary.write_text(json.dumps(document, indent=2) + '\n')
        temporary.replace(filename)


def reconcile(prior, config, root=ROOT, api=None):
    package = json.loads(prior['package_json'])
    if package.get('brand') != config['brand'] or package.get('channelId') not in config['channels']:
        raise Blocked('Stored reservation does not match this account configuration.')
    api = api or BufferAPI(key_for(config))
    verify_identity(api.context(config['organizationId']), config, package)
    posts = api.posts(config['organizationId'], package['channelId'])
    tz = ZoneInfo(json.loads((root / 'daily-policy.json').read_text())['timezone'])
    matches = [p for p in posts if p['id'] == prior['provider_id']] if prior['provider_id'] else [
        p for p in posts if p['text'].strip() == package['caption'].strip()
        and local_day(p.get('createdAt'), tz) == prior['day']]
    if len(matches) != 1:
        return {'state': prior['state'], 'action': 'reconcile_only', 'reason': 'Provider match missing or ambiguous; no new write.'}
    post = matches[0]
    if post['channelId'] != prior['channel'] or post['text'].strip() != package['caption'].strip():
        raise Blocked('Provider receipt does not match the stored reservation.')
    return record_post(package, post, root)


def deliver(package, config, policy, root=ROOT, send=False, now=None, api=None, media_check=verify_media, reservation_hook=None):
    tz = ZoneInfo(policy['timezone'])
    now = now or datetime.now(timezone.utc)
    _, content = validate_package(package, config, root, now, tz)
    settings = policy['brands'].get(package['brand'], {})
    if not policy.get('publishingAuthorized') or not settings.get('enabled') or package['channelId'] not in settings.get('channelIds', []):
        raise Blocked('Daily publication is not authorized for this channel.')
    executor = config.get('executor', '')
    if executor.startswith('github_actions:') and os.environ.get('GITHUB_REPOSITORY') != executor.split(':', 1)[1]:
        raise Blocked('This brand publishes through its existing GitHub integration; dispatch the verified delivery workflow.')
    api = api or BufferAPI(key_for(config))
    channel = verify_identity(api.context(config['organizationId']), config, package)
    posts = api.posts(config['organizationId'], package['channelId'])
    if any(p.get('channelId') != package['channelId'] for p in posts):
        raise Blocked('History includes a different channel; cannot safely reconcile.')
    prior = next((p for p in ledger.status(root) if (p['brand'], p['day'], p['channel']) ==
                  (package['brand'], package['date'], package['channelId'])), None)
    if prior:
        matches = [p for p in posts if p['id'] == prior['provider_id']] if prior['provider_id'] else [
            p for p in posts if p['text'].strip() == package['caption'].strip()
            and local_day(p.get('createdAt'), tz) == package['date']]
        if len(matches) == 1:
            return record_post(package, matches[0], root)
        return {'state': prior['state'], 'action': 'reconcile_only', 'reason': 'Existing reservation; no new write. Provider match missing or ambiguous.'}
    if any(p.get('status') in ('scheduled', 'sending', 'sent') and
           local_day(p.get('sentAt') if p['status'] == 'sent' else p.get('dueAt'), tz) == package['date'] for p in posts):
        raise Blocked('This channel already has a scheduled, sending or sent post for today; daily cap prevents another.')
    if any(p.get('text', '').strip() == package['caption'].strip() for p in posts):
        raise Blocked('Matching caption already exists in Buffer; reconcile it instead of creating a duplicate.')
    for flag in ('isDisconnected', 'isQueuePaused', 'isLocked'):
        if channel.get(flag) is not False:
            raise Blocked(f'Channel is unavailable: {flag}. Other channels can continue.')
    media_check(package, content, policy['mediaBaseUrl'])
    hour, minute = map(int, settings['preferredPublishTime'].split(':'))
    due = now.astimezone(tz).replace(hour=hour, minute=minute, second=0, microsecond=0)
    due = max(due, now.astimezone(tz) + timedelta(minutes=10))
    if due.date().isoformat() != package['date']:
        raise Blocked('Too late to schedule a fresh same-day post; no overnight backlog replay.')
    payload = {'channelId': package['channelId'], 'text': package['caption'],
               'schedulingType': 'automatic', 'mode': 'customScheduled',
               'dueAt': due.astimezone(timezone.utc).isoformat(), 'needsApproval': False,
               'saveToDraft': False, 'aiAssisted': True,
               'assets': [{'image': {'url': package['mediaUrl'], 'metadata': {'altText': package.get('altText', '')}}}],
               'metadata': package.get('metadata', {})}
    if not send:
        return {'state': 'ready', 'channelId': package['channelId'], 'dueAt': payload['dueAt'], 'writePerformed': False}
    prepared = dict(package, accountChecked=True, remoteHistoryChecked=True, dueAt=payload['dueAt'])
    reservation = ledger.reserve(package['brand'], package['channelId'], prepared, root, now)
    if not reservation['reserved']:
        return {'state': 'reserved_elsewhere', 'action': 'reconcile_only'}
    if reservation_hook:
        # Cloud workers must durably persist intent before touching Buffer.
        # Failure here must prevent the request, even if the local reservation exists.
        reservation_hook()
    try:
        result = api.create(payload)
        post = result.get('post')
        if not post or not post.get('id'):
            # Typed rejections are retained for diagnosis, never automatically reissued.
            state = 'failed' if result.get('__typename') in ('LimitReachedError', 'InvalidInputError', 'UnauthorizedError', 'NotFoundError') else 'unknown'
            ledger.record(package['brand'], package['date'], package['channelId'], state, json.dumps(result), root=root)
            return {'state': state, 'providerError': result.get('__typename', 'UnknownResponse'), 'reason': result.get('message', 'No provider post ID')}
        if post.get('channelId') != package['channelId'] or post.get('text', '').strip() != package['caption'].strip():
            raise Blocked('Create response does not match the intended channel and caption.')
        return record_post(package, post, root)
    except Exception as exc:
        ledger.record(package['brand'], package['date'], package['channelId'], 'unknown',
                      'Submission outcome uncertain: ' + str(exc), root=root)
        return {'state': 'unknown', 'reason': str(exc), 'action': 'reconcile_only'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path, action='append', default=[])
    parser.add_argument('--send', action='store_true')
    parser.add_argument('--reconcile-all', action='store_true', help='Read receipts for existing reservations, including earlier dates.')
    args = parser.parse_args()
    configs = json.loads((ROOT / 'connections.json').read_text())['brands']
    policy = json.loads((ROOT / 'daily-policy.json').read_text())
    reports = []
    if args.reconcile_all:
        if args.send or args.package:
            parser.error('--reconcile-all cannot be combined with --send or --package')
        for prior in ledger.status(ROOT):
            try:
                config = configs[prior['brand']]
                if config.get('executor', '').startswith('github_actions:'):
                    continue
                result = reconcile(prior, config)
            except Exception as exc:
                result = {'state': 'blocked', 'reason': str(exc)}
            reports.append({'brand': prior['brand'], 'day': prior['day'], 'channel': prior['channel'], **result})
    elif not args.package:
        parser.error('Provide --package or --reconcile-all')
    for filename in args.package:
        try:
            package = json.loads(filename.read_text())
            result = deliver(package, configs[package['brand']], policy, send=args.send)
        except Exception as exc:
            result = {'state': 'blocked', 'reason': str(exc)}
        reports.append({'package': str(filename), **result})
    print(json.dumps(reports, indent=2))
    return 1 if any(r['state'] in ('blocked', 'failed', 'unknown') for r in reports) else 0


if __name__ == '__main__':
    sys.exit(main())
