#!/usr/bin/env bash
# Download KERI reference papers and convert to markdown
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGING_DIR="$SCRIPT_DIR/staging"
MARKDOWN_DIR="$SCRIPT_DIR/markdown"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
BASE="https://raw.githubusercontent.com/SmithSamuelM/Papers/master"

IMAGES_DIR="$STAGING_DIR/images"
mkdir -p "$STAGING_DIR" "$MARKDOWN_DIR" "$IMAGES_DIR"

# --- Download phase ---

download() {
  local path="$1"
  local name="$(basename "$path")"
  if [ -f "$STAGING_DIR/$name" ]; then
    echo "Already exists: $name"
  else
    echo "Downloading $name..."
    curl -fSL -o "$STAGING_DIR/$name" "$BASE/$path"
  fi
}

download_url() {
  local url="$1"
  local name="$2"
  if [ -f "$STAGING_DIR/$name" ]; then
    echo "Already exists: $name"
  else
    echo "Downloading $name..."
    curl -fSL -o "$STAGING_DIR/$name" "$url"
  fi
}

download_image() {
  local path="$1"
  local name="$(basename "$path")"
  if [ -f "$IMAGES_DIR/$name" ]; then
    echo "Already exists: $name"
  else
    echo "Downloading image $name..."
    curl -fSL -o "$IMAGES_DIR/$name" "$BASE/$path"
  fi
}

download_image_dir() {
  local dir="$1"
  echo "Listing images in $dir..."
  local files
  files=$(gh api "repos/SmithSamuelM/Papers/contents/$dir" --jq '.[].path') || {
    echo "SKIP $dir: gh api failed (not authenticated or rate limited)"
    return
  }
  for path in $files; do
    download_image "$path"
  done
}

# SmithSamuelM/Papers - whitepapers/
download "whitepapers/SPAC_Message.md"
download "whitepapers/IdentifierTheory_web.pdf"
download "whitepapers/KERI_WP_2.x.web.pdf"
download "whitepapers/Identity-System-Essentials.pdf"
download "whitepapers/KERIArchGroupIssuance.md"

# SmithSamuelM/Papers - presentations/
download "presentations/KERI_PAC_Theorem.pdf"
download "presentations/NonconformistKeynoteWeb20200702.pdf"
download "presentations/KERI2_Overview.web.pdf"
download "presentations/KERI_Overview.web.pdf"
download "presentations/DuplicityGame_IIW_2020_A.pdf"
download "presentations/KERIVerifiableTrustBases.web.pdf"
download "presentations/KERI_AlphaOmega.20250903.pdf"
download "presentations/KERI_Appraisal.pdf"
download "presentations/KERI_Details_IIW_2019_B.pdf"
download "presentations/KERI_DuplicityDICE2024.pdf"
download "presentations/KERI_RootOfTrust_IIW_2019_B.pdf"
download "presentations/KERI_SecurityDeepDive.web.pdf"
download "presentations/KERI_Security_DICE2024.pdf"
download "presentations/KERI_for_Muggles.pdf"
download "presentations/MetaPlatforms_IIW_20190430_5A.pdf"
download "presentations/MetaPlatformBYUCIOLecture20190305.pdf"
download "presentations/ReputationAlgorithms.pdf"
download "presentations/ReputationDisintermediation_IIW_20180405.pdf"
download "presentations/ReputationIIW2017.pdf"
download "presentations/ReputationTwoSidedNetworks_20180208.pdf"
download "presentations/SevenPrivacies.web.pdf"
download "presentations/ZeroTrustRaet.pdf"

# Trust over IP specifications (Spec-Up-T single-page HTML)
download_url \
  "https://raw.githubusercontent.com/trustoverip/kswg-keri-specification/main/docs/index.html" \
  "keri-specification.html"
download_url \
  "https://raw.githubusercontent.com/trustoverip/kswg-cesr-specification/main/docs/index.html" \
  "cesr-specification.html"
download_url \
  "https://raw.githubusercontent.com/trustoverip/kswg-acdc-specification/main/docs/index.html" \
  "acdc-specification.html"

# IETF drafts
download_url \
  "https://www.ietf.org/archive/id/draft-ssmith-keri-00.txt" \
  "draft-ssmith-keri-00.txt"

# keridoc LLM docs
download_url \
  "https://raw.githubusercontent.com/seriouscoderone/keridoc/refs/heads/main/llm-docs/llms-full.txt" \
  "keridoc-llms-full.txt"

# WOT-terms glossary/education (Docusaurus site LLM export)
download_url \
  "https://seriouscoderone.github.io/WOT-terms/llms-full.txt" \
  "wot-terms-llms-full.txt"

# vLEI ecosystem docs
download_url \
  "https://raw.githubusercontent.com/seriouscoderone/vLEI/feat/llm-doc-generation/docs/llm-doc.md" \
  "vlei-llm-doc.md"
download_url \
  "https://raw.githubusercontent.com/GLEIF-IT/vlei-trainings/main/markdown/llm_context.md" \
  "vlei-trainings-llm-context.md"

# SmithSamuelM/Papers - images (dynamically listed via GitHub API)
download_image_dir "whitepapers/assets"
download_image_dir "whitepapers/graphics"

# signifypy docs (singlehtml from GitHub)
download_url \
  "https://raw.githubusercontent.com/seriouscoderone/signifypy/main/docs/singlehtml/index.html" \
  "signifypy-docs.html"

echo ""
echo "=== Staging complete ==="
ls -lh "$STAGING_DIR"

# --- Convert phase ---

echo ""
echo "=== Converting to markdown ==="

# MD files: just copy
for f in "$STAGING_DIR"/*.md; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"
  echo "Moving $name"
  cp "$f" "$MARKDOWN_DIR/$name"
done

# TXT files: copy as markdown
for f in "$STAGING_DIR"/*.txt; do
  [ -f "$f" ] || continue
  name="$(basename "${f%.txt}.md")"
  echo "Copying $(basename "$f") -> $name"
  cp "$f" "$MARKDOWN_DIR/$name"
done

# HTML files: convert with pandoc
if command -v pandoc &>/dev/null; then
  for f in "$STAGING_DIR"/*.html; do
    [ -f "$f" ] || continue
    name="$(basename "${f%.html}.md")"
    echo "Converting $(basename "$f") -> $name"
    pandoc -f html -t markdown -o "$MARKDOWN_DIR/$name" "$f"
  done
else
  echo "SKIP HTML conversion: pandoc not installed (brew install pandoc)"
fi

# PDF files: convert with pymupdf4llm
if [ -x "$VENV_PYTHON" ]; then
  for f in "$STAGING_DIR"/*.pdf; do
    [ -f "$f" ] || continue
    name="$(basename "${f%.pdf}.md")"
    echo "Converting $(basename "$f") -> $name"
    "$VENV_PYTHON" "$SCRIPT_DIR/pdf2md.py" "$f" "$MARKDOWN_DIR/$name"
  done
else
  echo "SKIP PDF conversion: venv not found. Set up with:"
  echo "  python3 -m venv $SCRIPT_DIR/.venv"
  echo "  $SCRIPT_DIR/.venv/bin/pip install pymupdf4llm"
fi

# --- Minimize phase ---

echo ""
echo "=== Minimizing markdown ==="
python3 "$SCRIPT_DIR/minimize-md.py" --in-place "$MARKDOWN_DIR"/*.md

echo ""
echo "=== Done ==="
ls -lh "$MARKDOWN_DIR"
