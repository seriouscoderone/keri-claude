# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code **plugin** for the KERI (Key Event Receipt Infrastructure) ecosystem, distributed through its own plugin marketplace. It packages KERI domain knowledge — coding conventions, naming patterns, reference material — plus an MCP server and a deployed knowledge-base chat service.

It contains **no KERI protocol code**. It teaches Claude how to write KERI-style code and work effectively across KERI projects. It does, however, contain real deployable software: a CDK stack, Lambda handlers, a React app, and a stdio MCP server.

### Plugin identity — read this before wondering where a skill came from

| | |
|---|---|
| Plugin name | `keri` (`.claude-plugin/plugin.json`) |
| Marketplace | `keri-skills` (`.claude-plugin/marketplace.json`) |
| Published from | GitHub `SeriousCoderOne/keri-claude`, marketplace source `./` |
| Installed as | `keri@keri-skills` |

**Skills reach a Claude session by two different paths, and both may be live at once:**

1. **Plugin install** — skills appear namespaced, e.g. `keri:chat`, `keri:spec`. Served from `~/.claude/plugins/cache/keri-skills/keri/<version>/`, which is a **git clone pinned to the commit installed**.
2. **Working inside this repo** — skills appear unscoped, e.g. `chat`, `spec`, discovered from `.claude/skills/`.

So seeing both `chat` and `keri:chat` in one session is expected, not a bug.

**The installed copy can be badly stale.** It is pinned at install time and does not track `master`. To check what a machine actually has:

```bash
python3 -c "import json;d=json.load(open('$HOME/.claude/plugins/installed_plugins.json'));print(json.dumps(d['plugins'].get('keri@keri-skills'),indent=2))"
git log -1 --format='%h %ad %s' --date=short <gitCommitSha from above>
```

Refresh with `/plugin update keri@keri-skills`, then `/reload-plugins`. Skill `SKILL.md` edits take effect live, but changes to `plugin.json`, hooks, and MCP servers need the reload or a restart.

**`skills/` is a symlink to `.claude/skills/`.** Editing either path edits the same files. The symlink exists so the plugin loader and the in-repo loader can both find them.

## Repository Structure

```
.claude-plugin/         # PLUGIN MANIFESTS — this is what makes the repo a plugin
  plugin.json           # name: keri. Also where MCP servers are declared.
  marketplace.json      # name: keri-skills. Lists this repo as plugin source "./"
.claude/
  skills/               # 19 skills. `skills/` at the repo root is a symlink here.
    style/              # KERI coding style (gerund modules, -er agent classes)
    spec/ cesr/ acdc/   # Protocol specifications
    keripy/ keriox/ cesride/ parside/ signify-ts/   # Implementation APIs
    design0-ecosystem/ design1-service/            # Architecture planning C0-C3
    design2-infrastructure/ design3-domain/
    spec-hardening/ spec-invariant-coverage/ spec-ul-coverage/
    lib-distill/ spec-distill/                     # Skill-authoring tools
    chat/               # Queries the deployed knowledge base (see below)
mcp-servers/
  keri-chat/            # stdio MCP server exposing ask_keri_chat
infrastructure/         # KeriChat CDK stack (Bedrock KB + Aurora + CloudFront)
  lib/stacks/           # CDK stack definition
  lambda/               # Lambda handlers (chat, mcp, ingestion, db-init)
  frontend/             # React chat UI
  edge/                 # WAF blocked page + landing page HTML
  scripts/
    deploy.sh           # Build frontend + read parameters.json + cdk deploy
    publish-template.sh # Build + publish Launch Stack template
    sync-docs.sh        # Manual doc sync (for updates outside deploy)
rdod/
  spec/domains/         # Formal DDD specification of the KERI ecosystem
docs/
  superpowers/
    specs/              # Design documents
    plans/              # Implementation plans
scripts/
  download-whitepapers.sh  # Download KERI papers/specs into staging/ (--refresh/--check)
  build-specs.sh           # Render kswg specs from source (fresher than upstream's HTML)
  manifest.sha256          # Tracked hashes of staging/ + markdown/ — diff shows what changed
  locally-built.sha256     # Renders built locally; --refresh won't clobber these
  staging/              # Raw documents (PDFs, HTML, TXT) — deployed to S3
  markdown/             # Converted markdown (for skills/local use)
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

### Getting these skills into another project

Installing the plugin is the supported path — it delivers the skills **and** the
`ask_keri_chat` MCP server together:

```bash
/plugin marketplace add SeriousCoderOne/keri-claude
/plugin install keri@keri-skills
```

The two older methods still work but deliver skills only, no MCP server, and no
update path:

```bash
cp -r /path/to/keri-claude/skills/style .claude/skills/   # one skill
claude --add-dir /path/to/keri-claude                      # all skills, ad hoc
```

## The keri-chat MCP server

`mcp-servers/keri-chat/` is a stdio MCP server exposing the `ask_keri_chat`
tool against the hosted knowledge base. It is declared in
`.claude-plugin/plugin.json` under `mcpServers`, so every plugin install gets
it — there is no project-level MCP config.

**`dist/index.js` is a tracked build artifact.** The plugin cache is a git
clone with no `node_modules` and no build step, so the committed file must be
self-contained. `npm run build` bundles it with esbuild.

**`dist/index.js` must only ever be produced by `npm run build`, never by
`tsc`.** `tsc` output is unbundled — it still `import`s the SDK and `zod` at
runtime instead of inlining them — so it cannot start in a plugin cache. That
is why `tsconfig.json` has `"noEmit": true` and `npm run dev` delegates to the
esbuild watcher rather than running `tsc --watch`. Only `dist/index.js` itself
is git-tracked; `.gitignore` re-excludes `dist/*.d.ts` and `dist/*.map` so a
stray `tsc` artefact can't get staged.

**After changing `src/`, rebuild and commit the bundle:**

```bash
cd mcp-servers/keri-chat
npm run typecheck && npm run build
git add dist/index.js src/index.ts
```

Forgetting this ships stale behaviour to every install. Verify the bundle is
self-contained by moving `node_modules` aside and running
`node dist/index.js < /dev/null` — it must print its startup line.

Changes to `plugin.json` need `/reload-plugins` or a restart to take effect.

There is no project-level MCP config committed to the repo (`.claude/settings.json`
was deliberately removed). A contributor working in this repo without the
plugin installed can still get `ask_keri_chat` locally by declaring the server
in an untracked `.claude/settings.local.json`.

The local stdio server may occupy a tool call for up to ~160s in the worst
case (a 10s warm probe followed by a 150s query abort). That's well inside
Claude Code's stdio limits — stdio has no per-request timer, the default
`MCP_TOOL_TIMEOUT` is roughly 28 hours, and the idle window is 30 minutes — so
no client configuration is needed for the local server. The hosted `/mcp`
HTTP endpoint is a different story: it needs an explicit `timeout` in its
client config, documented in the `chat` skill (`.claude/skills/chat/SKILL.md`),
because the default per-request timer for HTTP MCP servers is only 60s.

## Infrastructure (KeriChat)

The `infrastructure/` directory contains a CDK stack that deploys a complete KERI knowledge base chat system: Aurora Serverless v2 (pgvector), Bedrock Knowledge Base, Lambda chat handler with streaming, and CloudFront distribution.

### The live deployment

This is a **single-stack, single-region** deployment. Region is not optional: the
Nova multimodal embedding model the Knowledge Base uses exists only in
`us-east-1`.

| | |
|---|---|
| Stack | `KeriChat` |
| Region | `us-east-1` |
| Public URL | https://chat.keri.host |
| Request path | CloudFront → Lambda Function URL (`RESPONSE_STREAM`), **no API Gateway** |
| Access | WAF WebACL IP allowlist, driven by `allowedIpCidrs` in `parameters.json` |

Discover live values rather than assuming them — resource names carry CDK
hashes and the AWS profile is site-specific:

```bash
# Stack outputs (function URLs, distribution domain, bucket names)
AWS_PROFILE=personal aws cloudformation describe-stacks --region us-east-1 \
  --stack-name KeriChat --query 'Stacks[0].Outputs' --output table

# IDs the chat handler needs are also in SSM
AWS_PROFILE=personal aws ssm get-parameters --region us-east-1 \
  --names /keri-chat/knowledge-base-id /keri-chat/document-bucket-name \
          /keri-chat/data-source-id --query 'Parameters[].[Name,Value]' --output text
```

**The database sleeps.** Aurora runs at `serverlessV2MinCapacity: 0` and pauses
after 5 minutes idle, taking ~25s to resume. This is a deliberate cost decision.
Anything that queries the Knowledge Base must tolerate a resume — see
`infrastructure/lambda/shared/aurora-wake.ts`. When debugging "the chat is
broken", check capacity first:

```bash
AWS_PROFILE=personal aws cloudwatch get-metric-statistics --region us-east-1 \
  --namespace AWS/RDS --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=kerichat-clustereb0386a7-oxx495f7jnz6 \
  --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%S)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
  --period 60 --statistics Average \
  --query 'sort_by(Datapoints,&Timestamp)[-1].Average' --output text
```

`0.0` means paused. Chat Lambda logs live in the log group matching
`/aws/lambda/KeriChat-ChatHandler*`; there are several, so filter by recency.

### Deployment workflow

All deployment parameters are driven by `parameters.json` (copied from `parameters.template.json`, gitignored). The deploy will fail with a helpful message if `parameters.json` is missing.

```bash
# 1. Download KERI papers, specs, and docs into scripts/staging/
./scripts/download-whitepapers.sh

# 2. Configure deployment
cd infrastructure
cp parameters.template.json parameters.json  # edit with your values

# 3. Deploy — builds frontend, passes parameters, and deploys
./scripts/deploy.sh --profile personal
```

The deploy script builds the React frontend, reads `parameters.json`, passes all values as explicit `--parameters` flags to CloudFormation, and runs `cdk deploy`. Extra CDK args pass through (e.g. `--hotswap`).

The stack uses WAF WebACL for IP filtering (driven by `AllowedIpCidrs` CfnParameter), CfnConditions for optional custom domain/TLS, and Nova multimodal embeddings with Nova Lite image parsing. All parameters work at both CDK deploy time and CloudFormation Launch Stack time.

The stack's `BucketDeployment` extracts `scripts/staging/` into the document bucket, then a deploy-time custom resource triggers `StartIngestionJob` so the KB is ready immediately. A daily EventBridge rule handles ongoing re-ingestion.

### Publishing for Launch Stack

```bash
cd infrastructure
./scripts/publish-template.sh keri-host-chat-stack
```

This synths, zips all assets (including the ~113MB document bundle), uploads to the public S3 bucket, and prints a Launch Stack URL.

### S3 bucket naming

Both buckets use account-prefixed names for global uniqueness:
- `{AccountId}-keri-chat-documents` — KB source documents
- `{AccountId}-keri-chat-frontend` — React chat UI

## Scripts

Scripts live in `scripts/` and use a local venv (`scripts/.venv/`, gitignored).

**download-whitepapers.sh** — Downloads KERI papers, specs, and community docs into `scripts/staging/`. Must be run before `cdk deploy` or `publish-template.sh`:
```bash
./scripts/download-whitepapers.sh                    # fetch only what is missing
./scripts/download-whitepapers.sh --check specs      # report staleness, change nothing
./scripts/download-whitepapers.sh --refresh specs    # re-fetch (groups: specs/papers/docs/images)
./scripts/download-whitepapers.sh --refresh 'acdc-*' # or by filename glob
./scripts/download-whitepapers.sh --check-upstream   # report lag --check cannot see
```

**Fetching is skip-if-exists by default, and that is deliberate** — `scripts/staging/`
is baked into the CDK asset bundle at synth time, so stable bytes mean stable
deploys. It also means the corpus rots silently unless you pass `--refresh`.
`scripts/manifest.sha256` is tracked, so `git diff` after a refresh is exactly
the list of files that changed.

### The corpus can be stale in three different ways

Only the first is something `--refresh` can fix. `--check-upstream` reports the
other two.

1. **Our bytes vs the URL** — plain staleness. `--check` / `--refresh` handle it.
2. **A fork behind its parent** — the LLM exports (`keridoc`, `WOT-terms`,
   `vLEI`, `signifypy`) are generated by CI on forks, because the upstream PRs
   adding that generation were never merged. Upstream serves none of these
   artifacts (all 404), so the forks are load-bearing. A fork behind its parent
   serves stale content forever while `--check` reports "ok".
3. **A rendered spec behind its own source** — the kswg specs are fetched as
   `docs/index.html`, a *committed* Spec-Up-T render that upstream regenerates
   by hand. It lags `spec/`.

**build-specs.sh** — Renders the kswg specs from source instead of trusting
upstream's committed render, closing gap 3:
```bash
./scripts/build-specs.sh              # build all three from the sibling checkouts
./scripts/build-specs.sh keri acdc    # only the named specs
./scripts/build-specs.sh --sync       # fast-forward each fork from trustoverip first
```

Two non-obvious constraints, both enforced in the script:

- **The render must go through `collectExternalReferences`, never `npm run
  render`.** A bare render resolves no external cross-references — the keri spec
  drops from 115 xrefs to 7 and silently emits a smaller, poorer page. The
  script refuses to stage a render with fewer than 20 xrefs.
- The render also rewrites `docs/versions/index.html`, so cleanup restores the
  whole `docs/` tree and leaves the spec repo clean.

Locally-built renders are recorded in `scripts/locally-built.sha256`;
`--refresh` reports those files as `PROTECTED` rather than replacing them with
upstream's older render. `--force` overrides.

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

## DDD Spec Philosophy

The `rdod/spec/domains/` directory is a formal DDD specification of the KERI ecosystem. When working on it, the following principles are non-negotiable.

### 1. Linguistic discovery — DDD is a language game

DDD is fundamentally about **using linguistic precision to discover the true domain concepts**. You are a language model — use that. When naming a domain, type, service, or port, do NOT accept the first label that comes to mind. Instead:

1. **Describe what it DOES for the adopter** — in plain verbs and nouns
2. **Test the name linguistically** — "A DelegationEscrowRepo produces... anchors?" If the name doesn't match what it produces, the name is wrong.
3. **Try multiple framings** — explore at least 2-3 naming options before committing. Ask: does a `FooService` produce `Foo`s? Does a `BarRepository` store `Bar`s? If not, the name is lying.
4. **Discover, don't label** — the right name reveals something about the domain you didn't see before. If the name is just a relabeling of the implementation term, you haven't done DDD yet.

**The process:** Protocol specs and implementations use mechanism-centric names (anchor, seal, escrow, KEL). Your job is to discover the adopter-centric concept underneath. "Anchoring" is what the protocol does. "Committing an authorization" is what the adopter does. "KEL" is what the database is called. "IdentityService" is what the adopter interacts with.

**Red flags that you're not doing DDD:**
- You're using a KERI/keripy term verbatim (anchor, seal, Kevery, Baser, Habery)
- The name describes a mechanism, not a job ("AnchorEscrowRepo" — what job does "anchor" describe?)
- You can't explain the name to someone who has never seen KERI
- You accepted the first name without exploring alternatives

### 2. Adopter-centric naming — never implementation naming

All terms, types, ports, and ubiquitous language entries MUST use Domain-Driven Design conventions. Do NOT use keripy class names, LMDB subdatabase names, keria variable names, or any implementation-specific identifier.

| Wrong (implementation) | Right (DDD) | Why |
|------------------------|-------------|-----|
| `Baser` | `KelRepository` | Named for what it stores, not the class |
| `Kevery` | `IdentityService` | Named for the adopter's concern |
| `Habery` | `IdentifierManager` | Named for the job it does |
| `anchor` / `seal` | `authorization proof` / `commitment` | Named for what the adopter is doing |
| `KEL` | `KelRepository` (persistence subdomain) | KEL is the storage implementation; the service is the domain concept |
| `ked` | describe by domain term | Field abbreviations don't leak into the spec |
| `duplicity-detection` | `integrity` | Named for the adopter's concern |
| `escrow` (as standalone concept) | part of a Service's guard logic | Escrow is a mechanism inside a service, not a separate domain |

The spec must be readable by someone who has never seen keripy.

### 3. Verb-driven cross-domain relationships

When domains interact, describe the interaction with **adopter-centric verbs**, not protocol mechanism names. The right verbs reveal the nature of the relationship:

| Protocol mechanism | Adopter verb | Example |
|---|---|---|
| Delegator anchors a seal | Delegator **approves** the delegation | `DelegationService.approve()` |
| Issuer anchors TEL to KEL | Issuer **authorizes** the credential operation | `StatusService.authorize()` |
| Controller creates ixn with seal | Controller **commits** to their identity history | `IdentityService.commit()` |
| Validator checks anchor chain | Verifier **verifies** the authorization chain | `VerificationService.verify()` |

These verbs should appear in port names, operation names, and domain event names. If you find yourself writing "anchor" or "seal" in a port contract, replace it with the adopter verb.

### 4. Services over Repositories for domain logic

When a component has rich behavior (validation, coordination, invariant enforcement, multi-step workflows), it is a **Service**, not a Repository. Repositories are storage — they store and retrieve. Services are behavior — they validate, coordinate, approve, authorize, commit, verify.

The pattern: **Service wraps Repository**. The Service IS the guard. The Repository IS the storage.

```
IdentityService (validates, enforces thresholds, routes to escrow)
  └── KelRepository (append-only log + escrow queues — persistence subdomain)

StatusService (validates TEL events, enforces state machine)
  └── TelRepository (append-only log + escrow queues — persistence subdomain)

DelegationService (orchestrates approval workflow)
  └── uses IdentityService (delegator commits approval)

VerificationService (verifies authorization chains)
  └── uses StatusService + IdentityService
```

The adopter interacts with Services. Repositories are internal persistence details.

### 5. Builder pattern for field maps

KERI's wire format uses terse field maps with 1-2 character keys (`v`, `t`, `d`, `i`, `s`, `kt`, `k`, `nt`, `n`, `bt`, `b`, `c`, `a`). This is correct for the protocol. It must NOT leak into the adopter's experience.

Every complex type (3+ fields, or fields with KERI-specific encoding rules) MUST have a typed Builder in the spec that:
- Uses full domain-language names for all parameters
- Encapsulates field abbreviations and ordering rules internally
- Reveals the domain concept, not the wire encoding

Example: instead of `{"t": "icp", "i": aid, "s": "0", "kt": "1", "k": [vk], "nt": "1", "n": [nk], "bt": "3", "b": [w1,w2,w3]}`, the spec describes `IdentifierInception.builder().aid(aid).signingKey(vk).nextKey(nk).witnessPool([w1,w2,w3]).threshold(3).build()`.

### 6. Oracle methodology for spec hardening

When the spec has gaps or contradictions, resolve them using this priority:

1. **KERI/CESR/ACDC specification** — authoritative. If the spec is clear, that's the answer.
2. **keripy/keria implementation** — confirmatory. Agreement is valuable signal; disagreement surfaces implementation lag.
3. **DDD design decisions** — for questions the protocol spec doesn't reach.

When querying oracles (spec, keripy, keria), **reframe every question as a domain rule**, not an implementation question:
- BAD: "What does `Tholder.satisfy()` return?"
- GOOD: "For a weighted threshold with multiple clauses, does satisfaction require ALL clauses met (AND) or ANY clause (OR)?"

The spec wins ties. But always cross-check with implementations — three-way agreement is high-confidence evidence.

## KERI Domain Context

The `style` skill (`.claude/skills/style/`) teaches the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature" used across all KERI implementations. Key conventions:

- **Modules:** gerund `-ing` suffix (`coring.py`, `eventing.py`, `signing.py`)
- **Classes:** agent noun `-er` suffix (`Verfer`, `Diger`, `Siger`, `Salter`)
- **Code tables:** frozen dataclass `-Dex` suffix (`DigDex`, `PreDex`)
- **Transforms:** `-ify` suffix (`sizeify()`, `versify()`, `saidify()`)
- **Data structures:** namedtuple `-age` suffix (`Versionage`, `Smellage`)
- **CESR abbreviations:** `qb64`, `qb2`, `hs`, `ss`, `fs`, `ked`, `raw`

When editing skill reference files, preserve these patterns exactly — they mirror the KERI specification language and are used verbatim across keripy, keriox, keria, and signify-ts.
