# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code **skills catalog** for the KERI (Key Event Receipt Infrastructure) ecosystem. It packages KERI domain knowledge — coding conventions, naming patterns, reference material — as portable skills that can be installed into any KERI project.

This is NOT a KERI implementation. It contains no protocol code. It teaches Claude how to write KERI-style code and work effectively across KERI projects.

## Repository Structure

```
.claude/
  skills/
    keri-style/         # KERI coding style skill (auto-activates on KERI code)
      SKILL.md          # Skill definition with YAML front matter
      references/
        naming_conventions.md
        patterns.md
        examples.md
scripts/
  pdf2md.py             # Convert PDF to markdown (requires pymupdf4llm)
  minimize-md.py        # Strip conversion artifacts from markdown
  .venv/                # Python venv for scripts (gitignored)
```

## Skills Architecture

Each skill lives under `.claude/skills/<name>/` and requires a `SKILL.md` with YAML front matter:

```yaml
---
name: skill-name
description: When and how to activate this skill
command: /command-name        # optional, for user-invocable skills
user_invocable: true          # optional
---
```

Reference files go alongside SKILL.md. Claude Code discovers skills from `.claude/skills/` automatically when installed into a project.

### Installing skills into a project

```bash
# Single skill
cp -r /path/to/keri-claude/skills/keri-style .claude/skills/

# All skills via --add-dir
claude --add-dir /path/to/keri-claude
```

## Scripts

Both scripts live in `scripts/` and use a local venv (`scripts/.venv/`, gitignored).

**pdf2md.py** — Converts PDF to markdown using pymupdf4llm:
```bash
python3 scripts/pdf2md.py input.pdf output.md
```

**minimize-md.py** — Strips PDF/HTML conversion artifacts (page numbers, pandoc divs, excessive whitespace):
```bash
python3 scripts/minimize-md.py input.md output.md
python3 scripts/minimize-md.py --in-place *.md
```

## Contributing a New Skill

1. Create `.claude/skills/<skill-name>/SKILL.md` with YAML front matter (`name`, `description`)
2. Add reference files alongside SKILL.md as needed
3. Add a catalog entry to README.md under **Skills**
4. The skill's `description` field controls when Claude auto-activates it — be specific

## KERI Domain Context

The keri-style skill teaches the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature" used across all KERI implementations. Key conventions:

- **Modules:** gerund `-ing` suffix (`coring.py`, `eventing.py`, `signing.py`)
- **Classes:** agent noun `-er` suffix (`Verfer`, `Diger`, `Siger`, `Salter`)
- **Code tables:** frozen dataclass `-Dex` suffix (`DigDex`, `PreDex`)
- **Transforms:** `-ify` suffix (`sizeify()`, `versify()`, `saidify()`)
- **Data structures:** namedtuple `-age` suffix (`Versionage`, `Smellage`)
- **CESR abbreviations:** `qb64`, `qb2`, `hs`, `ss`, `fs`, `ked`, `raw`

When editing skill reference files, preserve these patterns exactly — they mirror the KERI specification language and are used verbatim across keripy, keriox, keria, and signify-ts.
