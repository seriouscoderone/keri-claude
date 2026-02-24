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

## Companion Plugins

### kerizon

[kerizon](https://github.com/seriouscoderone/kerizon) is a Claude Code plugin that takes the ecosystem specification produced by the `design0-ecosystem` skill and derives a complete **four-panel KERI Human-Agent Collaboration UI** from it:

- **Panel 1** — Credential Portfolio (operational view by workflow stage)
- **Panel 2** — Watcher View (live TEL/KEL event stream with delegation-tree swimlanes)
- **Panel 3** — Consultation Chat (orchestrator agent with credential chain access)
- **Panel 4** — Agent Supervision (action queue, approval gates, interrupt controls)

The two plugins are designed to chain: `keri-claude`'s `design0-ecosystem` output is the direct input to `kerizon`'s UI derivation step.

```
/plugin install seriouscoderone/keri-claude   # ecosystem design → spec output
/plugin install seriouscoderone/kerizon       # spec input → four-panel UI design
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
