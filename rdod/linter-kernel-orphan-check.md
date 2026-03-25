# Bug: Orphan check doesn't recognize kernel:// references

## Summary

The `orphan-check` rule flags domains as isolated when they have no `domain_clients`, no parent, no subdomains, and no adjacents. But kernel domains are referenced via `kernel://` in other domains' `kernels:` sections — the orphan check doesn't look there.

## Reproduction

```
[orphan-check] keri-messaging: domain has no clients, no parent, no subdomains, and no adjacents — isolated
```

keri-messaging is referenced by 7 domains via `kernel://keri-messaging` in their `kernels:` sections. It is not isolated — it's a kernel adopted natively by every communicating domain.

## Fix

The orphan check should also scan `kernels:` sections across all domains for `kernel://` references matching the domain id:

```python
def check_orphans(specs, result):
    for sid, spec in specs.items():
        if spec.clients or spec.subdomains or spec.adjacents:
            continue

        # Check if any domain references this as a kernel
        is_kernel = False
        for other_sid, other_spec in specs.items():
            if other_sid == sid:
                continue
            for kernel in other_spec.data.get("kernels", []):
                ref = kernel.get("ref", "") if isinstance(kernel, dict) else str(kernel)
                if strip_prefix(ref) == sid:
                    is_kernel = True
                    break
            if is_kernel:
                break

        if not is_kernel:
            result.warn("orphan-check", sid, "domain has no clients, ...")
```

## Acceptance Criteria

- [ ] Orphan check scans `kernels:` sections for `kernel://` references
- [ ] Domains referenced as kernels are not flagged as orphans
- [ ] Truly isolated domains (no clients, no parent, no adjacents, no kernel refs) are still flagged
