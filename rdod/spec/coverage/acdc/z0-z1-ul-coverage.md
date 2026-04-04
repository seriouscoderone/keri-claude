# ACDC Spec UL Coverage — Z0 (Mission) and Z1 (Capabilities)

Generated: 2026-04-03  
Spec source: ACDC Specification  
UL domains consulted: credential-lifecycle, privacy, privacy/disclosure, privacy/aggregation, privacy/blinding, credential-exchange, credential-exchange/negotiation, credential-exchange/proof

---

## Z0 — Mission

### Authentic Chained Data Containers (ACDC)

**Sentence:** An ACDC is a cryptographically verifiable, Schema-enforced data container bound to an Issuer AID via KERI key state, where chains of ACDCs linked through the Edge Section form a distributed property graph enabling granular proof-of-authorship — and, when combined with Graduated Disclosure and Rule Section contractual terms, extensible to proof-of-authority for entitlements and permissions.

**Score:** awkward

**Finding ACDC-Z0-001:** The UL has no term for "proof-of-authority" (authorization delegation distinct from authorship attribution), and no term for "distributed property graph" as a first-class concept — the Edge Section definition uses the phrase but the UL does not surface it as a named concept. The mission sentence requires paraphrasing around both gaps. A `PropertyGraphFragment` term (an ACDC as a node + edges in a global authenticated DAG) would make the mission fluent in a single clause.

---

## Z1 — Capabilities

### Introduction

**Sentence:** The ACDC specification defines a cryptographically verifiable data container (ACDC) issued by an Issuer AID, supporting Graduated Disclosure — from Metadata Disclosure through Compact Disclosure, Partial Disclosure, Selective Disclosure, and Full Disclosure gated by Contractually Protected Disclosure — where ACDCs chain via the Edge Section into an authenticated directed acyclic graph enabling both proof-of-authorship and proof-of-authority for entitlements, with 128-bit security throughout.

**Score:** awkward

**Finding ACDC-Z1-001:** "Proof-of-authority" and "entitlements/permissions" have no UL terms. The UL covers what ACDCs are and how they disclose, but not the governance/authorization semantics that motivate chaining. A `DelegatedAuthority` or `AuthorizationChain` term (an ACDC chain establishing who is authorized to act on behalf of whom) would make this fluent. Relates to ACDC-Z0-001.

**Finding ACDC-Z1-002:** "128-bit security" is a quantitative security level claim with no UL term. The UL references >= 128 bits entropy for Private ACDC UUIDs and Shared Secret Salt but has no `SecurityLevel` or `CryptographicStrength` concept as a first-class domain term. This is a discovery gap — the spec uses 128-bit security as a design invariant that cuts across all mechanisms.

---

### Scope

**Sentence:** The Scope section defines the boundaries of the ACDC specification: ACDC structure and Credential Type Dimensions, Schema (type-is-schema principle, oneOf Composition), Graduated Disclosure mechanisms (Disclosure Form Taxonomy, Contractually Protected Disclosure, Selective Disclosure, Bulk-Issued Instance Disclosure), IPEX (Apply, Offer, Agree, Grant, Admit, Spurn), and TELs (Registry, Registry Inception, Update Event, Blindable Update, Blindable vs Non-Blindable modes).

**Score:** fluent

---

### ACDC Structure

**Sentence:** An ACDC is an ordered nested field map (insertion-ordered serialization) with required top-level fields — version string, SAID (d), Issuer AID (i), and Schema (s) — and optional fields including top-level UUID (u, for Private ACDC blinding), Registry SAID (rd), Attribute Section (a), Aggregate Section (A), Edge Section (e), and Rule Section (r); the top-level SAID is computed via the Most Compact Form algorithm applied depth-first through the credential tree.

**Score:** fluent

---

### ACDC Variants

**Sentence:** ACDCs come in four variants determined by the presence and value of the top-level UUID field: Public ACDC (no UUID — content discoverable from SAID + Schema), Private ACDC (high-entropy UUID >= 128 bits — blinded commitment), Metadata ACDC (empty UUID — commitment to schema and rules without content correlation), and Compact ACDC (any variant in its Most Compact Form where all sections are replaced by their SAIDs).

**Score:** fluent

---

### Top-level ACDC Sections

**Sentence:** An ACDC has five top-level sections: Schema (s — the static, SAIDified JSON Schema 2020-12 document defining structure and oneOf Composition variants), Attribute Section (a — direct attribute disclosure including optional Issuee AID for targeted credentials), Aggregate Section (A — the AGID enabling Selective Disclosure via Inclusion Proof over Blinded Attribute Blocks), Edge Section (e — directed edges to far-node ACDCs with edge operators forming an authenticated property graph), and Rule Section (r — Ricardian contract clauses providing Chain-Link Confidentiality terms and machine-readable governance).

**Score:** fluent

---

### Disclosure Mechanisms and Exploitation Protection

**Sentence:** The disclosure and exploitation protection mechanisms bind ACDC state to Issuer key state via Transaction Event Seals in the Issuer's KEL; the TEL Registrar publishes state (issued/revoked) observable by a TEL Observer; data privacy is enforced through Graduated Disclosure — Private ACDC blinding, Contractually Protected Disclosure via Rule Section terms, Selective Disclosure via AGID and Inclusion Proofs, and Blindable vs Non-Blindable Registry modes using the Shared Secret Salt and Blinded Attribute Block (BLID) for private state observation; and the three-party exploitation model is addressed by Bespoke ACDC composition enabling presentation-specific contractual wrapping.

**Score:** awkward

**Finding ACDC-Z1-003:** "Three-party exploitation model" has no UL term. The spec defines a specific threat model (Issuer, Issuee, Verifier as three parties each capable of exploiting the other two) that motivates much of the disclosure design. The UL addresses the mechanisms (Contractually Protected Disclosure, Bespoke ACDC) but not the model itself. A `ThreePartyExploitationModel` or `DisclosureAdversaryModel` term would make this clause fluent and explain WHY these mechanisms exist.

**Finding ACDC-Z1-004:** "Binding to key state at time of ACDC state change" is a capability the UL describes only partially. The UL has `Transaction Event Seal` and `Credential State` but no term for the invariant that TEL state changes are bound to key state at the moment of change (not current key state). A `KeyStateBinding` or `TemporalKeyStateAnchor` term would clarify this capability distinctly from general TEL anchoring.

---

### Issuance and Presentation Exchange (IPEX)

**Sentence:** IPEX is a uniform protocol modeling both credential issuance and credential presentation as Graduated Disclosure from a Discloser to a Disclosee, using the IPEX Message Type Pattern (Apply → Offer → Agree → Grant → Admit, with Spurn at any step) authenticated via KRAM; a Grant carries Credential Artifacts (the ACDC, its TEL Update Event or Blindable Update, and the Transaction Event Seal) providing the Disclosee with Proof of Issuance and Proof of Disclosure without additional round-trips; the Discloser may issue a Bespoke ACDC to add presentation-specific contractual terms before granting.

**Score:** fluent

---

### Transaction Event Logs (TELs) as ACDC State Registries

**Sentence:** A TEL is a hash-chained sequence of transaction events tracking Credential State (issued/revoked) for ACDCs; a Registry is initialized by a Registry Inception (rip) event whose SAID becomes the REGID; subsequent state changes are recorded via Update Events (non-blindable, publicly observable) or Blindable Updates (bup events using Blinded Attribute Blocks and BLID for private state observation by entities holding the Shared Secret Salt); the Registry operates in Non-Blindable or Blindable Registry Mode; TEL events are sealed (anchored) in the Issuer's KEL via Transaction Event Seals, making Credential State verifiable by any TEL Observer without requiring direct contact with the issuer.

**Score:** fluent

---

## Summary of Findings

| ID | Score | Missing concept | Affected sections |
|----|-------|-----------------|-------------------|
| ACDC-Z0-001 | awkward | `PropertyGraphFragment` — ACDC as node+edges in authenticated DAG | Z0, Z1-Introduction |
| ACDC-Z1-001 | awkward | `DelegatedAuthority` / `AuthorizationChain` — proof-of-authority via credential chaining | Z1-Introduction |
| ACDC-Z1-002 | awkward | `SecurityLevel` / `CryptographicStrength` — 128-bit security as first-class invariant | Z1-Introduction |
| ACDC-Z1-003 | awkward | `ThreePartyExploitationModel` — issuer/issuee/verifier adversary model motivating disclosure design | Z1-Disclosure |
| ACDC-Z1-004 | awkward | `TemporalKeyStateAnchor` — TEL state changes bound to key state at time of change, not current state | Z1-Disclosure |

### Coverage summary
- Z0 (1 heading): 1 awkward, 0 fluent, 0 gap
- Z1 (8 headings): 5 fluent, 3 awkward, 0 gap
- Overall: 5 fluent / 3 awkward / 0 gap = ~62% fluent at Z1
- No outright gaps: all concepts are expressible in UL but require paraphrase for 3 of 8 capabilities
- Highest-impact finding: ACDC-Z0-001 / ACDC-Z1-001 (property graph + authorization chain) — these are the ACDC thesis, not a detail
