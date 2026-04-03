# Spec Hardening Methodology

A systematic process for discovering and resolving gaps, contradictions, and underspecification in a DDD spec by forcing implementation planning and resolving questions through authoritative oracles.

## Core Insight

Forcing an AI to **plan the implementation** of each domain surfaces questions that pure spec review misses. The planning process reveals what's actually needed to build — missing types, underspecified invariants, contradictory claims, forward references, and vocabulary gaps. Each question is then resolved through a hierarchy of authoritative sources before updating the spec.

## Prerequisites

- A DDD spec with `domain.yaml`, `types.yaml`, `ports.yaml`, `ubiquitous-language.yaml`, and optionally `verification.yaml`, `errors.yaml`, `protocols.yaml` per domain
- A build order (layered dependency graph)
- Access to authoritative sources (protocol specifications, reference implementations)
- The linter passing clean before starting

## Tooling

All structural validation uses the `/ddd-spec` skill's scripts (from the `domain-design-toolkit` plugin):

| Tool | Command | Purpose |
|------|---------|---------|
| **Linter** | `python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains [--strict] [--json]` | Reference resolution, mirror consistency, cycle detection, published language rules, parent-ref violations, completeness. `--strict` treats warnings as errors. |
| **Context Map** | `python skills/ddd-spec/scripts/generate_context_map.py rdod/spec/domains` | Regenerates `context-map.html` — interactive domain neighborhood visualization. |
| **Build Order** | `python skills/ddd-spec/scripts/build_order.py rdod/spec/domains` | Regenerates `build-order.txt`, `build-order.json`, `build-order.mmd` from domain dependency graph. |

## Phase 1: Structural Integrity

Before hardening content, ensure the spec is structurally sound.

### 1.1 Run the linter

```bash
python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains --strict
```

Fix all errors and warnings. The linter checks:
- Reference resolution (type URIs, port URIs, error URIs)
- Parent-ref violations (child domains referencing ancestor types)
- Mirror consistency (error-port bindings)
- Cycle detection
- Orphaned ports
- Schema validation

### 1.2 Eliminate parent-ref violations

Child subdomains must not reference types/errors owned by ancestor parent domains. For each violation:
1. Move the type definition to the subdomain that semantically owns it
2. Remove the duplicate from the parent
3. Update all references spec-wide

### 1.3 Validate the build order

Regenerate and manually verify. Spot-check that Layer 0 domains truly have no upward dependencies in their types/ports (not just in their domain.yaml declarations).

## Phase 2: Force Implementation Planning

Plan each layer bottom-up, starting from Layer 0.

### 2.1 Split domains into planner groups

For parallel execution, split the layer's domains into 2-4 groups by cluster affinity:
- Identity cluster (establishment, state, key-commitment, anchoring)
- Service cluster (cloud-agent, signify-client)
- Cross-cutting cluster (accountability, integrity, delegation, privacy, credential-lifecycle)

### 2.2 Plan each domain

For each domain, read ALL spec files and produce a full implementation plan per the **[Implementation Plan Template](implementation-plan-template.md)**. The template defines exactly what to cover (sections A through J) and the output format (12 sections per domain). The most important output is section 12: **Open Questions**.

### 2.3 Surface open questions

The critical output is **Open Questions** — everything the planner couldn't resolve from the spec alone:
- Ambiguities (spec readable two ways)
- Missing definitions (type/error/port referenced but not defined)
- Underspecified invariants (too vague to implement)
- Contradictions (types.yaml says X, UL says Y, verification.yaml says Z)
- Missing builders, state machines, error types
- Cross-domain gaps (port contracts that don't quite match)

**Frame questions as domain rules, not implementation mechanics:**
- GOOD: "For a weighted threshold with multiple clauses, does satisfaction require ALL clauses met (AND) or ANY clause (OR)?"
- BAD: "What does Tholder.satisfy() return?"

## Phase 3: Oracle Resolution

Resolve each question through a hierarchy of authoritative sources.

### 3.1 Reframe every question

Before asking any oracle, reframe the planner's question as a domain-level rule:
- What invariant is being tested?
- What protocol constraint is unclear?
- What contract is underspecified?

This prevents implementation details from leaking into the spec.

### 3.2 Oracle priority

1. **Protocol specification** (KERI/CESR/ACDC specs) — authoritative. If the spec is clear, that's the answer.
2. **Reference implementation** (keripy) — confirmatory. Agreement is valuable signal; disagreement surfaces implementation lag or spec interpretation divergence.
3. **Secondary implementations** (keria, signifypy, signify-ts) — additional confirmation for service-specific or edge-client-specific behavior.
4. **DDD design decisions** — for questions the protocol spec doesn't reach (escrow queue names, deployment patterns, adopter-facing vocabulary).

**The spec wins ties.** But always consult implementations because three-way agreement is high-confidence evidence.

### 3.3 Synthesize answers

For each question:
1. What does the spec say? (quote the normative text)
2. What does keripy do? (cite the code)
3. Do they agree? If not, which is correct?
4. What change does this require in the DDD spec?

## Phase 4: Apply Fixes and Verify

### 4.1 Categorize fixes

- **Contradictions** — spec says X, our DDD spec says Y. Fix immediately.
- **Missing types/ports** — planner couldn't find a definition. Add it.
- **Vocabulary corrections** — implementation jargon leaked into DDD naming. Replace with adopter-centric language.
- **Design decisions** — no oracle needed, resolve from DDD principles.

### 4.2 Apply, lint, commit

After each batch of fixes:

```bash
# 1. Validate — target 0 errors, 0 warnings
python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains --strict

# 2. Regenerate context map and build order
python skills/ddd-spec/scripts/generate_context_map.py rdod/spec/domains
python skills/ddd-spec/scripts/build_order.py rdod/spec/domains
```

3. Commit with a descriptive message citing what was fixed and why

### 4.3 Advance to next layer

Once the current layer is clean, move to the next layer in the build order. Each layer builds on the hardened foundation of prior layers.

## Recurring DDD Principles

These principles should be applied throughout hardening, not just in a single pass.

### Linguistic Discovery

DDD is a language game. When you encounter a concept:
1. Describe what it DOES for the adopter in plain verbs and nouns
2. Test the name: "A DelegationEscrowRepo produces... anchors?" If the name doesn't match what it produces, the name is wrong.
3. Try 2-3 framings before committing
4. The right name reveals something about the domain

**Red flags:**
- Using a KERI/keripy term verbatim (anchor, seal, Kevery, Baser)
- The name describes a mechanism, not a job
- You can't explain the name to someone who's never seen KERI

### Service over Repository

When a component has rich behavior (validation, coordination, invariant enforcement), it's a **Service**, not a Repository. Repositories are storage. Services are behavior.

The pattern: **Service wraps Repository.**
- The Service IS the guard (validates, enforces, routes)
- The Repository IS the storage (append-only log + escrow queues)
- The adopter interacts with Services, not Repositories

```
IdentityService.commit(event)       → KelRepository
StatusService.authorize(change)     → TelRepository
DelegationService.approve(request)  → uses IdentityService
VerificationService.verify(cred)    → uses StatusService + IdentityService
```

### CQRS Read Models

When a component has a performance cache derived from the primary data:
- The cache is a **read model** (query-only projection)
- The Service updates it internally as a side effect of commands
- Consumers only read from it
- It can always be reconstructed from the primary source

### Adopter-Centric Vocabulary

Replace protocol jargon with what the adopter actually does:

| Protocol jargon | Adopter verb |
|---|---|
| anchor / seal (as verbs) | **commit** (to identity history) |
| delegator anchors seal | delegator **approves** the delegation |
| KEL anchor for TEL | issuer **authorizes** the credential operation |
| anchor chain | **authorization chain** |
| validate-tel-event | **verify** |

### Externals as Tier:External Domains

Infrastructure concerns (persistence, transport, crypto) should be proper domain directories with `tier: "external"` — not just string URIs. They have their own `domain.yaml`, `ports.yaml`, and `ubiquitous-language.yaml` with formal interfaces.

## Checklist per Layer

- [ ] Linter passes clean (0 errors, 0 warnings)
- [ ] No parent-ref violations
- [ ] Build order validated
- [ ] Implementation planning completed for all domains in the layer
- [ ] Open questions collected and reframed as domain rules
- [ ] Oracle resolution: spec first, keripy confirms, keria confirms
- [ ] Fixes applied, linter re-run, context map regenerated
- [ ] Commit with descriptive message
- [ ] Ready to advance to next layer
