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
infrastructure/         # KeriChat CDK stack (Bedrock KB + Aurora + CloudFront)
  lib/stacks/           # CDK stack definition
  lambda/               # Lambda handlers (chat, ingestion, db-init)
  frontend/             # React chat UI
  edge/                 # WAF blocked page + landing page HTML
  scripts/
    publish-template.sh # Build + publish Launch Stack template
    sync-docs.sh        # Manual doc sync (for updates outside deploy)
scripts/
  download-whitepapers.sh  # Download KERI papers/specs into staging/
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

### Installing skills into a project

```bash
# Single skill
cp -r /path/to/keri-claude/skills/keri-style .claude/skills/

# All skills via --add-dir
claude --add-dir /path/to/keri-claude
```

## Infrastructure (KeriChat)

The `infrastructure/` directory contains a CDK stack that deploys a complete KERI knowledge base chat system: Aurora Serverless v2 (pgvector), Bedrock Knowledge Base, Lambda chat handler with streaming, and CloudFront distribution.

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
./scripts/download-whitepapers.sh
```

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

The keri-style skill teaches the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature" used across all KERI implementations. Key conventions:

- **Modules:** gerund `-ing` suffix (`coring.py`, `eventing.py`, `signing.py`)
- **Classes:** agent noun `-er` suffix (`Verfer`, `Diger`, `Siger`, `Salter`)
- **Code tables:** frozen dataclass `-Dex` suffix (`DigDex`, `PreDex`)
- **Transforms:** `-ify` suffix (`sizeify()`, `versify()`, `saidify()`)
- **Data structures:** namedtuple `-age` suffix (`Versionage`, `Smellage`)
- **CESR abbreviations:** `qb64`, `qb2`, `hs`, `ss`, `fs`, `ked`, `raw`

When editing skill reference files, preserve these patterns exactly — they mirror the KERI specification language and are used verbatim across keripy, keriox, keria, and signify-ts.
