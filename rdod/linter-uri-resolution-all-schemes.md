# Feature Request: Comprehensive URI resolution across all reference schemes

## Summary

The linter validates `domain://` imports and `port://` refs, but does not check `kernel://`, `errors://`, `verification://`, or `types://` URI schemes. This leaves phantom references, scheme mismatches, and dangling URIs undetected.

## Problems Found

### 1. Phantom domain references (25 files)

`kernel://cryptographic-algorithms` is referenced by 25 files across 19 domains, but no `cryptographic-algorithms/` directory exists. This is a phantom reference — the domain was never created. The linter does not detect it because it doesn't resolve `kernel://` URIs.

### 2. kernel:// vs domain:// scheme mismatch

Two domains are referenced with both `kernel://` and `domain://` schemes:
- `keri-messaging`: 13 files use `kernel://keri-messaging`, 16 files use `domain://keri-messaging`
- `cesr`: 16 files use `kernel://cesr`, 26 files use `domain://cesr`

A domain is either a kernel (adopted natively, `kernel://`) or a regular domain (`domain://`). Mixed usage means some consumers treat the dependency as adopted-native while others treat it as external. An AI implementing from this spec cannot determine the correct integration pattern.

### 3. No validation of kernel:// targets

`kernel://` references should resolve to a domain directory that:
- Exists on disk
- Has `is_kernel: true` in its domain.yaml (or equivalent marker)

Currently, any string after `kernel://` is accepted without validation.

### 4. No validation of types://, errors://, verification:// targets

These URI schemes reference specific files within a domain:
- `types://identity#KeyEvent` should resolve to a type named `KeyEvent` in `identity/types.yaml`
- `errors://delegation#MissingDelegationError` should resolve to that error in `delegation/errors.yaml`
- `verification://identity/establishment` should resolve to `identity/establishment/verification.yaml`

The contract-type-ref rule partially covers `types://` but only for inline contract references, not for explicit `types://` URIs in type field definitions.

## Proposed Rules

### Rule 1: `[uri-resolution]` — validate all URI scheme targets

For every URI found in any YAML field across all spec files:

| Scheme | Resolution target | Check |
|--------|------------------|-------|
| `domain://X` | `X/domain.yaml` exists | Already implemented |
| `kernel://X` | `X/domain.yaml` exists AND domain declares kernel role | NEW |
| `port://X/Y/Z` | Port with id `Z` exists in `X/ports.yaml` | Partially implemented |
| `types://X#Y` | Type named `Y` exists in `X/types.yaml` | NEW |
| `errors://X#Y` | Error named `Y` exists in `X/errors.yaml` | NEW |
| `verification://X` | `X/verification.yaml` exists | NEW |

### Rule 2: `[scheme-consistency]` — flag mixed kernel:// and domain:// for same target

If domain X is referenced as both `kernel://X` and `domain://X` across the spec, emit a warning:

```
[scheme-consistency] keri-messaging: referenced as both kernel:// (13 files)
  and domain:// (16 files) — must be one or the other
```

### Rule 3: `[phantom-domain]` — flag URI targets with no matching directory

Any `domain://X` or `kernel://X` where `X/` directory does not exist in the spec tree:

```
[phantom-domain] cryptographic-algorithms: referenced by 25 files
  but no cryptographic-algorithms/ domain directory exists
```

## Acceptance Criteria

- [ ] All URI schemes (`domain://`, `kernel://`, `port://`, `types://`, `errors://`, `verification://`) are resolved against the file system
- [ ] Phantom domains (no matching directory) produce errors
- [ ] Mixed kernel:// and domain:// for the same target produce warnings
- [ ] kernel:// targets validated against a kernel marker in domain.yaml
- [ ] types://X#Y resolved to type name Y in X/types.yaml
- [ ] errors://X#Y resolved to error name Y in X/errors.yaml
