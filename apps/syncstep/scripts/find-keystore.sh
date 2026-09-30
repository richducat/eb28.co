#!/usr/bin/env bash
# Lists keystore candidates (paths only, never contents) so the right one can be tried with release.sh.
find "$HOME" -maxdepth 7 \( -name '*.keystore' -o -name '*.jks' -o -name 'keystore.properties' \) \
  -not -path '*/node_modules/*' -not -path '*/Library/Caches/*' -not -path '*/.Trash/*' 2>/dev/null
