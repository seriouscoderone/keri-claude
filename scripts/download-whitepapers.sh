#!/usr/bin/env bash
# Download KERI reference papers and specs, convert them to markdown, and record
# a sha256 manifest so it is obvious which sources actually changed.
#
#   ./download-whitepapers.sh                       fetch only what is missing
#   ./download-whitepapers.sh --check               report staleness, change nothing
#   ./download-whitepapers.sh --check specs         ...for one group (much faster)
#   ./download-whitepapers.sh --refresh             re-fetch specs, papers and docs
#   ./download-whitepapers.sh --refresh specs       re-fetch one group
#   ./download-whitepapers.sh --refresh 'acdc-*'    re-fetch by filename glob
#
# Fetching without --refresh is the default because scripts/staging/ is baked
# into the CDK asset bundle at synth time; stable bytes mean stable deploys.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGING_DIR="$SCRIPT_DIR/staging"
MARKDOWN_DIR="$SCRIPT_DIR/markdown"
MANIFEST="$SCRIPT_DIR/manifest.sha256"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
PAPERS_BASE="https://raw.githubusercontent.com/SmithSamuelM/Papers/master"

IMAGES_DIR="$STAGING_DIR/images"
mkdir -p "$STAGING_DIR" "$MARKDOWN_DIR" "$IMAGES_DIR"

# --- Arguments ---

MODE="fetch"      # fetch | check
TARGET=""         # "" = nothing in scope beyond missing files
FORCE=false       # override the locally-built guard

usage() {
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
  echo
  echo "Targets: all (default), specs, papers, docs, images, or a filename glob."
  echo "  --force   replace files built by build-specs.sh (see locally-built.sha256)"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --check|--refresh)
      [ "$1" = "--check" ] && MODE="check" || MODE="fetch"
      TARGET="all"
      # An optional target may follow, unless it is another flag.
      if [ $# -ge 2 ] && [ -n "$2" ] && [ "${2#--}" = "$2" ]; then
        TARGET="$2"
        shift
      fi
      shift
      ;;
    --force) FORCE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; echo >&2; usage >&2; exit 2 ;;
  esac
done

BUILT_LIST="$SCRIPT_DIR/locally-built.sha256"

# A spec render built by build-specs.sh is newer than upstream's committed
# docs/index.html, so refreshing from upstream would silently regress it.
is_locally_built() {
  local name="$1" hash="$2"
  [ -f "$BUILT_LIST" ] || return 1
  grep -q "^$hash  $name\$" "$BUILT_LIST"
}

# --- Source registry: group|name|url ---

SOURCES=()
add_source() { SOURCES+=("$1|$2|$3"); }

for path in \
  whitepapers/SPAC_Message.md \
  whitepapers/IdentifierTheory_web.pdf \
  whitepapers/KERI_WP_2.x.web.pdf \
  whitepapers/Identity-System-Essentials.pdf \
  whitepapers/KERIArchGroupIssuance.md \
  presentations/KERI_PAC_Theorem.pdf \
  presentations/NonconformistKeynoteWeb20200702.pdf \
  presentations/KERI2_Overview.web.pdf \
  presentations/KERI_Overview.web.pdf \
  presentations/DuplicityGame_IIW_2020_A.pdf \
  presentations/KERIVerifiableTrustBases.web.pdf \
  presentations/KERI_AlphaOmega.20250903.pdf \
  presentations/KERI_Appraisal.pdf \
  presentations/KERI_Details_IIW_2019_B.pdf \
  presentations/KERI_DuplicityDICE2024.pdf \
  presentations/KERI_RootOfTrust_IIW_2019_B.pdf \
  presentations/KERI_SecurityDeepDive.web.pdf \
  presentations/KERI_Security_DICE2024.pdf \
  presentations/KERI_for_Muggles.pdf \
  presentations/MetaPlatforms_IIW_20190430_5A.pdf \
  presentations/MetaPlatformBYUCIOLecture20190305.pdf \
  presentations/ReputationAlgorithms.pdf \
  presentations/ReputationDisintermediation_IIW_20180405.pdf \
  presentations/ReputationIIW2017.pdf \
  presentations/ReputationTwoSidedNetworks_20180208.pdf \
  presentations/SevenPrivacies.web.pdf \
  presentations/ZeroTrustRaet.pdf
do
  add_source papers "$(basename "$path")" "$PAPERS_BASE/$path"
done

# Trust over IP specifications (Spec-Up-T single-page HTML renders)
add_source specs keri-specification.html \
  "https://raw.githubusercontent.com/trustoverip/kswg-keri-specification/main/docs/index.html"
add_source specs cesr-specification.html \
  "https://raw.githubusercontent.com/trustoverip/kswg-cesr-specification/main/docs/index.html"
add_source specs acdc-specification.html \
  "https://raw.githubusercontent.com/trustoverip/kswg-acdc-specification/main/docs/index.html"
add_source specs draft-ssmith-keri-00.txt \
  "https://www.ietf.org/archive/id/draft-ssmith-keri-00.txt"

# LLM-oriented documentation exports
add_source docs keridoc-llms-full.txt \
  "https://raw.githubusercontent.com/seriouscoderone/keridoc/refs/heads/main/llm-docs/llms-full.txt"
add_source docs wot-terms-llms-full.txt \
  "https://seriouscoderone.github.io/WOT-terms/llms-full.txt"
add_source docs vlei-llm-doc.md \
  "https://raw.githubusercontent.com/seriouscoderone/vLEI/feat/llm-doc-generation/docs/llm-doc.md"
add_source docs vlei-trainings-llm-context.md \
  "https://raw.githubusercontent.com/GLEIF-IT/vlei-trainings/main/markdown/llm_context.md"
add_source docs signifypy-docs.html \
  "https://raw.githubusercontent.com/seriouscoderone/signifypy/main/docs/singlehtml/index.html"

# --- Helpers ---

hash_of() { shasum -a 256 "$1" | cut -d' ' -f1; }

# Is this source in the user's refresh/check scope?
in_scope() {
  local group="$1" name="$2"
  case "$TARGET" in
    "")                       return 1 ;;
    all)                      [ "$group" != "images" ] ;;
    specs|papers|docs|images) [ "$group" = "$TARGET" ] ;;
    *)                        [[ "$name" == $TARGET ]] ;;
  esac
}

NEW_COUNT=0; CHANGED_COUNT=0; SAME_COUNT=0; CACHED_COUNT=0; FAIL_COUNT=0; WARN_COUNT=0; PROTECTED_COUNT=0
CHANGED_NAMES=(); STALE_NAMES=(); STALE_GROUPS=""

note_stale_group() {
  case " $STALE_GROUPS " in
    *" $1 "*) ;;
    *) STALE_GROUPS="${STALE_GROUPS:+$STALE_GROUPS }$1" ;;
  esac
}

# Fetch one source. Downloads to a temp file and only replaces the target on
# success, so a failed refresh leaves the previous good copy intact.
process_source() {
  local group="$1" name="$2" url="$3"
  local dest="$STAGING_DIR/$name"
  local existed=false old_hash=""

  if [ -f "$dest" ]; then
    existed=true
    old_hash="$(hash_of "$dest")"
    if ! in_scope "$group" "$name"; then
      # "cached" means present and left alone; in check mode it was not compared
      # against upstream at all, so say so rather than implying it is current.
      if [ "$MODE" = "check" ]; then
        printf '  skipped    %s (not in target)\n' "$name"
      else
        printf '  cached     %s\n' "$name"
      fi
      CACHED_COUNT=$((CACHED_COUNT + 1))
      return
    fi
  fi

  local tmp="$dest.download.$$"
  if ! curl -fsSL --retry 2 -o "$tmp" "$url"; then
    rm -f "$tmp"
    if $existed; then
      printf '  WARN       %s (fetch failed, keeping cached copy)\n' "$name"
      WARN_COUNT=$((WARN_COUNT + 1))
    else
      printf '  FAIL       %s (fetch failed, no cached copy)\n' "$name"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    return
  fi

  local new_hash
  new_hash="$(hash_of "$tmp")"

  # Check mode never mutates staging, but a missing file is still downloaded so
  # that a later real run has something to compare against.
  if [ "$MODE" = "check" ] && $existed; then
    rm -f "$tmp"
    if [ "$old_hash" != "$new_hash" ]; then
      printf '  STALE      %s\n' "$name"
      STALE_NAMES+=("$name")
      note_stale_group "$group"
    else
      printf '  ok         %s\n' "$name"
      SAME_COUNT=$((SAME_COUNT + 1))
    fi
    return
  fi

  # Never trade a locally-built render for upstream's older committed one.
  if $existed && ! $FORCE && [ "$old_hash" != "$new_hash" ] \
     && is_locally_built "$name" "$old_hash"; then
    rm -f "$tmp"
    printf '  PROTECTED  %s (built from source; --force to take upstream)\n' "$name"
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
    return
  fi

  # A byte-identical refresh must not touch the file. Replacing it would bump
  # mtime, which makes the convert phase redo pandoc/pdf work for no reason.
  if $existed && [ "$old_hash" = "$new_hash" ]; then
    rm -f "$tmp"
    printf '  unchanged  %s\n' "$name"
    SAME_COUNT=$((SAME_COUNT + 1))
    return
  fi

  mv "$tmp" "$dest"
  if ! $existed; then
    printf '  NEW        %s\n' "$name"
    NEW_COUNT=$((NEW_COUNT + 1))
  else
    printf '  CHANGED    %s\n' "$name"
    CHANGED_COUNT=$((CHANGED_COUNT + 1))
    CHANGED_NAMES+=("$name")
  fi
}

# Images are listed dynamically and overwritten in place; they are static assets
# so they are excluded from a bare --refresh.
process_image_dir() {
  local dir="$1"
  local want_refresh=false
  in_scope images "$dir" && want_refresh=true

  # Nothing to do if every listed image would be skipped anyway.
  local files
  if ! files=$(gh api "repos/SmithSamuelM/Papers/contents/$dir" --jq '.[].path' 2>/dev/null); then
    echo "  SKIP       $dir (gh api failed: not authenticated or rate limited)"
    return
  fi

  local path name dest
  for path in $files; do
    name="$(basename "$path")"
    dest="$IMAGES_DIR/$name"
    if [ -f "$dest" ] && ! $want_refresh; then
      continue
    fi
    if [ "$MODE" = "check" ] && [ -f "$dest" ]; then
      continue
    fi
    local tmp="$dest.download.$$"
    if curl -fsSL --retry 2 -o "$tmp" "$PAPERS_BASE/$path"; then
      mv "$tmp" "$dest"
      echo "  image      $name"
    else
      rm -f "$tmp"
      echo "  WARN       $name (image fetch failed)"
    fi
  done
}

# --- Fetch phase ---

case "$MODE:$TARGET" in
  check:*)  echo "=== Checking sources against upstream (target: $TARGET) ===" ;;
  fetch:"") echo "=== Fetching missing sources (use --refresh to update existing) ===" ;;
  fetch:*)  echo "=== Fetching sources (refresh target: $TARGET) ===" ;;
esac

for rec in "${SOURCES[@]}"; do
  IFS='|' read -r group name url <<< "$rec"
  process_source "$group" "$name" "$url"
done

process_image_dir "whitepapers/assets"
process_image_dir "whitepapers/graphics"

# --- Check mode stops here ---

if [ "$MODE" = "check" ]; then
  echo
  if [ ${#STALE_NAMES[@]} -eq 0 ]; then
    echo "=== All checked sources match upstream ==="
    exit 0
  fi
  echo "=== ${#STALE_NAMES[@]} source(s) differ from upstream ==="
  for name in "${STALE_NAMES[@]}"; do
    echo "  $name"
  done
  echo
  echo "Refresh with:"
  for group in $STALE_GROUPS; do
    echo "  $0 --refresh $group"
  done
  exit 0
fi

echo
echo "Fetch summary: $NEW_COUNT new, $CHANGED_COUNT changed, $SAME_COUNT unchanged, $CACHED_COUNT cached, $WARN_COUNT kept-after-failure, $PROTECTED_COUNT protected, $FAIL_COUNT failed"

# --- Convert phase ---
#
# Only convert when the source is newer than its output. Refresh advances mtime
# only when content actually changed, and the in-place minimize pass leaves the
# output newer than its source, so unchanged sources stay skipped.

echo
echo "=== Converting to markdown ==="

needs_convert() {
  local src="$1" out="$2"
  [ ! -f "$out" ] || [ "$src" -nt "$out" ]
}

convert_count=0
CONVERTED=()

for f in "$STAGING_DIR"/*.md; do
  [ -f "$f" ] || continue
  out="$MARKDOWN_DIR/$(basename "$f")"
  needs_convert "$f" "$out" || continue
  echo "  copy    $(basename "$f")"
  cp "$f" "$out"
  CONVERTED+=("$out"); convert_count=$((convert_count + 1))
done

for f in "$STAGING_DIR"/*.txt; do
  [ -f "$f" ] || continue
  out="$MARKDOWN_DIR/$(basename "${f%.txt}.md")"
  needs_convert "$f" "$out" || continue
  echo "  copy    $(basename "$f") -> $(basename "$out")"
  cp "$f" "$out"
  CONVERTED+=("$out"); convert_count=$((convert_count + 1))
done

if command -v pandoc &>/dev/null; then
  for f in "$STAGING_DIR"/*.html; do
    [ -f "$f" ] || continue
    out="$MARKDOWN_DIR/$(basename "${f%.html}.md")"
    needs_convert "$f" "$out" || continue
    echo "  pandoc  $(basename "$f") -> $(basename "$out")"
    pandoc -f html -t markdown -o "$out" "$f"
    CONVERTED+=("$out"); convert_count=$((convert_count + 1))
  done
else
  echo "  SKIP HTML conversion: pandoc not installed (brew install pandoc)"
fi

if [ -x "$VENV_PYTHON" ]; then
  for f in "$STAGING_DIR"/*.pdf; do
    [ -f "$f" ] || continue
    out="$MARKDOWN_DIR/$(basename "${f%.pdf}.md")"
    needs_convert "$f" "$out" || continue
    echo "  pdf2md  $(basename "$f") -> $(basename "$out")"
    "$VENV_PYTHON" "$SCRIPT_DIR/pdf2md.py" "$f" "$out"
    CONVERTED+=("$out"); convert_count=$((convert_count + 1))
  done
else
  echo "  SKIP PDF conversion: venv not found. Set up with:"
  echo "    python3 -m venv $SCRIPT_DIR/.venv"
  echo "    $SCRIPT_DIR/.venv/bin/pip install pymupdf4llm"
fi

[ "$convert_count" -eq 0 ] && echo "  nothing to convert (all outputs current)"

# --- Minimize phase ---

if [ "$convert_count" -gt 0 ]; then
  echo
  echo "=== Minimizing markdown ==="
  python3 "$SCRIPT_DIR/minimize-md.py" --in-place "${CONVERTED[@]}"
fi

# --- Manifest phase ---

echo
echo "=== Writing $(basename "$MANIFEST") ==="

{
  echo "# sha256 manifest of the KERI doc corpus."
  echo "# Generated by download-whitepapers.sh — do not edit by hand."
  echo "# staging/ and markdown/ are gitignored; this file is tracked so that"
  echo "# 'git diff' after a --refresh shows exactly which sources changed."
  echo
  echo "## staging/"
  (cd "$STAGING_DIR" && find . -maxdepth 1 -type f ! -name '.*' -exec shasum -a 256 {} + \
    | sed 's|\./||' | LC_ALL=C sort -k2)
  echo
  echo "## staging/images/ (rolled up — static assets, one line to keep diffs readable)"
  image_count=$(find "$IMAGES_DIR" -type f ! -name '.*' | wc -l | tr -d ' ')
  image_hash=$( (cd "$IMAGES_DIR" && find . -type f ! -name '.*' -exec shasum -a 256 {} + \
    | sed 's|\./||' | LC_ALL=C sort -k2 | shasum -a 256 | cut -d' ' -f1) )
  echo "$image_hash  images/ ($image_count files)"
  echo
  echo "## markdown/"
  (cd "$MARKDOWN_DIR" && find . -maxdepth 1 -type f ! -name '.*' -exec shasum -a 256 {} + \
    | sed 's|\./||' | LC_ALL=C sort -k2)
} > "$MANIFEST"

echo "  $(grep -c '^[0-9a-f]' "$MANIFEST") entries"

if [ ${#CHANGED_NAMES[@]} -gt 0 ]; then
  echo
  echo "Changed this run:"
  for name in "${CHANGED_NAMES[@]}"; do
    echo "  $name"
  done
  echo
  echo "Review the downstream effect with:"
  echo "  git diff --stat $(basename "$MANIFEST")"
fi

echo
echo "=== Done ==="
