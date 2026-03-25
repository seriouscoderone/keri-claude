# Bug: Duplicate error check only flags parent/child, not sibling collisions

## Summary

`check_duplicate_errors` detects same-name errors in parent/child domain hierarchies but misses collisions between sibling domains (domains sharing the same parent).

## Problem

Three error name collisions across sibling domains went undetected:

| Error Name | Domain A | Domain B | Relationship |
|---|---|---|---|
| MissingRegistryError | credential-lifecycle/status | credential-lifecycle/verification | Siblings under credential-lifecycle |
| MissingRegistryError | credential-lifecycle/status | credential-exchange/negotiation | Cousins (different parents) |
| InvalidBootInceptionError | cloud-agent-service/api | cloud-agent-service/provisioning | Siblings under cloud-agent-service |
| AgentNotFoundError | cloud-agent-service/api | cloud-agent-service/provisioning | Siblings under cloud-agent-service |

The current check only tests `if d1.startswith(d2 + "/") or d2.startswith(d1 + "/")` — this catches parent/child (e.g., `cesr` vs `cesr/primitives`) but not siblings (e.g., `cloud-agent-service/api` vs `cloud-agent-service/provisioning`).

## Fix

Extend the check to also flag siblings — domains that share a common parent prefix:

```python
def check_duplicate_errors(specs, result):
    error_registry = {}  # {error_name: [domain_ids]}
    for sid, spec in specs.items():
        errors_data = load_yaml(str(Path(spec.dir) / "errors.yaml"))
        if not errors_data:
            continue
        for err in errors_data.get("errors", []):
            name = err.get("name", "")
            if name not in error_registry:
                error_registry[name] = []
            error_registry[name].append(sid)

    for name, domains in error_registry.items():
        if len(domains) > 1:
            for i, d1 in enumerate(domains):
                for d2 in domains[i+1:]:
                    # Parent/child check (existing)
                    is_parent_child = d1.startswith(d2 + "/") or d2.startswith(d1 + "/")

                    # Sibling check (new): share a common parent
                    parent1 = "/".join(d1.split("/")[:-1]) if "/" in d1 else ""
                    parent2 = "/".join(d2.split("/")[:-1]) if "/" in d2 else ""
                    is_sibling = parent1 and parent1 == parent2

                    if is_parent_child or is_sibling:
                        result.warn("duplicate-error", d1,
                            f"error '{name}' defined in both '{d1}' and '{d2}' "
                            f"— differentiate names or document scope distinction")
```

## Acceptance Criteria

- [ ] Sibling domains (same parent) with same-name errors are flagged
- [ ] Parent/child check still works (existing behavior preserved)
- [ ] All 4 collisions from the incident would have been caught
