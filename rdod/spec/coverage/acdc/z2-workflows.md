# Z2 — Workflows: ACDC Specification

## Schema Section
**Sentence:** The Credentialer binds each ACDC to a SAIDified, immutable Schema (serving as the type-is-schema identity) so that the Credential Serializer can validate any Disclosure Form Taxonomy variant — Compact, Partial, or Full — against a composed JSON Schema without dynamic references that would expose the credential to schema-revocation or semantic-malleability attacks.
**Score:** awkward
**Finding:** ACDC-Z2-001 — No UL term for the "type-is-schema" design principle. "Credential Type Dimensions" is close but doesn't capture Schema SAID *as* type identifier. Proposed: **TypeIsSchema**.

## Attribute Section
**Sentence:** The Attribute Section carries the Issuee AID and credential payload; its targeted/untargeted and private/public variants determine whether the section supports Partial Disclosure, and the optional `cargo` field enables the ACDC to act as a verifiable container for opaque foreign data formats.
**Score:** awkward
**Finding:** ACDC-Z2-002 — No UL term for **Targeted ACDC** vs **Untargeted ACDC** distinction, or the **Cargo Field** pattern.

## Aggregate Section
**Sentence:** The Aggregate Section encodes Selective Disclosure by committing the Issuer to an AGID — a cryptographic aggregate of an ordered list of Blinded Attribute Blocks — so that any Issuee can later supply an Inclusion Proof for one element without revealing the contents of other Blinded Attribute Blocks.
**Score:** fluent

## Edge Section
**Sentence:** The Edge Section forms a sub-graph of a globally distributed property graph in which each Edge block references another ACDC by its SAID (the node `n` field) and is itself SAIDified; nested Edge-groups compose complex logical or aggregative operations over chains of ACDCs, enabling Graduated Disclosure to propagate through the credential graph.
**Score:** awkward
**Finding:** ACDC-Z2-003 — No UL term for **Edge** or **Edge-group** as first-class structural block types (distinct from the "Edge Section" container).

## Rule Section
**Sentence:** The Rule Section encodes a SAIDified Ricardian Contract whose Rule-groups and Rules carry legal language that a Disclosee must accept as part of Contractually Protected Disclosure; the Issuer MAY compact the section to its SAID and rely on Percolated Discovery to let the Issuee retrieve the full contract text.
**Score:** awkward
**Finding:** ACDC-Z2-004 — No UL term for **Percolated Discovery** (OOBI-based propagation of contract/schema text).

## Most Compact Form SAID
**Sentence:** The Most Compact Form algorithm — a depth-first traversal that SAIDifies leaf blocks first and then compacts each enclosing block — produces one canonical SAID for any ACDC regardless of which oneOf variants its sub-blocks permit.
**Score:** awkward
**Finding:** ACDC-Z2-005 — "Most Compact Form" exists in privacy/aggregation UL but is scoped to AGID computation. The general SAID-computation algorithm needs its own UL term. Proposed: **MostCompactForm** (general, not AGID-specific).

## Compact ACDC
**Sentence:** A Compact ACDC is a Credential Construction variant in which each top-level section field holds only the SAID of its corresponding uncompacted section, enabling lightweight transmission while preserving the Issuer's cryptographic commitment.
**Score:** fluent

## Public ACDC
**Sentence:** A Public ACDC omits the top-level UUID field, so its top-level SAID provides no blinding against rainbow-table attacks when the Schema is known.
**Score:** fluent

## Private ACDC
**Sentence:** A Private ACDC includes a high-entropy top-level UUID that blinds the ACDC contents against its SAID even when the Schema is known, enabling Partial Disclosure and later Selective Disclosure.
**Score:** fluent

## Metadata ACDC
**Sentence:** A Metadata ACDC carries an empty top-level UUID field, causing its SAID to differ from the corresponding Private ACDC; a Discloser presents it during Metadata Disclosure to commit to structural information before the Disclosee accepts terms — without leaking any correlation to the actual Private ACDC.
**Score:** fluent

## Graduated Disclosure
**Sentence:** Graduated Disclosure is the recursive application of least-disclosure transactions — Compact, Metadata, Partial, Nested Partial, Full, Selective, and Bulk-Issued Instance Disclosure — where each step reveals the minimum information needed to enable the next, progressing toward Contractually Protected Disclosure.
**Score:** fluent

## Contractually Protected Disclosure
**Sentence:** Contractually Protected Disclosure combines Graduated Disclosure with the Rule Section's Ricardian Contract to produce Chain-Link Confidentiality (terms propagate through a chain of Disclosees) or Contingent Disclosure (obligated Full Disclosure only upon specified contingency).
**Score:** fluent

## IPEX Protocol Messages
**Sentence:** IPEX orchestrates credential exchange through six routed exn messages — Apply, Offer, Agree, Grant, Admit, Spurn — where the Disclosee initiates with Apply, the Discloser proposes with Offer (attaching Metadata ACDC or Partial Disclosure), the Disclosee accepts with Agree, and the Discloser completes with Grant confirmed by Admit.
**Score:** fluent

## Disclosure-specific (Bespoke) Issued ACDCs
**Sentence:** A Bespoke ACDC is issued by a Discloser to a specific Disclosee as the named Issuee, chaining via an Edge Section to one or more prior ACDCs; its Rule Section may carry context-specific contractual language and its Attribute Section may use SAD Path Signatures to reference Attributes from chained ACDCs.
**Score:** awkward
**Finding:** ACDC-Z2-006 — No UL term for the workflow of a Discloser acting as Issuer of a bespoke credential. Proposed: **BespokeIssuanceWorkflow**.

## Overview — TEL
**Sentence:** A TEL is a hash-chained sequence of Transaction Event Seals anchored in the Issuer's KEL, tracking Credential State; because each event's SAID is anchored via a KEL interaction event, Credential State is verifiably bound to the Issuer's Key State at the time of each update, persisting even after key rotations.
**Score:** fluent

## Validating Transaction Events
**Sentence:** A TEL Observer validates Credential State by creating a Transaction Event Seal from the event's SAID, confirming the seal's presence in the Issuer's KEL, making signed KE acceptance the non-repudiable proof of the state transition without requiring the TEL event itself to be separately signed.
**Score:** awkward
**Finding:** ACDC-Z2-007 — The validation algorithm has no named UL workflow term. Proposed: **TransactionEventValidation**.

## Registry Message Types and Fields
**Sentence:** A Registry supports three event types: Registry Inception (rip), Blindable Update (bup), and Update (upd) — allowing both blinded and non-blinded credential state management within a single Registry.
**Score:** fluent

## Exploitation Protection Mechanisms
**Sentence:** ACDCs protect against data exploitation through the principle of least disclosure: the Disclosure Form Taxonomy ensures a Discloser releases only the minimum information needed for a given transaction.
**Score:** fluent

## Three-party Exploitation Model
**Sentence:** The Three-party Exploitation Model defines the data subject as the 1st-party Discloser, the intended recipient as the 2nd-party Disclosee, and any unintended observer as the 3rd party; ACDC Graduated Disclosure mechanisms protect 1st-party data rights by limiting what the Discloser reveals and preventing 3rd-party observation.
**Score:** awkward
**Finding:** ACDC-Z2-008 — No UL terms for the **Three-Party Exploitation Model** roles (1st/2nd/3rd party) or for the **Exploitation Observer** role distinct from infrastructure TEL Observer.

## TEL Registrars and TEL Observers
**Sentence:** The TEL Registrar operates under the Issuer to maintain and publish the Registry; the TEL Observer operates under Validators to cache Registry state and answer Credential State queries — decoupling validation-time queries from issuance-time state changes so the Issuer cannot observe validator usage patterns.
**Score:** fluent

## Data Privacy
**Sentence:** ACDC data privacy is framed as protection from unpermissioned exploitation of 1st-party data rather than absolute confidentiality: the Disclosure Form Taxonomy and Contractually Protected Disclosure mechanisms address both 2nd-party misuse and 3rd-party observation.
**Score:** awkward
**Finding:** ACDC-Z2-009 — No UL term for the contextual-integrity framing of privacy (privacy as relationship norms, not secrecy). Proposed: **DataPrivacyPrinciple**.

## Binding to Key State at Time of ACDC State Change
**Sentence:** The Issuer anchors a Transaction Event Seal in their KEL at the moment of each Credential State change, binding the Credential State to the Issuer's Key State at that moment so that later key rotations do not invalidate existing credential proofs.
**Score:** fluent

## Selective Disclosure — Annex
**Sentence:** Selective Disclosure via the Aggregate Section allows a Discloser to prove membership of any individual Blinded Attribute Block in the AGID using an Inclusion Proof without revealing any other block's content.
**Score:** fluent

## Bulk-issued Private ACDCs
**Sentence:** Bulk Issuance lets an Issuer commit to an aggregate of uniquely SAIDified Private ACDC instances via a single bulk-issued aggregate value anchored in the KEL or TEL, enabling on-demand unique ACDC copies from a shared template and salt.
**Score:** awkward
**Finding:** ACDC-Z2-010 — No UL term for the **BulkIssuanceAggregate** (`B` value) or the bulk issuance template mechanism.

## Extensibility
**Sentence:** ACDCs achieve permissionless extensibility because each credential is a SAIDified property-graph fragment identified by a content-addressed Schema; new credential types are introduced by issuing ACDCs with custom Schemas chaining via Edge Sections to existing ACDCs.
**Score:** fluent

## ACDC Protocol Message Types
**Sentence:** The Credential Serializer emits ACDC messages in CESR-native format using top-level types (acm/act/acg) and section-level types (sch/att/agg/edg/rul), enabling section-level caching and reuse across ACDC instances sharing the same Schema or Rule Section.
**Score:** awkward
**Finding:** ACDC-Z2-011 — No UL term for **SectionMessage** or the caching/reuse pattern enabled by section-level message types.
