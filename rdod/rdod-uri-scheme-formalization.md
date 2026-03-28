# Feature Request: Formalize URI scheme grammar in RDOD toolkit

## Summary

The 8 URI reference schemes (`domain://`, `kernel://`, `port://`, `types://`, `errors://`, `verification://`, `protocols://`, `external://`) are fundamental to how RDOD specs cross-reference. Their grammar and resolution rules should be part of the toolkit, not defined per-spec in conventions.yaml.

## Problem

Currently each spec must define its own URI scheme documentation (we added it to conventions.yaml for the KERI spec). But these schemes are universal — every RDOD spec uses the same grammar. Having them in per-spec conventions means:
- Each new spec must rediscover and re-document the schemes
- The linter validates against ad-hoc patterns instead of a formal grammar
- No single source of truth for how references work

## Proposed Location

Add to the RDOD toolkit's `references/templates.md` (or a new `references/uri-schemes.md`):

```yaml
uri_schemes:
  - scheme: "domain://"
    grammar: "domain://{domain_id}"
    resolves_to: "{domain_id}/domain.yaml"

  - scheme: "kernel://"
    grammar: "kernel://{domain_id}"
    resolves_to: "{domain_id}/domain.yaml (kernel adoption)"

  - scheme: "port://"
    grammar: "port://{domain_id}/{direction}/{port_name}"
    resolves_to: "{domain_id}/ports.yaml -> ports[id == full_uri]"

  - scheme: "types://"
    grammar: "types://{domain_id}#{type_name}"
    resolves_to: "{domain_id}/types.yaml -> types[name == {type_name}]"

  - scheme: "errors://"
    grammar: "errors://{domain_id}#{error_name}"
    resolves_to: "{domain_id}/errors.yaml -> errors[name == {error_name}]"

  - scheme: "verification://"
    grammar: "verification://{domain_id}#{term_or_constraint}"
    resolves_to: "{domain_id}/verification.yaml"

  - scheme: "protocols://"
    grammar: "protocols://{domain_id}#{protocol_name}"
    resolves_to: "{domain_id}/protocols.yaml -> protocols[name == {protocol_name}]"

  - scheme: "external://"
    grammar: "external://{external_name}"
    resolves_to: "Abstract — no file. Documented in spec's conventions.yaml"
```

## Linter Integration

### Parsing algorithm

For any string matching `{scheme}://{rest}`:

1. Split on `://` → `(scheme, rest)`
2. If `#` present in rest, split on first `#` → `(domain_id, fragment)`, else `(domain_id, None)`
3. For `port://`, split domain_id on last two `/` segments → `(domain_path, direction, port_name)`, reconstruct full URI as the port id to match against

### Resolution algorithm per scheme

| Scheme | Step 1: Directory | Step 2: File | Step 3: Element match |
|--------|------------------|-------------|----------------------|
| `domain://X` | `X/` must exist | `X/domain.yaml` must exist | — (no fragment) |
| `kernel://X` | `X/` must exist | `X/domain.yaml` must exist | Check `is_kernel` or presence in another domain's `kernels:` |
| `port://X/dir/name` | `X/` must exist | `X/ports.yaml` must exist | `ports[].id == "port://X/dir/name"` must match exactly one entry |
| `types://X#Y` | `X/` must exist | `X/types.yaml` must exist | `types[].name == "Y"` must match at least one entry |
| `errors://X#Y` | `X/` must exist | `X/errors.yaml` must exist | `errors[].name == "Y"` must match at least one entry |
| `verification://X#Y` | `X/` must exist | `X/verification.yaml` must exist | `properties[].term == "Y"` OR `validation_constraints[].id == "Y"` |
| `protocols://X#Y` | `X/` must exist | `X/protocols.yaml` must exist | `protocols[].name == "Y"` must match |
| `external://X` | — (no directory) | — (no file) | Optionally check `conventions.yaml` `external_abstractions[].name == "external://X"` |

### Error levels

| Check | Level | Message |
|-------|-------|---------|
| Malformed URI (no `://`) | error | `Malformed URI: {value} — expected {scheme}://{path}` |
| Directory not found | error | `{scheme} {uri}: domain directory {domain_id}/ not found` |
| File not found | error | `{scheme} {uri}: {file} not found in {domain_id}/` |
| Element not found | warning | `{scheme} {uri}: {element_type} '{fragment}' not found in {file}` |
| Fragment missing when required | warning | `{scheme} {uri}: fragment (#name) expected but not present` |

## Acceptance Criteria

- [ ] URI scheme definitions added to RDOD toolkit reference documentation
- [ ] Linter uses formal grammar for URI parsing (not regex patterns)
- [ ] Per-spec conventions.yaml can extend with spec-specific schemes (e.g., `external://`)
- [ ] ddd-spec skill's SKILL.md references the URI scheme documentation
