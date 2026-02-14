#!/usr/bin/env python3
"""Minimize markdown files converted from PDF/HTML sources.

Deterministic cleanup that strips conversion artifacts while preserving
all meaningful content. Designed for pymupdf4llm PDF output and pandoc
HTML-to-markdown output.

Usage:
    python3 minimize-md.py input.md              # prints to stdout
    python3 minimize-md.py input.md output.md    # writes to file
    python3 minimize-md.py --in-place *.md       # overwrites originals
"""
import re
import sys
import pathlib


def minimize(text: str) -> str:
    """Apply all cleanup passes to markdown text."""

    # --- Pandoc HTML artifact removal ---

    # Remove pandoc attribute blocks: {.class-name .another #id role="x"}
    text = re.sub(r'\{[.#][^}]*\}', '', text)

    # Remove pandoc div fences: ::: or :::::::
    text = re.sub(r'^:{3,}.*$', '', text, flags=re.MULTILINE)

    # --- PDF conversion artifact removal ---

    # Remove page number markers: _1/40_ or _23/136_
    text = re.sub(r'^_\d+/\d+_\s*$', '', text, flags=re.MULTILINE)

    # Remove standalone page numbers: just a number on its own line
    text = re.sub(r'^\d{1,4}\s*$', '', text, flags=re.MULTILINE)

    # --- Whitespace normalization ---

    # Collapse runs of 3+ blank lines down to 1 blank line
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove trailing whitespace on each line
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

    # Strip leading/trailing whitespace from the whole document
    text = text.strip() + '\n'

    return text


def main():
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    in_place = '--in-place' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--in-place']

    if in_place:
        for path in args:
            p = pathlib.Path(path)
            original = p.read_text(encoding='utf-8')
            minimized = minimize(original)
            if minimized != original:
                p.write_text(minimized, encoding='utf-8')
                saved = len(original) - len(minimized)
                pct = (saved / len(original)) * 100 if original else 0
                print(f"{p.name}: {len(original):,} -> {len(minimized):,} bytes ({pct:.0f}% smaller)")
            else:
                print(f"{p.name}: no changes")
    elif len(args) == 1:
        text = pathlib.Path(args[0]).read_text(encoding='utf-8')
        sys.stdout.write(minimize(text))
    elif len(args) == 2:
        text = pathlib.Path(args[0]).read_text(encoding='utf-8')
        pathlib.Path(args[1]).write_text(minimize(text), encoding='utf-8')
        print(f"{args[0]} -> {args[1]}")
    else:
        print("Use --in-place for multiple files", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
