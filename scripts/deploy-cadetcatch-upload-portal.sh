#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${NAMECHEAP_ENV_FILE:-$ROOT_DIR/.env.namecheap.local}"
PORTAL_SOURCE_DIR="${CADETCATCH_PORTAL_SOURCE_DIR:-$ROOT_DIR/deploy/cadetcatch-upload-portal}"
REMOTE_DIR="${CADETCATCH_REMOTE_DIR:-/cadetcatch}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy-cadetcatch-upload-portal.sh [--dry-run] [--env-file PATH] [--remote-dir PATH]

Uploads the CadetCatch PHP upload portal to the existing Namecheap-hosted
CadetCatch photo source folder without deleting existing photos.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --env-file)
      ENV_FILE="$2"
      shift
      ;;
    --remote-dir)
      REMOTE_DIR="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

command -v lftp >/dev/null 2>&1 || {
  echo "lftp is required for Namecheap FTPS deploys." >&2
  exit 1
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${NAMECHEAP_FTP_HOST:?Set NAMECHEAP_FTP_HOST or provide --env-file}"
: "${NAMECHEAP_FTP_PORT:?Set NAMECHEAP_FTP_PORT or provide --env-file}"
: "${NAMECHEAP_FTP_USER:?Set NAMECHEAP_FTP_USER or provide --env-file}"
: "${NAMECHEAP_FTP_PASS:?Set NAMECHEAP_FTP_PASS or provide --env-file}"

if [[ ! -d "$PORTAL_SOURCE_DIR" ]]; then
  echo "Missing portal source directory: $PORTAL_SOURCE_DIR" >&2
  exit 1
fi

echo "Source: $PORTAL_SOURCE_DIR"
echo "Remote: $REMOTE_DIR"

if [[ "$DRY_RUN" == "1" ]]; then
  find "$PORTAL_SOURCE_DIR" -maxdepth 2 -type f | sort
  exit 0
fi

lftp -u "$NAMECHEAP_FTP_USER","$NAMECHEAP_FTP_PASS" \
  -p "$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST" <<LFTP
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate false
set net:max-retries 2
mkdir -p "$REMOTE_DIR"
mirror -R --verbose --only-newer --exclude-glob ".DS_Store" "$PORTAL_SOURCE_DIR" "$REMOTE_DIR"
bye
LFTP
