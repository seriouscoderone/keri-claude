---
name: keri-c2-service-infrastructure
description: Generate AWS infrastructure stacks for KERI services. Reads system.yaml from C1 to determine required stack types, then generates stack.yaml files from pre-built templates. Intentionally thin — most decisions are made at C0 and C1. Supports 6 stack types: witness-pool, watcher-node, agent-service, acdc-registry, judge-jury, frontend. Invoke with /keri-c2-service-infrastructure.
command: /keri-c2-service-infrastructure
user_invocable: true
---

# C2 Service Infrastructure — AWS Stack Generator for KERI Services

## Overview

C2 is the **thinnest level** in the C4 architecture. Infrastructure does NOT embed domain rules — it hosts C3 components and serves C1 services. Most parameters are auto-derived from ecosystem.yaml (C0) and system.yaml (C1). The conversation is brief: confirm environment, region, domain, and security requirements, then generate.

**Key invariant:** Infrastructure must NOT embed business rules. It provides compute, persistence, transport, and orchestration. What a credential means, who is authorized, and what governance applies — that is C0 and C1.

## Before Starting

Read all reference files in this skill:
- `references/stack-schema.yaml` — Canonical schema every stack.yaml follows
- `references/resources-template.md` — Output template for resources narrative
- `references/c2-design-questions.md` — The 4 questions to ask (env, region, domain, security)
- `references/templates/witness-pool.yaml` — Witness pool infrastructure
- `references/templates/watcher-node.yaml` — Watcher node infrastructure
- `references/templates/agent-service.yaml` — KERIA agent infrastructure
- `references/templates/acdc-registry.yaml` — ACDC registry infrastructure
- `references/templates/judge-jury.yaml` — Judge/jury network infrastructure
- `references/templates/frontend.yaml` — Static site + CDN infrastructure

## Workflow

### Step 1 — Discovery

List the project's C4 artifacts to understand what exists.

```
Glob: docs/*/ecosystem.yaml           # All ecosystems
Glob: docs/*/*/system.yaml            # All systems
Glob: docs/*/*/*/stack.yaml           # All existing stacks
```

Present a summary:
```
Ecosystems:
  - {name} ({path})

Systems:
  - {ecosystem}/{name} ({path})

Existing stacks:
  - {ecosystem}/{system}/{stack-name} ({stack.type})
```

Ask: **Which system do you want to generate infrastructure for?**

If only one system exists, confirm and proceed.

### Step 2 — Gap Analysis

Read the selected system.yaml. Look at `keri_requirements` and `stacks[]` to determine:
- What infrastructure types are needed (derived from roles, credential flows, service endpoints)
- What stacks already exist
- What is missing

Present the gap:
```
System: {system.name}
Required infrastructure (from keri_requirements):
  [x] witness-pool    — exists at docs/{eco}/{sys}/witness-pool/
  [ ] agent-service   — MISSING
  [ ] frontend        — MISSING
  [x] acdc-registry   — exists at docs/{eco}/{sys}/acdc-registry/

Generate missing stacks? (y/n)
```

**Auto-derivation rules** (from system.yaml keri_requirements):
- If system has `witness_pool` role or mentions witnesses -> needs `witness-pool` stack
- If system has `agent` or `keria` role -> needs `agent-service` stack
- If system has `watcher` role or mentions watchers -> needs `watcher-node` stack
- If system issues/verifies ACDCs -> needs `acdc-registry` stack
- If system has `judge` or `jury` role or mentions duplicity -> needs `judge-jury` stack
- If system has a user-facing web app -> needs `frontend` stack

### Step 3 — Per-Stack Parameters

For each stack to generate, ask only the 4 C2 design questions (see `references/c2-design-questions.md`):

1. **Environment** — prod / staging / dev? (default: dev)
2. **Region** — AWS region? (default: us-east-1)
3. **Custom domain** — Only for frontend, agent-service, witness-pool (default: none)
4. **Security requirements** — HIPAA / SOC2 / FedRAMP / none? (default: none)

Ask all questions at once for efficiency. If generating multiple stacks, ask once and apply to all (unless they need different environments).

### Step 4 — Auto-fill from Prior Levels

Pull parameters automatically from ecosystem.yaml and system.yaml:

| Parameter | Source |
|---|---|
| `witness_threshold` | system.yaml -> keri_requirements.witness_threshold or ecosystem.yaml -> governance.witness_policy |
| `witness_aid_prefix` | system.yaml -> keri_requirements.witness_aids[] |
| `supported_schemas` | ecosystem.yaml -> credential_catalog[].schema_said |
| `witness_pool_oobis` | Other stacks' outputs (if witness-pool already generated) |
| `watcher_oobis` | Other stacks' outputs (if watcher-node already generated) |
| `issuer_aid` | system.yaml -> keri_requirements.issuer_aid |
| `tenant_mode` | system.yaml -> service.tenant_mode or "single" |
| `consensus_threshold` | ecosystem.yaml -> governance.judge_policy.threshold |
| `allowed_controllers` | system.yaml -> keri_requirements.allowed_controllers[] |

If a value cannot be auto-derived, use the template default and add a `# TODO: fill from C1` comment.

### Step 5 — Generate

For each stack to generate:

1. Read the matching template from `references/templates/{type}.yaml`
2. Copy and fill all parameters (from Step 3 answers + Step 4 auto-fill)
3. Adjust resource sizing based on environment:

| Resource | dev | staging | prod |
|---|---|---|---|
| ECS desired_count | 1 | 2 | 3 |
| ECS auto_scaling max | 2 | 4 | 10 |
| RDS instance_class | db.t4g.small | db.t4g.medium | db.r6g.large |
| RDS multi_az | false | false | true |
| Aurora max_capacity | 2 | 4 | 16 |
| DynamoDB deletion_protection | false | false | true |
| Backup retention | 1 | 7 | 30 |

4. Write stack.yaml to `docs/{ecosystem}/{system}/{stack-name}/stack.yaml`
5. Generate resources.md from `references/resources-template.md` and write to `docs/{ecosystem}/{system}/{stack-name}/resources.md`
6. Update system.yaml's `stacks[]` array with the new stack entry:
   ```yaml
   stacks:
     - name: "{stack-name}"
       type: "{stack.type}"
       path: "{stack-name}/"
   ```

### Step 6 — Next Steps

After generating all stacks, remind the user:

```
Infrastructure stacks generated:
  - docs/{eco}/{sys}/{stack-1}/stack.yaml + resources.md
  - docs/{eco}/{sys}/{stack-2}/stack.yaml + resources.md

Next: Run /keri-c3-service-domain to design domain components
that will run on this infrastructure.

The domain_components[] in each stack.yaml will be populated by C3.
```

## Stack Type Reference

| Type | Compute | Database | Networking | Use Case |
|---|---|---|---|---|
| witness-pool | ECS Fargate | DynamoDB | ALB + Route53 | Receipt generation for controllers |
| watcher-node | Lambda | Aurora Serverless | API GW WebSocket | Duplicity detection + first-seen |
| agent-service | ECS Fargate | RDS PostgreSQL | ALB + CloudFront | Full KERIA agent with wallet |
| acdc-registry | Lambda | DynamoDB + S3 | API GW REST | Credential issuance/revocation |
| judge-jury | Step Functions + Lambda | DocumentDB | API GW REST | Consensus on duplicity evidence |
| frontend | - | - | S3 + CloudFront | Static web app hosting |

## Environment Sizing Quick Reference

- **dev**: Minimal. Single-AZ, smallest instances, no backups, low auto-scaling limits.
- **staging**: Moderate. Single-AZ but right-sized, 7-day backups, medium auto-scaling.
- **prod**: Full. Multi-AZ, large instances, 30-day backups, high auto-scaling, deletion protection.
