# Feature Request: Allow repository fields on port entries in ports.yaml schema

## Summary

The ports.yaml schema needs to allow `invariants`, `types`, and `description` fields on port entries to support the DDD Repository interface pattern.

## Problem

After refactoring all storage outbound ports to proper DDD Repository interfaces, 22 schema warnings fire for fields that carry essential repository contract information:

- `invariants:` — persistence guarantees (append-only, idempotent, ordered, immutable-once-written)
- `types:` — named types used in the repository contract (e.g., key types, value types, enums)
- `description:` — domain-purpose explanation for the port

These fields are critical for AI-implementability — a Repository interface without invariants is just a method list. The invariants tell the implementer what guarantees the persistence layer must provide.

## Proposed Schema Changes

### 1. `ports[].invariants` (14 warnings)

Repository ports need invariants to describe persistence guarantees:

```yaml
- id: "port://identity/outbound/event-repository"
  type: outbound
  name: "Event Repository"
  contract: "append_event(...); get_event_by_sn(...); ..."
  invariants:                          # ← should be allowed
    - "Events are append-only — once written, immutable"
    - "Signatures and receipts accumulate — never overwritten"
    - "Key state cache may be overwritten (derived, not source-of-truth)"
```

**Proposed:** Add `invariants` as optional array of strings on port entries.

### 2. `ports[].types` (1 warning)

Repository interfaces may define named types used in their contracts. This is the generic mechanism for any domain-specific parameterization (enums, value objects, composite keys):

```yaml
- id: "port://identity/outbound/escrow-repository"
  types:                               # ← should be allowed
    EscrowedEvent: "{ aid: AID, sn: int, event: KeyEvent, escrowed_at: datetime }"
    EscrowType: "enum { OutOfOrder, PartiallySigned, ... }"
```

**Proposed:** Add `types` as optional map on port entries.

Note: domain-specific enums (like escrow categories) belong in `types:`, not as special schema fields. The schema should be domain-agnostic.

### 3. `ports[].description` (8 warnings)

Ports benefit from a description of their domain purpose:

```yaml
- id: "port://witness-service/outbound/witness-repository"
  description: "Append-only receipted event log per AID"  # ← should be allowed
```

**Proposed:** Add `description` as optional string on port entries.

## Migration

Any existing `escrow_types:` fields in ports should be moved into `types:` as a named enum. For example:

```yaml
# Before (domain-specific field)
escrow_types: ["OutOfOrder", "PartialWitness", "MissingAnchor"]

# After (generic types field)
types:
  EscrowType: "enum { OutOfOrder, PartialWitness, MissingAnchor }"
```

## Acceptance Criteria

- [ ] `ports[].invariants` added as optional array of strings
- [ ] `ports[].types` added as optional map
- [ ] `ports[].description` added as optional string
- [ ] All schema warnings for these fields resolved
