#!/bin/sh
# P-041 QA: count leaked temp dirs before/after a targeted vitest run; also list dirs newer than a marker.
# usage: sh p041-qa-count.sh <test files...>   (run from packages/crew)
T=$(node -e 'process.stdout.write(require("os").tmpdir())')
count() { ls -d "$T"/crew-tools-* "$T"/hub-* "$T"/crew-later-* "$T"/crew-git-* "$T"/research-* "$T"/wada-* "$T"/side-* "$T"/crew-test-run-* 2>/dev/null | wc -l | tr -d ' '; }
M=$(mktemp "$T/p041-marker.XXXXXX"); sleep 1
B=$(count)
npx vitest run "$@" > "$M.log" 2>&1; RC=$?
tail -6 "$M.log"
A=$(count)
NEW=$(find "$T" -maxdepth 1 -newer "$M" \( -name 'crew-*' -o -name 'hub-*' -o -name 'research-*' -o -name 'wada-*' -o -name 'side-*' \) 2>/dev/null)
rm -f "$M" "$M.log"
echo "vitest exit=$RC before=$B after=$A"
echo "new since marker: ${NEW:-<none>}"
[ "$RC" = 0 ] && [ -z "$NEW" ]
