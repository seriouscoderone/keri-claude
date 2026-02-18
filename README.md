# keri-claude

A Claude Code **plugin** for the KERI (Key Event Receipt Infrastructure) ecosystem. Provides 16 skills covering protocol specifications, implementation APIs, coding conventions, and architecture planning.

## Installation

### As a Plugin (recommended)

Install via the plugin marketplace — this gives you all skills with namespaced commands (`/keri:skill-name`):

```bash
# Add the marketplace
/plugin marketplace add SeriousCoderOne/keri-claude

# Install the plugin
/plugin install keri@keri-skills
```

All skills are now available. Auto-activating skills work automatically; user-invocable skills are available as `/keri:skill-name`.

### Test locally before publishing

```bash
# Clone the repo
git clone https://github.com/SeriousCoderOne/keri-claude.git ~/keri-claude

# Load as a local plugin for testing
claude --plugin-dir ~/keri-claude
```

### Alternative: --add-dir (no plugin system)

```bash
claude --add-dir ~/keri-claude
```

This loads skills into the session but without plugin namespacing or marketplace updates.

### Alternative: Copy individual skills

```bash
# Copy a single skill into your project
cp -r /path/to/keri-claude/.claude/skills/style .claude/skills/
```

## Skills Catalog

### Protocol Specifications

| Skill | Description | Activation |
|-------|-------------|------------|
| **spec** | KERI protocol specification — KEL rules, witness agreement, delegation, pre-rotation, OOBI | Auto on KERI event processing |
| **cesr** | CESR encoding specification — code tables, stream parsing, SAID, primitives | Auto on CESR codec work |
| **acdc** | ACDC credential specification — schemas, graduated disclosure, IPEX exchange | Auto on ACDC/credential work |

### Implementation APIs

| Skill | Language | Description | Activation |
|-------|----------|-------------|------------|
| **keripy** | Python | keripy reference implementation — Hab/Habery, LMDB, Matter/Verfer/Diger, Serder, VDR/TEL | Auto on keripy imports |
| **keriox** | Rust | keriox workspace — events, processor, escrows, redb, transport, witness/watcher, teliox | Auto on keriox imports |
| **signify-ts** | TypeScript | signify-ts edge signing — SignifyClient, identifier lifecycle, CESR primitives | Auto on signify-ts imports |
| **cesride** | Rust | cesride CESR primitives — Matter/Indexer traits, Verfer, Diger, Signer, Salter | Auto on cesride imports |
| **parside** | Rust | parside CESR parser — Message/MessageList, counter-code groups, cold start | Auto on parside imports |

### Coding & Style

| Skill | Description | Activation |
|-------|-------------|------------|
| **style** | KERI naming conventions — gerund modules, agent nouns, codex patterns, CESR abbreviations | Auto on KERI code |

### Architecture Planning

| Skill | Description | Invoke |
|-------|-------------|--------|
| **design0-ecosystem** | Design KERI-native industry ecosystems — governance, credential schemas, trust frameworks | `/keri:design0-ecosystem` |
| **design1-service** | Design human-facing KERI services — value proposition, user journeys, KERI requirements | `/keri:design1-service` |
| **design2-infrastructure** | Generate AWS infrastructure stacks for KERI services | `/keri:design2-infrastructure` |
| **design3-domain** | Design KERI domain components — data structures, state mapping, runtime selection | `/keri:design3-domain` |

### Knowledge Base & Tools

| Skill | Description | Invoke |
|-------|-------------|--------|
| **chat** | Query keri.host KB for spec-grounded answers with citations | Auto on KERI architecture review |
| **lib-distill** | Distill a source library into a Claude Code skill | `/keri:lib-distill <path>` |
| **spec-distill** | Distill a protocol spec into a Claude Code skill | `/keri:spec-distill <path>` |

## What's in the Plugin

```
keri-claude/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Self-hosted marketplace
├── skills/ → .claude/skills/  # Symlink (plugin convention)
├── .claude/
│   └── skills/              # 16 skill directories
│       ├── spec/
│       ├── cesr/
│       ├── acdc/
│       ├── keripy/
│       ├── keriox/
│       ├── signify-ts/
│       ├── cesride/
│       ├── parside/
│       ├── style/
│       ├── chat/
│       ├── design0-ecosystem/
│       ├── design1-service/
│       ├── design2-infrastructure/
│       ├── design3-domain/
│       ├── lib-distill/
│       └── spec-distill/
├── infrastructure/          # KeriChat CDK stack
└── scripts/                 # Document download & conversion
```

### What plugins can provide

| Component | Directory | Status |
|-----------|-----------|--------|
| **Skills** | `skills/` | 16 skills |
| **Agents** | `agents/` | Not yet — custom subagent definitions |
| **Hooks** | `hooks/hooks.json` | Not yet — event automation |
| **MCP servers** | `.mcp.json` | Not yet — keri-chat could be exposed here |
| **LSP servers** | `.lsp.json` | Not yet — code intelligence |

## Recommended Companion Skills

When using the Rust KERI skills (keriox, cesride, parside), consider also installing the [Rust Best Practices](https://skills.sh/apollographql/skills/rust-best-practices) skill:

```bash
/plugin marketplace add apollographql/skills
/plugin install rust-best-practices@apollographql
```

## Infrastructure (KeriChat)

The `infrastructure/` directory contains a one-click CDK stack for a KERI knowledge base chat system — Aurora Serverless v2 (pgvector), Bedrock Knowledge Base, Lambda chat with streaming, and CloudFront.

### Configuration

All deployment parameters are driven by a single `parameters.json` file. Copy the template and fill in your values:

```bash
cd infrastructure
cp parameters.template.json parameters.json
```

Edit `parameters.json` with your settings:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `region` | AWS region to deploy into | `"us-east-1"` |
| `hostedZoneId` | Route53 Hosted Zone ID (leave empty to skip DNS/TLS) | `""` |
| `hostedZoneDomainName` | Base domain (e.g. `keri.host`) | `""` |
| `chatSubdomain` | Subdomain prefix (e.g. `chat` -> `chat.keri.host`) | `"chat"` |
| `allowedIpCidrs` | Comma-separated IPv4 CIDR list for IP whitelist (no spaces) | `"0.0.0.0/0"` |
| `embeddingModelId` | Bedrock embedding model ID | `"amazon.nova-2-multimodal-embeddings-v1:0"` |
| `embeddingDimension` | Embedding vector dimension | `"1024"` |
| `lambdaConcurrencyLimit` | Lambda reserved concurrency (0 = unreserved) | `0` |
| `billingAlarmThreshold` | CloudWatch billing alarm USD threshold (0 = no alarm) | `0` |

> `parameters.json` is gitignored — it contains your private deployment configuration and is never committed.

### Deploy

```bash
# 1. Populate scripts/staging/ with KERI documents
./scripts/download-whitepapers.sh

# 2. Configure your deployment
cd infrastructure
cp parameters.template.json parameters.json
# Edit parameters.json with your values

# 3. Deploy — builds frontend, passes parameters, and deploys
./scripts/deploy.sh --profile personal
```

The deploy script builds the React frontend, reads `parameters.json`, passes all values as explicit `--parameters` flags to CloudFormation, and runs `cdk deploy`. Extra CDK args pass through (e.g. `./scripts/deploy.sh --profile personal --hotswap`).

### Launch Stack

Deploy your own instance on AWS:

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://keri-host-chat-stack.s3.us-east-1.amazonaws.com/keri-chat/template.yaml&stackName=KeriChat)

### Publish for Launch Stack

```bash
cd infrastructure
./scripts/publish-template.sh keri-host-chat-stack
```

## Contributing

To add a new skill:

1. Create `.claude/skills/<skill-name>/SKILL.md` with YAML front matter (`name`, `description`)
2. Add any reference files alongside SKILL.md
3. Add a catalog entry to this README under the appropriate section
4. Open a PR

See the [Claude Code skills docs](https://code.claude.com/docs/en/skills) and [plugins docs](https://code.claude.com/docs/en/plugins) for format details.

## License

Apache 2.0
