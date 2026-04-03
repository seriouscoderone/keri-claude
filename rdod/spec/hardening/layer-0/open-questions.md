# Layer 0 Open Questions

## Summary
- Total raw questions: 105
- After deduplication: 93
- By oracle: spec (32), keripy (22), keria (9), design (30)
- By priority: HIGH (29), MEDIUM (40), LOW (24)

---

## HIGH Priority -- Spec Oracle

### OQ-1: Superseding rules duplicated across delegation/recovery and integrity/recovery
- **Domain(s):** delegation/recovery, integrity/recovery
- **Source(s):** plan-C Q-DR-5, plan-C Q-IR-1, plan-C Q-CROSS-1, plan-C Q-CROSS-4
- **Question:** The superseding rules (A0-A2, B1-B3, C) are defined in both delegation/recovery and integrity/recovery. Which domain is the canonical owner of these rules?
- **Context:** Both domains define a SupersedingRule type with overlapping but not identical variant sets. This creates ambiguity about which domain is authoritative and leads to type duplication. For clean DDD, one domain should own the definitions and the other should import them. Non-delegated rules (A0-A2) seem to belong to integrity/recovery; delegated rules (B1-B3, C) seem to belong to delegation/recovery. But currently both define all rules.
- **Oracle target:** spec

### OQ-2: B3 superseding rule definition contradicts between UL and verification.yaml
- **Domain(s):** integrity/recovery
- **Source(s):** plan-C Q-IR-2
- **Question:** Rule B3 is described in the UL as "superseding event's delegating event is a rotation superseding the superseded event's delegating interaction" (event type comparison: rot > ixn). But verification.yaml describes B3 as a SAID lexicographic tiebreaker. Which is the correct B3 rule?
- **Context:** These are two completely different operations. The verification.yaml has a 4th-level tiebreaker using SAID comparison that does not appear in the UL. If the SAID-based tiebreaker is real, it should be in the UL. If it is an SMT formalization artifact, it should be removed from verification.yaml. This affects the total ordering guarantee of the superseding cascade.
- **Oracle target:** spec

### OQ-3: Recursive delegation termination algorithm (Rule C)
- **Domain(s):** delegation/recovery
- **Source(s):** plan-C Q-DR-1
- **Question:** For delegation chains of depth > 2, what is the concrete algorithm for recursive superseding evaluation? At each level, are B1/B2/B3 applied first before recursing, or are all rules at each level evaluated before moving to the parent?
- **Context:** The UL says "recursion always terminates because delegation chains are finite and the root is always non-delegated." But the concrete step-by-step algorithm is not spelled out. This matters for implementation correctness and for verifying that the algorithm produces consistent results across validators.
- **Oracle target:** spec

### OQ-4: First-seen rule override conditions for superseding recovery rotations
- **Domain(s):** accountability/consensus
- **Source(s):** plan-D Q-CONS-2
- **Question:** Under what precise conditions can a superseding recovery rotation override the first-seen rule at a witness? The UL mentions this as an exception but does not define the conditions.
- **Context:** The first-seen rule is a fundamental invariant of KERI consensus. If superseding rotations can break it, the exact conditions must be specified to prevent abuse. Is this a separate port operation, a guard on applyFirstSeen, or an entirely different code path?
- **Oracle target:** spec

### OQ-5: PDE vs MDE escrow queue distinction
- **Domain(s):** identity/establishment, delegation/lifecycle
- **Source(s):** plan-A Q-EST-3, plan-C Q-DL-5
- **Question:** What distinguishes a "missing delegation seal" (PDE escrow) from a "present but unverifiable delegation source seal" (MDE escrow)? When exactly does an event go to MDE vs PDE?
- **Context:** Plan-A notes that errors.yaml says PDE = "no matching seal found" and MDE = "source seal attachment present but cannot be matched." The distinction is unclear. Additionally, the ValidationResult.escrowed variant lists only 6 queues (OOE, PSE, PWE, PDE, LDE, Misfit) -- MDE is missing from ValidationResult but present in EscrowDecision (plan-A Q-EST-5). Both delegation/authorization and delegation/lifecycle define errors for missing seals, creating further confusion.
- **Oracle target:** spec

### OQ-6: Cross-layer import mechanism for Layer 0 domains
- **Domain(s):** identity/establishment, identity/state (cross-cutting)
- **Source(s):** plan-A Q-CROSS-3
- **Question:** The identity/establishment UL imports "Threshold Satisfaction" from identity/thresholds (Layer 1) and "Witness Threshold Check" from accountability (Layer 4+). How can Layer 0 import from Layer 1+? Does Layer 0 define abstract interfaces that higher layers implement?
- **Context:** build-order.txt shows identity/establishment at Layer 0, but its dependencies include Layer 1+ domains. This is either a deferred dependency (interface only at Layer 0, implementation at Layer 1+), a runtime dependency that does not affect build order, or an error in the layer assignment. The resolution affects the entire build ordering strategy.
- **Oracle target:** spec

### OQ-7: Delegation escrow timeout contradiction (3600s vs 86400s)
- **Domain(s):** delegation/lifecycle
- **Source(s):** plan-C Q-DL-1
- **Question:** The UL lists 3600s timeout for both PDE and Delegable Event Escrow. But the EscrowCascade integration scenario says PDE has 86400s (24h). The verification.yaml SMT tests 3600s for "both PDE and delegable." Which timeout is authoritative?
- **Context:** This is a direct contradiction between the UL/verification spec and the integration scenario. The difference (1 hour vs 24 hours) is significant for operational behavior and could lead to premature pruning or excessive memory usage.
- **Oracle target:** spec

### OQ-8: EventSeal and EventLocationSeal type definitions missing from types.yaml
- **Domain(s):** identity/anchoring, identity/establishment
- **Source(s):** plan-A Q-ANC-1, plan-A Q-ANC-3, plan-A Q-CROSS-4
- **Question:** EventSeal ({i, s, d}) and EventLocationSeal ({i, s, t, p}) are extensively referenced in the UL and verification.yaml but are NOT defined as formal types in any types.yaml. The identity/establishment UL defines four seal names (SealDigest, SealEvent, SealLast, SealRoot) but not as formal types. Where should all seal types be formally defined?
- **Context:** The cesr/primitives domain defines a Seal discriminated union with digest, event, and eventLocation variants. The identity/anchoring domain defines DigestSeal and LastEstSeal but not EventSeal. There is no single source of truth for the complete seal type inventory. This duplication/omission blocks implementation.
- **Oracle target:** spec

### OQ-9: Can non-transferable identifiers produce interaction events?
- **Domain(s):** identity/anchoring
- **Source(s):** plan-A Q-ANC-5
- **Question:** The domain spec says "interaction events require a transferable identifier." But the KERI spec may allow non-transferable identifiers to have interaction events for some use cases (e.g., witness AIDs producing receipts). Is the non-transferable restriction on interaction events absolute?
- **Context:** If non-transferable AIDs can never produce ixn events, the NonTransferableAnchoringError is correct. If witnesses need ixn events for operational purposes, the restriction needs qualification. This affects the identity/anchoring domain's validation pipeline.
- **Oracle target:** spec

### OQ-10: Semantic difference between seals in interaction vs establishment events
- **Domain(s):** identity/anchoring
- **Source(s):** plan-A Q-ANC-4
- **Question:** Is there any semantic difference between a seal anchored in an interaction event vs a seal anchored in an establishment (rotation) event? Is a seal in a rotation event "more authoritative" because it is backed by a key change, or are they identical from a verification perspective?
- **Context:** The UL says "seals in interaction events are the primary mechanism for committing external data." But establishment events also have an `a` field with seals. Delegation uses seals in both ixn and rot events. The KERI spec should clarify whether seal location affects seal authority or verification procedure.
- **Oracle target:** spec

### OQ-11: C3 on_failure escrow target mismatch (MAE vs MCE)
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q1
- **Question:** In the validation constraint DAG, C3_kel_anchor's on_failure says "escrow to MCE -- missing KEL anchor event." But MCE is "Missing Chain Escrow" (for ACDC edge section chains), not "Missing Anchor Escrow." The errors catalog has a dedicated MissingAuthorizationError with recovery_target MAE. Which escrow queue does C3 route to?
- **Context:** A routing error here means credential events with missing KEL anchors would be placed in the wrong escrow queue, preventing proper resolution when the anchor appears. This is a direct contradiction between the validation DAG and the error catalog.
- **Oracle target:** spec

### OQ-12: KRAM signature format specification
- **Domain(s):** signify-client/key-management, cloud-agent-service/api (cross-cutting)
- **Source(s):** plan-E Q-KM-5, plan-E Q-CROSS-2
- **Question:** What is the exact format of KRAM signature inputs? Is it HTTP Message Signatures (RFC 9421), RFC 8941 structured fields, a custom CESR format, or something else?
- **Context:** SignifyAuth has a signature_input field described as "describes which components were included in the signature." The exact format is not specified in any of the five service domains. Both signify-client and cloud-agent-service depend on this format. Without a precise specification, interoperability between implementations is impossible.
- **Oracle target:** spec

### OQ-13: KRAM timeliness window duration
- **Domain(s):** cloud-agent-service/api
- **Source(s):** plan-E Q-API-1
- **Question:** The spec says "signify_timestamp must pass KRAM timeliness check" but does not define the window duration. What is the KRAM timeliness window? Is it 5 seconds? 30 seconds? Configurable?
- **Context:** This is a critical security parameter. Too short causes legitimate requests to fail; too long enables replay attacks. Without a specified value or range, implementations will diverge.
- **Oracle target:** spec

### OQ-14: HKDF vs argon2 for UUID derivation in blinding domain
- **Domain(s):** privacy/blinding
- **Source(s):** plan-B Q12
- **Question:** For per-event UUID derivation from a shared secret, which KDF is normative: HKDF or argon2? The UL says "HKDF", the domain.yaml and errors.yaml reference "argon2/HKDF" together. Is argon2 only for initial salt derivation from a passphrase, while HKDF handles per-event UUID derivation?
- **Context:** Argon2 is a password-hashing function (slow by design); HKDF is a fast key derivation function. These serve fundamentally different purposes. Using the wrong KDF for UUID derivation would either be too slow (argon2 per event) or insufficiently protective (HKDF for passphrase stretching).
- **Oracle target:** spec

---

## HIGH Priority -- keripy Oracle

### OQ-15: Idempotent duplicate event handling -- accumulate signatures or discard?
- **Domain(s):** identity/establishment
- **Source(s):** plan-A Q-EST-1
- **Question:** When an already-accepted event arrives again with the same SAID but potentially different/additional signatures, are those new signatures accumulated into the existing event (useful for multi-source receipt collection), or is the duplicate silently dropped?
- **Context:** The validation pipeline FSM shows `sn < expected, same SAID` transitioning to `accepted`. But the spec does not clarify whether "accepted" means "merged" or "discarded." This affects receipt collection behavior, multi-validator coordination, and the distinction between first-seen acceptance and ongoing signature accumulation.
- **Oracle target:** keripy

### OQ-16: Local vs remote source distinction mechanism
- **Domain(s):** identity/establishment
- **Source(s):** plan-A Q-EST-2
- **Question:** How does the validation pipeline distinguish local vs remote event sources? Is this a per-event metadata flag, a transport-level marker, or determined by configuration? What defines a "local protected channel"?
- **Context:** The MisfitEventSourceError routes to MFE escrow, and the spec says "must be re-submitted through the local protected channel." The domain boundary depends on whether "local source" is a transport concern (out of domain) or a domain-level concept (in domain).
- **Oracle target:** keripy

### OQ-17: First-seen ordinal -- global counter or per-AID counter?
- **Domain(s):** identity/state
- **Source(s):** plan-A Q-STATE-1
- **Question:** Is the first-seen ordinal (fn) a global monotonic counter across all AIDs managed by a node, or a per-AID counter? The KeyState type has a field_seen_sn field, but the naming implies per-prefix, while the verification properties use "fn" which is described as global.
- **Context:** If fn is global, it provides total ordering across all events. If per-AID, it only provides ordering within a single identifier's history. This affects staleness detection, BADA comparisons, and the identity/state domain's commit semantics.
- **Oracle target:** keripy

### OQ-18: WriteOutcome.accepted -- boolean first_seen vs integer first_seen_number
- **Domain(s):** identity/state, identity/establishment
- **Source(s):** plan-A Q-STATE-2
- **Question:** WriteOutcome.accepted has a `first_seen: boolean` field, while ValidationResult.accepted has a `first_seen_number: integer` field. Are these different concepts? Should WriteOutcome.accepted also carry the assigned first-seen ordinal?
- **Context:** One is "is this the first time we've seen this event?" (boolean), the other is "what ordinal was assigned?" (integer). The discrepancy suggests the two types evolved independently. The commit result should carry sufficient information for the caller.
- **Oracle target:** keripy

### OQ-19: Validation pipeline -- strictly sequential or parallelizable after signature verification?
- **Domain(s):** identity/establishment
- **Source(s):** plan-A Q-EST-4
- **Question:** The validation constraint DAG shows C5->C6, C5->C7, C5->C8 as independent branches that can be evaluated in parallel. But the UL's Dual Threshold Verification term describes them as sequential steps. Can witness threshold checking (C7) and delegation checking (C8) truly run in parallel, or does the protocol require sequential evaluation?
- **Context:** Parallelization affects performance. If failure at one step should prevent checking subsequent steps (to avoid wasted work or incorrect escrow routing), the pipeline must be sequential. If the checks are truly independent, parallelization is safe.
- **Oracle target:** keripy

### OQ-20: Key exposure detection -- who checks and when?
- **Domain(s):** identity/key-commitment
- **Source(s):** plan-A Q-KC-1
- **Question:** The KeyExposureError says "pre-committed key appears in the signing key list before its activation rotation." But the identity/establishment validation pipeline does not list KeyExposureError as a possible error. At which point in the event lifecycle is key exposure detected and rejected?
- **Context:** If this is checked during event construction (by the builder), it prevents local misuse. If during validation (by the pipeline), it prevents protocol-level attacks. If nowhere currently, it is an unimplemented security check.
- **Oracle target:** keripy

### OQ-21: Consumed-digest tracking -- explicit persistent set or KEL-derived?
- **Domain(s):** identity/key-commitment
- **Source(s):** plan-A Q-KC-2
- **Question:** Pre-rotated key digests are "first-time, one-time, only-time use." How is the consumed set tracked? Is there a persistent set of consumed digests per AID, or is consumption inferred from KEL traversal (each rotation's n field is consumed once the next rotation appears)?
- **Context:** Explicit tracking requires persistent storage in the key-commitment domain. Implicit tracking requires KEL traversal at validation time, which is more expensive but avoids a separate data structure. This affects the domain's repository requirements.
- **Oracle target:** keripy

### OQ-22: Partial rotation -- can new signing keys include keys NOT from the pre-committed set?
- **Domain(s):** identity/key-commitment
- **Source(s):** plan-A Q-KC-4
- **Question:** In a partial rotation, the spec says "the newly current key list need only include a threshold-satisficing subset of the prior next keys." Can the new signing key list also include entirely new keys with no corresponding prior next-key digest, or must every new signing key be from the pre-committed set?
- **Context:** If new keys can be added freely alongside promoted pre-committed keys, partial rotation is more flexible but potentially less secure. If every new signing key must match a prior digest, the pre-rotation commitment fully constrains the key transition.
- **Oracle target:** keripy

### OQ-23: Pre-rotation binding -- positional or cross-position via ondex?
- **Domain(s):** identity/key-commitment
- **Source(s):** plan-A Q-KC-5
- **Question:** Does pre-rotation binding require positional matching (key[i] matches digest[i]), or is cross-position matching valid (key at index 2 matching digest at ondex 0)?
- **Context:** The BindingVerification type has a mismatches field with "index, expected_digest, computed_digest" entries. But the Siger ondex mechanism explicitly supports cross-position indexing. If cross-position is valid, the verification algorithm must use ondex mapping, not simple positional comparison.
- **Oracle target:** keripy

### OQ-24: Delegation seal in inception events -- valid or only in rot/ixn?
- **Domain(s):** delegation/authorization
- **Source(s):** plan-C Q-DA-4
- **Question:** Can a delegation seal appear in a delegator's inception event, or only in rotation and interaction events?
- **Context:** The UL says "interaction event (ixn) or a rotation event (rot)" but does not mention inception. If an inception event can contain a delegation seal, the first thing a new identifier does is approve a delegation. If not, delegation can only begin after the delegator exists. This affects the DelegationAuthorizationService validation logic.
- **Oracle target:** keripy

---

## HIGH Priority -- keria Oracle

### OQ-25: Boot endpoint authentication model
- **Domain(s):** cloud-agent-service/api
- **Source(s):** plan-E Q-API-2, plan-E Q-CROSS-3
- **Question:** Does the boot endpoint (port 3903) require authentication beyond the inception event signature? Is this "KRAM authentication with a to-be-provisioned controller AID" or "inception-event self-authentication"?
- **Context:** The admin API requires KRAM, the message router requires KERI signatures. The boot endpoint sits between these models. The spec says it receives POST /boot with a signed inception event but does not clarify the authentication middleware. This affects the security model for initial provisioning.
- **Oracle target:** keria

### OQ-26: Agent provisioning -- required components and their adopter-centric names
- **Domain(s):** cloud-agent-service/provisioning
- **Source(s):** plan-E Q-PROV-1
- **Question:** What components must be initialized during agent provisioning? The spec mentions "Identifier Repository (Habery), Registry State Manager (Reger), Verifier" but these are keripy implementation names. What are the adopter-centric names, initialization order, and failure handling for each component?
- **Context:** The initialization sequence determines the provisioning pipeline's error handling. If component C depends on component B, a failure in B must prevent C from initializing. The DDD spec needs adopter-centric names per the spec philosophy.
- **Oracle target:** keria

---

## HIGH Priority -- Design Decisions

### OQ-27: Should identity subdomains adopt kernel://cesr for typed CESR primitives?
- **Domain(s):** identity/establishment, identity/state, identity/key-commitment, identity/anchoring
- **Source(s):** plan-A Q-CROSS-1
- **Question:** All four identity subdomains reference domain://externals/cryptographic-primitives but none declare a kernel dependency on kernel://cesr. CESR-qualified types (qb64, SAID, Verfer, Diger, Siger) appear everywhere. Should these domains adopt kernel://cesr to get typed CESR primitives, or continue treating them as string-typed externals?
- **Context:** Adopting kernel://cesr would make CESR primitives first-class types with compile-time safety. Not adopting means every domain treats SAID, AID, etc. as opaque strings, losing type information at domain boundaries.
- **Oracle target:** design

### OQ-28: DigestAlgorithm enum duplicated across two identity subdomains
- **Domain(s):** identity/key-commitment, identity/anchoring
- **Source(s):** plan-A Q-CROSS-2
- **Question:** The DigestAlgorithm enum is defined identically in both identity/key-commitment/types.yaml and identity/anchoring/types.yaml. Where should it be canonically defined to avoid duplication?
- **Context:** Duplication risks divergence. The enum should live in cesr/primitives (since digest algorithms are CESR-level concerns) or in a shared identity types location. Both domains would import it.
- **Oracle target:** design

### OQ-29: cesr/composition dependency on cesr/primitives -- should composition be Layer 1?
- **Domain(s):** cesr/composition, cesr/primitives
- **Source(s):** plan-D Q-CROSS-3
- **Question:** cesr/composition depends on cesr/primitives types (Matter, Siger, Cigar, Diger, Prefixer, Seqner). Both are currently at Layer 0. Should cesr/composition be Layer 1 (after cesr/primitives)?
- **Context:** build-order.txt has both at Layer 0 and cesr (the parent) at Layer 1. If composition imports primitives types, it has a build-time dependency that should be reflected in the layer ordering.
- **Oracle target:** design

---

## MEDIUM Priority -- Spec Oracle

### OQ-30: DND (Do Not Delegate) trait -- checked at inception or each establishment event?
- **Domain(s):** delegation/authorization
- **Source(s):** plan-C Q-DA-3
- **Question:** The spec says DND "permanently forbids creating delegated identifiers under it." Does this mean DND is checked only at inception, or at every establishment event? Can a delegator that lacks DND at inception later have DND added to block further delegations?
- **Context:** If DND is only an inception-time trait, it cannot be added later. If DND is cumulative (traits are additive and irreversible per the identity/state domain), it could be added via rotation. The spec should clarify.
- **Oracle target:** spec

### OQ-31: Delegation workflow ordering -- witnesses first or approval first?
- **Domain(s):** delegation/lifecycle
- **Source(s):** plan-C Q-DL-4
- **Question:** Does the delegation workflow proceed witness-first-then-approval, or approval-first-then-witnesses? The port description says "witness acknowledgment, delegator approval request, approval verification, publication" (witness first). But the EscrowCascade says PWE comes before PDE (witness before delegation). If witnesses are needed before delegator approval, what happens if witnesses refuse?
- **Context:** The ordering determines whether a delegation can fail at the witness stage (before delegator even sees it) or only at the delegator stage.
- **Oracle target:** spec

### OQ-32: DisclosureMode 7 variants vs FSM 3 states
- **Domain(s):** privacy/disclosure
- **Source(s):** plan-B Q16
- **Question:** The DisclosureMode enum has 7 variants (Compact, Partial, Selective, Full, Metadata, NestedPartial, BulkIssued) but the FSM models only 3 states (compact, partial, full). How do the 4 "orthogonal" modes compose with the 3-state FSM? If the current mode is Selective, is the FSM state compact?
- **Context:** The FSM models progressive disclosure (compact -> partial -> full) but the orthogonal modes (Selective, Metadata, NestedPartial, BulkIssued) have no transitions. The spec says they "may be combined" but does not explain how.
- **Oracle target:** spec

### OQ-33: Metadata and BulkIssued disclosure progression rules
- **Domain(s):** privacy/disclosure
- **Source(s):** plan-B Q18
- **Question:** The FSM has no transitions for Metadata or BulkIssued modes. Do these have their own progression rules? Can a Metadata ACDC progress to Full? Can a BulkIssued credential progress through compact -> partial -> full?
- **Context:** If these modes have no progression, they are terminal. If they do progress, the FSM needs additional states or the orthogonal modes need their own FSMs.
- **Oracle target:** spec

### OQ-34: Chain-link confidentiality guard at Layer 0
- **Domain(s):** privacy/disclosure
- **Source(s):** plan-B Q19
- **Question:** The FSM guard for partial -> full says "no chain-link terms, or terms already agreed." Agreement happens via IPEX exchange (credential-exchange/negotiation domain, higher layer). How does the disclosure domain at Layer 0 know whether terms have been agreed? Does it accept a boolean flag, query the exchange domain, or something else?
- **Context:** At Layer 0, the exchange domain is not available. The disclosure domain needs a mechanism to check the chain-link gate without importing higher-layer domains.
- **Oracle target:** spec

### OQ-35: Complete CESR prefix code set for transferable/non-transferable identifiers
- **Domain(s):** identity/key-commitment
- **Source(s):** plan-A Q-KC-3
- **Question:** The PrefixCode enum lists Ed25519, Ed25519N, ECDSA_256k1, ECDSA_256k1N, Blake3_256. But the UL mentions secp256r1, secp256r1N, Ed448, and Ed448N. What is the complete set of prefix codes for transferable and non-transferable identifiers?
- **Context:** An incomplete PrefixCode enum means some valid key types cannot be classified for transferability. This blocks the transferability port interface from handling all key types.
- **Oracle target:** spec

### OQ-36: ample() minimum fault tolerance for small witness counts
- **Domain(s):** accountability/consensus
- **Source(s):** plan-D Q-CONS-1
- **Question:** Does ample() allow f=0 as input? For n=1, the default formula gives f=0 and ample(1)=1. For n=2, f=0 and ample(2)=2. Is there a minimum fault tolerance floor?
- **Context:** For small witness pools (1-2 witnesses), the BFT quorum degenerates. The spec should clarify whether this is acceptable or whether a minimum pool size is enforced.
- **Oracle target:** spec

### OQ-37: V2 version string exact format and regex
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-1
- **Question:** The UL says v2 is "PPPPMmmGggKKKKBBBB." (19 chars) with "BBBB provides serialization size in Base64." Is BBBB truly 4 Base64 chars (max 16,777,216 bytes)? What is the precise regex pattern for parsing v2?
- **Context:** The version string is the entry point for stream parsing. An incorrect regex means the parser cannot identify frame boundaries.
- **Oracle target:** spec

### OQ-38: Genus/version code parser state management
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-2
- **Question:** How does the genus/version code (-_GGGVVV) interact with parser dispatch? The UL says it "modifies interpretation of all subsequent count codes until another genus/version code appears." Is this state maintained per-stream, per-frame, or per-group?
- **Context:** If the parser must track "active genus" as mutable state, composition is no longer purely stateless. This affects the domain's design as a pure computation service.
- **Oracle target:** spec

### OQ-39: Signable count codes (-E, -F, -G) -- signed content boundary
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-3
- **Question:** For signable count codes, how does the parser know where signed content ends and the signature group begins? Does the count measure content bytes, after which the next element is a -C attachment? Or is there a separator?
- **Context:** Incorrect signed-content boundary detection means signatures cannot be verified correctly.
- **Oracle target:** spec

### OQ-40: Canonical KERI/ACDC genus CesrGroup variant enumeration
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-4
- **Question:** The UL mentions "12 variants in the KERI/ACDC genus" but the Concrete Group Types term lists more. What are the canonical group variants for the KERI/ACDC genus?
- **Context:** The CesrGroup discriminated union needs an exhaustive variant list for implementation.
- **Oracle target:** spec

### OQ-41: Enclosure code -H encoding for non-native content inside count code groups
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-6
- **Question:** For the -H enclosure code, is the body raw JSON/CBOR/MGPK bytes or a version-string-prefixed field map? Does -H include the version string?
- **Context:** Incorrect interpretation of -H means nested non-native serializations cannot be parsed.
- **Oracle target:** spec

### OQ-42: Tritet 0b000 ("Free"/"Annotated T-domain") practical usage
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-7
- **Question:** What concrete stream content starts with a byte whose high 3 bits are 000? The ColdCode UL calls this "Free" in one place and "annotated T-domain" in another. Are standalone CESR primitives (not inside groups) the content here?
- **Context:** This affects cold-start dispatch for the first tritet value. If it handles standalone primitives, the parser needs a different code path than for groups.
- **Oracle target:** spec

### OQ-43: End-Role -- is "mediator" a valid role?
- **Domain(s):** signify-client/resources
- **Source(s):** plan-E Q-RES-1
- **Question:** The verification spec lists 11 roles from keripy Rolage (witness, controller, agent, watcher, registrar, gateway, judge, juror, peer, mailbox, indexer) but the UL mentions "mediator." The spec flags this as "pending KSWG clarification." What is the authoritative role set?
- **Context:** End-Role authorization validation needs an exhaustive enum. An incomplete set means some valid roles would be rejected.
- **Oracle target:** spec

---

## MEDIUM Priority -- keripy Oracle

### OQ-44: BADA staleness logic -- public interface or internal mechanism?
- **Domain(s):** identity/state
- **Source(s):** plan-A Q-STATE-3
- **Question:** BADA (Best Available Data Algorithm) uses "sn + datetime" comparison for key state notice staleness. The identity/state domain does not mention BADA in its ports or types. Should BADA be an explicit port operation, or is it an internal implementation detail of the commit pipeline?
- **Context:** If BADA is a public interface, callers can use it to compare key state notices. If internal, the commit pipeline silently applies BADA rules without caller visibility.
- **Oracle target:** keripy

### OQ-45: State-read-model consistency guarantee after escrow promotions
- **Domain(s):** identity/state
- **Source(s):** plan-A Q-STATE-4
- **Question:** The state-read-model outbound port says it is "immediately consistent" with committed events. But the escrow-drain port reprocesses events asynchronously. If an escrow drain promotes an event, is the state-read-model immediately updated, or is there a staleness window?
- **Context:** If there is a staleness window, callers might read state that does not reflect a recently-promoted escrow event. This affects any domain that depends on key state freshness.
- **Oracle target:** keripy

### OQ-46: KEL repository append-only invariant vs escrow pruning
- **Domain(s):** identity/state
- **Source(s):** plan-A Q-STATE-5
- **Question:** The kel-repository is described as append-only, but the escrow-drain port can "prune timed-out events." Is the append-only invariant limited to the accepted KEL, with escrow queues supporting add, reprocess, and prune operations?
- **Context:** If "append-only" applies to everything including escrows, pruning is a violation. If it applies only to the accepted KEL, this distinction must be made explicit.
- **Oracle target:** keripy

### OQ-47: Delegable event escrow promotion path
- **Domain(s):** delegation/lifecycle
- **Source(s):** plan-C Q-DL-2
- **Question:** When an event is promoted from Delegable Event Escrow, does it go to PDE or directly to the KEL? The UL says "promoted to Partially-Delegated escrow or directly to the KEL once the delegator's event arrives." The state machine says escrowed-delegable -> di-verified (retry from step 3).
- **Context:** If it can skip PDE when the seal is found immediately, the state machine needs a shortcut transition. If it always goes through PDE first, the UL description is misleading.
- **Oracle target:** keripy

### OQ-48: Delegator key rotation effect on PDE seal validity
- **Domain(s):** delegation/lifecycle
- **Source(s):** plan-C Q-DL-3
- **Question:** What happens when the delegator's key state changes (via rotation) while a delegation is in PDE? Does a delegator rotation invalidate the approval seal, or is the seal committed to a specific event (by sn+SAID), making it independent of key state changes?
- **Context:** If the seal is bound to a specific event, key rotation does not affect it. If the seal depends on current key state, a delegator rotation could invalidate pending delegations. The integration scenario mentions "delegator rotates keys while signatures are accumulating" but does not address this specific case.
- **Oracle target:** keripy

### OQ-49: Siger dual-indexed code encoding -- index/ondex split in soft part
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-4
- **Question:** For Siger dual-indexed codes (0A##, 2A####), how is the index/ondex encoded in the soft part of the code? Is the soft part split evenly (e.g., 2A: 2 chars index + 2 chars ondex), or asymmetric?
- **Context:** Correct index/ondex parsing is required for signature verification against potentially different key lists (signing keys vs rotation keys).
- **Oracle target:** keripy

### OQ-50: Tholder.satisfy() ownership -- cesr/primitives encoding only, or satisfaction logic too?
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-2
- **Question:** Does cesr/primitives own only Tholder encoding (serialization/deserialization), or also the satisfy() method? The published_language lists Tholder in this domain but notes say "satisfaction semantics defined by identity/thresholds domain."
- **Context:** If cesr/primitives owns satisfy(), it contains non-trivial domain logic (weighted threshold evaluation). If satisfaction logic lives in identity/thresholds, cesr/primitives is purely a codec for threshold representations.
- **Oracle target:** keripy

### OQ-51: Mid-padding algorithm for qb64 encoding
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-3
- **Question:** What is the precise mid-padding algorithm for qb64 encoding? The qualification term says "qb64 string = code + Base64-encoded mid-padded raw." Where do the pad bytes go relative to the code prefix?
- **Context:** The padding algorithm is fundamental to all CESR primitive round-tripping. An incorrect padding implementation breaks every primitive's T-domain representation.
- **Oracle target:** keripy

### OQ-52: Complete Sizage table for all 151 code table entries
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-1
- **Question:** The code table lists 110 master + 19 indexed + 22 count codes, but the Sizage entries (hs, ss, fs, ls) for each are not explicitly enumerated. Are these derivable from a formula, or must each be looked up individually?
- **Context:** Without the complete Sizage table, the primitives domain cannot validate raw sizes during construction. This is the foundational data for the entire cesr/primitives domain.
- **Oracle target:** keripy

### OQ-53: One-character code assignments beyond E
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-7
- **Question:** The UL mentions "52 possible codes (letters only)" for one-character codes. Are all lowercase letters a-z assigned, or only 'a' (Salt_256)?
- **Context:** If unassigned codes exist, the domain needs to distinguish between unassigned (reserved for future) and invalid codes in error handling.
- **Oracle target:** keripy

### OQ-54: Key derivation path offset formula
- **Domain(s):** signify-client/key-management
- **Source(s):** plan-E Q-KM-3
- **Question:** The UL says Path = stem + hex(ridx) + hex(kidx + offset). What is the offset value? In signify-ts, it appears to be `transferable ? pidx * icodes.count : 0`. Should the domain spec capture this formula explicitly?
- **Context:** Without the precise formula, different implementations may derive different keys from the same salt, breaking interoperability between signify-ts and signifypy.
- **Oracle target:** keripy

### OQ-55: DuplicityEventLog persistence -- who owns it?
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-1
- **Question:** The integrity/detection domain has no outbound persistence port, yet the DEL is permanent and append-only. Should there be an outbound repository port for DEL persistence, or is it managed internally?
- **Context:** The domain.yaml does not declare any externals/persistence dependency. If the DEL must persist across process restarts, it needs a repository port.
- **Oracle target:** keripy

---

## MEDIUM Priority -- keria Oracle

### OQ-56: Agent destruction -- synchronous or asynchronous?
- **Domain(s):** cloud-agent-service/provisioning
- **Source(s):** plan-E Q-PROV-2
- **Question:** Provisioning is synchronous (30s timeout). But destruction involves removing many resources. Should destruction be a long-running operation tracked by the Monitor, or always synchronous?
- **Context:** If synchronous, destruction could time out for large agents. If asynchronous, the state machine needs a "destroying" state with operation tracking.
- **Oracle target:** keria

### OQ-57: In-flight operations during agent destruction
- **Domain(s):** cloud-agent-service/provisioning
- **Source(s):** plan-E Q-PROV-3
- **Question:** When an agent is destroyed, what happens to pending long-running operations? Are they cancelled, do they complete first, or are they abandoned?
- **Context:** The state machine shows active -> destroying -> destroyed, but the interaction with the processing subdomain during destruction is unspecified.
- **Oracle target:** keria

### OQ-58: Re-provisioning after destruction -- allowed?
- **Domain(s):** cloud-agent-service/provisioning
- **Source(s):** plan-E Q-PROV-4
- **Question:** After an agent reaches the "destroyed" terminal state, can the same controller AID provision a new agent? Does the one-agent-per-controller invariant mean "unique among active agents" or "unique for all time"?
- **Context:** If historical uniqueness is enforced, a controller that accidentally destroys its agent can never provision a replacement. If only active uniqueness, re-provisioning is possible.
- **Oracle target:** keria

### OQ-59: Notification lifecycle -- expiry, queue depth, retention policy
- **Domain(s):** cloud-agent-service/api
- **Source(s):** plan-E Q-API-3
- **Question:** When a notification is not acknowledged: (a) do notifications expire? (b) is there a maximum notification queue depth per agent? (c) what is the retention policy?
- **Context:** Without lifecycle rules, the notification queue grows unboundedly, creating a resource exhaustion vector.
- **Oracle target:** keria

### OQ-60: Boot endpoint validation beyond event structure
- **Domain(s):** cloud-agent-service/api
- **Source(s):** plan-E Q-API-5
- **Question:** Does the boot endpoint check that the inception AID is non-transferable (agent AIDs are non-transferable in keria) or single-sig (no multisig groups)?
- **Context:** If agent AIDs must be non-transferable, the boot validation pipeline needs explicit checks beyond basic event structure validation.
- **Oracle target:** keria

---

## MEDIUM Priority -- Design Decisions

### OQ-61: InteractionEvent type ownership -- establishment or anchoring domain?
- **Domain(s):** identity/establishment, identity/anchoring
- **Source(s):** plan-A Q-ANC-2
- **Question:** InteractionEvent is defined in identity/establishment (as part of the KeyEvent union). But identity/anchoring is the domain that owns interaction event construction and seal management. Which domain should own the InteractionEvent type definition?
- **Context:** If anchoring owns it, the KeyEvent union in establishment must import from anchoring. If establishment owns it (current), anchoring imports from establishment. The type should live where it is most naturally authored.
- **Oracle target:** design

### OQ-62: TELEvent vs TelEvent -- redundant types with confusing names
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q3
- **Question:** types.yaml defines both TELEvent (union of registry events) and TelEvent (core identifying fields). Their names differ only by casing. Are these truly distinct types, or should one be eliminated?
- **Context:** Having TELEvent and TelEvent risks confusion and bugs. If they serve different purposes (one is the full event, one is the identifying tuple), they need distinct names. If they overlap, one should be removed.
- **Oracle target:** design

### OQ-63: StateQueryInput carrying a full LifecycleStateSnapshot
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q4
- **Question:** The StateQueryInput's credential_snapshot field is a LifecycleStateSnapshot which already contains the state. For the "authorize" port, why does the input carry a pre-existing snapshot? Is the caller expected to provide the current snapshot, or is this the proposed new state?
- **Context:** If the service reconstructs state internally (which it should per CQRS), the snapshot in the input is redundant. If the caller provides it as a hint, it is a performance optimization. The semantics are unclear.
- **Oracle target:** design

### OQ-64: Missing OOT escrow type in errors.yaml
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q6
- **Question:** The validation pipeline routes C4 failures to "OOT" (out-of-order TEL event), but no error in errors.yaml maps to this queue. Should there be an OutOfOrderTelEventError with recovery_target OOT?
- **Context:** Without a formal error type, the escrow routing for C4 failures has no type-safe representation.
- **Oracle target:** design

### OQ-65: C2 on_failure escrow target unspecified
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q2
- **Question:** Constraint C2_issuer_key_state says on_failure: "escrow -- missing issuer key state" but does not name a specific queue. The errors catalog has MissingIssuerError with recovery_target MRI. Should C2's on_failure explicitly route to MRI?
- **Context:** Without explicit routing, the implementation must guess which escrow queue to use for missing issuer key state.
- **Oracle target:** design

### OQ-66: Layer 0 TELEvent referencing Layer 6 registry types
- **Domain(s):** credential-lifecycle/status
- **Source(s):** plan-B Q5
- **Question:** TELEvent variants reference types://credential-lifecycle/registry (Layer 6) types. At Layer 0, should credential-lifecycle/status define its own event structure types, or use opaque SAIDs as forward references?
- **Context:** Layer 0 cannot import from Layer 6. Either the status domain defines its own minimal event types (violating DRY when Layer 6 is built), or it uses opaque SAID references (losing type safety).
- **Oracle target:** design

### OQ-67: AggregationInput serialization_kind inference
- **Domain(s):** privacy/aggregation
- **Source(s):** plan-B Q7
- **Question:** AGID computation requires serialization using the ACDC's format (JSON, CBOR, or MGPK), but the AggregationInput type does not carry a serialization_kind field. How does compute_agid know which serialization to use?
- **Context:** If inferred from the ACDC's version string, the ACDC must be accessible. If carried as an input parameter, AggregationInput needs an additional field.
- **Oracle target:** design

### OQ-68: AggregationInput blinded_block variant semantics
- **Domain(s):** privacy/aggregation
- **Source(s):** plan-B Q8
- **Question:** The blinded_block variant takes a single BlindedAttributeBlock, but AGID computation requires a LIST of block SAIDs. How does the aggregation service get from one blinded block to an AGID?
- **Context:** The type-to-operation mapping is unclear. Is blinded_block for contributing one block to an in-progress aggregation, or for a different operation entirely?
- **Oracle target:** design

### OQ-69: SADPath format inconsistency (array vs string)
- **Domain(s):** privacy/aggregation
- **Source(s):** plan-B Q9
- **Question:** SADPath uses path: string[] (array of labels), but SadPathSig uses path: string (single string like "-a-i"). These represent the same concept differently. What is the canonical path format?
- **Context:** Two representations of the same concept creates conversion burden and potential bugs at boundaries.
- **Oracle target:** design

### OQ-70: Compactor type formalization
- **Domain(s):** privacy/aggregation
- **Source(s):** plan-B Q10
- **Question:** The Compactor is described extensively in the UL but has no formal type definition in types.yaml. Should it be a formal type or purely an internal implementation detail?
- **Context:** If it is a formal type, callers can construct and inspect compaction state. If internal, only the aggregation service's port results are visible.
- **Oracle target:** design

### OQ-71: Indexed vs non-indexed SAD path signatures
- **Domain(s):** privacy/aggregation
- **Source(s):** plan-B Q11
- **Question:** The SadPathSig type does not distinguish between indexed signatures (Siger, quinkey indexing, .spsgs group) and non-indexed (Cigar, couple form, .spcgs group). Should there be two variants?
- **Context:** The consumer needs to know which form to use. Without distinguishing variants, the type loses information about the signature's verification requirements.
- **Oracle target:** design

### OQ-72: BlindedAttributeBlock field structure vs virtual field labels
- **Domain(s):** privacy/blinding
- **Source(s):** plan-B Q13
- **Question:** types.yaml has BlindedAttributeBlock with {d, u, attributes}, but the UL describes "virtual field labels [d, u, td, ts]" that are "never serialized." Are td and ts virtual labels inside the attributes map, or separate fields?
- **Context:** The type structure determines the BLID computation algorithm (which fields are concatenated and in what order).
- **Oracle target:** design

### OQ-73: Blinding domain port contract -- single port with multiple operations
- **Domain(s):** privacy/blinding
- **Source(s):** plan-B Q14
- **Question:** The blinded-state port handles multiple operations (compute_blid, discover_state, construct_bound_block) with different input/output signatures. Should this be split into multiple ports?
- **Context:** A single port with multiple operation signatures reduces type safety compared to separate ports with specific contracts.
- **Oracle target:** design

### OQ-74: Privacy subdomain coordination at Layer 0
- **Domain(s):** privacy/aggregation, privacy/blinding, privacy/disclosure
- **Source(s):** plan-B Q20
- **Question:** The privacy parent domain (Layer 7) orchestrates disclosure/blinding/aggregation via the GraduatedDisclosure protocol. At Layer 0, each subdomain is independent. Is the expectation that Layer 0 implements each subdomain as self-contained modules, with orchestration only at Layer 7?
- **Context:** If yes, each Layer 0 privacy subdomain should have no awareness of the others. If the subdomains need to coordinate at Layer 0, the layer assignment is wrong.
- **Oracle target:** design

### OQ-75: TEL v2 bup event authority -- status domain or blinding domain?
- **Domain(s):** credential-lifecycle/status, privacy/blinding
- **Source(s):** plan-B Q21
- **Question:** bup events appear in both the status domain's FSM transitions and the blinding domain. Which domain is the authority on bup event structure and validation? Does the status domain delegate bup-specific validation (BLID computation, backer signatures) to the blinding domain?
- **Context:** If both domains validate bup events independently, there is redundancy. If one delegates to the other, the dependency direction must be correct for the layer ordering.
- **Oracle target:** design

### OQ-76: Delegation subdomain decomposition -- too many small domains?
- **Domain(s):** delegation/authorization, delegation/lifecycle, delegation/recovery
- **Source(s):** plan-C Q-CROSS-1
- **Question:** The current decomposition has authorization (seal construction + binding verification), lifecycle (validation pipeline + escrow), and recovery (superseding rules). The boundaries are porous: lifecycle needs authorization's seal matching, recovery needs lifecycle's escrow awareness. Should these be fewer, larger domains?
- **Context:** If the domains are merged into a single delegation domain, the internal complexity increases but cross-domain coupling disappears. If kept separate, the coupling must be managed through explicit port contracts.
- **Oracle target:** design

### OQ-77: Integrity/detection vs integrity/recovery for superseding recovery
- **Domain(s):** integrity/detection, integrity/recovery
- **Source(s):** plan-C Q-CROSS-2
- **Question:** Both domains deal with "superseding recovery" -- detection mentions it as a recovery path, recovery implements it. Should detection only detect duplicity and delegate recovery evaluation to integrity/recovery?
- **Context:** If detection implements any recovery logic, it duplicates recovery's concerns. If it only detects and emits evidence, the separation is cleaner.
- **Oracle target:** design

### OQ-78: Consensus domain vs accountability/receipting for receipt storage
- **Domain(s):** accountability/consensus
- **Source(s):** plan-D Q-CONS-3
- **Question:** The consensus domain defines the Receipt type, but domain.yaml says consensus provides "rules and computations" not "storage." Who stores receipts -- consensus or accountability/receipting?
- **Context:** If consensus stores receipts, it needs a repository port. If another domain stores them, consensus is a pure computation service.
- **Oracle target:** design

### OQ-79: Sadder/Serder/Creder hierarchy -- split across domains or keep in composition?
- **Domain(s):** cesr/composition
- **Source(s):** plan-D Q-COMP-5
- **Question:** Sadder is a generic SAD serializer, Serder adds KERI event awareness (verfers, digers), Creder adds ACDC awareness (issuer, schema). Should Serder/Creder be facades in identity/credential domains instead of living in cesr/composition?
- **Context:** Serder references identity concepts and Creder references credential concepts. Having them in composition means composition has knowledge of higher-level domains. Splitting them means composition stays pure codec.
- **Oracle target:** design

### OQ-80: OperationStatus vs ServerOperation -- normalize or intentional asymmetry?
- **Domain(s):** cloud-agent-service/processing, signify-client/resources
- **Source(s):** plan-E Q-RES-2, plan-E Q-CROSS-1
- **Question:** The client-side OperationStatus and server-side ServerOperation represent the same concept with inconsistent field naming (result vs response). Should the spec normalize to a single shared type?
- **Context:** If the asymmetry is intentional (server has internal fields), document why. If accidental, normalize to a single type. Having two nearly-identical types with different names for the same field is confusing.
- **Oracle target:** design

### OQ-81: OperationType vs OpType -- single type or two?
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-2
- **Question:** Both OperationType and OpType exist with identical enum values. The spec says "Alias for OpType -- retained for backward compatibility." Should the spec normalize to a single type?
- **Context:** Two identical types in the same domain create confusion about which to use in port contracts.
- **Oracle target:** design

### OQ-82: "done" as an OpType value -- status or workflow type?
- **Domain(s):** cloud-agent-service/processing, signify-client/resources
- **Source(s):** plan-E Q-CROSS-5
- **Question:** The OpType enum includes "done" alongside workflow types (witness, delegation, etc.). "done" is semantically a status, not a workflow type. Should it be removed from OpType and handled as a special case in the operation lifecycle state machine?
- **Context:** Mixing status values with workflow types in the same enum violates the single-responsibility principle for the enum.
- **Oracle target:** design

### OQ-83: SignifyAuth shared type location
- **Domain(s):** signify-client/key-management, cloud-agent-service/api
- **Source(s):** plan-E Q-CROSS-4
- **Question:** The resources domain references the cloud agent's admin API via the outbound port. The api domain's AdminRequest references SignifyAuth from signify-client. These are different packages. Is this a legitimate cross-package dependency, or should SignifyAuth live in a shared types package?
- **Context:** Circular cross-package imports create coupling. A shared types package or kernel would break the cycle.
- **Oracle target:** design

---

## LOW Priority -- Spec Oracle

### OQ-84: "Latest-seen delegated rotation" in distributed systems
- **Domain(s):** delegation/recovery
- **Source(s):** plan-C Q-DR-2
- **Question:** The UL says "only the latest-seen delegated rotation at a given sn can be superseded." But "latest-seen" depends on each validator's observation order. Can two validators have different "latest-seen" events and thus different superseding outcomes?
- **Context:** If "latest-seen" is local, it introduces observation-dependent divergence. If global (based on delegator's first-seen), it requires coordination. The spec should clarify whether this is a source of irreconcilability.
- **Oracle target:** spec

### OQ-85: B1 tiebreaker using first-seen number at delegator
- **Domain(s):** delegation/recovery
- **Source(s):** plan-C Q-DR-3
- **Question:** The UL says B1 ties are broken by "the event with the earlier first-seen number (fn) at the delegator." But fn is local to each node. How can this produce universal agreement?
- **Context:** This creates a "first-seen wins at the delegator" rule dependent on message ordering at the delegator node. If intentional, it should be documented as validator-local. If not, the tiebreaker needs a different mechanism.
- **Oracle target:** spec

### OQ-86: Inception duplicity -- always irreconcilable?
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-5
- **Question:** If an attacker creates a conflicting inception for an existing AID prefix, is the AID permanently compromised with no recovery path? The UL implies yes ("first-seen inception is authoritative").
- **Context:** Unlike post-inception duplicity where superseding recovery is possible, inception duplicity has no prior key commitments to leverage for recovery.
- **Oracle target:** spec

### OQ-87: CESR group codes for blinded state attachments
- **Domain(s):** privacy/blinding
- **Source(s):** plan-B Q15
- **Question:** The UL mentions CESR group codes BlindedStateQuadruples (-a##) for basic blocks and BoundStateSextuples (-b##) for bound blocks. Should the blinding domain define these, or does it delegate to cesr/composition?
- **Context:** If the blinding domain defines CESR group codes, it crosses into composition territory. If it delegates, it needs an outbound port to composition.
- **Oracle target:** spec

### OQ-88: Selective disclosure A/a field distinction without ACDC type at Layer 0
- **Domain(s):** privacy/disclosure, privacy/aggregation
- **Source(s):** plan-B Q22
- **Question:** Selective disclosure uses the A field (aggregate section). The aggregation domain computes the AGID for the A field. But neither domain's types.yaml defines an ACDC type with an A field. At Layer 0, how do the privacy subdomains reason about the A/a distinction?
- **Context:** The ACDC type is owned by credential-lifecycle (Layer 7). At Layer 0, the privacy subdomains would need either a forward reference or a lightweight ACDC facade.
- **Oracle target:** spec

### OQ-89: Disclosure domain forward reference to Credential type
- **Domain(s):** privacy/disclosure
- **Source(s):** plan-B Q17
- **Question:** The mode-definitions port takes types://credential-lifecycle#Credential as input. But credential-lifecycle is Layer 7. At Layer 0, this type does not exist. Should the disclosure domain define its own lightweight ACDC representation, or accept a generic SAD map?
- **Context:** A generic SAD map loses type safety but avoids the cross-layer dependency. A lightweight facade maintains type safety but creates a parallel type that must stay synchronized with the Layer 7 definition.
- **Oracle target:** spec

### OQ-90: Encryption-related CESR codes -- scope for primitives domain
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-5
- **Question:** The code table has encryption-related codes (C=X25519, O=X25519_Private, P=X25519_Cipher_Seed). Are these in scope for the primitives domain, or should they be deferred to a separate encryption subdomain?
- **Context:** The published_language does not mention Decrypter or Encrypter. If encryption primitives are in scope, the domain surface grows. If deferred, the code table has holes.
- **Oracle target:** spec

---

## LOW Priority -- keripy Oracle

### OQ-91: Delegation source seal -- attachment or event body?
- **Domain(s):** delegation/authorization
- **Source(s):** plan-C Q-DA-1
- **Question:** Does the delegation source seal (deSourceCouple) travel as an attachment or within the event body? keripy uses it as a Seqner+Saider couple in attachments; keriox uses a SourceSeal struct.
- **Context:** For the DDD spec, this determines whether the source seal belongs to the delegation/authorization type system or is a CESR attachment concern.
- **Oracle target:** keripy

---

## LOW Priority -- keria Oracle

### OQ-92: Message Router OpenAPI spec endpoint (/spec.yaml on port 3902)
- **Domain(s):** cloud-agent-service/api
- **Source(s):** plan-E Q-API-4
- **Question:** The spec mentions /spec.yaml on port 3902 for OpenAPI 3.1.0 spec generation. Should this be a formal port or an operational concern outside the domain?
- **Context:** If operational, it does not belong in the domain spec. If it is part of the public API contract, it needs a port definition.
- **Oracle target:** keria

---

## LOW Priority -- Design Decisions

### OQ-93: Custodial delegation -- protocol concept or deployment pattern?
- **Domain(s):** delegation/recovery
- **Source(s):** plan-C Q-DR-4
- **Question:** The UL says custodial delegation is a "deployment pattern" not a separate code path. But the CompromiseRequirement type has a key_type field distinguishing "current signing, next pre-rotation, or delegator." Does the protocol need to know whether a delegation is custodial?
- **Context:** If the protocol does not distinguish custodial from non-custodial, key_type should be simplified. If it does, the distinction needs formal definition.
- **Oracle target:** design

### OQ-94: Watcher concept mapping between detection domain and watcher-service
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-2
- **Question:** The detection domain defines watcher behavior (cross-check, compare, detect), but the watcher-service domain is a separate package. Is the detection domain's Watcher a logical concept implemented by the watcher-service?
- **Context:** Clarifying this mapping prevents confusion about which package implements which detection capabilities.
- **Oracle target:** design

### OQ-95: Juror-judge separation -- processes or logical roles?
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-3
- **Question:** The UL says jurors "may run in concert with a witness" and judges are "under the validator's control." Are jurors and judges separate processes or logical roles within one watcher process?
- **Context:** The spec says jurors must not make trust decisions and judges must not collect evidence directly. This could be enforced by interface separation or process separation.
- **Oracle target:** design

### OQ-96: LDE escrow queue ownership
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-4
- **Question:** LikelyDuplicitousError routes to LDE escrow, but the detection domain does not define an LDE escrow type or persistence mechanism. Is LDE managed by this domain or by the parent integrity domain?
- **Context:** Without a defined owner, LDE escrow has no sweep/timeout mechanism.
- **Oracle target:** design

### OQ-97: "Distinct operator" definition for MonitorHandle minimum sources
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-ID-6
- **Question:** MonitorHandle requires "at least 2 sources from distinct operators." How is "distinct operator" defined -- by controlling AID, network location, or organizational declaration?
- **Context:** The diversity requirement is a security property. Without a precise definition, implementations may accept sources that do not provide true diversity.
- **Oracle target:** design

### OQ-98: Irreconcilable KEL -- truly terminal or recoverable under edge cases?
- **Domain(s):** integrity/recovery
- **Source(s):** plan-C Q-IR-6
- **Question:** The Irreconcilable KEL term says "terminal state" with no transitions out. Can an irreconcilable KEL ever recover (e.g., if one conflicting event is later proven forged)?
- **Context:** If truly terminal, the identifier permanently loses value. If conditionally recoverable, the state machine needs an additional transition.
- **Oracle target:** design

### OQ-99: Recovery audit trail adopter use case
- **Domain(s):** integrity/recovery
- **Source(s):** plan-C Q-IR-3
- **Question:** Superseded events are "queryable via fn-indexed access" and "permanent forensic evidence." From the adopter's perspective, what is the use case for querying disputed branch events?
- **Context:** If compliance audit or dispute resolution, the query interface needs to be part of the public surface. If protocol-internal only, it can be an implementation detail.
- **Oracle target:** design

### OQ-100: Reconciliation port idempotency
- **Domain(s):** integrity/recovery
- **Source(s):** plan-C Q-IR-4
- **Question:** The reconciliation port says "command, non-idempotent" but the deterministic superseding rules mean the same inputs always produce the same trunk. Should reconciliation be a query instead?
- **Context:** The only non-idempotent aspect is side effects (storing the trunk designation). If reconsidered as a query with a separate "apply" command, the separation of concerns improves.
- **Oracle target:** design

### OQ-101: Two superseding rotations at the same recovery point
- **Domain(s):** integrity/recovery
- **Source(s):** plan-C Q-IR-5
- **Question:** SupersedingConflictError says "requires judge adjudication." But the superseding rules (B1-B3) provide a total order. Under what circumstances can the cascade fail to produce a winner?
- **Context:** If B3/SAID tiebreaker truly provides total ordering, this error should never occur. If there are edge cases, they need documentation.
- **Oracle target:** design

### OQ-102: Integrity evidence domain at Layer 3 vs detection storage at Layer 0
- **Domain(s):** integrity/detection
- **Source(s):** plan-C Q-CROSS-3
- **Question:** The DuplicityCheck_detected integration scenario asserts on integrity/evidence (Layer 3). But detection needs to store evidence at Layer 0. Should detection have its own DEL storage, or emit events for the evidence domain?
- **Context:** Event-driven emission preserves layer boundaries; internal storage creates a dependency inversion.
- **Oracle target:** design

### OQ-103: Witness-to-endpoint mapping ownership
- **Domain(s):** accountability/dissemination
- **Source(s):** plan-D Q-DISS-1
- **Question:** The outbound transport port takes an Endpoint, but witness OOBIs are resolved by the discovery domain. Who translates witnessAid -> Endpoint?
- **Context:** If dissemination does the translation, it depends on discovery. If the caller provides Endpoints, dissemination is simpler but callers are burdened.
- **Oracle target:** design

### OQ-104: Round-robin dissemination algorithm precision
- **Domain(s):** accountability/dissemination
- **Source(s):** plan-D Q-DISS-2
- **Question:** The UL says "at most 2*N acknowledged exchanges for full dissemination." Is the algorithm pass 1 (send event, collect receipts), pass 2 (send accumulated receipts), or interleaved within a single pass?
- **Context:** The precise algorithm determines bandwidth usage and completion time.
- **Oracle target:** design

### OQ-105: getWitnessSet -- reads from identity/state or maintains own registry?
- **Domain(s):** accountability/dissemination
- **Source(s):** plan-D Q-DISS-3
- **Question:** The getWitnessSet operation returns WitnessConfig as if dissemination owns it. But witness configuration state derives from establishment events owned by identity/state. Does dissemination borrow or own this state?
- **Context:** If borrowed, the port should delegate to identity/state. If owned, there is state duplication.
- **Oracle target:** design

### OQ-106: DisseminationStrategy.Direct vs RoundRobin with 0 witnesses
- **Domain(s):** accountability/dissemination
- **Source(s):** plan-D Q-DISS-4
- **Question:** Direct mode is defined as "controller sends events directly to the validator." Is the Direct strategy variant ever selected by the caller, or automatically selected when witnesses is empty?
- **Context:** If auto-selected, the caller never passes Direct explicitly and the enum variant is implicit. If caller-selected, the caller must know when Direct is appropriate.
- **Oracle target:** design

### OQ-107: Witness local-event-only rule enforcement -- dissemination or witness?
- **Domain(s):** accountability/dissemination
- **Source(s):** plan-D Q-DISS-5
- **Question:** The UL says "a witness MUST only accept local (protected) events from the controller." Does the dissemination domain enforce this, or is it the witness's responsibility?
- **Context:** If dissemination enforces it, the propagation port needs a concept of protected vs unprotected channels.
- **Oracle target:** design

### OQ-108: First-seen-check port idempotency classification
- **Domain(s):** accountability/consensus
- **Source(s):** plan-D Q-CONS-5
- **Question:** The first-seen-check port is marked non-idempotent, but resubmitting the SAME event is idempotent (no state change). Should the port contract distinguish same-SAID resubmissions (idempotent) from different-SAID attempts (non-idempotent)?
- **Context:** The current classification is incomplete. Correctly specifying idempotency helps callers reason about retry safety.
- **Oracle target:** design

### OQ-109: TOAD=0 + empty witnesses -- ample() return value
- **Domain(s):** accountability/consensus
- **Source(s):** plan-D Q-CONS-4
- **Question:** For TOAD=0 + empty witnesses, should computeAmple return 0 (valid unwitnessed identifier) or reject? The verification.yaml says ample(0)=0, but InsufficientWitnessesError says "fewer than minimum required for BFT."
- **Context:** An unwitnessed identifier with TOAD=0 is valid but offers no BFT guarantees. The ample() function should handle this edge case explicitly.
- **Oracle target:** design

### OQ-110: cesr/primitives and cesr/composition package-internal imports
- **Domain(s):** cesr/primitives, cesr/composition
- **Source(s):** plan-D Q-CROSS-4
- **Question:** packaging.yaml places both in @kerizon/cesr. Can they import each other freely (package-internal), or must they respect domain boundaries within the same package?
- **Context:** If package-internal imports are free, the domain boundary is softer. If domain boundaries are enforced even within a package, the boundary is harder.
- **Oracle target:** design

### OQ-111: PWE escrow queue ownership
- **Domain(s):** accountability/consensus, accountability/dissemination
- **Source(s):** plan-D Q-CROSS-5
- **Question:** The EscrowCascade scenario references accountability domain for PWE (Partially-Witnessed Escrow). The consensus domain defines quorum rules, dissemination handles propagation. Who owns the PWE escrow queue?
- **Context:** If consensus owns it, consensus needs a repository port. If the parent accountability domain owns it (Layer 4), Layer 0 has no owner for PWE.
- **Oracle target:** design

### OQ-112: DeckName "witners" -- typo or canonical name?
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-1
- **Question:** The DeckName enum value is "witners" in the spec, but all other references say "witness." Is this the actual keria field name or a spec typo?
- **Context:** If it is the actual keria field name, it must be preserved for compatibility. If a typo, it should be corrected to "witnesses."
- **Oracle target:** design

### OQ-113: Monitor pluggable completion-check interface at Layer 0
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-3
- **Question:** The Monitor queries Counselor (Layer 1), Boatswain (Layer 2), etc. for operation completion. At Layer 0, these are unavailable. Is the Monitor designed around a pluggable completion-check interface that higher-layer domains register into?
- **Context:** If pluggable, the Monitor at Layer 0 needs an abstract interface. If the Monitor lives at a higher layer, it should not be in the processing subdomain.
- **Oracle target:** design

### OQ-114: Cloud agent escrow timeouts vs core protocol escrow timeouts
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-4
- **Question:** Core protocol defines OOE=1200s, PSE/PWE=3600s, PDE=86400s. Does the cloud agent processing layer use the same timeouts or its own configuration?
- **Context:** If different, the agent could prune events that the core protocol would still hold. If the same, agent-level escrows inherit protocol timeouts.
- **Oracle target:** design

### OQ-115: ServerOperation immutability and garbage collection after done=true
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-5
- **Question:** Once done=true, is the operation immutable? Can completed operations be deleted? What is the GC policy?
- **Context:** Without a GC policy, completed operations accumulate indefinitely.
- **Oracle target:** design

### OQ-116: Escrow sweep ordering for cloud agent escrows
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-6
- **Question:** The core protocol defines a strict OOE -> PSE -> PWE -> PDE sweep order. Does the cloud agent processing layer follow the same sweep order?
- **Context:** If different, the processing domain needs its own sweep ordering specification.
- **Oracle target:** design

### OQ-117: Empty credential filter behavior
- **Domain(s):** cloud-agent-service/processing
- **Source(s):** plan-E Q-PROC-7
- **Question:** The CredentialFilter invariant says "at least one filter field should be provided." Is this a hard requirement (error if empty) or soft recommendation (return all credentials if empty)?
- **Context:** An empty filter returning all credentials could be a performance problem. An empty filter returning an error could surprise callers.
- **Oracle target:** design

### OQ-118: AgentInstance.database_name -- implementation detail or domain concept?
- **Domain(s):** cloud-agent-service/provisioning
- **Source(s):** plan-E Q-PROV-5
- **Question:** The AgentInstance type has a database_name: string field. This is LMDB-specific. In DynamoDB (serious-keri), there is no "database name." Should this be replaced with a generic storage_namespace or removed?
- **Context:** Implementation-specific fields in domain types violate the implementation-agnostic principle.
- **Oracle target:** design

### OQ-119: Session timeout duration -- protocol constant or configurable?
- **Domain(s):** signify-client/key-management
- **Source(s):** plan-E Q-KM-1
- **Question:** The spec says "5-minute timeout" in the browser extension example but does not specify a default. Is this per-deployment configurable, per-client, or a protocol-level constant?
- **Context:** If protocol-level, all implementations use the same value. If configurable, the range should be specified (e.g., 1-30 minutes).
- **Oracle target:** design

### OQ-120: Extern keeper interface specification
- **Domain(s):** signify-client/key-management
- **Source(s):** plan-E Q-KM-2
- **Question:** The extern Keeper variant has only a provider: string field and is "not yet implemented." Should the spec define the external provider interface (HSM PKCS#11, cloud KMS, WebAuthn) or explicitly mark it as future?
- **Context:** Defining the interface now enables third-party implementations. Deferring avoids premature specification.
- **Oracle target:** design

### OQ-121: Encrypter -- separate service or part of Keeper?
- **Domain(s):** signify-client/key-management
- **Source(s):** plan-E Q-KM-4
- **Question:** The UL defines Encrypter as a separate term with its own responsibilities (X25519 ECDH + secretbox). But in implementations, the Encrypter is tightly coupled to the Keeper. Should the domain spec model it separately?
- **Context:** Separate modeling improves testability. Coupled modeling matches existing implementations.
- **Oracle target:** design

### OQ-122: PasscodeExpiredError recovery UX
- **Domain(s):** signify-client/key-management
- **Source(s):** plan-E Q-KM-6
- **Question:** PasscodeExpiredError has recovery: abort but severity: recoverable. Should the client auto-transition to locked state and wait for re-entry, or surface the error for application decision?
- **Context:** The session lifecycle shows timeout -> locked (not terminal). The domain should specify whether recovery is automatic or application-directed.
- **Oracle target:** design

### OQ-123: Retry policy for AgentConnectionError
- **Domain(s):** signify-client/resources
- **Source(s):** plan-E Q-RES-3
- **Question:** AgentConnectionError has recovery: retry, but no retry policy (max count, backoff strategy, circuit breaker) is defined. Should these be domain-level constants or caller-configurable?
- **Context:** Without a policy, implementations will diverge in retry behavior.
- **Oracle target:** design

### OQ-124: Default polling timeout for OperationTimeoutError
- **Domain(s):** signify-client/resources
- **Source(s):** plan-E Q-RES-4
- **Question:** No default operation polling timeout is specified. Different operation types likely have different expected durations. Should the timeout be per-operation-type or a global default?
- **Context:** Witness receipting completes in seconds; delegation approval may take hours. A single timeout is inappropriate.
- **Oracle target:** design

### OQ-125: Signify client local state caching
- **Domain(s):** signify-client/resources
- **Source(s):** plan-E Q-RES-5
- **Question:** The spec describes resource classes as pure API clients. But signify-ts caches identifier records locally. Should the domain spec acknowledge caching behavior?
- **Context:** If caching is specified, consistency guarantees must be defined. If implementation-specific, it is outside the domain boundary.
- **Oracle target:** design

### OQ-126: Controller AID rotation effect on in-flight operations
- **Domain(s):** signify-client/resources
- **Source(s):** plan-E Q-RES-6
- **Question:** If the controller rotates while operations are in-flight, do existing operations continue with the old key state or are they re-authenticated? Does the agent verify against request-time or operation-creation-time key state?
- **Context:** This affects the security model for long-running operations that span key rotations.
- **Oracle target:** design

### OQ-127: DateTime type ownership -- cesr/primitives or shared kernel?
- **Domain(s):** cesr/primitives
- **Source(s):** plan-D Q-PRIM-6
- **Question:** DateTime appears in cesr/primitives types.yaml but not in the published_language. KRAM timeliness (a messaging concern) depends on DateTime. Should DateTime be in primitives, or a shared type?
- **Context:** If DateTime is messaging-specific, it does not belong in primitives. If it is a general CESR-qualified type (like SAID or AID), it stays.
- **Oracle target:** design

### OQ-128: accountability/consensus and dissemination cross-domain type sharing
- **Domain(s):** accountability/consensus, accountability/dissemination
- **Source(s):** plan-D Q-CROSS-2
- **Question:** Both domains are in @kerizon/keri-core. Should they share types freely or communicate only through published languages? Dissemination references consensus#Receipt.
- **Context:** If they share freely, they are effectively one domain. If they use published languages, Receipt must be explicitly published.
- **Oracle target:** design
