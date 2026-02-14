---
name: spec-distill
description: Invoke with `/spec-distill <path-to-spec.md>` to distill a protocol specification into a compact, actionable Claude Code skill. Transforms large markdown specs (200-435KB) into structured skill packages (25-40KB) through a 5-phase pipeline with interactive checkpoints. Use when you have a protocol specification in markdown format and want to create a Claude Code skill that teaches the spec's rules, structures, and algorithms.
command: /spec-distill
user_invocable: true
---

# Spec Distill — Protocol Specification to Claude Code Skill

## Overview

Transforms a large protocol specification (markdown, 3,000–9,000 lines) into a compact Claude Code skill (25–40KB) through 5 phases: Survey, Extraction, Synthesis, Compression, and Package. The output is a ready-to-install skill under `.claude/skills/<spec-name>/`.

**Input:** Path to a markdown specification file (e.g., `scripts/markdown/cesr-specification.md`)
**Output:** `.claude/skills/<spec-name>/SKILL.md` + `references/*.md`

## Workflow

### Phase 1 — Survey

**Goal:** Understand the spec's structure, classify content, plan reference file organization.

1. Parse the input argument to get the spec markdown path. Derive `spec-name` from the filename (e.g., `cesr-specification.md` → `cesr-spec`; `keri-specification.md` → `keri-spec`).

2. Create staging directories:
   ```
   scripts/staging/distill-<spec-name>/
     extractions/
     synthesis/
   ```

3. Read the first 200 lines of the spec for title, version, front matter, and document overview.

4. Build a heading index by grepping for all headings with line numbers:
   ```
   Grep pattern: ^#{2,4}
   ```
   This gives the structural skeleton of the entire document.

5. Using the heading index, compute section boundaries (start line → next heading start line) and classify each section into one of these content types:

   | Content Type | What It Contains | Examples |
   |---|---|---|
   | **data-structures** | Message formats, field definitions, serialization layouts | Event fields, code tables, CESR primitives |
   | **rules** | Normative requirements (MUST/SHOULD/MAY) | Validation rules, processing requirements |
   | **algorithms** | Step-by-step computation procedures | Digest computation, key derivation |
   | **state-machines** | State transitions, protocol flows | KEL processing, escrow states |
   | **terminology** | Defined terms, abbreviations, glossary | Protocol-specific vocabulary |
   | **skip** | Boilerplate to exclude | Copyright, bibliography, terms of use, acknowledgments |

6. Group sections into chunks of 500–800 lines, aligned to section boundaries:
   - Never split a section across chunks
   - If a section exceeds 800 lines, split at H4/H5 sub-boundaries within it
   - Sections classified as `skip` are excluded from chunks entirely
   - Record each chunk as: `{chunk_id, start_line, end_line, sections[], content_types[]}`

7. Propose reference file organization. Group related content types into implementation concerns — these will become the final reference files. Example groupings:
   - `encoding.md` — CESR encoding tables, code points, primitive formats
   - `validation.md` — All MUST/SHOULD/MAY rules, verification procedures
   - `event-processing.md` — State machines, event flows, escrow logic
   - `data-formats.md` — Message structures, field tables, serialization
   - `terminology.md` — Protocol terms and abbreviations (if substantial)

8. Write `staging/distill-<spec-name>/survey.md` containing:
   - Document title and overview (from step 3)
   - Full heading index with line numbers and content type classifications
   - Chunk plan table (chunk_id, lines, sections, types)
   - Proposed reference file groupings

9. **INTERACTIVE CHECKPOINT**: Present to the user:
   - Concept map: table of top-level sections with content type, line count, chunk assignment
   - Proposed reference files with what content maps to each
   - Skip list (sections being excluded)
   - Ask: "Does this grouping look right? Should any sections be reclassified or reference files renamed/split/merged?"

10. Incorporate user feedback and write the approved plan to `staging/distill-<spec-name>/plan.md`.

### Phase 2 — Extraction

**Goal:** Extract structured data from each chunk using parallel Task agents.

1. For each chunk in `plan.md`, launch a Task agent (subagent_type: "general-purpose") with this prompt:

   ```
   You are extracting structured data from a protocol specification.

   Read the file: <spec-path>
   Line range: <start_line> to <end_line> (use Read tool with offset/limit)
   Content type hints: <content_types from survey>

   Extract into the 6 categories defined in the extraction template
   (read: .claude/skills/spec-distill/references/extraction-template.md).

   Write output to: <staging>/extractions/<NN>-<slug>.md

   Rules:
   - Preserve normative keywords (MUST, SHOULD, MAY) exactly
   - Use tables, not prose
   - Flag ambiguities with [AMBIGUOUS: ...]
   - Note cross-references with [XREF: section/concept]
   - If a category has no content in this chunk, omit it
   ```

   Launch chunks in parallel where possible (batch of 4-6 concurrent agents).

2. After all agents complete, verify every extraction file exists and is non-empty:
   ```
   Glob: staging/distill-<spec-name>/extractions/*.md
   ```

3. If any extraction is missing or empty, re-run that specific chunk.

4. **No interactive checkpoint** — extraction is mechanical.

### Phase 3 — Synthesis

**Goal:** Merge extractions by implementation concern, deduplicate, resolve cross-references.

1. Read all extraction files from `staging/distill-<spec-name>/extractions/`.

2. For each implementation concern from `plan.md` (the approved reference file groupings):
   - Pull relevant items from all extraction files that match this concern
   - Merge items of the same category (e.g., all Rules tables into one)
   - Deduplicate: remove exact duplicates, merge near-duplicates keeping the more specific version
   - Resolve `[XREF:]` markers: replace with inline content or specific section references
   - Flag unresolved ambiguities: keep `[AMBIGUOUS:]` markers for user review

3. Write one synthesis file per concern: `staging/distill-<spec-name>/synthesis/<concern>.md`

4. **INTERACTIVE CHECKPOINT**: Present to the user:
   - Summary table: concern name, file size, count of rules/structures/algorithms/terms
   - Cross-reference resolution status (how many resolved vs. remaining)
   - Any `[AMBIGUOUS:]` markers found — list them for user decision
   - Ask: "Review the synthesis. Should anything be moved between files, split, or merged? How should the ambiguities be resolved?"

5. Incorporate user feedback and update synthesis files.

### Phase 4 — Compression

**Goal:** Transform verbose synthesis into compact, actionable reference files.

1. For each synthesis file, read the compression formats reference:
   `.claude/skills/spec-distill/references/compression-formats.md`

2. Apply the appropriate compression format based on content:

   | Content | Compression Format |
   |---|---|
   | Validation logic with conditionals | Decision trees (indented if/then/else) |
   | Field/parameter definitions | Compact tables (name, type, constraints per row) |
   | Multi-step procedures | Ordered checklists |
   | Data structures/messages | Annotated code templates |
   | Scattered warnings/gotchas | Anti-pattern DO/DON'T pairs |
   | State transitions | Compact `[state] --event--> [state]` notation |

3. **Drop:** boilerplate, motivation/rationale paragraphs, history, bibliography, examples that don't add information beyond what the rule already states.

4. **Keep:** every MUST/SHOULD/MAY statement, every field name and constraint, every algorithm step, every state transition, every error condition.

5. Target: 5–15KB per reference file. If a file exceeds 15KB, split by sub-concern.

6. Write compressed output directly to the final skill location:
   ```
   .claude/skills/<spec-name>/references/<concern>.md
   ```

7. **No interactive checkpoint** — compression is mechanical, but the final package review (Phase 5) covers quality.

### Phase 5 — Package

**Goal:** Generate the SKILL.md and validate the complete skill package.

1. Generate `.claude/skills/<spec-name>/SKILL.md` with this structure:

   **YAML Frontmatter:**
   ```yaml
   ---
   name: <spec-name>
   description: <Specific description for auto-activation. State the protocol name,
     what kind of code it applies to, and key concepts. Model after keri-style's
     description — specific enough to activate only when relevant.>
   ---
   ```

   **Body sections:**
   - **Overview** (2–3 sentences): What this spec defines, its scope, key concepts
   - **Quick Reference**: The most critical tables/decision trees inlined directly (the content a developer needs most often — field definitions, primary code tables, core validation rules)
   - **Reference File Index**: List each reference file with 1–2 line summary of contents
   - **Validation Checklist**: Checkbox list of things to verify when implementing this spec
   - **Anti-Patterns**: Common mistakes when implementing this spec (DON'T/DO format)

2. **Validate the package:**
   - Total size across all files: must be 25–40KB
   - No single file exceeds 15KB
   - SKILL.md has valid YAML frontmatter
   - Every reference file listed in the index actually exists
   - Glob for all `.md` files in the skill directory and report sizes

3. **INTERACTIVE CHECKPOINT**: Present to the user:
   - File tree with sizes
   - Total size
   - SKILL.md frontmatter (name + description)
   - Any size violations
   - Ask: "Does this look complete? Ready to clean up staging files?"

4. On user approval, optionally clean up staging:
   ```
   rm -rf scripts/staging/distill-<spec-name>/
   ```

## Chunking Strategy

Specs in this repo range from 3,524 lines (CESR) to 8,891 lines (ACDC). The Read tool defaults to 2,000 lines per call. Strategy:

- **Index pass:** Use Grep for `^#{2,4} ` headings to get the full skeleton without reading the entire file
- **Target chunks:** 500–800 lines, aligned to section boundaries from the heading index
- **Large sections (>800 lines):** Split at H4/H5 sub-heading boundaries within the section
- **Skip list:** Always exclude these sections from extraction:
  - Copyright / License / Terms of Use
  - Bibliography / References / Normative References / Informative References
  - Acknowledgments / Contributors
  - Table of Contents (auto-generated)
  - Change History / Revision Log

## Size Budget

| Component | Target Size |
|---|---|
| SKILL.md | 4–8KB |
| Each reference file | 5–15KB |
| Total skill package | 25–40KB |
| Number of reference files | 3–6 |

If the total exceeds 40KB, go back to Phase 4 and compress more aggressively. If under 25KB, check that no normative content was dropped.

## Error Recovery

- **Extraction agent fails:** Re-read the chunk boundaries from `plan.md` and re-launch just that agent
- **Synthesis too large:** Split the concern into sub-concerns (e.g., `validation-events.md` + `validation-credentials.md`)
- **Compression drops normative content:** Grep the synthesis for MUST/SHOULD/MAY counts, then grep the compressed output — counts should match
- **Size budget violated:** Adjust by splitting large files or compressing further; never drop normative statements to meet size targets
