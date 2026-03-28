# Refinement: scheme-consistency rule should allow kernel:// and domain:// to coexist for the same target

## Summary

The `[scheme-consistency]` rule flags domains referenced as both `kernel://X` and `domain://X` as inconsistent. But these two schemes serve different roles and are not mutually exclusive — a kernel IS a domain, and both references can be correct in different contexts.

## Problem

The current rule produces false positives for kernel domains like `cesr` and `keri-messaging`:

```
[scheme-consistency] cesr: referenced as both kernel:// (15 domains) and domain:// (18 domains)
```

But the `kernel://` and `domain://` references appear in different contexts with different semantics:

| Context | Correct scheme | Why |
|---------|---------------|-----|
| `kernels:` section in domain.yaml | `kernel://cesr` | Declaring adoption of cesr as a native kernel |
| `from:` in UL imports | `domain://cesr/primitives` | Importing a term from a domain (not declaring adoption) |
| `specializes:` on UL terms | `domain://cesr/primitives` | Specializing a parent domain's term |
| `source:` on kernel entries | `domain://cesr` | Pointing to where the kernel domain lives |
| Parent-child `refs:` within cesr tree | `domain://cesr` | Cesr's own subdomains referencing their parent |
| `domain_clients:` | `domain://cesr` | Structural relationship, not adoption |

## Proposed Refinement

The rule should only flag as inconsistent when the SAME context uses both schemes. Specifically:

### Not a problem (allow both):
- `kernel://X` in `kernels:` sections AND `domain://X` in `from:`, `specializes:`, `source:`, `refs:`, `domain_clients:` — these are different semantic contexts

### Actual inconsistency (flag):
- `kernel://X` in one domain's `kernels:` section AND `domain://X` in another domain's `kernels:` section — same context, conflicting scheme
- `kernel://X` AND `domain://X` both appearing in the same `adjacents:` section — genuine confusion about the relationship type

## Alternative: context-aware validation

Instead of checking global scheme consistency, validate that each URI scheme appears in the correct structural context:

| Scheme | Valid in | Invalid in |
|--------|---------|------------|
| `kernel://` | `kernels[].ref`, `kernels[].source` | `adjacents[].ref`, `from:`, `specializes:` |
| `domain://` | `from:`, `specializes:`, `source:`, `refs:`, `domain_clients:`, `adjacents:` | — (valid everywhere) |

This would catch real errors (using `kernel://` where `domain://` is meant) without flagging the legitimate dual-reference pattern.

## Acceptance Criteria

- [ ] `kernel://X` in `kernels:` sections does not conflict with `domain://X` in imports/specializes/refs
- [ ] Only flag when the same scheme context has conflicting references
- [ ] Or: validate that `kernel://` only appears in `kernels:` section contexts
