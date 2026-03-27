# Feature Request: Validate type names referenced in port contract strings

## Summary

When a port's `contract:` string references a type name (e.g., `ServiceEndpoint`, `EscrowType`, `KeyEvent`), the linter should verify that the type is defined somewhere reachable — in the domain's own types.yaml, in a kernel's types.yaml, or in an imported domain's types.yaml.

## Problem

Port contracts reference type names inline (e.g., `witnesses: [WitnessEndpoint]`). When a type is renamed (e.g., `WitnessEndpoint` → `ServiceEndpoint`), the contract string becomes stale but nothing catches it. This was discovered when `accountability/dissemination/ports.yaml` still referenced `WitnessEndpoint` after we renamed it to `ServiceEndpoint` in `discovery/types.yaml`.

## Example

```yaml
# accountability/dissemination/ports.yaml
contract: "disseminate_event(event: KeyEvent, witnesses: [WitnessEndpoint]) -> Result"
#                                                         ^^^^^^^^^^^^^^^^
#                     This type was renamed to ServiceEndpoint — contract is stale
```

The linter should flag:

```
[contract-type-resolution] accountability/dissemination: contract references type
  'WitnessEndpoint' not found in local types.yaml, kernel types, or imported domains
```

## Proposed Rule

1. Parse type names from `contract:` strings — extract identifiers used as parameter types, return types, and generic parameters (e.g., `[X]`, `Map<X, Y>`, `Result<X, Y>`)
2. Build a set of known types for each domain: own types.yaml + kernel types + imported domain types + built-in primitives (string, int, bool, bytes, void, Result, Iterator, Map)
3. For each extracted type name, check if it exists in the known types set
4. If not found, emit a warning (not error — contract strings are semi-formal)

## Scope

- Only applies to `contract:` fields in ports.yaml
- Built-in primitives (string, int, bool, bytes, void, datetime) are always allowed
- Generic wrappers (Result, Iterator, Map, []) are ignored — only inner type names are checked
- This is a warning, not an error, since contract strings are semi-formal and may use shorthand

## Acceptance Criteria

- [ ] Linter extracts type names from port contract strings
- [ ] Types checked against local types.yaml, kernel types, and imported types
- [ ] Built-in primitives whitelisted
- [ ] Missing types produce a warning with the port, type name, and contract context
