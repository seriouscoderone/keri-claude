# Feature Request: YAML structural validation and auto-fix for section ordering

## Summary

Add linter rules that validate YAML file structure beyond syntax — detecting orphaned items, duplicate keys, section ordering violations, and silently dropped content. Include `--fix` auto-repair for all mechanical issues.

## Problem

YAML files can be syntactically valid but structurally broken. The YAML parser silently succeeds while dropping content that appears in the wrong location. This is extremely difficult to detect by reading the file — it looks correct in a text editor.

### Concrete incident

In a 48-domain KERI specification, 7 `ubiquitous-language.yaml` files had terms appended AFTER the `events:` section. The YAML parser only reads the FIRST `terms:` block (lines 4-135). Everything after `events:` at line 136 — including 25 critical escrow and type dimension terms — was silently dropped.

```yaml
# ubiquitous-language.yaml — LOOKS correct, IS broken
terms:
  - term: "KEL"           # ← parser reads this (in terms: block)
    definition: "..."

events:                     # ← parser stops reading terms: here
  - name: "InceptionCreated"

  - term: "Out-of-Order Escrow"  # ← ORPHANED — parser thinks this is under events:
    synonyms: ["OOE"]             #   but it has wrong structure for an event
    definition: "..."             #   YAML silently ignores it
```

**Impact:** 25 domain terms with escrow queue abbreviations (OOE, PSE, PWE, MDE, MFE) became invisible to the linter's cross-reference checks, producing 10 false-positive warnings. The terms existed in the file but couldn't be found by any YAML-based tool.

**Root cause:** Agent-assisted editing appended content to the end of the file without checking which YAML section it landed in.

## Proposed Rules

### Rule 1: Section item type validation

Every section in a UL file has an expected item structure:

```yaml
terms:   → items MUST have "term" key
events:  → items MUST have "name" key
rules:   → items MUST be strings
imports: → items MUST have "term" and "from" keys
```

If an item under `events:` has a `term` key instead of `name`, it's an orphaned term.

```python
def check_section_item_types(specs, result):
    """Validate that items are in the correct YAML section."""
    SECTION_RULES = {
        "terms": lambda item: isinstance(item, dict) and "term" in item,
        "events": lambda item: isinstance(item, dict) and "name" in item,
        "rules": lambda item: isinstance(item, str),
        "imports": lambda item: isinstance(item, dict) and "term" in item and "from" in item,
    }

    for sid, spec in specs.items():
        if not spec.lang_data:
            continue
        for section, validator in SECTION_RULES.items():
            items = spec.lang_data.get(section, [])
            if not items or not isinstance(items, list):
                continue
            for i, item in enumerate(items):
                if not validator(item):
                    # Item is in the wrong section
                    actual_type = "term" if isinstance(item, dict) and "term" in item else \
                                  "event" if isinstance(item, dict) and "name" in item else \
                                  "unknown"
                    result.error("yaml-structure", sid,
                        f"item {i} in '{section}:' section appears to be a {actual_type}, "
                        f"not a valid {section} entry — likely appended after the wrong section header")
```

### Rule 2: Duplicate top-level keys

YAML silently uses the LAST occurrence of a duplicate key. If `terms:` appears twice in a file, the first block is silently overwritten.

```python
def check_duplicate_yaml_keys(specs, result):
    """Detect duplicate top-level keys in YAML files."""
    for sid, spec in specs.items():
        for filename in ["ubiquitous-language.yaml", "domain.yaml", "ports.yaml",
                         "verification.yaml", "errors.yaml", "types.yaml", "protocols.yaml"]:
            filepath = Path(spec.dir) / filename
            if not filepath.exists():
                continue
            seen_keys = {}
            with open(filepath) as f:
                for lineno, line in enumerate(f, 1):
                    # Top-level key: no leading whitespace, ends with ':'
                    stripped = line.rstrip()
                    if stripped and not stripped[0].isspace() and stripped.endswith(':'):
                        key = stripped[:-1].strip()
                        if key in seen_keys:
                            result.error("yaml-duplicate-key", sid,
                                f"{filename} has duplicate top-level key '{key}' "
                                f"at lines {seen_keys[key]} and {lineno} — "
                                f"YAML silently uses the last occurrence")
                        seen_keys[key] = lineno
```

### Rule 3: Section ordering validation

The canonical section order for `ubiquitous-language.yaml` is:

```
domain_ref → imports → terms → events → rules
```

If `terms:` appears AFTER `events:`, items will be misattributed.

```python
CANONICAL_ORDER = {
    "ubiquitous-language.yaml": ["domain_ref", "imports", "terms", "events", "rules"],
    "domain.yaml": ["template_version", "id", "name", "description", "version",
                     "source_material", "ubiquitous_language", "published_language",
                     "domain_clients", "subdomains", "kernels", "adjacents",
                     "externals", "implementation_guidance", "issues", "tags"],
}

def check_section_ordering(specs, result):
    """Warn when YAML sections appear out of canonical order."""
    for sid, spec in specs.items():
        for filename, expected_order in CANONICAL_ORDER.items():
            filepath = Path(spec.dir) / filename
            if not filepath.exists():
                continue
            found_order = []
            with open(filepath) as f:
                for line in f:
                    stripped = line.rstrip()
                    if stripped and not stripped[0].isspace() and ':' in stripped:
                        key = stripped.split(':')[0].strip()
                        if key in expected_order and key not in found_order:
                            found_order.append(key)

            # Check if found_order matches expected_order subsequence
            expected_indices = [expected_order.index(k) for k in found_order if k in expected_order]
            if expected_indices != sorted(expected_indices):
                result.warn("yaml-ordering", sid,
                    f"{filename} sections are out of canonical order: "
                    f"found {found_order}, expected subsequence of {expected_order}")
```

### Rule 4: Term count cross-check

After loading, verify that the number of `  - term:` lines in the raw file matches the number of terms parsed by YAML. A mismatch means terms were orphaned.

```python
def check_term_count(specs, result):
    """Cross-check raw term count vs parsed term count."""
    for sid, spec in specs.items():
        filepath = Path(spec.dir) / "ubiquitous-language.yaml"
        if not filepath.exists():
            continue

        # Raw count: lines matching "  - term:"
        with open(filepath) as f:
            raw_count = sum(1 for line in f if line.strip().startswith("- term:"))

        # Parsed count
        parsed_count = len(spec.lang_data.get("terms", []))

        if raw_count != parsed_count:
            result.error("yaml-orphaned-terms", sid,
                f"ubiquitous-language.yaml has {raw_count} '- term:' lines "
                f"but YAML parsed only {parsed_count} terms — "
                f"{raw_count - parsed_count} terms are orphaned "
                f"(likely placed after events: or rules: section)")
```

## Auto-Fix Support (`--fix`)

All 4 rules are mechanically auto-fixable:

### Fix for Rule 1 + Rule 4: Move orphaned items to correct section

```python
def fix_orphaned_items(filepath):
    """Move items from wrong sections to correct sections."""
    data = yaml.safe_load(open(filepath))
    changed = False

    # Check events: for orphaned terms
    events = data.get("events", [])
    terms = data.get("terms", [])
    orphaned_terms = [e for e in events if isinstance(e, dict) and "term" in e]

    if orphaned_terms:
        # Move to terms section
        terms.extend(orphaned_terms)
        data["events"] = [e for e in events if not (isinstance(e, dict) and "term" in e)]
        data["terms"] = terms
        changed = True

    # Same for rules: section
    rules = data.get("rules", [])
    orphaned_in_rules = [r for r in rules if isinstance(r, dict) and "term" in r]
    if orphaned_in_rules:
        terms.extend(orphaned_in_rules)
        data["rules"] = [r for r in rules if not isinstance(r, dict)]
        data["terms"] = terms
        changed = True

    if changed:
        # Rewrite file with correct section ordering
        with open(filepath, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    return changed
```

### Fix for Rule 2: Merge duplicate keys

When duplicate top-level keys are found, merge their contents (concatenate lists, merge dicts).

### Fix for Rule 3: Reorder sections

Rewrite the file with sections in canonical order, preserving all content.

## Severity

| Rule | Severity | Auto-fixable? |
|---|---|---|
| Section item type (orphaned items) | **error** | Yes — move to correct section |
| Duplicate top-level keys | **error** | Yes — merge contents |
| Section ordering | **warning** | Yes — reorder sections |
| Term count mismatch | **error** | Yes — uses Rule 1 fix |

## Acceptance Criteria

- [ ] `check_section_item_types()` detects items in wrong YAML sections
- [ ] `check_duplicate_yaml_keys()` detects duplicate top-level keys in all YAML files
- [ ] `check_section_ordering()` warns on out-of-order sections
- [ ] `check_term_count()` cross-checks raw term lines vs parsed count
- [ ] All 4 rules support `--fix` for automatic repair
- [ ] `--fix` preserves all content — no data loss during restructuring
- [ ] `--fix` writes valid YAML with canonical section ordering
- [ ] The 7 broken UL files from the KERI spec incident would be caught and auto-fixed

## References

- 7 broken UL files in KERI 48-domain spec — 25 orphaned terms silently dropped
- Root cause: agent-assisted editing appended terms after events: section
- Detected only by cross-referencing escrow queue abbreviations against UL synonyms
- Manual fix required reading 7 files and moving ~450 lines of YAML
- Would have been a one-command fix with `validate_spec.py --fix`
