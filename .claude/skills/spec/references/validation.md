# Validation Engine and Witness Agreement

Covers cryptographic strength, verification vs validation, role-based validation, event classes, duplicity, first-seen policy, superseding recovery, and KAWA.

---

## Cryptographic Strength

Minimum 128-bit strength for all operations. 256-bit hashes (Blake2, Blake3, SHA3) provide 128-bit pre-quantum AND post-quantum collision resistance. Seeds/keys need ~128 bits (16 bytes) of entropy.

**Pre-rotation post-quantum security:** Pre-rotation commits to a digest of the next public key (not the key itself), hiding it behind a hash. As long as the hash remains strong, exposed quantum attacks on the signing algorithm cannot recover pre-rotated keys. Controllers MUST be able to reproduce private keys for committed rotation keys.

---

## Verification vs Validation

A **verifier** cryptographically verifies an event's structure and signatures to establish control authority. A **validator** first acts as a verifier, then applies additional role-specific and locality-specific criteria (witnessing thresholds, delegation approval) to determine acceptance. Every validator MUST first verify before validating.

### Event Verification Algorithm

1. Verify the event's SAID (self-addressing identifier digest)
2. Verify required fields are present
3. Verify prior event digests (backward chain integrity)
4. Determine controlling key set for the AID at event issuance time:
   - Non-transferable: use inception event keys
   - Transferable: replay inception + all rotations up to this event
5. Verify signatures from current signing public keys
6. Verify signatures from exposed prior-rotation public keys (if any)
7. Verify threshold satisfaction for both current signing AND prior-rotation thresholds
8. All checks pass = verified

---

## Validation Rules by Role

Events are **local** (sourced on validator's device or via trusted MFA channel) or **remote** (received via unprotected channel). Remote events MUST be treated as potentially malicious.

### Role-Locality Matrix

| Role | Local Event | Remote Event |
|------|-------------|--------------|
| **Controller** | Sign, accept into own KEL, propagate to witnesses for receipting | SHOULD NOT sign or accept |
| **Witness** | Verify controller sigs, then sign (witness), receipt, propagate | SHOULD NOT sign or accept |
| **Delegatee** | Sign, accept, propagate to witnesses + delegator for seal approval | SHOULD NOT sign or accept |
| **Delegator** | Verify delegatee + witness sigs, accept, optionally seal in own KEL | SHOULD NOT seal or accept |
| **General** | Verify all sigs + seals (controller, witness, delegator), accept | Same as local |

**Receipts** (local or remote): any validator MUST verify attached witness signatures or delegator seals before attaching them to its copy of the event.

**Delegator constraint:** SHOULD NOT auto-approve delegated rotation that changes witness pool beyond the pool's prior threshold.

---

## Event Classes

**Establishment** (`icp`, `rot`, `dip`, `drt`): create or change key state. **Non-establishment** (`ixn`): anchors data without key state change. **Delegated establishment** (`dip`, `drt`): requires delegator approval via anchored seal in delegator's KEL.

---

## Duplicity Detection

A **duplicitous event** is a verified but different version of an event at the same sequence number. Duplicity is nonrepudiable cryptographic proof of misbehavior (key compromise or intentional controller dishonesty).

- A single verifiable KERL copy suffices to detect duplicity in any inconsistent copy
- Validator SHOULD NOT trust when duplicity is detected
- Validator MUST trust when there is no evidence of duplicity
- Controller MAY perform recovery (superseding rules) to reconcile duplicity
- A juror MAY record duplicitous variants in a DEL (Duplicitous Event Log) as evidence

---

## First-Seen Policy

Core invariant: **"First seen, always seen, never unseen."**

Each accepted event gets a strictly monotonically increasing `fn` (first-seen number) stored alongside it. The KEL forms a DAG with one undisputed **trunk**; superseded branches are **disputed**.

- First verified version at a given `sn` is accepted and witnessed
- All other versions at that `sn` are discarded (unless superseding rules apply)
- Different KEL copies may have different `fn` for a given `sn`, but consistent copies have the same event version at every `sn`
- An event that cannot supersede per the rules below cannot be first-seen at all

---

## Superseding Recovery Rules

Recovery enables repairing a compromised KEL. Future validators will not see compromised events; only validators who first-saw events before recovery will see them. Recovery events are signed nonrepudiably -- controller remains accountable.

### Rule A -- Non-delegated events

- **A0:** Rotation MAY supersede interaction at same `sn`, provided the interaction is not before any other rotation event. (Enables recovery from live exploit of exposed signing keys via rotation to unexposed next keys.)
- **A1:** Non-delegated rotation MAY NOT supersede another rotation.
- **A2:** Interaction MAY NOT supersede any event.

### Rule B -- Delegated events

A delegated rotation MAY supersede the **latest-seen** delegated rotation at the same `sn` if any of:
- **B1:** Superseding rotation's delegating event has higher `sn` in delegator's KEL
- **B2:** Same delegating event, but superseding rotation's seal appears later in the seal list
- **B3:** Same delegating event `sn`, but superseding's delegating event is a rotation that superseded the other's interaction (Rule A0 applied to delegating event)

### Rule C -- Recursive delegation

If neither A nor B is satisfied, recursively apply A and B up the delegation chain. If recursion reaches a non-delegated root without satisfaction, the candidate MUST be discarded.

**Critical failure:** If an attacker issues two sequential delegated rotations both approved by the delegator, the delegatee loses control of pre-rotated keys and recovery becomes impossible.

---

## KAWA -- KERI's Algorithm for Witness Agreement

BFT algorithm run by the controller with N designated witnesses, providing highly available, fault-tolerant key event history via a KERL in indirect mode.

### Fault Parameters

| Parameter | Symbol | Constraint | Meaning |
|-----------|--------|------------|---------|
| Total witnesses | N | N >= 1 | Designated witnesses for the AID |
| Witness tally | M | M <= N | Minimum confirming witnesses (accountability threshold) |
| Unavailable | F* | F* = N - M | Max witnesses that may be down |
| Duplicitous | F | F < M | Max witnesses that may be dishonest |

### Witness Designation

- Controller MUST designate tally (M) and initial witness set in inception event
- Rotation MAY amend witnesses (MUST include new tally, pruned set, grafted set)
- Witness AIDs MUST use non-transferable CESR encoding (`B` prefix for Ed25519)

### Witnessing Policy

1. Each witness MUST verify signatures, content, and consistency of every received event
2. First verified version is witnessed (signed, stored, acknowledged) -- first-seen wins
3. Witness creates receipt, stores in KERL, returns receipt to controller
4. Witness MAY disseminate receipt to other witnesses (broadcast, gossip, or not at all)
5. Log is append-only: later messages MUST NOT change existing entries (except valid superseding events)
6. Inconsistent receipts (different event version at same location) MUST be discarded
7. Witness MAY add verified signatures from consistent peer receipts to its log

### Round-Robin Dissemination

Controller connects to each witness in turn, sending events + collected receipts, receiving new receipts. Two passes through all N witnesses ensures full dissemination. Complexity: at most **2*N** acknowledged exchanges per event. Alternative: gossip protocol (lower latency, N*log(N) bandwidth).

### Immunity and Security

- Given F* unavailable and F duplicitous witnesses, at most one sufficient agreement can exist (immunity)
- A proper agreement MUST be verified as consistent with all prior events by every non-faulty witness
- Protection from colluding dishonest controller + witnesses MUST come from the validator's own observers (watchers, jurors, judges) -- duplicity detection
- Undetectable attack requires preventing ALL validators from communicating with ANY observer who saw an alternate version -- practically unfeasible with diverse observer sets (ambient duplicity detection)

### Security Model Summary

Live exploits target current events (defense: KAWA availability + consistency). Dead exploits target past events with compromised keys (defense: duplicity detection via archived KERLs). Direct mode has limited attack surface; indirect mode uses KAWA for BFT agreement. Malicious third parties compromise keys (impersonation); malicious controllers create conflicting events (fraud).

---

## Infrastructure Roles

**Witnesses** are managed by the AID's controller (designated in KEL events). **Watchers** are chosen by the validator (MAY be kept confidential from attackers). Validators MAY use watchers to watch their own witness pools. Watchers MAY exchange receipts. Judges evaluate duplicity evidence from juries (pools of jurors).
