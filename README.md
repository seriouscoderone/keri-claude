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

### keriox-skill

Rust KERI protocol implementation (keriox) distilled into a compact skill. Covers the full keriox workspace: core event types, processor pipeline, escrow system, database traits (redb), transport abstraction, controller/witness/watcher components, and TEL (teliox). Defers protocol semantics to keri-spec/cesr-spec/acdc-spec.

**Use for:** Working with keriox imports, keriox_core types, witness/watcher components, or Rust TEL processing.

**Activates:** Automatically when Claude detects keriox-related Rust code.

```
.claude/skills/keriox-skill/
├── SKILL.md
└── references/
    ├── api.md
    ├── types.md
    ├── patterns.md
    ├── components.md
    └── errors.md
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

## Infrastructure (KeriChat)

The `infrastructure/` directory contains a one-click CDK stack for a KERI knowledge base chat system — Aurora Serverless v2 (pgvector), Bedrock Knowledge Base, Lambda chat with streaming, and CloudFront.

### Deploy

```bash
# 1. Populate scripts/staging/ with KERI documents
./scripts/download-whitepapers.sh

# 2. Deploy — documents are packaged as CDK assets and deployed to S3 automatically
cd infrastructure
npx cdk deploy --profile personal
```

Documents are baked into the template at synth time. The stack deploys them to S3, then triggers a Bedrock ingestion job so the KB is ready immediately.

### Publish for Launch Stack

```bash
cd infrastructure
./scripts/publish-template.sh keri-host-chat-stack
```

## Recommended Companion Skills

When using the Rust KERI skills (keriox-skill, cesride-skill, parside-skill), consider also installing the community [Rust Best Practices](https://skills.sh/apollographql/skills/rust-best-practices) skill in your project:

```bash
claude install-skill https://skills.sh/apollographql/skills/rust-best-practices
```

This adds general Rust idioms, error handling patterns, and code quality guidance that complements the KERI-specific domain knowledge.

## Contributing

To add a new skill:

1. Create `.claude/skills/<skill-name>/SKILL.md` with a YAML front matter block (`name`, `description`, and optionally `command` and `user_invocable`)
2. Add any reference files the skill needs alongside SKILL.md
3. Add a catalog entry to this README under **Skills**
4. Open a PR

See the [Claude Code skills docs](https://docs.anthropic.com/en/docs/claude-code/skills) for the SKILL.md format.

## License

Apache 2.0
