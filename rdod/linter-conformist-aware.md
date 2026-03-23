# Feature Request: Linter should respect `pattern:` field on adjacent relationships

## Summary

`validate_spec.py`'s `check_mirror_consistency()` flags missing back-references for ALL adjacent relationships, but DDD defines several relationship patterns where one-way references are correct. The `pattern:` field already exists in the template schema — the linter just doesn't read it.

## Current Behavior

```
⚠ [relationships] cloud-agent-service: lists 'cesr' as adjacent, but 'cesr' does not
   list 'cloud-agent-service' in adjacents or domain_clients
```

This warning fires for every adjacent, regardless of the relationship pattern. In DDD:

- **Conformist**: Consumer conforms to upstream. Upstream does NOT know about consumers. One-way is correct.
- **Customer-Supplier**: Supplier may or may not reference customer. One-way is valid.
- **Published Language**: Consumer imports language. Publisher does NOT track consumers. One-way is correct.
- **Partnership**: Both sides collaborate. Bidirectional IS required.

Only Partnership requires bidirectional references. The other three patterns are intentionally one-way.

## Data Already Available

The `pattern:` field is already in the RDOD template schema and populated in specs:

```yaml
# cloud-agent-service/domain.yaml
adjacents:
  - ref: "domain://cesr"
    relationship: "Conformist — all events and messages encoded in CESR format"
    pattern: "Conformist"  # ← linter should use this
```

A KERI ecosystem spec (48 domains, 35 adjacent relationships) has every adjacent tagged:

| Pattern | Count | Bidirectional required? |
|---|---|---|
| Conformist | 17 | No |
| Customer-Supplier | 9 | No |
| Published Language | 5 | No |
| Partnership | 4 | Yes |

The linter currently produces 10 relationship warnings. All 10 are Conformist, Customer-Supplier, or Published Language — none are Partnership. All 10 are false positives.

## Proposed Fix

In `check_mirror_consistency()`, read the `pattern:` field and only enforce bidirectional references for `Partnership` (or when `pattern:` is absent, to preserve backward compatibility):

```python
def check_mirror_consistency(specs, result):
    for sid, spec in specs.items():
        for adj in spec.data.get("adjacents", []):
            if not isinstance(adj, dict):
                continue
            ref = strip_prefix(adj.get("ref", ""))
            pattern = adj.get("pattern", "").lower()

            # One-way patterns — skip bidirectional check
            if pattern in ("conformist", "customer-supplier",
                          "published language", "anticorruption layer"):
                continue

            # Partnership or unspecified — require bidirectional
            if ref in specs:
                other = specs[ref]
                if sid not in other.adjacents and sid not in other.clients:
                    result.warn("relationships", sid,
                        f"lists '{ref}' as adjacent, but '{ref}' does not "
                        f"list '{sid}' in adjacents or domain_clients")
```

## Also: `domain_clients` with `pattern:`

The same logic should apply to `domain_clients` entries. When `watcher-service` lists `signify-client` as a client, the linter flags that `signify-client` doesn't list `watcher-service` back. But a client relationship is inherently one-directional — the upstream domain serves clients, it doesn't need to enumerate them.

Consider skipping bidirectional checks for `domain_clients` entirely, or adding an optional `pattern:` field there too.

## Acceptance Criteria

- [ ] `check_mirror_consistency()` reads `pattern:` field from adjacent entries
- [ ] Conformist, Customer-Supplier, Published Language, Anticorruption Layer patterns skip bidirectional check
- [ ] Partnership pattern (and absent `pattern:`) still requires bidirectional references
- [ ] `domain_clients` entries skip bidirectional check (or support `pattern:` field)
- [ ] The KERI 48-domain spec produces 0 relationship warnings after this fix
- [ ] Backward compatible: specs without `pattern:` fields behave as before
