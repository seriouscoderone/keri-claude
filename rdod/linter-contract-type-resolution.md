# Feature Request: Validate type names in port contract strings against types.yaml

## Summary

Port contract strings reference type names (e.g., `ServiceEndpoint`, `KeyEvent`, `EscrowType`) inline without validation. The linter should parse type names from contracts and verify they exist in types.yaml definitions.

## Problem

When a type is renamed in types.yaml (e.g., `WitnessEndpoint` → `ServiceEndpoint`), port contracts that reference the old name silently become stale. This was caught manually but could have been missed — the linter has no way to detect it today.

The linter already validates:
- `types://` URI references in types.yaml fields (`[type-ref]` rule)
- `port://` references in verification.yaml (`[port-resolution]` rule)
- `domain://` references in imports (`[import-resolution]` rule)

But inline type names in port contract strings are unchecked.

## Example

```yaml
# ports.yaml
contract: "disseminate_event(event: KeyEvent, witnesses: [WitnessEndpoint]) -> Result"
```

If `WitnessEndpoint` was renamed to `ServiceEndpoint` in types.yaml, the linter should flag:

```
[contract-type-resolution] accountability/dissemination: port 'Event Propagation'
  contract references type 'WitnessEndpoint' — not found in any types.yaml
```

## Proposed Rule

1. Parse capitalized identifiers from port contract strings (regex: `\b[A-Z][a-zA-Z]+\b`)
2. Exclude built-in primitives: `Result`, `Iterator`, `Map`, `AID`, `SAID`, `REGID`, `KEL`, `KERL` (configurable whitelist, could reuse `.vocabulary-whitelist` or a separate `.contract-types-whitelist`)
3. For each remaining identifier, check if it exists as a `name:` in any domain's types.yaml
4. Also check UL terms — some types are defined as UL terms rather than types.yaml entries (e.g., `KeyEvent`, `KeyState`)
5. Unresolved types produce a warning (not error — contracts are semi-structured)

## Pragmatic Scope

This is a best-effort heuristic, not a type checker:
- Only checks capitalized identifiers (convention: types are PascalCase)
- Primitives (`string`, `int`, `bool`, `bytes`, `datetime`, `void`) are ignored (lowercase)
- Generic wrappers (`Result`, `Iterator`, `Map`) can be whitelisted
- Cross-domain types are checked against the union of all types.yaml files
- Warning severity — contracts are free-form strings, false positives are possible

## Acceptance Criteria

- [ ] Linter extracts PascalCase identifiers from port contract strings
- [ ] Built-in primitives and configurable whitelist excluded
- [ ] Each identifier checked against all types.yaml `name:` fields and UL `term:` fields
- [ ] Unresolved types produce a warning with port name and contract context
- [ ] Per-repo whitelist supported (e.g., `.contract-types-whitelist` or extend `.vocabulary-whitelist`)
