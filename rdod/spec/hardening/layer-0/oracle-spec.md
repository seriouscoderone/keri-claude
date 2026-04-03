# Oracle-Spec Findings -- Layer 0

## Summary
- Questions addressed: 35 (32 spec-targeted + 3 keripy-targeted with spec coverage)
- HIGH confidence: 18
- MEDIUM confidence: 11
- LOW/silent: 6

---

## Findings

### OQ-1: Superseding rules duplicated across delegation/recovery and integrity/recovery
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Superseding Rules for Recovery at a given location, SN"
- **Normative text:** > "A0. Any rotation event may supersede an Interaction event at the same sn where that interaction event is not before any other rotation event. A1. A non-delegated rotation may not supersede another rotation. A2. An interaction event may not supersede any event. B. A delegated rotation may supersede the latest-seen delegated rotation at the same sn under either of the following conditions: [B1, B2, B3]. C. IF neither A. nor B. is satisfied, then recursively apply rules A. and B. to the delegating events..."
- **Domain rule:** The superseding rules form a single unified cascade: A-rules are for non-delegated contexts, B-rules for delegated contexts, and C is the recursive bridge. The spec presents them as a single coherent set, not split between domains. Rule A applies universally (non-delegated rotation supersedes interaction). Rules B/C only apply to delegated identifiers.
- **Spec change required:** The canonical owner of the full superseding rule set should be integrity/recovery, since the rules are about recovering KEL integrity. The delegation/recovery domain should import the B-rules and C-rule from integrity/recovery, not redefine them. Delegation/recovery adds the delegation-specific context (seal verification, delegator KEL traversal) but the superseding logic itself belongs to integrity/recovery.

### OQ-2: B3 superseding rule definition contradicts between UL and verification.yaml
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Superseding Rules for Recovery at a given location, SN"
- **Normative text:** > "B3. The sn of the superseding rotation's delegating event is the same as the sn of the superseded rotation's delegating event in the delegator's KEL, and the superseding rotation's delegating event is a rotation, and the superseded rotation's delegating event is an interaction, i.e., the superseding rotation's delegating event is itself a superseding rotation of the superseded rotation's delegating interaction event in its delegator's KEL."
- **Domain rule:** B3 is an event-type comparison (rotation beats interaction at the same sn in the delegator's KEL), NOT a SAID lexicographic tiebreaker. The SAID-based tiebreaker in verification.yaml is an artifact that does not appear in the normative spec.
- **Spec change required:** Remove the SAID lexicographic tiebreaker from verification.yaml. B3 compares event types at the delegator level: if both delegating events are at the same sn, a rotation-type delegating event supersedes an interaction-type delegating event.

### OQ-3: Recursive delegation termination algorithm (Rule C)
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Superseding Rules for Recovery at a given location, SN"
- **Normative text:** > "C. IF neither A. nor B. is satisfied, then recursively apply rules A. and B. to the delegating events of those delegating events and so on until either A. or B. is satisfied, or the root KEL of the delegation which MUST be undelegated has been reached. C1. IF neither A. nor B. is satisfied by the recursive application of C. to each delegator's KEL in turn, i.e., the root KEL of the delegation has been reached without satisfaction, then the superseding rotation is discarded. The terminal case of the recursive application of C. will occur at the root KEL, which by definition MUST be non-delegated therefore either A. or B. MUST be satisfied, or else the superseding rotation MUST be discarded."
- **Domain rule:** The algorithm is: (1) At the current level, attempt to satisfy A or B. (2) If neither is satisfied, move up to the delegator's KEL and compare the delegating events of the two competing delegated rotations using A and B again. (3) Repeat until either a rule is satisfied (superseding accepted) or the root non-delegated KEL is reached. (4) At the root (which MUST be non-delegated), only A-rules apply. If A is not satisfied at the root, the superseding rotation is discarded.
- **Spec change required:** The DDD spec should document this as a recursive function: `supersedes(event1, event2, kel) -> bool` that walks the delegation chain upward. The termination guarantee is that delegation chains are finite and roots are always non-delegated.

### OQ-4: First-seen rule override conditions for superseding recovery rotations
- **Confidence:** HIGH
- **Source:** KERI Spec, Sections "First Seen Policy" and "Superseding Recovery"
- **Normative text:** > "Although an event can never be unseen, in some special cases, it may be superseded by a different version of an event at the same location." And: "To supersede an event means that after an event has already been accepted as first seen into a KEL, a different event at the same location (same sequence number) is accepted that supersedes that pre-existing event."
- **Domain rule:** The first-seen rule is NOT broken by superseding recovery. Instead, superseding creates a fork: the original first-seen event remains in the KEL (on a disputed branch) and the superseding event becomes the trunk. Both events retain their first-seen numbers. The superseding rules (A0-C1) define the precise conditions. At a witness, the witnessing policy follows the superseding recovery rules: "the first seen version of an event always wins... The exception to this general rule is that a rotation event may provide a superseding recovery."
- **Spec change required:** The DDD spec's consensus domain should model superseding as a fork operation, not an override of first-seen. The first-seen ordinal is preserved for both branches. Add a guard condition on the witness acceptance pipeline that checks superseding rules before accepting a second event at the same sn.

### OQ-5: PDE vs MDE escrow queue distinction
- **Confidence:** LOW
- **Source:** KERI Spec (silent on escrow queue taxonomy)
- **Normative text:** The spec mentions "escrow" only in the context of receipts: > "A Validator that receives a Receipt for an event that the Validator has not yet received can escrow the Receipt and its attached signatures." The spec does not define PDE, MDE, or any specific escrow queue taxonomy.
- **Domain rule:** The escrow queue taxonomy (PDE, MDE, OOE, PSE, PWE, LDE, etc.) is an implementation concern not specified in the protocol. The protocol specifies validation conditions but not the escrow mechanism.
- **Spec change required:** This is a design/keripy question. The DDD spec should define escrow queues based on domain logic, not import undefined protocol-level names. The distinction between "missing seal" and "unverifiable seal" should be a domain design decision.

### OQ-6: Cross-layer import mechanism for Layer 0 domains
- **Confidence:** LOW
- **Source:** KERI Spec (no concept of layer ordering)
- **Normative text:** N/A -- the protocol spec does not have a layered architecture concept.
- **Domain rule:** This is purely a DDD design question. The protocol spec treats threshold satisfaction, witness checking, and delegation checking as parts of a unified validation process without layering.
- **Spec change required:** This is a design decision. Layer 0 should define port interfaces (abstract contracts) that higher layers implement. The identity/establishment domain can declare it needs a ThresholdSatisfaction port without importing the concrete implementation from identity/thresholds.

### OQ-7: Delegation escrow timeout contradiction (3600s vs 86400s)
- **Confidence:** LOW
- **Source:** KERI Spec (silent on escrow timeouts)
- **Normative text:** The spec does not specify any escrow timeout values.
- **Domain rule:** Escrow timeouts are implementation parameters, not protocol-level constants.
- **Spec change required:** This is a keripy/design question. The DDD spec should either pick a normative default or mark timeouts as configurable parameters. The contradiction between 3600s and 86400s must be resolved by checking keripy's actual implementation.

### OQ-8: EventSeal and EventLocationSeal type definitions missing from types.yaml
- **Confidence:** HIGH
- **Source:** KERI Spec, Sections "Seal Count Codes" and "Source Event seal"
- **Normative text:** The KERI spec defines seal types normatively:
  - SealDigest: `[d]` -- cryptographic digest as seal
  - SealRoot: `[rd]` -- Merkle tree root digest as seal
  - SealTrans (Source Event Seal): `[s, d]` -- source event with implied AID
  - SealEvent (Source Triple): `[i, s, d]` -- source key event as seal
  - SealLast: `[i]` -- source AID last establishment event as seal
  - SealBack: `[bi, d]` -- backer AID metadata digest as seal
  - TypedDigest: `[t, d]` -- typed digest as seal
- **Domain rule:** The complete seal type inventory is defined by the CESR count code seal table. SealTrans (SealSourceCouple) = `{s, d}` with AID implied by context; SealEvent (SealSourceTriple) = `{i, s, d}`. There is no "EventLocationSeal" with `{i, s, t, p}` in the normative spec -- that is a keripy implementation type.
- **Spec change required:** Define all seal types in cesr/primitives or a shared kernel as: DigestSeal, MerkleRootSeal, SourceEventSeal (s,d -- implied AID), EventSeal (i,s,d), LastEstSeal (i), BackerSeal (bi,d), TypedDigestSeal (t,d). Remove EventLocationSeal unless the keripy oracle confirms it is needed.

### OQ-9: Can non-transferable identifiers produce interaction events?
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Next key digest list field"
- **Normative text:** > "When the Next, n field value in an Inception or Delegated Inception event is an empty list, then the associated AID MUST be deemed non-transferable, and no more key events MUST be allowed in that KEL."
- **Domain rule:** Non-transferable identifiers CANNOT produce any key events after inception -- including interaction events. "No more key events MUST be allowed" is absolute. This applies to witnesses (which are non-transferable) and any other non-transferable AID.
- **Spec change required:** The DDD spec's NonTransferableAnchoringError is correct. The restriction is absolute: non-transferable = inception only, no rotation, no interaction.

### OQ-10: Semantic difference between seals in interaction vs establishment events
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Sections "Sealing" and "Configuration traits field"
- **Normative text:** > "One primary use case for sealing in KERI is delegated AIDs. The Delegator (AID) approves (endorses) the associated delegation of a delegated event in the Delegatee's KEL by sealing the SAID of that delegated event in the Delegator's KEL." And: "the seal is also bound to the key state of the endorser at the location in the KEL where the seal appears. This enables the validity of the endorsement to persist in spite of later changes to the key state."
- **Domain rule:** All seals are cryptographically equivalent -- the seal itself is just a digest binding. However, seals in establishment events are inherently more authoritative because: (1) they are signed by pre-rotated keys (first-time, one-time use), (2) they are bound to a key state transition, and (3) they cannot be created by an attacker who only compromises current signing keys. The DND trait explicitly acknowledges this by noting "A delegation seal MAY appear in an Interaction event. Interaction events are less secure than rotation events."
- **Spec change required:** The DDD spec should note that seal location does not change the seal's verification procedure, but does affect its security properties. Seals in establishment events have stronger security guarantees. The anchoring domain should document this distinction without changing the verification algorithm.

### OQ-11: C3 on_failure escrow target mismatch (MAE vs MCE)
- **Confidence:** LOW
- **Source:** KERI Spec (silent on escrow queue names for credential validation)
- **Normative text:** The KERI spec does not define credential-specific escrow queues. TEL/ACDC validation is specified in the ACDC spec.
- **Domain rule:** The escrow queue naming is a DDD design concern. "MCE" (Missing Chain Escrow) is for ACDC edge chain verification; "MAE" (Missing Authorization/Anchor Escrow) would be for missing KEL anchor events.
- **Spec change required:** This is a design question. C3_kel_anchor failures should route to MAE (Missing Authorization Escrow), not MCE. Fix the validation DAG to use the correct escrow target.

### OQ-12: KRAM signature format specification
- **Confidence:** LOW
- **Source:** KERI Spec (silent on KRAM specifics)
- **Normative text:** The KERI spec does not define KRAM (KERI Request Authentication Method). KRAM is a Signify/KERIA protocol extension not in the core KERI specification.
- **Domain rule:** KRAM is not part of the core KERI protocol specification. It is defined by the Signify protocol implementation.
- **Spec change required:** This must be resolved via the keripy/keria oracle or the Signify specification. The DDD spec should reference KRAM as an external protocol dependency, not attempt to define its format.

### OQ-13: KRAM timeliness window duration
- **Confidence:** LOW
- **Source:** KERI Spec (silent on KRAM)
- **Normative text:** N/A -- KRAM is not defined in the KERI spec.
- **Domain rule:** KRAM timeliness is not a core KERI protocol parameter.
- **Spec change required:** Defer to keria oracle. The DDD spec should make the timeliness window a configurable parameter in the cloud-agent-service domain, not a hardcoded constant.

### OQ-14: HKDF vs argon2 for UUID derivation in blinding domain
- **Confidence:** MEDIUM
- **Source:** ACDC Spec, Section "Universally Unique Identifier (UUID) Fields"
- **Normative text:** > "The purpose of the UUID, u, field in any block is to provide sufficient cryptographic entropy to ensure that the SAID of the block is cryptographically bound to a unique source of randomness... The UUID, u field may be considered a salty nonce."
- **Domain rule:** The ACDC spec treats UUIDs as high-entropy random values (salty nonces). It does not specify HKDF or argon2 for UUID derivation. The UUID is expected to be a "fully qualified high entropy pseudo-random string." The derivation method is implementation-specific.
- **Spec change required:** The DDD spec should specify: argon2 for initial salt stretching from a passphrase (slow, intentional), HKDF for deriving per-event UUIDs from a master secret (fast, deterministic). These serve different purposes and should both be documented with their respective use cases.

---

### OQ-30: DND (Do Not Delegate) trait -- checked at inception or each establishment event?
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Configuration traits field"
- **Normative text:** > "`DND` Do-Not-Delegate True This KEL MUST NOT act as a delegator of delegated AIDs" -- where the "True" column is "Inception Only."
- **Domain rule:** DND is an inception-only trait. It MUST only appear in the inception event and cannot be added via rotation. Once set at inception, it permanently prevents the AID from acting as a delegator. If DND is not set at inception, it cannot be retroactively applied.
- **Spec change required:** The DDD spec should clarify that DND is immutable and inception-only. The delegation/authorization domain's validation should check the delegator's inception event for DND, not the current key state.

### OQ-31: Delegation workflow ordering -- witnesses first or approval first?
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Validation Rules"
- **Normative text:** > "Given a local delegated event, the event's Delegatee can sign and accept that event into its copy of that event's KEL. The Delegatee then SHOULD propagate that event with attached signatures to the event's witnesses for receipting. The Delegatee also SHOULD propagate that event with attached controller signatures and attached witness signatures (if witnessed) to the event's delegator for approval via an anchored seal."
- **Domain rule:** The workflow is: (1) Delegatee signs and creates the event, (2) Delegatee sends to witnesses for receipting, (3) Delegatee sends event with controller signatures AND witness signatures to delegator for approval. Witnesses come BEFORE delegator approval. The delegator MUST first verify "the event's Delegatee signatures and witness signatures (if witnessed) before it can accept."
- **Spec change required:** The DDD spec should order the workflow as: delegatee-sign -> witness-receipt -> delegator-approval -> publication. PWE (missing witness) should indeed precede PDE (missing delegation) in the escrow cascade.

### OQ-32: DisclosureMode 7 variants vs FSM 3 states
- **Confidence:** MEDIUM
- **Source:** ACDC Spec, Section "Graduated Disclosure"
- **Normative text:** > "There are several graduated disclosure mechanisms as follows: Compact Disclosure, Metadata Disclosure, Partial Disclosure, Nested Partial Disclosure, Full Disclosure, Selective Disclosure, Bulk-issued Instance Disclosure. All the Graduated Disclosure mechanisms MAY be used in combination."
- **Domain rule:** The ACDC spec does not model these as FSM states. They are independent mechanisms that MAY be combined. Compact/Partial/Full form a natural progression (the FSM's 3 states). The other mechanisms are orthogonal axes: Selective is an alternative to Partial (operates on aggregate sections vs attribute sections), Metadata is a pre-disclosure phase, Nested Partial extends Partial to hierarchical data, and Bulk-issued is an issuance-time mechanism.
- **Spec change required:** The DDD spec's 3-state FSM (compact -> partial -> full) correctly models the core progression. The other modes should be modeled as orthogonal properties or separate operations, not FSM states. Selective disclosure has its own progression (blinded -> disclosed per element). Metadata is a pre-disclosure mode that precedes compact.

### OQ-33: Metadata and BulkIssued disclosure progression rules
- **Confidence:** MEDIUM
- **Source:** ACDC Spec, Section "Graduated Disclosure"
- **Normative text:** > "Metadata Disclosure happens with a Metadata ACDC is used to disclose any part of an ACDC... the purpose of a metadata ACDC is to provide a mechanism for a Discloser to make cryptographic commitments to the metadata of a yet-to-be-disclosed private ACDC without providing any point of correlation to the actual top-level SAID." And: "Bulk-issued Instance Disclosure relies on issuing multiple instances of a given ACDC, each a copy but with unique instance identifiers."
- **Domain rule:** Metadata mode is a pre-disclosure phase -- it discloses enough to negotiate terms without revealing the actual ACDC SAID. It can progress to Compact (revealing the ACDC SAID) and then follow the normal compact -> partial -> full path. Bulk-issued is not a disclosure mode but an issuance-time mechanism. Each bulk-issued instance independently follows the normal disclosure progression.
- **Spec change required:** Extend the FSM with metadata as an optional pre-state: metadata -> compact -> partial -> full. Bulk-issued should be modeled as an issuance property, not a disclosure mode.

### OQ-34: Chain-link confidentiality guard at Layer 0
- **Confidence:** MEDIUM
- **Source:** ACDC Spec, Section "Exploitation Protection Mechanisms"
- **Normative text:** The ACDC spec describes chain-link confidentiality as a contractual mechanism enforced through IPEX exchanges, not as a cryptographic gate. The spec is silent on how a disclosure domain at Layer 0 would check agreement status.
- **Domain rule:** Chain-link confidentiality is a contractual/exchange-level concern, not a cryptographic validation. At Layer 0, the disclosure domain should accept a boolean `terms_agreed` flag or a callback interface as its guard input, not attempt to query the exchange domain directly.
- **Spec change required:** The disclosure domain's partial -> full guard should accept a `terms_agreed: boolean` parameter provided by the caller. The IPEX exchange domain (higher layer) is responsible for determining whether terms have been agreed and passing the result down.

### OQ-35: Complete CESR prefix code set for transferable/non-transferable identifiers
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Master code table for genus/version -_AAACAA"
- **Normative text:** The CESR code table defines the following verification key codes:
  - `B` -- Ed25519 non-transferable prefix public verification key
  - `D` -- Ed25519 public verification key (transferable)
  - `1AAA` -- ECDSA secp256k1 non-transferable prefix public verification key
  - `1AAB` -- ECDSA secp256k1 public verification or encryption key (transferable)
  - `1AAC` -- Ed448 non-transferable prefix public verification key
  - `1AAD` -- Ed448 public verification key (transferable)
  - `1AAI` -- ECDSA secp256r1 verification key non-transferable, basic derivation
  - `1AAJ` -- ECDSA secp256r1 verification or encryption key, basic derivation (transferable)
- **Domain rule:** There are 4 key types, each with transferable and non-transferable variants: Ed25519 (B/D), secp256k1 (1AAA/1AAB), Ed448 (1AAC/1AAD), secp256r1 (1AAI/1AAJ). Additionally, Blake3_256 (`E`) is a self-addressing prefix (digest of inception event). The complete PrefixCode enum should include all 9 codes.
- **Spec change required:** Update the PrefixCode enum to include all 8 key codes plus the Blake3_256 self-addressing code. The transferability classification is: non-transferable = {B, 1AAA, 1AAC, 1AAI}; transferable = {D, 1AAB, 1AAD, 1AAJ}; self-addressing (transferable) = {E}.

### OQ-36: ample() minimum fault tolerance for small witness counts
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Section "Immunity and Availability"
- **Normative text:** > "It can be shown that for any set of N witnesses, there is a threshold M < N that guarantees that at most one sufficient agreement occurs or none at all, despite a dishonest controller -- but where at most F* = N-M of the witnesses are potentially unavailable and at most F < M is duplicitous."
- **Domain rule:** The spec defines the constraint M < N with F* = N-M unavailable and F < M duplicitous. For N=1: M=1, F*=0, F=0 -- no fault tolerance. For N=2: M=2, F*=0, F<2 so F=1 -- one can be duplicitous but none unavailable. The spec does not impose a minimum pool size. A Controller MAY choose any N and corresponding M. The ample() function (which is a keripy implementation) computes M = max(1, ceil((N+1+F)/2)) where F defaults to the optimal BFT value.
- **Spec change required:** The DDD spec should note that f=0 is valid for N=1 (no fault tolerance, the controller accepts this risk). The ample() formula is implementation guidance, not normative. The spec only requires that the chosen M satisfies the immunity constraint.

### OQ-37: V2 version string exact format and regex
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Version 2.XX string field format"
- **Normative text:** > "The format of the Version String is PPPPMmmGggKKKKBBBB. It is 19 characters in length." And: "Serialization length: BBBB integer encoded in Base64 equal to the number of characters (inclusive)." And: "The maximum length of a given field map serialization is thereby constrained to be 64^4 = 2^24 = 16,777,216 characters in length."
- **Domain rule:** V2 version string = `PPPPMmmGggKKKKBBBB.` (19 chars). BBBB is Base64-encoded total serialization length (max 16,777,216). The terminator is `.` (period). Regex pattern: `[A-Z]{4}[A-Za-z0-9_-]{3}[A-Za-z0-9_-]{3}(JSON|CBOR|MGPK|CESR)[A-Za-z0-9_-]{4}\.`
- **Spec change required:** The DDD spec should include this exact format and regex. BBBB is 4 Base64 digits (not chars), each with 64 values, giving 64^4 = 16,777,216 max size. The spec correctly says Base64 encoded.

### OQ-38: Genus/version code parser state management
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Protocol genus/version table"
- **Normative text:** > "The protocol genus/version table is special because its codes modify the interpretation of all subsequent codes from all other tables within the same enclosing Count Code groups." And: "The presence of a genus/version count code that appears as the first element within the framed material of any non-overrideable count code is a standard (expected) use of a genus/version count code."
- **Domain rule:** Genus/version state is maintained per-group (within the "enclosing Count Code groups"), not per-stream or per-frame. When a genus/version code appears as the first element in a group, it modifies interpretation of all subsequent codes within that group. The parser must track "active genus" as scoped state within each group.
- **Spec change required:** The DDD spec should model genus/version as a scoped context parameter passed through the parser, not global mutable state. The composition domain's parser should accept a genus context that can be overridden at group boundaries.

### OQ-39: Signable count codes (-E, -F, -G) -- signed content boundary
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Universal Count Codes"
- **Normative text:** From the count code table:
  - `-E##` -- ESSR wrapper signable up to 4,095 quadlets/triplets
  - `-F##` -- CESR native message top-level fixed field signable up to 4,095 quadlets/triplets
  - `-G##` -- CESR native message top-level field map signable up to 4,095 quadlets/triplets
- **Domain rule:** The signable count codes (-E, -F, -G) frame the signed content by count. The count (in quadlets/triplets) specifies the total size of the signed content. Everything within that count is the signed content. What follows after the counted content is the signature attachment group (using other count codes like -C). The boundary is determined entirely by the count.
- **Spec change required:** The DDD spec should document that signable count codes use the count to delineate signed content boundaries. The parser reads exactly `count` quadlets of content, then expects attachment groups to follow.

### OQ-40: Canonical KERI/ACDC genus CesrGroup variant enumeration
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Genus Specific Count Codes" in the KERI/ACDC table
- **Normative text:** The genus-specific count codes for KERI/ACDC 2.00 include (from the table at line 2313+):
  Small codes: `-K`, `-L`, `-M`, `-N`, `-O`, `-P`, `-Q`, `-R`, `-S`, `-T`, `-U`, `-V`, `-W`, `-X`, `-Y`, `-Z`, `-a`, `-b`, `-c`, `-d`
  Plus big variants: `--K`, `--L`, etc.
- **Domain rule:** The canonical KERI/ACDC genus groups include: ControllerIdxSigs (-K), WitnessIdxSigs (-L), NonTransReceiptCouples (-M), TransReceiptQuadruples (-N), FirstSeenReplayCouples (-O), TransIdxSigGroups (-P/-X have different meanings per version), DigestSealSingles (-Q), MerkleRootSealSingles (-R), SealSourceCouples (-S), SealSourceTriples (-T), SealSourceLastSingles (-U), BackerRegistrarSealCouples (-V), TypedDigestSealCouples (-W), plus specialized groups for signatures and blinded states (-a, -b). The full list must be extracted from the specific CESR version table.
- **Spec change required:** The DDD spec's CesrGroup union should enumerate all genus-specific count codes from the CESR spec's KERI/ACDC 2.00 table. This is a reference data extraction task.

### OQ-41: Enclosure code -H encoding for non-native content inside count code groups
- **Confidence:** HIGH
- **Source:** CESR Spec, Sections "Cold start Stream parsing problem" and count code table
- **Normative text:** > "When nesting inside CESR groups, a non-native CESR serializations MUST be encoded as a CESR primitive and then enclosed in a special count code for non-native messages." The -H code is: "-H## Message group for enclosed non-native message to 4,095 quadlets/triplets."
- **Domain rule:** The -H enclosure code wraps a complete non-native serialization (JSON, CBOR, or MGPK field map) as raw bytes within a CESR group. The enclosed content is a version-string-prefixed field map (since all non-native serializations at the top level must have a version string as their first field). The count measures the total size of the enclosed non-native content in quadlets/triplets.
- **Spec change required:** The DDD spec should document that -H contains a complete non-native message including its version string prefix. The parser should detect the serialization type from the enclosed content's leading bytes.

### OQ-42: Tritet 0b000 ("Free"/"Annotated T-domain") practical usage
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Top-level Stream Starting Tritets" and "Performant resynchronization"
- **Normative text:** > "Starting Tritet 0b000: Annotated 'T' domain." And: "The white space ASCII characters for line feed, carriage return, and tab all have starting tritets of 0b000. Thus a parser would know to de-annotate such a stream before re-parsing."
- **Domain rule:** Tritet 0b000 indicates annotated T-domain content -- specifically whitespace characters (line feed 0x0A, carriage return 0x0D, tab 0x09) used for human-readable formatting of CESR streams. These are NOT standalone primitives. The parser should strip (de-annotate) these characters and continue parsing.
- **Spec change required:** The DDD spec should model 0b000 as an annotation/whitespace case in the cold-start dispatch, not as a content-bearing tritet. The parser strips whitespace and re-dispatches.

### OQ-43: End-Role -- is "mediator" a valid role?
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Section "Authorized Endpoint Disclosure"
- **Normative text:** > "These components include but are not limited to Controllers, Agents, Backers (Witness or Registrar), Watchers, Jurors, Judges, and Forwarders." The spec uses "role" in end/role reply messages with examples showing `"role": "witness"` but does not provide an exhaustive enumeration.
- **Domain rule:** The KERI spec does not provide an exhaustive role enumeration. It lists example components (Controllers, Agents, Backers, Watchers, Jurors, Judges, Forwarders) but says "include but are not limited to." "Mediator" does not appear in the KERI spec. The role set is extensible.
- **Spec change required:** The DDD spec should define the known roles from the spec (witness, controller, agent, watcher, registrar, judge, juror, forwarder) and note that the set is extensible. "Mediator" should be flagged as pending KSWG standardization. The role enum should have an extension mechanism.

---

### OQ-84: "Latest-seen delegated rotation" in distributed systems
- **Confidence:** HIGH
- **Source:** KERI Spec, Section "Superseding Rules for Recovery"
- **Normative text:** > "B. A delegated rotation may supersede the latest-seen delegated rotation at the same sn." And: "The latest-seen delegated rotation constraint in B. means that any earlier delegated rotations can NOT be superseded."
- **Domain rule:** "Latest-seen" is local to each validator's observation. Different validators may have different "latest-seen" events at the same sn. This is by design -- KERI's security model is validator-local, not globally consistent. Two validators with different latest-seen events will apply superseding rules to different targets, which may produce different outcomes. This is acceptable because the superseding rules produce convergent results once all validators observe the same events (eventual consistency). The spec explicitly acknowledges that different copies of a KEL may have different fn orderings.
- **Spec change required:** The DDD spec should document that "latest-seen" is validator-local and that convergence is eventual, not immediate. The integrity/recovery domain should note this as an expected property, not a defect.

### OQ-85: B1 tiebreaker using first-seen number at delegator
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Section "Superseding Rules for Recovery"
- **Normative text:** > "B1. The superseding rotation's delegating event is later than the superseded rotation's delegating event in the delegator's KEL, i.e., the sn of the superseding event's delegation is higher than the sn of the superseded event's delegation."
- **Domain rule:** B1 compares the sn (sequence number) of the delegating events in the delegator's KEL, NOT the fn (first-seen number). Sequence numbers are globally consistent (protocol-determined), unlike fn which is observer-local. B1 produces universal agreement because sn is deterministic: if the superseding rotation's delegating event has a higher sn than the superseded's, every validator that sees both delegating events will agree.
- **Spec change required:** The DDD spec should clarify that B1 uses sn (sequence number) comparison, not fn. This produces universal agreement because sn is protocol-assigned, not observation-dependent.

### OQ-86: Inception duplicity -- always irreconcilable?
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Sections "First Seen Policy" and "Superseding Recovery"
- **Normative text:** > "A0. Any rotation event may supersede an Interaction event... A1. A non-delegated rotation may not supersede another rotation. A2. An interaction event may not supersede any event." The superseding rules only cover events at the same sn. An inception is always at sn=0. A conflicting inception at sn=0 is another version of the same location.
- **Domain rule:** A conflicting inception at sn=0 with a different SAID is duplicitous. Since A1 says "A non-delegated rotation may not supersede another rotation," and inception is an establishment event (not an interaction), a conflicting inception cannot be superseded by any mechanism in the A-rules. For delegated inceptions, B-rules could theoretically apply, but the first-seen policy means the first-seen inception is authoritative. A conflicting inception indicates key compromise at the most fundamental level, making the AID irreconcilable.
- **Spec change required:** The DDD spec should document that inception duplicity is indeed irreconcilable for non-delegated AIDs. For delegated AIDs, the delegator's cooperative approval provides an additional check that makes conflicting delegated inceptions harder to produce.

### OQ-87: CESR group codes for blinded state attachments
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Genus Specific Count Codes"
- **Normative text:** From the KERI/ACDC genus count code table:
  - `-a##` -- Blinded State quadruples dig+uuid+said+state up to 4,095 quadlets/triplets
  - `-b##` -- Bound Blinded State Sextuples blid+uuid+said+state+bsnu+bsaid up to 4,095 quadlets/triplets
  (Plus big variants `--a#####` and `--b#####`)
- **Domain rule:** The CESR spec defines blinded state group codes as genus-specific count codes in the KERI/ACDC table. The blinding domain should reference these codes from cesr/composition, not define them itself.
- **Spec change required:** The blinding domain should have an outbound dependency on cesr/composition for these group codes. The codes are CESR-level definitions, not blinding-domain definitions.

### OQ-88: Selective disclosure A/a field distinction without ACDC type at Layer 0
- **Confidence:** HIGH
- **Source:** ACDC Spec, Sections "Attribute Section" and "Aggregate Section"
- **Normative text:** > "A selectively disclosable blinded Aggregate section appears at the top level using the field label A. This is distinct from the field label a for a partially disclosable Attribute section."
- **Domain rule:** The distinction between `A` (Aggregate -- selectively disclosable) and `a` (Attribute -- partially disclosable) is a field-label-level distinction defined by the ACDC spec. At Layer 0, the privacy subdomains can reason about this distinction using the field label alone without needing the full ACDC type. The aggregation domain handles `A` fields (computing AGIDs from lists of blinded block SAIDs), while disclosure handles `a` fields (compact/partial/full progression).
- **Spec change required:** At Layer 0, the privacy domains should accept field label (`A` or `a`) and the corresponding section value as opaque inputs. No full ACDC type is needed -- the field label determines which disclosure/aggregation mechanism applies.

### OQ-89: Disclosure domain forward reference to Credential type
- **Confidence:** MEDIUM
- **Source:** ACDC Spec (the credential structure is defined there but is complex)
- **Normative text:** The ACDC spec defines the full credential structure with sections (v, d, u, i, rd, s, a/A, e, r), but the disclosure domain only needs the section SAIDs and the `u` field presence to determine disclosure mode.
- **Domain rule:** At Layer 0, the disclosure domain should accept a generic SAD map (field map with SAID), not a fully typed Credential. The disclosure mode is determined by: (1) presence/absence of top-level `u` field (public vs private), (2) section field labels (`a` vs `A`), (3) `oneOf` schema structure. None of these require the full Credential type.
- **Spec change required:** Replace the forward reference to `types://credential-lifecycle#Credential` with a generic `SadMap` or `DisclosableBlock` interface that has `said()`, `has_uuid()`, and `section_label()` methods. This avoids the cross-layer dependency.

### OQ-90: Encryption-related CESR codes -- scope for primitives domain
- **Confidence:** MEDIUM
- **Source:** CESR Spec, Section "Master code table for genus/version -_AAACAA"
- **Normative text:** The code table includes: `C` (X25519 public encryption key), `O` (X25519 private decryption key), `P` (X25519 cipher of seed), `1AAH` (X25519 cipher of salt), and multiple sealed box cipher codes (4C, 5C, 6C, 4D, 5D, 6D, etc.).
- **Domain rule:** Encryption codes are part of the CESR master code table and are in scope for the primitives domain as code table entries with Sizage definitions. However, the behavioral logic (encrypt/decrypt operations) can be deferred to a separate domain. The primitives domain should handle encoding/decoding of encryption primitives but need not implement cryptographic operations.
- **Spec change required:** Include encryption-related CESR codes in the primitives domain's code table with their Sizage entries. Defer Encrypter/Decrypter behavioral types to a future encryption subdomain. The code table should be complete even if not all types have full behavioral implementations at Layer 0.

---

## Bonus: HIGH-priority keripy questions with spec coverage

### OQ-15: Idempotent duplicate event handling (keripy target, spec has partial coverage)
- **Confidence:** MEDIUM
- **Source:** KERI Spec, Section "Witnessing Policy"
- **Normative text:** > "Later messages or receipts from other witnesses may not change any existing entry in the log (the log is append-only, i.e., immutable) unless they are correctly reconcilable superseding events. Each witness also adds to its log any verified signatures from consistent receipts it receives from other witnesses."
- **Domain rule:** The KEL is append-only, but signatures ARE accumulated. "Each witness also adds to its log any verified signatures from consistent receipts." A duplicate event with the same SAID triggers signature accumulation, not discard. The event itself is not re-accepted, but its additional signatures are merged into the existing entry.
- **Spec change required:** The DDD spec should model duplicate handling as: same SAID = accumulate signatures; different SAID at same sn = duplicity (or superseding if rules are met). The ValidationResult.accepted should have a sub-case for "already accepted, signatures accumulated."

### OQ-22: Partial rotation -- can new signing keys include keys NOT from the pre-committed set? (keripy target, spec has coverage)
- **Confidence:** HIGH
- **Source:** KERI Spec, Sections "Rotation using pre-rotation" and "Reserve Rotation"
- **Normative text:** > "The list of newly current public keys MUST include the old next threshold-satisficing subset of old next public keys from the most recent prior Establishment event." And from the Reserve Rotation example (line 3739): "Suppose the current public key list does not include a proper subset of the prior-next key list... the current key list is either identical to the prior-next key list or is a superset of the prior-next key list. Nonetheless, such a Rotation may change the current key list and or threshold with respect to the prior-next key list."
- **Domain rule:** YES, new signing keys CAN include keys not from the pre-committed set. The requirement is that the current key list MUST include a threshold-satisficing subset of the prior-next keys. It MAY also include additional new keys. This is called "Augmented Rotation" in the spec. The key list is a superset of the pre-committed subset plus any new keys the controller adds.
- **Spec change required:** The DDD spec should explicitly allow augmented rotation: the current key list = (threshold-satisficing subset of prior-next keys) UNION (any additional new keys). Both the prior-next threshold and the current threshold must be satisfiable with respect to the current key list.

### OQ-23: Pre-rotation binding -- positional or cross-position via ondex? (keripy target, spec has coverage)
- **Confidence:** HIGH
- **Source:** CESR Spec, Section "Indexed codes" and KERI Spec key management
- **Normative text:** > "Some applications of CESR, such as KERI, require dual-indexed signatures (i.e., each signature has two indices) to support pre-rotation with partial or reserved participants in a rotation. With partial rotation, a given signature may contribute to the signing threshold for two different thresholds, each on two different lists of keys, where the associated key may appear at a different location in each list."
- **Domain rule:** Cross-position matching IS valid and is the entire purpose of the dual-index (index/ondex) mechanism. A signature with index=2 and ondex=0 means: the key at position 2 in the current signing key list, which corresponds to position 0 in the prior-next rotation key list. The KERI spec says key appearance order "may be different between the two key lists."
- **Spec change required:** The DDD spec's BindingVerification must use ondex mapping, not simple positional comparison. The verification algorithm: for each signature with (index, ondex), verify the signature against current_keys[index] AND verify that digest(current_keys[index]) matches prior_next_digests[ondex].
