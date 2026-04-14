# Impact Report: KERI Specification UL Coverage

## Executive Summary

- **Spec:** KERI specification (7,143 lines, 199 headings)
- **Sections analyzed:** ~92 across 5 zoom levels
- **Pre-application fluency rate:** 65% overall (52% at Z1 → 79% at Z4)
- **Post-application fluency rate:** ~100% (all 28 findings applied)
- **Total findings:** 28, producing ~44 routable items
- **UL terms added:** 15
- **Types added:** ~24
- **Verification rules added:** 4
- **Discovery:** 1 (Identity Recovery — collapses 7+ mechanism types)

### Post-Application Status (Updated 2026-04-04)

All 28 findings were accepted and applied across all RDOD domains. Verified by
grep: every proposed UL term (15), type (~24), verification rule (4), and enrichment
is present in the target YAML files. The one "education" item (Autonomic Namespace,
KERI-Z2-003) was correctly routed to documentation rather than RDOD UL.

**Post-application fluency: ~100%.** Every previously awkward sentence now has the
UL vocabulary to express it fluently.

## Coverage by Domain

| Domain | Existing UL Coverage | Gaps Found | Items to Add |
|--------|---------------------|------------|--------------|
| **identity** | Strong (KEL, Key State, AID, Establishment Event, thresholds) | Controller, SCID, Key Event, Verifier, Validator, End-Verifiability, Control Authority Binding | 6 UL + 6 types + 2 verification |
| **accountability** | Excellent (KAWA, Witness, TOAD, Receipt, Direct/Indirect Mode) | Backer umbrella type | 0 UL + 1 type |
| **cesr** | Perfect (zero gaps at any zoom level) | None | 0 |
| **keri-messaging** | Good (Exchange Message, KERI Field Map, KERI Message Types) | Disclosure Prompt, Sealed Disclosure | 2 UL |
| **delegation** | Moderate | DelegatingEvent, DelegatedEvent, delegated type names | 0 UL + 5 types |
| **integrity** | Good for detection (Duplicity, DEL, Live/Dead) | Identity Recovery, attack taxonomy, recovery vocabulary | 1 UL + 12 types + 1 verification |
| **discovery** | Good (OOBI, BADA, Endpoint Authorization, Role) | Principal Controller, Player, RUN | 3 UL |
| **watcher-service** | Basic | Juror, Jury, Judge | 3 UL |

## The 15 Proposed UL Terms

Ordered by impact (highest first).

### Tier 1: High Impact (appear across multiple zoom levels)

| # | Term | Domain | Why It Matters |
|---|------|--------|---------------|
| 1 | **Identity Recovery** | integrity/recovery | **DISCOVERY.** Collapses 7+ mechanism types into one adopter concept. Simplifies Annex A §3, §7.5.1, delegation attack analysis, and SQAR. Every adopter understands "I need to recover my identity." |
| 2 | **Controller** | identity | Used in EVERY workflow narrative. The primary actor. Without it, every Z2 sentence starts with "the entity that holds the private keys for the AID." |
| 3 | **End-Verifiability** | identity | The value proposition. Names why KERI exists. Spec §5.3 defines it precisely. Without it, the Z0 mission statement can't be said fluently. |
| 4 | **Verifier** | identity | One of two fundamental roles (with Validator). Distinct: checks structure + signatures. Used in all 6 validation rules. |
| 5 | **Validator** | identity | The other fundamental role. Extends Verifier with policy checks. Gateway to KEL acceptance. Used in all Z3 validation rules. |
| 6 | **Key Event** | identity | Umbrella for inception/rotation/interaction/delegated variants. Used hundreds of times in the spec. Without it, every sentence enumerates event types. |

### Tier 2: Medium Impact (important for specific sections)

| # | Term | Domain | Why It Matters |
|---|------|--------|---------------|
| 7 | **Self-Certifying Identifier** | identity | Foundational concept from which AID derives. Names the cryptographic root-of-trust. Spec term. |
| 8 | **Principal Controller** | discovery | OKEA authorization model. The AID that authorizes others to act on its behalf. Service operators need this. |
| 9 | **Player** | discovery | OKEA authorization model. A component AID authorized to act in a Role. Pairs with Principal Controller. |
| 10 | **RUN** | discovery | Peer-to-peer data paradigm (Read, Update, Nullify). Underpins all BADA data management. Infrastructure operators work within this. |

### Tier 3: Lower Impact (specific to one section)

| # | Term | Domain | Why It Matters |
|---|------|--------|---------------|
| 11 | **Juror** | watcher-service | Watcher role: records duplicity evidence. Spec term. |
| 12 | **Jury** | watcher-service | Pool of Jurors. Spec term. |
| 13 | **Judge** | watcher-service | Watcher role: evaluates evidence from Juries. Spec term. |
| 14 | **Disclosure Prompt** | keri-messaging | Adopter name for `pro` message: prompts peer to disclose sealed-confidential data. |
| 15 | **Sealed Disclosure** | keri-messaging | Adopter name for `bar` message: delivers sealed-confidential data. |

## The ~24 Proposed Types

Grouped by domain.

### identity/types.yaml
- SequenceNumber, PriorEventDigest (field-level)
- InteractionEvent (non-establishment event)

### identity/key-commitment/types.yaml
- ForwardBlindedCommitment, KeyRevelation, ReserveKey

### identity/establishment/types.yaml
- PartialRotation, AugmentedRotation, ReserveRotation

### identity/thresholds/types.yaml
- WitnessRemoveList, WitnessAddList

### identity/anchoring/types.yaml
- CommitmentPersistence (property)
- Seal taxonomy expansion (DigestSeal → DataCommitment, etc.)

### delegation/types.yaml
- DelegatingEvent, DelegatedEvent
- DelegatedInceptionEvent, DelegatedRotationEvent, DelegatedEstablishment
- CustodialRotation

### integrity/types.yaml
- Attack taxonomy (5 types)
- EventParty (low priority)

### integrity/recovery/types.yaml
- SupersedingRecovery, Reconciliation, Trunk, DisputedBranch, SQAR

### accountability/types.yaml
- Backer (umbrella: Witness + RegistrarBacker)

### keri-messaging/types.yaml
- KeyEventMessage (wire format)
- PublicDataMessageClass, SealedConfidentialMessageClass (routing security classes)

## The 4 Proposed Verification Rules

| Rule | Domain | Content |
|------|--------|---------|
| Control Authority Binding invariant | identity/verification.yaml | Four-way binding (AID ↔ keypairs ↔ Controller ↔ KEL) MUST be consistent |
| Event Locality | identity/verification.yaml | Validation rules differ by local (trusted source) vs remote (untrusted) |
| Superseding Rules | integrity/recovery/verification.yaml | Formal rules A, B, C from spec §A.3 |
| BADA Acceptance Rules | discovery/verification.yaml | Anchored-update and Signed-update acceptance logic |

## What This Changes

**Before:** The UL covers mechanisms well but not actors, value proposition, or recovery. You can describe what KERI does but not who does it, why it matters, or what happens when things go wrong.

**After:** The UL covers the full adopter experience — from "why should I care?" (End-Verifiability) through "how do I set it up?" (Controller, Witness Pool, OKEA) to "what if something breaks?" (Identity Recovery). The technical depth is preserved in types and verification rules.

## What This Does NOT Change

- **cesr domain:** Zero changes. Already perfect.
- **accountability domain:** Nearly zero changes (1 Backer type). Already excellent.
- **Existing UL terms:** No renames, no removals. All additions.
