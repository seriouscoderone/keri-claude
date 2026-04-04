# Phase 3: Bottom-Up Verification — ACDC Specification

## Method
Re-read Z0-Z1 sentences with the full set of proposed terms from Z2-Z4, verifying:
1. High-level sentences still read naturally with new low-level terms
2. Terms discovered at Z4 compose into Z2 process narratives
3. No proposed term conflicts with existing UL

## Z0 Re-verification

**Original sentence (awkward):** "...chains of ACDCs linked through the Edge Section form a distributed property graph..."

**With proposed CredentialGraph term:** "An ACDC is a cryptographically verifiable, Schema-enforced data container bound to an Issuer AID via KERI key state; ACDCs linked through CredentialEdges form a **CredentialGraph** enabling proof-of-authorship and, via Graduated Disclosure and Rule Section terms, proof-of-authority."

**Result: PASS** — CredentialGraph absorbs the wordy property-graph description. CredentialEdge (from Z2) composes naturally at Z0.

## Z1 Re-verification

### Introduction
**With SecurityLevel:** "...with **SecurityLevel** (128-bit minimum) throughout."
**Result: PASS** — SecurityLevel replaces the ad-hoc "128-bit security" phrase.

### Disclosure Mechanisms
**With ThreePartyExploitationModel and TemporalKeyStateBinding:** "...the **ThreePartyExploitationModel** motivates all disclosure design; **TemporalKeyStateBinding** ensures credential proofs survive key rotation."
**Result: PASS** — Both terms slot in without making the sentence more complex.

## Z2 Re-verification

### Schema Section
**With TypeIsSchema:** "The Credentialer binds each ACDC to a Schema following the **TypeIsSchema** principle."
**Result: PASS** — Eliminates the wordy paraphrase.

### Attribute Section
**With TargetedACDC/UntargetedACDC:** "A **TargetedACDC** includes an Issuee AID; an **UntargetedACDC** is a bearer credential."
**Result: PASS** — Clean binary classification.

### Edge Section
**With CredentialEdge/EdgeGroup:** "The Edge Section contains **CredentialEdges** (directed links via node `n` field) and **EdgeGroups** (aggregation blocks with m-ary Operators)."
**Result: PASS** — Structural types compose naturally in Z2 workflow descriptions.

### Rule Section
**With PercolatedDiscovery:** "...Issuer MAY compact the section to its SAID and rely on **PercolatedDiscovery** for retrieval."
**Result: PASS** — Clean replacement.

### Bespoke ACDCs
**With enriched BespokeACDC:** "A Discloser issues a **BespokeACDC** to a Disclosee, chaining to prior credentials."
**Result: PASS** — No new term needed; enriched definition handles the workflow.

### Bulk Issuance
**With BulkIssuanceAggregate:** "The Issuer anchors a **BulkIssuanceAggregate** (`B` value) covering all instances."
**Result: PASS** — Parallel to AGID naming pattern.

### ACDC Message Types
**With SectionMessage:** "**SectionMessages** (sch, att, agg, edg, rul) enable independent section transmission."
**Result: PASS** — Clean term.

## Z3-Z4 Re-verification

### AGID Computation
**With enriched AGID definition including algorithm:** Sentence becomes fluent without needing a separate algorithm term.
**Result: PASS**

### Blinded Attribute Block
**With FixedFieldBlock (from Z4):** "The Blinded Attribute Block is a **FixedFieldBlock** — a CESR structure with virtual labels..."
**Result: PASS** — Z4 type composes into Z3 rule descriptions.

### BLID Computation
**With enriched BLID noting fixed-field SAID variant:** "The BLID is computed as a **FixedFieldBlock** SAID using the standard dummy-replacement protocol."
**Result: PASS** — FixedFieldBlock + enriched BLID eliminate the awkwardness.

### Bulk Derivation
**With HierarchicalDerivation:** "The Issuer and Issuee use **HierarchicalDerivation** from a Shared Secret Salt to generate per-instance UUIDs."
**Result: PASS** — Clean composition with existing SharedSecretSalt term.

## Cross-Zoom Composition Check

| Proposed Term | Discovered At | Used At | Composes? |
|---------------|---------------|---------|-----------|
| CredentialGraph | Z0 | Z0, Z1, Z2 (Edge Section) | Yes |
| SecurityLevel | Z1 | Z1, Z3 (bulk issuance), Z4 (UUID entropy) | Yes |
| ThreePartyExploitationModel | Z1 | Z1, Z2 (exploitation, data privacy) | Yes |
| TemporalKeyStateBinding | Z1 | Z1, Z2 (TEL overview, validation) | Yes |
| TypeIsSchema | Z2 | Z2, Z3 (Schema rules) | Yes |
| TargetedACDC / UntargetedACDC | Z2 | Z2, Z3 (attribute variants) | Yes |
| CredentialEdge / EdgeGroup | Z2 | Z2, Z3 (edge/edge-group rules), Z4 (fields) | Yes |
| PercolatedDiscovery | Z2 | Z2 (Rule Section) | Yes |
| SectionMessage | Z2 | Z2 (message types), Z4 (section fields) | Yes |
| BulkIssuanceAggregate | Z2 | Z2, Z3 (bulk issuance procedure) | Yes |
| HierarchicalDerivation | Z3 | Z3 (bulk issuance), Z2 (bulk-issued ACDCs) | Yes |
| FixedFieldBlock | Z4 | Z4, Z3 (blinded state disclosure) | Yes |

**All proposed terms compose cleanly across zoom levels. No conflicts with existing UL terms detected.**

## Conflict Check

- **CredentialGraph** vs existing "Edge Section": No conflict — CredentialGraph is the emergent DAG; Edge Section is the structural field.
- **TargetedACDC** vs existing "Issuee": No conflict — TargetedACDC classifies the credential; Issuee is the entity.
- **SectionMessage** vs existing "ACDC Message Types": No conflict — SectionMessage is a sub-category of ACDC Message Types.
- **FixedFieldBlock** vs existing "Blinded Attribute Block": No conflict — FixedFieldBlock is the structural pattern; Blinded Attribute Block is the specific instance.

## Verdict

All 20 findings verified. Proposed terms and enrichments compose without introducing complexity at higher zoom levels. No term revisions needed from bottom-up verification.
