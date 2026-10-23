#!/usr/bin/env bash
# Rebuild the bundles and re-export the sample project's view to preview/habitly.html (served by .claude/launch.json).
set -e
cd "$(dirname "$0")/.."
npm run -s build
[ -d .sample/habitly ] || node scripts/sample-project.mjs .sample/habitly >/dev/null
cp ../../plugins/crew/skills/hub/dist/{crew.mjs,ui.html} .sample/habitly/.crew/bin/
(cd .sample/habitly && node .crew/bin/crew.mjs export --out ../../preview/habitly.html >/dev/null)
echo "preview/habitly.html updated"
