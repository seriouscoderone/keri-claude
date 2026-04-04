# Precision Report — CESR Specification Invariant Coverage

**Spec:** cesr-specification.md
**Date:** 2026-04-03
**Existing verification entries:** ~105 across 3 files (cesr: 29, composition: 37, primitives: 39)
**Total normative rules reviewed:** ~52 (deduplicated from ~100 MUST statements)

## Coverage Summary

| Category | Exact | Partial | Absent | Total |
|----------|-------|---------|--------|-------|
| Core encoding (composability, alignment, stable, mid-pad) | 10 | 4 | 1 | 15 |
| Count codes + stream parsing | 12 | 4 | 3 | 19 |
| SAID + version + code tables | 3 | 5 | 2 | 10 |
| **Total** | **25** | **13** | **6** | **44 unique testable** |

**Plus 8 untestable/process rules** (version increment discipline, design constraints).

**Overall: 25 exact (57%), 13 partial (30%), 6 absent (13%)**

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
4. **Low priority:** Partial enrichments (CESR-INV-007 through CESR-INV-016) — refinements to already-good entries
