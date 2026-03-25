# Bug: build_order.py doesn't propagate parent dependencies to child subdomains

## Summary

`build_order.py` computes build layers from explicitly declared dependencies only. Child subdomains that inherit their parent's dependencies (kernels, adjacents) appear in Layer 0 as "no dependencies" when they should be downstream of their parent's dependencies.

## Problem

In a 47-domain KERI spec, Layer 0 contains 25 domains — including `cloud-agent-service/api`, `credential-lifecycle/status`, and `accountability/receipting`. These are NOT foundation domains. They depend on cesr (encoding), identity (key state), and keri-messaging (exn), but those dependencies are declared at the parent level, not on the leaf subdomain itself.

```
cloud-agent-service/domain.yaml:
  kernels:
    - ref: "kernel://cesr"          ← parent declares cesr dependency
    - ref: "kernel://keri-messaging" ← parent declares messaging dependency

cloud-agent-service/api/domain.yaml:
  kernels:
    - ref: "kernel://cesr"          ← child also has cesr
  adjacents:
    - ref: "domain://accountability/receipting"  ← but NOT keri-messaging or identity
```

The child `api/` declares its own cesr kernel but inherits keri-messaging from the parent implicitly. The build order script doesn't see this inheritance.

## Expected Behavior

Child subdomains should inherit their parent's dependencies for build ordering purposes:

```
Layer 0: cesr/primitives, cesr/composition (true foundation — no dependencies)
Layer 1: cesr, keri-messaging (depends on cesr)
Layer 2: identity subdomains, accountability subdomains, delegation subdomains
         (depend on cesr + keri-messaging)
Layer 3: identity, accountability, delegation parents (depend on their children)
Layer 4: credential-lifecycle subdomains (depend on identity)
Layer 5: cloud-agent-service subdomains, discovery (depend on identity + credentials)
Layer 6: services, applications
```

## Proposed Fix

After loading all domain specs, propagate parent dependencies to children:

```python
def propagate_parent_deps(specs):
    """Children inherit parent's kernels and adjacents for build ordering."""
    for sid, spec in specs.items():
        # Find parent: if sid is "foo/bar", parent is "foo"
        if "/" in sid:
            parent_id = sid.rsplit("/", 1)[0]
            if parent_id in specs:
                parent = specs[parent_id]
                # Inherit parent's kernel dependencies
                for kernel in parent.kernels:
                    if kernel not in spec.kernels:
                        spec.inherited_deps.add(strip_prefix(kernel))
                # Inherit parent's adjacent dependencies (Conformist/Customer-Supplier only)
                for adj in parent.data.get("adjacents", []):
                    if isinstance(adj, dict):
                        pattern = adj.get("pattern", "").lower()
                        if pattern in ("conformist", "customer-supplier"):
                            ref = strip_prefix(adj.get("ref", ""))
                            if ref not in spec.adjacents:
                                spec.inherited_deps.add(ref)
```

Then include `inherited_deps` in the topological sort alongside explicit dependencies.

## Acceptance Criteria

- [ ] Child subdomains inherit parent kernel dependencies for layer computation
- [ ] Child subdomains inherit parent Conformist/Customer-Supplier adjacents
- [ ] Partnership adjacents are NOT propagated (they indicate same-layer, not dependency)
- [ ] Kernel domains (cesr, keri-messaging) appear in Layer 0 or 1
- [ ] Service API subdomains (cloud-agent-service/api) appear after their protocol dependencies
- [ ] Leaf subdomains of the same parent appear in the same layer (not scattered)

## Impact

The current output is usable but misleading — 25 domains in Layer 0 suggests they're all independent starting points. With propagation, Layer 0 would shrink to ~5-8 true foundation domains (cesr primitives/composition, keri-messaging), giving a much clearer implementation roadmap.
