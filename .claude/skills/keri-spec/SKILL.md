---
name: keri-spec
description: >
  KERI (Key Event Receipt Infrastructure) protocol specification for decentralized
  key management implementations. Activates when working on KERI event processing,
  key state management, KEL construction/validation, witness agreement (KAWA),
  delegation, pre-rotation, OOBI discovery, or BADA policy. Covers all 12 message
  types, field ordering, seal types, signature verification, superseding recovery,
  and endpoint authorization (OKEA).
---

# KERI Protocol Specification Skill

KERI is a deterministic replicated state machine over a cryptographically rooted identifier namespace. It provides blockchain-equivalent security without global ordering, using append-only Key Event Logs (KELs), pre-rotation key commitments, and witness-based agreement (KAWA).

## Architecture (7 Layers)

1. **Identifier Theory** — AIDs, SCIDs, autonomic namespaces
2. **State Machine** — KEL, key state, thresholds, rotation, delegation
3. **Message Semantics** — Events, receipts, field labels, seals, signing
4. **Encoding** — CESR native wire format (see cesr-spec + cesr-encoding ref)
5. **Validation Engine** — Acceptance rules, duplicity, recovery
6. **Availability** — Witnesses, KAWA agreement
7. **Discovery** — OOBI, BADA, OKEA endpoint management

## Message Types

**KEL events:** `icp` (inception), `rot` (rotation), `ixn` (interaction), `dip` (delegated inception), `drt` (delegated rotation). **Receipt:** `rct`. **Routed:** `qry`/`rpy` (query/reply), `pro`/`bar` (prod/bare — sealed data), `xip`/`exn` (exchange inception/exchange).

## Reference Files

- **event-model.md** — Field labels, all 12 message field orders, 7 seal types with count codes, signature attachment model, dual-index verification, config traits, delegation two-way peg
- **cesr-encoding.md** — CESR native encoding: version field (`0O`), datetime/threshold/route encoding, CESR field orders for all message types, seal count codes
- **key-state-machine.md** — Pre-rotation, fractionally weighted thresholds, general/reserve/custodial rotation, SQAR, cooperative delegation, keypair lifecycle, attack taxonomy, AID derivation
- **validation.md** — Verification vs validation, role-locality matrix, event classes, duplicity detection, first-seen policy, superseding recovery (Rules A/B/C), KAWA fault parameters and witnessing policy
- **routing-discovery.md** — OOBI variants and verification, BADA monotonic update policy, RUN (no-delete), OKEA endpoint authorization, JIT/NTK discovery

## Key Invariants

- One KEL per AID, append-only, doubly hash-chained
- "First seen, always seen, never unseen"
- Rotation requires dual threshold: current `kt` AND prior-next `nt`
- Delegation requires two-way peg: SealEvent in delegator + `di` in delegatee
- Empty `n` list at inception = non-transferable; at rotation = abandoned
- Witnesses MUST be non-transferable AIDs
- All signatures attach via CESR codes, never as top-level fields
