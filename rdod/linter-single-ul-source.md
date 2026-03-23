# Feature Request: Single source of truth for ubiquitous language

## Summary

Deprecate `ubiquitous_language:` in `domain.yaml`. Make `ubiquitous-language.yaml` the sole authoritative source for all term definitions, imports, and specializations. The linter, context map generator, and all tooling should read from the companion file only.

## Problem

The current template defines UL terms in TWO places:

1. **`domain.yaml` → `ubiquitous_language:`** — brief summary terms (term + definition + invariants)
2. **`ubiquitous-language.yaml` → `terms:`** — detailed terms (term + definition + invariants + synonyms + examples + related_terms + specializes + imports)

This dual-source design causes three classes of bugs:

### Bug class 1: Linter reads domain.yaml, content lives in UL file

The linter's `spec.terms` property reads from `self.data.get("ubiquitous_language", [])` (domain.yaml). But `specializes:`, `imports:`, and detailed invariants are authored in `ubiquitous-language.yaml` (loaded as `self.lang_data`). The linter can't see them.

**Concrete impact:** 3 false `published-no-redefinition` errors because `specializes:` was in the UL file but the linter checked domain.yaml. 3 false `completeness` warnings because terms existed in the UL file but domain.yaml had no `ubiquitous_language:` section.

### Bug class 2: Content duplication and drift

To satisfy the linter, authors must duplicate term names and brief definitions in domain.yaml AND write full definitions in the UL file. Over time, the brief version drifts from the detailed version — invariants get updated in one place but not the other.

**Concrete impact:** During the KERI spec work, we repeatedly had to add brief UL entries to domain.yaml just to make the linter happy, duplicating content that already existed in the companion file.

### Bug class 3: Ambiguous authority

When domain.yaml says one thing about a term and ubiquitous-language.yaml says another, which is authoritative? There's no rule. The context map generator reads both and merges them (preferring the UL file), but the linter reads only domain.yaml. Different tools see different truths.

## Proposed Fix

### 1. Deprecate `ubiquitous_language:` in domain.yaml template

Mark the field as deprecated in the template. New specs should not use it. Existing specs should migrate terms to the companion file.

```yaml
# domain.yaml — BEFORE
ubiquitous_language:
  - term: "Witness"
    definition: "A designated observer that receipts key events"
    invariants:
      - "Must be designated in the b field"

# domain.yaml — AFTER
# ubiquitous_language: DEPRECATED — use ubiquitous-language.yaml instead
```

### 2. Linter reads from ubiquitous-language.yaml

All linter checks that currently read `spec.terms` (from domain.yaml) should read from `spec.lang_data` (from ubiquitous-language.yaml):

```python
# Current
@property
def terms(self):
    return [t for t in self.data.get("ubiquitous_language", [])
            if isinstance(t, dict) and t.get("term")]

# Proposed
@property
def terms(self):
    # Primary: ubiquitous-language.yaml (authoritative)
    lang_terms = [t for t in self.lang_data.get("terms", [])
                  if isinstance(t, dict) and t.get("term")]
    if lang_terms:
        return lang_terms
    # Fallback: domain.yaml (backward compatibility during migration)
    return [t for t in self.data.get("ubiquitous_language", [])
            if isinstance(t, dict) and t.get("term")]
```

Similarly for imports and specializes:

```python
@property
def imports(self):
    return [i for i in self.lang_data.get("imports", [])
            if isinstance(i, dict) and i.get("term")]

@property
def specialized_terms(self):
    return {t["term"] for t in self.terms if t.get("specializes")}
```

### 3. Context map generator reads from ubiquitous-language.yaml

The context map generator should do the same: read terms from the companion file as authoritative, fall back to domain.yaml for backward compatibility.

### 4. Migration path

Existing specs that have `ubiquitous_language:` in domain.yaml should migrate:

1. Move any terms from domain.yaml to ubiquitous-language.yaml (if not already there)
2. Remove `ubiquitous_language:` from domain.yaml
3. Ensure ubiquitous-language.yaml has all terms, imports, and specializes declarations

The linter can help by warning: "domain.yaml contains ubiquitous_language section — migrate to ubiquitous-language.yaml"

## What domain.yaml keeps

After deprecation, domain.yaml still owns:
- `id`, `name`, `description`, `version` — domain identity
- `source_material` — provenance
- `domain_clients`, `subdomains`, `adjacents`, `kernels`, `externals` — relationships
- `published_language` — term export declarations (stays here because it's a relationship concern, not a term definition)
- `implementation_guidance` — hints for implementors
- `issues` — architectural concerns
- `tags` — metadata
- `invariants` — domain-level invariants (not term-level)

The UL companion file owns ALL term content: definitions, invariants, synonyms, examples, specializes, imports, events, rules.

## Acceptance Criteria

- [ ] `ubiquitous_language:` in domain.yaml template marked as deprecated
- [ ] Linter reads terms from `ubiquitous-language.yaml` as primary source
- [ ] Linter falls back to `domain.yaml` `ubiquitous_language:` for backward compatibility
- [ ] Linter warns when `ubiquitous_language:` exists in domain.yaml (migration nudge)
- [ ] Context map generator reads from UL file as primary source
- [ ] `specializes:`, `imports:`, and all term fields read from UL file
- [ ] `published_language:` stays in domain.yaml (it's a relationship concern)
- [ ] Documentation updated to clarify: domain.yaml = structure, UL file = vocabulary
- [ ] The 6 bugs described above no longer reproduce
