# Feature Request: Include errors.yaml names in contract type resolution

## Summary

The `[contract-type-ref]` rule checks port contract type names against types.yaml and UL terms, but not against errors.yaml. Error types like `ValidationError`, `DuplicateError`, `EscrowError` are formally defined in errors.yaml but flagged as unresolved because the linter doesn't look there.

## Problem

~40 of the 159 contract-type-ref warnings are for error types that exist in the domain's errors.yaml. These are false positives — the types are defined, just in a different file.

## Example

```yaml
# identity/ports.yaml
contract: "process_event(event: KeyEvent) -> Result<EventValidated, ValidationError>"
```

`ValidationError` is defined in `identity/establishment/errors.yaml` but the linter only checks `types.yaml` and `ubiquitous-language.yaml`.

## Proposed Fix

Extend the contract-type-ref resolution to also check:
1. The domain's own `errors.yaml` — match against `errors[].name`
2. Parent and sibling domain `errors.yaml` files — error types may be defined in a subdomain

## Resolution order

When resolving a PascalCase identifier from a port contract:
1. Check all `types.yaml` `name:` fields (existing)
2. Check all `ubiquitous-language.yaml` `term:` fields (existing)
3. Check all `errors.yaml` `name:` fields (NEW)
4. Check port-local `types:` field on the same port (see companion ticket)

## Acceptance Criteria

- [ ] Linter loads `errors.yaml` `name:` fields into the resolution set
- [ ] Error type names in port contracts no longer produce warnings
- [ ] Resolution searches the domain's own errors.yaml plus parent/sibling domains
