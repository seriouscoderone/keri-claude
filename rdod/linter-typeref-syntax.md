# Feature Request: Detect non-standard type reference syntax

## Summary

Add a linter rule that flags `TypeRef:domain#Type` syntax and recommends the standard `types://domain#Type` URI syntax. The spec uses a consistent URI scheme for all cross-references (`domain://`, `port://`, `errors://`, `verification://`, `types://`) — `TypeRef:` is the only non-URI variant and should be flagged.

## Problem

Two syntaxes emerged organically for the same concept:

```yaml
# Non-standard (in types.yaml field definitions)
type: "TypeRef:identity#InceptionEvent"

# Standard URI (in protocols.yaml typed references)
type: "types://identity#InceptionEvent"
```

Both mean "reference the InceptionEvent type from the identity domain." The URI syntax (`types://`) is consistent with every other reference scheme. `TypeRef:` is a one-off that breaks the pattern.

## Concrete Incident

48 `TypeRef:` references across 17 files coexisted with 61 `types://` references across 7 files. A global find-replace was needed to unify them.

## Proposed Rule

```python
def check_typeref_syntax(specs, result):
    """Flag non-standard TypeRef: syntax in types.yaml field definitions."""
    for sid, spec in specs.items():
        types_data = load_yaml(str(Path(spec.dir) / "types.yaml"))
        if not types_data:
            continue
        for t in types_data.get("types", []):
            for variant in t.get("variants", []):
                for field in variant.get("fields", []):
                    field_type = field.get("type", "")
                    if field_type.startswith("TypeRef:"):
                        result.warn("typeref-syntax", sid,
                            f"field '{field.get('name')}' uses non-standard "
                            f"'TypeRef:' syntax — use 'types://' instead: "
                            f"{field_type} → {field_type.replace('TypeRef:', 'types://')}")
```

Auto-fixable with `--fix`: `sed 's|TypeRef:|types://|g'`

## Acceptance Criteria

- [ ] Linter flags `TypeRef:` in types.yaml field type values
- [ ] Suggests `types://` replacement
- [ ] Auto-fixable with `--fix`
