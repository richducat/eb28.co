#!/usr/bin/env bash
# SyncStep release: build, sign with the 2.5 release key, verify, optionally submit to the Solana dApp Store.
#
#   SYNCSTEP_KEYSTORE_PATH=~/path/release.keystore SYNCSTEP_KEYSTORE_PASSWORD=... \
#     apps/syncstep/scripts/release.sh            # build + sign + verify -> dist/syncstep-<ver>.apk
#   ... DAPP_STORE_API_KEY=... SYNCSTEP_PUBLISHER_KEYPAIR=~/path/publisher.json \
#     apps/syncstep/scripts/release.sh --skip-build --submit
#
# Env:
#   SYNCSTEP_KEYSTORE_PATH, SYNCSTEP_KEYSTORE_PASSWORD   required (the keystore used for 1.7 through 2.5)
#   SYNCSTEP_KEY_ALIAS, SYNCSTEP_KEY_PASSWORD            optional (alias auto-detected; key password defaults to store password)
#   DAPP_STORE_API_KEY, SYNCSTEP_PUBLISHER_KEYPAIR       required only with --submit
#   EXPECT_CERT_SHA256                                   override the pinned signing cert (tests only)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_PACKAGE="${EXPECTED_PACKAGE:-com.richardducat.syncstep}"
EXPECTED_VERSION_CODE="${EXPECTED_VERSION_CODE:-19}"
EXPECTED_CERT="${EXPECT_CERT_SHA256:-2ad1ce68cc9ce6beaff01ef59b22180ad8188542b7556860b642111aa0e4a834}"
OUT_DIR="${OUT_DIR:-$HERE/dist}"
CLI_VERSION="1.0.1"
WHATS_NEW="Wallet connection now uses Solana Mobile's native Mobile Wallet Adapter, so connecting Seed Vault, Phantom or Solflare on Seeker and Saga completes in one tap. Clearer messages when the game server is busy. Same GPS hex map, Syncs, Steppers, streaks and Dig minigame."

DO_BUILD=1; DO_SUBMIT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-build) DO_BUILD=0 ;;
    --submit) DO_SUBMIT=1 ;;
    --whats-new) shift; WHATS_NEW="$1" ;;
    -h|--help) sed -n '2,16p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac; shift
done

die() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "== $*"; }

: "${SYNCSTEP_KEYSTORE_PATH:?set SYNCSTEP_KEYSTORE_PATH to the keystore used for SyncStep 1.7 to 2.5}"
: "${SYNCSTEP_KEYSTORE_PASSWORD:?set SYNCSTEP_KEYSTORE_PASSWORD}"
[ -f "$SYNCSTEP_KEYSTORE_PATH" ] || die "keystore not found: $SYNCSTEP_KEYSTORE_PATH"
export SYNCSTEP_KEY_PASSWORD="${SYNCSTEP_KEY_PASSWORD:-$SYNCSTEP_KEYSTORE_PASSWORD}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
[ -d "$SDK/build-tools" ] || die "Android SDK not found (set ANDROID_HOME); looked in $SDK"
BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | while read -r d; do [ -x "${d}apksigner" ] && [ -x "${d}zipalign" ] && echo "${d%/}"; done | sort -V | tail -1)"
[ -n "$BT" ] || die "no build-tools with apksigner and zipalign under $SDK/build-tools"
command -v keytool >/dev/null || die "keytool (JDK) not on PATH"

ALIAS="${SYNCSTEP_KEY_ALIAS:-}"
if [ -z "$ALIAS" ]; then
  ALIAS="$(keytool -list -keystore "$SYNCSTEP_KEYSTORE_PATH" -storepass:env SYNCSTEP_KEYSTORE_PASSWORD 2>/dev/null | awk -F, '/PrivateKeyEntry/ && !d {print $1; d=1}')"
  [ -n "$ALIAS" ] || die "could not read a key alias; wrong keystore password, or set SYNCSTEP_KEY_ALIAS"
  echo "key alias: $ALIAS"
fi

if [ "$DO_BUILD" = 1 ]; then
  step "Building release APK"
  [ -d "$HERE/node_modules" ] || (cd "$HERE" && npm install --no-audit --no-fund)
  (cd "$HERE" && ./node_modules/.bin/cap sync android)
  [ -f "$HERE/android/local.properties" ] || echo "sdk.dir=$SDK" > "$HERE/android/local.properties"
  # assembleRelease must NOT sign: we sign below so the same path works on any machine.
  (cd "$HERE/android" && env -u SYNCSTEP_KEYSTORE_PATH ./gradlew assembleRelease --no-daemon)
fi

UNSIGNED="$HERE/android/app/build/outputs/apk/release/app-release-unsigned.apk"
[ -f "$UNSIGNED" ] || die "missing $UNSIGNED (run without --skip-build)"
mkdir -p "$OUT_DIR"
ALIGNED="$OUT_DIR/.aligned.apk"
step "Aligning and signing"
rm -f "$ALIGNED"
"$BT/zipalign" -p -f 4 "$UNSIGNED" "$ALIGNED"
TMP_SIGNED="$OUT_DIR/.signed.apk"
rm -f "$TMP_SIGNED"
"$BT/apksigner" sign --ks "$SYNCSTEP_KEYSTORE_PATH" --ks-key-alias "$ALIAS" \
  --ks-pass env:SYNCSTEP_KEYSTORE_PASSWORD --key-pass env:SYNCSTEP_KEY_PASSWORD \
  --v4-signing-enabled false --out "$TMP_SIGNED" "$ALIGNED"
rm -f "$ALIGNED"

step "Verifying"
CERTS="$("$BT/apksigner" verify --verbose --print-certs "$TMP_SIGNED")"
echo "$CERTS" | grep -E "Verifies|Verified using v[23] |Number of signers" || true
GOT_CERT="$(echo "$CERTS" | awk -F': ' '/certificate SHA-256 digest/ && !d {print tolower($2); d=1}')"
[ -n "$GOT_CERT" ] || die "could not read the signing certificate digest"
if [ "$GOT_CERT" != "$EXPECTED_CERT" ]; then
  rm -f "$TMP_SIGNED"
  die "signing cert mismatch.
   got      $GOT_CERT
   expected $EXPECTED_CERT  (the key used for SyncStep 1.7 to 2.5)
The Solana dApp Store only accepts an update signed with the same key as the first release. Use the right keystore."
fi
echo "signing cert matches the 2.5 release key ($GOT_CERT)"

AAPT2="$BT/aapt2"
if [ -x "$AAPT2" ]; then
  BADGING_ALL="$("$AAPT2" dump badging "$TMP_SIGNED" 2>/dev/null)"
  BADGING="$(printf '%s\n' "$BADGING_ALL" | sed -n '1p')"
  echo "$BADGING"
  echo "$BADGING" | grep -q "name='$EXPECTED_PACKAGE'" || die "unexpected package name"
  echo "$BADGING" | grep -q "versionCode='$EXPECTED_VERSION_CODE'" || die "unexpected versionCode (want $EXPECTED_VERSION_CODE; previous release was 18 and it must go up)"
fi
VER="$(echo "${BADGING:-}" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")"
FINAL="$OUT_DIR/syncstep-${VER:-release}.apk"
mv -f "$TMP_SIGNED" "$FINAL"
echo "OK  $FINAL"; shasum -a 256 "$FINAL" 2>/dev/null || sha256sum "$FINAL"

if [ "$DO_SUBMIT" = 1 ]; then
  step "Submitting to the Solana dApp Store"
  : "${DAPP_STORE_API_KEY:?set DAPP_STORE_API_KEY (publish.solanamobile.com > Settings > API keys)}"
  : "${SYNCSTEP_PUBLISHER_KEYPAIR:?set SYNCSTEP_PUBLISHER_KEYPAIR to the publisher wallet keypair file}"
  [ -f "$SYNCSTEP_PUBLISHER_KEYPAIR" ] || die "keypair not found: $SYNCSTEP_PUBLISHER_KEYPAIR"
  npx --yes "@solana-mobile/dapp-store-cli@$CLI_VERSION" --apk-file "$FINAL" --whats-new "$WHATS_NEW" --keypair "$SYNCSTEP_PUBLISHER_KEYPAIR" --verbose
  echo "Submitted. Review takes 3 to 5 business days; status arrives from publishersupport@dappstore.solanamobile.com."
else
  echo; echo "Not submitted. To submit: re-run with --skip-build --submit (needs DAPP_STORE_API_KEY and SYNCSTEP_PUBLISHER_KEYPAIR),"
  echo "or upload $FINAL at publish.solanamobile.com > SyncStep > New Version (notes in RELEASE-NOTES.md)."
fi
