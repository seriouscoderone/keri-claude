# Feature Request: Typed references in protocols.yaml steps

## Summary

Enhance the `protocols.yaml` step schema to support typed references to `types.yaml`, `errors.yaml`, `ports.yaml`, and `verification.yaml` — replacing prose descriptions of inputs, outputs, errors, and preconditions with machine-resolvable URIs.

## Problem

Protocol steps currently describe inputs, outputs, errors, and preconditions as free-text strings:

```yaml
steps:
  - seq: 1
    action: "construct_inception_event"
    input: "Signing keys, next key digests, witness list, TOAD, configuration traits"
    output: "Signed inception event (icp) with SAID as new AID prefix"
    on_failure:
      - error: "MissingSignatureError"
        action: "escrow"
```

An AI code generator reading this must:
1. Parse natural language to determine input types → look up types.yaml manually
2. Parse error name as a string → search errors.yaml manually
3. Guess which port this step calls → search ports.yaml manually
4. Infer preconditions → search verification.yaml manually

This works for humans but is lossy for AI. The other spec files already define all of this formally — protocols.yaml just doesn't reference them.

## Proposed Schema Enhancement

### Typed inputs and outputs

```yaml
# Current
input: "Signing keys, next key digests, witness list, TOAD, configuration traits"
output: "Signed inception event (icp) with SAID as new AID prefix"

# Proposed (backward compatible — string still valid)
input:
  description: "Signing keys, next key digests, witness list, TOAD, configuration traits"
  types:
    - ref: "types://keri/identity#InceptionEvent/non-delegated"
      fields: ["k", "n", "b", "bt", "c"]
output:
  description: "Signed inception event (icp) with SAID as new AID prefix"
  type: "types://keri/identity#InceptionEvent"
```

### Port references

```yaml
# Current
action: "validate_and_accept"

# Proposed (port is optional — action string still primary)
action: "validate_and_accept"
port: "port://keri/identity/establishment/inbound/event-validation"
```

### Error references

```yaml
# Current
on_failure:
  - error: "MissingSignatureError"
    action: "escrow"

# Proposed (ref is optional — error name still primary)
on_failure:
  - error: "MissingSignatureError"
    ref: "errors://keri/identity/establishment#MissingSignatureError"
    action: "escrow"
```

### Preconditions

```yaml
# Current
depends_on: [2]

# Proposed (preconditions is optional — depends_on still primary)
depends_on: [2]
preconditions:
  - description: "Key state exists for the AID"
    ref: "verification://keri/identity/state#key_state_derivation"
  - description: "Witness list is non-empty if TOAD > 0"
    ref: "verification://keri/identity/thresholds#toad_bounds"
```

## URI Scheme Convention

| Scheme | Resolves to | Example |
|---|---|---|
| `types://` | types.yaml type definition | `types://keri/identity#InceptionEvent/non-delegated` |
| `errors://` | errors.yaml error definition | `errors://keri/identity/establishment#MissingSignatureError` |
| `port://` | ports.yaml port definition | `port://keri/identity/establishment/inbound/event-validation` |
| `verification://` | verification.yaml property | `verification://keri/identity/state#key_state_derivation` |

Format: `scheme://domain-path#item-name[/variant]`

The `port://` scheme already exists in the template. The others follow the same convention.

## Backward Compatibility

All new fields are **optional**. Existing protocols.yaml files continue to work:
- `input:` as string → still valid (prose description)
- `input:` as object → new format with `description:` + `types:`
- `error:` as string → still valid (error name)
- `error:` as string + `ref:` → new format with resolvable URI
- `port:` absent → still valid (action name only)
- `preconditions:` absent → still valid (depends_on only)

## Linter Integration

The linter can validate typed references:
- `types://` refs resolve to an existing type in the target domain's types.yaml
- `errors://` refs resolve to an existing error in the target domain's errors.yaml
- `port://` refs resolve to an existing port in the target domain's ports.yaml
- `verification://` refs resolve to an existing property in the target domain's verification.yaml
- Missing refs produce warnings (not errors — refs are optional)

## Impact on AI-Implementability

With typed references, an AI code generator can:
1. **Generate function signatures** — input types resolve to formal type definitions with field constraints
2. **Generate error handling** — error refs link to typed errors with context fields and recovery strategies
3. **Generate interface calls** — port refs link to contracts with pre/postconditions
4. **Generate assertions** — precondition refs link to formal verification properties

Without typed references, the AI must do natural language interpretation of prose strings and manually search across 4 file types. With them, it follows URIs directly.

## Acceptance Criteria

- [ ] protocols.yaml template supports `input:` as string OR object with `description:` + `types:`
- [ ] protocols.yaml template supports `output:` as string OR object with `description:` + `type:`
- [ ] protocols.yaml template supports optional `port:` on steps
- [ ] protocols.yaml template supports optional `ref:` on error entries
- [ ] protocols.yaml template supports optional `preconditions:` on steps
- [ ] URI schemes documented: `types://`, `errors://`, `verification://` (plus existing `port://`)
- [ ] Linter validates typed references when present
- [ ] Backward compatible — existing string-only protocols.yaml files still valid
- [ ] At least one example protocol demonstrates all typed reference fields
