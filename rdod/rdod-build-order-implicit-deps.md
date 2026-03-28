# Bug: Build order script adds implicit parent-child dependencies

## Summary

The `build_order.py` script places subdomains one layer before their parent, even when the subdomains have no declared dependency on the parent's other dependencies. This produces an overly conservative build order that delays buildable domains.

## Example

```
Layer 2: accountability/consensus, delegation/authorization, keri-messaging, ...
Layer 4: accountability, integrity
Layer 5: identity/anchoring, identity/establishment, identity/key-commitment, identity/state, identity/thresholds
Layer 6: identity
```

Identity subdomains declare dependencies on ONLY `kernel://cesr` and `external://cryptographic-primitives` (layers 0-1). They should be buildable at layer 2. But the script places them at layer 5 — one layer before the identity parent (layer 6) — because it implicitly assumes subdomains depend on everything the parent depends on.

The identity parent depends on accountability (layer 4), delegation (layer 3), and integrity (layer 4) via Customer-Supplier adjacents. These are dependencies of the validation PIPELINE orchestration, not the subdomain types and structures.

## Impact

An AI implementer following the build order would delay building identity event types (InceptionEvent, RotationEvent, KeyState) until AFTER building accountability's witness receipting — even though those types have zero dependency on receipting. This wastes implementation effort and creates artificial bottlenecks.

## Expected behavior

The script should compute layers from **declared dependencies only**:
- Subdomain dependencies: `kernels:`, `adjacents:` with directional patterns
- Parent dependencies: same, but parent dependencies are NOT inherited by children
- Parent-child relationship: parent layer = max(child layers) + 1

## Current behavior

Parent-child relationship: children are placed at parent_layer - 1, which pushes children down to accommodate the parent's full dependency set.

## Proposed fix

1. Compute each domain's layer independently from its declared dependencies
2. Parent layer = max(all child layers) + 1 (parent after children, not children before parent)
3. If a child has no declared dependencies, it goes to layer 0 (foundation) regardless of what the parent depends on

## Verification

After the fix, the KERI spec build order should show:
```
Layer 0: cesr/composition, cesr/primitives
Layer 1: cesr
Layer 2: identity/anchoring, identity/establishment, identity/key-commitment, identity/state, identity/thresholds, accountability/consensus, delegation/authorization, keri-messaging, ...
...
Layer N: identity (after accountability, delegation, integrity — its declared deps)
```
