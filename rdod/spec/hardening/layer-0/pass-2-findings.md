# Layer 0 Hardening — Pass 2 Findings

## Summary

Second-pass hardening of Layer 0 (15 foundation domains). The first pass (108 questions, 98 resolved) addressed major protocol and structural issues. This pass focused on implementation planning to surface remaining contradictions, missing definitions, and vocabulary gaps.

- **Planner agents:** 4 parallel clusters (CESR+Externals, Delegation, Accountability+Privacy, Services)
- **Raw questions surfaced:** 111
- **Category A fixes applied:** 13 (contradictions, missing types, vocabulary corrections)
- **Oracle-confirmed fixes:** 3 (state machine re-entry, DelegationSeal encoding note)
- **Deferred to future passes:** ~95 (design decisions, application-layer gaps, tracked open items)

## Build Order Change

The build order was stale (47 domains / 10 layers). Regenerated to **50 domains / 12 layers** with three new `externals/*` domains. Layer 0 shrank from 22 to 15 domains as several identity and integrity subdomains moved to Layer 1-2 due to new external dependencies.

## Fixes Applied

### Category A — Internal Contradictions (fixed directly)

| # | Domain | File | Fix | DDD Principle |
|---|--------|------|-----|---------------|
| 1 | delegation/lifecycle | verification.yaml | Added `pruned` to FSM states list (was in transitions/terminal but not states) | Structural completeness |
| 2 | delegation/lifecycle | errors.yaml | DelegatorNotFoundError recovery_target: `PDE` → `Delegable` (delegator KEL unavailable routes to Delegable, not PDE) | Escrow routing must match the missing resource |
| 3 | delegation/authorization | errors.yaml | MissingDelegableApprovalError recovery_target: `MDE` → `Delegable` (MDE was undefined jargon) | No undefined terms in spec |
| 4 | delegation/lifecycle | errors.yaml | Added `InvalidSignatureError` — referenced by validation constraint C1 but not defined | Every error reference must have a definition |
| 5 | delegation/lifecycle | errors.yaml | Added `InvalidDelegatorReferenceError` — referenced by C2 but not defined | Every error reference must have a definition |
| 6 | delegation/lifecycle | types.yaml | Added `pending_delegator` variant to `DelegationWriteOutcome` for Delegable escrow state | Type must cover all possible outcomes |
| 7 | delegation/lifecycle | verification.yaml | Fixed postcondition `result.escrow_type` → `result.variant` referencing actual type discriminator | Postconditions must reference real type structure |
| 8 | delegation/lifecycle | ports.yaml | Added new error types to approve port's error list | Error-port mirror consistency |
| 9 | cloud-agent-service/processing | types.yaml | DeckName enum: `witners` → `witnesses` (typo) | Spelling |
| 10 | signify-client/key-management | errors.yaml | PasscodeExpiredError: `recovery: abort` → `retry` (user can re-enter passcode; was contradicting `severity: recoverable`) | Recovery strategy must match severity |
| 11 | privacy/disclosure | verification.yaml | Removed `selective` from mode-definitions postcondition result set (selective is an orthogonal property, not a mode) | FSM states and type variants must align |

### Oracle-Confirmed Fixes

| # | Domain | Fix | Oracle Source |
|---|--------|-----|--------------|
| 12 | delegation/lifecycle | State machine: escrow re-entry goes to `received` (full re-validation), not `di-verified` (skip) | Spec + keripy: "process event as if it came in over the wire" |
| 13 | delegation/authorization | DelegationSeal.s field description: clarified hex string wire format with integer domain semantics | Spec: "lowercase hexadecimal text with no leading zeros" |

## Key Oracle Findings (not requiring Layer 0 changes)

1. **Weighted threshold satisfaction:** AND logic across all clauses. Keys appear in ALL clauses with different weight vectors. (Applies to identity/thresholds — Layer 1)
2. **Seqner range:** u128 via code `0A`, NOT u16 via code M. (Applies to cesr/primitives UL, not types.yaml)
3. **EndpointRole:** Extensible with normative core set. (Applies to signify-client/resources)
4. **Saidify dummy:** `#` is normative, chosen because it's not a valid Base64 character.
5. **Escrow timeouts:** Implementation-configurable, not protocol-normative. Keripy defaults: OOE=1200s, PSE/PWE=3600s.
6. **PDE vs Delegable:** Validator-side (can't verify seal) vs delegator-side (needs to approve). Party-role-based distinction.
7. **Group keeper nesting:** No depth limit in keripy. Circular membership prevented by temporal ordering.
8. **Extern keeper:** Port contract: incept(), rotate(), sign(), params(). Module loading is adapter concern.

## Deferred Items

Items not addressed in this pass (tracked for future hardening):

- **DeckName → WorkQueueName rename** (9 files affected, cross-cutting vocabulary change)
- **Overloaded ports** in cloud-agent-service and signify-client (single port handling multiple operations)
- **Missing errors.yaml** for externals domains (cryptographic-primitives, persistence, transport)
- **Repository ports** underspecified (need explicit CRUD operations)
- **Missing integration scenarios** for privacy/aggregation and privacy/disclosure
- **Untyped map fields** in services cluster (BootRequest.salty/randy, WorkItem.payload, etc.)
- **UL "Gossip Protocol" vs type "Broadcast"** naming inconsistency in accountability/dissemination
