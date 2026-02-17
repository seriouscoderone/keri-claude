# Key State Machine

Deterministic key state evolution for transferable AIDs: pre-rotation, fractionally weighted thresholds, general pre-rotation (reserve, custodial, SQAR), cooperative delegation, and attack defense.

## Keypair Labeling

- `i` -- zero-based index over all authoritative keypairs for an AID (strictly increasing by one)
- `j` -- zero-based index over establishment events for an AID
- `k` -- zero-based sequence number over all key events in a KEL
- `A^i,j^` -- the i-th keypair authoritative at the j-th establishment event; `A^i,j^~k~` adds event sequence number
- `H(A)` -- qualified cryptographic digest of public key A

## Pre-rotation Fundamentals

Each establishment event commits to the NEXT rotation keypairs by including digests of their public keys (forward-blinded commitment chain). On rotation, previously committed keys are exposed to authorize the rotation while simultaneously committing to a new next set. Because pre-rotated keys are hidden as digests, compromising current signing keys reveals nothing about next rotation keys. Pre-rotated keypairs are one-time-use for rotation authority; afterward they MAY be repurposed as signing keys, but a new next set must be committed in the same event.

Every establishment event MUST include: (1) ordered list of current qualified public keys, (2) current threshold `kt`, (3) ordered list of qualified digests of next public keys, (4) next threshold `nt`, and (5) the AID as either a qualified public key or qualified digest of the inception event.

**Two authority types:**
- **Signing authority** -- held by current keypairs, exercised via `kt` to sign events
- **Rotation authority** -- held by next (pre-rotated) keypairs, exercised via `nt` to perform rotation

## Inception Rules

The controller creates two keypair sets: current (initial) and next. The inception event is signed by a `kt`-satisfying subset of initial private keys and verified against the included public keys. For self-addressing AIDs, `i == d` (both are the qualified digest of the serialized inception with dummy placeholders replaced). Only one inception event is permitted per KEL; all subsequent establishment events MUST be rotations. Non-transferable identifiers MAY have a trivial KEL with inception only and empty pre-rotated key list.

## Rotation Rules

A rotation event exposes the previously committed pre-rotated keys and commits to a new next set. The creator generates only one new keypair set (the new next set). The newly current key list MUST include a threshold-satisfying subset of the old next keys (verified against their pre-committed digests). Signatures on the rotation MUST satisfy a **dual threshold**: both the prior-next threshold `nt` from the most recent establishment event AND the newly current threshold `kt`. Key appearance order MAY differ between current and prior-next lists; threshold weights follow their respective list orderings. Rotating to an empty next key list (`n = []`) signals abandonment of the identifier.

## Fractionally Weighted Thresholds

Thresholds can be integers or fractionally weighted structures using rational fractions (never floating point).

**Simple threshold** -- a list of clauses (logically ANDed). Each clause is a list of rational fraction weights corresponding one-to-one with the key list. A clause is satisfied when the sum of weights for keys with verified signatures >= 1. All clauses must be satisfied for the threshold to be met.

Example: `[["1/2", "1/2", "1/2"]]` -- single clause, 3 keys, any 2 of 3.

**Complex (nested) threshold** -- extends simple form with nested weighted lists. Each clause element is either a simple weight or `{outer_weight: [inner_weights...]}`. Inner weights map to consecutive keys; if inner sum >= 1, outer weight is contributed, else 0. Keys consumed in flattened traversal order. Example: `[{"1/2": ["1/2", "1/2", "1/2"]}, "1/2", {"1/2": ["1", "1"]}]`

**Satisfaction algorithm (both forms):**
1. For each clause: sum weights of entries whose corresponding signatures verified
2. For nested elements: evaluate inner threshold first; contribute outer weight only if inner sum >= 1
3. If clause sum >= 1, clause satisfied; else short-circuit fail
4. All clauses must be satisfied (AND)

## General Pre-rotation

Extends basic pre-rotation with partial and augmented rotation.

**Partial rotation:** Hold back some pre-rotated keys as unexposed (blinded) for future use. Current key list must still include a satisfiable subset of exposed prior-next keys.

**Augmented rotation:** Add new signing keys not in the prior-next set. These contribute to signing authority only (no digest to verify for rotation authority).

**Dual authority verification:** Every rotation must establish both (1) rotation control via exposed prior-next keys matching their digests, and (2) signing control via current threshold satisfaction. When lists/thresholds differ, the validator performs set operations to confirm both.

### Reserve Rotation

Unexposed prior-next keys remain in reserve across establishment events -- "only potentially authoritative" until activated. When reserve keys are pulled out for rotation, they MUST sign the rotation event to satisfy the prior-next threshold, even if assigned weight 0 in the current signing threshold (rotation authority only, no signing authority).

### Custodial Rotation

Custodial agent holds current signing keys for day-to-day operations; original controller retains exclusive rotation authority via pre-rotated keys and can rotate to replace the agent at any time. Rotation MUST satisfy both prior-next threshold (rotation authority) and current threshold (signing authority).

### SQAR (Surprise Quantum Attack Recovery)

Recovers from quantum attack by transitioning to post-quantum-safe keys. Security insight: quantum computers cannot efficiently invert cryptographic-strength digests, so pre-rotated key digests remain secure commitments.

Steps: (1) Generate post-quantum-safe signing keypairs. (2) Generate post-quantum-safe next rotation keypairs and their digests. (3) Build rotation event with current list = [exposed pre-rotated keys, new PQ-safe signing keys]; assign weight 0 to rotation keys, positive weights to PQ-safe signing keys. (4) Sign with pre-rotated keys (rotation authority) and PQ-safe keys (signing authority). (5) Publish to witnesses before pre-rotated keys are exposed publicly -- first exposure is the rotation event itself, so quantum attacker cannot forge a competing rotation.

## Cooperative Delegation

Two-way cryptographic binding between delegator and delegatee:
1. Delegatee's inception event includes delegator's AID (`di` field)
2. Delegator's KEL contains a delegating event with a delegation seal (digest of the delegated event)

Both MUST be present for validity. The delegatee's AID is a fully qualified digest of its inception event (which includes the delegator reference), creating an unbreakable cryptographic chain. A validator MUST find the delegating seal in the delegator's KEL before accepting any delegated event.

## Keypair Lifecycle State Machine

| State | Description |
|-------|-------------|
| next (pre-rotated) | Committed via digest; potentially authoritative for future rotation |
| current | Active signing authority for the current key state |
| discarded | Revoked by subsequent rotation |

**Transitions:**
- **next -> current:** Rotation event includes keypair in newly current set; dual threshold satisfied; public key unblinded
- **current -> discarded:** Subsequent rotation establishes new current set
- **next -> next (held):** Partial rotation; key not included; remains in reserve (j index may change if later rotated in)
- Initial keypairs at inception start as current (shorter lifecycle: current -> discarded on first rotation)
- Pre-rotated keypairs MAY be repurposed as signing keys after their one-time rotation use

## Attack Taxonomy

| Attack | Type | Target | Recovery |
|--------|------|--------|----------|
| Non-est dead | Stale signing keys | ixn forgery | First-seen rule + propagation |
| Est dead | Stale pre-rotated keys | rot forgery | First-seen rule + propagation |
| Non-est live | Current signing keys | ixn forgery | Recovery rotation |
| Est live | Unexposed next keys | rot forgery | None (non-delegated); extremely hard to achieve |
| Delegated est live | Delegatee's next keys | drt forgery | Delegator superseding recovery |
| Eclipse | Prevents validator access | All events | Watcher diversity |
| Deletion | Destroys event copies | All events | Replay validator's signed receipt; redundancy |

**First-seen policy:** "First seen, always seen, never unseen." Only the first version of an event at a given AID and sn is accepted. Any differing, properly signed alternate constitutes duplicity evidence. Controllers MUST propagate widely to prevent eclipse attacks.

## AID Derivation

| Type | Derived From | Transferable |
|------|-------------|--------------|
| Basic SCID | Public key directly | No |
| Single-key non-transferable | Qualified public key | No (trivial KEL allowed) |
| Single-key transferable | Qualified digest of inception or public key | Yes |
| Multi-key | Qualified digest of inception | Yes |

Serialize incepting information, compute qualified cryptographic digest → AID prefix. Single-keypair MAY use qualified public key directly. Self-addressing inception: replace `d` and `i` with dummy `#` chars, compute digest, set both to result. Both MUST be identical; if `i` has digest-type code and `d != i`, event is invalid.
