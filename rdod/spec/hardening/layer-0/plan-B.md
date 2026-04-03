# Implementation Plan: Layer 0 — Group B (Credential/Privacy)

## Domains

1. `credential-lifecycle/status`
2. `privacy/aggregation`
3. `privacy/blinding`
4. `privacy/disclosure`

All are Layer 0 foundations with no prior-layer dependencies. All belong to the `@kerizon/keri-core` package per `packaging.yaml`.

---

## Domain 1: credential-lifecycle/status

### 1. Module Structure

```
credential-lifecycle/status/
  mod.ts (or index.ts)         -- re-exports public surface
  types.ts                     -- LifecycleStateSnapshot, TELEvent, StatusWriteOutcome, etc.
  errors.ts                    -- InvalidCredentialStateError, MissingRegistryError, etc.
  status-service.ts            -- Inbound port: Authorize State Change, State Reconstruction
  tel-repository.ts            -- Outbound port interface: TelRepository
  status-read-model.ts         -- Outbound port interface: query-only CQRS projection
  credential-lifecycle-fsm.ts  -- CredentialLifecycle + RegistryLifecycle state machines
  validation-pipeline.ts       -- C1-C5 constraint DAG execution
```

### 2. Type Definitions

**TELEvent** (discriminated union by `t` field):
- `registry_inception` variant: wraps `RegistryInceptionEvent` (from `credential-lifecycle/registry` -- cross-domain type ref, not yet implemented at Layer 0)
- `blindable_update` variant: wraps `BlindableUpdateEvent`
- `non_blindable_update` variant: wraps `NonBlindableUpdateEvent`

**TelEvent** (core identifying fields for state computation):
- `ilk`: enum `"rip" | "upd" | "bup"`
- `said`: string (SAID of this TEL event)
- `registry_said`: string (REGID)
- `sn`: integer (sequence number)

**LifecycleStateSnapshot** (materialized view):
- `registry_said`: string
- `credential_said`: string
- `state`: enum `"NotIssued" | "Issued" | "Revoked"`
- `last_sn`: integer
- Invariants: deterministic, reconstructable, cache-miss-safe

**StateQueryInput**: `{ registry_said, credential_snapshot: LifecycleStateSnapshot }`

**StateReconstructionInput**: `{ registry_said, events: TelEvent[] }`

**TelEventVerifier**: `{ registry_said, issuer_aid, current_sn }` -- verifier instance per registry

**InvalidTransition**: `{ current_state, attempted_state, reason }`

**StatusWriteOutcome** (discriminated union):
- `accepted`: `{ event_said: SAID, state_changed: boolean }`
- `escrowed`: `{ event_said: SAID, escrow_reason: string }` -- MRE, MAE, MRI, MSE, MCE
- `rejected`: `{ reason: string }`

**StateChanged** (notification): `{ credential_said, new_state: "Issued" | "Revoked", sn }`

**Builder**: `StatusWriteOutcome` needs a builder or factory for its 3 variants. `LifecycleStateSnapshot` is simple (4 required fields) so no builder needed.

### 3. Port Interfaces

**Inbound: Authorize State Change** (`port://credential-lifecycle/status/inbound/authorize`)
- `authorize(input: StateQueryInput): StatusWriteOutcome`
- Command, not idempotent
- Errors: InvalidCredentialStateError, MissingRegistryError, MissingAuthorizationError, MissingIssuerError, MissingSchemaError, FailedSchemaValidationError, MissingChainError, RevokedChainError, ValidationError

**Inbound: State Reconstruction** (`port://credential-lifecycle/status/inbound/state-reconstruction`)
- `reconstruct(input: StateReconstructionInput): LifecycleStateSnapshot`
- Query, idempotent
- No errors (pure replay)

### 4. Application Service: StatusService

The StatusService IS the guard. It validates TEL events through the C1-C5 constraint pipeline, applies the credential lifecycle FSM, and delegates to the TelRepository for persistence.

Operations:
- `authorize(input)`: run validation pipeline (C1-C5), apply FSM transition, persist via TelRepository, update read model, emit CredentialStateChanged event
- `reconstruct(input)`: replay events through FSM, return computed snapshot

### 5. Repository Interfaces

**TelRepository** (`port://credential-lifecycle/status/outbound/tel-repository`):
- `appendEvent(event: TELEvent): StatusWriteOutcome`
- `getEvents(registry_said: string, credential_said?: string): TelEvent[]`
- `escrow(event: TELEvent, queue: "MRE" | "MAE" | "MRI" | "MSE" | "MCE"): void`
- `deescrow(queue: string, event_said: string): TELEvent`
- Invariants: append-only, writes only through StatusService

**StatusReadModel** (`port://credential-lifecycle/status/outbound/status-read-model`):
- `getSnapshot(credential_said: SAID): LifecycleStateSnapshot | null`
- Query-only; updated internally by StatusService after authorization
- Invariant: always reconstructable from TEL replay

### 6. Error Types

| Error | Recovery | Severity | Escrow Target |
|---|---|---|---|
| InvalidCredentialStateError | abort | fatal | -- |
| MissingRegistryError | escrow | transient | MRE |
| MissingAuthorizationError | escrow | transient | MAE |
| MissingIssuerError | escrow | transient | MRI |
| MissingSchemaError | escrow | transient | MSE |
| FailedSchemaValidationError | abort | fatal | -- |
| MissingChainError | escrow | transient | MCE |
| RevokedChainError | abort | fatal | -- |
| ValidationError | abort | fatal | -- |
| StatusServiceStateError | abort | fatal | -- |
| StatusServiceValidationError | abort | fatal | -- |

### 7. State Machines

**CredentialLifecycle FSM**:
- States: `NotIssued`, `Issued`, `Revoked`
- Initial: `NotIssued`; Terminal: `Revoked`
- Transitions:
  - `NotIssued -> Issued`: upd/bup with ts='issued', guard: registry exists AND issuer key state valid AND KEL anchor AND sn=current+1 AND p matches AND mode matches
  - `Issued -> Revoked`: upd/bup with ts='revoked', same guards
  - `NotIssued -> REJECTED`: ts='revoked' on NotIssued
  - `Issued -> REJECTED`: ts='issued' on Issued (duplicate)
  - `Revoked -> REJECTED`: any event (terminal)
- REJECTED is not a state -- it means the event was refused

**RegistryLifecycle FSM**:
- States: `Uninitialized`, `Active`
- Initial: `Uninitialized`; No terminal states
- Transitions: `Uninitialized -> Active` on rip event (sn==0, valid issuer)
- Invariant: registry must be Active before any credential events
- v2: no rotation events, configuration immutable after rip

### 8. Validation Pipeline (Constraint DAG)

Sequential pipeline: C1 -> C2 -> C3 -> C4 -> C5

| ID | Constraint | On Failure |
|---|---|---|
| C1 | Registry exists and Active | escrow to MRE |
| C2 | Issuer key state available, signatures verify | escrow (MRI) |
| C3 | TEL event anchored in issuer's KEL via seal | escrow to MAE |
| C4 | sn == current_sn + 1, p field matches prior SAID | escrow to OOT |
| C5 | State transition valid per FSM | reject (fatal) |

Note: C3's on_failure says "escrow to MCE" in verification.yaml but the description says "missing KEL anchor event." This seems like it should be MAE (Missing Anchor Escrow), not MCE (Missing Chain Escrow). **See Open Question Q1.**

### 9. Builder(s)

**StatusWriteOutcome.accepted(event_said, state_changed)**: factory
**StatusWriteOutcome.escrowed(event_said, escrow_reason)**: factory
**StatusWriteOutcome.rejected(reason)**: factory

No complex Builder needed -- all types have required-only fields.

### 10. Test Plan

- **FSM exhaustive**: all 6 transition paths (2 valid + 3 rejected + 1 terminal)
- **State reconstruction determinism**: replay same events twice, assert identical snapshots
- **Cache consistency**: assert snapshot == replay_state(events)
- **Sequence number monotonicity**: reject sn != current_sn + 1
- **Hash-chain integrity**: reject event where p != SAID of prior event
- **Mode matching**: non-blindable registry rejects bup, blindable rejects upd
- **Integration: CredentialIssuance_happy**: verify snapshot with state=Issued after upd(ts='issued')
- **Integration: CredentialRevocation_happy**: verify terminal Revoked state after upd(ts='revoked')
- **Escrow routing**: each missing prerequisite routes to correct escrow queue

### 11. Dependencies

- `types://cesr/primitives#SAID` -- CESR primitive (Layer 0 peer)
- `types://credential-lifecycle/registry#RegistryInceptionEvent` etc. -- cross-domain ref to registry subdomain (Layer 6); at Layer 0, TELEvent wraps these as opaque references
- `domain://externals/persistence` -- outbound adapter

### 12. Open Questions

**Q1 (credential-lifecycle/status): C3 on_failure target mismatch.** The validation_constraints DAG says C3_kel_anchor's `on_failure` is "escrow to MCE -- missing KEL anchor event." But MCE is "Missing Chain Escrow" (for edge section chains), not "Missing Anchor Escrow." The errors catalog has a dedicated `MissingAuthorizationError` with recovery_target `MAE`. Which escrow queue does C3 route to: MAE (Missing Anchor Escrow) or MCE (Missing Chain Escrow)?

**Q2 (credential-lifecycle/status): C2 on_failure escrow target unspecified.** The constraint C2_issuer_key_state says `on_failure: "escrow -- missing issuer key state"` but does not name a specific queue. The errors catalog has `MissingIssuerError` with recovery_target `MRI`. Should C2's on_failure explicitly route to MRI?

**Q3 (credential-lifecycle/status): TELEvent vs TelEvent -- two overlapping type names.** `types.yaml` defines both `TELEvent` (union of registry events from registry subdomain) and `TelEvent` (core identifying fields). Their names differ only by casing. Are these truly distinct types with different purposes, or should one be eliminated? The dual naming is confusing and risks implementation bugs.

**Q4 (credential-lifecycle/status): StateQueryInput carries a full LifecycleStateSnapshot.** The `credential_snapshot` field in StateQueryInput is a `LifecycleStateSnapshot` which already contains the state. For the "authorize" port (which changes state), why does the input carry a pre-existing snapshot? Is the caller expected to provide the current snapshot, or is this the proposed new state? The semantics are unclear.

**Q5 (credential-lifecycle/status): Registry types from credential-lifecycle/registry are referenced but that domain is Layer 6.** TELEvent variants reference `types://credential-lifecycle/registry#RegistryInceptionEvent`, `#BlindableUpdateEvent`, and `#NonBlindableUpdateEvent`. But `credential-lifecycle/registry` is Layer 6. At Layer 0, should `credential-lifecycle/status` define its own event structure types, or defer to opaque SAIDs?

**Q6 (credential-lifecycle/status): Missing "OOT" escrow type in errors.yaml.** The validation pipeline routes C4 failures to "OOT" (out-of-order TEL event), but no error in errors.yaml maps to this queue. Should there be an `OutOfOrderTelEventError` with recovery_target OOT?

---

## Domain 2: privacy/aggregation

### 1. Module Structure

```
privacy/aggregation/
  mod.ts                       -- re-exports
  types.ts                     -- AggregationInput, SADPath, SadPathSig
  errors.ts                    -- AGIDVerificationError, InclusionProofError, etc.
  aggregation-service.ts       -- Inbound: aggregation operations
  path-signature-service.ts    -- Inbound: SAD path signature operations
  compactor.ts                 -- Compactor engine (hierarchical graduated disclosure)
  agid.ts                      -- AGID computation algorithm
  inclusion-proof.ts           -- Inclusion proof verification
  most-compact-form.ts         -- Depth-first most compact form algorithm
```

### 2. Type Definitions

**AggregationInput** (discriminated union):
- `blinded_block` variant: `{ block: BlindedAttributeBlock }` (from privacy/blinding)
- `said_list` variant: `{ saids: string[] }` -- canonical order for reproducible aggregation

**SADPath**: `{ path: string[] }` -- ordered field labels from root to target
- Examples: `['a', 'i']`, `['e', 'edge1', 'd']`
- Empty path = root SAD

**SadPathSig**: `{ path: string, signature: string, signer_aid: string }`
- Signature over serialized content at path, not whole SAD
- Path must resolve to valid location

### 3. Port Interfaces

**Inbound: Aggregation Operations** (`port://privacy/aggregation/inbound/aggregation-operations`)
- `compute_agid(saids: string[], serialization_kind: SerializationKind): SAID`
- `verify_inclusion(block_said: SAID, said_list: string[], agid: SAID): boolean`
- `compute_most_compact_form(acdc: SAD): CompactedACDC`
- `compact(acdc: SAD): CompactedACDC` (via Compactor)
- Query, idempotent
- Errors: AGIDVerificationError, InclusionProofError, CompactionError, SAIDListEmptyError, OneOfOrderError, MostCompactFormError

**Inbound: SAD Path Signatures** (`port://privacy/aggregation/inbound/path-signatures`)
- `sign_path(path: SADPath, sad: SAD, signer: SigningKey): SadPathSig`
- `verify_path_signature(path: SADPath, sad: SAD, sig: SadPathSig, verfer: Verfer): boolean`
- Command (signing), idempotent (verification)
- Errors: SADPathSignatureError

**Outbound: Cryptographic Digest** (`port://privacy/aggregation/outbound/digest`)
- `digest(input: bytes | SAD): SAID`
- Delegates to `domain://externals/cryptographic-primitives`

### 4. Application Service: AggregationService

Core algorithms:
- **AGID computation**: serialize `[AGID_placeholder, said_1, ..., said_N]` using the ACDC's serialization kind (JSON/CBOR/MGPK), digest with Blake3-256, replace placeholder with computed digest
- **Inclusion proof**: compute block SAID, check membership in SAID list, recompute AGID from list, match against A field
- **Most compact form**: depth-first bottom-up traversal; SAIDify leaves, compact them, SAIDify parents, repeat to root

### 5. Repository Interfaces

None -- this is a pure computation domain with no persistence.

### 6. Error Types

| Error | Recovery | Severity |
|---|---|---|
| AGIDVerificationError | abort | fatal |
| InclusionProofError | abort | fatal |
| CompactionError | abort | fatal |
| SAIDListEmptyError | abort | fatal |
| OneOfOrderError | abort | fatal |
| SADPathSignatureError | abort | fatal |
| MostCompactFormError | abort | fatal |

All errors are fatal/abort -- no escrow in the aggregation domain.

### 7. State Machines

None -- pure computation, no state transitions.

### 8. Validation Pipeline

No formal constraint DAG. Validation is inline:
1. SAID list non-empty (SAIDListEmptyError)
2. All SAIDs valid format
3. AGID recomputation matches (AGIDVerificationError)
4. Inclusion: block SAID in list (InclusionProofError)
5. oneOf ordering: compact variant first (OneOfOrderError)

### 9. Builder(s)

**SadPathSig** has 3 required fields -- no builder needed.

**Compactor** acts as a builder-like engine:
- `.leaves` -- mappers at leaf nodes with computed SAIDs
- `.partials` -- partially disclosable variants
- `.iscompact` -- whether current form is leaf-level-SAIDed

### 10. Test Plan

- **AGID determinism**: same SAID list produces same AGID every time
- **AGID self-referential**: zeroth element is the AGID itself (dummy replacement)
- **Inclusion proof positive**: member block produces valid proof
- **Inclusion proof negative**: non-member block fails
- **oneOf ordering**: compact variant must be first in array
- **Most compact form uniqueness**: only one MCF SAID per ACDC
- **Compactor depth-first**: leaves computed before parents
- **SAD path signature specificity**: signature on /a/score does not verify for /a/name
- **Serialization kind sensitivity**: AGID depends on JSON vs CBOR vs MGPK encoding

### 11. Dependencies

- `types://privacy/blinding#BlindedAttributeBlock` -- peer Layer 0 domain
- `types://cesr/primitives#SAID` -- peer Layer 0 domain
- `domain://externals/cryptographic-primitives` -- Blake3-256 digest

### 12. Open Questions

**Q7 (privacy/aggregation): What is the AGID serialization format for each kind?** The UL says "Serialization uses the same format as the enclosing ACDC (JSON, CBOR, or MGPK)" but the types.yaml `AggregationInput` does not carry a `serialization_kind` field. How does `compute_agid` know which serialization to use? Should the input carry the kind, or is it inferred from the ACDC's version string?

**Q8 (privacy/aggregation): AggregationInput union is underspecified.** The `blinded_block` variant takes a single `BlindedAttributeBlock`, but AGID computation requires a LIST of block SAIDs. How does the aggregation service get from one blinded block to an AGID? Is the `blinded_block` variant for a different operation (e.g., contributing one block to an in-progress aggregation)? The type-to-operation mapping is unclear.

**Q9 (privacy/aggregation): SAD path format inconsistency.** `SADPath` uses `path: string[]` (array of labels), but `SadPathSig` uses `path: string` (single string like `-a-i`). These are different representations of the same concept. Should they be unified? What is the canonical path format?

**Q10 (privacy/aggregation): Compactor type is in the UL but not in types.yaml.** The Compactor is described extensively in the UL (with `.leaves`, `.partials`, `.iscompact` properties) but has no formal type definition in types.yaml. Should it be a formal type, or is it purely an internal implementation detail?

**Q11 (privacy/aggregation): Indexed vs non-indexed SAD path signatures.** The UL mentions indexed signatures (quinkey indexing, Siger primitives, `.spsgs` group) and non-indexed (couple form, Verfer->Cigar, `.spcgs` group). The `SadPathSig` type in types.yaml has a single variant that does not distinguish these forms. Should there be two variants? How does the consumer choose between indexed and non-indexed?

---

## Domain 3: privacy/blinding

### 1. Module Structure

```
privacy/blinding/
  mod.ts                      -- re-exports
  types.ts                    -- BlindedAttributeBlock, BoundBlindedAttributeBlock
  errors.ts                   -- BlindingKeyMismatchError, UnblindingError, etc.
  blinding-service.ts         -- Inbound: blinded state operations
  uuid-derivation-service.ts  -- Inbound: UUID derivation
  blid.ts                     -- BLID computation algorithm
  state-discovery.ts          -- Brute-force state discovery
```

### 2. Type Definitions

**BlindedAttributeBlock**: `{ d: string (SAID), u: string (UUID >= 128 bits), attributes: map }`
- Invariant: u field >= 128 bits entropy
- SAID is a blinded commitment -- cannot discover content without u

**BoundBlindedAttributeBlock**: `{ blid: string, uuid: string, transaction_said: string, transaction_state: string, bound_sn: integer, bound_said: string }`
- Extends concept of blinded block with KEL binding
- 6 fields -- **Builder warranted**

**BoundBlindedAttributeBlock.builder()**:
- `.blid(blid)` -- required
- `.uuid(uuid)` -- required
- `.transactionSaid(said)` -- required
- `.transactionState(state)` -- required
- `.boundSequenceNumber(sn)` -- required
- `.boundSaid(said)` -- required
- `.build()` -- returns validated BoundBlindedAttributeBlock

### 3. Port Interfaces

**Inbound: Blinded State Operations** (`port://privacy/blinding/inbound/blinded-state`)
- `compute_blid(block: BlindedAttributeBlock): SAID` -- Blake3-256 on qb64 concatenation
- `discover_state(salt: Salt, sn: int, bup_b_field: SAID, candidate_saids: string[], possible_states: string[]): DiscoveredState | null`
- `construct_bound_block(block: BlindedAttributeBlock, sn: int, said: string): BoundBlindedAttributeBlock`
- Command, not idempotent (state discovery has side effects in some contexts)
- Errors: BlindingKeyMismatchError, UnblindingError, BLIDComputationError, StateDiscoveryError, BLIDFieldOrderError

**Inbound: UUID Derivation** (`port://privacy/blinding/inbound/uuid-derivation`)
- `derive_uuid(salt: bytes, sn: int): string`
- Query, idempotent, deterministic
- Errors: InsufficientSaltEntropyError, UUIDDerivationError, UUIDLengthError

**Outbound: Cryptographic Digest** (`port://privacy/blinding/outbound/digest`)
- `digest(raw: bytes): SAID`
- Delegates to external Blake3-256

**Outbound: Key Derivation Function** (`port://privacy/blinding/outbound/kdf`)
- `derive(salt: bytes, path: int): bytes`
- Delegates to external HKDF
- Precondition: salt >= 16 bytes, path >= 0
- Postcondition: output >= 2x salt length

### 4. Application Service: BlindingService

Core algorithms:
- **BLID computation**: concatenate qb64-encoded fields in order `[d, u, td, ts]` (basic) or `[d, u, td, ts, bn, bd]` (bound), digest with Blake3-256, replace dummy placeholder
- **UUID derivation**: HKDF with salt as IKM and sn as info parameter; output >= 256 bits (2x minimum 128-bit salt)
- **State discovery**: for each candidate state in {issued, revoked}, for each candidate ACDC SAID, compute BLID(derive_uuid(salt, sn), acdc_said, state); if matches bup.b, return state
- **Decorrelation**: fresh UUID per sn means identical state produces different BLID at different sns

### 5. Repository Interfaces

None -- pure computation domain with no persistence.

### 6. Error Types

| Error | Recovery | Severity |
|---|---|---|
| BlindingKeyMismatchError | abort | fatal |
| UnblindingError | abort | fatal |
| InsufficientSaltEntropyError | abort | fatal |
| UUIDDerivationError | abort | fatal |
| UUIDLengthError | abort | fatal |
| BLIDComputationError | abort | fatal |
| StateDiscoveryError | abort | recoverable |
| BLIDFieldOrderError | abort | fatal |

Note: StateDiscoveryError is `recoverable` (not fatal) -- the salt may be wrong or ACDC SAID unknown, but the caller may retry with different candidates.

### 7. State Machines

None -- pure computation.

### 8. Validation Pipeline

Inline validation:
1. Salt entropy >= 128 bits (InsufficientSaltEntropyError)
2. Derived UUID length >= 2x salt length (UUIDLengthError)
3. Block field order matches normative ordering (BLIDFieldOrderError)
4. BLID digest type is Blake3-256 / E-code / 44 chars

### 9. Builder(s)

**BoundBlindedAttributeBlock.builder()** -- 6 required fields, all carrying distinct CESR-encoded values. Builder enforces field completeness and validates entropy requirements before `.build()`.

### 10. Test Plan

- **BLID determinism**: same block fields produce same BLID
- **BLID self-referential**: dummy replacement protocol (like SAID)
- **Field order normative**: [d, u, td, ts] for basic, [d, u, td, ts, bn, bd] for bound
- **BLID E-code format**: starts with 'E', length 44
- **UUID determinism**: same (salt, sn) always produces same UUID
- **UUID independence**: different sn values produce different UUIDs from same salt
- **UUID length**: output >= 2x salt length
- **Salt entropy**: reject salt < 128 bits
- **Decorrelation**: same state at consecutive sn values produces different BLIDs
- **State discovery correctness**: brute force over {issued, revoked} finds correct state
- **State discovery failure**: wrong salt exhausts all combinations without match
- **BLID uniqueness across updates**: no BLID reuse in bup sequence

### 11. Dependencies

- `types://cesr/primitives#SAID` -- peer Layer 0 domain
- `domain://externals/cryptographic-primitives` -- Blake3-256, HKDF

### 12. Open Questions

**Q12 (privacy/blinding): HKDF vs argon2 for UUID derivation.** The UL term "UUID Derivation" says "HKDF (HMAC-based Key Derivation Function)." The domain.yaml external references say "argon2/HKDF." The errors.yaml UUIDDerivationError cause mentions "argon2/HKDF." Which KDF is normative? Argon2 is a password-hashing function (slow by design); HKDF is a fast key derivation function. These serve very different purposes. For deriving per-event UUIDs from a shared secret, HKDF seems correct. Is argon2 only used for the initial salt derivation from a passphrase, while HKDF is used for per-event UUID derivation?

**Q13 (privacy/blinding): BlindedAttributeBlock.attributes field vs virtual field labels.** The types.yaml `BlindedAttributeBlock` has an `attributes: map` field. But the UL says the blinded attribute block has "virtual field labels [d, u, td, ts]" that are "never serialized." The types.yaml field structure (d, u, attributes) does not match the UL field structure (d, u, td, ts). Are `td` and `ts` virtual labels for the transaction SAID and transaction state that live inside the `attributes` map? Or are they separate fields that should replace the generic `attributes` map?

**Q14 (privacy/blinding): Port contract input/output type mismatch.** The `blinded-state` inbound port says input is `BlindedAttributeBlock` and output is `BoundBlindedAttributeBlock`. But the port handles multiple operations (compute_blid, discover_state, construct_bound_block) with different input/output signatures. Should this be split into multiple ports, or should the types be union types covering all operations?

**Q15 (privacy/blinding): What are the CESR group codes for blinded state attachments?** The UL mentions CESR group codes: `BlindedStateQuadruples (-a##)` for basic blocks and `BoundStateSextuples (-b##)` for bound blocks. These are CESR composition-level concerns. Should the blinding domain define these, or does it delegate to `cesr/composition`?

---

## Domain 4: privacy/disclosure

### 1. Module Structure

```
privacy/disclosure/
  mod.ts                      -- re-exports
  types.ts                    -- DisclosureMode enum
  errors.ts                   -- InvalidDisclosureProgressionError, PublicBlockPartialDisclosureError
  disclosure-service.ts       -- Inbound: mode definitions
  disclosure-fsm.ts           -- Disclosure Progression state machine
```

### 2. Type Definitions

**DisclosureMode** (enum with 7 variants):
- `Compact` -- SAIDs only, zero content
- `Partial` -- SAID + UUID + optionally schema; requires Private block
- `Selective` -- individual attributes disclosed against aggregate commitment
- `Full` -- all fields expanded, terminal
- `Metadata` -- structural fields visible but uncorrelated (empty u field)
- `NestedPartial` -- each section independently at different disclosure level
- `BulkIssued` -- disclosure from bulk-issued set, unlinkable

Invariants per variant are embedded in the enum definition.

### 3. Port Interfaces

**Inbound: Disclosure Mode Definitions** (`port://privacy/disclosure/inbound/mode-definitions`)
- `classify_mode(acdc: Credential): DisclosureMode`
- `produce_compact_form(acdc: Credential): CompactCredential`
- `is_valid_progression(from: DisclosureMode, to: DisclosureMode): boolean`
- Query, idempotent
- Errors: InvalidDisclosureProgressionError, PublicBlockPartialDisclosureError

### 4. Application Service: DisclosureService

Pure logic service -- no persistence, no external dependencies.

Operations:
- **classify_mode**: inspect ACDC structure (which fields are SAIDs vs expanded, presence of A vs a field, presence of u fields) to determine current disclosure mode
- **produce_compact_form**: replace each section with its SAID; the MCF SAID is what the issuer signed
- **is_valid_progression**: enforce monotonically increasing disclosure (compact < partial < full)
- **validate_oneof_ordering**: verify compact variant is first in oneOf arrays
- **validate_anyof_decorrelation**: verify anyOf order does not correlate to actual array order

### 5. Repository Interfaces

None -- pure logic domain.

### 6. Error Types

| Error | Recovery | Severity |
|---|---|---|
| InvalidDisclosureProgressionError | abort | fatal |
| PublicBlockPartialDisclosureError | abort | fatal |

### 7. State Machines

**Disclosure Progression FSM**:
- States: `compact`, `partial`, `full`
- Initial: `compact`; Terminal: `full`
- Transitions:
  - `compact -> partial`: UUID and schema disclosed alongside SAID; guard: block has d and u fields
  - `partial -> full`: full content disclosed; guard: no chain-link terms, or terms already agreed
  - `compact -> full`: direct full disclosure; guard: no chain-link confidentiality requirements
- Invariants:
  - Monotonically increasing -- cannot retract
  - Chain-link confidentiality gates partial->full
  - Selective, metadata, nested partial, bulk issuance are ORTHOGONAL -- not states in this FSM
  - All mechanisms may be combined (ACDC spec section 12.5)

### 8. Validation Pipeline

Inline:
1. Mode classification: inspect ACDC fields to determine current mode
2. Progression check: verify target mode >= current mode
3. Public block guard: public blocks (no u) skip partial, go compact->full only
4. oneOf ordering: compact variant first
5. anyOf decorrelation: schema order != array order

### 9. Builder(s)

No complex types with optional fields. DisclosureMode is an enum.

### 10. Test Plan

- **Mode classification**: compact ACDC (all sections are SAID strings) -> Compact
- **Mode classification**: A field present -> Selective
- **Mode classification**: u fields present, sections compacted -> Partial
- **Progression monotonicity**: compact->partial->full is valid; full->partial is rejected
- **Public block guard**: block without u field cannot be partially disclosed
- **oneOf ordering**: compact variant must be first in schema oneOf array
- **anyOf decorrelation**: schema anyOf order != actual block array order
- **Chain-link gate**: partial->full blocked until contractual terms agreed
- **Direct compact->full**: valid when no chain-link requirements
- **FSM completeness**: all 3 transitions + rejection paths tested

### 11. Dependencies

- `types://credential-lifecycle#Credential` -- input type for mode classification (from parent domain, Layer 7; at Layer 0, this is a forward reference)

### 12. Open Questions

**Q16 (privacy/disclosure): DisclosureMode has 7 variants but the FSM has only 3 states.** The FSM models `compact -> partial -> full` with selective, metadata, nested partial, and bulk-issued described as "orthogonal." But the DisclosureMode enum includes all 7 as variants. How do the 4 orthogonal modes compose with the 3-state FSM? For example, if the current mode is `Selective`, is the FSM state `compact` (since the aggregate is compacted) or something else? Is `NestedPartial` a state between `partial` and `full`?

**Q17 (privacy/disclosure): Forward reference to `types://credential-lifecycle#Credential`.** The mode-definitions port takes `types://credential-lifecycle#Credential` as input. But `credential-lifecycle` is a Layer 7 domain. At Layer 0, this type does not exist. Should the disclosure domain define its own lightweight ACDC representation, or accept a generic SAD map and classify based on field inspection?

**Q18 (privacy/disclosure): Missing Metadata and BulkIssued transitions in the FSM.** The FSM has no transitions involving Metadata or BulkIssued modes. The UL says Metadata ACDCs "support structural disclosure only" and BulkIssued is about "disclosure of one copy from a bulk-issued set." Do these have their own progression rules? Can a Metadata ACDC progress to Full? Can a BulkIssued credential progress through compact -> partial -> full?

**Q19 (privacy/disclosure): Chain-link confidentiality guard is protocol-level, not domain-level.** The FSM guard for `partial -> full` says "no chain-link terms, or chain-link terms already agreed." But agreement happens via IPEX exchange (credential-exchange/negotiation domain). How does the disclosure domain know whether terms have been agreed? Does it accept a boolean flag, or does it query the exchange domain? At Layer 0, the exchange domain is not available.

---

## Cross-Domain Open Questions

**Q20 (cross-domain): Privacy subdomain coordination model.** The privacy parent domain (Layer 7) orchestrates disclosure/blinding/aggregation via the GraduatedDisclosure protocol. But at Layer 0, each subdomain is independent. The protocol references ports across all three subdomains. Is the expectation that Layer 0 implements each subdomain as self-contained modules, and the orchestration protocol is implemented only at Layer 7 when the parent domain is built?

**Q21 (cross-domain): TEL v2 event type coverage.** The credential-lifecycle/status domain references three TEL event types: `rip`, `upd`, `bup`. The blinding domain owns `bup` event semantics. But `bup` events also appear in the status domain's FSM transitions. Which domain is the authority on bup event structure and validation? Does the status domain delegate bup-specific validation (BLID computation, backer signatures) to the blinding domain, or does it handle bup events as opaque updates?

**Q22 (cross-domain): Selective disclosure uses A field, not a field -- but types don't model this.** The disclosure domain says selective disclosure uses the `A` field (aggregate section). The aggregation domain computes the AGID that goes into the `A` field. But neither domain's types.yaml defines an ACDC type with an `A` field. The ACDC type is owned by `credential-lifecycle` (Layer 7). At Layer 0, how do the privacy subdomains reason about the A/a distinction without the ACDC type?
