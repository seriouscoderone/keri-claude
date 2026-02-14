# keri-claude

Claude Code skills for the KERI ecosystem. Browse the catalog, install what you need.

## Skills

### keri-style

KERI coding style guide implementing the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature." Teaches Claude the naming conventions used across KERI protocol implementations: gerund modules (`-ing`), agent noun classes (`-er`), codex patterns (`-Dex`), transformation functions (`-ify`), and CESR-native abbreviations (`qb64`, `qb2`, `hs`, `ss`).

**Use for:** keripy, keriox, signify-ts, keria, or any KERI protocol work.

**Activates:** Automatically when Claude detects KERI-related code.

```
.claude/skills/keri-style/
├── SKILL.md
└── references/
    ├── naming_conventions.md
    ├── patterns.md
    └── examples.md
```

### keri-blog

Blog writing skill for [KERI.host](https://keri.host). Handles creating, editing, and reviewing blog posts in the project's distinctive voice — conversational, anti-hype, grounded in real architecture.

**Use for:** Writing and editing KERI.host blog posts.

**Invoke:** `/blog new [topic]`, `/blog edit [post-name]`, `/blog review [post-name]`, `/blog list`

```
.claude/skills/keri-blog/
└── SKILL.md
```

## Installation

### Copy a single skill into your project

```bash
# From your project root
cp -r /path/to/keri-claude/.claude/skills/keri-style .claude/skills/
```

Claude Code picks up skills from `.claude/skills/` automatically.

### Load all skills via --add-dir

```bash
claude --add-dir /path/to/keri-claude
```

Or clone this repo and point to it:

```bash
git clone https://github.com/seriouscoderone/keri-claude.git ~/keri-claude
claude --add-dir ~/keri-claude
```

## Contributing

To add a new skill:

1. Create `.claude/skills/<skill-name>/SKILL.md` with a YAML front matter block (`name`, `description`, and optionally `command` and `user_invocable`)
2. Add any reference files the skill needs alongside SKILL.md
3. Add a catalog entry to this README under **Skills**
4. Open a PR

See the [Claude Code skills docs](https://docs.anthropic.com/en/docs/claude-code/skills) for the SKILL.md format.

## License

Apache 2.0
