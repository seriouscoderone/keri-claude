# Feature Request: Validate domain.yaml externals ref against ports.yaml

## Summary

When a domain.yaml `externals:` entry has a `ref:` pointing to a port (e.g., `port://identity/outbound/event-repository`), the linter should verify that port ID exists in the referenced domain's ports.yaml.

## Problem

After renaming storage ports to Repository interfaces, 9 domain.yaml files had stale `ref:` values pointing to old port IDs. This was only caught by manual inspection. The linter already validates `port_ref` in verification.yaml contracts — the same resolution logic should apply to domain.yaml externals.

## Example

```yaml
# domain.yaml
externals:
  - name: "Witness Repository"
    ref: "port://witness-service/outbound/witness-store"  # ← stale, was renamed to witness-repository
```

The linter should flag:

```
[external-port-resolution] witness-service: external 'Witness Repository' ref
  'port://witness-service/outbound/witness-store' not found in witness-service/ports.yaml
```

## Proposed Rule

For each entry in a domain's `externals:` list:
1. Check if the `ref:` field starts with `port://`
2. If so, resolve the domain path from the port URI
3. Check that a port with that ID exists in the target domain's ports.yaml
4. If not found, emit an error

## Scope

Only validate `ref:` values that start with `port://`. Other ref patterns (e.g., `external://persistence`) are abstract and don't resolve to a specific port file.

## Acceptance Criteria

- [ ] Linter resolves `port://` refs in domain.yaml externals against ports.yaml
- [ ] Missing port produces an error with the domain, external name, and stale ref
- [ ] Non-port refs (e.g., `external://`) are skipped
- [ ] Rule runs alongside existing port-resolution checks for verification.yaml
