# Bug: check_term_count counts `- term:` lines in imports section

## Summary

`check_term_count()` counts ALL lines matching `- term:` in the raw file, but the `imports:` section also uses `- term:` as a key. This inflates the raw count, producing false "orphaned terms" errors for every domain that has imports.

## Reproduction

```yaml
# ubiquitous-language.yaml
imports:
  - term: "KRAM"           # ← counted as a term line
    from: "domain://keri"

terms:
  - term: "Signing Request" # ← also counted
    definition: "..."
```

Raw count: 2 (`- term:` on both lines)
Parsed terms: 1 (only "Signing Request" is in `terms:`)
Linter says: "1 term orphaned" — but it's actually an import, not an orphan.

## Fix

Exclude `- term:` lines that are inside the `imports:` section:

```python
def check_term_count(specs, result):
    for sid, spec in specs.items():
        filepath = Path(spec.dir) / "ubiquitous-language.yaml"
        if not filepath.exists():
            continue

        # Count only - term: lines in the terms: section, not imports:
        in_terms_section = False
        raw_count = 0
        with open(filepath) as f:
            for line in f:
                stripped = line.rstrip()
                if stripped == "terms:":
                    in_terms_section = True
                elif not stripped[0:1].isspace() and stripped.endswith(':'):
                    in_terms_section = False  # hit another top-level key
                if in_terms_section and line.strip().startswith("- term:"):
                    raw_count += 1

        parsed_count = len(spec.lang_data.get("terms", []))
        if raw_count != parsed_count:
            result.error(...)
```

## Affected Domains (10 false positives)

All 10 have `imports:` sections with `- term:` entries that inflate the count:

| Domain | Raw count | Parsed terms | Imports | Correct? |
|---|---|---|---|---|
| acdc/credential-exchange/proof | 4 | 3 | 1 | Yes (3+1=4) |
| acdc | 37 | 34 | 3 | Yes (34+3=37) |
| cloud-agent-service | 4 | 1 | 3 | Yes (1+3=4) |
| cloud-agent-service/processing | 11 | 6 | 5 | Yes (6+5=11) |
| discovery | 10 | 7 | 3 | Yes (7+3=10) |
| keri/identity/establishment | 15 | 12 | 3 | Yes (12+3=15) |
| local-agent | 11 | 8 | 3 | Yes (8+3=11) |
| signify-client | 8 | 5 | 3 | Yes (5+3=8) |
| watcher-service | 7 | 5 | 2 | Yes (5+2=7) |
| witness-service | 8 | 6 | 2 | Yes (6+2=8) |

## Acceptance Criteria

- [ ] `check_term_count()` counts `- term:` only inside the `terms:` section
- [ ] Domains with imports produce zero false orphan errors
- [ ] Actual orphaned terms (after events:/rules:) are still detected
