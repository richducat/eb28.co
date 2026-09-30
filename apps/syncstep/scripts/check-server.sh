#!/usr/bin/env bash
# Is the SyncStep API still being blocked by the host's Imunify360 bot shield?
# Sends OPTIONS + POST /auth/nonce N times the way the Android WebView would. Expect blocked=0.
set -uo pipefail
B="${SYNCSTEP_API:-https://sync.chatbotbuilder.store}"; N="${1:-10}"
UA='Mozilla/5.0 (Linux; Android 15; Seeker Build/AP3A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 wv'
ok=0; blocked=0
for i in $(seq 1 "$N"); do
  sleep 2
  c=$(curl -s -m 30 -o /dev/null -w '%{http_code}' -X OPTIONS -A "$UA" -H 'origin: https://localhost' -H 'access-control-request-method: POST' -H 'access-control-request-headers: content-type' "$B/auth/nonce")
  if [ "$c" = "204" ]; then ok=$((ok+1)); else blocked=$((blocked+1)); echo "preflight blocked: HTTP $c"; fi
  p=$(curl -s -m 30 -A "$UA" -H 'origin: https://localhost' -H 'content-type: application/json' -d '{"wallet":"9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn"}' "$B/auth/nonce")
  if echo "$p" | grep -q '"nonce"'; then ok=$((ok+1)); else blocked=$((blocked+1)); echo "POST blocked: $(echo "$p" | head -c 100 | tr '\n' ' ')"; fi
done
echo "passed=$ok blocked=$blocked of $((N*2)) requests"
[ "$blocked" = 0 ]
