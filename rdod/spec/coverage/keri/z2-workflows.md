# Z2 — Workflows: KERI Specification

35 H3 sections analyzed. Organized by thematic cluster. 4 administrative sections skipped (Working Examples, Native CESR Encodings, Bibliography sections).

**Convention:** Z1 proposed terms (Controller, Key Event, Interaction Event, SCID, End-Verifiability, Verifier, Validator, Anchored Update, Signed Update) are treated as available. Bold marks existing UL terms; *italic* marks Z1-proposed terms; `code` marks spec jargon with no UL equivalent.

---

## Cluster 1: Foundational Concepts

### §5.3 End-verifiable (line 702)

**Spec:** Defines end-verifiability — data is cryptographically attributable to its source by any recipient without relying on infrastructure not under the verifier's control. Introduces "ambient verifiability" and the promulgation/confirmation infrastructure split.

> "A data item has *End-Verifiability* when any *Verifier* can cryptographically trace it to its source **AID** using only the **KEL** and standard cryptographic libraries, without relying on any infrastructure not under the *Verifier's* control. The *Controller* maintains `promulgation infrastructure` (witness pools) to publish events; the *Verifier* maintains `confirmation infrastructure` (watcher pools) to detect **Duplicity**."

| Term | Status | Notes |
|------|--------|-------|
| End-Verifiability | Z1-proposed (KERI-Z0-001) | Directly validated here |
| Verifier | Z1-proposed (KERI-Z1-007) | Directly validated |
| AID, KEL | fluent | |
| Duplicity | fluent | integrity |
| promulgation infrastructure | **NOT IN UL** | Controller's witness network |
| confirmation infrastructure | **NOT IN UL** | Verifier's watcher network |

**Score: awkward** — The spec introduces a two-sided infrastructure model (promulgation vs confirmation) that has no UL representation. → **KERI-Z2-001**

---

### §5.4 Self-certifying identifier (line 789)

> "A *Self-Certifying Identifier* is derived from its controlling public key(s) via a one-way cryptographic function — either the qualified public key itself (single-key case) or a qualified digest of the **Inception Event** containing all incepting information. This derivation makes the binding between identifier and key self-evident and independently verifiable."

**Score: fluent** (using Z1-proposed SCID term). No new findings.

---

### §5.5 Autonomic identifier (line 809)

> "An **AID** extends the *SCID* concept with transferable control provenance via a **KEL**. The **AID** may be non-transferable (ephemeral, single keypair, no KEL needed) or transferable (persistent, **KEL**-backed, supports **Rotation Events**). This distinction is captured by the **Identifier Transferability** dimension."

**Score: fluent** — The identity UL's Identifier Type Dimensions (5 axes) handles this cleanly.

---

### §5.6 Key rotation/pre-rotation (line 825)

> "Pre-rotation splits control authority into two roles: **Signing Threshold** controls current event authorization, **Rotation Threshold** protects future key replacement. At inception, the *Controller* commits to next-key digests. At rotation, committed keys are revealed and new commitments made — maintaining a continuous chain of `forward-blinded commitments`."

| Term | Status | Notes |
|------|--------|-------|
| Signing Threshold, Rotation Threshold | fluent | identity/thresholds |
| Controller | Z1-proposed | |
| forward-blinded commitment | **NOT IN UL** | The core pre-rotation mechanism |

**Score: awkward** — "Forward-blinded commitment" is the essential mechanism of pre-rotation (committing to keys that haven't been revealed yet). The UL has identity/key-commitment subdomain but this specific concept may not be named. → **KERI-Z2-002**

---

### §5.7 Qualified Cryptographic Primitives / CESR Encoding (lines 849, 871)

> "All cryptographic values in KERI are represented as **Qualified** **Primitives** — raw cryptographic material prepended with a **Code** that identifies the algorithm, type, and length. This **Qualification** enables **Cryptographic Agility** by making the algorithm self-describing. **Primitives** are encoded using **CESR** across three **Domains** — **Text Domain** (**qb64**), **Binary Domain** (**qb2**), and **Raw Domain** — with lossless conversion between them."

**Score: fluent** — The cesr domain UL handles this comprehensively. Every term composes.

---

### §5.9 KERI's secure bindings (line 901)

> "At inception, KERI creates a binding triad: **AID** ↔ keypairs ↔ *Controller*. The **AID** is derived from the public keys (making it a *SCID*). The *Controller* holds the private keys. The keypairs are committed in the **Inception Event**. For transferable identifiers, the **KEL** extends this triad into a *Control Authority Binding* (tetrad): the **KEL** records all **Key State** transitions, making the triad persistent and auditable across key rotations."

| Term | Status | Notes |
|------|--------|-------|
| Control Authority Binding | Z1-proposed (KERI-Z1-003) | Validated — composes naturally |
| triad → tetrad extension | described using existing terms | |

**Score: fluent** (with Z1 proposed terms). The Control Authority Binding term composes well in Z2 narrative. It names the thing the section is about.

---

### §5.10 Autonomic Namespaces (line 1135)

> "An **AID** can serve as the root of an Autonomic Namespace — a namespace whose trust basis is the **AID**'s **Key State** rather than any administrative authority. All data within the namespace inherits *End-Verifiability* from the controlling **AID**."

| Term | Status | Notes |
|------|--------|-------|
| Autonomic Namespace | **NOT IN UL** | Covered conceptually but not named |

**Score: gap** — Autonomic Namespace is an important concept (it's how KERI extends from identifiers to namespaces of data), but may belong outside the core RDOD scope. → **KERI-Z2-003** (low priority)

---

## Cluster 2: Infrastructure and Accountability

### §5.1 Infrastructure and ecosystem overview (line 383)

**Spec:** Controller Application (5 functions), Direct exchange, Indirect exchange (witnesses, watchers, jurors, judges), Ecosystem components.

> "The *Controller* application provides five functions for its **AID**: keypair generation, keypair storage, *Key Event* generation, event signing, and event *validation*. In **Direct Mode**, two *Controllers* exchange **KEL** copies directly — each acts as a *Validator* of the other's events. In **Indirect Mode**, the *Controller* designates a pool of **Witnesses** meeting the **TOAD** threshold. **Witnesses** generate **Receipts** and disseminate them via **Round-robin Dissemination** or **Gossip Protocol** until **KAWA** consensus is reached."

| Term | Status | Notes |
|------|--------|-------|
| Controller, Key Event, Validator | Z1-proposed | All compose well |
| Direct Mode, Indirect Mode | fluent | accountability/dissemination |
| Witness, TOAD, KAWA, Receipt | fluent | accountability |
| Round-robin Dissemination, Gossip Protocol | fluent | accountability/dissemination |

**Score: fluent** — This entire section is well-covered by existing + Z1-proposed terms.

> "A *Validator* MAY employ `Watchers` to maintain copies of **KEL**s and detect **Duplicity**. A `Watcher` who records duplicity evidence is a `Juror`; a pool of `Jurors` is a `Jury`. A `Watcher` who evaluates evidence from `Juries` is a `Judge`. Together, these form the *Validator's* `confirmation infrastructure`."

| Term | Status | Notes |
|------|--------|-------|
| Watcher | in watcher-service UL | |
| Juror, Jury, Judge | **NOT IN UL** | Spec defines a role hierarchy for duplicity evaluation |
| confirmation infrastructure | gap (same as KERI-Z2-001) | |

**Score: gap** — The Watcher role hierarchy (Juror → Jury → Judge) has no UL terms. These are important roles in the indirect trust model. → **KERI-Z2-004**

---

### §A.5 KAWA (line 4940)

> "The *Controller* designates a pool of N **Witnesses** and a **TOAD** threshold M for accountability. **KAWA** provides single-phase **BFT** agreement — sufficient because the *Controller* is the sole source of truth for its own *Key Events* (local ordering, not global). Each **Witness** verifies and logs events, then exchanges **Receipts** with other **Witnesses**. The *Controller* accepts accountability when M of N **Witnesses** confirm. A *Validator* can then obtain an authoritative copy of the **KERL** on demand."

| Term | Status | Notes |
|------|--------|-------|
| Controller, Key Event | Z1-proposed | |
| Witness, TOAD, KAWA, BFT | fluent | accountability/consensus |
| KERL | fluent | accountability/receipting |
| Receipt | fluent | accountability/receipting |
| "single-phase agreement" | not a UL term but implied by KAWA definition | |
| Validator | Z1-proposed | |
| "sole source of truth" | important concept, not UL-named | could be part of KAWA definition |

**Score: fluent** — KAWA section composes well. The accountability domain is the strongest area of UL coverage.

---

## Cluster 3: Data Structures and Messaging

### §6.1 KERI data structure format (line 1219)

> "KERI data structures are ordered **KERI Field Maps** supporting four **Serialization Kinds** (JSON, CBOR, MGPK, CESR). Canonical insertion ordering ensures reproducible serialization/deserialization. Each message is identified by its **SAID** and typed by its **Version String**."

**Score: fluent** — keri-messaging and cesr domains compose well.

---

### §6.2 Seals (line 1648)

> "A seal is a cryptographic commitment embedded in a *Key Event* that binds external data to the **Key State** at that location in the **KEL**. By signing the event containing the seal, the *Controller* nonrepudiably endorses the external data. Seals provide evidence of authenticity while maintaining confidentiality (the external data need not be disclosed). The commitment persists even after **Key State** changes via **Rotation**, enabling unbounded-term verifiable issuances."

| Term | Status | Notes |
|------|--------|-------|
| Key Event, Controller | Z1-proposed | |
| Key State, KEL, Rotation | fluent | |
| "cryptographic commitment" | the adopter-verb expansion of "seal" | |
| "evidence of authenticity" | relates to End-Verifiability | |
| "unbounded-term verifiable issuances" | **NOT IN UL** | Important property: commitments survive key rotation |

**Score: awkward** — The seal concept CAN be described using "commitment" language, but the property that commitments persist across key rotations — which is WHY seals are valuable — has no UL term. → **KERI-Z2-005**

---

### §6.3 Key event messages (line 1912)

> "A *Key Event Message* carries one *Key Event* body plus CESR-attached signatures. The five *Key Event* types are: **Inception Event** (`icp`), **Rotation Event** (`rot`), *Interaction Event* (`ixn`), `Delegated Inception` (`dip`), and `Delegated Rotation` (`drt`). A *Validator* MAY drop any message lacking at least one valid signature from the current **Key State**."

| Term | Status | Notes |
|------|--------|-------|
| Key Event Message | Z1-proposed (KERI-Z1-005) | |
| Key Event, Inception Event, Rotation Event | fluent / Z1-proposed | |
| Interaction Event | Z1-proposed (KERI-Z1-004) | |
| Delegated Inception, Delegated Rotation | **NOT VERIFIED** | Should be in delegation UL |
| Validator | Z1-proposed | |

**Score: fluent** (with Z1 proposed terms). Delegation event type names need Z3 verification.

---

### §6.4 Receipt Messages (line 2358)

> "A **Receipt** message references a *Key Event* by its **SAID**, **AID**, and sequence number. The **Receipt** itself is NOT self-addressed — it contains no SAID of its own. Signatures and seals on a **Receipt** attest to the referenced *Key Event*, not the **Receipt** message body."

**Score: fluent** — accountability/receipting UL handles this. The distinction between receipt-as-attestation and receipt-as-message is clear.

---

### §6.5 Routed Messages (line 2410)

> "Routed Messages enable coordination between *Controllers* and services using hierarchical routes. The six routed types are: `Query` (`qry`), `Reply` (`rpy`), `Prod` (`pro`), `Bare` (`bar`), **Exchange Transaction Inception** (`xip`), and **Exchange Message** (`exn`). Each carries a route field for service dispatch and optionally a return route."

| Term | Status | Notes |
|------|--------|-------|
| Exchange Message | fluent | keri-messaging |
| Query, Reply, Prod, Bare | **NOT INDIVIDUALLY NAMED** in UL | keri-messaging has "KERI Message Types" as umbrella |
| route / return route | not in UL as terms | part of Exchange Message mechanics |

**Score: awkward** — The individual routed message types (query, reply, prod, bare) aren't named in the UL. They're grouped under "KERI Message Types" but the specific purpose of each isn't captured. For Z2 workflows (e.g., OOBI resolution involves query → reply → validation), the individual types matter. → **KERI-Z2-006**

---

### §6.6 Signing and sealing KERI data structures (line 2940)

> "Signatures are computed on serialized *Key Event Messages* and attached as **CESR** encoded groups. **Indexed Signatures** reference their public key by position in the key list from the relevant **Establishment Event** — controller-indexed signatures index into signing or prior-next key lists; witness-indexed signatures index into the **Witness List**. **Non-Indexed Signatures** are used for single-key scenarios."

| Term | Status | Notes |
|------|--------|-------|
| Indexed Signature | likely in cesr/primitives (Siger) | needs Z3 verification |
| Non-Indexed Signature | likely in cesr/primitives (Cigar) | needs Z3 verification |
| Witness List | fluent | identity/thresholds |
| Establishment Event | fluent | identity |
| "controller-indexed" vs "witness-indexed" | **NOT IN UL** | Two categories of indexed signatures |

**Score: fluent** — mostly covered by CESR primitives UL (Siger, Cigar map to indexed/non-indexed). The controller vs witness indexing distinction needs Z3 check.

---

## Cluster 4: Key Management

### §7.2 Pre-rotation (line 3310)

**Spec:** Control authority is split between signing keypairs (current set) and rotation keypairs (next set, hidden as digests). Each Establishment Event designates both sets with dual thresholds.

> "Each **Establishment Event** designates two key sets: the current signing keys (exposed as public keys) and the next rotation keys (hidden as digests — *forward-blinded commitments*). The **Signing Threshold** governs the current set; the **Rotation Threshold** governs the next set. This creates a **Dual Threshold** structure where signing authority and rotation authority are cryptographically separated."

> "A `Non-Establishment Event` (*Interaction Event*) MUST be signed by a **Signing Threshold**-satisfying subset of the current signing keys. It carries no key commitments of its own."

**Score: fluent** — identity/thresholds domain + Z1 proposed terms handle this well. The only gap is "forward-blinded commitment" (KERI-Z2-002).

---

### §7.3 Inception event pre-rotation (line 3365)

> "To create an **AID**, the *Controller* generates two key sets: current signing keypairs (public keys included in the **Inception Event**) and next rotation keypairs (only digests included). The **Inception Event** MUST be signed by a **Signing Threshold**-satisfying subset. When self-addressing, the **AID** itself is derived as the **SAID** of the **Inception Event**."

**Score: fluent** — composes cleanly.

---

### §7.4 Rotation using pre-rotation (line 3411)

> "To rotate, the *Controller* reveals the previously committed next keys as the new current signing keys, and generates a new set of next keys committed as digests. The **Rotation Event** MUST satisfy BOTH the newly current **Signing Threshold** AND the prior **Rotation Threshold** (dual threshold satisfaction). The prior committed keys are `unblinded` — verified against their pre-committed digests. Previously unexposed keys MAY be held in reserve."

| Term | Status | Notes |
|------|--------|-------|
| Signing Threshold, Rotation Threshold, Dual Threshold | fluent | |
| "unblinding" / key revelation | **NOT IN UL** | The act of revealing a pre-committed key |
| "reserve" keys | **NOT IN UL** | Keys held back for future rotation |

**Score: awkward** — The rotation PROCESS composes well, but two important concepts within it aren't named: (a) unblinding (revealing committed keys), and (b) reserve keys (uncommitted keys held back). These surface again in General Pre-rotation. → **KERI-Z2-007**

---

### §7.5 Fractionally weighted threshold (line 3522)

> "A **Fractionally Weighted Threshold** expresses signing or rotation policy as a list of clauses, each containing rational weights mapped one-to-one to keys. Satisfaction requires: (a) the sum of weights of signing keys meets or exceeds 1/1 within each clause, AND (b) all clauses are satisfied. This enables flexible policies like 2-of-3-partners AND 1-of-2-executives."

**Score: fluent** — identity/thresholds UL covers this precisely.

---

### §7.5.1 General Pre-rotation (line 3650)

> "The KERI protocol supports **Partial Rotation** (not all pre-rotated keys become signing keys — some held in `reserve`) and **Augmented Rotation** (new signing keys added that were not pre-rotated). These combine to enable `Reserve Rotation` (recovering from total compromise using pre-committed reserves), `Custodial Rotation` (controlled delegation of signing authority), and *SQAR* (`Surprise Quantum Attack Recovery` — pre-positioning quantum-resistant key commitments)."

| Term | Status | Notes |
|------|--------|-------|
| Partial Rotation | **NOT IN UL** | Important rotation variant |
| Augmented Rotation | **NOT IN UL** | Important rotation variant |
| Reserve Rotation | **NOT IN UL** | Recovery mechanism |
| Custodial Rotation | **NOT IN UL** | Delegation mechanism |
| SQAR | **NOT IN UL** | Quantum recovery mechanism |

**Score: gap** — Five important rotation variants and recovery mechanisms are unnamed. These are Z3-level concepts that describe specific patterns of how the general pre-rotation mechanism is used. → **KERI-Z2-008**

---

## Cluster 5: Delegation

### §7.6 Cooperative Delegation (line 4000)

> "A delegation operation requires a cooperating pair of events: a `delegating event` in the *Delegator's* **KEL** (containing a seal of the delegated event) and a `delegated event` in the *Delegatee's* **KEL** (containing the *Delegator's* **AID**). The *Delegator* **approves** the *Delegatee's* **Establishment Event** by committing its digest to the *Delegator's* **KEL**. A *Validator* MUST find both the seal in the *Delegator's* **KEL** and the *Delegator* reference in the *Delegatee's* **Inception Event** before accepting."

| Term | Status | Notes |
|------|--------|-------|
| Delegator, Delegatee | likely in delegation UL | |
| approve | fluent | per DDD philosophy |
| Validator | Z1-proposed | |
| "cooperating pair of events" | **NOT A NAMED CONCEPT** | The dual-event structure IS cooperative delegation |
| "delegating event" vs "delegated event" | **NOT IN UL** | Spec distinguishes these precisely |

**Score: awkward** — The approval workflow composes well using "approve" + seal-as-commitment language. But the spec's precise terminology for the two sides of the cooperative pair (delegating event vs delegated event) isn't in the UL. Z3 will need these for invariant statements. → **KERI-Z2-009**

---

## Cluster 6: Security and Recovery

### §7.7 Security Properties of Pre-rotation (line 4072)

> "Pre-rotation's security derives from narrow exposure: each key set is used exactly once for its administrative role (rotation), then potentially as signing keys, then discarded. An attacker must predict the one-time exposure or have continuous universal monitoring. **Dead Duplicity** (attacks on stale key state) cannot capture rotation authority. **Live Duplicity** (attacks on current key state) is constrained by the **First-Seen Rule** — the first published version of a **Rotation Event** becomes authoritative."

| Term | Status | Notes |
|------|--------|-------|
| Dead Duplicity, Live Duplicity | fluent | integrity |
| First-Seen Rule | fluent | accountability/consensus |
| "one-time use" keys | described but not named | |
| Rotation Event | fluent | |

**Score: fluent** — integrity + accountability UL handles attack analysis well.

---

### §A.2 Validation (line 4584)

> "A *Verifier* checks event structure (**SAID**, field appearance, prior event digests) and verifies signatures against the **Key State** at issuance. For non-transferable **AIDs**, only the **Inception Event** is needed. For transferable **AIDs**, the complete sequence of **Establishment Events** is needed. A *Validator* first acts as *Verifier*, then applies additional constraints: **Witness** receipt sufficiency (**TOAD**), delegation authorization, and the **First-Seen Rule** — before accepting events into the **KEL**."

**Score: fluent** (with Z1 proposed Verifier/Validator terms). These terms compose into a clear two-stage workflow. This validates KERI-Z1-007 strongly.

---

### §A.3 Superseding Recovery and Reconciliation (line 4782)

> "**First-Seen Rule**: once an event version is accepted at a sequence number, it is 'first seen, always seen, never unseen.' Each event is assigned a monotonically increasing **First-Seen Number** (`fn`) independent of its sequence number."

> "**Superseding Recovery**: a legitimate *Controller* can recover from compromised **Key State** by publishing a **Rotation Event** that supersedes a previously accepted event at the same sequence number. The superseded events are forked to a `disputed branch`; the superseding events form the `trunk` (undisputed path). Reconciliation is the process of determining the trunk."

| Term | Status | Notes |
|------|--------|-------|
| First-Seen Rule | fluent | accountability/consensus |
| First-Seen Number | fluent | identity |
| Superseding Recovery | **NOT IN UL** | Core recovery mechanism |
| "trunk" / "disputed branch" | **NOT IN UL** | KEL forking vocabulary |
| Reconciliation | **NOT IN UL** | Process of determining the undisputed path |

> "**Superseding Rules**: (A) A rotation MAY supersede an interaction at the same `sn`. (B) A delegated rotation MAY supersede the latest-seen delegated rotation if the delegating event is later in the delegator's **KEL**. (C) If neither applies, recursively apply to the delegator's **KEL** up to the root non-delegated **KEL**."

| Term | Status | Notes |
|------|--------|-------|
| Superseding Rules | **NOT IN UL** | Formal recovery rules |
| "latest-seen delegated rotation" | specific concept | |
| recursive delegation resolution | described but not named | |

**Score: gap** — This entire section introduces critical recovery vocabulary that has no UL coverage: Superseding Recovery, Reconciliation, trunk/disputed branch, and the formal Superseding Rules. This is the largest Z2 gap. → **KERI-Z2-010**

---

## Cluster 7: Discovery

### §A.7 Out-Of-Band Introduction (OOBI) (line 6177)

> "An **OOBI** associates a URL with an **AID** or **SAID**, bootstrapping discovery. **OOBI Resolution** fetches verifiable information from the service endpoint — all discovered information MUST be verified in-band via KERI (*End-Verifiability*). **OOBIs** leverage **Percolated Discovery** through existing web infrastructure. A **Well-Known OOBI** uses the `.well-known` URL path convention. A **Blind OOBI** provides the URL without disclosing the target **AID**."

**Score: fluent** — discovery domain UL handles this comprehensively. Every concept composes.

---

### §A.8 BADA (line 6615)

> "**BADA** policy enforces monotonicity of authentically signed data updates, protecting against replay and deletion attacks. Two update mechanisms: (1) *Anchored Updates* — referenced in the **AID's** **KEL** via an *Interaction Event* seal, providing both authentication and auditability; (2) *Signed Updates* — signed with current **Key State** keys plus a datetime stamp, providing authentication without auditability. *Anchored Updates* always supersede *Signed Updates*."

| Term | Status | Notes |
|------|--------|-------|
| BADA | fluent | discovery |
| Anchored Update, Signed Update | Z1-proposed (KERI-Z1-008) | Compose naturally in workflow |
| "replay attack", "deletion attack" | described using UL concepts | |
| monotonicity | part of BADA definition | |

**Score: fluent** (with Z1 proposed terms). The BADA workflow composes cleanly with Anchored/Signed Update terminology.

---

# Z2 Coverage Summary

| Cluster | Sections | Fluent | Awkward | Gap |
|---------|----------|--------|---------|-----|
| Foundational Concepts | 7 | 4 | 2 | 1 |
| Infrastructure & Accountability | 3 | 2 | 0 | 1 |
| Data Structures & Messaging | 6 | 4 | 2 | 0 |
| Key Management | 5 | 3 | 1 | 1 |
| Delegation | 1 | 0 | 1 | 0 |
| Security & Recovery | 3 | 2 | 0 | 1 |
| Discovery | 2 | 2 | 0 | 0 |
| **Total** | **27** | **17 (63%)** | **6 (22%)** | **4 (15%)** |

(4 administrative sections skipped, 4 brief definitional sections folded into clusters)

## New Findings Summary

| ID | Score | What's Missing | Domain |
|----|-------|---------------|--------|
| KERI-Z2-001 | awkward | **Promulgation/Confirmation infrastructure** — the two-sided model (controller's witnesses vs validator's watchers) | identity or accountability |
| KERI-Z2-002 | awkward | **Forward-Blinded Commitment** — the essential mechanism of pre-rotation (committing to unrevealed keys) | identity/key-commitment |
| KERI-Z2-003 | gap | **Autonomic Namespace** — identifier-rooted namespace (low priority, may be out of RDOD scope) | identity |
| KERI-Z2-004 | gap | **Watcher role hierarchy** — Juror, Jury, Judge roles for duplicity evaluation | watcher-service or integrity |
| KERI-Z2-005 | awkward | **Commitment Persistence** — property that seals survive key rotation, enabling unbounded-term issuances | identity/anchoring |
| KERI-Z2-006 | awkward | **Individual routed message types** — Query, Reply, Prod, Bare not individually named | keri-messaging |
| KERI-Z2-007 | awkward | **Key Revelation** (unblinding) and **Reserve Keys** — concepts within the rotation process | identity/key-commitment |
| KERI-Z2-008 | gap | **Rotation variant taxonomy** — Partial, Augmented, Reserve, Custodial, SQAR rotation patterns | identity/establishment or delegation/recovery |
| KERI-Z2-009 | awkward | **Delegating Event vs Delegated Event** — the two sides of a cooperative delegation pair | delegation |
| KERI-Z2-010 | gap | **Superseding Recovery vocabulary** — Recovery, Reconciliation, trunk/branch, Superseding Rules | integrity/recovery |

## Z1 Findings Validated at Z2

| Z1 Finding | Z2 Validation | Status |
|------------|---------------|--------|
| KERI-Z0-001 End-Verifiability | §5.3 directly defines this concept — term composes perfectly | **Strongly confirmed** |
| KERI-Z1-001 SCID | §5.4-5.5 workflow composes naturally | **Confirmed** |
| KERI-Z1-002 Controller | Used in every cluster — every workflow needs to name the actor | **Strongly confirmed** |
| KERI-Z1-003 Control Authority Binding | §5.9 narrative composes naturally with the term | **Confirmed** |
| KERI-Z1-004 Key Event + Interaction Event | §6.3 message listing, §7.2 non-establishment signing — both need the terms | **Confirmed** |
| KERI-Z1-005 Key Event Message | §6.3 event/message distinction is clear in process narratives | **Confirmed** |
| KERI-Z1-006 Seal collapse | §6.2 seal description works with "commitment" language, but Z2 reveals "commitment persistence" as a new gap | **Confirmed + extended** |
| KERI-Z1-007 Verifier/Validator | §A.2 validation workflow composes into a clear two-stage process | **Strongly confirmed** |
| KERI-Z1-008 Anchored/Signed Update | §A.8 BADA workflow composes cleanly | **Confirmed** |

## Key Observation

Z2 reveals a **pattern**: the UL covers the STEADY STATE well but not the RECOVERY paths. Normal operation (inception, rotation, receipting, OOBI resolution, BADA updates) is well-described. But when things go wrong (superseding recovery, delegation compromise recovery, reserve rotation, reconciliation), the vocabulary drops out. This makes sense — the recovery sections in the spec are the most complex and were likely developed last — but it's the highest-value area for UL investment because recovery is where adopter understanding matters most.
