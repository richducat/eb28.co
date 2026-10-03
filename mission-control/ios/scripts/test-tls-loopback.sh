#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${MC_TLS_SIMULATOR:?Set MC_TLS_SIMULATOR to a dedicated simulator UUID}"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
run_dir=$(mktemp -d /tmp/mission-tls-evidence.XXXXXX)
manifest="$PWD/MissionControlTLSTests/runtime.json"
rm -f "$manifest"
cleanup() {
  kill "$fixture_pid" 2>/dev/null || true
  wait "$fixture_pid" 2>/dev/null || true
  rm -f "$manifest"
}
python3 scripts/tls-loopback-fixture.py --manifest "$manifest" --events "$run_dir/server-events.jsonl" > "$run_dir/fixture.log" 2>&1 &
fixture_pid=$!
trap cleanup EXIT
for ((i=0; i<100; i++)); do
  if test -f "$manifest"; then break; fi
  if ! kill -0 "$fixture_pid" 2>/dev/null; then cat "$run_dir/fixture.log"; exit 1; fi
  sleep 0.1
done
test -f "$manifest"
xcodegen generate --spec project.yml > "$run_dir/xcodegen.log"
xcodebuild test -project MissionControl.xcodeproj -scheme MissionControlTLSTests -destination "platform=iOS Simulator,id=$MC_TLS_SIMULATOR" -derivedDataPath "$run_dir/derived" -resultBundlePath "$run_dir/tls.xcresult" CODE_SIGNING_ALLOWED=NO > "$run_dir/test.log" 2>&1 || {
  echo "TLS test failed. Evidence: $run_dir"
  tail -35 "$run_dir/test.log"
  exit 1
}
echo "TLS test passed. Evidence: $run_dir"
