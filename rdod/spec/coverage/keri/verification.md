# Phase 3: Bottom-Up Verification

Re-reading Z0-Z1 sentences with the complete vocabulary from Z0-Z4.

**Test:** Do the 15 UL terms + 24 types + 4 verification rules compose back UP into fluent high-level sentences? Or did lower-level refinements break the high-level narrative?

---

## Z0 — Mission (re-read)

**Original attempt (scored awkward):**
> "KERI enables an adopter to establish and rotate cryptographic control over Autonomic Identifiers through an append-only Key Event Log, providing end-verifiable secure attribution without reliance on trusted third parties."

**Re-stated with full vocabulary:**
> "KERI enables a **Controller** to establish and rotate cryptographic control over **AIDs** through an append-only **KEL** of **Key Events**, providing **End-Verifiability** — any **Verifier** can independently confirm the **Control Authority Binding** without relying on any intermediary. When compromise occurs, **Identity Recovery** mechanisms restore control."

**Verdict: PASS — now fluent.** Every term is either existing UL or a confirmed proposed term. The sentence gained two things from lower levels: "Control Authority Binding" (names the WHY) and "Identity Recovery" (names the safety net). Both make the mission statement more complete, not more complex.

---

## Z1 — Section by section re-read

### §2 Introduction

**Re-stated:**
> "KERI provides an identifier security overlay through **Self-Certifying Identifiers** as a cryptographic root-of-trust, formalized as **AIDs** with control provenance tracked in a **KEL**. A **Controller** can transfer control through **Rotation Events** using pre-rotation. Trust operates in two modes: **Direct Mode** (peer-to-peer signature exchange) and **Indirect Mode** (**Witness**-backed **KELs** with **KAWA** consensus meeting the **TOAD** threshold)."

**Verdict: PASS.** SCID, Controller, and the accountability terms compose cleanly. No new Z2-Z4 terms leaked upward to complicate this.

### §3 Scope

**Re-stated:**
> "KERI specifies how **Key State** is established, rotated, and verified for **AIDs** — maintaining the **Control Authority Binding** between identifier, keypairs, **Controller**, and **KEL**. The protocol supports **Cryptographic Agility** for pre- and post-quantum resistance."

**Verdict: PASS.** "Control Authority Binding" replaces the awkward "binding between four things" phrasing. Cleaner than the original.

### §5 KERI foundational overview

**Re-stated:**
> "The **Controller** manages an **AID** through five functions: keypair generation, keypair storage, **Key Event** generation, event signing, and **Validation**. In **Indirect Mode**, **Witnesses** form a **Witness Pool** providing **Promulgation** for the **Controller's** events, while the **Validator** employs a **Watcher Pool** for independent **Confirmation** and **Duplicity** detection. The ecosystem includes **Jurors**, **Juries**, and **Judges** for structured duplicity evaluation."

**Verdict: PASS.** Controller and Key Event (Z1 proposed) do the heavy lifting. The watcher roles (Z2-004, spec terms) compose at Z1 without adding complexity.

**Note:** "Promulgation" and "Confirmation" appear here naturally even though we decided NOT to make them formal UL terms (witness pool / watcher pool sufficed). They work as descriptive verbs without needing formal status.

### §6 KERI data structures and labels

**Re-stated:**
> "KERI data structures are **KERI Field Maps** supporting four **Serialization Kinds** with canonical ordering. The **KERI Message Types** include **Key Events** (**Inception**, **Rotation**, `InteractionEvent`, `DelegatedInception`, `DelegatedRotation`), **Receipts**, and routed messages (**Query**, **Reply**, **Exchange**, **Disclosure Prompt**, **Sealed Disclosure**). Events may include seals — cryptographic commitments that bind external data to the **Key State** at that **KEL** location."

**Verdict: PASS.** The routed message names from Z3-001 (Disclosure Prompt, Sealed Disclosure) compose at Z1 without confusion. The seal description uses "commitment" naturally.

### §7 KERI key management

**Re-stated:**
> "A **Controller** protects against compromise through pre-rotation: each **Establishment Event** commits to next-key digests via `ForwardBlindedCommitments`, and each **Rotation Event** reveals committed keys (`KeyRevelation`) while creating new commitments. The **Dual Threshold** system separates **Signing Threshold** (current authorization) from **Rotation Threshold** (future recovery). Advanced patterns include `PartialRotation`, `ReserveRotation`, `CustodialRotation`, and `SQAR`. **Cooperative Delegation** enables hierarchical control through paired `DelegatingEvents` and `DelegatedEvents`."

**Verdict: PASS.** Z2 types (ForwardBlindedCommitment, PartialRotation, etc.) compose at Z1 cleanly — they're used as qualified nouns, not as things the adopter needs to define. The UL terms (Dual Threshold, Signing Threshold, etc.) carry the narrative.

### §A Annex A

**Re-stated:**
> "A **Verifier** checks event structure and signatures against **Key State**. A **Validator** extends this with **TOAD** sufficiency and delegation checks before accepting into the **KEL**. **Duplicity** is recorded in the **DEL**. **Identity Recovery** enables a **Controller** to recover from compromise through `SupersedingRecovery` — replacing accepted events with legitimate **Rotation Events**, forking the **KEL** into a `Trunk` and `DisputedBranch`. **OOBI Resolution** bootstraps discovery via **Percolated Discovery**. The **BADA** policy with **RUN** semantics governs data acceptance. The **OKEA** model authorizes **Players** to act in **Roles** for a **Principal Controller**."

**Verdict: PASS.** This is the biggest improvement. The original Z1 attempt had 2 gaps and 2 awkward scores. Now it's fluent — Identity Recovery, Verifier/Validator, Principal/Player, and RUN all compose into a coherent high-level narrative.

---

## Cross-Level Composition Check

| Term introduced at | Used fluently at Z0? | Used fluently at Z1? | Leaks complexity upward? |
|-------------------|---------------------|---------------------|------------------------|
| Z1: Controller | ✓ | ✓ | No |
| Z1: End-Verifiability | ✓ | ✓ | No |
| Z1: SCID | — | ✓ | No |
| Z1: Key Event | ✓ | ✓ | No |
| Z1: Verifier/Validator | ✓ | ✓ | No |
| Z2: Identity Recovery | ✓ | ✓ | No — simplifies |
| Z2: Delegation event pair | — | ✓ | No |
| Z3: Disclosure Prompt/Sealed Disclosure | — | ✓ | No |
| Z3: Principal/Player | — | ✓ | No |
| Z3: RUN | — | ✓ | No |
| Z4: SequenceNumber | — | — | Not used at Z0-Z1 (correct) |
| Z4: PriorEventDigest | — | — | Not used at Z0-Z1 (correct) |

**All clear.** No lower-level terms leak complexity upward. The Z4 types (SequenceNumber, PriorEventDigest, etc.) correctly stay at Z4 — they don't appear in Z0-Z1 sentences. The Z2-Z3 UL terms (Identity Recovery, Principal/Player, RUN) compose at Z1 without making it more complex.

---

## Verdict

**Phase 3: PASS.** The full vocabulary composes both top-down and bottom-up. High-level sentences got BETTER (more precise, more complete) without getting more complex. The routing was correct — types stay at their level, UL terms compose across levels.
