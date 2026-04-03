# Implementation Plan: Layer 0 -- Identity Cluster

## Domains

1. `identity/establishment` -- Event Validation Pipeline
2. `identity/state` -- Key Event Verifier and Key State
3. `identity/key-commitment` -- Pre-rotation and Key Configuration
4. `identity/anchoring` -- Interaction Events and Data Seals

All four belong to package `@kerizon/keri-core` (per packaging.yaml). Layer 0 means zero cross-domain dependencies within this layer; each domain depends only on externals (cryptographic-primitives, persistence).

---

## 1. identity/establishment

### A. Types and Data Structures

| Type | Kind | Notes |
|------|------|-------|
| `InceptionEvent` | Discriminated union (non-delegated `icp` / delegated `dip`) | 13 fields (icp) or 14 fields (dip, adds `di`). Builder required. |
| `RotationEvent` | Discriminated union (non-delegated `rot` / delegated `drt`) | 15 fields. Builder required. |
| `InteractionEvent` | Struct | 7 fields: v, t, d, i, s, p, a. Builder required (a field is variadic). |
| `KeyEvent` | Discriminated union by `t` field | `inception \| rotation \| interaction` |
| `WitnessAID` | Newtype over string | Non-transferable AID, B-prefix enforcement. |
| `ValidationPassed` | Struct | aid, sn, event_said, event_type. |
| `SignedEventMessage` | Struct | event + signatures (min 1) + witness_receipts. |
| `ValidationResult` | Discriminated union | `accepted \| escrowed \| rejected` |
| `EscrowDecision` | Discriminated union (7 variants) | OOE, PSE, PWE, PDE, LDE, MDE, MFE. Each variant has its own context fields. |

**Builders required:**
- `InceptionEventBuilder` -- enforces field ordering (v, t, d, i, s, kt, k, nt, n, bt, b, c, a), SAID computation, self-certifying `i = d` constraint.
- `RotationEventBuilder` -- enforces field ordering (v, t, d, i, s, p, kt, k, nt, n, bt, br, ba, c, a), prior SAID chaining.
- `InteractionEventBuilder` -- enforces field ordering (v, t, d, i, s, p, a), seal list construction.
- `DelegatedInceptionBuilder` -- extends InceptionEventBuilder with `di` field.
- `DelegatedRotationBuilder` -- extends RotationEventBuilder with `drt` ilk.

### B. Naming Conventions

| Spec Term | Implementation Name | Rationale |
|-----------|-------------------|-----------|
| Event Validation Pipeline | `EventValidationPipeline` | Adopter concept: "validate an incoming event" |
| Dual Threshold Verification | `DualThresholdVerifier` | Adopter concern: "does this event satisfy both thresholds?" |
| Signature Verification | `SignatureVerifier` | Adopter concern: "are these signatures valid?" |
| Pre-rotation Binding | `PreRotationBinder` | Adopter concern: "do the new keys match the commitments?" |
| Delegation Validation | `DelegationValidator` | Adopter concern: "has the delegator approved this?" |
| Local Source Protection | `LocalSourceGuard` | Adopter concern: "is this event from a trusted source?" |

### C. Port Interfaces

**Inbound:**

1. `port://identity/establishment/inbound/validate-event` (query, idempotent)
   - `validateEvent(msg: SignedEventMessage): ValidationResult`
   - Errors: OutOfOrderError, MissingSignatureError, MissingWitnessSignatureError, LikelyDuplicitousError, MisfitEventSourceError, ValidationError

2. `port://identity/establishment/inbound/validate-rotation` (query, idempotent)
   - `validateRotation(msg: SignedEventMessage): ValidationResult`
   - Errors: PreRotationBindingError (from key-commitment), InvalidThresholdError (from thresholds)

3. `port://identity/establishment/inbound/validate-delegation` (query, idempotent)
   - `validateDelegation(msg: SignedEventMessage): boolean`
   - Errors: MissingDelegationError, MissingDelegableApprovalError

**Outbound:**

4. `port://identity/establishment/outbound/state-lookup` (query, idempotent)
   - `getKeyState(aid: string): KeyState | null`
   - Repository interface for reading current key state and KEL.

### D. Error Handling

| Error | Severity | Recovery | Route |
|-------|----------|----------|-------|
| OutOfOrderError | transient | escrow | OOE |
| MissingSignatureError | transient | escrow | PSE |
| MissingWitnessSignatureError | transient | escrow | PWE |
| MissingDelegationError | transient | escrow | PDE |
| MissingDelegableApprovalError | transient | escrow | MDE |
| LikelyDuplicitousError | recoverable | escrow | LDE |
| MisfitEventSourceError | transient | escrow | MFE |
| ValidationError | fatal | abort | -- (drop event) |

Each error carries typed context: prefix, sn, said, and variant-specific fields (expected_sn, verified_indices, delegator AID, etc.).

### E. Verification and Invariants

**State Machine: Event Validation Pipeline**

17 states: received -> prefix_checked -> sn_checked -> local_source_checked -> sig_verified -> threshold_checked -> pre_rotation_checked -> witness_checked -> delegation_checked -> accepted, plus 7 terminal escrow/rejection states.

Key transitions:
- Unknown prefix + non-inception -> escrowed_ooe
- sn > expected -> escrowed_ooe
- sn < expected, different SAID -> escrowed_lde
- sn < expected, same SAID -> accepted (idempotent duplicate)
- Remote source, local AID -> escrowed_misfit
- Zero valid signatures -> rejected
- Signing threshold not met -> escrowed_pse
- Pre-rotation binding fails -> escrowed_pse
- Witness threshold not met -> escrowed_pwe
- Delegation seal not found -> escrowed_pde
- All checks pass -> accepted

**Validation Constraint DAG (C1-C9):**
```
C1_prefix_valid
  -> C2_sequence_valid -> C4_sigs_verified -> C5_signing_threshold_met
  -> C3_misfit_check   /                        -> C6_rotation_threshold_met \
                                                 -> C7_witness_threshold_met  -> C9_accept
                                                 -> C8_delegation_verified   /
```

C5->C6, C5->C7, C5->C8 can be evaluated in parallel (independent branches). C6 applies only to rot/drt, C7 to remote non-local, C8 to dip/drt.

**Property tests to plan:**
- Unknown prefix + non-inception = OOE
- Future sn = OOE
- Expected sn triggers full validation
- Escrow reprocessing is re-entrant (same pipeline)
- At least one valid signature required
- Invalid signatures silently dropped
- Signing threshold satisfaction is deterministic
- Rotation checks pre-rotation binding
- Each failure type routes to its specific escrow
- Field ordering is normative (reorder -> different SAID)

### F. Cross-domain Protocols

No protocols.yaml for this domain. Cross-domain orchestration is handled by the parent `identity` domain (Layer 5).

### G. Kernel Adoption

None declared. Uses `domain://externals/cryptographic-primitives` for Ed25519/ECDSA verification and Blake3-256 digests.

### H. Integration Scenario Assertions

From `integration-scenarios.yaml`:
1. **SingleSigInception_happy** -- "Inception event (icp) logged to KEL with first-seen ordinal assigned; SAID of event equals AID prefix (self-certifying)"
2. **KeyRotation_happy** -- "Rotation event (rot) logged to KEL; p field matches prior event's SAID"
3. **DelegatedInception_happy** -- "Delegated inception event (dip) logged with di field matching delegator"
4. **EscrowCascade_full_pipeline** -- Escrow routing: OOE -> PSE -> PWE -> PDE -> accepted

### I. v2 TEL model

Not applicable (identity domain, not credential).

### J. Packaging Boundaries

Package: `@kerizon/keri-core`. Module path: `identity/establishment`. Exports: all types, error types, port interfaces. Builder types are public API.

### Module Structure

```
identity/establishment/
  mod.ts (or __init__.py)        -- re-exports
  types.ts                       -- InceptionEvent, RotationEvent, InteractionEvent, KeyEvent, etc.
  builders/
    inception-builder.ts         -- InceptionEventBuilder, DelegatedInceptionBuilder
    rotation-builder.ts          -- RotationEventBuilder, DelegatedRotationBuilder
    interaction-builder.ts       -- InteractionEventBuilder
  pipeline.ts                    -- EventValidationPipeline FSM
  verifiers/
    signature-verifier.ts        -- SignatureVerifier
    dual-threshold-verifier.ts   -- DualThresholdVerifier
    delegation-validator.ts      -- DelegationValidator
    local-source-guard.ts        -- LocalSourceGuard
  errors.ts                      -- all error types
  ports.ts                       -- port interface definitions
```

### Dependencies

- `domain://externals/cryptographic-primitives` -- Ed25519/ECDSA verify, Blake3-256 digest
- `types://identity/state#KeyState` -- outbound state-lookup returns KeyState
- `errors://identity/key-commitment#PreRotationBindingError` -- validate-rotation can produce this
- `domain://identity/thresholds` (Layer 1) -- imported for threshold satisfaction; NOT a build-time dependency at Layer 0, but the pipeline delegates threshold checks to it. At Layer 0, threshold checking is an abstract interface.

### Open Questions

**Q-EST-1**: The validation pipeline state machine has 17 states, but the FSM shows `sn < expected, same SAID` transitions to `accepted` (idempotent duplicate). Does idempotent duplicate handling merge new signatures into the existing accepted event (accumulating signatures from different sources), or is the duplicate silently dropped? This matters for the difference between "first-seen" acceptance and "accumulating additional signatures on an already-accepted event."
- **Domain rule**: When an already-accepted event arrives again with the same SAID but potentially different/additional signatures, are those new signatures accumulated (useful for multi-source receipt collection) or discarded?

**Q-EST-2**: The `MisfitEventSourceError` routes to MFE escrow, but the spec says "must be re-submitted through the local protected channel." What defines a "local protected channel" versus a "remote source"? Is this a per-event metadata flag, a transport-level marker, or determined by configuration? The domain boundary depends on this.
- **Domain rule**: How does the validation pipeline distinguish local vs. remote event sources? Is this a transport concern (out of domain) or a domain-level concept?

**Q-EST-3**: The `MissingDelegableApprovalError` routes to MDE (distinct from PDE for `MissingDelegationError`). What is the difference between MDE and PDE? The errors.yaml says PDE = "no matching seal found" and MDE = "source seal attachment present but cannot be matched." When exactly does an event go to MDE vs PDE?
- **Domain rule**: What distinguishes a "missing delegation seal" (PDE) from a "present but unverifiable delegation source seal" (MDE)?

**Q-EST-4**: For the constraint DAG, C5->C6, C5->C7, C5->C8 are shown as independent branches that can be evaluated in parallel. But the UL's Dual Threshold Verification term describes them as sequential steps (3, 4, 5, 6). In practice, can witness threshold checking (C7) and delegation checking (C8) truly run in parallel after signing threshold is met? Or does the protocol require sequential evaluation because failure at one step should prevent checking subsequent steps?
- **Domain rule**: Is the validation pipeline strictly sequential, or can signing-threshold, witness-threshold, and delegation checks run in parallel once signature verification passes?

**Q-EST-5**: The `EscrowDecision` type has 7 variants including MDE (Missing Delegable Approval Escrow), but the `ValidationResult.escrowed` variant lists only 6 queues: "OOE, PSE, PWE, PDE, LDE, Misfit." MDE is missing from the `ValidationResult` but present in `EscrowDecision`. Is MDE a valid escrow outcome from the validation pipeline, or is it only reachable through a different code path?
- **Domain rule**: Reconcile the escrow queue enumeration between ValidationResult and EscrowDecision types.

---

## 2. identity/state

### A. Types and Data Structures

| Type | Kind | Notes |
|------|------|-------|
| `KeyState` | Struct | 14 fields. The authoritative key state snapshot. |
| `TraitCode` | Enum | EstOnly, DoNotDelegate, DID, RegistrarBackers, NoRegistrarBackers |
| `LastEstablishmentData` | Struct | 8 fields. Snapshot of most recent establishment event. |
| `KeyStateNotice` | Struct | key_state + reply_datetime + route. Subject to BADA acceptance. |
| `QueryResult` | Discriminated union | `found \| not_found` |
| `WriteOutcome` | Discriminated union | `accepted \| escrowed \| rejected` |
| `EscrowReprocessResult` | Struct | promoted, remaining, expired counts. Invariant: promoted + remaining + expired = total. |

**Builders required:**
- `KeyStateBuilder` -- 14 fields with optionals (delegator, config_traits). Enforces invariants like "empty next_key_digests + sn=0 = non-transferable."

### B. Naming Conventions

| Spec Term | Implementation Name | Rationale |
|-----------|-------------------|-----------|
| Key Event Verifier | `KeyEventVerifier` | Adopter concept: "verify events for this AID" |
| Key State | `KeyState` | Adopter concept: "current key configuration" |
| Last Establishment Data | `LastEstablishmentData` | Adopter concept: "most recent key change" |
| State Reconstruction | `StateReconstructor` | Adopter concept: "rebuild state from event log" |
| Configuration Traits | `ConfigTraits` (module) / `TraitCode` (enum) | Adopter concept: "operational constraints" |
| Stale Event | `StaleEventDetector` | Adopter concept: "is this event too old?" |

### C. Port Interfaces

**Inbound:**

1. `port://identity/state/inbound/commit` (command, NOT idempotent)
   - `commitEvent(event: KeyEvent): WriteOutcome`
   - The primary IdentityService operation. Validates and commits.
   - Errors: OutOfOrderKeyStateError, UnverifiedReplyError, ValidationError

2. `port://identity/state/inbound/state-reconstruction` (query, idempotent)
   - `reconstructState(aid: string, targetSn?: number): KeyState`
   - Errors: ReconstructionError, StaleKeyStateError

3. `port://identity/state/inbound/state-query` (query, idempotent)
   - `getLastEstablishment(aid: string): LastEstablishmentData`
   - Errors: QueryNotFoundError

**Outbound:**

4. `port://identity/state/outbound/state-read-model` (query, idempotent)
   - `getKeyState(aid: AID): KeyState | null`
   - CQRS read model -- query-only, never written to directly.
   - Invariants: always reconstructable from KEL, immediately consistent.

5. `port://identity/state/outbound/kel-repository` (command, NOT idempotent)
   - Append-only KEL + escrow queues. All writes go through IdentityService.
   - `appendEvent(msg: SignedEventMessage): WriteOutcome`
   - `getEvent(aid: string, sn: number): KeyEvent | null`
   - Escrow queues are part of this repository.

6. `port://identity/state/outbound/escrow-drain` (command, idempotent)
   - `drainEscrow(queueType: string): EscrowReprocessResult`
   - Periodically re-submits escrowed events through validation.

### D. Error Handling

| Error | Severity | Recovery | Route |
|-------|----------|----------|-------|
| QueryNotFoundError | transient | retry | -- |
| OutOfOrderKeyStateError | transient | escrow | OOE |
| StaleKeyStateError | transient | retry | -- |
| ReconstructionError | recoverable | retry | -- |
| MissingEntryError | recoverable | abort | -- |
| UnverifiedReplyError | transient | escrow | RPE |

### E. Verification and Invariants

**State Machine 1: KeverLifecycle**

4 states: uninitialized -> active / est_only / non_transferable.

Transitions:
- uninitialized -> active: icp with n non-empty, no EO
- uninitialized -> est_only: icp with n non-empty, EO present
- uninitialized -> non_transferable: icp with n=[]
- active -> active: rot/drt (valid) or ixn
- active -> est_only: rot/drt with EO trait
- active -> non_transferable: rot/drt with n=[]
- est_only -> est_only: rot/drt (ixn rejected)
- est_only -> non_transferable: rot/drt with n=[]

Terminal: non_transferable (no further rotations).

Invariants:
- In `active`: all state fields set and non-None
- In `non_transferable`: any rot/drt rejected
- In `est_only`: ixn rejected with typed error
- sn monotonically increasing
- lastEst updated only on establishment transitions
- Traits only accumulate

**State Machine 2: IdentifierLifecycle**

4 states: Nonexistent -> Inception -> Active -> Abandoned.

- Active -> Abandoned: rotation with n=[], nt='0' (terminal)
- Non-transferable: Inception -> Active directly, no rotation or abandonment possible

**Property tests to plan:**
- One Kever per AID prefix
- Key state is a pure function of KEL (deterministic)
- ixn does not modify key state fields
- ixn advances sn by exactly 1
- sn monotonicity (no gaps, no duplicates)
- First-seen ordering (fn) is monotonic, gap-free, unique
- Two init paths (replay vs cache reload) produce identical state
- lastEst updated only at establishment events
- Inception must be sn=0
- Hash chain continuity (event.p == prior.said)
- Traits are cumulative and irreversible
- Atomic update: failed rotation leaves all state unchanged
- Successful rotation updates all fields atomically
- Stale rot (sn <= lastEst.s) rejected
- Stale drt (sn < lastEst.s) rejected, sn == lastEst.s accepted (recovery)
- Recovery rotation can only supersede ixn, not establishment events
- Non-transferable identifier rejects rotation
- State reconstruction deterministic

### F. Cross-domain Protocols

No protocols.yaml. State is consumed by the parent `identity` domain.

### G. Kernel Adoption

None declared. Uses externals for Ed25519 keys (Verfer), Blake3-256 digests (Diger), SAID computation.

### H. Integration Scenario Assertions

1. **SingleSigInception_happy** -- "KeyState exists with sn=0, transferable=true, 1 signing key, 1 next digest, 3 witnesses, toad=2"
2. **KeyRotation_happy** -- "KeyState updated: sn=1, new signing keys active, new next digests committed"
3. **DelegatedInception_happy** -- "Delegated AID exists with sn=0, delegator field set"
4. **MultisigInception_happy** -- "Group AID exists with sn=0, 3 signing keys, threshold='2'"
5. **OOBIResolution_happy** -- "Remote AID's KeyState now available locally"
6. **SupersedingRecovery_happy** -- "KeyState updated with recovery rotation"

### I. v2 TEL model

Not applicable.

### J. Packaging Boundaries

Package: `@kerizon/keri-core`. Module path: `identity/state`. Exports: KeyState, KeyEventVerifier, TraitCode, LastEstablishmentData, WriteOutcome, port interfaces.

### Module Structure

```
identity/state/
  mod.ts                         -- re-exports
  types.ts                       -- KeyState, TraitCode, LastEstablishmentData, KeyStateNotice, etc.
  key-event-verifier.ts          -- KeyEventVerifier state machine
  state-reconstructor.ts         -- StateReconstructor (KEL replay)
  stale-event-detector.ts        -- StaleEventDetector
  config-traits.ts               -- TraitCode enum, cumulative trait enforcement
  errors.ts                      -- all error types
  ports.ts                       -- port interface definitions (KelRepository, StateReadModel)
  builders/
    key-state-builder.ts         -- KeyStateBuilder
```

### Dependencies

- `domain://externals/cryptographic-primitives` -- Ed25519/ECDSA public keys, digests, SAID
- `domain://externals/persistence` -- KEL storage, state cache
- `types://identity/establishment#KeyEvent` -- commits events to the KEL
- `types://identity/establishment#SignedEventMessage` -- KelRepository stores signed messages
- `errors://identity/establishment#ValidationError` -- commit can produce validation errors

### Open Questions

**Q-STATE-1**: The `KeyState` type has a `first_seen_sn` field (integer), but the verification properties call it `fn` (first-seen number). Is `first_seen_sn` the same as `fn`? The first-seen number is a global counter across ALL prefixes, while `sn` is per-prefix. The naming `first_seen_sn` implies per-prefix. Clarify: is this field the global first-seen ordinal (fn) or a per-prefix first-seen sequence number?
- **Domain rule**: Is the first-seen ordinal a global monotonic counter across all AIDs, or per-AID?

**Q-STATE-2**: The `WriteOutcome.accepted` variant has a `first_seen: boolean` field, but the `ValidationResult.accepted` variant (in identity/establishment types.yaml) has a `first_seen_number: integer` field. Are these different concepts? One is "is this the first time we've seen this event?" (boolean), and the other is "what ordinal was assigned?" (integer). Should `WriteOutcome.accepted` also carry the first-seen ordinal?
- **Domain rule**: Does the commit result expose the assigned first-seen ordinal, or only a boolean indicating first-seen status?

**Q-STATE-3**: BADA (Best Available Data Algorithm) staleness for key state notices uses "sn + datetime" comparison. The rule says "higher sn wins; equal sn -> later datetime wins." But the identity/state domain doesn't mention BADA anywhere in its ports or types -- it's only in the rules section. Should BADA be an explicit port operation (e.g., `checkBadaStaleness(notice: KeyStateNotice): boolean`), or is it an internal implementation detail of the commit pipeline?
- **Domain rule**: Is BADA acceptance logic part of the state domain's public interface, or an internal mechanism?

**Q-STATE-4**: The `state-read-model` outbound port says it "returns the state as of the latest committed event (not eventual -- immediately consistent)." But the `escrow-drain` port reprocesses events asynchronously. If an escrow drain promotes an event, does the state-read-model immediately reflect the new state? Or is there a window where the read model is stale relative to escrow promotions?
- **Domain rule**: Is the state-read-model guaranteed to be immediately consistent with escrow promotions, or only with direct commits?

**Q-STATE-5**: The `kel-repository` outbound port is described as append-only, but the `escrow-drain` port can "prune timed-out events." Pruning from escrow queues is technically a delete operation. Is the append-only invariant limited to the KEL proper (accepted events), with escrow queues being mutable? If so, this should be made explicit.
- **Domain rule**: Clarify: "append-only" applies to the accepted KEL only; escrow queues support add, reprocess, and prune operations. Is this correct?

---

## 3. identity/key-commitment

### A. Types and Data Structures

| Type | Kind | Notes |
|------|------|-------|
| `PublicKey` | Struct | qb64 + algorithm. First characters determine algorithm. |
| `PreRotationCommitment` | Discriminated union | `transferable \| non-transferable \| abandonment` |
| `KeyConfiguration` | Struct | keys, threshold, next_keys, next_threshold. Builder required. |
| `MatchedIndex` | Struct | key_index, digest_index, verified. |
| `DigestAlgorithm` | Enum | Blake3_256, Blake2b_256, Blake2s_256, SHA3_256, SHA2_256 |
| `PrefixCode` | Enum | Ed25519, Ed25519N, ECDSA_256k1, ECDSA_256k1N, Blake3_256 |
| `TransferabilityKind` | Enum | Transferable, NonTransferable |
| `BindingVerification` | Struct | bound: boolean, mismatches: array. |

**Builders required:**
- `KeyConfigurationBuilder` -- enforces invariants: len(keys) >= threshold, atomic k+n pairing, non-empty next_keys for transferable.
- `PreRotationCommitmentBuilder` -- enforces: non-empty digests for transferable, nt='0'+n=[] for non-transferable/abandonment.

### B. Naming Conventions

| Spec Term | Implementation Name | Rationale |
|-----------|-------------------|-----------|
| Pre-rotation Commitment | `PreRotationCommitment` | Adopter concept: "commit to future keys" |
| Key Configuration | `KeyConfiguration` | Adopter concept: "current + next key pairing" |
| Partial Rotation | `PartialRotation` | Adopter concept: "promote only some pre-committed keys" |
| Signing Keys | `signingKeys` (field name) | Adopter concept: "keys that sign now" |
| Next Key Digests | `nextKeyDigests` (field name) | Adopter concept: "commitments to future keys" |

### C. Port Interfaces

**Inbound:**

1. `port://identity/key-commitment/inbound/key-commitment` (query, idempotent)
   - `buildKeyConfig(signingKeys: PublicKey[], nextDigests: Digest[]): KeyConfiguration`
   - `verifyPreRotation(newKeys: PublicKey[], priorNextDigests: Digest[]): BindingVerification`
   - Errors: PreRotationBindingError, EmptyNextKeysError, NextThresholdMismatchError, PreRotatedKeyReuseError, KeyExposureError

2. `port://identity/key-commitment/inbound/transferability` (query, idempotent)
   - `classifyTransferability(prefixCode: PrefixCode): TransferabilityKind`
   - `validateTransferability(nextDigests: Digest[], prefixCode: PrefixCode): void`
   - Errors: NonTransferableRotationError, TransferableMissingNextError

3. `port://identity/key-commitment/inbound/partial-rotation` (query, idempotent)
   - `verifyPartialRotation(newKeys: PublicKey[], priorDigests: Digest[], priorThreshold: string): MatchedIndex[]`
   - Errors: PartialRotationThresholdError

### D. Error Handling

| Error | Severity | Recovery | Notes |
|-------|----------|----------|-------|
| PreRotationBindingError | fatal | abort | Key digest mismatch -- rotation rejected permanently |
| EmptyNextKeysError | recoverable | abort | Abandonment signal -- may be intentional |
| NextThresholdMismatchError | fatal | abort | Unsatisfiable threshold |
| PreRotatedKeyReuseError | fatal | abort | One-time-use violation |
| PartialRotationThresholdError | fatal | abort | Insufficient promoted keys |
| NonTransferableRotationError | fatal | abort | Rotation on non-transferable AID |
| TransferableMissingNextError | fatal | abort | Transferable AID missing next commitments |
| KeyExposureError | fatal | abort | Pre-committed key used before activation |

All errors are fatal/abort in this domain -- pre-rotation binding failures are permanent rejections, not escrowable. This is correct: if the keys don't match the commitments, no amount of waiting will fix it.

### E. Verification and Invariants

No state machines defined (stateless verification domain).

**Property tests to plan:**
- Digest of each next key appears in prior n field
- Pre-committed keys never exposed before activation rotation
- Dual compromise required (current + next key sets disjoint)
- Pre-rotated keys used once only
- Random keys fail pre-rotation binding
- Digest algorithm encoded in CESR prefix
- Inception keys freely chosen (no prior binding)
- Rotation keys must include threshold-satisficing subset of pre-committed
- Key order matters for indexed signatures
- Each next digest is qualified (CESR code prefix)
- Empty n = non-transferable
- Key configuration atomic update (k and n together)
- Partial rotation: fewer signing keys than prior next keys allowed
- Partial rotation: promoted >= threshold
- Discarded keys consumed permanently
- Transferable AIDs require non-empty n in every establishment event
- Non-transferable AIDs have n=[] and reject rotation

### F. Cross-domain Protocols

None. Pre-rotation verification is invoked by identity/establishment during the validation pipeline.

### G. Kernel Adoption

None declared. Uses externals for Ed25519/ECDSA key types and Blake3-256/SHA-256 digest computation.

### H. Integration Scenario Assertions

1. **KeyRotation_happy** -- "New signing keys produce digests matching prior next commitments" (precondition)
2. **SupersedingRecovery_happy** -- "Pre-rotation commitments from last establishment event before fork are available" (precondition)
3. **EscrowCascade_full_pipeline** -- Pre-rotation binding is step 2 of the validation cascade

### I. v2 TEL model

Not applicable.

### J. Packaging Boundaries

Package: `@kerizon/keri-core`. Module path: `identity/key-commitment`. Exports: all types, error types, port interfaces.

### Module Structure

```
identity/key-commitment/
  mod.ts                         -- re-exports
  types.ts                       -- PublicKey, PreRotationCommitment, KeyConfiguration, etc.
  pre-rotation-verifier.ts       -- verifyPreRotation(), verifyPartialRotation()
  transferability.ts             -- classifyTransferability(), validateTransferability()
  key-config-builder.ts          -- KeyConfigurationBuilder
  errors.ts                      -- all error types
  ports.ts                       -- port interface definitions
```

### Dependencies

- `domain://externals/cryptographic-primitives` -- Ed25519/ECDSA key types, Blake3-256 digests, CESR prefix code classification

### Open Questions

**Q-KC-1**: The `KeyExposureError` says "pre-committed key appears in the signing key list before its activation rotation." But who checks this? The identity/establishment validation pipeline doesn't list KeyExposureError as a possible error. Is this checked during event construction (by the builder), during validation (by the pipeline), or somewhere else?
- **Domain rule**: At which point in the event lifecycle is key exposure (pre-committed key used before activation) detected and rejected?

**Q-KC-2**: The `PreRotatedKeyReuseError` prevents a consumed digest from being reused. But the spec says "first-time, one-time, only-time use." How is the "consumed set" tracked across rotations? Is there a persistent set of consumed digests per AID, or is consumption inferred from the KEL (each rotation's n field is consumed once the next rotation appears)?
- **Domain rule**: Is consumed-digest tracking explicit (persistent set) or implicit (derived from KEL traversal)?

**Q-KC-3**: The `PrefixCode` enum lists `Ed25519, Ed25519N, ECDSA_256k1, ECDSA_256k1N, Blake3_256` but the UL's `TransferableIdentifier` term mentions four transferable codes: D (Ed25519), 1AAB (ECDSA secp256k1), 1AAJ (ECDSA secp256r1), 1AAD (Ed448). The PrefixCode enum is missing secp256r1, secp256r1N, Ed448, and Ed448N. Is the enum incomplete, or are these intentionally excluded?
- **Domain rule**: What is the complete set of CESR prefix codes for transferable and non-transferable identifiers?

**Q-KC-4**: For partial rotation, the spec says "the newly current key list need only include a threshold-satisficing subset of the prior next keys." But can the new signing key list also include entirely new keys that are NOT from the prior next key set? Or must every new signing key have a matching prior next digest?
- **Domain rule**: In a partial rotation, can the new signing key list include keys that have no corresponding prior next-key digest, or must every new signing key be from the pre-committed set?

**Q-KC-5**: The `BindingVerification` type has a `mismatches` field that is an "array[map]" with "index, expected_digest, computed_digest" entries. But what about keys that match but at different positions (key_index != digest_index via ondex mapping)? Is a position mismatch an error, or is cross-position matching valid (key at index 2 matching digest at ondex 0)?
- **Domain rule**: Does pre-rotation binding require positional matching (key[i] matches digest[i]), or is cross-position matching via ondex valid?

---

## 4. identity/anchoring

### A. Types and Data Structures

| Type | Kind | Notes |
|------|------|-------|
| `DigestSeal` | Struct | Single `d` field. Simplest seal type. |
| `LastEstSeal` | Struct | Single `i` field. Resolved at verification time. |
| `DigestAlgorithm` | Enum | Blake3_256, Blake2b_256, Blake2s_256, SHA3_256, SHA2_256 |

Note: `EventSeal` ({i, s, d}) and `EventLocationSeal` ({i, s, t, p}) are mentioned in the UL and verification.yaml but NOT defined in types.yaml. See Q-ANC-1.

**Builders required:**
- `InteractionEventBuilder` (shared with identity/establishment) -- builder for ixn events with seal list construction. Provides typed seal constructors: `.digestSeal(said)`, `.eventSeal(prefix, sn, said)`, `.lastEstSeal(prefix)`.

### B. Naming Conventions

| Spec Term | Implementation Name | Rationale |
|-----------|-------------------|-----------|
| Interaction Event | `InteractionEvent` (type, shared with establishment) | Adopter concept: "commit data to my identity" |
| Seal | `Seal` (union type) | Adopter concept: "bind external data" |
| Digest Seal | `DigestSeal` | Adopter concept: "commit by hash" |
| Event Seal | `EventSeal` | Adopter concept: "reference a specific event" |
| Data Anchoring | `DataAnchoringService` | Adopter concept: "anchor data to my identity" |

### C. Port Interfaces

**Inbound:**

1. `port://identity/anchoring/inbound/data-anchoring` (command, NOT idempotent)
   - `createInteraction(aid: string, seals: Seal[]): InteractionEvent`
   - Preconditions: AID not EO, AID is transferable, seals is valid list
   - Postconditions: returns ixn with correct field order (v, t, d, i, s, p, a), anchor list matches seals
   - Errors: AnchoringNotPermittedError, NonTransferableAnchoringError, InvalidSealError

2. `port://identity/anchoring/inbound/seal-query` (query, idempotent)
   - `getSeals(aid: string, sn: number): Seal[]`
   - Returns seals from a specific event in the KEL.

### D. Error Handling

| Error | Severity | Recovery | Notes |
|-------|----------|----------|-------|
| AnchoringNotPermittedError | fatal | abort | EO trait active -- ixn permanently rejected |
| NonTransferableAnchoringError | fatal | abort | Non-transferable AID -- ixn structurally impossible |
| InvalidSealError | fatal | abort | Malformed seal object |

All errors are fatal/abort. EO enforcement is checked before signature verification (early rejection).

### E. Verification and Invariants

No state machines (stateless event construction domain).

**Property tests to plan:**
- Seal binding: digest in KEL, data external
- Seal verification: compute digest, compare to seal.d (exact byte equality)
- ixn must NOT contain establishment fields (kt, k, nt, n, bt, b, br, ba)
- ixn has exactly fields v, t, d, i, s, p, a in that order
- ixn does not modify key state
- Anchor list: ordered, may be empty, order affects SAID
- EO enforcement: immediate rejection (not escrowed), before sig verification
- Seal type parity: same seal types in ixn and establishment events
- ixn supersedable by recovery rotation at same sn
- Hash chain: ixn.p == prior_event.said
- Digest seal: exactly {d}
- Event seal: exactly {i, s, d}

### F. Cross-domain Protocols

None. Anchoring is consumed by many domains:
- `credential-lifecycle/status` -- TEL authorization via ixn seal
- `delegation/authorization` -- delegator approval via ixn seal
- `discovery` -- endpoint authorization via ixn seal

### G. Kernel Adoption

None declared. Uses externals for Blake3-256/SHA-256 digest computation.

### H. Integration Scenario Assertions

1. **CredentialIssuance_happy** -- "Issuer's KEL contains an ixn with seal authorizing the TEL event SAID"
2. **CredentialRevocation_happy** -- "Issuer's KEL contains ixn authorizing the revocation TEL event"
3. **EndpointDiscoveryRegistration_happy** -- "Controller's KEL contains endpoint authorization seal"

### I. v2 TEL model

Not applicable (seal structure is generic, not TEL-specific).

### J. Packaging Boundaries

Package: `@kerizon/keri-core`. Module path: `identity/anchoring`. Exports: DigestSeal, LastEstSeal, EventSeal (once defined), port interfaces.

### Module Structure

```
identity/anchoring/
  mod.ts                         -- re-exports
  types.ts                       -- DigestSeal, LastEstSeal, EventSeal, EventLocationSeal, DigestAlgorithm
  data-anchoring-service.ts      -- DataAnchoringService (createInteraction, getSeals)
  seal-builders.ts               -- typed seal constructors
  errors.ts                      -- AnchoringNotPermittedError, NonTransferableAnchoringError, InvalidSealError
  ports.ts                       -- port interface definitions
```

### Dependencies

- `domain://externals/cryptographic-primitives` -- Blake3-256 digest computation
- `types://identity/establishment#InteractionEvent` -- shared type definition
- `types://identity/state#KeyState` -- needed to check EO trait and transferability

### Open Questions

**Q-ANC-1**: The types.yaml defines `DigestSeal` and `LastEstSeal`, but NOT `EventSeal` ({i, s, d}) or `EventLocationSeal` ({i, s, t, p}). Both are mentioned extensively in the UL (ubiquitous-language.yaml) and in verification.yaml. Also, the identity/establishment types.yaml defines seal types in the UL (`SealDigest`, `SealEvent`, `SealLast`, `SealRoot`) but not as formal types. Where should EventSeal and EventLocationSeal be formally defined?
- **Domain rule**: Should EventSeal and EventLocationSeal be formal types in identity/anchoring/types.yaml, in identity/establishment/types.yaml, or in a shared location?

**Q-ANC-2**: The `InteractionEvent` type is defined in identity/establishment/types.yaml (as part of the KeyEvent union). But identity/anchoring is the domain that owns interaction event construction and seal management. Should InteractionEvent be moved to identity/anchoring/types.yaml, or should it remain in establishment with anchoring importing it?
- **Domain rule**: Which domain owns the InteractionEvent type definition -- identity/establishment (where it's part of the KeyEvent union) or identity/anchoring (where it's the primary concern)?

**Q-ANC-3**: The verification.yaml mentions `EventLocationSeal` with fields {i, s, t, p}, but this seal type does not appear in any types.yaml or UL definition. Is EventLocationSeal a recognized seal type in the KERI spec? If so, what distinguishes it from EventSeal (which has {i, s, d})? The `t` (type) and `p` (prior) fields suggest it locates an event by position rather than by content hash.
- **Domain rule**: Is EventLocationSeal (i, s, t, p) a normative KERI seal type? If so, what is its semantics and when is it used instead of EventSeal (i, s, d)?

**Q-ANC-4**: The UL says "seals in interaction events are the primary mechanism for committing external data." But establishment events also have an `a` field with seals. What is the semantic difference between a seal in an ixn vs a seal in a rot event? Is a rot seal "more authoritative" because it's backed by a key change? Or are they identical from a verification perspective?
- **Domain rule**: Is there any semantic difference between a seal anchored in an interaction event vs a seal anchored in an establishment event?

**Q-ANC-5**: The `NonTransferableAnchoringError` says "interaction events require a transferable identifier." But the KERI spec allows non-transferable identifiers to have interaction events for some use cases (e.g., witness AIDs producing receipts). Is the non-transferable restriction absolute, or does it depend on the identifier's role?
- **Domain rule**: Can non-transferable identifiers ever produce interaction events, or is this universally prohibited?

---

## Cross-Cutting Open Questions

**Q-CROSS-1**: The four identity subdomains (establishment, state, key-commitment, anchoring) all reference `domain://externals/cryptographic-primitives` but none declare a kernel dependency on `kernel://cesr`. The CESR-qualified types (qb64, SAID, Verfer, Diger, Siger) appear everywhere. Should these domains declare `kernel://cesr` as a kernel so that CESR primitives are first-class types rather than opaque strings?
- **Domain rule**: Should identity subdomains adopt kernel://cesr to get typed CESR primitives, or continue treating them as string-typed externals?

**Q-CROSS-2**: The `DigestAlgorithm` enum is defined in BOTH identity/key-commitment/types.yaml AND identity/anchoring/types.yaml with identical values. This is a duplication. Should it be defined once in a shared location (e.g., cesr/primitives) and imported by both?
- **Domain rule**: Where should DigestAlgorithm be canonically defined to avoid duplication?

**Q-CROSS-3**: The identity/establishment UL imports "Threshold Satisfaction" from `domain://identity/thresholds` and "Witness Threshold Check" from `domain://accountability`. But identity/thresholds is Layer 1 and accountability is Layer 4+. The build-order.txt shows identity/establishment at Layer 0. How can Layer 0 import from Layer 1+? Is this a deferred dependency (interface only at Layer 0, implementation at Layer 1+)?
- **Domain rule**: How are cross-layer imports handled? Does Layer 0 define abstract interfaces that Layer 1+ implements, or are these runtime dependencies that don't affect build order?

**Q-CROSS-4**: The `SealTypes` UL term in identity/establishment defines four seal types (Digest, Event, Last, Root). The identity/anchoring domain adds `EventLocationSeal`. Meanwhile, the identity/establishment types.yaml defines NO formal seal types -- they appear only in UL terms and in identity/anchoring/types.yaml (only Digest and LastEst). There is no single source of truth for the complete seal type inventory. Where should all seal types be formally defined?
- **Domain rule**: Establish a canonical location for formal seal type definitions that all domains can import.
