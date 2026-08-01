#!/usr/bin/env bash
# Build the kswg specifications from source and stage the result.
#
#   ./build-specs.sh              build all three from the sibling checkouts
#   ./build-specs.sh keri cesr    build only the named specs
#   ./build-specs.sh --sync       fast-forward each fork from trustoverip first
#
# Why this exists: download-whitepapers.sh fetches docs/index.html, which is a
# *committed* Spec-Up-T render. Upstream only regenerates it when someone runs
# the render, so it lags the spec/ source — the keri render sat ~3 months behind
# its own source. Building locally closes that gap.
#
# The render MUST be produced via collectExternalReferences, not `npm run
# render`. A bare render resolves no external cross-references (115 xrefs drop
# to 7 in the keri spec) and silently emits a smaller, poorer page.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGING_DIR="$SCRIPT_DIR/staging"
BUILT_LIST="$SCRIPT_DIR/locally-built.sha256"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SYNC=false
SPECS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --sync) SYNC=true; shift ;;
    keri|cesr|acdc) SPECS+=("$1"); shift ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ ${#SPECS[@]} -eq 0 ] && SPECS=(keri cesr acdc)

hash_of() { shasum -a 256 "$1" | cut -d' ' -f1; }

BUILT=()
for spec in "${SPECS[@]}"; do
  repo="$REPO_ROOT/kswg-$spec-specification"
  echo "=== kswg-$spec-specification"

  if [ ! -d "$repo" ]; then
    echo "  SKIP: $repo not found (needs the KERI monorepo checkout)"
    continue
  fi

  if ! git -C "$repo" diff --quiet || ! git -C "$repo" diff --cached --quiet; then
    echo "  SKIP: working tree is dirty — commit or stash first"
    continue
  fi

  if $SYNC; then
    echo "  syncing fork from trustoverip..."
    gh repo sync "seriouscoderone/kswg-$spec-specification" \
      --source "trustoverip/kswg-$spec-specification" --branch main >/dev/null 2>&1 \
      || echo "  WARN: gh repo sync failed (diverged fork or no gh auth)"
    git -C "$repo" pull --ff-only >/dev/null 2>&1 \
      || { echo "  SKIP: git pull --ff-only failed"; continue; }
  fi

  echo "  source at $(git -C "$repo" log -1 --format='%h %ad' --date=short)"

  [ -d "$repo/node_modules" ] || (cd "$repo" && npm install --no-audit --no-fund >/dev/null 2>&1)

  # collectExternalReferences resolves xrefs and renders in one pass.
  if ! (cd "$repo" && npm run collectExternalReferences 2>&1 | grep -q 'Successfully wrote'); then
    echo "  FAIL: render did not complete"
    continue
  fi

  src="$repo/docs/index.html"
  xrefs=$(grep -o 'x-ref\|xref' "$src" | wc -l | tr -d ' ')
  if [ "$xrefs" -lt 20 ]; then
    echo "  FAIL: only $xrefs xrefs resolved — external references did not load, refusing to stage"
    git -C "$repo" checkout -- docs/ 2>/dev/null || true
    continue
  fi

  dest="$STAGING_DIR/$spec-specification.html"
  cp "$src" "$dest"
  echo "  staged $(basename "$dest") — $(wc -c < "$dest" | tr -d ' ') bytes, $xrefs xrefs"
  BUILT+=("$(hash_of "$dest")  $spec-specification.html")

  # Leave the spec repo clean; the artefact now lives in staging/.
  git -C "$repo" checkout -- docs/ 2>/dev/null || true
done

if [ ${#BUILT[@]} -eq 0 ]; then
  echo
  echo "Nothing staged."
  exit 1
fi

# Record what was locally built so download-whitepapers.sh will not clobber a
# fresh local render with upstream's older committed one.
{
  echo "# Spec renders built from source by build-specs.sh."
  echo "# download-whitepapers.sh --refresh will not replace a file whose current"
  echo "# hash appears here, because upstream's committed render may be older."
  echo "# Pass --force to override, or delete the relevant line."
  echo
  printf '%s\n' "${BUILT[@]}" | LC_ALL=C sort -k2
} > "$BUILT_LIST"

echo
echo "=== Converting and updating the manifest ==="
"$SCRIPT_DIR/download-whitepapers.sh"
