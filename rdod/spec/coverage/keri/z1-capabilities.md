# Z1 — Capabilities: KERI Specification

Six substantive H2 sections analyzed. Three administrative sections skipped (Normative references, Terms and Definitions, Bibliography).

---

## §2 Introduction (line 32)

**Spec summary:** IP has no security layer. KERI provides a security overlay through SCIDs/AIDs with KELs. Pre-rotation solves key rotation. Two trust modalities: direct (one-to-one) and indirect (witnessed via KAWA). KERI is a candidate for universal DKMI.

### UL sentences

1. > "KERI provides an identifier system security overlay through **Self-Certifying Identifiers** as a cryptographic root-of-trust, formalized as **Autonomic Identifiers** with control provenance tracked in a **Key Event Log**."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Self-Certifying Identifier / SCID | **NOT IN UL** | Foundational concept from which AID derives |
   | AID | fluent | identity domain |
   | KEL | fluent | identity domain |
   | security overlay | not UL — high-level framing | acceptable at Z1 |
   | root-of-trust | not UL — high-level framing | acceptable at Z1 |

   **Score: gap** — SCID is the conceptual foundation of AID and is used 20+ times in the Introduction alone. → **KERI-Z1-001**

2. > "An adopter can transfer control of an **AID** through **Rotation Events** using pre-committed key digests, securing the **Key State** against compromise."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | AID | fluent | |
   | Rotation Event | fluent | identity |
   | Key State | fluent | identity |
   | pre-committed key digests | partial — identity/key-commitment subdomain exists but specific term unclear | needs Z2 check |

   **Score: fluent** — the core key management sentence works well.

3. > "In **Direct Mode**, two parties verify events through direct signature exchange. In **Indirect Mode**, **Witnesses** receipt events and achieve **KAWA** consensus, meeting the **TOAD** threshold for accountable duplicity detection."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Direct Mode | fluent | accountability/dissemination |
   | Indirect Mode | fluent | accountability/dissemination |
   | Witness | fluent | accountability |
   | KAWA | fluent | accountability |
   | TOAD | fluent | accountability |
   | "receipt events" | fluent | accountability/receipting has Receipt |

   **Score: fluent** — the accountability domain handles direct/indirect modes well.

### Section summary: 1 fluent, 1 fluent, 1 gap. Finding: KERI-Z1-001 (SCID missing).

---

## §3 Scope (line 110)

**Spec summary:** Defines KERI as decentralized key management infrastructure with strong bindings between identifier, keypairs, controller, and KEL. Cryptographic agility for pre- and post-quantum. Reduces secure attribution to key management.

### UL sentences

1. > "KERI manages the **Key State** of an **AID** — the binding between an identifier, its controlling keypairs, the **Controller** entity, and the **KEL** that records state transitions."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Key State | fluent | identity |
   | AID | fluent | identity |
   | Controller | **NOT A STANDALONE UL TERM** | Referenced in AID definition but no own entry |
   | KEL | fluent | identity |
   | "binding" / tetrad | **NOT IN UL** | Spec later formalizes as "Tetrad bindings" |

   **Score: awkward** — the four-way binding concept (the "Tetrad") is central to Scope but unnamed in the UL. Controller is used but not defined as its own term. → **KERI-Z1-002**, **KERI-Z1-003**

2. > "The protocol supports **Cryptographic Agility** for pre- and post-quantum resistance, with implementation dependencies limited to standard cryptographic libraries."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Cryptographic Agility | fluent | cesr domain |

   **Score: fluent** — the cesr UL covers this.

### Section summary: 1 awkward, 1 fluent. Findings: KERI-Z1-002 (Controller), KERI-Z1-003 (Tetrad binding).

---

## §5 KERI foundational overview (line 381)

**Spec summary:** High-level architecture. Controller application (5 functions), direct exchange, indirect exchange via witnesses/watchers, ecosystem components (agents, witnesses, watchers, mediators), security overlay, SCIDs, AIDs, pre-rotation, CESR encoding, secure bindings (tetrad), Autonomic Namespaces.

### UL sentences

1. > "The **Controller** manages an **AID** through five functions: keypair generation, keypair storage, **Key Event** generation, event signing, and event validation — all mediated through the **Event Processor**."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Controller | gap (same as KERI-Z1-002) | |
   | AID | fluent | |
   | Key Event | **NOT A GENERAL TERM** | UL has Establishment Event, Inception Event, Rotation Event — but no umbrella "Key Event" |
   | Event Processor | fluent | identity |

   **Score: gap** — "Key Event" as a general category (encompassing inception, rotation, interaction) is not a UL term. The UL has specific event types but no general term. → **KERI-Z1-004**

2. > "In **Indirect Mode**, the adopter designates **Witnesses** meeting the **TOAD** threshold who generate **Receipts** and disseminate them via **Round-robin Dissemination** or **Gossip Protocol** until **KAWA** consensus is achieved."

   **Score: fluent** — accountability domain covers this comprehensively.

3. > "KERI's security derives from **Self-Certifying Identifiers** bound to cryptographic keypairs without administrative authority, extended through pre-rotation commitments that protect against compromise."

   **Score: gap** — same SCID gap as KERI-Z1-001. Pre-rotation commitment vocabulary needs Z2/Z3 verification.

### Section summary: 1 gap, 1 fluent, 1 gap. Finding: KERI-Z1-004 (Key Event umbrella term).

---

## §6 KERI data structures and labels (line 1217)

**Spec summary:** Wire format specification. Field maps with compact labels, serialization kinds, field ordering. Message types for all key events, receipts, routed messages (query, reply, prod, bare, exchange). Seals (digest, event, registrar backer). Indexed and non-indexed signatures, endorsements.

### UL sentences

1. > "KERI data structures are represented as **KERI Field Maps** — ordered key-value mappings supporting multiple **Serialization Kinds** (JSON, CBOR, MGPK, CESR) with canonical field ordering for reproducible serialization."

   **Score: fluent** — keri-messaging and cesr domains cover this.

2. > "The **KERI Message Types** define the event vocabulary: **Inception Events**, **Rotation Events**, Interaction Events, Delegated Inception Events, **Receipts**, and **Exchange Messages** — each discriminated by a type field."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | KERI Message Types | fluent | keri-messaging |
   | Inception Event | fluent | identity |
   | Rotation Event | fluent | identity |
   | Interaction Event | **NOT IN UL** | Core non-establishment event type |
   | Delegated Inception Event | probably in delegation UL | needs verification |
   | Receipt | fluent | accountability/receipting |
   | Exchange Message | fluent | keri-messaging |

   **Score: awkward** — Interaction Event (ixn), one of only three core event types, is missing from the UL. This is the event that anchors data to the KEL. → **KERI-Z1-005**

3. > "Seals embed cryptographic commitments within events: **Digest Seals** commit to arbitrary data hashes, **Event Seals** reference specific events in other logs, and **Registrar Backer Seals** authorize credential registry operations."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | seal (as noun) | **COLLAPSES** | Per CLAUDE.md DDD philosophy, "seal" maps to adopter verbs: commit, approve, authorize |
   | Digest Seal | not in UL as-is | would be "Data Commitment" or similar |
   | Event Seal | not in UL as-is | would be "Event Reference" or "Cross-Log Authorization" |
   | Registrar Backer Seal | not in UL as-is | maps to credential-lifecycle authorization |

   **Score: collapse** — The spec's "seal" concept expands into multiple adopter-centric operations: data commitment, event cross-reference, delegation approval, credential authorization. The CLAUDE.md already identifies this pattern. The UL should have the expansion mapped. → **KERI-Z1-006**

4. > "Event authenticity is verified through **Indexed Signatures** (multi-key events with signer identification) and **Non-Indexed Signatures** (single-key or witness receipts), qualified as CESR **Primitives**."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Indexed Signature | likely in cesr/primitives (Siger) | needs Z3 check |
   | Non-Indexed Signature | likely in cesr/primitives (Cigar) | needs Z3 check |
   | Primitive | fluent | cesr |

   **Score: fluent** — CESR primitives domain should cover signature types.

### Section summary: 2 fluent, 1 awkward, 1 collapse. Findings: KERI-Z1-005 (Interaction Event), KERI-Z1-006 (Seal collapse).

---

## §7 KERI key management (line 3160)

**Spec summary:** Keypair labeling convention, pre-rotation mechanics, inception pre-rotation, rotation using pre-rotation, fractionally weighted thresholds, general pre-rotation (reserve, custodial), SQAR (Surprise Quantum Attack Recovery), cooperative delegation, security properties, attack analysis (dead-attacks, live-attacks).

### UL sentences

1. > "An adopter protects against key compromise through pre-rotation: the **Inception Event** commits to a list of next-key digests, and each **Rotation Event** reveals the committed keys while pre-committing to the next set, maintaining a continuous **Key State** chain."

   **Score: fluent** — identity and identity/key-commitment domains handle this well.

2. > "The **Signing Threshold** and **Rotation Threshold** form a **Dual Threshold** system: the signing threshold governs current event authorization, while the rotation threshold governs key replacement — supporting **Fractionally Weighted Thresholds** for fine-grained multi-sig control."

   **Score: fluent** — the identity/thresholds subdomain covers this comprehensively. This is one of the best-covered areas of the UL.

3. > "**Cooperative Delegation** allows a delegator to **approve** a delegate's inception or rotation by committing an authorization to the delegator's **KEL**, creating a verifiable delegation chain."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Cooperative Delegation | needs verification in delegation UL | |
   | approve | fluent | per DDD philosophy |
   | KEL | fluent | |
   | delegation chain | needs verification | |

   **Score: fluent** (assuming delegation UL has these terms — will verify at Z2).

4. > "Security analysis distinguishes **Dead Duplicity** (historical compromise) from **Live Duplicity** (active compromise), with different recovery mechanisms. **Reserve Rotation** provides a recovery key hierarchy, while **Surprise Quantum Attack Recovery** pre-positions quantum-resistant key commitments."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Dead Duplicity | fluent | integrity |
   | Live Duplicity | fluent | integrity |
   | Reserve Rotation | **NOT VERIFIED** | May not be in UL |
   | SQAR | **NOT VERIFIED** | May not be in delegation/recovery |

   **Score: fluent** for duplicity terms, **needs verification** for recovery mechanisms at Z2.

### Section summary: 3 fluent, 1 needs-verification. Thresholds subdomain is exceptionally strong.

---

## §A Annex A (line 4393)

**Spec summary:** Security analysis (crypto strength, information-theoretic security, post-quantum). Validation (Verifier vs Validator roles, duplicity, event types/classes, validation rules). Superseding recovery and reconciliation (First Seen Policy, recovery rules). KAWA details (witness designation, witnessing policy, immunity/availability, security proofs). Working examples. Native CESR encodings. OOBIs (types, resolution, forwarding, SPED). BADA policy (rules, OKEA, endpoint authorization).

This is by far the largest H2 section. It contains what are arguably 5-6 separate Z1-level capabilities packaged as one annex.

### UL sentences

1. > "A **Verifier** establishes the **Key State** at event issuance and checks structural validity plus signature verification. A **Validator** extends this with **Witness** receipt checks and delegation validation before accepting events into the **KEL**."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Verifier | **NOT IN UL** | Fundamental role in spec §A.2.1 |
   | Validator | **NOT IN UL** | Fundamental role in spec §A.2.2 |
   | Key State | fluent | |
   | Witness | fluent | |
   | KEL | fluent | |
   | Event Processor | exists but ≠ Verifier/Validator | overlaps but different granularity |

   **Score: gap** — Verifier and Validator are two of the most important roles in the spec, with precise definitions and distinct responsibilities. The UL has Event Processor (identity) which partially overlaps with Validator, but the spec's distinction between structural verification (Verifier) and semantic validation (Validator) is lost. → **KERI-Z1-007**

2. > "When **Duplicity** is detected, the **Duplicitous Event Log** records forensic evidence. **Live Duplicity** requires active recovery; **Dead Duplicity** is recorded but does not compromise current **Key State**."

   **Score: fluent** — integrity domain covers duplicity types and evidence well.

3. > "**Superseding Recovery** allows a validator to accept a new event that supersedes a previously accepted event at the same sequence number, governed by strict **Superseding Rules** that prevent rollback attacks."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | Superseding Recovery | **NOT VERIFIED** | May be in integrity/recovery |
   | Superseding Rules | **NOT VERIFIED** | |
   | Validator | gap (same KERI-Z1-007) | |

   **Score: awkward** — the recovery mechanism vocabulary needs verification. The concept is covered by integrity/recovery subdomain but naming unclear.

4. > "**OOBI Resolution** bootstraps trust by associating a URL with an **AID**, enabling **Percolated Discovery** through web infrastructure. All discovered information MUST be verified in-band — OOBIs themselves carry no trust."

   **Score: fluent** — discovery domain handles this well.

5. > "The **BADA** policy governs data acceptance: **KEL-anchored** updates have highest trust, **Endpoint Authorization** tracks authorized service endpoints per **Role**, and the **First-Seen Rule** provides monotonic data acceptance."

   | Term | UL status | Notes |
   |------|-----------|-------|
   | BADA | fluent | discovery |
   | Endpoint Authorization | fluent | discovery |
   | Role | fluent | discovery |
   | First-Seen Rule | fluent | accountability/consensus |
   | KEL-anchored (as update category) | **NOT A NAMED TERM** | BADA distinguishes anchored vs signed-only updates |

   **Score: awkward** — BADA is in the UL but its two update categories (KEL-anchored vs signed-not-anchored) aren't named. → **KERI-Z1-008**

### Section summary: 1 gap, 2 fluent, 2 awkward. The Annex should arguably be split into multiple Z1 capabilities. Findings: KERI-Z1-007 (Verifier/Validator), KERI-Z1-008 (BADA update categories).

---

# Z1 Coverage Summary

| Section | Sentences | Fluent | Awkward | Gap | Collapse | Discovery |
|---------|-----------|--------|---------|-----|----------|-----------|
| §2 Introduction | 3 | 2 | 0 | 1 | 0 | 0 |
| §3 Scope | 2 | 1 | 1 | 0 | 0 | 0 |
| §5 Foundational overview | 3 | 1 | 0 | 2 | 0 | 0 |
| §6 Data structures | 4 | 2 | 1 | 0 | 1 | 0 |
| §7 Key management | 4 | 3 | 0 | 0 | 0 | 0 |
| §A Annex A | 5 | 2 | 2 | 1 | 0 | 0 |
| **Total** | **21** | **11 (52%)** | **4 (19%)** | **4 (19%)** | **1 (5%)** | **0** |

**Observations:**
- **Best covered:** Key management (§7), especially thresholds. Accountability (witness/KAWA). Discovery (OOBI/BADA).
- **Worst covered:** The spec's fundamental concepts — SCID, Controller, Verifier/Validator — which appear in the Introduction and Annex A.
- **Ironic gap:** The UL covers the MECHANISM of KERI well but not the VALUE PROPOSITION or the ACTOR ROLES. You can describe what happens but not who does it or why it matters.

**Findings generated:** 8 (see findings.yaml)
