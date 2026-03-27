# Feature Request: Validate imported terms exist in source domain UL

## Summary

When a domain imports a term via `imports:` in ubiquitous-language.yaml, the linter should verify that the referenced term actually exists in the source domain's `terms:` list.

## Problem

A domain can import a term from another domain where that term was never formally defined. This creates a phantom dependency — consuming domains believe they're importing a well-defined concept, but the source domain has no canonical definition for it. This was discovered with KRAM: three domains imported it from `domain://keri-messaging`, but keri-messaging had no KRAM term in its UL.

## Example

```yaml
# credential-exchange/proof/ubiquitous-language.yaml
imports:
  - term: "KRAM"
    from: "domain://keri-messaging"
    usage: "Exchange messages are authenticated via KRAM"
```

If `keri-messaging/ubiquitous-language.yaml` has no `term: "KRAM"` in its `terms:` list, the linter should flag:

```
[import-resolution] credential-exchange/proof: imported term 'KRAM' not found
  in domain://keri-messaging ubiquitous-language.yaml terms
```

## Proposed Rule

For each entry in a domain's `imports:` list:
1. Resolve the `from:` field to a domain path (e.g., `domain://keri-messaging` → `keri-messaging/`)
2. Load the target domain's `ubiquitous-language.yaml`
3. Check that a matching term exists in `terms:` (by `term:` field name)
4. Also check `specializes:` entries — a domain may specialize a parent's term rather than define it directly
5. If the target domain has `published_language:` in domain.yaml, optionally check that the imported term is listed there

## Severity

- **Error** if the term is not found anywhere in the target domain's UL
- **Warning** if the term exists in the target domain but is not in its `published_language:` (importing a private concept)

## Edge Cases

- Term name may differ slightly (e.g., "KRAM" vs "KRAM Authentication") — exact match first, fuzzy match as a suggestion in the error message
- Term may be defined in a parent domain's UL and inherited — check the parent chain
- `from:` may reference a subdomain (e.g., `domain://cesr/primitives`) — resolve the full path

## Acceptance Criteria

- [ ] Linter resolves `from:` domain references to UL files
- [ ] Linter checks that each imported `term:` name exists in the target's `terms:` list
- [ ] Missing term produces an error with the importing file, term name, and target domain
- [ ] Specializations are also checked as valid import sources
- [ ] Optional: warn if importing a term not in the target's `published_language:`
