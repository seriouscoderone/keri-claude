# Z1 — Capabilities: ACDC Specification

## Introduction
**Sentence:** The ACDC specification defines a cryptographically verifiable data container (ACDC) issued by an Issuer AID, supporting Graduated Disclosure — from Metadata Disclosure through Compact Disclosure, Partial Disclosure, Selective Disclosure, and Full Disclosure gated by Contractually Protected Disclosure — where ACDCs chain via the Edge Section into an authenticated directed acyclic graph enabling both proof-of-authorship and proof-of-authority for entitlements, with 128-bit security throughout.
**Score:** awkward
**Finding:** ACDC-Z1-001 — Same root gap as ACDC-Z0-001: no UL term for the graph-level authorization chain. ACDC-Z1-002 — The 128-bit security level is a cross-cutting invariant (UUIDs, salts, bulk issuance) but unnamed in the UL. Proposed: **SecurityLevel** or **CryptographicStrength**.

## Scope
**Sentence:** The Scope section defines the boundaries of the ACDC specification: ACDC structure and Credential Type Dimensions, Schema (type-is-schema principle, oneOf Composition), Graduated Disclosure mechanisms (Disclosure Form Taxonomy, Contractually Protected Disclosure, Selective Disclosure, Bulk-Issued Instance Disclosure), IPEX (Apply, Offer, Agree, Grant, Admit, Spurn), and TELs (Registry, Registry Inception, Update Event, Blindable Update, Blindable vs Non-Blindable modes).
**Score:** fluent

## ACDC Structure
**Sentence:** An ACDC is an ordered nested field map with required top-level fields — version string, SAID (d), Issuer AID (i), and Schema (s) — and optional fields including top-level UUID (u, for Private ACDC blinding), Registry SAID (rd), Attribute Section (a), Aggregate Section (A), Edge Section (e), and Rule Section (r); the top-level SAID is computed via the Most Compact Form algorithm applied depth-first through the credential tree.
**Score:** fluent

## ACDC Variants
**Sentence:** ACDCs come in four variants determined by the presence and value of the top-level UUID field: Public ACDC (no UUID), Private ACDC (high-entropy UUID >= 128 bits — blinded commitment), Metadata ACDC (empty UUID — commitment to schema and rules without content correlation), and Compact ACDC (any variant in its Most Compact Form with all sections replaced by their SAIDs).
**Score:** fluent

## Top-level ACDC Sections
**Sentence:** An ACDC has five top-level sections: Schema (s — static, SAIDified JSON Schema 2020-12 with oneOf Composition variants), Attribute Section (a — direct attribute disclosure with optional Issuee AID for targeted credentials), Aggregate Section (A — AGID enabling Selective Disclosure via Inclusion Proof over Blinded Attribute Blocks), Edge Section (e — directed edges with edge operators forming an authenticated property graph), and Rule Section (r — Ricardian contract clauses providing Chain-Link Confidentiality terms).
**Score:** fluent

## Disclosure Mechanisms and Exploitation Protection
**Sentence:** Disclosure and exploitation protection bind ACDC state to Issuer key state via Transaction Event Seals in the Issuer's KEL; the TEL Registrar publishes Credential State observable by a TEL Observer; data privacy is enforced through Graduated Disclosure — Private ACDC blinding, Contractually Protected Disclosure via Rule Section terms, Selective Disclosure via AGID and Inclusion Proofs, and Blindable vs Non-Blindable Registry modes using the Shared Secret Salt and Blinded Attribute Block (BLID); the three-party exploitation model is addressed by Bespoke ACDC composition enabling presentation-specific contractual wrapping.
**Score:** awkward
**Finding:** ACDC-Z1-003 — No UL term for the **Three-Party Exploitation Model** (the adversary model motivating all disclosure design). ACDC-Z1-004 — No UL term for the temporal binding invariant: TEL state changes are bound to key state *at the time of the change*, not current key state. Proposed: **TemporalKeyStateBinding**.

## Issuance and Presentation Exchange (IPEX)
**Sentence:** IPEX is a uniform protocol modeling both credential issuance and credential presentation as Graduated Disclosure from a Discloser to a Disclosee, using the IPEX Message Type Pattern (Apply -> Offer -> Agree -> Grant -> Admit, with Spurn at any step) authenticated via KRAM; a Grant carries Credential Artifacts providing the Disclosee with Proof of Issuance and Proof of Disclosure without additional round-trips; the Discloser may issue a Bespoke ACDC to add presentation-specific contractual terms before granting.
**Score:** fluent

## Transaction Event Logs (TELs) as ACDC State Registries
**Sentence:** A TEL is a hash-chained sequence of transaction events tracking Credential State for ACDCs; a Registry is initialized by a Registry Inception (rip) event whose SAID becomes the REGID; state changes are recorded via Update Events (non-blindable) or Blindable Updates (bup events using Blinded Attribute Blocks and BLID); the Registry operates in Non-Blindable or Blindable mode; TEL events are sealed in the Issuer's KEL via Transaction Event Seals, making Credential State verifiable by any TEL Observer.
**Score:** fluent
