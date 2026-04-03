# Z3 — Rules: KERI Specification

104 H4 sections. Analyzed ~30 key rule-bearing sections; remainder are examples, field tables, or mechanical details covered by routed types. Focused on: resolving 3 deferred routing items, testing UL+types composition at invariant level, and finding Z3-specific gaps.

**Convention:** **Bold** = existing UL. *Italic* = Z1/Z2 proposed UL terms. `Monospace` = routed types. ~struck~ = concepts with no coverage.

---

## Deferred Item Resolution

### DEFERRED-1: BADA Update Categories (was KERI-Z1-008)

**Sections:** §A.8.2 BADA Rules (6697), §A.8.3 KEL Anchored Updates (6721), §A.8.4 Signed Not Anchored Updates (6740)

The spec defines two distinct rule sets with different acceptance logic:

> **`AnchoredUpdate` rule:** Confirm update is anchored in AID's KEL. WHEN anchored AND no prior → accept. WHEN anchored AND prior exists → accept if the anchoring event's `sn` is later than the prior's anchoring event.

> **`SignedUpdate` rule:** Confirm signature verifies against indicated key state. WHEN verified AND no prior → accept. WHEN verified AND prior exists → accept if the update's key state appears later in KEL, OR if same key state AND later datetime.

These are clearly distinct mechanisms with different trust semantics. But they're RULES, not adopter concepts.

**Routing decision:** `verification` — these belong in `discovery/verification.yaml` as formal acceptance rules. The UL term **BADA** is sufficient as the umbrella. The two rule sets are constraints under BADA, not separate adopter concepts. User was right that these felt "too CRUD-like."

**Finding:** No new UL term needed. Route `AnchoredUpdateAcceptance` and `SignedUpdateAcceptance` to `discovery/verification.yaml`.

---

### DEFERRED-2: Routed Message Types (was KERI-Z2-006)

**Sections:** §6.5.1 Routed Services (2417), §6.5.2 Routing Security (2446)

The spec reveals something important at Z3: routed messages divide into **two security classes**, not just six individual types:

| Class | Types | Security Property | Purpose |
|-------|-------|-------------------|---------|
| **Public-data class** | Query (`qry`), Reply (`rpy`), Exchange (`exn`) | Public to KEL, not sealed-confidential | Asking for info, getting answers, negotiating exchanges |
| **Sealed-confidential class** | Prod (`pro`), Bare (`bar`) | Hidden data sealed to KEL, disclosed selectively | Prompting disclosure, delivering sealed-confidential data |

The security segregation is the REASON for having two classes — a pre-router at the stream parser can separate them before any routing logic, preventing sensitive data from leaking through public-data routers.

**Routing decision:** The two CLASSES are types in `keri-messaging/types.yaml`. The individual message purposes deserve adopter-facing names:

| Spec Type | Adopter Purpose | Proposed Name |
|-----------|-----------------|---------------|
| `qry` | Ask for information about an AID or its endpoints | **Query** (spec term fine) |
| `rpy` | Respond with authenticated information | **Reply** (spec term fine) |
| `exn` | Negotiate a multi-step exchange transaction | **Exchange** (already in UL) |
| `pro` | Prompt a peer to disclose sealed-confidential data | **Disclosure Prompt** |
| `bar` | Deliver sealed-confidential data directly | **Sealed Disclosure** |

**Finding: KERI-Z3-001** — `pro` and `bar` need adopter-facing names. "Prod" and "Bare" are mechanism names that don't communicate purpose. "Disclosure Prompt" and "Sealed Disclosure" describe what the adopter is doing. → Route to `keri-messaging/ubiquitous-language.yaml`.

---

### DEFERRED-3: Promulgation vs Confirmation Infrastructure (was KERI-Z2-001)

**Sections:** §A.2.3.1 Validator Roles (4658), §A.2.4 Validation Rules (4721)

At Z3, the spec reveals the distinction is actually about **event locality** — local (protected, trustable source) vs remote (unprotected, untrustable source). The validation rules differ by locality:

- **Local event to controller:** Can sign and accept into KEL, propagate to witnesses
- **Remote event to controller:** SHOULD NOT sign or accept
- **Local event to witness:** Verify signatures, then sign (receipt), store, acknowledge
- **Remote event to witness:** SHOULD NOT sign or accept
- **Local delegated event to delegatee:** Can sign, propagate to witnesses and delegator
- **Remote delegated event to delegatee:** SHOULD NOT sign or accept

The "promulgation" vs "confirmation" split is really about WHERE events are trusted (local device vs remote network). Witness pool and watcher pool capture this adequately at the UL level.

**Routing decision:** No new UL terms needed. "Witness Pool" and "Watcher Pool" are sufficient. The local/remote distinction is a `verification` rule, not a UL concept. Route `EventLocality` to `identity/verification.yaml`.

**Finding: KERI-Z3-002** — **Event Locality** (local vs remote) is a verification concept. Not a UL term — but it governs which validation rules apply. → Route to `identity/verification.yaml` as a verification rule context.

---

## Validation Rules Test (§A.2.4)

This is the ultimate Z3 test — can the formal validation rules be stated using UL terms + routed types?

### Rule 1: Controller validates own local event

> "Given a local *Key Event*, the event's *Controller* can sign and accept that event into its copy of the **KEL**. The *Controller* SHOULD then propagate that event with attached signatures to the event's **Witnesses** for receipting."

**Score: fluent** — Controller, Key Event, KEL, Witness all compose.

### Rule 2: Witness validates local event

> "Given a local *Key Event*, the event's **Witness** MUST first *verify* the event's *Controller* signatures before it can sign (**Receipt**) and accept that event into its **KERL**. The **Witness** then SHOULD create a **Receipt** and propagate it."

**Score: fluent** — Witness, Verifier (as verb), Receipt, KERL all compose.

### Rule 3: Delegatee validates local delegated event

> "Given a local `DelegatedEvent`, the event's *Delegatee* can sign and accept into its **KEL**. The *Delegatee* SHOULD propagate to **Witnesses** for receipting AND to the *Delegator* for approval via a `DelegatingEvent` seal."

| Term | Status |
|------|--------|
| DelegatedEvent | routed type (Z2-009b) |
| Delegatee | likely in delegation UL |
| DelegatingEvent | routed type (Z2-009a) |
| Delegator | likely in delegation UL |
| approval | fluent (DDD verb) |

**Score: fluent** — routed types compose into the rule statement. The "approval via seal" pattern works.

### Rule 4: Delegator validates local delegated event

> "Given a local `DelegatedEvent`, the *Delegator* MUST first *verify* the *Delegatee's* signatures and **Witness** signatures (if witnessed) before accepting. The *Delegator* can then **approve** by committing the event's seal to the *Delegator's* own **KEL**."

**Score: fluent** — "approve by committing a seal" is exactly the DDD verb pattern.

### Rule 5: General validator validates any event

> "Given a local or remote *Key Event*, a *Validator* MUST first *verify* the *Controller* signatures, **Witness** signatures (if witnessed), and *Delegator* seal (if delegated) before accepting into its copy of the **KEL**."

**Score: fluent** — all terms compose into a single clear rule statement.

### Rule 6: Receipt validation

> "Given a local or remote **Receipt**, any *Validator* MUST first *verify* the **Witness** signatures or *Delegator* seals attached, then attach those signatures to its copy of the event."

**Score: fluent**

### Validation Rules Summary

All 6 formal validation rules can be stated fluently using 10 UL terms + routed types. **This is the strongest validation of the routing so far.** The types (DelegatedEvent, DelegatingEvent) compose into rules exactly as needed, and the UL terms (Controller, Verifier, Validator, Witness, Receipt, KEL) carry the narrative.

---

## Event Type Taxonomy Test (§A.2.3)

> "There are five types of *Key Events*: **Inception Event** (`icp`), **Rotation Event** (`rot`), `InteractionEvent` (`ixn`), `DelegatedInceptionEvent` (`dip`), and `DelegatedRotationEvent` (`drt`)."

> "Two classes: **Establishment Events** (inception, rotation, delegated inception, delegated rotation) and `Non-Establishment Events` (interaction). One sub-class: `DelegatedEstablishment` (delegated inception, delegated rotation)."

| Term | Status | Route |
|------|--------|-------|
| Key Event | Z1-proposed UL | |
| Inception Event, Rotation Event | existing UL | |
| InteractionEvent | routed type | identity/types.yaml |
| DelegatedInceptionEvent | **NEW** — not yet routed | delegation/types.yaml |
| DelegatedRotationEvent | **NEW** — not yet routed | delegation/types.yaml |
| Establishment Event | existing UL | |
| Non-Establishment Event | synonym for InteractionEvent | |
| DelegatedEstablishment | **NEW** — sub-class | delegation/types.yaml |

**Finding: KERI-Z3-003** — Delegated event type names (`DelegatedInceptionEvent`, `DelegatedRotationEvent`, `DelegatedEstablishment` sub-class) need explicit type definitions. → Route to `delegation/types.yaml`.

---

## Validator Roles Test (§A.2.3.1)

> "The possible roles that a *Validator* may play for any given event are: *Controller*, **Witness**, *Delegator*, *Delegatee*, or none of the above."

> "Validators that act in different roles are called ~parties~ to the event."

| Term | Status |
|------|--------|
| Controller, Validator | Z1-proposed UL |
| Witness | existing UL |
| Delegator, Delegatee | likely in delegation UL |
| "parties to the event" | **NOT IN UL** |

**Score: awkward** — All the role names exist (or are proposed), but the umbrella concept of "parties to the event" — meaning the set of validators playing different roles for a specific event — isn't named.

**Finding: KERI-Z3-004** — "Event Party" or "Event Participant" — the concept that a validator plays a specific role for a specific event. Low priority — may just be education. → Route to `identity/types.yaml` or education.

---

## Attack Analysis Test (§7.7.1-7.7.3)

### Dead-Attacks

> "A **Dead Duplicity** attack on a given **Establishment Event** occurs after the **Key State** for that event has become stale because a later **Establishment Event** has rotated the keys. A `NonEstablishmentDeadAttack` compromises stale signing keys to forge a stale `InteractionEvent`. An `EstablishmentDeadAttack` compromises stale pre-rotated keys to forge a stale **Rotation Event**."

> "Protection: the *Controller* MUST propagate the event widely enough that the attacker cannot ~eclipse~ all components the *Validator* may consult. The **First-Seen Rule** means any *Validator* who has already seen the original event will reject the forged one."

| Term | Status |
|------|--------|
| Dead Duplicity | existing UL (integrity) |
| Establishment Event, Key State, Rotation Event | existing UL |
| InteractionEvent | routed type |
| NonEstablishmentDeadAttack, EstablishmentDeadAttack | **NEW** — attack subtypes |
| First-Seen Rule | existing UL (accountability/consensus) |
| eclipse attack | **NOT IN UL** — delivery mechanism for attacks |
| Controller, Validator | Z1-proposed UL |

**Score: fluent for the narrative, gap for attack subtypes** — The attack narrative composes well. But the specific attack subtypes (Non-establishment Dead, Establishment Dead, Non-establishment Live, Establishment Live, Delegated Live) are a taxonomy that's missing.

**Finding: KERI-Z3-005** — Attack type taxonomy. Five attack types need definitions. These are `types` not UL terms (the adopter doesn't say "I'm experiencing an establishment dead-attack" — they say "my identity was compromised," i.e., *Identity Recovery*). → Route to `integrity/types.yaml`.

---

## Witnessing Policy Test (§A.5.3)

> "The **Witness** verifies signatures, content, and consistency of each *Key Event*. When verified AND **First-Seen**, the **Witness** signs the event to create a **Receipt**, stores it in its **KERL**, and returns it as acknowledgment. All other versions are discarded."

> "Initial dissemination uses **Round-robin Dissemination**: the *Controller* exchanges with each **Witness** in turn, collecting and redistributing **Receipts**. At most 2·N acknowledged exchanges fully disseminate. **Gossip Protocol** provides lower latency at N·log(N) bandwidth."

**Score: fluent** — Every term composes. The accountability domain handles witnessing policy precisely.

---

## OKEA Test (§A.8.5)

> "A ~Principal Controller~ authorizes some component to act as a `Player` in a **Role**. Each component is the *Controller* of its own **AID**. A `Player` provides services at an **Endpoint** for its associated **Role** on behalf of the ~Principal~."

> "Authorization uses **BADA**-`RUN` policy: the ~Principal~ signs a **Role** authorization message. The `Player` signs an **Endpoint Authorization** message with a URL and scheme."

| Term | Status |
|------|--------|
| Role | existing UL (discovery) |
| Endpoint Authorization | existing UL (discovery) |
| BADA | existing UL (discovery) |
| Controller | Z1-proposed UL |
| Principal Controller | **NOT IN UL** — the AID that authorizes others to act on its behalf |
| Player | **NOT IN UL** — a component AID authorized to act in a Role |
| RUN (Read, Update, Nullify) | **NOT IN UL** — the peer-to-peer update policy replacing CRUD |

**Score: gap** — OKEA introduces a three-layer authorization model (Principal → Player → Endpoint) that the discovery UL only partially covers. **Role** and **Endpoint Authorization** exist, but **Principal** and **Player** don't.

**Finding: KERI-Z3-006** — OKEA authorization model. "Principal Controller" (the AID that authorizes), "Player" (the authorized component AID), and their relationship need definitions. These are adopter-facing — a service operator says "I'm a Player in the Witness Role for this Principal." → Route to `discovery/ubiquitous-language.yaml` (Principal, Player) and `discovery/types.yaml` (RUN policy).

---

## RUN Policy Test (§A.8.5)

> "The acronym for the traditional client-server database update policy is CRUD. The acronym for this new peer-to-peer *end-verifiable* monotonic update policy is `RUN` (Read, Update, Nullify). There is no Create (only Update of vacuous records). There is no Delete (only Nullify — marking invalid without erasing)."

This is a paradigm shift that the spec introduces for how KERI data is managed at rest. It's the operational model for ALL BADA-managed data.

**Score: gap** — `RUN` is a significant concept that underpins all BADA data management. It's not just a BADA detail — it describes the entire peer-to-peer data philosophy.

**Finding: KERI-Z3-007** — `RUN` (Read, Update, Nullify) policy. This names the data management paradigm for all KERI data-at-rest. An adopter operating KERI infrastructure needs this concept. → Route to `discovery/ubiquitous-language.yaml`. This is arguably a UL term because it names a paradigm the adopter operates within.

---

# Z3 Coverage Summary

| Cluster | Sections Tested | Fluent | Awkward | Gap |
|---------|----------------|--------|---------|-----|
| Deferred resolutions | 3 items | 2 resolved (no new UL) | 1 (message names) | 0 |
| Validation rules | 6 rules | 6 | 0 | 0 |
| Event taxonomy | 1 | 0 | 0 | 1 (delegated types) |
| Validator roles | 1 | 0 | 1 | 0 |
| Attack analysis | 2 | 1 | 0 | 1 (attack taxonomy) |
| Witnessing policy | 1 | 1 | 0 | 0 |
| OKEA | 1 | 0 | 0 | 1 (Principal/Player) |
| RUN policy | 1 | 0 | 0 | 1 (RUN paradigm) |
| **Total** | **~30 sections** | **10 (63%)** | **2 (12%)** | **4 (25%)** |

## New Z3 Findings

| ID | Score | What | Route | Domain |
|----|-------|------|-------|--------|
| Z3-001 | awkward | Prod → "Disclosure Prompt", Bare → "Sealed Disclosure" | ul_term | keri-messaging |
| Z3-002 | — | Event Locality (local vs remote) | verification | identity |
| Z3-003 | gap | Delegated event type names | types | delegation |
| Z3-004 | awkward | "Event Party" — validator-in-a-role-for-an-event | types or education | identity |
| Z3-005 | gap | Attack type taxonomy (5 types) | types | integrity |
| Z3-006 | gap | OKEA: Principal Controller + Player | ul_term | discovery |
| Z3-007 | gap | RUN (Read, Update, Nullify) paradigm | ul_term | discovery |

## Deferred Items Resolved

| Item | Resolution |
|------|-----------|
| BADA categories | → `discovery/verification.yaml` as acceptance rules. BADA UL term is sufficient. |
| Routed messages | → Prod/Bare need adopter names (Z3-001). Query/Reply/Exchange are fine as-is. |
| Infrastructure halves | → Witness Pool / Watcher Pool sufficient. Local/remote is a verification rule (Z3-002). |

## Key Observation

**The validation rules section was 100% fluent.** This is the single most important result of the Z3 pass. The 6 formal validation rules — which are the core of KERI's security model — can all be stated precisely and clearly using the proposed UL terms + routed types. This means the vocabulary is SUFFICIENT for the hardest part of the spec.

The remaining Z3 gaps are in the PERIPHERY — OKEA authorization model, RUN data paradigm, attack taxonomy, delegated event type names. Important for completeness, but the core is solid.
