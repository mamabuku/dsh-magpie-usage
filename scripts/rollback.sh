#!/usr/bin/env bash
# Remove dsh-magpie-usage from a DSH profile.
# Idempotent: every step tolerates an already-removed item.
#
#   ./scripts/rollback.sh [profile-dir]
#
# It touches, in order: cordis.patch.yml (the insert block), package.json (the
# link dependency), the pnpm-lock importer entry, and node_modules/<name>.
# It never deletes the source tree and never removes ~/.dsh/magpie-usage.json.
set -euo pipefail

NAME="dsh-magpie-usage"
PROFILE="${1:-${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}}"
WS="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "→ profile: $PROFILE"
[ -d "$PROFILE" ] || { echo "profile not found: $PROFILE" >&2; exit 1; }

for f in package.json cordis.patch.yml pnpm-lock.yaml; do
  [ -f "$PROFILE/$f" ] && cp "$PROFILE/$f" "$PROFILE/$f.bak-rollback-$STAMP"
done
echo "→ backups written with suffix .bak-rollback-$STAMP"

python3 - "$PROFILE" "$NAME" <<'PY'
import json, os, re, sys

profile, name = sys.argv[1], sys.argv[2]

patch = os.path.join(profile, 'cordis.patch.yml')
if os.path.exists(patch):
    text = open(patch, encoding='utf-8').read()
    stripped = re.sub(
        r"\n?#[^\n]*" + re.escape(name) + r"[^\n]*\n(?:#[^\n]*\n)*?- insert:\n    - id: "
        + re.escape(name) + r"\n      name: '" + re.escape(name) + r"'\n",
        "\n", text)
    if stripped == text:
        stripped = re.sub(
            r"\n?- insert:\n    - id: " + re.escape(name) + r"\n      name: '"
            + re.escape(name) + r"'\n", "\n", text)
    if stripped != text:
        open(patch, 'w', encoding='utf-8').write(stripped)
        print('patch: insert block removed')
    else:
        print('patch: nothing to remove')

pkg = os.path.join(profile, 'package.json')
if os.path.exists(pkg):
    data = json.load(open(pkg, encoding='utf-8'))
    deps = data.get('dependencies') or {}
    if deps.pop(name, None) is not None:
        data['dependencies'] = deps
        json.dump(data, open(pkg, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(pkg, 'a').write('\n')
        print('package.json: dependency removed')
    else:
        print('package.json: nothing to remove')

lock = os.path.join(profile, 'pnpm-lock.yaml')
if os.path.exists(lock):
    text = open(lock, encoding='utf-8').read()
    stripped = re.sub(
        r"\n      '?" + re.escape(name) + r"'?:\n        specifier: [^\n]*\n        version: [^\n]*\n",
        "\n", text)
    if stripped != text:
        open(lock, 'w', encoding='utf-8').write(stripped)
        print('pnpm-lock: importer entry removed')
    else:
        print('pnpm-lock: nothing to remove')
PY

LINK="$PROFILE/node_modules/$NAME"
if [ -L "$LINK" ]; then
  rm -f "$LINK"
  echo "→ symlink removed: $LINK"
else
  echo "→ symlink: not present"
fi

echo
echo "Done. Restart DeepSeek Harness to unmount the plugin."
echo "Preferences kept at ~/.dsh/magpie-usage.json; source tree untouched at $WS."
