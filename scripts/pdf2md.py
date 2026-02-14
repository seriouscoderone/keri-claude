#!/usr/bin/env python3
"""Convert a PDF file to Markdown using pymupdf4llm."""
import sys
import pathlib
import pymupdf4llm

if len(sys.argv) != 3:
    print(f"Usage: {sys.argv[0]} input.pdf output.md", file=sys.stderr)
    sys.exit(1)

md_text = pymupdf4llm.to_markdown(sys.argv[1])
pathlib.Path(sys.argv[2]).write_bytes(md_text.encode())
print(f"Converted {sys.argv[1]} -> {sys.argv[2]}")
