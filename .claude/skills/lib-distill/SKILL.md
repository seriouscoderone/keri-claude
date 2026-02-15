---
name: lib-distill
description: >
  Distill a source code library into a compact Claude Code skill.
  Invoke with `/lib-distill <path-to-library>` to analyze a codebase and
  produce a skill package that teaches Claude the library's API, types,
  patterns, and conventions. Designed for KERI ecosystem libraries
  (keripy, signify-ts, cesride, polaris-web, etc.) but works on any
  well-structured library. Produces 25-40KB skill packages through a
  5-phase pipeline with interactive checkpoints.
command: /lib-distill
user_invocable: true
---

# lib-distill — Source Code Library to Claude Code Skill

Transform a source code library into a compact, actionable Claude Code skill.

## Invocation

```
/lib-distill <path-to-library>
```

The `<path-to-library>` must be a directory containing source code with a recognizable manifest (`package.json`, `Cargo.toml`, `setup.py`, `pyproject.toml`, or `go.mod`).

## Pipeline Overview

| Phase | Name | Output | Checkpoint? |
|-------|------|--------|-------------|
| 1 | Survey | `survey.md` — file inventory, size tier, chunk plan | Yes |
| 2 | Extraction | `extractions/<NN>-<slug>.md` — structured data per chunk | No |
| 3 | Synthesis | `synthesis/<concern>.md` — merged by implementation concern | Yes |
| 4 | Compression | `references/<concern>.md` — compact skill reference files | No |
| 5 | Package | `SKILL.md` + validation | Yes |

---

## Phase 1 — Survey

### 1.1 Parse Input

- Resolve `<path-to-library>` to absolute path; abort if not a directory.
- Derive `lib-name` from the directory basename (e.g., `/path/to/signify-ts` → `signify-ts`).
- Create staging directory: `scripts/staging/distill-<lib-name>/` with subdirs `extractions/` and `synthesis/`.

### 1.2 Detect Language

Probe for manifest files in priority order:

| Manifest | Language | Source glob |
|----------|----------|-------------|
| `Cargo.toml` | Rust | `**/*.rs` |
| `package.json` | TypeScript/JavaScript | `**/*.ts`, `**/*.js` (exclude `.d.ts`) |
| `setup.py` or `pyproject.toml` | Python | `**/*.py` |
| `go.mod` | Go | `**/*.go` |

If multiple manifests exist, ask the user which language to target.

### 1.3 Inventory Source Files

- Glob all source files matching the language.
- **Exclude** patterns: `test*`, `*_test.*`, `*spec*`, `__pycache__`, `node_modules`, `target/`, `dist/`, `build/`, `vendor/`, `generated/`, `*.min.*`, migration files.
- Record each file: relative path, line count.
- Sort by line count descending.

### 1.4 Classify Size Tier

| Tier | Total Lines | Chunking Strategy | Reference Files |
|------|-------------|-------------------|-----------------|
| Small | <2,000 | Single pass (1-2 chunks) | 2-3 |
| Medium | 2,000-10,000 | Per-module chunks | 3-4 |
| Large | >10,000 | Per-file for large files, grouped for small | 4-6 |

### 1.5 Identify Public API Surface

Language-specific grep for exports:

| Language | Export markers |
|----------|--------------|
| Python | `__all__`, classes/functions without `_` prefix at module level |
| Rust | `pub fn`, `pub struct`, `pub enum`, `pub trait`, `pub type`, `pub mod` |
| TypeScript | `export`, `export default`, `export type`, `export interface` |
| Go | Capitalized names at package level |

Record each public API item: name, kind (class/function/type/const), source file, line number.

### 1.6 Classify Files by Content Type

Assign each source file one primary category:

| Category | Heuristic |
|----------|-----------|
| `api-surface` | High density of exports, public classes/functions |
| `data-models` | Structs, interfaces, type definitions, enums, codex tables |
| `patterns` | Multi-step workflows, builder patterns, orchestration |
| `error-handling` | Error types, exception classes, result types |
| `configuration` | Config structs, defaults, env vars, constants |
| `skip` | Internal utilities, generated code, trivial glue |

### 1.7 Group into Chunks

- Target chunk size: 500-1500 lines (wider than spec-distill because code is more structured).
- Align chunks to module/file boundaries — never split a file across chunks.
- Each chunk gets: an ID (`01`, `02`, ...), a slug (module or concern name), file list, total lines, primary content type.

### 1.8 Propose Reference File Groupings

Based on size tier, propose which extraction categories map to which output reference files:

- **Small:** `api.md`, `patterns.md` (maybe `types.md`)
- **Medium:** `api.md`, `types.md`, `patterns.md`, `errors.md`
- **Large:** `api.md`, `types.md`, `patterns.md`, `errors.md`, `config.md`, possibly split `api.md` by module

### 1.9 Write Survey & Checkpoint

Write `scripts/staging/distill-<lib-name>/survey.md` containing:
- Library name, language, path, total files, total lines, size tier
- File inventory table (path, lines, content type)
- Public API summary (count by kind)
- Chunk plan table (ID, slug, files, lines, content type)
- Proposed reference file groupings

**INTERACTIVE CHECKPOINT:**
```
Phase 1 complete. Survey written to scripts/staging/distill-<lib-name>/survey.md

Summary:
- Library: <lib-name> (<language>)
- Size: <total-lines> lines across <file-count> files → <tier> tier
- Chunks: <chunk-count> chunks planned
- Reference files: <proposed list>

Review the survey and let me know:
1. Approve and continue to extraction
2. Adjust chunk groupings or file classifications
3. Exclude specific files or directories
```

---

## Phase 2 — Extraction

### 2.1 Launch Parallel Extraction

For each chunk, launch a Task agent (batch 4-6 at a time) with:

**Agent prompt:**
```
You are extracting structured data from source code for a library distillation.

Library: <lib-name> (<language>)
Chunk: <chunk-id> — <slug>
Content type: <primary-category>
Files: <file-list>

Read each file listed. Extract into the 6 categories defined in the extraction template.
Write output to: scripts/staging/distill-<lib-name>/extractions/<chunk-id>-<slug>.md

Use the extraction template at:
.claude/skills/lib-distill/references/extraction-template.md
```

Each agent reads its assigned files and writes structured extraction using the template.

### 2.2 Verify Outputs

After all agents complete:
- Check that every expected `extractions/<chunk-id>-<slug>.md` exists.
- Verify each file is non-empty and has at least 2 of the 6 category headers.
- Re-run any failed chunks (max 1 retry per chunk).

No interactive checkpoint — proceed directly to Phase 3.

---

## Phase 3 — Synthesis

### 3.1 Merge Extractions

Read all extraction files. Merge content by implementation concern:

| Concern | Fed by categories |
|---------|-------------------|
| API Reference | Class & Type Signatures, Exports & Constants |
| Data Models | Class & Type Signatures (struct/enum focus) |
| Usage Patterns | Usage Patterns, Initialization & Lifecycle |
| Error Handling | Error Handling |
| Configuration | Configuration & Defaults |

### 3.2 Deduplicate and Cross-Reference

- Remove duplicate entries (same class/function extracted from re-exports).
- Resolve `[DEP: <module>]` markers — link dependent types to their definitions.
- Build inheritance/implementation trees where applicable.
- Flag `[UNCLEAR: ...]` for ambiguous patterns or undocumented behavior.

### 3.3 Write Synthesis Files

Write `scripts/staging/distill-<lib-name>/synthesis/<concern>.md` for each concern.

### 3.4 Checkpoint

**INTERACTIVE CHECKPOINT:**
```
Phase 3 complete. Synthesis files written.

| Concern | Items | Cross-refs resolved | Unclear markers |
|---------|-------|--------------------|-----------------|
| <concern> | <count> | <count> | <count> |
...

Review synthesis files in scripts/staging/distill-<lib-name>/synthesis/
Let me know:
1. Approve and continue to compression
2. Flag items to investigate further
3. Resolve [UNCLEAR:] markers
```

---

## Phase 4 — Compression

### 4.1 Apply Compression Formats

For each synthesis file, apply the appropriate compression format from `references/compression-formats.md`:

| Concern | Primary format | Secondary format |
|---------|---------------|-----------------|
| API Reference | Compact Signature Tables | Field Tables |
| Data Models | Field Tables, Code Templates | Import Maps |
| Usage Patterns | Checklists, Code Templates | Anti-Pattern Lists |
| Error Handling | Field Tables | Decision Trees |
| Configuration | Field Tables | Checklists |

### 4.2 Compression Rules

**Always drop:**
- Obvious docstrings and inline comments
- Private/internal methods and fields
- Import boilerplate and re-exports
- Test utilities and test helpers
- Trivial getters/setters

**Always keep:**
- Every public class + constructor signature
- Every exported function signature
- Every enum variant / codex entry
- Every error type + when it's thrown
- Every config default value
- Lifecycle methods (init, close, dispose)

**Target:** ~1 line of output per 5-10 lines of source code.

### 4.3 Write Reference Files

Write compressed output directly to `.claude/skills/<lib-name>/references/<concern>.md`.

- Target 5-15KB per file.
- If a file exceeds 15KB, split by sub-concern (e.g., `api-core.md`, `api-network.md`).

No interactive checkpoint — proceed to Phase 5.

---

## Phase 5 — Package

### 5.1 Generate SKILL.md

Create `.claude/skills/<lib-name>/SKILL.md` with this structure:

```markdown
---
name: <lib-name>
description: >
  <1-2 sentence description of the library and when this skill activates>
---

# <lib-name> — <tagline>

## Overview
<2-3 paragraphs: what the library does, where it fits in the ecosystem,
key design philosophy>

## Quick Reference
<Table of the 10-20 most-used classes/functions with one-line descriptions>

## Import Guide
<How to import/use the library in each supported context>

## Reference Files
| File | Contents | Size |
|------|----------|------|
| references/api.md | ... | ...KB |
| ... | ... | ... |

## Usage Patterns
<3-5 compact code snippets showing common workflows>

## Anti-Patterns
<3-5 common mistakes with corrections>
```

Target: 4-8KB for SKILL.md itself.

### 5.2 Validate

Run these checks:
- [ ] SKILL.md has valid YAML frontmatter with `name` and `description`
- [ ] Total skill size is 25-40KB
- [ ] No single reference file exceeds 15KB
- [ ] All files referenced in the index actually exist
- [ ] Public API coverage: at least 80% of Phase 1 public API items appear in output
- [ ] No raw source code blocks longer than 20 lines (compress further if found)

### 5.3 Final Checkpoint

**INTERACTIVE CHECKPOINT:**
```
Phase 5 complete. Skill package ready.

.claude/skills/<lib-name>/
├── SKILL.md (<size>KB)
└── references/
    ├── <file>.md (<size>KB)
    ...
Total: <total>KB

Validation:
- [x/✗] YAML frontmatter valid
- [x/✗] Total size in 25-40KB range
- [x/✗] No file >15KB
- [x/✗] All references exist
- [x/✗] API coverage ≥80%
- [x/✗] No oversized code blocks

Let me know:
1. Approve — clean staging and finalize
2. Adjust — specify what to change
```

On approval, delete `scripts/staging/distill-<lib-name>/`.

---

## Error Recovery

- **Phase 2 agent failure:** Retry once, then extract the failing chunk inline (without Task agent).
- **Oversized output:** Re-compress with stricter heuristics (drop method bodies, keep only signatures).
- **Undersized output (<25KB):** Include more usage examples, expand anti-patterns, add edge case notes.
- **Missing public APIs:** Re-read source files for the missing items and append to relevant reference file.
