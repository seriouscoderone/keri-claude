# Feature Request: Resolve port-local types and deprecate in favor of types.yaml

## Summary

Some ports define types inline via a `types:` field on the port entry itself. The `[contract-type-ref]` rule doesn't check these port-local types, and having types defined in two places (ports.yaml `types:` and types.yaml) creates ambiguity about the single source of truth.

## Problem

Port-local types like `EscrowType` and `EscrowedEvent` are defined directly on port entries:

```yaml
# identity/ports.yaml
- id: "port://identity/outbound/escrow-repository"
  contract: "escrow(escrow_type: EscrowType, ...) -> void"
  types:
    EscrowType:
      enum: [OutOfOrder, PartiallySigned, PartiallyWitnessed, ...]
    EscrowedEvent:
      fields: {escrow_type: EscrowType, aid: AID, sn: int, ...}
```

These types are:
1. Not checked by the contract-type-ref linter rule (false positive warnings)
2. Not discoverable by other domains that might need the same type
3. A second place to define types alongside the canonical types.yaml

## Proposed Changes

### Short-term: Resolve port-local types in the linter

Add port-local `types:` to the resolution chain:

```
Resolution order:
1. Port-local types: field on the same port entry
2. Domain's types.yaml
3. Domain's ubiquitous-language.yaml terms
4. Domain's errors.yaml names
5. Parent/sibling domain files
```

### Long-term: Deprecate port-local types in favor of types.yaml

Port-local types should be migrated to the domain's types.yaml:
- Types that are only used by one port still belong in types.yaml (single source of truth)
- Types used across multiple ports definitely belong in types.yaml
- Port entries should reference types.yaml types, not define their own

The linter should emit an `[info]` level message:

```
[port-local-types] identity: port 'Escrow Repository' defines types locally —
  consider moving EscrowType, EscrowedEvent to identity/types.yaml for discoverability
```

## Why single source of truth matters

An AI implementing from this spec needs to know where to find type definitions. If `EscrowType` is in ports.yaml for one domain and types.yaml for another, the AI has to search both — and might miss one. A consistent rule ("types are always in types.yaml") is simpler and more reliable.

## Acceptance Criteria

- [ ] Short-term: linter resolves port-local `types:` in contract-type-ref checks
- [ ] Long-term: linter emits info-level suggestion to move port-local types to types.yaml
- [ ] Documentation updated to recommend types.yaml as the single source of truth for type definitions
