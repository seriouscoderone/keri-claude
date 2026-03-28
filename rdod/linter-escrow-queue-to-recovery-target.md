# Refinement: Replace domain-specific escrow_queue with generic recovery_target

## Summary

The errors.yaml schema contains an `escrow_queue` field that is KERI-specific vocabulary. The RDOD toolkit should be domain-agnostic — it shouldn't know what an "escrow queue" is.

## Problem

`escrow_queue` encodes a KERI domain concept (escrow routing) as a schema-level field:

```yaml
# Current — KERI-specific
- name: "OutOfOrderError"
  recovery: "escrow"
  escrow_queue: "OOE"   # ← RDOD schema shouldn't know about escrow queues
```

This field only makes sense for KERI's escrow pattern. A video editing DDD spec or a banking DDD spec would never use `escrow_queue`.

## Options

### Option A: Replace with generic `recovery_target` (recommended)

Rename `escrow_queue` to `recovery_target` — a generic field that says "when this recovery strategy is applied, route to this target." The value is domain-defined, not schema-defined:

```yaml
# Generic — works for any domain
- name: "OutOfOrderError"
  recovery: "escrow"
  recovery_target: "OOE"    # ← domain-specific value, generic field name
```

For a banking spec this might be:
```yaml
- name: "InsufficientFundsError"
  recovery: "retry"
  recovery_target: "PendingSettlementQueue"
```

### Option B: Remove from schema entirely

Drop the field. Let domains express routing in prose:

```yaml
- name: "OutOfOrderError"
  recovery: "escrow"
  description: "Event arrived before its predecessor — route to Out-of-Order Escrow (OOE)"
```

### Recommendation

**Option A** — `recovery_target` is useful for AI implementability (structured routing vs prose parsing) while being fully domain-agnostic. The field name describes what it IS (a target for the recovery action) not what it DOES in a specific domain (route to an escrow queue).

## Migration

In this KERI spec:
- Rename all `escrow_queue:` to `recovery_target:` in errors.yaml files
- Values stay the same (OOE, PSE, PWE, etc.) — they're domain-specific and that's fine

## Linter changes

- Rename the `[escrow-ref]` rule to `[recovery-target-ref]`
- Validate `recovery_target` values against UL terms/synonyms (same logic, generic name)
- Only require `recovery_target` when `recovery` is not `abort` or `ignore` (those have no target)

## Acceptance Criteria

- [ ] `escrow_queue` renamed to `recovery_target` in errors.yaml schema
- [ ] Linter rule renamed from `[escrow-ref]` to `[recovery-target-ref]`
- [ ] Validation logic unchanged — just the field and rule names
- [ ] Migration: existing specs rename the field in their errors.yaml files
