# Precision Report — KERI Specification Invariant Coverage

**Spec:** keri-specification.md (7,226 lines)
**Date:** 2026-04-03
**Existing verification entries:** ~263 across 47 files
**Total normative rules reviewed:** ~209 (deduplicated from 214 MUST/SHALL lines)

## Coverage Summary by Section

| Section | Rules | Exact | Partial | Absent | Coverage |
|---------|-------|-------|---------|--------|----------|
| Data Structures + Messages (L1217-2900) | 97 | 34 | 28 | 35 | 64% |
| Key State + Rotation + Delegation (L2900-4200) | 59 | 43 | 8 | 8 | 87% |
| Validation + KAWA + CESR Encoding (L4200-5960) | 37 | 9 | 11 | 17 | 54% |
| OOBI + BADA (L5960-7072) | 16 | 4 | 3 | 9 | 44% |
| **Total** | **209** | **90** | **50** | **69** | **67%** |

**Overall: 90 exact (43%), 50 partial (24%), 69 absent (33%)**

## Precision of Existing Entries

The 263 existing verification entries are high quality:
- **Key state / rotation / delegation** domains: 87% coverage with Z3 proofs for threshold arithmetic, superseding recovery cascade, immune constraint
- **KAWA / accountability**: Strong Z3 proofs for immune threshold, first-seen, round-robin bounds
- **keri-messaging**: Only KRAM/SKRAP authentication — zero message structure invariants

## Gap Clusters (69 absent rules)

### Cluster A: Message Structure (35 rules) — keri-messaging
**Priority: Critical**

The largest gap. Covers 12 KERI message types with zero field-ordering invariants:
- Key event bodies: icp `[v,t,d,i,s,kt,k,nt,n,bt,b,c,a]`, rot `[v,t,d,i,s,p,kt,k,nt,n,bt,br,ba,c,a]`, ixn `[v,t,d,i,s,p,a]`, dip (like icp + di), drt (like rot + di)
- Receipt: rct `[v,t,d,i,s]` — note d=SAID of receipted event, not receipt itself
- Routed messages: qry, rpy, pro, bar, xip, exn — each with distinct required field orders
- Version string: protocol=KERI, v1 backward compat
- No-extra-fields constraint per message type
- Attachments via CESR codes only
- Config trait enforcement: EO drops ixn events, DND drops delegated events
- Registrar Backer seal co-occurrence with RB trait
- Exchange transaction p/x field semantics

### Cluster B: Verifier/Validator Role Separation (8 rules) — accountability + identity
**Priority: High**

The spec distinguishes verifier, validator, controller, witness, delegator roles with different acceptance rules. No invariant models:
- Verifier MUST establish key state at issuance time before signature verification
- Validator MUST first act as verifier before applying additional criteria
- Controller MUST accept its own events (self-validation)
- Remote event assumption (potentially malicious source)

### Cluster C: CESR Native Encoding (5 rules) — keri-messaging
**Priority: High**

Native CESR format rules for KERI messages have zero coverage:
- Version field encodes protocol+version+genus only (not size/kind)
- Protocol type MUST be KERI (4 chars)
- DateTime CESR encoding (ISO-8601)
- Route binary-to-Base64 conversion
- Strict field ordering per message type in CESR native

### Cluster D: OOBI/BADA/RUN (9 rules) — discovery
**Priority: Medium-High**

- RUN no-delete policy: destination peer MUST NOT delete latest records
- OOBI trust model covered; operational rules (witness hosts, WID in KEL) not
- JIT/NTK pre-verification: data MUST be verified before exchange
- Digest/signature retention for replay detection
- Ephemeral AID branch of BADA signed update rule

### Cluster E: Rotation Edge Cases (8 rules) — identity + delegation
**Priority: Medium**

- SQAR zero-weight keys in current signing list
- Joint dual-satisfiability of current list w.r.t. both thresholds
- Witness non-transferable AID enforcement
- Non-indexed signature CESR group code requirement
- Reserve key re-inclusion across multiple rotation events
- Permuted key ordering in dual-threshold check
- Delegatee AID derivation: di field change MUST change AID
- Delegator auto-approval threshold guard

### Cluster F: Cryptographic / Security (4 rules) — cross-cutting
**Priority: Medium**

- 128-bit minimum for all KERI cryptographic operations
- Controller MUST be able to reproduce/recover private keys
- Sequence number maximum value (2^128 - 1)
- ISO-8601 datetime format enforcement

## What's Already Strong

| Domain | Coverage | Highlights |
|--------|----------|-----------|
| identity/thresholds | ~90% | Z3 proofs for simple, weighted, fractional thresholds |
| identity/key-commitment | ~85% | Pre-rotation digest verification, one-time use, unblinding |
| identity/establishment | ~80% | Event validation pipeline, field ordering for icp/rot/ixn, escrow routing |
| identity/state | ~85% | State machine, atomic update, hash chain, first-seen |
| delegation | ~80% | Two-way binding, PDE escrow, DND trait, chain recursion |
| integrity/recovery | ~75% | Superseding rules A0/A1/A2/B1-B3/C cascade |
| accountability/consensus | ~85% | Immune threshold Z3, first-seen, TOAD bounds |
| accountability/dissemination | ~80% | Round-robin 2N bound, gossip N·log(N), direct/indirect modes |
| discovery | ~44% | OOBI trust model and BADA ordering strong; operational gaps |
| keri-messaging | ~15% | Only KRAM/SKRAP; zero message structure |

## Comparison Across All Three Specs

| Spec | Rules | Pre-Analysis Coverage | Post-Application Target |
|------|-------|----------------------|-------------------------|
| CESR | 52 | 87% | ~97% |
| ACDC | 118 | 27% → 85% (applied) | ~85% |
| **KERI** | **209** | **67%** | **~90% (if applied)** |

The KERI spec has the most rules but also the most existing verification entries (263). The gap is concentrated in message structure (keri-messaging domain) and role-based validation logic.
