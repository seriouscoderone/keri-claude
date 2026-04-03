# Z0 — Mission: KERI Specification

## §1 Key Event Receipt Infrastructure (KERI)

**Spec essence:** KERI is a protocol for decentralized key management that provides end-verifiable secure attribution of data to cryptographically derived identifiers, without reliance on trusted third parties.

### UL sentence attempt

> "KERI enables an adopter to **establish** and **rotate** cryptographic control over **Autonomic Identifiers** through an append-only **Key Event Log**, providing end-verifiable secure attribution without reliance on trusted third parties."

### Term check

| Term used | UL status | Domain |
|-----------|-----------|--------|
| establish | implied by **Inception Event** | identity |
| rotate | implied by **Rotation Event** | identity |
| Autonomic Identifier / AID | **AID** | identity |
| Key Event Log / KEL | **KEL** | identity |
| end-verifiable | NOT IN UL | — |
| secure attribution | NOT IN UL | — |
| cryptographic control | implied by **Key State** | identity |

### Score: awkward

The structural nouns (AID, KEL) and the operational verbs (establish via Inception, rotate via Rotation) are fluent. But the **value proposition** — what KERI gives the adopter — has no UL terms. "End-verifiable" and "secure attribution" are the spec's core claims, repeated throughout the Introduction, and they have no domain vocabulary.

The UL can describe WHAT KERI does (create identifiers, manage keys) but not WHY it matters (end-verifiable trust, secure attribution). This is a Z0-level vocabulary gap — the mission statement itself can't be said fluently.

### Finding: KERI-Z0-001

**Problem:** The adopter-facing value proposition ("end-verifiability", "secure attribution") has no UL representation. The UL names the infrastructure but not the value it delivers.

**Proposed term:** See findings.yaml KERI-Z0-001.
