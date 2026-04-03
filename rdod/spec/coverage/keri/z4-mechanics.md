# Z4 — Mechanics: KERI Specification

50 H5 sections (no H6 in KERI spec). These cover field definitions, CESR encoding rules, and native message formats. Grouped into three clusters: field semantics, CESR encodings, and native message bodies.

At Z4, the domain boundary shifts. Most content is cesr domain territory, not identity. The adopter at this level is a **developer building KERI protocol handlers** — technical language is appropriate.

---

## Cluster 1: Field Semantics (§6.1.1–6.1.3)

### Field Label → UL/Type Mapping

The spec defines 17 terse field labels. Test: does each have a domain-language name?

| Field | Spec Name | UL/Type Term | Domain | Status |
|-------|-----------|-------------|--------|--------|
| `v` | Version String | **Version String** | cesr | fluent |
| `t` | Message Type | **KERI Message Types** | keri-messaging | fluent |
| `d` | Digest SAID | **SAID** | identity | fluent |
| `i` | Identifier Prefix | **AID** | identity | fluent |
| `s` | Sequence Number | **First-Seen Number** (related but distinct) | identity | awkward — see below |
| `p` | Prior SAID | ~Prior Event Digest~ | identity | gap |
| `kt` | Keys Signing Threshold | **Signing Threshold** | identity/thresholds | fluent |
| `k` | Signing Key List | `SigningKeyList` | identity/types | exists as type |
| `nt` | Next Key Digest Threshold | **Rotation Threshold** | identity/thresholds | fluent |
| `n` | Next Key Digest List | `NextKeyDigestList` | identity/key-commitment/types | maps to `ForwardBlindedCommitment` |
| `bt` | Backer Threshold | **TOAD** / **Witness Threshold** | accountability | fluent |
| `b` | Backer List | **Witness List** | identity/thresholds | fluent |
| `br` | Backer Remove List | ~WitnessRemoveList~ | identity/types | gap |
| `ba` | Backer Add List | ~WitnessAddList~ | identity/types | gap |
| `c` | Configuration Traits | **Identifier Operational Constraints** | identity | fluent |
| `a` | Seal/Anchor List | maps to seal taxonomy (Z1-006) | identity/anchoring | type |
| `di` | Delegator AID | Delegator **AID** | delegation | fluent |

**Score summary:** 10 fluent, 2 type-covered, 1 awkward, 4 gaps.

**Finding: KERI-Z4-001** — Three field-level gaps:
- `s` (Sequence Number): The UL has **First-Seen Number** (`fn`) but NOT "Sequence Number" (`sn`) as a distinct term. These are different — `sn` is the event's position in the KEL, `fn` is the order it was first seen. The spec explicitly distinguishes them.
- `p` (Prior Event SAID): The backward-chaining digest linking each event to its predecessor. No UL term.
- `br`/`ba` (Backer Remove/Add): Lists used in rotation events to modify the witness pool. No types.

→ Route: `identity/types.yaml` for SequenceNumber, PriorEventDigest; `identity/thresholds/types.yaml` for WitnessRemoveList, WitnessAddList.

---

### Configuration Traits (§6.1.3.10)

> "Each trait is a string representing a configuration constraint: `EO` (**Establishment-Only**), `DND` (**Do-Not-Delegate**), `DID` (**Delegate-Is-Delegator**), `RB` (**Registrar-Backers**), `NRB` (**No-Registrar-Backers**)."

Test against identity UL's **Identifier Operational Constraints**:

| Trait | UL Coverage | Notes |
|-------|-------------|-------|
| `EO` | ✓ in identity UL | "Only establishment events allowed" |
| `DND` | ✓ in identity UL | "Cannot delegate" |
| `DID` | ✓ in identity UL | "Delegate treated as delegator" |
| `RB` | ✓ in identity UL | "Use registrar backers" |
| `NRB` | ✓ in identity UL | "Switch back to witnesses" |

**Score: fluent** — All five configuration traits are covered by the identity UL's Identifier Operational Constraints. The five axes of Identifier Type Dimensions also map cleanly.

---

### Backer Concept

> "The Backer threshold, `bt` field value is the number of backers... Witness Backers express support via a signature. Ledger Registrar Backers MAY express support by anchoring the key event on the associated ledger."

The spec uses **Backer** as a generalization that covers both Witnesses (signature-based) and Registrar Backers (ledger-based). The UL has **Witness** and **TOAD** but does it have "Backer" as the umbrella?

**Finding: KERI-Z4-002** — "Backer" is the spec's umbrella term for Witness + Registrar Backer. The identity UL references backers in the threshold context but may not define Backer as a formal type with its two variants. → Route: `accountability/types.yaml` for Backer type with Witness and RegistrarBacker as variants.

---

### Seal List Field (§6.1.3.11)

> "The Seal, `a` (anchor) field value is a list of field maps representing Seals."

The field label `a` stands for "anchor" in the spec, but the seal taxonomy (Z1-006) already mapped this to adopter verbs (commit, approve, authorize). At Z4, the wire-format representation is a list of typed field maps — each seal type has specific fields:

| Seal Type | Fields | Purpose |
|-----------|--------|---------|
| DigestSeal | `[d]` | Commit to data hash |
| MerkleRootSeal | `[rd]` | Commit to Merkle tree |
| SourceEventSeal | `[s, d]` | Cross-reference another event (implied AID) |
| KeyEventSeal | `[i, s, d]` | Cross-reference event in another AID's KEL |
| LatestEstablishmentSeal | `[i]` | Reference latest establishment event |
| RegistrarBackerSeal | `[bi, d]` | Authorize registrar backer operation |

**Score: type-covered** — These are all types in `identity/anchoring/types.yaml`. The seal taxonomy routing from Z1-006 holds. Each seal type maps to a specific commitment/authorization pattern. No new UL terms needed — the Builders handle the translation from terse fields to domain names.

---

## Cluster 2: CESR Field Encodings (§A.6.1)

This is pure cesr domain territory. The adopter here is a codec developer.

### Version String Encoding

> "In CESR native, the version field encodes protocol type (`KERI`), protocol version, and genus version in 10 Base64 characters with code `0O`."

**Score: fluent** — **Version String**, **Protocol Genus**, **Versify** all in cesr UL.

### DateTime Encoding

> "ISO-8601 datetime with non-Base64 characters (`:`→`c`, `.`→`d`, `+`→`p`) for compact CESR encoding."

**Score: fluent** — This is a cesr/composition encoding rule. No UL gap — it's a codec implementation detail.

### Threshold Encoding

> "Fractionally weighted threshold encoded as infix operators in Base64: `/`→`s`, `{:[,]}`→`k`/`v`, `[,]`→`c`, `[[],[]]`→`a`."

This is the densest Z4 content. The fractional weight threshold has a custom CESR encoding that preserves the clause structure using infix notation.

**Score: fluent for cesr domain** — This is exactly what cesr/composition types are for. The identity/thresholds UL names the concept (**Fractionally Weighted Threshold**); the cesr types handle the encoding.

### Route Encoding

> "Slash-delimited paths with `/`→`-` substitution for Base64 compatibility."

**Score: fluent** — Codec detail.

---

## Cluster 3: Native CESR Message Bodies (§A.6.2)

The native CESR serialization replaces JSON/CBOR/MGPK with positional fields framed by CESR count codes. Each message type has a fixed field order.

### Inception `icp` — Native CESR

Field order: `v`, `t`, `d`, `i`, `s`, `kt`, `k`, `nt`, `n`, `bt`, `b`, `c`, `a`

> "An **Inception Event** in native CESR encodes as a counted frame (`-FCS`) containing: **Version String** (`0O` code), message type (`icp`), **SAID** (`d`), **AID** (`i`), `SequenceNumber` (`s`), **Signing Threshold** (`kt`), `SigningKeyList` (`k`), **Rotation Threshold** (`nt`), `NextKeyDigestList` (`n`), **TOAD** (`bt`), **Witness List** (`b`), **Identifier Operational Constraints** (`c`), and seal list (`a`)."

**Score: fluent** — Every field maps to either a UL term or a routed type. The Builder pattern from the CLAUDE.md philosophy works here:

```
InceptionEvent.builder()
  .aid(aid)                          // i → AID (UL)
  .signingKeys([key1, key2, key3])   // k → SigningKeyList (type)
  .signingThreshold(2)               // kt → Signing Threshold (UL)
  .nextKeyDigests([digest1, ...])    // n → NextKeyDigestList (type)
  .rotationThreshold(2)              // nt → Rotation Threshold (UL)
  .witnesses([w1, w2, w3, w4])       // b → Witness List (UL)
  .witnessThreshold(3)               // bt → TOAD (UL)
  .traits(["DID"])                   // c → Identifier Operational Constraints (UL)
  .build()
```

This Builder pattern is exactly what the CLAUDE.md DDD philosophy requires. Every terse field gets a full domain name. The existing UL provides names for 8 of 13 fields; the routed types cover the remaining 5.

### Interaction `ixn` — Native CESR

Field order: `v`, `t`, `d`, `i`, `s`, `p`, `a`

> "An `InteractionEvent` encodes: **Version String**, type, **SAID**, **AID**, `SequenceNumber`, `PriorEventDigest`, and seal list."

**Score: fluent** — simpler message, all terms mapped. `PriorEventDigest` is the Z4-001 gap but it's a type, not a UL term.

### Rotation `rot` — Native CESR

Field order: `v`, `t`, `d`, `i`, `s`, `p`, `kt`, `k`, `nt`, `n`, `bt`, `br`, `ba`, `c`, `a`

> "A **Rotation Event** encodes all inception fields plus `PriorEventDigest`, `WitnessRemoveList`, and `WitnessAddList`."

**Score: fluent** — Z4-001 types fill the remaining gaps.

### Delegated Inception `dip` — Native CESR

Field order: same as `icp` plus `di` (Delegator AID)

> "A `DelegatedInceptionEvent` extends **Inception Event** with the *Delegator's* **AID** (`di`)."

**Score: fluent** — delegation types handle this.

### Receipt `rct` — Native CESR

Field order: `v`, `t`, `d`, `i`, `s`

> "A **Receipt** references the receipted *Key Event* by **SAID**, **AID**, and `SequenceNumber`. The **Receipt** itself has no SAID — it is a pointer, not a self-addressed structure."

**Score: fluent** — accountability/receipting UL covers this. The "no SAID" property is an interesting type constraint.

---

## Cluster 4: Example Sections (skipped)

The H5 sections titled "Example ..." (inception example, rotation example, etc.) contain worked examples using specific test keys and UUIDs. These don't introduce new concepts — they demonstrate the field structures defined above.

**Score: N/A** — examples, not new concepts.

---

# Z4 Coverage Summary

| Cluster | Sections | Fluent | Awkward | Gap |
|---------|----------|--------|---------|-----|
| Field semantics | 16 | 10 | 1 | 2 |
| CESR encodings | 5 | 5 | 0 | 0 |
| Native CESR messages | 7 | 7 | 0 | 0 |
| Examples | 22 | N/A | N/A | N/A |
| **Total (non-example)** | **28** | **22 (79%)** | **1 (3%)** | **2 (7%)** |

## New Z4 Findings

| ID | What | Route | Domain |
|----|------|-------|--------|
| Z4-001 | SequenceNumber (`sn` vs `fn`), PriorEventDigest (`p`), WitnessRemoveList (`br`), WitnessAddList (`ba`) — four field-level type gaps | types | identity, identity/thresholds |
| Z4-002 | Backer as umbrella for Witness + RegistrarBacker | types | accountability |

## Key Observations

1. **The Builder pattern validates.** Every field in every message type maps to either a UL term or a routed type. An InceptionEvent Builder can expose full domain names for all 13 fields. This is exactly what the CLAUDE.md DDD philosophy prescribes.

2. **CESR encodings are fully covered.** The cesr domain UL handles all encoding rules fluently. This is the strongest domain — zero gaps at any zoom level.

3. **The field-level gaps are all types, not UL terms.** SequenceNumber, PriorEventDigest, WitnessRemoveList, WitnessAddList, and Backer are developer-facing concepts that belong in types.yaml. No adopter needs to say "PriorEventDigest" — but a developer implementing a Builder does.

4. **`sn` vs `fn` distinction matters.** The spec explicitly distinguishes Sequence Number (event position in KEL) from First-Seen Number (order of acceptance). The UL has First-Seen Number but not Sequence Number. Both are needed at the types level because they appear in different contexts (validation rules use both).
