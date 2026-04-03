# Layer 0 Synthesis — Oracle Resolution

## Summary
- Total questions: 108
- Questions resolved: 98
- Deferred: 10
- Fixes by category: CONTRADICTION (13), MISSING (36), VOCABULARY (3), DESIGN (43), BUILD_ORDER (3)

---

## Resolved Questions

### OQ-1: Superseding rules duplicated across delegation/recovery and integrity/recovery
- **Resolution:** The superseding rules form a single unified cascade owned by integrity/recovery. A-rules (non-delegated) and B-rules (delegated) and C (recursive bridge) are a single coherent set. Delegation/recovery imports B/C rules and adds delegation-specific context (seal verification, delegator KEL traversal) but does not redefine the superseding logic.
- **Evidence:** Spec HIGH confidence -- normative text presents A/B/C as one unified section. DDD principle: one domain owns the logic, others import.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/types.yaml` — define the canonical SupersedingRule enum with all variants (A0, A1, A2, B1, B2, B3, C, C1)
  - `rdod/spec/domains/delegation/recovery/types.yaml` — remove local SupersedingRule definition; add import from `types://integrity/recovery#SupersedingRule`
  - `rdod/spec/domains/delegation/recovery/domain.yaml` — add inbound dependency on integrity/recovery for superseding rules

### OQ-2: B3 superseding rule definition contradicts between UL and verification.yaml
- **Resolution:** B3 is an event-type comparison (rotation beats interaction at the same sn in the delegator's KEL), NOT a SAID lexicographic tiebreaker. The SAID-based tiebreaker is an artifact that does not appear in the normative spec.
- **Evidence:** Spec HIGH confidence -- normative text explicitly describes B3 as event-type comparison. Three-way agreement: spec is clear, keripy implements event-type comparison.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/verification.yaml` — remove the SAID lexicographic tiebreaker from the B3 rule definition; replace with: "B3: the superseding rotation's delegating event is a rotation AND the superseded rotation's delegating event is an interaction, at the same sn in the delegator's KEL"

### OQ-3: Recursive delegation termination algorithm (Rule C)
- **Resolution:** The algorithm is: (1) At current level, attempt A or B. (2) If neither satisfied, move up to the delegator's KEL and compare delegating events using A and B. (3) Repeat until satisfied or root non-delegated KEL reached. (4) At root, only A-rules apply; if unsatisfied, discard the superseding rotation. Termination guaranteed because delegation chains are finite and roots are non-delegated.
- **Evidence:** Spec HIGH confidence -- normative text spells out the recursive algorithm and termination guarantee.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/published_language.md` — add a "Recursive Superseding Evaluation" term documenting the step-by-step algorithm as `supersedes(event1, event2, kel) -> bool` with upward chain walk
  - `rdod/spec/domains/integrity/recovery/types.yaml` — if not present, add a `SupersedingEvaluation` service operation type with the recursive signature

### OQ-4: First-seen rule override conditions for superseding recovery rotations
- **Resolution:** The first-seen rule is NOT broken by superseding recovery. Superseding creates a fork: the original first-seen event remains on a disputed branch, and the superseding event becomes the trunk. Both events retain their first-seen ordinals. The superseding rules (A0-C1) define the precise conditions for acceptance.
- **Evidence:** Spec HIGH confidence -- normative text says events can be "superseded" but not "unseen." Three-way agreement with keripy (fn preserved for both branches).
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/accountability/consensus/published_language.md` — clarify that superseding is a fork operation, not a first-seen override; both branches retain fn ordinals
  - `rdod/spec/domains/accountability/consensus/ports.yaml` — add a guard condition on witness acceptance: check superseding rules before accepting a second event at the same sn

### OQ-5: PDE vs MDE escrow queue distinction
- **Resolution:** The escrow queue taxonomy (PDE, MDE, OOE, PSE, PWE, LDE) is an implementation concern, not protocol-specified. The protocol specifies validation conditions but not escrow mechanisms. In keripy, PDE = "delegator's KEL event containing approval seal not yet found" (remote validator), Delegable = "local delegator has not yet created approval event." There is no separate MDE class.
- **Evidence:** Spec LOW (silent on escrow queues). Keripy MEDIUM -- confirms PDE vs Delegable distinction by party role, no MDE.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/delegation/lifecycle/errors.yaml` — remove MDE as a separate escrow queue; consolidate to PDE (missing delegation seal) and Delegable (local delegator pending). Clarify the distinction is party-role-based (remote vs local)
  - `rdod/spec/domains/identity/establishment/types.yaml` — remove MDE from ValidationResult.escrowed if present; ensure EscrowDecision aligns with the consolidated queue set

### OQ-6: Cross-layer import mechanism for Layer 0 domains
- **Resolution:** Layer 0 defines port interfaces (abstract contracts) that higher layers implement. The identity/establishment domain declares it needs ThresholdSatisfaction and WitnessThresholdCheck as abstract ports, without importing concrete implementations from Layer 1+. This is a runtime dependency, not a build-time dependency.
- **Evidence:** Spec LOW (no layering concept). DDD principle: depend on abstractions, not concretions. Design decision.
- **Category:** BUILD_ORDER
- **Spec change:**
  - `rdod/spec/domains/identity/establishment/ports.yaml` — define `threshold-satisfaction` and `witness-threshold-check` as abstract inbound port interfaces (contracts only, no implementation reference)
  - `rdod/spec/domains/identity/establishment/domain.yaml` — document that these are abstract dependencies resolved at composition time, not build-time imports

### OQ-7: Delegation escrow timeout contradiction (3600s vs 86400s)
- **Resolution:** The authoritative timeouts from keripy are: Delegable escrow = 1200s, PSE (partial signatures including delegation) = 3600s. The 86400s (24h) value does NOT appear in keripy. Escrow timeouts are implementation parameters, not protocol constants.
- **Evidence:** Spec LOW (silent on timeouts). Keripy HIGH -- explicit constants: TimeoutOOE=1200, TimeoutPSE=3600, TimeoutPWE=3600, TimeoutLDE=3600. No 86400s anywhere.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/delegation/lifecycle/published_language.md` — fix the timeout values: Delegable=1200s, PDE (via PSE)=3600s. Remove the 86400s reference. Note that timeouts are configurable implementation parameters, not protocol normative values
  - `rdod/spec/domains/delegation/lifecycle/verification.yaml` — update any SMT assertions using 86400s to 1200s/3600s as appropriate

### OQ-8: EventSeal and EventLocationSeal type definitions missing from types.yaml
- **Resolution:** The complete seal type inventory is defined by the CESR count code seal table: DigestSeal ({d}), MerkleRootSeal ({rd}), SourceEventSeal ({s,d} -- AID implied), EventSeal ({i,s,d}), LastEstSeal ({i}), BackerSeal ({bi,d}), TypedDigestSeal ({t,d}). EventLocationSeal ({i,s,t,p}) is a keripy implementation type NOT in the normative spec -- remove it.
- **Evidence:** Spec HIGH confidence -- normative seal count code table is exhaustive. Keripy confirms EventLocationSeal is implementation-specific.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — define the complete Seal union: DigestSeal, MerkleRootSeal, SourceEventSeal, EventSeal, LastEstSeal, BackerSeal, TypedDigestSeal (7 variants)
  - `rdod/spec/domains/identity/anchoring/types.yaml` — remove any local seal type definitions; import from `types://cesr/primitives#Seal`
  - `rdod/spec/domains/identity/establishment/types.yaml` — remove local seal definitions; import from cesr/primitives
  - Remove EventLocationSeal references everywhere -- it is not protocol-normative

### OQ-9: Can non-transferable identifiers produce interaction events?
- **Resolution:** Non-transferable identifiers CANNOT produce any key events after inception -- including interaction events. "No more key events MUST be allowed" is absolute. This applies to witnesses and all non-transferable AIDs.
- **Evidence:** Spec HIGH confidence -- normative text is explicit. Keripy HIGH -- `if not self.transferable: raise ValidationError`. Three-way agreement.
- **Category:** MISSING (confirming existing design is correct)
- **Spec change:**
  - `rdod/spec/domains/identity/anchoring/errors.yaml` — NonTransferableAnchoringError is CORRECT as-is; add a note citing the normative text: "no more key events MUST be allowed in that KEL"

### OQ-10: Semantic difference between seals in interaction vs establishment events
- **Resolution:** All seals are cryptographically equivalent in verification procedure. However, seals in establishment events have stronger security guarantees: (1) signed by pre-rotated keys (first-time use), (2) bound to key state transitions, (3) cannot be created by an attacker with only current signing keys. The DND trait acknowledges: "A delegation seal MAY appear in an Interaction event. Interaction events are less secure than rotation events."
- **Evidence:** Spec MEDIUM confidence -- normative text confirms seal verification is identical but security properties differ.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/anchoring/published_language.md` — add a "Seal Security Properties" term noting: verification procedure is identical regardless of seal location; security strength differs (establishment > interaction) because establishment events use pre-rotated keys

### OQ-11: C3 on_failure escrow target mismatch (MAE vs MCE)
- **Resolution:** C3_kel_anchor failures should route to MAE (Missing Authorization Escrow), not MCE (Missing Chain Escrow). MCE is for ACDC edge chain verification, not KEL anchor verification.
- **Evidence:** Spec LOW (silent on credential escrow queues). DDD principle: escrow queue name must match the missing resource.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/verification.yaml` — change C3_kel_anchor `on_failure` target from MCE to MAE
  - `rdod/spec/domains/credential-lifecycle/status/errors.yaml` — ensure MissingAuthorizationError with recovery_target MAE exists for this routing

### OQ-12: KRAM signature format specification
- **Resolution:** KRAM is NOT part of the core KERI protocol specification. It is defined by the Signify protocol. The DDD spec should reference KRAM as an external protocol dependency.
- **Evidence:** Spec LOW (silent -- KRAM is Signify/KERIA specific, not core KERI).
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/signify-client/key-management/domain.yaml` — mark KRAM as an external protocol dependency; reference Signify specification for format details
  - `rdod/spec/domains/cloud-agent-service/api/domain.yaml` — mark KRAM authentication as an external protocol dependency

### OQ-13: KRAM timeliness window duration
- **Resolution:** KRAM timeliness is not a core KERI protocol parameter. Make the timeliness window a configurable parameter.
- **Evidence:** Spec LOW (silent -- KRAM not in core spec).
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cloud-agent-service/api/types.yaml` — add `kram_timeliness_window: Duration` as a configurable parameter (not a hardcoded constant) with a recommended default (defer exact value to keria oracle)

### OQ-14: HKDF vs argon2 for UUID derivation in blinding domain
- **Resolution:** Argon2 for initial salt stretching from a passphrase (slow, intentional). HKDF for deriving per-event UUIDs from a master secret (fast, deterministic). These serve different purposes and should both be documented.
- **Evidence:** Spec MEDIUM (ACDC spec treats UUIDs as high-entropy values, does not specify derivation method). DDD principle: distinguish the two KDF use cases.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/privacy/blinding/published_language.md` — clarify: argon2 = passphrase -> salt stretching (slow); HKDF = master secret -> per-event UUID derivation (fast). Remove ambiguous "argon2/HKDF" references
  - `rdod/spec/domains/privacy/blinding/types.yaml` — if KDF references exist, split into `PassphraseStretching` (argon2) and `UuidDerivation` (HKDF) operations

### OQ-15: Idempotent duplicate event handling -- accumulate signatures or discard?
- **Resolution:** When a duplicate event (same SAID) arrives for an already-accepted event, new valid signatures ARE accumulated via idempotent log update. The duplicate is NOT silently discarded. Both controller and witness signatures are verified and merged. No new fn is assigned (first=False).
- **Evidence:** Spec MEDIUM (normative: "Each witness also adds verified signatures from consistent receipts"). Keripy HIGH (`logEvent(first=False)` merges signatures). Three-way agreement.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/establishment/published_language.md` — add "Signature Accumulation" term: same-SAID duplicates trigger signature merge, not discard; no new fn assigned
  - `rdod/spec/domains/identity/establishment/types.yaml` — add a `signatures_merged` sub-case to WriteOutcome.accepted or ValidationResult.accepted for the `sn < expected, same SAID` case

### OQ-16: Local vs remote source distinction mechanism
- **Resolution:** Local/remote is a per-event boolean metadata flag, set at the processing facility level and overridable per-event. It is a domain-level concept persisted alongside each event (not transport-level). "Local" means trusted/protected channel. Local can upgrade remote but not vice versa.
- **Evidence:** Keripy HIGH -- `EventSourceRecord.local` persisted per (prefix, SAID), survives escrow round-trips.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/establishment/types.yaml` — define `EventSource` type with `local: boolean` semantics; document that local can promote remote but not reverse
  - `rdod/spec/domains/identity/establishment/errors.yaml` — update MisfitEventSourceError to reference the EventSource type

### OQ-17: First-seen ordinal -- global counter or per-AID counter?
- **Resolution:** The first-seen ordinal (fn) is a PER-AID monotonic counter, NOT a global counter. Each identifier prefix has its own independent fn sequence starting from 0. fn provides ordering within a single identifier's history.
- **Evidence:** Keripy HIGH -- `fels` database keyed by `(prefix, fn)` via `appendOn`. Three-way agreement with spec (fn is per-KEL).
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/identity/state/published_language.md` — clarify that `first_seen_sn` (fn) is per-AID, not global; remove any language suggesting global ordering via fn
  - `rdod/spec/domains/identity/state/types.yaml` — ensure KeyState.field_seen_sn is documented as per-AID

### OQ-18: WriteOutcome.accepted -- boolean first_seen vs integer first_seen_number
- **Resolution:** The commit result carries a nullable integer fn (None if not first-seen, integer if first-seen) plus a datetime string. The boolean `first_seen` is redundant with null-checking the ordinal.
- **Evidence:** Keripy HIGH -- `logEvent` returns `(fn_integer | None, dts_string)`.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/identity/state/types.yaml` — normalize WriteOutcome.accepted to `first_seen_number: integer | null` (null = duplicate signature accumulation); remove boolean `first_seen` field
  - `rdod/spec/domains/identity/establishment/types.yaml` — normalize ValidationResult.accepted to match: `first_seen_number: integer | null`

### OQ-19: Validation pipeline -- strictly sequential or parallelizable?
- **Resolution:** The validation pipeline is STRICTLY SEQUENTIAL with short-circuit on escrow. Order: (1) signature verification, (2) misfit/source check, (3) signing threshold, (4) prior-next threshold (rotation only), (5) witness threshold, (6) delegation validation. Each check can escrow the event and halt further evaluation. The first unsatisfied check determines the escrow queue.
- **Evidence:** Keripy HIGH -- `valSigsWigsDel` executes checks sequentially with exception-based short-circuit. Parallelization NOT safe.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/identity/establishment/verification.yaml` — redraw the validation constraint DAG as a sequential pipeline (not parallel branches). The ordering matters for escrow routing

### OQ-20: Key exposure detection -- who checks and when?
- **Resolution:** "Key exposure" in keripy is the rotation-time verification that signing keys match pre-committed digests -- it is part of rotation validation (step 4). There is NO separate key-exposure attack detection. Protection is structural: pre-committed keys are digests, so attackers cannot use them as signing keys without performing a rotation.
- **Evidence:** Keripy HIGH -- `exposeds()` is called during rotation validation, not as a separate security check.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/identity/key-commitment/errors.yaml` — remove KeyExposureError or redefine it as a builder-time constraint (event construction, not validation). The validation pipeline does not check for premature key exposure -- digest commitment makes it structurally impossible
  - `rdod/spec/domains/identity/key-commitment/published_language.md` — clarify that "key exposure" means "proving knowledge of a pre-committed key during rotation," not "detecting premature key use"

### OQ-21: Consumed-digest tracking -- explicit persistent set or KEL-derived?
- **Resolution:** Consumed-digest tracking is IMPLICIT through current key state. The `ndigers` field always reflects the next-key digests from the latest establishment event. Once a rotation consumes digests, the state advances to the new next-key set. "One-time use" is enforced by state progression, not explicit tracking.
- **Evidence:** Keripy HIGH -- `self.ndigers` overwritten after each rotation, no separate consumed-digest database.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/identity/key-commitment/types.yaml` — do NOT define a separate consumed-digest repository; document that enforcement is implicit via key state progression
  - `rdod/spec/domains/identity/key-commitment/published_language.md` — add that "one-time use" is enforced by state advancement: each rotation's `n` field becomes the next `ndigers` to be consumed

### OQ-22: Partial rotation -- can new signing keys include keys NOT from the pre-committed set?
- **Resolution:** YES. In a partial (or augmented) rotation, the new signing key list CAN include entirely new keys with no corresponding prior next-key digest. The constraint is on SIGNATURES, not keys: enough signatures must expose prior next-key digests to satisfy the prior-next threshold. The current key list = (threshold-satisficing subset of prior-next keys) UNION (any additional new keys).
- **Evidence:** Spec HIGH (normative "Reserve Rotation" section confirms superset is valid). Keripy HIGH (`exposeds()` checks signatures, not key list). Three-way agreement.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/key-commitment/published_language.md` — add "Augmented Rotation" term: the pre-rotation commitment constrains which SIGNATURES are required, not which keys can appear; new signing keys are unconstrained

### OQ-23: Pre-rotation binding -- positional or cross-position via ondex?
- **Resolution:** Cross-position matching IS valid and is the entire purpose of the dual-index (index/ondex) mechanism. A signature with index=2 and ondex=0 means: key at position 2 in current signing list corresponds to position 0 in prior next-key digest list.
- **Evidence:** Spec HIGH (CESR spec describes dual-indexed signatures for this purpose). Keripy HIGH (`siger.ondex` indexes into `self.ndigers` independently of `siger.index`). Three-way agreement.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/identity/key-commitment/types.yaml` — update BindingVerification to use `(index, ondex, expected_digest, computed_digest)` tuples, not just `(index, expected_digest, computed_digest)`; ondex is essential for cross-position matching

### OQ-24: Delegation seal in inception events -- valid or only in rot/ixn?
- **Resolution:** A delegation approval seal CAN appear in any event type including inception events. The inception event's `a` field accepts arbitrary seal data. In practice, inception seals are rare but protocol-valid.
- **Evidence:** Keripy HIGH -- `incept()` function includes `a=data` (list of seal dicts). DIP events use the same builder.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/delegation/authorization/published_language.md` — update delegation seal location text to: "interaction event (ixn), rotation event (rot), or inception event (icp)"

### OQ-25: Boot endpoint authentication model
- **Resolution:** Deferred -- requires keria oracle investigation. The spec is silent on boot endpoint authentication specifics.
- **Evidence:** N/A (no oracle finding).
- **Category:** DEFERRED (see Deferred section)

### OQ-26: Agent provisioning -- required components and adopter-centric names
- **Resolution:** Deferred -- requires keria oracle investigation for component inventory and initialization order.
- **Evidence:** N/A (no oracle finding).
- **Category:** DEFERRED (see Deferred section)

### OQ-27: Should identity subdomains adopt kernel://cesr for typed CESR primitives?
- **Resolution:** YES. All identity subdomains should declare a dependency on cesr/primitives to get typed CESR primitives (SAID, AID, Verfer, Diger, Siger) as first-class types rather than opaque strings.
- **Evidence:** DDD principle: type safety at domain boundaries. Design decision.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/identity/establishment/domain.yaml` — add inbound dependency on `kernel://cesr/primitives` for typed CESR primitives
  - `rdod/spec/domains/identity/state/domain.yaml` — add inbound dependency on `kernel://cesr/primitives`
  - `rdod/spec/domains/identity/key-commitment/domain.yaml` — add inbound dependency on `kernel://cesr/primitives`
  - `rdod/spec/domains/identity/anchoring/domain.yaml` — add inbound dependency on `kernel://cesr/primitives`

### OQ-28: DigestAlgorithm enum duplicated across two identity subdomains
- **Resolution:** Move DigestAlgorithm to cesr/primitives (digest algorithms are CESR-level concerns). Both identity subdomains import from there.
- **Evidence:** DDD principle: single source of truth. Design decision.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — define DigestAlgorithm enum here (canonical location)
  - `rdod/spec/domains/identity/key-commitment/types.yaml` — remove local DigestAlgorithm; import from `types://cesr/primitives#DigestAlgorithm`
  - `rdod/spec/domains/identity/anchoring/types.yaml` — remove local DigestAlgorithm; import from `types://cesr/primitives#DigestAlgorithm`

### OQ-29: cesr/composition dependency on cesr/primitives -- should composition be Layer 1?
- **Resolution:** YES. cesr/composition depends on cesr/primitives types (Matter, Siger, Cigar, Diger, Prefixer, Seqner). Composition should be Layer 1, primitives stays at Layer 0.
- **Evidence:** DDD principle: if A imports types from B, A is at a higher layer. Design decision.
- **Category:** BUILD_ORDER
- **Spec change:**
  - `rdod/spec/build-order.txt` — move cesr/composition from Layer 0 to Layer 1; cesr/primitives remains at Layer 0

### OQ-30: DND (Do Not Delegate) trait -- checked at inception or each establishment event?
- **Resolution:** DND is an inception-only trait. It MUST only appear in the inception event and cannot be added via rotation. Once set at inception, it permanently prevents the AID from acting as a delegator.
- **Evidence:** Spec HIGH -- normative column says "Inception Only" for DND.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/delegation/authorization/published_language.md` — clarify DND is immutable and inception-only; cannot be retroactively applied via rotation
  - `rdod/spec/domains/delegation/authorization/verification.yaml` — DND validation should check the delegator's INCEPTION event, not current key state

### OQ-31: Delegation workflow ordering -- witnesses first or approval first?
- **Resolution:** Workflow order: (1) delegatee signs event, (2) delegatee sends to witnesses for receipting, (3) delegatee sends event with controller+witness signatures to delegator for approval. Witnesses come BEFORE delegator approval.
- **Evidence:** Spec HIGH -- normative text: delegatee "SHOULD propagate that event with attached signatures to the event's witnesses for receipting" THEN "propagate that event with attached controller signatures and attached witness signatures to the event's delegator for approval."
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/delegation/lifecycle/published_language.md` — document workflow order: delegatee-sign -> witness-receipt -> delegator-approval -> publication
  - `rdod/spec/domains/delegation/lifecycle/ports.yaml` — ensure PWE (missing witness) precedes PDE (missing delegation) in the escrow cascade ordering

### OQ-32: DisclosureMode 7 variants vs FSM 3 states
- **Resolution:** The 3-state FSM (compact -> partial -> full) correctly models the core progression. The other modes are orthogonal: Selective is an alternative to Partial (per-element vs per-section), Metadata is a pre-disclosure phase, Nested Partial extends Partial to hierarchical data, Bulk-issued is an issuance-time mechanism.
- **Evidence:** Spec MEDIUM -- ACDC spec lists modes as independent mechanisms that MAY be combined.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/disclosure/types.yaml` — keep 3-state FSM (compact -> partial -> full). Model Selective as an orthogonal property (not FSM state). Model Metadata as an optional pre-state. Model BulkIssued as an issuance property, not a disclosure mode
  - `rdod/spec/domains/privacy/disclosure/published_language.md` — document: core progression = compact->partial->full; orthogonal axes = selective (per-element), metadata (pre-disclosure), nested partial (hierarchical), bulk-issued (issuance-time)

### OQ-33: Metadata and BulkIssued disclosure progression rules
- **Resolution:** Metadata is a pre-disclosure phase that can progress to compact, then follow the normal path. Bulk-issued is not a disclosure mode but an issuance-time mechanism. Each bulk-issued instance independently follows the normal disclosure progression.
- **Evidence:** Spec MEDIUM -- normative text describes metadata as pre-disclosure and bulk-issued as issuance mechanism.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/privacy/disclosure/types.yaml` — extend FSM with optional metadata pre-state: metadata -> compact -> partial -> full. BulkIssued should be modeled as an issuance property on the credential, not a disclosure FSM state

### OQ-34: Chain-link confidentiality guard at Layer 0
- **Resolution:** At Layer 0, the disclosure domain should accept a `terms_agreed: boolean` parameter provided by the caller. The IPEX exchange domain (higher layer) determines agreement status and passes it down.
- **Evidence:** Spec MEDIUM -- ACDC spec describes chain-link as contractual/exchange-level, not cryptographic.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/disclosure/ports.yaml` — the partial->full guard should accept `terms_agreed: boolean` as an input parameter, not query the exchange domain directly

### OQ-35: Complete CESR prefix code set for transferable/non-transferable identifiers
- **Resolution:** 4 key types, each with transferable and non-transferable variants, plus Blake3_256 self-addressing: Ed25519 (B/D), secp256k1 (1AAA/1AAB), Ed448 (1AAC/1AAD), secp256r1 (1AAI/1AAJ), Blake3_256 (E). Total: 9 prefix codes.
- **Evidence:** Spec HIGH -- CESR code table is exhaustive.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/key-commitment/types.yaml` — update PrefixCode enum to include all 9 codes: Ed25519(D), Ed25519N(B), ECDSA_256k1(1AAB), ECDSA_256k1N(1AAA), Ed448(1AAD), Ed448N(1AAC), ECDSA_256r1(1AAJ), ECDSA_256r1N(1AAI), Blake3_256(E). Classification: non-transferable={B, 1AAA, 1AAC, 1AAI}; transferable={D, 1AAB, 1AAD, 1AAJ}; self-addressing={E}

### OQ-36: ample() minimum fault tolerance for small witness counts
- **Resolution:** f=0 is valid for N=1 (no fault tolerance -- controller accepts this risk). The spec does not impose a minimum pool size. The ample() formula is implementation guidance, not normative. The spec only requires the chosen M satisfies the immunity constraint.
- **Evidence:** Spec MEDIUM -- normative constraint is M < N with F* = N-M, no minimum N.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/accountability/consensus/published_language.md` — note that f=0 is valid for N=1; ample() is implementation guidance, not normative; the spec only requires the chosen threshold satisfies the immunity constraint

### OQ-37: V2 version string exact format and regex
- **Resolution:** V2 version string = `PPPPMmmGggKKKKBBBB.` (19 chars). BBBB is Base64-encoded total serialization length (max 16,777,216). Regex: `[A-Z]{4}[A-Za-z0-9_-]{3}[A-Za-z0-9_-]{3}(JSON|CBOR|MGPK|CESR)[A-Za-z0-9_-]{4}\.`
- **Evidence:** Spec HIGH -- normative text specifies the exact format.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/types.yaml` — add V2VersionString type with the exact format, regex pattern, and BBBB semantics (4 Base64 digits, max 16,777,216)

### OQ-38: Genus/version code parser state management
- **Resolution:** Genus/version state is maintained per-group (within enclosing count code groups), not per-stream or per-frame. Parser must track "active genus" as scoped state within each group.
- **Evidence:** Spec HIGH -- normative text: "modifies interpretation of all subsequent codes within the same enclosing Count Code groups."
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/published_language.md` — document genus/version as scoped context parameter, not global mutable state; parser accepts genus context overridable at group boundaries

### OQ-39: Signable count codes (-E, -F, -G) -- signed content boundary
- **Resolution:** Signable count codes use the count (in quadlets/triplets) to delineate signed content boundaries. The parser reads exactly `count` quadlets of content, then expects attachment groups to follow.
- **Evidence:** Spec HIGH -- count codes frame content by count, attachments follow.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/published_language.md` — document that signable count codes delineate signed content by count; content ends at count boundary, signature attachments follow

### OQ-40: Canonical KERI/ACDC genus CesrGroup variant enumeration
- **Resolution:** The CESR spec defines genus-specific count codes for KERI/ACDC 2.00 including: ControllerIdxSigs(-K), WitnessIdxSigs(-L), NonTransReceiptCouples(-M), TransReceiptQuadruples(-N), FirstSeenReplayCouples(-O), TransIdxSigGroups(-P), DigestSealSingles(-Q), MerkleRootSealSingles(-R), SealSourceCouples(-S), SealSourceTriples(-T), SealSourceLastSingles(-U), BackerRegistrarSealCouples(-V), TypedDigestSealCouples(-W), plus specialized groups (-X through -d, -a, -b).
- **Evidence:** Spec HIGH -- CESR genus-specific count code table.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/types.yaml` — enumerate all genus-specific count codes from the CESR KERI/ACDC 2.00 table in the CesrGroup union

### OQ-41: Enclosure code -H encoding for non-native content
- **Resolution:** The -H enclosure code wraps a complete non-native serialization (JSON, CBOR, or MGPK field map) as raw bytes within a CESR group. The enclosed content includes its version string prefix. Count measures total size in quadlets/triplets.
- **Evidence:** Spec HIGH -- normative text confirms non-native serializations within CESR groups must be enclosed.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/published_language.md` — document that -H contains a complete non-native message including version string; parser detects serialization type from enclosed content's leading bytes

### OQ-42: Tritet 0b000 ("Free"/"Annotated T-domain") practical usage
- **Resolution:** Tritet 0b000 indicates annotated T-domain content -- whitespace characters (LF 0x0A, CR 0x0D, tab 0x09). Not standalone primitives. Parser strips whitespace and re-dispatches.
- **Evidence:** Spec HIGH -- normative text describes de-annotation for 0b000 tritet.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/types.yaml` — model 0b000 as annotation/whitespace in cold-start dispatch; parser strips and re-dispatches, not content-bearing

### OQ-43: End-Role -- is "mediator" a valid role?
- **Resolution:** The KERI spec lists known roles (witness, controller, agent, watcher, registrar, judge, juror, forwarder) but says "include but are not limited to." "Mediator" does not appear in the spec. The role set is extensible.
- **Evidence:** Spec MEDIUM -- normative text uses "include but are not limited to."
- **Category:** VOCABULARY
- **Spec change:**
  - `rdod/spec/domains/signify-client/resources/types.yaml` — define known roles: witness, controller, agent, watcher, registrar, judge, juror, forwarder; add extension mechanism; flag "mediator" as pending KSWG standardization (not yet normative)

### OQ-44: BADA staleness logic -- public interface or internal mechanism?
- **Resolution:** BADA is a PUBLIC interface (explicit service method), not an internal implementation detail. It applies to reply messages (rpy ilk), not key events. Comparison uses (sn of endorser's establishment event + datetime) for transferable, (datetime only) for non-transferable.
- **Evidence:** Keripy HIGH -- `Revery.acceptReply()` is a public method called explicitly by reply processing.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/state/ports.yaml` — expose BADA as an explicit port operation for reply acceptance; document that it applies to reply messages, not key events
  - Consider whether BADA belongs in identity/state or a separate reply-routing domain

### OQ-45: State-read-model consistency guarantee after escrow promotions
- **Resolution:** State is IMMEDIATELY consistent after escrow promotion. The full processEvent -> update -> logEvent path updates both in-memory state and persistent database synchronously. No staleness window exists. All operations are single-threaded within a processing pass.
- **Evidence:** Keripy HIGH -- `states.pin` writes updated state immediately after escrow promotion.
- **Category:** MISSING (confirming existing design)
- **Spec change:**
  - `rdod/spec/domains/identity/state/published_language.md` — confirm "immediately consistent" claim; no staleness window after escrow promotion

### OQ-46: KEL repository append-only invariant vs escrow pruning
- **Resolution:** The append-only invariant applies ONLY to the accepted KEL and first-seen event log. Escrow queues are separate mutable structures supporting add, get, and remove. Pruning timed-out events from escrow does NOT violate append-only because escrows are NOT part of the KEL.
- **Evidence:** Keripy HIGH -- `.kels` and `.fels` are append-only; `.ooes`, `.pses`, `.pwes`, `.ldes`, `.delegables` support CRUD.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/identity/state/published_language.md` — explicitly distinguish "accepted KEL" (append-only) from "escrow queues" (add/remove/prune)
  - `rdod/spec/domains/identity/state/ports.yaml` — document that kel-repository is append-only; escrow-drain port operates on mutable queues

### OQ-47: Delegable event escrow promotion path
- **Resolution:** When a delegable event is promoted, it goes through the FULL validation pipeline via processEvent(), not directly to PDE or KEL. The outcome depends on current state: if all thresholds met, goes to KEL; if not, may escrow to PSE, PWE, or PDE. PDE is not a mandatory intermediate step.
- **Evidence:** Keripy HIGH -- promoted events go to `processEvent()` which runs the full pipeline.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/delegation/lifecycle/published_language.md` — change from "promoted to PDE or directly to KEL" to "promoted to full re-validation via the validation pipeline"; PDE is not mandatory

### OQ-48: Delegator key rotation effect on PDE seal validity
- **Resolution:** Delegation seals are bound to a SPECIFIC event in the delegator's KEL (by sn + SAID), not to the delegator's current key state. A delegator key rotation does NOT invalidate existing delegation seals because seals are anchored in committed, immutable events.
- **Evidence:** Keripy MEDIUM -- `.aess` stores (Number, Diger) couple identifying the specific delegator event.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/delegation/lifecycle/published_language.md` — clarify that delegation seals are event-bound, not key-state-bound; delegator rotation has no effect on already-anchored seals

### OQ-49: Siger dual-indexed code encoding -- index/ondex split in soft part
- **Resolution:** The soft part is split SYMMETRICALLY: main index size (ms = ss - os) always equals ondex size (os). Main index comes first, ondex second. For 2A (ss=4, os=2): first 2 chars = index, last 2 chars = ondex.
- **Evidence:** Keripy HIGH -- `Xizage` table with explicit os values.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — add Xizage type with formula: `ms = ss - os`, soft part layout `[index_chars(ms)][ondex_chars(os)]`; document the symmetric split

### OQ-50: Tholder.satisfy() ownership -- encoding only or satisfaction logic too?
- **Resolution:** In keripy, Tholder owns BOTH encoding/decoding AND satisfaction logic. The satisfy() method is a core part of Tholder, not delegated to a separate domain. For weighted thresholds, satisfaction requires ALL clauses to sum to >= 1 (AND semantics).
- **Evidence:** Keripy HIGH -- Tholder class in coring.py includes satisfy(), _satisfy_numeric(), _satisfy_weighted().
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — keep Tholder with satisfy() in cesr/primitives; the identity/thresholds domain should import and use Tholder's satisfy, not re-implement. Note: this means cesr/primitives contains non-trivial domain logic, which is a deliberate design choice following keripy

### OQ-51: Mid-padding algorithm for qb64 encoding
- **Resolution:** qb64 mid-padding: (1) compute ps = (3 - ((rs + ls) % 3)) % 3, (2) prepend (ps + ls) zero bytes to raw, (3) Base64-encode, (4) skip first ps chars, (5) prepend code string. This places zero-valued pad bits between code and raw data, avoiding trailing '=' characters.
- **Evidence:** Keripy HIGH -- `Matter._infil()` with exact algorithm.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/published_language.md` — add "Mid-Padding Algorithm" term with the precise formula: `ps = (3 - ((raw_size + lead_size) % 3)) % 3`, constraint `ps == code_size % 4`

### OQ-52: Complete Sizage table for all code table entries
- **Resolution:** The Sizage table is EXPLICITLY ENUMERATED, not formula-derivable. Each code has its own (hs, ss, xs, fs, ls) tuple. The complete table must be extracted from keripy's Matter.Sizes and replicated.
- **Evidence:** Keripy HIGH -- Matter.Sizes, Indexer.Sizes, Counter sizes are enumerated.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/` — add a reference artifact (e.g., `references/sizage-table.yaml`) containing the complete Sizage table extracted from keripy

### OQ-53: One-character code assignments beyond E
- **Resolution:** All 26 uppercase one-char codes (A-Z) are assigned. Only lowercase 'a' (Salt_256) is assigned. Lowercase b-z are parser-recognized but UNASSIGNED/RESERVED.
- **Evidence:** Keripy HIGH -- MatterCodex and Matter.Hards table.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — list complete one-char code assignments (A-Z + a); note lowercase b-z are reserved but unassigned; error handling should distinguish "reserved/unassigned" from "invalid"

### OQ-54: Key derivation path offset formula
- **Resolution:** In keripy, the path formula is `stem + hex(ridx) + hex(kidx + i)`. Stem defaults to `hex(pidx)`. No transferable/pidx offset in the path itself -- that complexity lives in the caller. The signify-ts offset calculation produces equivalent kidx values.
- **Evidence:** Keripy HIGH -- `SaltyCreator.create()` with exact formula.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/signify-client/key-management/published_language.md` — document the keripy reference formula: `path = stem + hex(ridx) + hex(kidx + i)`, stem defaults to `hex(pidx)`; note signify-ts offset as implementation convenience

### OQ-55: DuplicityEventLog persistence -- who owns it?
- **Resolution:** The DEL IS persisted via the central database. The integrity/detection domain SHOULD have an outbound persistence port for DEL storage.
- **Evidence:** Keripy HIGH -- `Baser.ldes` is a persistent LMDB sub-database, managed by Kevery.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/domain.yaml` — add outbound persistence port for DEL storage
  - `rdod/spec/domains/integrity/detection/ports.yaml` — add a `duplicity-event-log` outbound repository port

### OQ-56: Agent destruction -- synchronous or asynchronous?
- **Resolution:** Deferred -- requires keria oracle investigation.
- **Category:** DEFERRED (see Deferred section)

### OQ-57: In-flight operations during agent destruction
- **Resolution:** Deferred -- requires keria oracle investigation.
- **Category:** DEFERRED (see Deferred section)

### OQ-58: Re-provisioning after destruction -- allowed?
- **Resolution:** Deferred -- requires keria oracle investigation.
- **Category:** DEFERRED (see Deferred section)

### OQ-59: Notification lifecycle -- expiry, queue depth, retention policy
- **Resolution:** Deferred -- requires keria oracle investigation.
- **Category:** DEFERRED (see Deferred section)

### OQ-60: Boot endpoint validation beyond event structure
- **Resolution:** Deferred -- requires keria oracle investigation.
- **Category:** DEFERRED (see Deferred section)

### OQ-61: InteractionEvent type ownership -- establishment or anchoring domain?
- **Resolution:** Keep InteractionEvent in identity/establishment as part of the KeyEvent union. Anchoring imports the type from establishment. The KeyEvent union is the canonical event taxonomy; anchoring adds seal management behavior on top.
- **Evidence:** DDD principle: the type union should live where the discriminated union is consumed as a whole.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/identity/anchoring/domain.yaml` — add inbound import from identity/establishment for InteractionEvent type; do NOT move the type

### OQ-62: TELEvent vs TelEvent -- redundant types with confusing names
- **Resolution:** Rename for clarity: TELEvent (the union of registry events) becomes `TelEventUnion`. TelEvent (core identifying fields) becomes `TelEventId`. Both serve distinct purposes but the names are dangerously similar.
- **Evidence:** DDD principle: names must be unambiguous.
- **Category:** VOCABULARY
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/types.yaml` — rename TELEvent to `TelEventUnion` (or keep as TELEvent); rename TelEvent to `TelEventId` (the identifying tuple: type, registry_said, credential_said)

### OQ-63: StateQueryInput carrying a full LifecycleStateSnapshot
- **Resolution:** Remove the credential_snapshot from StateQueryInput. The authorize port should reconstruct state internally from the TEL (CQRS pattern). The caller provides the TEL event to authorize, not the current snapshot.
- **Evidence:** DDD principle: service reconstructs state, not caller.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/types.yaml` — remove `credential_snapshot` from StateQueryInput; the service derives state from the TEL

### OQ-64: Missing OOT escrow type in errors.yaml
- **Resolution:** Add OutOfOrderTelEventError with recovery_target OOT for C4 failure routing.
- **Evidence:** DDD principle: every escrow routing needs a typed error.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/errors.yaml` — add OutOfOrderTelEventError with recovery_target OOT, description "TEL event arrived out of sequence order"

### OQ-65: C2 on_failure escrow target unspecified
- **Resolution:** C2_issuer_key_state on_failure should explicitly route to MRI (Missing Registry Issuer). The MissingIssuerError already has recovery_target MRI.
- **Evidence:** DDD principle: explicit escrow routing for every failure path.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/verification.yaml` — set C2_issuer_key_state `on_failure` to explicitly route to MRI

### OQ-66: Layer 0 TELEvent referencing Layer 6 registry types
- **Resolution:** At Layer 0, credential-lifecycle/status should define its own minimal event structure types using opaque SAID references for registry fields. When Layer 6 is built, these become concrete type imports.
- **Evidence:** DDD principle: Layer 0 cannot import Layer 6; use forward references.
- **Category:** BUILD_ORDER
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/types.yaml` — replace direct Layer 6 type imports with opaque SAID references for registry fields; document as forward references to be resolved at Layer 6

### OQ-67: AggregationInput serialization_kind inference
- **Resolution:** Add a `serialization_kind` field to AggregationInput. The caller provides it, typically inferred from the ACDC's version string.
- **Evidence:** DDD principle: explicit inputs over implicit inference.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/types.yaml` — add `serialization_kind: SerializationKind` field to AggregationInput (values: JSON, CBOR, MGPK)

### OQ-68: AggregationInput blinded_block variant semantics
- **Resolution:** The blinded_block variant is for contributing one block to an in-progress aggregation. The aggregation service maintains a list internally and computes the AGID when all blocks are provided. Alternatively, change the input to accept a LIST of blinded blocks.
- **Evidence:** DDD principle: the port contract must match the operation's data needs.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/types.yaml` — change `blinded_block` variant to accept `blinded_blocks: BlindedAttributeBlock[]` (list), matching the AGID computation's need for all block SAIDs

### OQ-69: SADPath format inconsistency (array vs string)
- **Resolution:** Normalize to string format (e.g., "-a-i") as the canonical representation, with a parse utility to produce array form. String is more compact and matches the CESR attachment path format.
- **Evidence:** DDD principle: single canonical representation.
- **Category:** VOCABULARY
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/types.yaml` — normalize SADPath to string format (e.g., "-a-i"); provide parse utility specification for converting to array form

### OQ-70: Compactor type formalization
- **Resolution:** Compactor should be an internal implementation detail of the aggregation service, not a formal public type. Only port results (AGID, compacted SAID) are visible.
- **Evidence:** DDD principle: expose behavior through ports, not internal state.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/types.yaml` — do NOT add formal Compactor type; keep as internal to the service implementation

### OQ-71: Indexed vs non-indexed SAD path signatures
- **Resolution:** Split SadPathSig into two variants: IndexedSadPathSig (Siger, quinkey indexing, .spsgs group) and CoupledSadPathSig (Cigar, couple form, .spcgs group). The consumer needs to know which verification form to use.
- **Evidence:** DDD principle: type discriminates verification requirements.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/types.yaml` — replace SadPathSig with a discriminated union: `IndexedSadPathSig` (indexed) and `CoupledSadPathSig` (non-indexed)

### OQ-72: BlindedAttributeBlock field structure vs virtual field labels
- **Resolution:** The td and ts are virtual labels (computed at verification time, never serialized). The BlindedAttributeBlock type should contain {d, u, attributes} as concrete fields. The virtual labels should be documented in the published language but NOT as type fields.
- **Evidence:** DDD principle: separate serialized fields from computed values.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/blinding/types.yaml` — keep BlindedAttributeBlock as {d, u, attributes}; do NOT add td/ts as fields
  - `rdod/spec/domains/privacy/blinding/published_language.md` — document td, ts as virtual labels computed during BLID verification, never serialized

### OQ-73: Blinding domain port contract -- single port with multiple operations
- **Resolution:** Split the blinded-state port into separate ports: `compute-blid` (pure computation), `discover-state` (query), `construct-bound-block` (builder). Each has a distinct input/output contract.
- **Evidence:** DDD principle: single-responsibility ports.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/blinding/ports.yaml` — split blinded-state into three ports: `compute-blid`, `discover-state`, `construct-bound-block`

### OQ-74: Privacy subdomain coordination at Layer 0
- **Resolution:** At Layer 0, each privacy subdomain (aggregation, blinding, disclosure) is self-contained with no awareness of the others. Orchestration happens only at the parent privacy domain (Layer 7).
- **Evidence:** DDD principle: Layer 0 subdomains are independent; parent domain orchestrates.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/domain.yaml` — ensure no cross-references to blinding or disclosure
  - `rdod/spec/domains/privacy/blinding/domain.yaml` — ensure no cross-references to aggregation or disclosure
  - `rdod/spec/domains/privacy/disclosure/domain.yaml` — ensure no cross-references to aggregation or blinding

### OQ-75: TEL v2 bup event authority -- status domain or blinding domain?
- **Resolution:** The status domain owns bup event structure and FSM transitions. The blinding domain provides BLID computation as a service that the status domain calls during bup validation. Dependency: status -> blinding (blinding is a lower-layer utility).
- **Evidence:** DDD principle: event lifecycle owns the event; cryptographic computation is a service.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/credential-lifecycle/status/domain.yaml` — add dependency on privacy/blinding for BLID computation during bup validation
  - `rdod/spec/domains/privacy/blinding/ports.yaml` — ensure compute-blid port is suitable for status domain consumption

### OQ-76: Delegation subdomain decomposition -- too many small domains?
- **Resolution:** Keep the three delegation subdomains (authorization, lifecycle, recovery) separate. The coupling is managed through explicit port contracts. Merging would increase internal complexity without proportional benefit.
- **Evidence:** DDD principle: prefer explicit ports over monolithic domains.
- **Category:** DESIGN
- **Spec change:**
  - No structural change. Ensure each delegation subdomain has explicit port contracts for cross-subdomain interactions.

### OQ-77: Integrity/detection vs integrity/recovery for superseding recovery
- **Resolution:** Detection only detects duplicity and emits evidence (DuplicityNotice). Recovery evaluates whether superseding is possible and executes it. Detection should NOT implement any recovery logic.
- **Evidence:** DDD principle: separation of concerns.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/published_language.md` — ensure detection only emits DuplicityNotice events; remove any superseding recovery logic references
  - `rdod/spec/domains/integrity/recovery/domain.yaml` — recovery consumes DuplicityNotice from detection as an inbound event

### OQ-78: Consensus domain vs accountability/receipting for receipt storage
- **Resolution:** Consensus is a pure computation/rules service -- it computes whether thresholds are met, but does NOT store receipts. Receipt storage belongs to a persistence layer (accountability/receipting or the KEL repository).
- **Evidence:** DDD principle: computation services are stateless.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/consensus/domain.yaml` — ensure no repository/persistence ports; consensus is computation-only
  - `rdod/spec/domains/accountability/consensus/types.yaml` — Receipt type definition can stay here (it is a domain concept), but storage is external

### OQ-79: Sadder/Serder/Creder hierarchy -- split across domains or keep in composition?
- **Resolution:** Sadder stays in cesr/composition (generic SAD serializer). Serder should be a facade in the identity domain (adds KERI event awareness: verfers, digers). Creder should be a facade in the credential domain (adds ACDC awareness: issuer, schema). This keeps composition as a pure codec.
- **Evidence:** DDD principle: domain-specific facades should live in their domains.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cesr/composition/types.yaml` — keep Sadder (generic SAD); move Serder/Creder definitions to their respective domains
  - `rdod/spec/domains/identity/establishment/types.yaml` — add Serder as a facade extending Sadder with KERI event fields
  - `rdod/spec/domains/credential-lifecycle/status/types.yaml` — add Creder as a facade extending Sadder with ACDC fields

### OQ-80: OperationStatus vs ServerOperation -- normalize or intentional asymmetry?
- **Resolution:** Normalize to a single shared type `Operation` with consistent field naming. The client and server may have different views (client omits internal fields), but the shared fields should use the same names.
- **Evidence:** DDD principle: shared contracts use shared types.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cloud-agent-service/processing/types.yaml` — normalize field names to match between client and server views; use `result` consistently (not `result` vs `response`)

### OQ-81: OperationType vs OpType -- single type or two?
- **Resolution:** Normalize to a single type `OperationType`. Remove OpType alias.
- **Evidence:** DDD principle: no redundant types.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cloud-agent-service/processing/types.yaml` — remove OpType; keep only OperationType

### OQ-82: "done" as an OpType value -- status or workflow type?
- **Resolution:** Remove "done" from OperationType enum. "done" is a status value, not a workflow type. Handle it as a special case in the operation lifecycle state machine.
- **Evidence:** DDD principle: enums should have single semantic dimension.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cloud-agent-service/processing/types.yaml` — remove "done" from OperationType; model completion as an operation status, not a type

### OQ-83: SignifyAuth shared type location
- **Resolution:** Move SignifyAuth to a shared types location (kernel or shared protocol types package) to avoid circular cross-package imports.
- **Evidence:** DDD principle: break circular dependencies with shared types.
- **Category:** DESIGN
- **Spec change:**
  - Consider defining SignifyAuth in a shared authentication types module importable by both signify-client and cloud-agent-service

### OQ-84: "Latest-seen delegated rotation" in distributed systems
- **Resolution:** "Latest-seen" is validator-local, not globally consistent. Different validators may have different latest-seen events at the same sn. Convergence is eventual, not immediate. This is by design.
- **Evidence:** Spec HIGH -- explicitly acknowledges different copies of KEL may have different fn orderings.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/published_language.md` — document that "latest-seen" is validator-local; convergence is eventual; not a defect but a design property

### OQ-85: B1 tiebreaker using first-seen number at delegator
- **Resolution:** B1 compares sn (sequence number) of delegating events, NOT fn (first-seen number). Sequence numbers are protocol-determined and globally consistent, producing universal agreement.
- **Evidence:** Spec MEDIUM -- normative text says "the sn of the superseding event's delegation is higher than the sn of the superseded event's delegation."
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/published_language.md` — clarify B1 uses sn comparison, not fn; sn produces universal agreement because it is protocol-assigned

### OQ-86: Inception duplicity -- always irreconcilable?
- **Resolution:** Inception duplicity IS irreconcilable for non-delegated AIDs. For delegated AIDs, the delegator's cooperative approval provides an additional check, but a conflicting inception still indicates fundamental compromise.
- **Evidence:** Spec MEDIUM -- A1 prevents non-delegated rotations from superseding other rotations; inception at sn=0 follows same logic.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/published_language.md` — document that inception duplicity is irreconcilable for non-delegated AIDs; for delegated AIDs, the delegator provides an additional trust anchor

### OQ-87: CESR group codes for blinded state attachments
- **Resolution:** The blinding domain should reference blinded state group codes from cesr/composition (codes -a and -b are CESR-level definitions), not define them itself.
- **Evidence:** Spec HIGH -- these are genus-specific count codes in the CESR table.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/blinding/domain.yaml` — add outbound dependency on cesr/composition for blinded state group codes (-a, -b)

### OQ-88: Selective disclosure A/a field distinction without ACDC type at Layer 0
- **Resolution:** At Layer 0, the privacy domains accept field label (`A` or `a`) and corresponding section value as opaque inputs. No full ACDC type needed -- the field label determines which mechanism applies.
- **Evidence:** Spec HIGH -- distinction is field-label-level (A = aggregate/selective, a = attribute/partial).
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/aggregation/ports.yaml` — accept field label as input parameter; no ACDC type dependency
  - `rdod/spec/domains/privacy/disclosure/ports.yaml` — accept field label to determine disclosure mechanism

### OQ-89: Disclosure domain forward reference to Credential type
- **Resolution:** Replace the forward reference to `types://credential-lifecycle#Credential` with a generic `DisclosableBlock` interface that has `said()`, `has_uuid()`, and `section_label()` methods. This avoids the cross-layer dependency.
- **Evidence:** Spec MEDIUM -- disclosure mode determination only needs section SAIDs, u field presence, and field labels.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/privacy/disclosure/types.yaml` — replace Credential forward reference with `DisclosableBlock` interface: `said(): SAID`, `has_uuid(): boolean`, `section_label(): string`

### OQ-90: Encryption-related CESR codes -- scope for primitives domain
- **Resolution:** Include encryption-related CESR codes in the primitives domain's code table with Sizage entries. Defer Encrypter/Decrypter behavioral types to a future encryption subdomain. The code table should be complete.
- **Evidence:** Spec MEDIUM -- codes are in the CESR master table, behavioral logic can be deferred.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/cesr/primitives/types.yaml` — include encryption codes (C, O, P, 1AAH, sealed box codes) in the code table with Sizage entries; mark behavioral types (Encrypter/Decrypter) as deferred

### OQ-91: Delegation source seal -- attachment or event body?
- **Resolution:** The delegation source seal is a CESR ATTACHMENT (SealSourceCouples, code -S), NOT part of the event body. It consists of a (Seqner, Diger) couple. The event body has `di` (delegator prefix) but the source seal couple is external.
- **Evidence:** Keripy HIGH -- SealSourceCouples `-S` group code, received as separate parameters.
- **Category:** CONTRADICTION
- **Spec change:**
  - `rdod/spec/domains/delegation/authorization/types.yaml` — define SourceSeal as an attachment type (CESR couple), not an event body field
  - `rdod/spec/domains/delegation/authorization/published_language.md` — clarify: event body has `di` (delegator prefix); source seal is a CESR `-S` attachment

### OQ-92: Message Router OpenAPI spec endpoint (/spec.yaml on port 3902)
- **Resolution:** Deferred -- requires keria oracle. This is likely an operational concern outside the domain spec.
- **Category:** DEFERRED (see Deferred section)

### OQ-93: Custodial delegation -- protocol concept or deployment pattern?
- **Resolution:** Custodial delegation is a deployment pattern, not a separate protocol concept. The protocol does not distinguish custodial from non-custodial. Simplify CompromiseRequirement.key_type to not require the custodial distinction.
- **Evidence:** DDD principle: if the protocol doesn't distinguish it, the domain shouldn't either.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/delegation/recovery/types.yaml` — simplify CompromiseRequirement: remove custodial-specific variants; document custodial delegation as a deployment pattern in published_language.md

### OQ-94: Watcher concept mapping between detection domain and watcher-service
- **Resolution:** The detection domain's Watcher is a logical role/interface. The watcher-service domain is the concrete implementation. Detection defines the behavioral contract; watcher-service implements it.
- **Evidence:** DDD principle: domain defines role, service implements it.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/published_language.md` — clarify Watcher is a logical role/interface; the watcher-service provides the concrete implementation

### OQ-95: Juror-judge separation -- processes or logical roles?
- **Resolution:** Jurors and judges are logical roles with interface separation, not necessarily separate processes. The separation is enforced by the interface contract: jurors collect evidence (no trust decisions), judges make trust decisions (no evidence collection). They MAY run in the same process.
- **Evidence:** DDD principle: interface separation over process separation.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/published_language.md` — clarify juror/judge as logical roles with interface separation; may run in same process

### OQ-96: LDE escrow queue ownership
- **Resolution:** LDE escrow is owned by the integrity/detection domain. It needs a persistence port and a sweep/timeout mechanism (timeout = 3600s per keripy).
- **Evidence:** Keripy data -- `.ldes` managed by Kevery, timeout 3600s.
- **Category:** MISSING
- **Spec change:**
  - `rdod/spec/domains/integrity/detection/ports.yaml` — add LDE escrow persistence port with sweep/timeout mechanism (default 3600s)

### OQ-97: "Distinct operator" definition for MonitorHandle minimum sources
- **Resolution:** Deferred -- requires KSWG clarification. "Distinct operator" is not formally defined in the protocol spec.
- **Category:** DEFERRED (see Deferred section)

### OQ-98: Irreconcilable KEL -- truly terminal or recoverable?
- **Resolution:** Irreconcilable IS truly terminal for the identifier. There is no recovery path. The only recourse is key rotation by any remaining honest party (if pre-rotation keys are intact) or abandoning the AID.
- **Evidence:** DDD principle: terminal means terminal. Protocol provides no mechanism to un-irreconcile.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/published_language.md` — confirm Irreconcilable is terminal with no transitions out; document that the only recourse is via pre-rotation (if keys intact) or AID abandonment

### OQ-99: Recovery audit trail adopter use case
- **Resolution:** The audit trail serves compliance audit and dispute resolution. It should be part of the public query surface (not just internal).
- **Evidence:** DDD principle: if adopters need it, expose it.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/ports.yaml` — ensure disputed-branch query interface is part of the public port surface for compliance/audit use cases

### OQ-100: Reconciliation port idempotency
- **Resolution:** Reconciliation IS idempotent from a domain logic perspective (same inputs -> same trunk). The side effects (storing trunk designation) make it a command. Keep as command but document that the domain logic is deterministic.
- **Evidence:** DDD principle: deterministic commands are still commands if they have side effects.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/ports.yaml` — keep reconciliation as command; add note that the computation is deterministic (same inputs always produce same trunk)

### OQ-101: Two superseding rotations at the same recovery point
- **Resolution:** With the B3 correction (event-type comparison, not SAID tiebreaker), there CAN be cases where B1-B3 produce no winner (e.g., both delegating events are the same type at the same sn). In this case, Rule C applies (recurse up). If recursion reaches root without resolution, the superseding rotation is discarded (C1). SupersedingConflictError applies when two competing superseding rotations are both valid -- this genuinely requires judge adjudication.
- **Evidence:** Spec normative text on C1: "the superseding rotation is discarded" when no rule is satisfied.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/integrity/recovery/published_language.md` — document that SupersedingConflictError occurs when BOTH competing rotations satisfy superseding rules (each supersedes the other from different validators' perspectives); requires judge adjudication

### OQ-102: Integrity evidence domain at Layer 3 vs detection storage at Layer 0
- **Resolution:** Detection at Layer 0 should store evidence in its own DEL via the persistence port (OQ-55 resolution). The integrity/evidence domain at Layer 3 provides higher-level analysis. Detection emits events for the evidence domain to consume.
- **Evidence:** DDD principle: Layer 0 owns its own persistence; higher layers add analysis.
- **Category:** DESIGN
- **Spec change:**
  - Already addressed by OQ-55 resolution (DEL persistence port for detection domain)

### OQ-103: Witness-to-endpoint mapping ownership
- **Resolution:** The caller provides Endpoints to the dissemination domain. Witness AID -> Endpoint resolution is the caller's responsibility (via discovery/OOBI resolution). Dissemination stays simpler.
- **Evidence:** DDD principle: push complexity to callers when it reduces domain coupling.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/dissemination/ports.yaml` — ensure propagation port accepts resolved Endpoints, not witness AIDs

### OQ-104: Round-robin dissemination algorithm precision
- **Resolution:** Deferred -- requires deeper protocol spec analysis. The "2*N" bound suggests two passes (send event, collect receipts; then send accumulated receipts) but the exact interleaving is not normatively specified.
- **Category:** DEFERRED (see Deferred section)

### OQ-105: getWitnessSet -- reads from identity/state or maintains own registry?
- **Resolution:** Dissemination borrows witness configuration from identity/state. It should NOT maintain its own copy. The getWitnessSet operation should delegate to identity/state's key state query.
- **Evidence:** DDD principle: single source of truth for state.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/dissemination/ports.yaml` — getWitnessSet should delegate to an inbound dependency on identity/state, not maintain independent state

### OQ-106: DisseminationStrategy.Direct vs RoundRobin with 0 witnesses
- **Resolution:** Direct is auto-selected when the witness list is empty. The caller does not need to specify Direct explicitly. The enum variant exists for documentation/type safety but is inferred.
- **Evidence:** DDD principle: minimize caller decisions.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/dissemination/published_language.md` — document Direct is auto-selected when witnesses=empty; caller does not pass it explicitly

### OQ-107: Witness local-event-only rule enforcement -- dissemination or witness?
- **Resolution:** The witness enforces the local-event-only rule, not the dissemination domain. Dissemination propagates events; the witness validates the source upon receipt.
- **Evidence:** DDD principle: validation belongs at the receiving boundary.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/dissemination/published_language.md` — note that the local-only rule is enforced by the witness, not the dissemination domain

### OQ-108: First-seen-check port idempotency classification
- **Resolution:** Refine the port contract: same-SAID resubmissions are idempotent (signature accumulation, no state change to event status). Different-SAID at same sn is non-idempotent (may trigger duplicity detection).
- **Evidence:** DDD principle: precise idempotency specification.
- **Category:** DESIGN
- **Spec change:**
  - `rdod/spec/domains/accountability/consensus/ports.yaml` — refine first-seen-check: same-SAID = idempotent (accumulate signatures); different-SAID = non-idempotent (duplicity detection)

---

## Deferred Questions

### OQ-25: Boot endpoint authentication model
- **Reason:** Requires keria oracle investigation. No oracle findings available for this question.
- **Recommended action:** Investigate keria source code for boot endpoint authentication middleware (likely `keria/app/booting.py`). Determine if authentication is inception-event self-authentication or KRAM.

### OQ-26: Agent provisioning -- required components and adopter-centric names
- **Reason:** Requires keria oracle investigation for component inventory, initialization order, and failure handling.
- **Recommended action:** Investigate keria source code for agent initialization sequence (likely `keria/app/agenting.py`). Map keripy names (Habery, Reger, Verifier) to adopter-centric names.

### OQ-56: Agent destruction -- synchronous or asynchronous?
- **Reason:** Requires keria oracle investigation for destruction behavior.
- **Recommended action:** Investigate keria source code for agent deletion endpoint. Determine if destruction blocks until complete or returns immediately.

### OQ-57: In-flight operations during agent destruction
- **Reason:** Requires keria oracle investigation for pending operation handling during destruction.
- **Recommended action:** Investigate keria source code for whether pending long-running operations are cancelled or abandoned during agent destruction.

### OQ-58: Re-provisioning after destruction -- allowed?
- **Reason:** Requires keria oracle investigation for uniqueness constraint scope.
- **Recommended action:** Investigate keria source code for one-agent-per-controller invariant. Check if the constraint is "unique among active agents" or "unique for all time."

### OQ-59: Notification lifecycle -- expiry, queue depth, retention policy
- **Reason:** Requires keria oracle investigation for notification management.
- **Recommended action:** Investigate keria source code for notification storage and lifecycle. Check for expiry mechanisms, queue depth limits, and retention policies.

### OQ-60: Boot endpoint validation beyond event structure
- **Reason:** Requires keria oracle investigation for boot validation pipeline.
- **Recommended action:** Investigate keria source code for whether boot validates non-transferable AID constraint and single-sig requirement.

### OQ-92: Message Router OpenAPI spec endpoint
- **Reason:** Requires keria oracle investigation. Likely an operational concern outside the domain spec.
- **Recommended action:** Investigate keria source code for /spec.yaml endpoint on port 3902. If purely operational, exclude from domain spec.

### OQ-97: "Distinct operator" definition for MonitorHandle
- **Reason:** "Distinct operator" is not formally defined in the KERI protocol spec. Requires KSWG clarification.
- **Recommended action:** Raise with KSWG working group for formal definition of operator diversity requirements.

### OQ-104: Round-robin dissemination algorithm precision
- **Reason:** The exact algorithm (two-pass vs interleaved) is not normatively specified. The "2*N" bound provides the constraint but not the implementation.
- **Recommended action:** Investigate keripy witness dissemination code (`keri/app/directing.py` or similar) for the exact algorithm. Cross-reference with spec's "acknowledged exchange" definition.

### Remaining keria-targeted questions (OQ-25, OQ-26, OQ-56-60, OQ-92)
- **Reason:** All keria oracle questions are deferred because the keria oracle investigation was not included in this hardening pass. These questions target cloud-agent-service domains which are higher-layer concerns.
- **Recommended action:** Run a dedicated keria oracle pass targeting these 8 questions before hardening the cloud-agent-service domains.
