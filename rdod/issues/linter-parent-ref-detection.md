# Linter: detect child-references-parent type URI violations

## Summary

The linter validates that `types://`, `errors://`, and `port://` URIs resolve to real definitions, but it does not check whether a subdomain is referencing a type owned by one of its own ancestor domains. A child domain silently depending on its parent's types creates a layering violation that is invisible to the current structural checker.

## Problem

Every domain's path encodes its ancestry. `signify-client/resources` is a child of `signify-client` by path prefix alone — no graph computation required. But `validate_spec.py` does not check whether a URI's target domain is an ancestor of the domain that contains the reference.

Concrete example from the KERI spec:

```
signify-client/resources/ports.yaml   (domain: signify-client/resources)
  input: "types://signify-client#SignifyAuth"   ← child referencing parent
```

`signify-client` is a path-prefix ancestor of `signify-client/resources`. This reference means a subdomain that should be independently implementable silently depends on its parent aggregate — the exact layering guarantee the spec is meant to provide.

## Requested behavior

For every `types://`, `errors://`, and `port://` URI found in any in-scope spec file (see Scope below), resolve the target domain from the URI path. If the target domain's path is a strict prefix ancestor of the referencing domain's path, emit an error:

```
[parent-ref] signify-client/resources references types://signify-client#SignifyAuth
  — child domains must not reference types owned by ancestor domains
  → move the definition to this subdomain or a sibling, not the parent
```

**Rule in plain terms:** domain `B` must not reference `types://A#T` where `A` is a path-prefix ancestor of `B`.

### Examples

| Referencing domain | URI target | Violation? |
|---|---|---|
| `signify-client/resources` | `types://signify-client#SignifyAuth` | Yes — parent |
| `signify-client/resources` | `types://signify-client/key-management#SignifyAuth` | No — sibling |
| `accountability/dissemination` | `types://accountability#Receipt` | Yes — parent |
| `accountability/dissemination` | `types://accountability/consensus#Receipt` | No — sibling |
| `cloud-agent-service/api` | `types://signify-client#SignifyAuth` | No — unrelated tree |

## Scope

Check only files where type URIs represent structural dependencies:

- `types.yaml`
- `ports.yaml`
- `errors.yaml`
- `protocols.yaml`
- `verification.yaml`

**Exempt `ubiquitous-language.yaml` entirely.** The `specializes:` field in UL files uses `domain://parent` references to express conceptual lineage ("this term refines a concept from the parent domain") — not structural type dependencies. Child→parent `specializes:` references are valid and intentional; flagging them would produce false positives on correct specs.

**Also exempt:** `kernel://` and `external://` URI schemes — these have no domain path and are always valid.

## Suggested severity

Error — this is a structural invariant, not a style issue.

## Implementation sketch

For each in-scope spec file, extract all URIs matching `(types|errors|port)://([^#]+)#`. The captured path is the target domain. Check if it is a strict path-prefix of the current domain's path. No topological sort or graph needed — pure string prefix matching.
