#!/usr/bin/env bash
# Download KERI reference papers and convert to markdown
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGING_DIR="$SCRIPT_DIR/staging"
MARKDOWN_DIR="$SCRIPT_DIR/markdown"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
BASE="https://raw.githubusercontent.com/SmithSamuelM/Papers/master"

mkdir -p "$STAGING_DIR" "$MARKDOWN_DIR"

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

# SmithSamuelM/Papers - whitepapers/
download "whitepapers/SPAC_Message.md"
download "whitepapers/IdentifierTheory_web.pdf"

# SmithSamuelM/Papers - presentations/
download "presentations/KERI_PAC_Theorem.pdf"
download "presentations/NonconformistKeynoteWeb20200702.pdf"

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

# signifypy docs (singlehtml from GitHub)
download_url \
  "https://raw.githubusercontent.com/WebOfTrust/signifypy/main/docs/singlehtml/index.html" \
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
