# Finding Routing Summary — KERI Specification

18 findings routed. Nothing dropped — every finding goes to a specific file in a specific domain.

## Routing Decision Key

- **ul_term** → `ubiquitous-language.yaml` — adopter would say this word
- **types** → `types.yaml` — developer implementing the spec needs this
- **verification** → `verification.yaml` — validation constraint or rule
- **errors** → `errors.yaml` — error condition
- **education** → keep spec term, needs documentation not renaming

---

## Route: UL Terms (adopter-facing vocabulary)

These are concepts an adopter would use in a sentence about what they're doing.

| ID | Concept | Proposed Term | Domain | Notes |
|----|---------|---------------|--------|-------|
| Z0-001 | Core value proposition — independent verifiability without intermediaries | **End-Verifiability** | identity | Spec's own term. User suggested "Trust" / "Integrity" — but the spec has a precise definition at §5.3 that this term matches exactly |
| Z1-001 | Identifier cryptographically bound to keypair at inception | **Self-Certifying Identifier** | identity | Spec term. User suggested "Identity Beacon" — creative but the spec already names this precisely |
| Z1-002 | Entity holding private keys, primary protocol actor | **Controller** | identity | Spec term wins. User tried "Identity Entity", "Jedi" — Controller is clearer and self-explanatory |
| Z1-004a | General category of any event in a KEL | **Key Event** | identity | Spec term. UL has specific types but needs the umbrella |
| Z1-007a | Role that checks structure + signatures | **Verifier** | identity | Spec term (§A.2.1). No simpler alternative exists |
| Z1-007b | Role that verifies then applies policy before KEL acceptance | **Validator** | identity | Spec term (§A.2.2). No simpler alternative exists |
| Z2-004a | Watcher that records duplicity evidence | **Juror** | watcher-service | Spec term. User said "keep spec terms" |
| Z2-004b | Pool of jurors | **Jury** | watcher-service | Spec term |
| Z2-004c | Watcher that evaluates evidence from juries | **Judge** | watcher-service | Spec term |
| Z2-010 | **COLLAPSE TARGET** — Recovery from compromise | **Identity Recovery** | integrity/recovery | User's word! Collapses from Z2-008c, Z2-008e, Z2-010a-e. The adopter says "I need to recover my identity" — the five mechanisms underneath are types/rules |

**10 UL terms total.** 1 discovery (Identity Recovery collapses 5+ mechanisms).

---

## Route: Types (developer-facing mechanisms)

These describe HOW something works. Important for implementation, but not what the adopter says.

| ID | Concept | Proposed Type | Domain | Notes |
|----|---------|---------------|--------|-------|
| Z1-004b | Non-establishment event that anchors data without changing key state | **InteractionEvent** | identity/types.yaml | User suggested "Seal"/"Stamp"/"Anchor" — all describe the purpose, but this IS an event type. Belongs in types alongside InceptionEvent, RotationEvent |
| Z1-005 | Serialized wire-format of an event + signatures | **KeyEventMessage** | keri-messaging/types.yaml | User said "envelope" and "too low level for Z1" — correct, it's a wire-format type |
| Z1-006 | Seal serves multiple purposes depending on context | **Seal taxonomy** (expansion mapping) | identity/anchoring/types.yaml | User said "Approval"/"Stamp of approval". The expansion mapping (seal → commit/approve/authorize) belongs as a type cross-reference, not a UL term |
| Z2-002 | Committing to a key digest that won't be revealed until rotation | **ForwardBlindedCommitment** | identity/key-commitment/types.yaml | User said "quantum proofing" (the value). The mechanism is a type; the value collapses into Identity Recovery |
| Z2-005 | Commitments survive key rotation | **CommitmentPersistence** | identity/anchoring/types.yaml | User flagged as "not relevant for UL." Correct — it's a property/invariant of the commitment type |
| Z2-007a | Revealing a previously committed key during rotation | **KeyRevelation** | identity/key-commitment/types.yaml | User said "just Rotation." It IS part of rotation but names a specific sub-step |
| Z2-007b | Pre-committed key NOT revealed, held for future | **ReserveKey** | identity/key-commitment/types.yaml | Needed for Reserve Rotation type below |
| Z2-008a | Rotation revealing only a subset of committed keys | **PartialRotation** | identity/establishment/types.yaml | Rotation variant pattern |
| Z2-008b | Rotation adding new uncommitted keys | **AugmentedRotation** | identity/establishment/types.yaml | Rotation variant pattern |
| Z2-009a | Event in delegator's KEL approving delegation | **DelegatingEvent** | delegation/types.yaml | User said "Delegated Approval" — close but it's an event type |
| Z2-009b | Establishment event in delegatee's KEL referencing delegator | **DelegatedEvent** | delegation/types.yaml | Paired with DelegatingEvent |

**11 types total.**

---

## Route: Verification Rules

These are formal validation constraints.

| ID | Concept | Proposed Rule | Domain | Notes |
|----|---------|---------------|--------|-------|
| Z1-003 | Four-way binding (AID ↔ keypairs ↔ Controller ↔ KEL) | **Control Authority Binding invariant** | identity/verification.yaml | User tried "Beacon Infrastructure" / "Beacon Saber." The tetrad is a verification invariant — "the four elements MUST be consistent." Not a thing an adopter names, but a rule they benefit from |
| Z2-010e | Rules for when one event may supersede another | **Superseding Rules** | integrity/recovery/verification.yaml | Formal rule set (A, B, C from spec §A.3) |

**2 verification rules total.**

---

## Route: Types that Collapse into "Identity Recovery" UL Term

These are the children of the Identity Recovery UL term. They live in types.yaml and verification.yaml but are described TO the adopter through the parent UL concept.

| ID | Concept | Type Name | Domain File | Collapses Into |
|----|---------|-----------|-------------|----------------|
| Z2-008c | Recovery using uncommitted reserve keys | **ReserveRotation** | identity/establishment/types.yaml | Identity Recovery |
| Z2-008d | Controlled delegation of signing authority | **CustodialRotation** | delegation/types.yaml | Identity Recovery |
| Z2-008e | Quantum-resistant key pre-positioning | **SQAR** | delegation/recovery/types.yaml | Identity Recovery |
| Z2-010a | Replacing accepted event via rotation at same sn | **SupersedingRecovery** | integrity/recovery/types.yaml | Identity Recovery |
| Z2-010b | Determining undisputed path after forks | **Reconciliation** | integrity/recovery/types.yaml | Identity Recovery |
| Z2-010c | Authoritative branch after recovery | **Trunk** | integrity/recovery/types.yaml | Identity Recovery |
| Z2-010d | Fork containing superseded events | **DisputedBranch** | integrity/recovery/types.yaml | Identity Recovery |

**7 types collapsing into 1 UL term.**

---

## Route: Education (spec terms that need docs, not renaming)

| ID | Concept | Term | Notes |
|----|---------|------|-------|
| Z2-003 | AID-rooted namespace | **Autonomic Namespace** | Spec term. Low priority. Needs a glossary entry, not a UL redesign |

**1 education item.**

---

## Route: Deferred to Z3 (need more detail to route)

| ID | Concept | Why Deferred |
|----|---------|-------------|
| Z1-008 | Anchored vs Signed updates (BADA categories) | User said "too CRUD-like." Need Z3 to see if these matter in BADA verification rules or if BADA's existing UL term is sufficient |
| Z2-001 | Promulgation vs Confirmation infrastructure | User said "witness pool / watcher pool is good." May not need new terms — Z3 will test if existing terms suffice |
| Z2-006 | Individual routed message names | User said YES they need individual names "that represent what they MEAN." But naming them requires Z3 analysis of what each does for the adopter |

**3 deferred to Z3.**

---

## Z3-Z4 Routing (appended)

### Z3 → UL Terms (adopter-facing)

| ID | Concept | Proposed Term | Domain |
|----|---------|---------------|--------|
| Z3-001 | Prod/Bare message purposes | **Disclosure Prompt** (`pro`), **Sealed Disclosure** (`bar`) | keri-messaging |
| Z3-006 | OKEA authorization actors | **Principal Controller**, **Player** | discovery |
| Z3-007 | Peer-to-peer data paradigm | **RUN** (Read, Update, Nullify) | discovery |

### Z3 → Types

| ID | Concept | Type Names | Domain |
|----|---------|-----------|--------|
| Z3-003 | Delegated event types | DelegatedInceptionEvent, DelegatedRotationEvent, DelegatedEstablishment | delegation |
| Z3-004 | Umbrella "parties to event" | EventParty (low priority) | identity |
| Z3-005 | Attack taxonomy | 5 attack types | integrity |

### Z3 → Verification Rules

| ID | Concept | Rule | Domain |
|----|---------|------|--------|
| Z3-002 | Event Locality | Local vs Remote processing context | identity |

### Z4 → Types

| ID | Concept | Type Names | Domain |
|----|---------|-----------|--------|
| Z4-001 | Field-level types | SequenceNumber, PriorEventDigest, WitnessRemoveList, WitnessAddList | identity |
| Z4-002 | Backer umbrella | Backer (Witness + RegistrarBacker) | accountability |

### Z3 Deferred Resolutions

| Was Deferred | Resolution |
|-------------|-----------|
| Z1-008 BADA categories | No new UL. Acceptance rules → `discovery/verification.yaml` |
| Z2-006 Routed messages | Prod/Bare get adopter names (Z3-001). Query/Reply/Exchange fine as-is |
| Z2-001 Infrastructure halves | Witness Pool / Watcher Pool sufficient. Local/remote → verification rule |

---

## Final Summary (Z0-Z4 Complete)

| Route | Count | % |
|-------|-------|---|
| UL Terms | 15 | 33% |
| Types | 17 (+7 collapse children) | 38% |
| Verification Rules | 4 | 9% |
| Education | 1 | 2% |
| ~~Deferred~~ | ~~0~~ (all resolved) | 0% |
| **Total** | **~44** | (28 findings, many with sub-parts) |

## The Discovery

**Identity Recovery** is the clear discovery from this pass. It collapses 7 mechanism-level types into one adopter-facing concept. The adopter says "I need to recover my identity" — they don't say "I need a superseding rotation with reconciliation to establish the trunk after forking a disputed branch." The mechanisms matter for implementation, but the UL term is what the adopter interacts with.
