# Spec-UL Coverage Templates

## Artifact File Formats

### structure.yaml

```yaml
spec: keri-specification          # derived from filename
spec_path: scripts/markdown/keri-specification.md
rdod_path: rdod/spec/domains/
generated: 2026-04-03

zoom_levels:
  Z0:
    count: 1
    headings:
      - { heading: "Key Event Receipt Infrastructure (KERI)", line: 1 }
  Z1:
    count: 9
    headings:
      - { heading: "Introduction", line: 42 }
      - { heading: "KERI foundational overview", line: 130 }
      # ...
  Z2:
    count: 35
    headings:
      - { heading: "Infrastructure and ecosystem overview", line: 135 }
      # ...
  Z3:
    count: 104
    headings:
      - { heading: "Controller Application", line: 200 }
      # ...
  Z4:
    count: 50
    headings:
      - { heading: "Version string field", line: 500 }
      # ...

# Domain mapping — which RDOD domains cover which spec sections
domain_map:
  - spec_sections: ["Introduction", "KERI foundational overview"]
    rdod_domains: ["identity", "accountability"]
  - spec_sections: ["KERI data structures and labels"]
    rdod_domains: ["cesr", "keri-messaging"]
  - spec_sections: ["KERI key management"]
    rdod_domains: ["identity/establishment", "identity/key-commitment", "delegation"]
  # Fill during Phase 1
```

### z1-capabilities.md (example)

```markdown
# Z1 — Capabilities: KERI Specification

## §2 Introduction
**Spec summary:** KERI provides decentralized key management using hash-chained event logs.

**UL sentences:**
1. "KERI enables an adopter to **establish** cryptographic control over an **Identifier** by creating an **InceptionEvent** that commits to initial **signing keys** and **pre-rotated next-key digests**, without relying on any external authority."

**Score:** fluent
**Notes:** All terms exist in identity UL. "establish" maps to InceptionEvent naturally.

---

## §5 KERI foundational overview
**Spec summary:** Covers SCIDs, pre-rotation, witness model, duplicity detection.

**UL sentences:**
1. "An adopter manages **Identifiers** through the **IdentityService**, which enforces the **Key Event Log** as an append-only record of **Establishment Events** (inception, rotation) and **Non-Establishment Events** (interactions)."
2. "The **AccountabilityService** ensures agreement among **Witnesses** through **KAWA consensus**, while the **IntegrityService** detects and records **Duplicity** when a controller equivocates."

**Score:** fluent (sentence 1), awkward (sentence 2)
**Finding:** KERI-Z1-002 — "IntegrityService" doesn't appear in the UL. The integrity domain has detection/evidence/recovery subdomains but no named service.

---
```

### findings.yaml

```yaml
spec: keri-specification
generated: 2026-04-03
version: 1  # increments as findings are revised across zoom passes

findings:
  - id: KERI-Z1-002
    zoom: Z1
    spec_section: "§5 KERI foundational overview"
    spec_line: 130
    score: awkward

    # --- Routing (added in Phase 2.5) ---
    route: ul_term          # ul_term | types | verification | errors | import
    route_domain: integrity # which domain's file this belongs in
    route_reason: "Adopter needs to name the service that detects duplicity"
    collapse_from: []       # list of finding IDs that collapse into this one

    attempted_sentence: >
      The IntegrityService detects and records Duplicity when
      a controller equivocates.

    problem: >
      "IntegrityService" is implied by the integrity domain structure
      (detection, evidence, recovery subdomains) but never named as
      a term. The sentence needs a service name to be fluent.

    proposed_fix:
      domain: integrity
      file: ubiquitous-language.yaml
      action: add_term
      term: IntegrityService
      definition: >
        The service responsible for detecting duplicitous behavior,
        collecting forensic evidence, and coordinating recovery.
        Wraps detection, evidence collection, and recovery as a
        unified adopter-facing capability.
      invariants:
        - "Must never block event processing — detection is asynchronous"
        - "Evidence is append-only (Duplicitous Event Log)"

    alternatives_considered:
      - name: DuplicityService
        rejected_because: >
          "Duplicity" is the problem being detected, not the service's
          job. The service provides "integrity assurance," not "duplicity."
      - name: FraudDetectionService
        rejected_because: >
          "Fraud" implies intent. Duplicity in KERI is a structural
          property (two conflicting events), not a judgment of intent.

    simplifies:
      - "Gives Z2 workflow sentences a concrete actor for integrity checks"
      - "Parallels IdentityService, AccountabilityService naming pattern"

    depends_on: []  # other finding IDs this interacts with

    revisions: []
    # After Z3 pass, might add:
    # - { zoom: Z3, note: "Confirmed — Z3 guard conditions reference this service naturally" }
```

### impact-report.md (example structure)

```markdown
# Impact Report: KERI Specification Coverage

## Summary
- **Total headings analyzed:** 199
- **Fluent:** 142 (71%)
- **Awkward:** 31 (16%)
- **Gap:** 18 (9%)
- **Discovery:** 6 (3%)
- **Collapse:** 2 (1%)

## Discoveries (highest value)

### DISC-001: IntegrityService
**Impact:** Simplifies 8 sentences across Z1-Z3. Completes the Service naming pattern.
**Domains affected:** integrity, integrity/detection, integrity/evidence

### DISC-002: ...

## Gaps by Domain

| Domain | Gaps | Awkward | Action Items |
|--------|------|---------|--------------|
| identity | 2 | 5 | Add 2 terms, refine 3 definitions |
| accountability | 1 | 3 | Add witness pool management term |
| ...

## Cross-Spec Conflicts
(filled during Phase 4 consolidation)

## Remaining Uncoverable
- Cryptographic algorithm internals (externals domain scope)
- IETF boilerplate sections (not domain content)
```

### application-plan.yaml

```yaml
spec: keri-specification
approved_by: human
approved_date: 2026-04-03

changes:
  - finding_id: KERI-Z1-002
    domain: integrity
    file: ubiquitous-language.yaml
    action: add_term
    accepted: true
    notes: "Approved as-is"

  - finding_id: KERI-Z2-014
    domain: accountability/dissemination
    file: ubiquitous-language.yaml
    action: add_term
    accepted: true
    notes: "Renamed from SubmissionDissemination to EventSubmission per review"

  - finding_id: KERI-Z3-041
    domain: identity/thresholds
    file: ubiquitous-language.yaml
    action: modify_term
    accepted: false
    notes: "Existing definition is correct — the awkwardness is in the spec, not the UL"

apply_order:
  # Ordered by domain dependency (Layer 0 first)
  - { domain: cesr/primitives, findings: [KERI-Z4-088, KERI-Z4-091] }
  - { domain: identity, findings: [KERI-Z2-007] }
  - { domain: integrity, findings: [KERI-Z1-002, KERI-Z3-041] }
  - { domain: accountability/dissemination, findings: [KERI-Z2-014] }
```

---

## Sentence Categories by Zoom Level

### Z0 — Mission (1 sentence per spec)

**Pattern:** "[Spec] enables an adopter to [core capability] by [mechanism], providing [value proposition]."

**What you're testing:** Does the UL have terms for the spec's reason for existence?

**Example attempts:**

Fluent:
> "KERI enables an adopter to **establish** and **rotate** cryptographic control over **Identifiers** through **self-certifying** event logs, providing security equivalent to a blockchain without requiring global consensus."

Gap:
> "CESR enables an adopter to... encode cryptographic primitives?" — What's the adopter-facing verb? "Encode" is mechanism. What does the adopter GET from CESR? Interoperability? Composability? The UL should name this value.

### Z1 — Capabilities (1-2 sentences per H2 section)

**Patterns:**
- "An adopter can [verb] a [noun] using the [Service]."
- "The [domain] provides [capability] by [how]."
- "[Domain] handles [scope]. It does NOT handle [boundary]."

**What you're testing:** Does each RDOD domain map to a clear adopter capability? Are the Service names right?

**Red flags:**
- You need to name a Service that doesn't exist in the UL
- You describe a capability that spans two domains awkwardly
- The domain name doesn't match the capability verb

### Z2 — Workflows (paragraph per H3 section)

**Patterns:**
- "To [achieve goal], the [actor] [verbs] the [noun] through the [Service], which [validates/coordinates/commits]. This emits a [DomainEvent], causing the [other Service] to [react]."
- "The [Service] orchestrates [workflow] by: (1) [step using UL verb], (2) [step], (3) [step]. If [guard condition], the event enters [EscrowType] until [resolution]."

**What you're testing:** Do the UL terms compose into coherent process narratives? Can you trace an event through multiple services using only UL terms?

**Red flags:**
- You need a verb that doesn't exist ("the controller... submits? pushes? sends?")
- The workflow crosses domain boundaries and the handoff feels unnamed
- Escrow behavior needs to be described but the specific escrow type isn't in the UL

### Z3 — Rules (precise statements per H4 section)

**Patterns:**
- "A [Event/Type] is valid only if: (a) [invariant], (b) [invariant], (c) [invariant]."
- "When [trigger], [Type] transitions from [StateA] to [StateB]. The [Service] enforces [guard]."
- "The [Service] rejects [Event] with [ErrorType] when [condition]."
- "[Type] has exactly [N] [component]. Each [component] must satisfy [constraint]."

**What you're testing:** Does the UL have precise enough terms for every invariant, state, guard condition, and error? Can you state a rule without falling back to spec jargon?

**Red flags:**
- You need to reference a field by its terse KERI name (`kt`, `nt`, `bt`) because no UL term exists
- A validation rule mentions a concept that's implicit in the spec but not named in the UL
- The error type for a specific failure isn't defined
- You say "the threshold" but actually there are two kinds (signing, rotation) and the UL doesn't distinguish

### Z4 — Mechanics (field-level per H5-H6 section)

**Patterns:**
- "The [field] encodes a [UL Type] as [CESR encoding]. The [Builder] accepts [parameter name] and serializes it as [wire format]."
- "In the [MessageType], [field] contains [UL concept]. It MUST be [constraint]. It is qualified with code [CodeType]."
- "[Primitive] is a [CESR domain] value of [size] bytes, qualified by [code table entry]. The [Agent class] wraps it with [behavior]."

**What you're testing:** Does every wire-format field have an adopter-facing name? Are Builders defined for complex structures? Do CESR primitive types map cleanly to UL terms?

**Red flags:**
- You're forced to use the terse field name because no UL name exists
- A Builder should exist but doesn't (3+ fields, encoding rules)
- The CESR code table entry is referenced but the UL doesn't name the concept it encodes
- A field appears in multiple message types with slightly different semantics — the UL should name the distinction

---

## Revision Tracking in Findings

When a later zoom pass revises an earlier finding, add a revision entry:

```yaml
revisions:
  - zoom: Z3
    date: 2026-04-03
    note: >
      Originally proposed "IntegrityService" at Z1. At Z3, discovered
      the service needs distinct "detect" and "adjudicate" operations.
      Updated definition to include both. Term name still works.
  - zoom: Z4
    date: 2026-04-03
    note: >
      At Z4, field-level analysis shows the Duplicitous Event Log (DEL)
      needs its own Builder. Added as dependent finding KERI-Z4-077.
```

This creates a traceable record of how understanding evolved across zoom levels.
