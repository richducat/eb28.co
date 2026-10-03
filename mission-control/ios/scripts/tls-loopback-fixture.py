#!/usr/bin/env python3
"""Loopback-only HTTPS fixture. Generates temporary synthetic keys; installs no trust."""
import argparse, hashlib, http.server, json, socket, ssl, signal, subprocess, tempfile, threading, time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--manifest', required=True)
parser.add_argument('--events', required=True)
args = parser.parse_args()
# SIGTERM from the runner unwinds TemporaryDirectory and removes synthetic keys.
signal.signal(signal.SIGTERM, lambda *_: exit(0))
lock = threading.Lock()
states = {}

def record(server, event, **fields):
    item = {'server': server, 'event': event, **fields}
    with lock:
        states.setdefault(server, []).append(item)
        with open(args.events, 'a') as out:
            out.write(json.dumps(item) + '\n')

class TLSFixture:
    def __init__(self, name, context, held=False):
        self.name, self.context, self.held = name, context, held
        self.release = threading.Event()
        self.socket = socket.socket()
        self.socket.bind(('127.0.0.1', 0))
        self.socket.listen(8)
        self.url = 'https://127.0.0.1:%d' % self.socket.getsockname()[1]
        threading.Thread(target=self.accept, daemon=True).start()
    def accept(self):
        while True:
            raw, _ = self.socket.accept()
            threading.Thread(target=self.handle, args=(raw,), daemon=True).start()
    def handle(self, raw):
        record(self.name, 'accepted')
        raw.settimeout(10)
        if self.held and not self.release.wait(10):
            record(self.name, 'gate_timeout'); raw.close(); return
        try:
            with self.context.wrap_socket(raw, server_side=True) as conn:
                record(self.name, 'handshake', protocol=conn.version(), cipher=conn.cipher()[0])
                data = b''
                while b'\r\n\r\n' not in data:
                    block = conn.recv(4096)
                    if not block: break
                    data += block
                if data:
                    head = data.decode('iso-8859-1')
                    auth = next((x.partition(':')[2].strip() for x in head.split('\r\n') if x.lower().startswith('authorization:')), '')
                    record(self.name, 'request', synthetic_a=(auth == 'Bearer fixture-a-not-a-credential'), synthetic_b=(auth == 'Bearer fixture-b-not-a-credential'))
                    body = json.dumps({'generatedAt': self.name}).encode()
                    conn.sendall(b'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: '+str(len(body)).encode()+b'\r\n\r\n'+body)
        except (ssl.SSLError, OSError) as error:
            record(self.name, 'rejected_or_closed', kind=type(error).__name__)
            raw.close()

class Control(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/state':
            with lock: result = json.dumps(states).encode()
        elif self.path.startswith('/release/'):
            name = self.path.removeprefix('/release/')
            fixtures[name].release.set()
            record(name, 'release')
            result = b'{}'
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(result))); self.end_headers(); self.wfile.write(result)
    def log_message(self, *args): pass

with tempfile.TemporaryDirectory(prefix='mission-synthetic-tls-') as directory:
    certs, contexts = {}, {}
    for name in ('a', 'b'):
        cert, key = Path(directory)/f'{name}.pem', Path(directory)/f'{name}.key'
        subprocess.run(['/usr/bin/openssl','req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','1','-subj','/CN=localhost','-keyout',str(key),'-out',str(cert)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        der = subprocess.check_output(['/usr/bin/openssl','x509','-in',str(cert),'-outform','DER'])
        certs[name] = hashlib.sha256(der).hexdigest()
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(str(cert), str(key)); contexts[name] = context
    fixtures = {'match_a': TLSFixture('match_a', contexts['a']),
                'mismatch_b': TLSFixture('mismatch_b', contexts['b']),
                'held_a': TLSFixture('held_a', contexts['a'], held=True),
                'held_b': TLSFixture('held_b', contexts['b'], held=True)}
    control = http.server.ThreadingHTTPServer(('127.0.0.1',0), Control)
    manifest = {'fingerprintA':certs['a'], 'fingerprintB':certs['b'],
                'control':'http://127.0.0.1:%d' % control.server_port,
                'urls':{name:f.url for name,f in fixtures.items()}}
    Path(args.manifest).write_text(json.dumps(manifest))
    print('Synthetic HTTPS fixture ready on loopback; no trust installation.', flush=True)
    control.serve_forever()
