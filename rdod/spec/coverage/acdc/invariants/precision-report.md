# Precision Report — ACDC Specification Invariant Coverage

**Spec:** acdc-specification.md (8,891 lines)
**Date:** 2026-04-03
**Total normative rules extracted:** ~158 (deduplicated across 3 analysis passes)

## Coverage Summary

| Domain | Exact | Partial | Absent | Total |
|--------|-------|---------|--------|-------|
| credential-lifecycle | 10 | 4 | 55 | 69 |
| privacy | 7 | 2 | 3 | 12 |
| privacy/disclosure | 1 | 9 | 0 | 10 |
| privacy/aggregation | 2 | 2 | 0 | 4 |
| privacy/blinding | 10 | 0 | 10 | 20 |
| credential-exchange/proof | 2 | 1 | 0 | 3 |
| **Total** | **32** | **18** | **68** | **~118 unique** |

**Overall: 32 exact (27%), 18 partial (15%), 68 absent (58%)**

## Precision of Existing Entries

| Precision | Exact Match Count |
|-----------|-------------------|
| z3-ready | 16 |
| pbt-ready | 14 |
| vague | 2 |

Existing entries are strong — 30 of 32 exact matches are z3-ready or pbt-ready. The verification.yaml files that exist are precise; the problem is coverage gaps, not precision gaps.

## Gap Clusters (68 absent rules)

### Cluster 1: ACDC Structural Invariants (19 rules)
**Domain:** credential-lifecycle
**Status:** Entirely missing

- Field ordering: top-level `[v, t, d, u, i, rd, s, a, A, e, r]`
- Required fields: `[v, d, i, s]`
- Insertion-ordered field maps
- Version string format: protocol=ACDC, version encoding, CESR genus
- Version 1.x backward compatibility
- Message type `t` field presence rules
- SAID field value constraints (d, rd must be SAIDs)
- AID field value constraints (i must be AID)
- Datetime `dt` field format (ISO-8601 + RFC-3339)
- Compact label length (1-2 characters)

**Proposed fix:** Add a single consolidated `acdc-structure` invariant group to credential-lifecycle/verification.yaml.

### Cluster 2: Schema Invariants (15 rules)
**Domain:** credential-lifecycle
**Status:** Entirely missing

- Type-is-schema: `$id` = SAID of schema; ACDC `s` = schema `$id`
- Static schema: all schemas must be SADs; no dynamic refs
- `$id` must be bare SAID at top level
- Schema dialect = JSON Schema 2020-12
- Schema `version` field: semantic version string
- Backward-incompatible schema = higher major version
- Subschema `$id` must include verifiable SAID
- Schema-against-ACDC validation (sections validate against composed schema)

**Proposed fix:** Add an `acdc-schema` invariant group to credential-lifecycle/verification.yaml.

### Cluster 3: Edge Section Structural Rules (22 rules)
**Domain:** credential-lifecycle
**Status:** Entirely missing

- Edge MUST have `n` field; Edge-group MUST NOT
- Field ordering: Edge `[d,u,n,s,o,w]`; Edge-group `[d,u,o,w]`
- SAID `d` field must be first when present; value = said_compute(block)
- UUID `u` field must be second; >= 128 bits entropy
- Top-level Edge-group MUST NOT have `w` field
- Default operator: AND for Edge-group, I2I/NI2I for Edge
- Labeled nested fields after reserved fields; locally unique; no `type` field
- Far-node SAID validation: n field == said_compute(far_node)
- Far-node schema validation (own schema + edge `s` field)
- Edge operators: I2I (issuer=issuee), NI2I, DI2I semantics

**Proposed fix:** Add `edge-validation` and `edge-structure` invariant groups.

### Cluster 4: Rule Section Structural Rules (8 rules)
**Domain:** credential-lifecycle
**Status:** Entirely missing

- Rule MUST have `l` field; MUST NOT have other fields (beyond d, u, l)
- Field ordering: Rule-group `[d,u,l]` then labeled nested fields
- SAID `d` must be first; value = said_compute(block)
- Labeled nested Rule/Rule-group: locally unique, no `type` field

**Proposed fix:** Add `rule-structure` invariant group.

### Cluster 5: TEL Event Field Ordering (4 rules)
**Domain:** credential-lifecycle
**Status:** Missing (semantics covered, structure not)

- rip: `[v, t, d, u, i, n, dt]`
- bup: `[v, t, d, rd, n, p, dt, b]`
- upd: `[v, t, d, rd, n, p, dt, ta, ts]`
- Version string protocol = ACDC

**Proposed fix:** Add `tel-event-structure` invariant group alongside existing semantic invariants.

### Cluster 6: CESR Codec Constraints (10 rules)
**Domain:** privacy/blinding + credential-lifecycle
**Status:** Missing

- Count codes: `-a##` for BlindedStateQuadruples, `-b##` for BoundStateSextuples
- Count codes: `-G##`/`-F##` for ACDC field maps/fixed fields
- Empty primitive encoding: `1AAP` for placeholders (td, ts, bn, bd)
- CESR-encoded non-negative integer for bn field
- CESR native message format field ordering

**Proposed fix:** Add CESR format invariants to credential-lifecycle and privacy/blinding.

### Cluster 7: Bound Blinded Attribute Block (4 rules)
**Domain:** privacy/blinding
**Status:** Missing

- bn = Issuee KEL sequence number at bup publication time
- bd = Issuee KEL event SAID at bup publication time
- Placeholder encoding for bn and bd
- CESR count code for bound blocks

**Proposed fix:** Add `bound-block-validation` invariants to privacy/blinding/verification.yaml.

### Cluster 8: Disclosure Protocol Rules (3 rules)
**Domain:** privacy
**Status:** Missing or vague

- Chain-link confidentiality propagation through Discloser chains
- Contingent Disclosure obligation on contingency satisfaction
- Bulk issuance aggregate B sealing requirement

**Proposed fix:** Enrich existing privacy/verification.yaml entries.

## Partial Matches (18 rules)

Most partial matches share one pattern: the **generic** invariant exists (e.g., "oneOf must have compact+expanded variants") but is not **scoped** to the specific section (Edge, Rule, Attribute). These are structural generics that need parameterization, not new entries.

**Fix pattern:** Add section-specific instantiations referencing the generic invariant, or parameterize the generic invariant with section labels.

## Recommendations

### Priority 1: Structural invariants (Clusters 1-4)
These are the most impactful gaps. ACDC structure, schema, edge, and rule validation rules form the foundation — everything else builds on them. ~64 rules, all pbt-ready or z3-ready.

### Priority 2: Edge operator semantics (Cluster 3 subset)
I2I, NI2I, DI2I operator validation is critical for CredentialGraph integrity. 6 z3-ready rules.

### Priority 3: TEL event structure (Cluster 5)
Event semantics are well-covered; field structure is not. 4 pbt-ready rules.

### Priority 4: CESR codec constraints (Cluster 6)
Low-level but important for interoperability. 10 rules, mostly pbt-ready.

### Priority 5: Bound block and disclosure protocol (Clusters 7-8)
7 rules, mix of pbt-ready and temporal/behavioral.

## What's Already Strong

- **TEL semantics:** Hash-chaining, sequence numbers, sealing, mode enforcement — all z3/pbt-ready
- **Privacy classification:** Trichotomy, a/A mutual exclusion, metadata SAID differentiation — all z3-ready
- **Shielding mechanics:** BLID computation, salt entropy, UUID derivation, decorrelation — all z3/pbt-ready
- **AGID/Inclusion proof:** Computation, verification, oneOf ordering — all z3/pbt-ready
- **Disclosure modes:** Compact/partial/full, monotonicity, chain-link gating — all pbt-ready
- **IPEX proof:** PoI/PoD, issuer commitment, KRAM authentication — pbt-ready
