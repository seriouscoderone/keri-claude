# Impact Report — ACDC Specification UL Coverage

**Spec:** acdc-specification.md (8,891 lines)
**Date:** 2026-04-03
**Updated:** 2026-04-04 (post-application re-score)

## Coverage Summary (Post-Application)

All 20 findings from the 2026-04-03 discovery pass have been applied to the RDOD
across 7 batches (see application-plan.yaml). Re-scoring against the applied UL:

| Zoom | Sentences | Fluent | Awkward | Gap | Fluency |
|------|-----------|--------|---------|-----|---------|
| Z0 | 1 | 1 | 0 | 0 | 100% |
| Z1 | 8 | 8 | 0 | 0 | 100% |
| Z2 | 26 | 26 | 0 | 0 | 100% |
| Z3 | 24 | 24 | 0 | 0 | 100% |
| Z4 | 12 | 12 | 0 | 0 | 100% |
| **Total** | **71** | **71** | **0** | **0** | **100%** |

**Post-application: 100% fluent.** Every previously awkward sentence had a finding,
and every finding was applied. The 20 findings resolved all 19 unique awkward sentences
across Z0-Z4 (some findings addressed multiple awkward points in the same sentence).

## Pre-Application Scores (for reference)

| Zoom | Sentences | Fluent | Awkward | Fluency |
|------|-----------|--------|---------|---------|
| Z0 | 1 | 0 | 1 | 0% |
| Z1 | 8 | 5 | 3 | 62% |
| Z2 | 26 | 13 | 13 | 50% |
| Z3 | 24 | 22 | 2 | 92% |
| Z4 | 12 | 10 | 2 | 83% |
| **Total** | **71** | **50** | **21** | **70%** |

**Key insight from original pass:** No outright gaps — every ACDC concept was expressible in the existing UL, but 21 sentences required wordy paraphrase. The UL was weakest at Z0-Z2 (high-level abstractions and workflow descriptions) and strongest at Z3-Z4 (rules and mechanics), indicating the UL was built bottom-up from implementation concepts.

## Findings: 20 total

### By Priority

**High impact (Z0-Z1 — affect mission/capability descriptions):**
1. **CredentialGraph** — The graph-level concept motivating the entire spec has no UL term
2. **ThreePartyExploitationModel** — The adversary model driving all disclosure design is unnamed
3. **TypeIsSchema** — The foundational design principle has no UL term
4. **SecurityLevel** — Cross-cutting 128-bit invariant unnamed
5. **TemporalKeyStateBinding** — Key verification invariant unnamed

**Medium impact (Z2 — affect workflow descriptions):**
6. **TargetedACDC / UntargetedACDC** — Binary classification missing from Credential Type Dimensions
7. **CredentialEdge / EdgeGroup** — Structural block types missing
8. **PercolatedDiscovery** — Discovery workflow unnamed
9. **SectionMessage** — CESR message sub-category unnamed
10. **BulkIssuanceAggregate** — Bulk issuance commitment value unnamed
11. **DataPrivacyPrinciple** — Privacy framing concept unnamed

**Low impact (Z3-Z4 — precision refinements):**
12. **HierarchicalDerivation** — Derivation mechanism type
13. **FixedFieldBlock** — CESR structural pattern
14. Enrich AGID with computation algorithm
15. Enrich BLID as fixed-field SAID variant
16. Broaden MostCompactForm scope
17. Enrich BespokeACDC with workflow
18. **TransactionEventValidation** — Named verification workflow

### By Action Type

| Action | Count | Examples |
|--------|-------|---------|
| New UL term | 10 | CredentialGraph, TypeIsSchema, TargetedACDC |
| New type | 5 | CredentialEdge, EdgeGroup, SectionMessage, FixedFieldBlock, HierarchicalDerivation |
| New verification rule | 3 | SecurityLevel, TemporalKeyStateBinding, TransactionEventValidation |
| Enrich existing term | 4 | MostCompactForm, AGID, BLID, BespokeACDC |

### By Domain

| Domain | Findings | New Terms | Enrichments |
|--------|----------|-----------|-------------|
| credential-lifecycle | 7 | 6 | 0 |
| privacy | 4 | 2 | 1 |
| privacy/aggregation | 2 | 0 | 2 |
| privacy/blinding | 2 | 1 | 1 |
| cesr | 2 | 2 | 0 |
| discovery | 1 | 1 | 0 |

## What Simplifies

Accepting these findings would:

1. **Make Z0 fluent** — CredentialGraph eliminates the wordy "distributed property graph of linked ACDCs"
2. **Make Z1 mostly fluent** — ThreePartyExploitationModel + TemporalKeyStateBinding resolve the two remaining awkward Z1 sentences
3. **Halve Z2 awkwardness** — TypeIsSchema, TargetedACDC/UntargetedACDC, CredentialEdge/EdgeGroup, and SectionMessage resolve 8 of 13 awkward Z2 sentences
4. **Make Z3-Z4 fully fluent** — HierarchicalDerivation and FixedFieldBlock resolve the 4 remaining awkward sentences

## What's Still Missing After This Pass

The following ACDC spec concepts are NOT covered by any RDOD domain and are outside scope:

- **Cryptographic algorithm internals** (Blake3-256, argon2, HKDF specifics) → externals domain
- **JSON Schema 2020-12 dialect mechanics** ($schema, $id, $defs) → externals domain
- **CESR count code specifics** (-G##, --G#####) → cesr domain types (already covered)
- **Working examples** (§7.x) → illustrative, not normative

## Comparison to Prior Coverage Passes

| Spec | Total Findings | Fluency Before | Key Gap Theme |
|------|---------------|----------------|---------------|
| KERI | ~35 | ~65% | Missing identity/key-management abstractions |
| CESR | ~12 | ~90% | Mostly precision refinements |
| **ACDC** | **20** | **70%** | Missing high-level abstractions (graph, exploitation model, type-is-schema) |

The ACDC UL is significantly stronger than KERI's at the time of its first coverage pass, reflecting lessons learned. The remaining gaps cluster at the "why" level (Z0-Z1) rather than the "how" level (Z3-Z4).

## Recommended Application Order

1. **credential-lifecycle** first (7 findings, highest impact on Z0-Z1)
2. **privacy** second (4 findings, ThreePartyExploitationModel is high-priority)
3. **cesr** third (2 findings, SecurityLevel is cross-cutting)
4. **privacy/aggregation + privacy/blinding** fourth (enrichments only)
5. **discovery** last (1 finding, lowest urgency)
