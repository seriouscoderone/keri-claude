# Implementation Plan: Layer 0 — Group C (Delegation + Integrity)

## Domains Covered

1. `delegation/authorization`
2. `delegation/lifecycle`
3. `delegation/recovery`
4. `integrity/detection`
5. `integrity/recovery`

All five are Layer 0 (foundation) with no prior-layer domain dependencies. They all belong to the `@kerizon/keri-core` package (delegation domains) or `@kerizon/watcher` package (integrity domains) per `packaging.yaml`.

---

## 1. delegation/authorization

### 1.1 Module Structure

```
delegation/authorization/
  types.ts          # DelegationSeal, TwoWayBinding, DelegationSealSource, DiFieldValue, AnchorPayload
  ports.ts          # BindingLifecyclePort, SealConstructionPort
  service.ts        # DelegationAuthorizationService (inbound port impl)
  errors.ts         # MissingDelegatorSealError, MissingDelegableApprovalError, etc.
  builders.ts       # DelegationSealBuilder, AnchorPayloadBuilder
```

### 1.2 Type Definitions

**DelegationSeal** — 3 required fields (`i`, `s`, `d`). Wire-format type with terse field names. Requires a Builder to expose adopter-centric names.

**TwoWayBinding** — verified result: `delegator_aid`, `delegatee_aid`, `seal_event_sn`, `seal_said`, `di_field`. Invariant: `delegator_aid == di_field`.

**DelegationSealSource** — couple: `sn` (integer) + `said` (string). Used to locate the delegator's approval event.

**DiFieldValue** — wrapper: `delegator_aid`. Only present in `dip` events; absent from `drt`.

**AnchorPayload** — array wrapper: `seals: DelegationSeal[]` (min length 1). Batch delegation support.

### 1.3 Port Interfaces

**Inbound: Binding Lifecycle** (`port://delegation/authorization/inbound/binding-lifecycle`)
- Semantics: command, non-idempotent
- Input: `KeyEvent` (from identity/establishment)
- Output: `TwoWayBinding`
- Errors: MissingDelegatorSealError, MissingDelegableApprovalError, InvalidDelegatorError, DelegationNotAllowedError, SupersedingDelegationError
- Client: `domain://delegation`

**Inbound: Seal Construction** (`port://delegation/authorization/inbound/seal-construction`)
- Semantics: command, non-idempotent
- Input: `DelegationSeal`
- Output: `AnchorPayload`
- Errors: SealMismatchError
- Client: `domain://delegation`

### 1.4 Application Service

`DelegationAuthorizationService` implements both inbound ports:
- `verifyBinding(event: KeyEvent): TwoWayBinding` — verifies di field + seal match
- `constructSealPayload(seal: DelegationSeal): AnchorPayload` — constructs delegating event anchor
- `matchSealToEvent(seal: DelegationSeal, event: KeyEvent): boolean` — verifies `seal.d == event.said && seal.i == event.aid`

### 1.5 Repository Interfaces

None — this domain has no outbound persistence ports. It depends only on `domain://externals/cryptographic-primitives` for digest computation (SAID).

### 1.6 Error Types

| Error | Severity | Recovery | Escrow Target |
|---|---|---|---|
| MissingDelegatorSealError | transient | escrow | PDE |
| MissingDelegableApprovalError | transient | escrow | MDE |
| InvalidDelegatorError | transient | escrow | PDE |
| DelegationNotAllowedError | fatal | abort | - |
| SealMismatchError | fatal | abort | - |
| SupersedingDelegationError | transient | escrow | PDE |

### 1.7 State Machines

None explicit. The binding lifecycle is a stateless verification — it either succeeds or errors.

### 1.8 Validation Pipeline

The verification.yaml defines property-based invariants but no formal validation_constraints DAG. Key verification steps:
1. Seal must have all 3 fields (i, s, d) — all non-null, CESR-qualified
2. seal.d must exactly match delegated event SAID
3. Two-way binding requires both di field AND matching seal
4. di field only in `dip`, absent from `drt` and `icp`
5. Seal ordering within a delegating event is significant for superseding (rule B2)

### 1.9 Builders

**DelegationSealBuilder** — maps adopter-centric names to wire fields:
```
DelegationSeal.builder()
  .delegateeAid(aid)      // -> i
  .delegatedEventSn(sn)   // -> s
  .delegatedEventSaid(said) // -> d
  .build()
```

**AnchorPayloadBuilder** — batch seal construction:
```
AnchorPayload.builder()
  .addSeal(seal1)
  .addSeal(seal2)
  .build()   // enforces min_length: 1
```

### 1.10 Test Plan

1. **Cooperative requires both** — delegation incomplete if either party's contribution missing (property-based)
2. **Two-way binding verifiable** — seal.d == event.said AND di references valid AID
3. **Seal requires all 3 fields** — missing any field invalidates seal (property-based, 2^3 combinations)
4. **Seal content commitment** — tampering event changes SAID, breaks seal (property-based)
5. **di field presence constraint** — present in dip, absent in drt/icp
6. **Neither party can forge** — each side uses its own keys
7. **Seal ordering significance** — SMT: later seal index supersedes earlier within same event (B2)
8. **Integration**: DelegatedInception_happy scenario — two-way binding verified after delegation

### 1.11 Dependencies

- `domain://externals/cryptographic-primitives` — Blake3-256/SHA-256 for SAID computation
- Types: `types://identity/establishment#KeyEvent` (input to binding lifecycle)
- Package: `@kerizon/keri-core`

### 1.12 Open Questions

**Q-DA-1: Does "delegation seal source" (deSourceCouple) travel as an attachment or within the event body?**
The UL says it's "attached to delegated events" and keripy uses it as a Seqner+Saider couple in attachments, while keriox uses a SourceSeal struct. For the DDD spec, does the source seal belong to the delegation/authorization domain's type system, or is it a CESR attachment concern handled by the messaging domain?

**Q-DA-2: When a delegating event contains multiple seals (batch delegation), what is the exact ordering rule for superseding?**
The UL says "ordering of seals within a delegating event is significant for rule B2." Does this mean the last seal supersedes the first (last-writer-wins), or the first seal has priority? The verification.yaml Z3 expression says `seal_b_index > seal_a_index => supersedes(seal_b, seal_a)`, implying last-writer-wins.

**Q-DA-3: Is the DND (Do Not Delegate) trait checked at the delegatee's inception or at each establishment event?**
The spec says DND "permanently forbids creating delegated identifiers under it." Does this mean a delegator without DND at inception can later be blocked from delegating, or is DND only an inception-time trait?

**Q-DA-4: Can a delegation seal appear in a delegator's inception event, or only in rotation/interaction events?**
The UL says "interaction event (ixn) or a rotation event (rot)" but does not mention inception. Is a seal in an inception event valid for delegation?

---

## 2. delegation/lifecycle

### 2.1 Module Structure

```
delegation/lifecycle/
  types.ts          # PromotedEvent, DelegationWriteOutcome, SignedEstablishmentEvent
  ports.ts          # ApproveDelegationPort, CheckApprovalStatusPort, DelegationRepositoryPort, IdentityServicePort
  service.ts        # DelegationLifecycleService (inbound port impl)
  errors.ts         # DelegatorNotFoundError, DelegationSealMismatchError, DelegationNotPermittedError
  state-machine.ts  # DelegationValidationPipeline FSM
```

### 2.2 Type Definitions

**PromotedEvent** — `aid`, `sn`, `event_said`, `promoted_from: "PDE" | "MDE"`.

**DelegationWriteOutcome** — discriminated union with 4 variants:
- `approved` — `event_said`, `delegator_approval_sn`
- `pending_approval` — `event_said`, `delegator_aid`
- `pending_witnesses` — `event_said`, `witnesses_received`, `witnesses_needed`
- `rejected` — `reason: string`

**SignedEstablishmentEvent** — `event: KeyEvent`, `signatures: Signature[]` (min 1). Invariant: event must be establishment type (never ixn).

### 2.3 Port Interfaces

**Inbound: Approve Delegation** (`port://delegation/lifecycle/inbound/approve`)
- Semantics: command, non-idempotent
- Input: `SignedEstablishmentEvent`
- Output: `DelegationWriteOutcome`
- Errors: DelegatorNotFoundError, DelegationSealMismatchError, DelegationNotPermittedError

**Inbound: Check Approval Status** (`port://delegation/lifecycle/inbound/check-approval-status`)
- Semantics: query, idempotent
- Input: `SignedEstablishmentEvent`
- Output: `DelegationWriteOutcome`
- Errors: DelegatorNotFoundError

**Outbound: Delegation Repository** (`port://delegation/lifecycle/outbound/delegation-repository`)
- Semantics: command, non-idempotent
- Persists: pending approvals, delegable events, approved seals
- Invariants: removal is idempotent, approval records link delegator to delegatee via seal SAID

**Outbound: Identity Service** (`port://delegation/lifecycle/outbound/identity-service`)
- Semantics: command, non-idempotent
- Purpose: request delegator commit approval to their identity history
- Output: `WriteOutcome` (from identity/state)

### 2.4 Application Service

`DelegationLifecycleService`:
- `approve(event: SignedEstablishmentEvent): DelegationWriteOutcome` — orchestrates the 4-step validation pipeline, routes to escrow or acceptance
- `checkApprovalStatus(event: SignedEstablishmentEvent): DelegationWriteOutcome` — queries current escrow/approval state
- Internal: `processEscrowSweep()` — sweeps PDE and MDE when delegator KEL advances

### 2.5 Repository Interfaces

`DelegationRepository` (outbound):
- `putPde(aid, sn, said, event, datetime)` — store partially-delegated
- `getPdeIter(aid)` — iterate PDE entries for an AID
- `remPde(aid, sn, said)` — remove from PDE (idempotent)
- `putDelegable(aid, sn, said, event, datetime)` — store delegable
- `getDelegableIter(aid)` — iterate delegable entries
- `remDelegable(aid, sn, said)` — remove from delegable (idempotent)
- `putApprovedSeal(delegator_aid, delegatee_aid, seal_said)` — mark seal approved
- `getApprovedSeal(delegatee_aid)` — check approval status

### 2.6 Error Types

| Error | Severity | Recovery | Escrow Target |
|---|---|---|---|
| DelegatorNotFoundError | transient | escrow | PDE |
| DelegationSealMismatchError | fatal | abort | - |
| DelegationNotPermittedError | fatal | abort | - |

### 2.7 State Machines

**delegation-validation-pipeline** FSM:
- States: `received`, `sig-checked`, `di-verified`, `seal-located`, `approved`, `escrowed-pde`, `escrowed-delegable`, `rejected`
- Initial: `received`
- Terminal: `approved`, `rejected`
- Key transitions:
  - `received` -> `sig-checked` (step 1 passes) | `rejected` (invalid sigs)
  - `sig-checked` -> `di-verified` (step 2 passes) | `rejected` (invalid di)
  - `di-verified` -> `seal-located` (step 3: seal found) | `escrowed-delegable` (no delegator KEL) | `escrowed-pde` (KEL present, no seal)
  - `seal-located` -> `approved` (step 4: digest match)
  - `escrowed-pde` -> `seal-located` (delegator KEL advances, seal found)
  - `escrowed-delegable` -> `di-verified` (delegator KEL becomes available)
- Invariant: escrow timeout 3600s prunes both PDE and delegable entries

### 2.8 Validation Pipeline

Constraint DAG from verification.yaml:
```
C1_delegate_sigs_valid → C2_delegator_identified → C3_delegator_seal_exists → C4_seal_digest_matches → C5_accept
```

Failure routing is deterministic:
- Step 1 fail -> rejected (InvalidSignatureError)
- Step 2 fail -> rejected (invalid/missing delegator)
- Step 3 fail (no KEL) -> escrowed_delegable
- Step 3 fail (no seal) -> escrowed_pde
- Step 4 fail -> rejected (DelegationSealMismatchError)

### 2.9 Builders

No complex types with 3+ optional fields requiring Builders. `DelegationWriteOutcome` uses discriminated union variants — constructed via factory methods per variant.

### 2.10 Test Plan

1. **Step 1: signature verification** — invalid sigs rejected, not escrowed (property-based)
2. **Step 2: di field validation** — dip requires di, drt inherits from inception
3. **Step 3: seal location** — 3 outcomes: pass/escrowed_delegable/escrowed_pde based on KEL availability
4. **Step 4: seal digest match** — exact SAID match required
5. **Failure routing deterministic** — each step maps to exactly one disposition
6. **PDE invariants** — delegator KEL available but no matching seal
7. **Escrow mutual exclusion** — event in exactly one of {pde, delegable, rejected, approved}
8. **Timeout boundary** — 3600s exact: 3599 active, 3600 pruned (SMT verified)
9. **Approval gate** — no KEL insertion until seal status is approved
10. **Integration**: DelegatedInception_happy, EscrowCascade_full_pipeline (step 4: PDE)

### 2.11 Dependencies

- `types://identity/establishment#KeyEvent` — input event type
- `types://identity/state#WriteOutcome` — output of identity service
- `types://cesr/primitives#SAID` and `#AID` — primitive types
- `domain://externals/persistence` — repository backing
- Package: `@kerizon/keri-core`

### 2.12 Open Questions

**Q-DL-1: Is the "Delegable Event Escrow" (MDE) the same as or different from the PDE in terms of timeout?**
Both are listed with 3600s timeout in the UL, but the EscrowCascade scenario says PDE has 86400s (24h). Which is authoritative? The verification.yaml SMT tests 3600s for "both PDE and delegable." This is a contradiction.

**Q-DL-2: When an event is promoted from delegable escrow, does it go to PDE or directly to KEL?**
The UL says "promoted to Partially-Delegated escrow or directly to the KEL once the delegator's event arrives." The state machine says `escrowed-delegable -> di-verified` (retry from step 3). Which is the canonical path — does it skip PDE if the seal is found immediately?

**Q-DL-3: What happens when the delegator's key state changes while a delegation is in PDE?**
The integration scenario mentions "delegator rotates keys while signatures are accumulating in PSE" but doesn't address key rotation during PDE. Does a delegator rotation invalidate the approval seal? Or is the seal committed to a specific event (by sn+SAID), making it independent of key state?

**Q-DL-4: The DelegationWriteOutcome has a "pending_witnesses" variant. Is the delegation workflow witness-first-then-approval, or approval-first-then-witnesses?**
The port description says "witness acknowledgment, delegator approval request, approval verification, publication" (witness first). But the EscrowCascade says PWE comes before PDE (witness before delegation). If witness receipts are needed before delegator approval, what happens if witnesses refuse a delegated event? Is it stuck in PWE forever?

**Q-DL-5: Overlap between delegation/authorization errors and delegation/lifecycle errors.**
Both domains define errors for missing seals and seal mismatches. `MissingDelegatorSealError` appears in authorization; `DelegatorNotFoundError` and `DelegationSealMismatchError` appear in lifecycle. Are these the same errors or distinct errors at different layers? Should lifecycle re-use authorization's error types?

---

## 3. delegation/recovery

### 3.1 Module Structure

```
delegation/recovery/
  types.ts          # DelegatedRotation, SupersedingRule, NotSuperseding, CompromiseRequirement, SupersedingOrder, EventType, DelegatingEventRef
  ports.ts          # RecoveryRulesPort, SupersedingComparisonPort
  service.ts        # DelegationRecoveryService (inbound port impl)
  errors.ts         # DelegatorRevocationError, DelegatorCompromisedError
```

### 3.2 Type Definitions

**DelegatedRotation** — `event: KeyEvent` + `delegator_aid: string`. Invariant: event.t in ('rot', 'drt').

**SupersedingRule** — enum with 7 variants: `A0_RotationSupersedesInteraction`, `A1_NoRotationSupersedingRotation`, `A2_InteractionCannotSupersede`, `B1_HigherDelegatingSn`, `B2_LaterSealInSameEvent`, `B3_RotationOverInteractionSameSn`, `C_RecursiveDelegation`. Each variant has invariant text from the spec.

**NotSuperseding** — `reason: string`. The incumbent remains authoritative.

**CompromiseRequirement** — `minimum_keys: integer`, `key_type: string`. For N-level chain: keys_needed = chain_length + 1.

**SupersedingOrder** — enum: `FirstSupersedes`, `SecondSupersedes`, `Neither`.

**EventType** — enum: `Inception`, `Rotation`, `Interaction`, `DelegatedInception`, `DelegatedRotation`.

**DelegatingEventRef** — `delegator_aid`, `sn`, `said`. Used for B1 (sn comparison) and B2 (seal index).

### 3.3 Port Interfaces

**Inbound: Recovery Rules** (`port://delegation/recovery/inbound/recovery-rules`)
- Semantics: query, idempotent
- Input: `DelegatedRotation`
- Output: `SupersedingRule`
- Errors: DelegatorRevocationError, DelegatorCompromisedError

**Inbound: Superseding Comparison** (`port://delegation/recovery/inbound/superseding-comparison`)
- Semantics: query, idempotent
- Input: `DelegatingEventRef`
- Output: `SupersedingOrder`
- Errors: none

### 3.4 Application Service

`DelegationRecoveryService` — pure protocol logic (no persistence, no networking):
- `evaluateSupersedingRule(candidate: DelegatedRotation, incumbent: DelegatedRotation, delegatorKel): SupersedingRule | NotSuperseding` — applies B1 -> B2 -> B3 -> C cascade
- `compareEvents(refA: DelegatingEventRef, refB: DelegatingEventRef): SupersedingOrder` — ordering comparison
- `checkJointCompromise(delegationChain: AID[]): CompromiseRequirement` — returns minimum keys needed

### 3.5 Repository Interfaces

None — this is a leaf domain with pure protocol logic. No persistence, no externals.

### 3.6 Error Types

| Error | Severity | Recovery | Escrow Target |
|---|---|---|---|
| DelegatorRevocationError | transient | escrow | PDE |
| DelegatorCompromisedError | recoverable | escalate | - |

### 3.7 State Machines

None explicit. The superseding rules are a stateless comparison function — given two competing events and the delegator KEL, return which rule applies.

### 3.8 Validation Pipeline

No formal validation_constraints DAG. The superseding cascade is:
1. Check if both events are delegated rotations at the same sn
2. Apply B1: compare delegating event sn. Higher sn wins.
3. If B1 tied, apply B2: same delegating event, compare seal index. Later index wins.
4. If B2 tied, apply B3: same delegating sn, compare event type (rot > ixn).
5. If B3 tied, apply C: recurse up delegation chain.
6. If no rule resolves: incumbent (first-seen) wins (conservative default).

### 3.9 Builders

No complex types requiring Builders.

### 3.10 Test Plan

1. **Delegatee-only compromise blocked** — drt without delegator seal rejected (property-based)
2. **Delegator-only compromise blocked** — drt signature check fails without delegatee pre-rotated keys
3. **Joint compromise requirement (SMT)** — both key sets required; partial = failure
4. **Chain depth scaling (SMT)** — N-level chain needs N+1 key sets
5. **Rule B1** — higher delegating sn wins (SMT)
6. **Rule B2** — later seal index wins within same event (SMT)
7. **Rule B3** — rotation over interaction at same sn (SMT)
8. **Latest-seen constraint** — only most recent delegated rotation supersedable (property-based)
9. **Custodial delegation** — delegator controls pre-rotated keys, can unilaterally recover
10. **Integration**: SupersedingRecovery_happy scenario (delegation variant)

### 3.11 Dependencies

- `types://identity/establishment#KeyEvent` — input event type
- Package: `@kerizon/keri-core`

### 3.12 Open Questions

**Q-DR-1: How does rule C (recursive delegation) terminate when the delegation chain has depth > 2?**
The UL says "recursion always terminates because delegation chains are finite and the root is always non-delegated." But what is the concrete algorithm? At each level, do we apply B1/B2/B3 first, then if no resolution, apply A0/A1/A2 at the delegator's level? Or do we apply all rules at each level before recursing?

**Q-DR-2: What does "latest-seen delegated rotation" mean in a distributed system?**
The UL says "only the latest-seen delegated rotation at a given sn can be superseded." But "latest-seen" depends on each validator's observation order. Does this mean two validators could have different "latest-seen" events and thus different superseding outcomes? If so, is this a source of irreconcilability?

**Q-DR-3: Rule B1 tiebreaker: the UL says "if both candidate and incumbent reference the same delegating event at the same seal index, the event with the earlier first-seen number (fn) at the delegator wins." But fn is local to each node. How can this produce universal agreement?**
This seems to create a "first-seen wins at the delegator" rule, which depends on message ordering at the delegator. Is this intentional? Or is this describing the behavior of a specific validator, not a global consensus rule?

**Q-DR-4: What exactly constitutes "custodial delegation" at the protocol level?**
The UL says it's a "deployment pattern" not a separate code path. But the CompromiseRequirement type has a `key_type` field that distinguishes "current signing, next pre-rotation, or delegator." Does the protocol need to know whether a delegation is custodial, or is this purely an out-of-band organizational arrangement?

**Q-DR-5: The delegation/recovery and integrity/recovery domains both define superseding rules (B1-B3). Are these the same rules defined in two places, or is one domain the authoritative source?**
delegation/recovery defines them from the delegation perspective; integrity/recovery defines them from the reconciliation perspective. The spec should have a single source of truth. Which domain owns the superseding rule definitions?

---

## 4. integrity/detection

### 4.1 Module Structure

```
integrity/detection/
  types.ts          # DuplicityEventLog, MonitorHandle, DuplicityEvidence, TrustDecision, NoDuplicity, TrustReconciled, TrustRevoked
  ports.ts          # MonitoringLifecyclePort, TrustDecisionsPort, KelSourcesPort
  service.ts        # IntegrityDetectionService (inbound port impl)
  errors.ts         # LikelyDuplicitousError, DuplicitousInceptionError, KELForkDetectedError, FirstSeenReplayError, DuplicityEscrowTimeoutError
```

### 4.2 Type Definitions

**DuplicityEventLog** — `prefix: AID`, `entries: DuplicityEvidence[]`. Append-only, never modified or deleted.

**MonitorHandle** — `monitored_aid: AID`, `sources: AID[]` (min 2 from distinct operators), `active: boolean`.

**DuplicityEvidence** — `aid: AID`, `sn: integer`, `first_event_said: SAID`, `conflicting_event_said: SAID`, `first_source: AID`, `conflicting_source: AID`. Invariant: `first_event_said != conflicting_event_said`.

**TrustDecision** — discriminated union:
- `trust` — `aid: AID`, `reason: string` (requires superseding recovery evidence)
- `no_trust` — `aid: AID`, `reason: string` (confirmed unrecoverable)
- `reconcile` — `aid: AID`, `reason: string` (ambiguous, more info needed)

**NoDuplicity** — `aid: string`, `checked_at: string` (ISO 8601).

**TrustReconciled** — `aid: string`, `resolution: string`.

**TrustRevoked** — `aid: string`, `reason: string`, `evidence_said: string`. Permanent.

### 4.3 Port Interfaces

**Inbound: Monitoring Lifecycle** (`port://integrity/detection/inbound/monitoring-lifecycle`)
- Semantics: command, non-idempotent
- Input: `AID`
- Output: `MonitorHandle`
- Errors: LikelyDuplicitousError, DuplicitousInceptionError, FirstSeenReplayError
- Preconditions: valid AID + at least 2 sources from distinct operators

**Inbound: Trust Decisions** (`port://integrity/detection/inbound/trust-decisions`)
- Semantics: command, non-idempotent
- Input: `DuplicityEvidence`
- Output: `TrustDecision`
- Errors: DuplicityEscrowTimeoutError
- Postcondition: with evidence but no superseding recovery, decision MUST be no_trust or reconcile

**Outbound: KEL Sources** (`port://integrity/detection/outbound/kel-sources`)
- Semantics: query, idempotent
- Input: `AID`
- Output: `KERL`
- Errors: KELForkDetectedError
- External: `domain://externals/transport` — watcher network

### 4.4 Application Service

`IntegrityDetectionService`:
- `monitorAid(aid: AID, sources: AID[]): MonitorHandle` — start monitoring
- `checkDuplicity(aid: AID): NoDuplicity | DuplicityEvidence` — cross-check witnesses
- `evaluateTrust(evidence: DuplicityEvidence[]): TrustDecision` — judge adjudication
- `cancelMonitoring(handle: MonitorHandle): void` — stop monitoring

Internal:
- `compareKerls(kerlA: KERL, kerlB: KERL): { consistent: boolean, duplicitousSns: Set<number> }` — deterministic discrepancy detection
- `assessConfidence(available: number, total: number): 'FULL' | 'SUFFICIENT' | 'DEGRADED'`

### 4.5 Repository Interfaces

No explicit outbound persistence port in the spec. The DuplicityEventLog is managed internally. The outbound `kel-sources` port is an adapter to `domain://externals/transport`.

### 4.6 Error Types

| Error | Severity | Recovery | Escrow Target |
|---|---|---|---|
| LikelyDuplicitousError | recoverable | escrow | LDE |
| DuplicitousInceptionError | recoverable | escrow | LDE |
| KELForkDetectedError | recoverable | escalate | - |
| FirstSeenReplayError | transient | abort | - |
| DuplicityEscrowTimeoutError | recoverable | abort | - |

### 4.7 State Machines

No explicit FSM in verification.yaml. The monitoring lifecycle is implicit:
- `idle` -> `monitoring` (monitorAid called)
- `monitoring` -> `duplicity_detected` (conflicting events found)
- `duplicity_detected` -> `trust_decided` (judge evaluates)
- `trust_decided` terminal states: `trusted`, `not_trusted`, `reconciling`

### 4.8 Validation Pipeline

No formal validation_constraints DAG. Key detection rules:
1. **Duplicity predicate**: same (prefix, sn), different SAID = duplicity
2. **Duplicate predicate**: same (prefix, sn), same SAID = idempotent duplicate, NOT duplicity
3. **Discrepancy detection is deterministic**: exact set comparison, no heuristics
4. **Confidence levels**: FULL (all witnesses), SUFFICIENT (>= ceil((N+1)/2)), DEGRADED (below threshold)
5. **Judge decision constraints**: trust requires superseding recovery evidence; no trust without evidence

### 4.9 Builders

No complex types requiring Builders.

### 4.10 Test Plan

1. **Duplicity detection** — different SAIDs at same (prefix, sn) = duplicity (property-based)
2. **Duplicate NOT duplicitous** — same SAID from two sources is idempotent, not duplicity
3. **DEL permanence** — once added, entries survive maintenance/GC (property-based)
4. **DEL stores both events** — full serialized events, not just references
5. **Notification delivery** — cue with kin='duplicity' pushed synchronously; DEL updated regardless of judge
6. **Watcher control separation** — watcher controlled by validator, NOT controller
7. **Insufficient diversity** — below ceil((N+1)/2) returns InsufficientDiversityError
8. **Discrepancy detection deterministic** — pure function of SAID comparison at common sns
9. **Judge decision constraints** — three valid types; trust requires superseding recovery
10. **Juror-judge separation** — jurors store, judges decide; no overlap
11. **Eclipse attack (SMT)** — all-or-nothing; must block every ambient source
12. **Eclipse cost scaling** — linear with watcher count x diversity
13. **Ambient verifiability thresholds** — three confidence tiers
14. **Superseding recovery path** — rot at fork_point with pre-committed keys
15. **Integration**: DuplicityCheck_detected scenario

### 4.11 Dependencies

- `types://cesr/primitives#AID` and `#SAID` — primitive types
- `types://accountability/receipting#KERL` — KERL type from outbound port
- `domain://externals/transport` — watcher network transport
- Package: `@kerizon/watcher`

### 4.12 Open Questions

**Q-ID-1: Where is the DuplicityEventLog (DEL) persisted?**
The domain has no outbound persistence port, yet the DEL is permanent and append-only. Is the DEL an internal data structure within the detection domain, or should there be an outbound repository port for DEL persistence? The domain.yaml doesn't declare any `externals/persistence` dependency.

**Q-ID-2: What is the relationship between "Watcher" in integrity/detection and the watcher-service domain?**
The detection domain defines watcher behavior (cross-check, compare, detect), but the watcher-service domain is a separate package (`@kerizon/watcher`). Is the detection domain's Watcher a logical concept implemented by the watcher-service, or is it a separate component?

**Q-ID-3: How does the juror-judge separation work in deployment?**
The UL says jurors "may run in concert with a witness" and judges are "under the validator's control." Are jurors and judges separate processes, or logical roles within a single watcher process? The spec says "juror MUST NOT make trust decisions" and "judge MUST NOT collect evidence directly" — does this mean they MUST be separate interfaces, or just logically separated concerns within one service?

**Q-ID-4: The LikelyDuplicitousError has recovery "escrow" with target "LDE" (Likely Duplicitous Events). But the domain doesn't define an LDE escrow type or persistence mechanism.**
Is LDE an escrow queue managed by this domain, or by the parent integrity domain? Where is LDE defined and who sweeps it?

**Q-ID-5: Inception duplicity is handled specially (rule: "No superseding recovery is possible for inception events"). Does this mean a duplicitous inception is always irreconcilable?**
If an attacker creates a conflicting inception for an existing AID prefix, is the AID permanently compromised with no recovery path? The UL implies yes ("first-seen inception is authoritative, the conflicting inception is evidence").

**Q-ID-6: The MonitorHandle requires "at least 2 sources from distinct operators." How is "distinct operator" defined?**
Is this a property of the witness AID (different controlling AIDs), network location (different IP subnets), or organizational declaration? The spec doesn't define what constitutes operator distinctness.

---

## 5. integrity/recovery

### 5.1 Module Structure

```
integrity/recovery/
  types.ts          # SupersedingRecoveryEvent, SupersedingRule (A0-C), NotSuperseding, DisputedBranch
  ports.ts          # SupersedingRulesPort, ReconciliationPort
  service.ts        # SupersedingRecoveryService (inbound port impl)
  errors.ts         # InvalidRecoveryRotationError, RecoveryNotPossibleError, IrreconcilableError, SupersedingConflictError
  state-machine.ts  # SupersedingRecovery FSM
```

### 5.2 Type Definitions

**SupersedingRecoveryEvent** — `rotation_event: RotationEvent`, `recovery_sn: integer`, `fork_point_sn: integer`. Invariant: `recovery_sn >= fork_point_sn`.

**SupersedingRule** — discriminated union with 7 variant constructors (A0, A1, A2, B1, B2, B3, C). Each variant has no data fields, only invariant documentation.

**NotSuperseding** — `rule_checked: string`, `reason: string`. Incumbent remains authoritative.

**DisputedBranch** — `aid: string`, `fork_sn: integer`, `branch_events: SAID[]` (ordered). All from sn >= fork_sn. Retained in DEL.

### 5.3 Port Interfaces

**Inbound: Superseding Rules** (`port://integrity/recovery/inbound/superseding-rules`)
- Semantics: query, idempotent
- Input: `SupersedingRecoveryEvent`
- Output: `SupersedingRule`
- Errors: InvalidRecoveryRotationError, RecoveryNotPossibleError
- Precondition: candidate and incumbent at same (aid, sn) with different SAIDs

**Inbound: Reconciliation** (`port://integrity/recovery/inbound/reconciliation`)
- Semantics: command, non-idempotent
- Input: `AID`
- Output: `DisputedBranch`
- Errors: IrreconcilableError, SupersedingConflictError

### 5.4 Application Service

`SupersedingRecoveryService` — pure protocol logic:
- `evaluateSuperseding(candidate, incumbent): SupersedingRule | NotSuperseding` — applies A0 -> A1 -> A2 -> B1 -> B2 -> B3 -> C cascade
- `reconcile(aid, kelDag): { trunk: Event[], disputedBranches: DisputedBranch[] }` — determines the undisputed path
- `canRecover(aid, forkPointSn): boolean` — checks if recovery is possible

### 5.5 Repository Interfaces

None — this is a leaf domain with pure protocol logic.

### 5.6 Error Types

| Error | Severity | Recovery |
|---|---|---|
| InvalidRecoveryRotationError | fatal | abort |
| RecoveryNotPossibleError | fatal | abort |
| IrreconcilableError | fatal | escalate |
| SupersedingConflictError | recoverable | escalate |

### 5.7 State Machines

**superseding-recovery** FSM:
- States: `intact`, `compromised`, `fork-detected`, `recovery-applied`, `reconciled`, `irreconcilable`
- Initial: `intact`
- Terminal: `reconciled`, `irreconcilable`
- Key transitions:
  - `intact` -> `compromised` (key compromise detected)
  - `compromised` -> `fork-detected` (conflicting events discovered)
  - `fork-detected` -> `recovery-applied` (superseding rotation accepted)
  - `recovery-applied` -> `reconciled` (all validators find same trunk)
  - `fork-detected` -> `irreconcilable` (no rule resolves the conflict)
- Invariants:
  - Non-delegated rot vs rot fork is always irreconcilable (A1)
  - Recovery requires uncommitted pre-rotated keys
  - Controller accountable for disputed branch events even after recovery

### 5.8 Validation Pipeline

The superseding decision cascade:
1. Check event types (both must be at same aid, sn, different SAIDs)
2. If candidate is ixn -> NotSuperseding (A2)
3. If candidate is rot and incumbent is ixn -> Supersedes (A0)
4. If both are non-delegated rot -> NotSuperseding (A1, irreconcilable)
5. If both are delegated rot -> apply B1 (delegating sn) -> B2 (seal index) -> B3 (event type) -> C (recursive)
6. C base case: root non-delegated AID -> apply A rules
7. C recursive case: apply B rules at each level, recurse up

B3 tiebreaker ensures total ordering: SAID lexicographic comparison can never tie (SAIDs are unique).

### 5.9 Builders

No complex types requiring Builders.

### 5.10 Test Plan

1. **Rule A0: rot supersedes ixn** — pre-rotation authority is ultimate arbiter (property-based)
2. **A0 override immunity** — cannot be overridden by witness count or first-seen ordering
3. **Rule A1: rot vs rot irreconcilable** — non-delegated (property-based)
4. **Rule A2: ixn never supersedes** — any event type (property-based, all 5 event types)
5. **B1/B2/B3 cascade (SMT)** — exhaustive: always produces exactly one winner
6. **Reconciliation produces exactly one trunk** — zero = bug, multiple = bug (property-based)
7. **Disputed branch audit trail** — superseded events off trunk, queryable by fn, never deleted
8. **Superseding moves event to branch** — superseded off trunk, superseding on trunk, both in storage
9. **Recovery key validation** — recovery rotation must use pre-committed next keys from before fork
10. **Integration**: SupersedingRecovery_happy scenario

### 5.11 Dependencies

- `types://identity/establishment#RotationEvent` — input rotation event
- `types://cesr/primitives#AID` — primitive type
- Package: `@kerizon/watcher`

### 5.12 Open Questions

**Q-IR-1: The superseding rules are defined in BOTH integrity/recovery AND delegation/recovery. Which domain is the canonical owner?**
integrity/recovery defines A0-A2, B1-B3, C. delegation/recovery also defines B1-B3, C with delegation-specific context. For a clean DDD design, should the non-delegated rules (A0-A2) live in integrity/recovery and the delegated rules (B1-B3, C) live in delegation/recovery? Or should all rules live in one place with the other domain importing them?

**Q-IR-2: The B rules cascade in verification.yaml describes B3 as "SAID lexicographic" tiebreaker, but the UL describes B3 as "superseding event's delegating event is a rotation superseding the superseded event's delegating interaction."**
These are two completely different operations. The verification.yaml has a 4th-level tiebreaker using SAID comparison that doesn't appear in the UL at all. Is the SAID-based tiebreaker a real protocol rule, or is it an artifact of the SMT formalization? The UL's B3 is about event type (rot > ixn), not SAID ordering.

**Q-IR-3: What does "recovery audit trail" mean for the adopter?**
The spec says superseded events are "queryable via fn-indexed access" and "permanent forensic evidence." But from the adopter's perspective, why would they query disputed branch events? Is there an adopter use case (compliance audit, dispute resolution), or is this a protocol-internal concern?

**Q-IR-4: The reconciliation port says "command, non-idempotent" but reconciliation should produce the same trunk given the same DAG. Is it truly non-idempotent?**
The deterministic nature of the superseding rules means the same inputs should always produce the same trunk. The only non-idempotent aspect might be side effects (storing the trunk designation). Should this be a query instead?

**Q-IR-5: What happens when two competing superseding rotations exist at the same recovery point?**
SupersedingConflictError says "requires judge adjudication." But the superseding rules (B1-B3) are supposed to be a total order (B3/SAID breaks all ties). Under what circumstances can the cascade fail to produce a winner, requiring judge intervention?

**Q-IR-6: The Irreconcilable KEL term says "terminal state" and "the identifier loses value to all validators." But the state machine has no explicit transition from irreconcilable to anything.**
Can an irreconcilable KEL ever be recovered? For example, if one of the conflicting events is later proven to be forged (invalid signatures upon re-checking with updated key state)? Or is irreconcilable truly terminal?

---

## Cross-Domain Open Questions

**Q-CROSS-1: Delegation domains (authorization, lifecycle, recovery) overlap significantly. Is the current decomposition correct?**
Authorization owns seal construction and two-way binding verification. Lifecycle owns the validation pipeline and escrow management. Recovery owns superseding rules. But the boundaries feel porous: lifecycle needs authorization's seal matching, recovery needs lifecycle's escrow awareness, and both recovery domains (delegation/recovery and integrity/recovery) define the same B1-B3 rules. Should these be fewer, larger domains?

**Q-CROSS-2: Both integrity/detection and integrity/recovery deal with "superseding recovery" — detection mentions it as a recovery path, recovery implements it. Should detection reference recovery's types instead of re-describing the concept?**
The detection UL's Watcher invariant says "An honest controller recovers from duplicity via a superseding rotation event" and includes a property test for superseding recovery. This seems to belong to the recovery domain. Should detection only detect and delegate recovery evaluation to integrity/recovery?

**Q-CROSS-3: The integration scenarios reference `domain://integrity/evidence` which is a Layer 3 domain not in this group. The DuplicityCheck_detected scenario asserts on integrity/evidence. How should detection interact with evidence storage at Layer 0?**
If evidence storage is a separate domain at Layer 3, but detection needs to store evidence at Layer 0, there's a dependency inversion. Should detection have its own DEL storage, or should it emit events consumed by the evidence domain later?

**Q-CROSS-4: Type duplication between delegation/recovery and integrity/recovery for SupersedingRule.**
Both domains define a SupersedingRule type with overlapping but not identical variant sets. delegation/recovery has A0-A2, B1-B3, C. integrity/recovery has A0, A1, A2, B1, B2, B3, C as separate variant constructors. These should be the same type. Which domain owns it?
