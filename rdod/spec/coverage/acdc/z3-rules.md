# Z3 — Rules: ACDC Specification

## Type-is-schema
**Sentence:** An ACDC's Schema serves as the sole type declaration; the Issuer commits to a Schema SAD whose SAID is both the type identifier and a verifiable content commitment, enabling Composable JSON Schema to support Graduated Disclosure variants.
**Score:** fluent

## Static (Immutable) Schema
**Sentence:** Every Schema referenced by an ACDC MUST be a SAD verified against its SAID; non-local URI Schema references lacking embedded SAIDs are forbidden because they expose ACDCs to schema revocation and semantic malleability attacks.
**Score:** fluent

## Schema Dialect
**Sentence:** The Schema governing ACDC 1.0 MUST be JSON Schema 2020-12; a Validator MUST treat the `$schema` field as a static dialect identifier and fail validation if the dialect does not match.
**Score:** fluent

## Schema Versioning
**Sentence:** Each Schema SAD carries an informative semantic `version` field and a normative cryptographic version given by its SAID (`$id`); any change produces a new SAID, making the SAID the authoritative Schema version identifier.
**Score:** fluent

## Composable JSON Schema
**Sentence:** Composable JSON Schema enables the Issuer to make a single verifiable commitment to a bundle of Schema variants (Compact, Partial, Full, Selective Disclosure) via the `oneOf` composition operator, enabling Most Compact Form alongside expanded forms.
**Score:** fluent

## Targeted Attribute Section
**Sentence:** When the Attribute section contains an Issuee `i` field, the ACDC is a Targeted ACDC: the Issuer binds the credential to the Issuee AID, enabling verifiable entitlement, delegation, and Contractually Protected Disclosure.
**Score:** fluent

## Untargeted Attribute Section
**Sentence:** When no Issuee `i` field appears in the Attribute section, the ACDC is untargeted: the Issuer makes a verifiable undirected attestation without a designated counterparty, suitable for provenance chains.
**Score:** fluent

## Basic selective disclosure mechanism
**Sentence:** The Aggregate section provides Selective Disclosure via Blinded Attribute Blocks aggregated into the AGID; the Issuer's commitment to the AGID is a commitment to all elements, while membership of any single element can be proven via Inclusion Proof.
**Score:** fluent

## Computation of the AGID
**Sentence:** The AGID is computed by serializing an ordered list of N+1 values — a dummy placeholder at index 0 plus the SAIDs of N Blinded Attribute Blocks — and replacing the placeholder with the cryptographic digest of that serialization.
**Score:** awkward
**Finding:** ACDC-Z3-001 — The AGID computation algorithm lacks a named UL term (analogous to SAID computation). Proposed: **AGIDComputation**.

## Inclusion proof via AGID
**Sentence:** A Discloser proves Selective Disclosure of a Blinded Attribute Block by providing the actual block SAD, the full ordered AGID list, the ACDC in compact form, and the Issuer's commitment; the Disclosee verifies by recomputing the AGID and confirming block SAID membership.
**Score:** fluent

## Edge-group
**Sentence:** An Edge-group aggregates Edges or nested Edge-groups using an m-ary Operator (AND, OR, NAND, NOR, AVG, WAVG); Edge-groups MUST NOT carry a node `n` field, distinguishing them from Edges; block type is determined by Schema per the type-is-schema principle.
**Score:** fluent

## Edge
**Sentence:** An Edge is a directed link from a near-node ACDC to a far-node ACDC identified by the SAID in the node `n` field; it MAY carry a Schema `s` field constraining the far node, an Operator `o` field (I2I, NI2I, DI2I, NOT), and a Weight `w` field.
**Score:** fluent

## ACDCs as secure graph fragments
**Sentence:** ACDCs whose Edge Sections connect them form a labeled property graph; each ACDC is a universally unique node identified by its SAID, each Edge a universally unique directed link, enabling secure assembly across trust domains.
**Score:** fluent

## Rule-group
**Sentence:** A Rule-group contains nested Rules and Rule-groups as labeled fields; it MAY carry a Legal Language `l` field and MAY have a SAID enabling compact and partial disclosure.
**Score:** fluent

## Rule
**Sentence:** A Rule MUST carry a Legal Language `l` field; a Rule with only an `l` field MAY use Simple Compact Rule form, representing the clause as a plain string.
**Score:** fluent

## Commitments via SAID
**Sentence:** An Issuer's signature or Transaction Event Seal on any ACDC variant constitutes a verifiable commitment to all other Graduated Disclosure variants because all share the same Most Compact Form SAID; Proof of Issuance and Proof of Disclosure can be verified across variants.
**Score:** fluent

## IPEX Validation
**Sentence:** IPEX Validation requires the Discloser to provide Proof of Issuance (commitment to Most Compact Form SAID) and Proof of Disclosure (recursive SAD expansion); this two-proof structure supports bulk issuance inclusion without leaking correlation.
**Score:** fluent

## Issuer Commitment Rules
**Sentence:** The Issuer MUST provide a verifiable commitment on the SAID of the Most Compact Form as defined by the Schema; this single commitment functions as a hash-tree root providing Proof of Issuance for any Schema-authorized variant.
**Score:** fluent

## Blinded State Disclosure
**Sentence:** A blinded Registry hides Credential State from all observers except the designated Discloser; the blind is derived from a Shared Secret Salt and the TEL event sequence number, so only the Issuer and Discloser can unblind the current state from the published BLID.
**Score:** fluent

## Bound Blinded Attribute Block
**Sentence:** The Bound Blinded Attribute Block extends the Blinded Attribute Block with `bn` (bound Issuee key event sequence number) and `bd` (bound Issuee key event SAID), binding Credential State to the Issuee's key state at publication time.
**Score:** fluent

## Tiered selective disclosure mechanisms
**Sentence:** ACDC provides tiered Selective Disclosure: (1) Partial via private Attribute sections, (2) Selective via Aggregate Section and AGID Inclusion Proof, (3) de-correlation via bulk-issued ACDCs, (4) full de-correlation via Independent AID and Independent Registry bulk-issued ACDCs.
**Score:** fluent

## Basic Bulk Issuance Procedure
**Sentence:** The Issuer and Issuee establish a Shared Secret Salt and use hierarchical deterministic derivation paths to derive all UUID values across bulk-issued private ACDCs, allowing the Issuee to regenerate each ACDC from salt and index.
**Score:** awkward
**Finding:** ACDC-Z3-002 — No UL term for the hierarchical deterministic derivation mechanism. Proposed: **HierarchicalDerivationPath** or **BulkDerivationProtocol**.

## Independent AID Bulk Issued ACDCs
**Sentence:** Each member of a bulk-issued set uses a unique Issuee AID generated via hierarchical deterministic key derivation, preventing colluding Disclosees from correlating presentations via shared AID.
**Score:** fluent

## Independent Registry Bulk-Issued ACDCs
**Sentence:** Each bulk-issued ACDC has its own TEL with its own REGID, eliminating the shared Registry SAID as a correlation point while permitting uncorrelatable presentations.
**Score:** fluent
