# Feature Request: Allow repository fields on port entries in ports.yaml schema

## Summary

The ports.yaml schema needs to allow `invariants`, `escrow_types`, `types`, and `description` fields on port entries to support the DDD Repository interface pattern.

## Problem

After refactoring all storage outbound ports to proper DDD Repository interfaces, 22 schema warnings fire for fields that carry essential repository contract information:

- `invariants:` — persistence guarantees (append-only, idempotent, ordered, immutable-once-written)
- `escrow_types:` — enum of escrow categories for generic escrow repositories
- `types:` — named types used in the repository contract (e.g., EscrowedEvent, EscrowType)
- `description:` — domain-purpose explanation for the repository

These fields are critical for AI-implementability — a Repository interface without invariants is just a method list. The invariants tell the implementer what guarantees the persistence layer must provide.

## Proposed Schema Changes

### 1. `ports[].invariants` (22 warnings)

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

### 2. `ports[].escrow_types` (1 warning)

Generic escrow repositories define the set of escrow categories:

```yaml
- id: "port://credential-lifecycle/outbound/tel-escrow-repository"
  escrow_types:                        # ← should be allowed
    - "OutOfOrder"
    - "PartialWitness"
    - "MissingAnchor"
```

**Proposed:** Add `escrow_types` as optional array of strings on port entries.

### 3. `ports[].types` (1 warning)

Repository interfaces may define named types used in their contracts:

```yaml
- id: "port://identity/outbound/escrow-repository"
  types:                               # ← should be allowed
    EscrowedEvent: "{ aid: AID, sn: int, event: KeyEvent, escrowed_at: datetime }"
    EscrowType: "enum { OutOfOrder, PartiallySigned, ... }"
```

**Proposed:** Add `types` as optional map on port entries.

### 4. `ports[].description` (8 warnings)

Repository ports benefit from a description of their domain purpose:

```yaml
- id: "port://witness-service/outbound/witness-repository"
  description: "Append-only receipted event log per AID"  # ← should be allowed
```

**Proposed:** Add `description` as optional string on port entries.

## Acceptance Criteria

- [ ] `ports[].invariants` added as optional array of strings
- [ ] `ports[].escrow_types` added as optional array of strings
- [ ] `ports[].types` added as optional map
- [ ] `ports[].description` added as optional string
- [ ] All 22 schema warnings resolved
