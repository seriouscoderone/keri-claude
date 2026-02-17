---
name: design3-domain
description: Design KERI domain components for an infrastructure stack. Reads all prior levels (ecosystem.yaml, system.yaml, stack.yaml) to understand context, then guides through component selection, data structure identification, state mapping, and runtime recommendation. Produces domain.yaml, components.md, and data-structures.md.
command: /keri:design3-domain
user_invocable: true
---

# KERI C3 Service Domain — Domain Component Designer

## Overview

Designs the KERI domain components for a specific C2 infrastructure stack. This is where the "work of KERI" gets defined — the event validation, witness receipting, credential management, and duplicity detection that run inside each deployed stack.

**Input:** A stack defined by the C2 skill (stack.yaml exists)
**Output:** `domain.yaml`, `components.md`, `data-structures.md` written to `docs/{ecosystem}/{system}/{stack}/domain/`

## Prerequisites

Before starting, read all reference files in this skill:
- `references/domain-schema.yaml` — canonical YAML schema for domain.yaml
- `references/components-template.md` — output template for components narrative
- `references/data-structures-template.md` — output template for data structures narrative
- `references/keri-primitives.md` — the 5 core + 3 additional KERI domain primitives
- `references/domain-patterns.md` — stack-type to component mapping patterns

## Workflow

### Phase 1 — Discovery

1. Scan `docs/` for all ecosystem directories. Within each, find systems and stacks:
   ```
   docs/{ecosystem}/ecosystem.yaml
   docs/{ecosystem}/{system}/system.yaml
   docs/{ecosystem}/{system}/{stack}/stack.yaml
   ```

2. Present the full tree to the user:
   ```
   Ecosystems:
     {ecosystem.display_name} ({ecosystem.name})
       Systems:
         {system.display_name} ({system.name})
           Stacks:
             {stack.name} ({stack.type}) <-- design domain for this
   ```

3. Ask: "Which stack would you like to design the domain for?"

### Phase 2 — Context Loading

1. Read all three parent YAMLs:
   - `ecosystem.yaml` — governance context, credential catalog, roles
   - `system.yaml` — service pattern, KERI requirements, user journeys, credentials handled
   - `stack.yaml` — stack type, AWS resources, parameters, outputs

2. Summarize the context:
   > "This is a **{stack.type}** stack for the **{system.display_name}** service in the **{ecosystem.display_name}** ecosystem. The system handles {credentials_handled} and requires {keri_requirements}. This stack deploys on {key AWS resources}."

3. Ask: "Does this context look correct before we proceed?"

### Phase 3 — Component Identification

1. Look up the stack type in `references/domain-patterns.md` to get required and optional components.

2. Present to the user:
   > **Required components for {stack.type}:**
   > - Event Log Engine — {purpose from keri-primitives.md}
   > - {other required components}
   >
   > **Optional components:**
   > - {optional components with brief purpose}

3. Ask: "These are the KERI components this stack needs. Any additions or removals?"

### Phase 4 — Per-Component Deep Dive

For each confirmed component, ask targeted questions based on component type. Reference `keri-primitives.md` for the full operation list and invariants.

**Event Log Engine:**
- "What event types will this engine process? Just inception/rotation, or also interactions for seal anchoring?"
- "Expected KEL depth per AID? (affects storage sizing)"
- "Controller mode, verifier mode, or both?"

**Witness Service:**
- "How many witnesses in the pool? What KAACE threshold?"
- "Self-hosted witnesses or shared witness infrastructure?"
- "Public witness (any controller) or restricted (allowed controllers list)?"

**Watcher Service:**
- "Active monitoring (proactive sync) or on-demand query only?"
- "Duplicity alert policy — immediate notification or batched?"
- "Watcher mentoring needed for new instances?"

**KERI Agent (KERIA):**
- "Single-tenant or multi-tenant?"
- "Which credential schemas from the ecosystem will this agent handle?"
- "Delegation depth — does this agent manage delegated AIDs?"
- "Signify protocol for edge signing, or agent-held keys?"

**ACDC Registry + TEL:**
- "Backed (backer receipts) or backerless TEL?"
- "Revocation policy — who can revoke, under what conditions?"
- "Schema enforcement — strict validation or permissive?"
- "Graduated disclosure needed? (partial, selective, full)"

**Judge + Jury:**
- "Consensus threshold — how many watchers must agree?"
- "Watcher pool size for evidence collection?"
- "Judgment notification targets?"

**Delegator:**
- "Maximum delegation depth?"
- "Delegation approval policy — automatic or manual?"

**OOBI Resolver:**
- "Cache TTL for resolved endpoints?"
- "Fallback strategy for failed resolutions?"

**Frontend (if applicable):**
- "Signify-TS client? What wallet operations exposed to the user?"
- "Browser extension integration (polaris-web) or standalone?"

### Phase 5 — Data Structure Identification

1. From `references/domain-patterns.md`, list the data structures for this stack type.

2. Present to the user:
   > **Data structures for {stack.type}:**
   > | Name | Type | Used By |
   > |------|------|---------|
   > | InceptionEvent | key-event | Event Log Engine, Witness Service |
   > | ... | ... | ... |

3. Ask: "Any custom fields or extensions beyond the standard KERI structures? Note: custom fields should come from the ecosystem's credential schemas, not invented here."

### Phase 6 — State Mapping

1. Map each component's state to the stack's AWS resources (from stack.yaml).

2. Present the mapping:
   > **State Mapping:**
   > | Component | State | AWS Resource | Description |
   > |-----------|-------|-------------|-------------|
   > | Event Log Engine | kel_store | WitnessKELTable | Append-only event log |
   > | ... | ... | ... | ... |

3. Ask: "Does this state-to-resource mapping make sense? Any state that needs a different storage target?"

### Phase 7 — Invariant Review

1. From `references/keri-primitives.md`, list the protocol invariants for each component.

2. Present them grouped by component:
   > **Protocol Invariants:**
   >
   > *Event Log Engine:*
   > - Sequence numbers MUST increment by exactly 1
   > - ...
   >
   > *Witness Service:*
   > - First-seen rule: only one version accepted per (prefix, sn)
   > - ...

3. Ask: "Any additional business rules? Remember: C3 should enforce protocol rules, not C0 governance rules. Business rules belong in the service layer (C1) or governance framework (C0)."

### Phase 8 — Runtime Recommendation

1. From `references/domain-patterns.md`, present the recommended runtime:
   > **Recommendation for {stack.type}:**
   > - Language: {language}
   > - Library: {library}
   > - Rationale: {rationale}

2. Ask: "Does this runtime choice work for your team? Alternatives: {list alternatives from domain-patterns.md}"

### Phase 9 — Confirmation and Output

1. Present a summary:
   > **Domain Summary for {stack.name}:**
   >
   > **Components ({count}):**
   > | Name | Type | Operations | State Items |
   > |------|------|-----------|-------------|
   >
   > **Data Structures ({count}):**
   > | Name | Type | Serialization |
   > |------|------|---------------|
   >
   > **Runtime:** {language} / {library}

2. On confirmation, create the output directory and write three files:
   ```
   docs/{ecosystem}/{system}/{stack}/domain/
     domain.yaml          # Structured data (from domain-schema.yaml)
     components.md        # Narrative (from components-template.md)
     data-structures.md   # Narrative (from data-structures-template.md)
   ```

3. Update the parent `stack.yaml` — populate the `domain_components[]` array:
   ```yaml
   domain_components:
     - name: witness-event-log-engine
       type: event-log-engine
     - name: witness-service
       type: witness-service
   ```

4. Report what was written:
   > Wrote 3 files to `docs/{ecosystem}/{system}/{stack}/domain/`:
   > - `domain.yaml` — {size}
   > - `components.md` — {size}
   > - `data-structures.md` — {size}
   > Updated `stack.yaml` with {N} domain components.

## Available Skills for C3 Design

When designing domain components, **use the skills in this repo** to ground your work in actual KERI protocol knowledge and implementation patterns. Do not guess at KERI behavior — query the relevant skill.

### Specification Skills (Protocol Rules & Invariants)

| Skill | Command | Use For |
|---|---|---|
| **keri-spec** | `/keri-spec` | KERI protocol specification — event processing, key state, KEL validation, witness agreement (KAWA/KAACE), delegation, pre-rotation, OOBI discovery. **Use this for all protocol invariants and event structure definitions.** |
| **cesr-spec** | `/cesr-spec` | CESR encoding specification — code tables, stream parsing, SAID derivation, qualified primitives (qb64/qb2). **Use this for data structure serialization and CESR encoding details.** |
| **acdc-spec** | `/acdc-spec` | ACDC credential specification — credential construction, schema anchoring, graduated disclosure (partial/selective/full), IPEX exchange, TEL lifecycle. **Use this for ACDC registry and credential-related components.** |

### Implementation Skills (Code Patterns & APIs)

| Skill | Command | Use For |
|---|---|---|
| **keriox-skill** | `/keriox-skill` | Rust KERI implementation — keriox_core types, Controller/Identifier SDK, redb database ops, witness/watcher components. **Use this when the runtime is Rust/keriox.** |
| **cesride-skill** | `/cesride-skill` | Rust CESR primitives — Matter/Indexer traits, Verfer/Diger/Signer/Salter types, Serder/Sadder serialization. **Use this for Rust CESR primitive operations.** |
| **parside-skill** | `/parside-skill` | Rust CESR stream parser — Message/MessageList types, counter-code group dispatch, cold start detection. **Use this for CESR stream parsing in Rust.** |
| **keripy-skill** | `/keripy-skill` | Python KERI reference implementation — Hab/Habery, LMDB ops, Python CESR primitives. **Use this when the runtime is Python/keripy.** |
| **signify-ts-skill** | `/signify-ts-skill` | TypeScript edge signing — SignifyClient, identifier lifecycle, CESR primitives in TS. **Use this for frontend components.** |

### Architecture & Style Skills

| Skill | Command | Use For |
|---|---|---|
| **keri-chat** | `/keri-chat` | Query the keri.host knowledge base for spec-grounded answers. **Use this to verify protocol claims, find edge cases, and stress-test designs.** |
| **keri-style** | `/keri-style` | KERI coding conventions — gerund-agent naming pattern, CESR nomenclature. **Use this when naming components, operations, and data structures.** |

### How to Use Skills During C3

1. **Phase 4 (Component Deep Dive):** Use `/keri-spec` to verify protocol invariants for each component. Use `/keri-chat` to stress-test designs against spec edge cases.
2. **Phase 5 (Data Structures):** Use `/cesr-spec` for serialization details and field definitions. Use `/acdc-spec` for ACDC/TEL structure details.
3. **Phase 7 (Invariant Review):** Use `/keri-spec` to ensure all spec-mandated invariants are captured. Use `/keri-chat` as devil's advocate.
4. **Phase 8 (Runtime Recommendation):** Use the appropriate implementation skill (`/keriox-skill`, `/keripy-skill`, `/signify-ts-skill`) to verify the chosen runtime supports the required operations.
5. **Phase 9 (Output):** Use `/keri-style` for naming conventions in domain.yaml component and operation names.

## Key Principles

### C3 Must Be Deterministic and Spec-Aligned (Invariant 4)

C3 domain components implement pure KERI protocol logic. They must be:
- **Deterministic:** Same inputs always produce same outputs
- **Protocol-correct:** Enforce all KERI specification rules
- **Spec-aligned:** Use KERI terminology and patterns exactly
- **Side-effect controlled:** Core validation has no I/O; side effects isolated to boundaries

### C3 Does NOT Embed Governance

C3 enforces protocol rules (sequence numbers increment, signatures verify, first-seen rule). It does NOT enforce:
- Who can issue which credentials (C0 governance)
- Business workflow rules (C1 service logic)
- Infrastructure scaling policies (C2 deployment)

If a user proposes a rule that belongs at C0 or C1, gently redirect:
> "That sounds like a governance rule (C0) / service rule (C1). At C3 we enforce protocol invariants. You can add that rule in your ecosystem.yaml / system.yaml."

### Separation from C4

C3 defines *what* domain operations exist and *what invariants* they enforce. C4 defines *how* they are implemented (which library, which language). The `runtime_recommendation` in domain.yaml is advisory — the actual implementation choice is made at C4.
