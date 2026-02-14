# keri-claude

Shared [Claude Code](https://claude.ai/code) context for KERI ecosystem projects.

## Purpose

This repo provides shared Claude Code instructions (`CLAUDE.md`) and skills that apply across all KERI repositories. It is designed to be symlinked into individual project directories so that Claude Code has consistent KERI context regardless of which project you're working in.

## Usage

Symlink into a KERI project's `.claude/` directory:

```bash
# From a KERI project root (e.g., keripy/, signify-ts/, keria/)
ln -s /path/to/keri-claude/.claude .claude/keri-claude
```

Or symlink the CLAUDE.md directly:

```bash
ln -s /path/to/keri-claude/CLAUDE.md CLAUDE.md
```

## Contents

### CLAUDE.md
Shared context for all KERI projects including:
- Repository overview and project structure
- Key architectural concepts (CESR, KERIA, Signify)
- Common development commands for each project
- Shared dependencies and system requirements

### Skills

#### keri-style
KERI coding style guide implementing the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature". Covers:
- Gerund module names (`-ing` suffix)
- Agent noun classes (`-er` suffix)
- Codex patterns (`-Dex` suffix)
- Transformation functions (`-ify` suffix)
- CESR-native abbreviations (`qb64`, `qb2`, `hs`, `ss`, etc.)

#### keri-blog
Blog writing skill for KERI.host. Handles creating, editing, and reviewing blog posts in the project's distinctive voice.

## License

Apache 2.0
