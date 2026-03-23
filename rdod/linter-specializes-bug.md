# Bug: Linter checks `specializes:` in domain.yaml but not ubiquitous-language.yaml

## Summary

`validate_spec.py` line 281 builds `specialized_terms` from `spec.terms` (which reads `domain.yaml`'s brief `ubiquitous_language` section), but `specializes:` fields are typically on the detailed terms in `ubiquitous-language.yaml` (loaded as `lang_data`). This causes false `published-no-redefinition` errors for terms that ARE properly specialized.

## Reproduction

```yaml
# keri/accountability/ubiquitous-language.yaml (detailed UL file)
terms:
  - term: "Witness"
    specializes: "domain://keri"     # <-- this IS here
    definition: "In the context of accountability..."
```

```
$ python validate_spec.py rdod/spec/domains/
ERRORS (3):
  [published-no-redefinition] keri/accountability: term 'Witness' is published by keri but redefined locally without import or specializes
```

The linter reports the error even though `specializes: "domain://keri"` is present on the term.

## Root Cause

`validate_spec.py` line 281:
```python
specialized_terms = {t["term"] for t in spec.terms if t.get("specializes")}
```

`spec.terms` is a property that reads from `self.data.get("ubiquitous_language", [])` — this is the **domain.yaml** brief UL. But `specializes:` is on terms in the **ubiquitous-language.yaml** file, loaded as `self.lang_data`.

The fix should also check `lang_data`:
```python
specialized_terms = {t["term"] for t in spec.terms if t.get("specializes")}
# Also check detailed UL terms from ubiquitous-language.yaml
for t in spec.lang_data.get("terms", []):
    if isinstance(t, dict) and t.get("term") and t.get("specializes"):
        specialized_terms.add(t["term"])
```

## Affected Terms in KERI Spec

| Domain | Term | Published by | Has `specializes:` in UL file |
|---|---|---|---|
| keri/accountability | Witness | keri | Yes: `specializes: "domain://keri"` |
| keri/identity | KEL | keri | Yes: `specializes: "domain://keri"` |
| keri/identity | Key State | keri | Yes: `specializes: "domain://keri"` |
| keri/integrity/detection | Watcher | keri | Yes: `specializes: "domain://keri"` |

All 3 remaining `published-no-redefinition` errors are false positives caused by this bug.

## Acceptance Criteria

- [ ] `check_published_language()` reads `specializes:` from BOTH `domain.yaml` terms AND `ubiquitous-language.yaml` terms
- [ ] The 3 false positive errors above no longer fire
- [ ] Add regression test: term with `specializes:` only in UL file should not trigger `published-no-redefinition`
