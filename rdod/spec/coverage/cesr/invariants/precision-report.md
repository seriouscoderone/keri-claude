# Precision Report — CESR Specification Invariant Coverage

**Spec:** cesr-specification.md
**Date:** 2026-04-04
**Existing verification entries:** ~105 across 3 files (cesr: 29, composition: 37, primitives: 39)
**Total normative rules reviewed:** ~58 (deduplicated from ~100 MUST statements)
**Total findings:** 22 (12 absent, 10 partial)

## Coverage Summary

| Category | Exact | Partial | Absent | Total |
|----------|-------|---------|--------|-------|
| Core encoding (composability, alignment, stable, mid-pad) | 10 | 4 | 2 | 16 |
| Count codes + stream parsing | 12 | 4 | 4 | 20 |
| SAID + version + code tables | 3 | 5 | 2 | 10 |
| Cross-cutting code table structure | 0 | 0 | 4 | 4 |
| **Total** | **25** | **13** | **12** | **50 unique testable** |

**Plus 8 untestable/process rules** (version increment discipline, design constraints).

**Overall: 25 exact (50%), 13 partial (26%), 12 absent (24%)**

Note: the 6 new cross-cutting findings (CESR-INV-017 through CESR-INV-022) represent
structural patterns across the entire code table — invariants about the table's *design*
rather than individual entries. These are the answer to "can the code table be represented
as invariants?" — not per-row facts, but cross-cutting rules that constrain all rows.

This is dramatically better than the ACDC spec coverage (which was 27% exact before our work). The CESR verification files are comprehensive and precise.

## Precision of Existing Entries

| Precision | Count |
|-----------|-------|
| z3-ready | 7 (24-bit alignment, code-pad-size, selector injective, tritet bijection, code table uniqueness) |
| pbt-ready | 18 |
| vague | 0 |

Zero vague entries — every existing match is test-derivable. The CESR domain has the strongest verification precision in the RDOD.

## Gap Findings (6 absent + 8 partial needing enrichment)

### Absent (new entries needed)

| ID | Line | Gap | Precision | Domain |
|----|------|-----|-----------|--------|
| CESR-INV-001 | 1242 | Non-native serializations MUST be enclosed in CESR group | pbt-ready | cesr/composition |
| CESR-INV-002 | 1852 | Special count codes MUST NOT count quadlets | pbt-ready | cesr/composition |
| CESR-INV-003 | 1870 | Genus/version code structure and round-trip | pbt-ready | cesr/composition |
| CESR-INV-004 | 2682 | v2.XX MUST support v1.XX backward compat | pbt-ready | cesr/composition |
| CESR-INV-005 | 3294 | SAD Path array-context integer constraint | pbt-ready | cesr/composition |
| CESR-INV-006 | 2838 | SAID verification protocol (verify, not just generate) | pbt-ready | cesr/primitives |

### Absent — Cross-cutting code table structure (new)

| ID | Line | Gap | Precision | Domain |
|----|------|-----|-----------|--------|
| CESR-INV-017 | 1489 | Selector-to-table dispatch is a total function over all 64 Base64 chars | z3-ready | cesr |
| CESR-INV-018 | 2140 | All crypto codes maintain ≥128-bit cryptographic strength | pbt-ready | cesr/primitives |
| CESR-INV-019 | 1630 | Variable-size families MUST provide all 3 lead-size variants (ls=0,1,2) | pbt-ready | cesr/primitives |
| CESR-INV-020 | 1822 | Every small count code MUST have a corresponding large count code | pbt-ready | cesr/composition |
| CESR-INV-021 | 2007 | Indexed sig algorithms MUST provide both-same + current-only variants | pbt-ready | cesr/primitives |
| CESR-INV-022 | 1561 | All 1-char codes: hs=1, ss=0, ls=1 (pad size 1) with fs consistency | z3-ready | cesr/primitives |

### Partial (enrichment needed)

| ID | Line | Gap | Domain |
|----|------|-----|--------|
| CESR-INV-007 | 796/809 | Type portion MUST begin framing code (prefix-first assertion) | cesr |
| CESR-INV-008 | 1158 | Type code MUST be independently mod-4 aligned | cesr |
| CESR-INV-009 | 1211 | Empty value: pad size MUST be 0 (boundary case) | cesr |
| CESR-INV-010 | 1275 | Three-format interleaved parser test | cesr/composition |
| CESR-INV-011 | 1294 | JSON/CBOR/MGPK mutual exclusion Z3 proof | cesr/composition |
| CESR-INV-012 | 1394 | Resume-after-nonnative cold-start boundary | cesr/composition |
| CESR-INV-013 | 1513 | First-character exhaustive partition | cesr |
| CESR-INV-014 | 1858 | Universal code cross-genus semantic invariance | cesr/composition |
| CESR-INV-015 | 2253/2475 | Mandatory KERI/ACDC code set enumeration | cesr/primitives + composition |
| CESR-INV-016 | 2551 | v-field-first for CBOR/MGPK (not just JSON) | cesr/composition |

## What's Already Strong

The existing coverage is excellent in these areas:
- **Composability** — 5 invariants including Z3 24-bit proof
- **Self-framing** — stream parsing + concatenation roundtrip
- **Domain transforms** — all 6 transforms tested
- **Code table structure** — Z3 injective selector proof + pad-size arithmetic
- **Mid-padding** — Z3 exhaustive case analysis + PBT position test
- **Count codes** — small/large structure, alignment, value invariance, nesting
- **Cold start** — 8-case tritet bijection (Z3) + dispatch table
- **SAID generation** — dummy replacement, self-referential verify
- **Primitive types** — interface contracts, algorithm-from-code, domain round-trips

## Recommendations

1. **Highest priority:** CESR-INV-001 (non-native enclosure) and CESR-INV-002 (special count codes) — structural gaps affecting stream parser correctness
2. **High priority:** CESR-INV-004 (v1 backward compat) and CESR-INV-006 (SAID verify protocol) — interoperability gaps
3. **Medium priority:** CESR-INV-011 (mutual exclusion Z3) and CESR-INV-015 (code set enumeration) — strengthening existing coverage
4. **Cross-cutting (new):** CESR-INV-017 (selector dispatch totality), CESR-INV-019 (variable triplets), CESR-INV-020 (small/large pairing) — these are the "code table as invariants" findings; they capture structural patterns that hold across ALL table entries
5. **Low priority:** CESR-INV-018 (128-bit minimum), CESR-INV-021 (indexed pairs), CESR-INV-022 (1-char sizage) — strengthen existing coverage; the SecurityLevel invariant already partially covers INV-018
6. **Partial enrichments:** CESR-INV-007 through CESR-INV-016 — refinements to already-good entries
