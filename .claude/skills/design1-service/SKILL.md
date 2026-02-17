---
name: design1-service
description: Design a human-facing KERI service within an existing ecosystem. Reads ecosystem.yaml from C0 to understand governance context, then guides through service definition including value proposition, user journeys, KERI requirements, and business model. Produces system.yaml and service-design.md. Invoke with /keri:design1-service.
command: /keri:design1-service
user_invocable: true
---

# C1 System Designer — Human-Facing KERI Service Definition

## Overview

Designs a human-facing service that operates within a KERI-backed ecosystem. This is the C1 level of the C4 architecture: it defines **what** the service does for humans, **who** uses it, **how** it makes money, and **what KERI infrastructure** it requires. The output is a `system.yaml` (machine-readable) and `service-design.md` (human-readable narrative).

**Key principle:** C1 describes services in human terms. "Identity Protection" not "witness pools." "Instant Background Checks" not "KEL validation." Push back on KERI jargon — force plain language for anything user-facing.

## Prerequisites

Before starting, read all reference files in this skill:
- `references/system-schema.yaml` — canonical schema template with field documentation
- `references/service-patterns.md` — four canonical service patterns with KERI mappings
- `references/c1-design-questions.md` — question bank with follow-up probes
- `references/service-design-template.md` — output template for service narrative

## Workflow

### Phase 1: Discovery

1. Search for existing ecosystems:
   ```
   Glob: docs/*/ecosystem.yaml
   ```

2. If ecosystems exist, list them with their display names and ask: "Which ecosystem does this service belong to?"

3. If the target ecosystem has existing systems, list them:
   ```
   Glob: docs/{ecosystem}/*/system.yaml
   ```
   Show existing system names so the user understands what already exists.

4. Ask: "Are we creating a new service or continuing an existing one?"
   - If continuing, read the existing `system.yaml` and `service-design.md` and pick up where it left off.
   - If new, proceed to Phase 2.

5. If no ecosystems exist, tell the user: "No ecosystems found. You should run `/keri-c0-ecosystem` first to define the governance context. Or, if you want to skip C0, I can create a minimal ecosystem scaffold and proceed."

### Phase 2: Problem Framing

**Goal:** Establish the human problem this service solves.

Ask Q1 from the design questions: "What problem does this service solve for a real human? Describe it without using any KERI terminology."

**Enforce the jargon rule.** If the user's answer contains KERI terms (AID, KEL, ACDC, witness, watcher, CESR, credential, verifiable, delegated identifier, etc.), push back:

> "That describes KERI infrastructure, not a human problem. Imagine you are pitching this to someone who has never heard of KERI. What pain goes away for them?"

Keep asking until you get a plain-language answer. This becomes `service.value_proposition`.

Also capture:
- A candidate `system.name` (kebab-case)
- A candidate `system.display_name`
- A one-sentence `system.description`

### Phase 3: User Identification

Ask Q2: "Who are the humans that use this? What are they trying to accomplish today without it?"

Identify 2-4 distinct actor types. For each:
- Name the actor (e.g., "Individual consumer," "HR manager," "Platform operator")
- Understand their current workflow without this service
- Understand their motivation to adopt

### Phase 4: Pattern Matching

Present the four canonical patterns from `references/service-patterns.md`:

1. **Identity Lifecycle** — Secure Digital Identity Management
2. **Credential Verification** — Instant Background Checks
3. **Marketplace Trust** — Portable Reputation System
4. **Compliance-as-a-Service** — Automated Regulatory Compliance

Ask Q3: "Which pattern is closest? What does NOT fit?"

If none fit, set `service.pattern: custom` and work from the user's description. If a pattern fits well, use it as a starting template for KERI requirements and required stacks.

### Phase 5: User Journey Exploration

For each actor type identified in Phase 3, ask Q4: "Walk me through from first encounter to getting value. What does the user do step by step?"

For each journey, capture:
- `name` — descriptive journey name
- `actor` — who performs it
- `steps[]` — ordered list of (action, keri_operation) pairs

**Mapping actions to KERI operations:**
- "Sign up" / "Create account" -> AID inception
- "Set up backup" / "Add recovery" -> Delegation, key pre-rotation
- "Get verified" / "Receive credential" -> ACDC issuance
- "Prove identity" / "Share credential" -> ACDC presentation, graduated disclosure
- "Check someone's credential" -> KEL validation, ACDC verification
- "Revoke access" / "Cancel credential" -> TEL revocation event
- "Report fraud" -> Duplicity detection, judge/jury evaluation
- "Transfer reputation" -> Multi-issuer ACDC chaining
- "Generate compliance report" -> Proof generation, schema validation

Target 3-5 journeys total across all actors.

### Phase 6: KERI Requirements Derivation

Based on the user journeys, derive KERI infrastructure requirements. Ask targeted questions from the design questions (Q5-Q7):

- **Q5 — Identity:** "Does the user need to create their own identity?" -> `agent_service`
- **Q6 — Issuance:** "Does anyone need to issue credentials?" -> `acdc_registry`
- **Q7 — Verification:** "Does anyone need to verify credentials?" -> `watcher_network`

Additional derivation rules:
- If any journey involves AID creation, rotation, or recovery -> `agent_service: true`
- If any journey involves event receipting or first-seen -> `witness_pool: true`
- If any journey involves checking for fraud/duplicity -> `watcher_network: true`
- If any journey involves issuing or revoking credentials -> `acdc_registry: true`
- If any journey involves aggregating evidence from multiple watchers -> `judge_jury: true`
- If any actor is a human end-user (not an API consumer) -> `frontend: true`

Map credentials to `keri_requirements.credentials_handled[]` using credential IDs from the ecosystem's `ecosystem.yaml` if available.

Present the derived requirements table and ask: "Does this look right? Anything missing or unnecessary?"

### Phase 7: Business Model

Ask Q8: "How does this make money? Who pays, and for what?"

Capture:
- `business_model.type` — subscription, per-transaction, enterprise, freemium
- `business_model.pricing_notes` — free-text pricing details

If the user is unsure, present business models from the matched pattern in `references/service-patterns.md` as starting points.

### Phase 8: SLA Discussion

Ask Q9: "How fast does verification need to be? What happens if the service goes down for an hour?"

Capture:
- `sla.availability` — target uptime percentage
- `sla.latency_p99` — 99th percentile response time
- `sla.throughput` — peak request rate
- `sla.recovery_time` — max acceptable downtime

Provide sensible defaults if the user is unsure:
- Availability: 99.9% (8.7 hours downtime/year)
- Latency p99: 500ms for real-time operations
- Throughput: depends on user base
- Recovery time: 4 hours

### Phase 9: Integration Points

Ask Q10: "What existing systems does this need to talk to?"

For each integration, capture:
- `name` — descriptive name
- `type` — api, database, keri-service, webhook
- `direction` — inbound, outbound, bidirectional
- `description` — what data flows and why

Common integrations to probe for:
- Existing identity providers (LDAP, OAuth, SAML)
- Databases or data warehouses
- Other KERI services in the ecosystem
- Regulatory reporting systems
- Payment processors
- Notification systems (email, SMS, push)

### Phase 10: Confirmation and Output

1. Present a complete service summary:
   - System name and description
   - Value proposition
   - Service pattern
   - User journeys (abbreviated)
   - KERI requirements table
   - Business model
   - SLA targets
   - Integration points

2. Ask: "Does this look correct? Any changes before I write the files?"

3. On confirmation, write two files:

   **`docs/{ecosystem}/{system}/system.yaml`**
   - Populate from the schema template with all captured data
   - Leave `stacks[]` empty (populated by C2)

   **`docs/{ecosystem}/{system}/service-design.md`**
   - Populate from the service design template
   - Write narrative sections (value proposition expansion, journey narratives)
   - Fill all tables

4. If the ecosystem has an `ecosystem.yaml`, update its `systems[]` array to include a reference to this new system:
   ```yaml
   systems:
     - name: {system.name}
       path: ./{system.name}/system.yaml
   ```

5. Remind the user:
   > "Service design complete. To design the infrastructure for this service, run `/keri-c2-service-infrastructure`."

## Anti-Patterns

- **DON'T** let KERI jargon leak into value_proposition or user-facing descriptions
- **DON'T** skip user journey exploration — journeys drive KERI requirement derivation
- **DON'T** set KERI requirements without justification from journeys
- **DON'T** design infrastructure at C1 — that is C2's job
- **DON'T** invent credential schemas at C1 — those come from C0 (ecosystem governance)
- **DO** push back on jargon repeatedly until the user speaks in human terms
- **DO** present the four patterns as a starting point, not a constraint
- **DO** derive KERI requirements from journeys, not from the user's technical assumptions
- **DO** capture SLA requirements even if approximate — C2 needs them for infrastructure sizing
