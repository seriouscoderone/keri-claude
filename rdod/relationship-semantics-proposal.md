# Feature Request: Relationship Intent Markers and Kernel Consumption Semantics

## Summary

The linter correctly enforces bidirectional relationship consistency, but produces false positives when:
1. A domain consumes a kernel/shared-language without the kernel needing to know about consumers
2. A domain is intentionally thin (adapter-only) and has no UL terms by design
3. Service-tier domains consume protocol-tier domains in a one-way dependency

These are not broken relationships — they're legitimate DDD patterns that the template doesn't express yet. The linter needs semantic markers to distinguish "missing back-reference" from "intentionally one-directional."

## Problem 1: Kernel Consumption vs. Adjacent Relationship

### Current behavior

When domain A lists domain B as an `adjacent`, the linter expects B to list A back. But when B is a **kernel** (shared language adopted natively), B should NOT need to know about A. A kernel is consumed unilaterally — it doesn't participate in a bilateral relationship.

### Concrete example from KERI spec

`cesr` is the encoding kernel — every domain uses CESR primitives. Currently:
- `cloud-agent-service`, `local-agent`, `signify-client`, `witness-service`, `watcher-service` all list `cesr` as an adjacent
- `cesr` does NOT list any of them back
- The linter flags **10+ warnings** for this

This is correct DDD. CESR is a shared kernel. It doesn't care who consumes it. The service domains should declare CESR as a **kernel**, not an adjacent:

```yaml
# cloud-agent-service/domain.yaml — CURRENT (triggers warning)
adjacents:
  - ref: "domain://cesr"
    relationship: "Uses CESR encoding for all message serialization"

# cloud-agent-service/domain.yaml — PROPOSED (no warning)
kernels:
  - ref: "kernel://cesr"
    source: "domain://cesr"
    relationship: "CESR encoding adopted natively for all message serialization"
```

### Proposed fix

The `kernels:` section already exists in the template but is underused. Clarify in documentation:

- **`kernels:`** — Unilateral consumption. Consumer adopts the kernel's language natively. Kernel does NOT need to reference consumers. Linter should NOT flag missing back-references for kernel relationships.
- **`adjacents:`** — Bilateral peer relationship. Both sides should reference each other. Linter SHOULD flag missing back-references.
- **`domain_clients:` / `subdomains:`** — Hierarchical. Parent-child back-references are required.

Add a linter rule: if a domain is referenced via `kernels:`, skip bidirectional consistency checks for that domain.

## Problem 2: Protocol-Tier vs. Service-Tier Consumption

### Current behavior

When a service domain (cloud-agent-service, witness-service) lists a protocol domain (keri, acdc, discovery) as an adjacent, the linter expects the protocol domain to list the service back. But in DDD, upstream protocol domains typically don't know about downstream service consumers.

### Concrete example

- `signify-client` lists `keri`, `acdc`, `discovery` as adjacents
- None of those protocol domains list `signify-client` back
- 4 warnings generated

The DDD pattern here is **Conformist** — the service conforms to the protocol, not the other way around. The protocol doesn't know or care which services implement it.

### Proposed fix

Add a `pattern:` field to adjacent relationships that the linter understands:

```yaml
adjacents:
  - ref: "domain://keri"
    relationship: "Conformist — conforms to KERI protocol"
    pattern: "conformist"  # ← linter knows: one-way is OK for conformist
```

Linter rules by pattern:
- **`partnership`** — Both sides MUST reference each other (bidirectional)
- **`conformist`** — Consumer references upstream. Upstream does NOT need to reference consumer. One-way is valid.
- **`customer-supplier`** — Supplier may or may not reference customer. Customer MUST reference supplier.
- **`anticorruption-layer`** — Consumer references upstream through an ACL. Upstream does NOT reference consumer.
- **`published-language`** — Consumer imports terms. Publisher does NOT need to know consumers.

If `pattern:` is absent, default to current behavior (bidirectional check).

## Problem 3: Intentionally Thin Domains

### Current behavior

The linter's `completeness` check warns when a domain has no UL terms. But some domains are intentionally thin — they're adapter layers, API facades, or delegation points with no domain logic of their own.

### Concrete example

- `witness-service/api/`, `watcher-service/api/`, `local-agent/api/` all have 0 UL terms
- The linter flags 3 completeness warnings
- These are intentional — they're HTTP adapter layers that forward to their parent's domain logic

### Proposed fix

Add an `intent:` field to domain.yaml that communicates design intent:

```yaml
# witness-service/api/domain.yaml
intent: "adapter"  # adapter | core | orchestrator | facade

# The linter adjusts expectations based on intent:
# - adapter: no UL terms expected, thin ports OK, no types/errors expected
# - core: full UL, types, errors, verification expected
# - orchestrator: protocols expected, may import all terms
# - facade: thin UL, delegates to subdomains
```

Alternative: a simpler boolean flag:

```yaml
# witness-service/api/domain.yaml
thin: true  # signals: this domain has minimal UL by design
```

## Problem 4: Verification Language False Positives

### Current behavior

The linter flags verification properties containing "MUST" as vague, and flags `@given` property-based tests as "testing attributes." Both are false positives for well-written properties.

### Concrete examples

```yaml
# Flagged as "vague" — but this is actually STRONG:
"Both thresholds MUST be independently satisfied for a valid rotation"

# Flagged as "tests attributes" — but this IS a behavioral test:
"@given(kel=kel_with_traits_strategy()) def test_traits_cumulative..."
```

### Proposed fix

Refine the vague-language detection:

1. **Don't flag "MUST" alone** — flag "MUST" only when combined with vague qualifiers: "MUST be properly", "MUST be correctly", "MUST be valid" (without adjacent definition of valid). "MUST be rejected", "MUST satisfy", "MUST equal" are strong.

2. **Don't flag `@given` tests as "attribute tests"** — the `@given` decorator indicates property-based testing (Hypothesis framework), which IS behavioral testing. Only flag `hasattr`, `isinstance`, `type()` as attribute tests.

3. **Respect the `language:` field** — if `language: pseudocode`, don't apply Python-specific rules. If `language: python`, Python patterns like `@given` are expected.

## Acceptance Criteria

- [ ] Template documentation clarifies kernel vs. adjacent vs. conformist consumption patterns
- [ ] `pattern:` field added to adjacent relationship schema (partnership, conformist, customer-supplier, anticorruption-layer, published-language)
- [ ] Linter skips bidirectional checks for kernel references
- [ ] Linter respects `pattern:` field on adjacents (conformist = one-way OK)
- [ ] `intent:` or `thin:` field added to domain.yaml schema
- [ ] Linter adjusts completeness expectations based on domain intent
- [ ] Vague-language regex refined: "MUST be rejected" is not vague, "MUST be properly handled" IS vague
- [ ] `@given` not flagged as attribute testing
- [ ] Linter respects `language:` field in verification formal expressions

## References

- KERI spec validation: 100+ false positive warnings from legitimate one-way consumption patterns
- DDD patterns: Evans (2003) Chapter 14 — Conformist, Anticorruption Layer, Published Language
- CESR as kernel: consumed by 10+ domains, none of which should trigger back-reference warnings
- Thin API subdomains: intentional adapter layers flagged as "incomplete"
