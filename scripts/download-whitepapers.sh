#!/usr/bin/env bash
# Download KERI reference papers and specs, convert them to markdown, and record
# a sha256 manifest so it is obvious which sources actually changed.
#
#   ./download-whitepapers.sh                       fetch only what is missing
#   ./download-whitepapers.sh --check               report staleness (see note)
#   ./download-whitepapers.sh --check specs         ...for one group (much faster)
#   ./download-whitepapers.sh --refresh             re-fetch specs, papers and docs
#   ./download-whitepapers.sh --refresh specs       re-fetch one group
#   ./download-whitepapers.sh --refresh 'acdc-*'    re-fetch by filename glob
#   ./download-whitepapers.sh --check-upstream      report lag that --check cannot see
#
# Fetching without --refresh is the default because scripts/staging/ is baked
# into the CDK asset bundle at synth time; stable bytes mean stable deploys.
#
# --check note: existing files are left alone, but a source that is MISSING is
# fetched and kept, so there is something to compare against next time — it is
# read-only only for a complete corpus. A bare --check downloads every source
# to a temp file to compare (slow), and skips the images group entirely.
#
# Specs are normally updated by ./build-specs.sh, not --refresh: once rendered
# locally they are listed in locally-built.sha256 and --refresh reports them
# PROTECTED rather than downgrading to upstream's older committed render.
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
  sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'
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
    --check-upstream) MODE="upstream"; shift ;;
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
add_source docs vlei-trainings-llm-context.md \
  "https://raw.githubusercontent.com/GLEIF-IT/vlei-trainings/main/markdown/llm_context.md"
add_source docs signifypy-docs.html \
  "https://raw.githubusercontent.com/seriouscoderone/signifypy/main/docs/singlehtml/index.html"

# --- Upstream provenance: name|kind|repo[|parent] ---
#
# --check only compares our bytes against a URL. It cannot see that the URL
# itself serves stale content, and two layers above it do exactly that:
#
#   spec-render  We fetch docs/index.html, a *committed* Spec-Up-T artifact.
#                Upstream regenerates it by hand, so it lags its own spec/
#                source. Use build-specs.sh to render locally instead.
#   fork         The LLM exports are produced by CI on a fork, because the
#                upstream PRs adding that generation were never merged. A fork
#                behind its parent serves stale content forever, and --check
#                happily calls it "ok".
#
# The branch field matters: it must be the branch the export is actually built
# from, not the fork's default branch. wot-terms-llms-full.txt is published to
# gh-pages by a workflow that lives on add-llm-docs, so checking main would
# report a reassuring "identical" about a branch we never read.
#
# If one of these reports BEHIND, --refresh cannot fix it. Sync the fork, then
# re-run the workflow that regenerates the export:
#   keridoc    .github/workflows/ (llm docs)          — push to main
#   WOT-terms  D-deploy-to-gh-pages.yml on add-llm-docs — gh workflow run (manual only)
#   signifypy  docs.yaml on main                       — push to main
PROVENANCE=(
  "keri-specification.html|spec-render|trustoverip/kswg-keri-specification"
  "cesr-specification.html|spec-render|trustoverip/kswg-cesr-specification"
  "acdc-specification.html|spec-render|trustoverip/kswg-acdc-specification"
  "keridoc-llms-full.txt|fork|seriouscoderone/keridoc|WebOfTrust/keridoc|main"
  "wot-terms-llms-full.txt|fork|seriouscoderone/WOT-terms|WebOfTrust/WOT-terms|add-llm-docs"
  "signifypy-docs.html|fork|seriouscoderone/signifypy|WebOfTrust/signifypy|main"
)

# The authoritative vLEI credential schemas, from upstream — no fork involved.
# These replaced vlei-llm-doc.md, which was fork-generated prose describing the
# schemas without containing any of their structure (zero oneOf/edge/rule
# blocks). vlei-trainings-llm-context.md already covers the narrative more
# thoroughly, so the fork source was duplicated content holding a fork
# dependency open.
VLEI_SCHEMA_BASE="https://raw.githubusercontent.com/WebOfTrust/vLEI/main/schema/acdc"
VLEI_SCHEMAS=(
  qualified-vLEI-issuer-vLEI-credential
  legal-entity-vLEI-credential
  legal-entity-official-organizational-role-vLEI-credential
  legal-entity-engagement-context-role-vLEI-credential
  oor-authorization-vlei-credential
  ecr-authorization-vlei-credential
  verifiable-ixbrl-report-attestation
)
VLEI_SCHEMA_DOC="vlei-credential-schemas.md"

report_upstream_lag() {
  if ! command -v gh &>/dev/null; then
    echo "SKIP: gh not installed — cannot inspect upstream provenance"
    return
  fi
  if ! gh auth status &>/dev/null; then
    echo "SKIP: gh not authenticated (run 'gh auth login')"
    return
  fi

  local lagging=0 rec name kind repo parent

  echo "Rendered specs — is the committed render behind its own spec/ source?"
  for rec in "${PROVENANCE[@]}"; do
    IFS='|' read -r name kind repo parent <<< "$rec"
    [ "$kind" = "spec-render" ] || continue
    local rendered source
    rendered=$(gh api "repos/$repo/commits?path=docs/index.html&per_page=1" \
      --jq '.[0].commit.committer.date' 2>/dev/null | cut -c1-10)
    source=$(gh api "repos/$repo/commits?path=spec&per_page=1" \
      --jq '.[0].commit.committer.date' 2>/dev/null | cut -c1-10)
    # If we already render this one ourselves, upstream's lag does not reach us.
    local staged_hash="" bypassed=false
    if [ -f "$STAGING_DIR/$name" ]; then
      staged_hash="$(hash_of "$STAGING_DIR/$name")"
      is_locally_built "$name" "$staged_hash" && bypassed=true
    fi

    if [ -z "$rendered" ] || [ -z "$source" ]; then
      printf '  %-28s (lookup failed)\n' "$name"
    elif [ "$rendered" \< "$source" ]; then
      if $bypassed; then
        printf '  %-28s bypassed  upstream render %s lags source %s, but we build locally\n' \
          "$name" "$rendered" "$source"
      else
        printf '  %-28s LAGS  render %s < source %s\n' "$name" "$rendered" "$source"
        lagging=$((lagging + 1))
      fi
    else
      printf '  %-28s ok    render %s%s\n' "$name" "$rendered" \
        "$($bypassed && echo ' (built locally)')"
    fi
  done

  echo
  echo "Fork-generated exports — is the fork behind its parent?"
  for rec in "${PROVENANCE[@]}"; do
    IFS='|' read -r name kind repo parent branch <<< "$rec"
    [ "$kind" = "fork" ] || continue
    local owner base cmp status behind
    owner="${repo%%/*}"
    base=$(gh api "repos/$parent" --jq '.default_branch' 2>/dev/null)
    cmp=$(gh api "repos/$parent/compare/$base...$owner:$branch" \
      --jq '"\(.status) \(.behind_by)"' 2>/dev/null)
    if [ -z "$cmp" ]; then
      printf '  %-28s (compare failed: %s@%s)\n' "$name" "$repo" "$branch"
      continue
    fi
    status="${cmp% *}"; behind="${cmp##* }"
    if [ "$behind" -gt 0 ]; then
      printf '  %-28s BEHIND %s commits  [%s @ %s]\n' "$name" "$behind" "$repo" "$branch"
      lagging=$((lagging + 1))
    else
      printf '  %-28s ok    %-9s [%s @ %s]\n' "$name" "$status" "$repo" "$branch"
    fi
  done

  echo
  if [ "$lagging" -eq 0 ]; then
    echo "No upstream lag detected."
  else
    echo "$lagging source(s) lag upstream. --refresh cannot fix these:"
    echo "  rendered specs  -> ./build-specs.sh --sync"
    echo "  forks behind    -> gh repo sync, then re-run the fork's export workflow"
  fi
}

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
    # Say what to do, not just what was refused. "PROTECTED" alone reads as
    # "already current", which would send someone away from build-specs.sh —
    # the only thing that actually updates a locally-rendered spec.
    printf '  PROTECTED  %s — upstream differs but is OLDER; run ./build-specs.sh to update (--force takes upstream anyway)\n' "$name"
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

# Compose the vLEI schemas into one markdown document. They are staged as
# markdown rather than raw .json because staging/ is the Bedrock KB source and
# markdown is a format the KB definitely ingests; .json is not worth guessing
# about, and the BucketDeployment uploads whatever is here with prune: false.
compose_vlei_schemas() {
  local name="$VLEI_SCHEMA_DOC"
  local dest="$STAGING_DIR/$name"
  local existed=false old_hash=""

  if [ -f "$dest" ]; then
    existed=true
    old_hash="$(hash_of "$dest")"
    if ! in_scope docs "$name"; then
      if [ "$MODE" = "check" ]; then
        printf '  skipped    %s (not in target)\n' "$name"
      else
        printf '  cached     %s\n' "$name"
      fi
      CACHED_COUNT=$((CACHED_COUNT + 1))
      return
    fi
  fi

  local work="$STAGING_DIR/.vlei-schemas.$$"
  mkdir -p "$work"
  local s
  for s in "${VLEI_SCHEMAS[@]}"; do
    if ! curl -fsSL --retry 2 -o "$work/$s.json" "$VLEI_SCHEMA_BASE/$s.json"; then
      rm -rf "$work"
      if $existed; then
        printf '  WARN       %s (fetch of %s failed, keeping cached copy)\n' "$name" "$s"
        WARN_COUNT=$((WARN_COUNT + 1))
      else
        printf '  FAIL       %s (fetch of %s failed)\n' "$name" "$s"
        FAIL_COUNT=$((FAIL_COUNT + 1))
      fi
      return
    fi
  done

  local tmp="$dest.compose.$$"
  {
    echo "# vLEI Credential Schemas"
    echo
    echo "The authoritative ACDC JSON Schemas for the vLEI ecosystem, from"
    echo "\`WebOfTrust/vLEI\` \`schema/acdc/\`. Each schema's \`\$id\` is its SAID —"
    echo "the value a credential carries in its \`s\` field to identify its schema."
    echo
    for s in "${VLEI_SCHEMAS[@]}"; do
      python3 - "$work/$s.json" "$s" <<'PY'
import json, sys
path, slug = sys.argv[1], sys.argv[2]
d = json.load(open(path))
print(f"## {d.get('title', slug)}")
print()
print(f"- Schema SAID: `{d.get('$id', 'unknown')}`")
print(f"- Source: `schema/acdc/{slug}.json`")
desc = d.get('description')
if desc:
    print(f"- Description: {desc}")
print()
print("```json")
print(json.dumps(d, indent=2))
print("```")
print()
PY
    done
  } > "$tmp"

  rm -rf "$work"
  local new_hash
  new_hash="$(hash_of "$tmp")"

  if [ "$MODE" = "check" ] && $existed; then
    rm -f "$tmp"
    if [ "$old_hash" != "$new_hash" ]; then
      printf '  STALE      %s\n' "$name"
      STALE_NAMES+=("$name")
      note_stale_group docs
    else
      printf '  ok         %s\n' "$name"
      SAME_COUNT=$((SAME_COUNT + 1))
    fi
    return
  fi

  if $existed && [ "$old_hash" = "$new_hash" ]; then
    rm -f "$tmp"
    printf '  unchanged  %s\n' "$name"
    SAME_COUNT=$((SAME_COUNT + 1))
    return
  fi

  mv "$tmp" "$dest"
  if ! $existed; then
    printf '  NEW        %s (%s schemas)\n' "$name" "${#VLEI_SCHEMAS[@]}"
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

if [ "$MODE" = "upstream" ]; then
  echo "=== Upstream provenance check ==="
  echo
  report_upstream_lag
  exit 0
fi

case "$MODE:$TARGET" in
  check:*)  echo "=== Checking sources against upstream (target: $TARGET) ===" ;;
  fetch:"") echo "=== Fetching missing sources (use --refresh to update existing) ===" ;;
  fetch:*)  echo "=== Fetching sources (refresh target: $TARGET) ===" ;;
esac

for rec in "${SOURCES[@]}"; do
  IFS='|' read -r group name url <<< "$rec"
  process_source "$group" "$name" "$url"
done

compose_vlei_schemas

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
