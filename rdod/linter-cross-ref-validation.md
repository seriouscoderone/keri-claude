# Feature Request: Cross-reference validation for types, errors, and ports

## Summary

Add 4 new linter rules that cross-reference type names, error names, escrow queue identifiers, and TypeRef syntax across all spec files. These catch inconsistencies that the current reference-resolution checks miss because they only validate `domain://` and `port://` URIs, not type names used in contracts and field definitions.

## Rule 1: Undefined Type References

**What it catches:** Type names used in `ports.yaml` contracts and `types.yaml` field definitions that don't resolve to any defined type.

**Concrete examples found:**
- `Cigar`, `Siger` used in `keri/accountability/types.yaml` field types — these are CESR primitives with no formal type definition
- `CodeEntry` used in `cesr/primitives/ports.yaml` contract — the canonical UL term was `Sizage`
- `Hab` used in `acdc/credential-exchange/negotiation/ports.yaml` — a keripy implementation class, not a domain type
- `InceptionEvent` used in `cloud-agent-service/api/types.yaml` without a `TypeRef:` prefix

**Implementation:**

```python
def check_type_references(specs, result):
    """Cross-reference type names against types.yaml definitions."""
    # Build registry of all defined type names
    defined_types = {}  # {type_name: domain_id}
    for sid, spec in specs.items():
        types_data = load_yaml(spec.dir + "/types.yaml")
        if types_data:
            for t in types_data.get("types", []):
                defined_types[t["name"]] = sid

    # Check types.yaml field type references
    for sid, spec in specs.items():
        types_data = load_yaml(spec.dir + "/types.yaml")
        if not types_data:
            continue
        for t in types_data.get("types", []):
            for variant in t.get("variants", []):
                for field in variant.get("fields", []):
                    field_type = field.get("type", "")
                    # Skip primitives and arrays
                    if field_type in ("string", "integer", "boolean", "bytes", "map"):
                        continue
                    if field_type.startswith("array["):
                        continue
                    if field_type.startswith("TypeRef:"):
                        # Validate the reference resolves
                        ref = field_type.replace("TypeRef:", "")
                        domain, _, type_name = ref.partition("#")
                        if domain not in specs:
                            result.warn("type-ref", sid,
                                f"TypeRef '{field_type}' references domain '{domain}' which does not exist")
                    else:
                        # Bare type name — check if defined locally or globally
                        if field_type not in defined_types and field_type not in [
                            ft["name"] for ft in types_data.get("types", [])
                        ]:
                            result.warn("type-ref", sid,
                                f"type '{field_type}' used in {t['name']}.{field['name']} "
                                f"but not defined in any types.yaml")
```

## Rule 2: TypeRef Syntax Consistency

**What it catches:** Inconsistent use of qualified `TypeRef:domain#Type` vs bare `TypeName` for cross-domain type references.

**Concrete examples found:**
- `acdc/credential-exchange/types.yaml` uses `TypeRef:acdc#Credential` (correct)
- `keri/delegation/types.yaml` used bare `InceptionEvent` (incorrect — cross-domain ref)

**Implementation:**

```python
def check_typeref_syntax(specs, result):
    """Enforce TypeRef: prefix for cross-domain type references."""
    for sid, spec in specs.items():
        types_data = load_yaml(spec.dir + "/types.yaml")
        if not types_data:
            continue
        local_types = {t["name"] for t in types_data.get("types", [])}
        for t in types_data.get("types", []):
            for variant in t.get("variants", []):
                for field in variant.get("fields", []):
                    field_type = field.get("type", "")
                    if field_type in ("string", "integer", "boolean", "bytes", "map"):
                        continue
                    if field_type.startswith("array[") or field_type.startswith("TypeRef:"):
                        continue
                    # Bare type name — is it local?
                    if field_type not in local_types:
                        result.warn("typeref-syntax", sid,
                            f"bare type '{field_type}' in {t['name']}.{field['name']} "
                            f"appears to be cross-domain — use TypeRef:domain#Type")
```

## Rule 3: Duplicate Error Names in Parent/Child

**What it catches:** Errors with identical names defined in both parent and child domains without clear scope differentiation.

**Concrete examples found:**
- `UnknownCodeError` in both `cesr/errors.yaml` and `cesr/primitives/errors.yaml`
- `OperationNotFoundError` in both `cloud-agent-service/api/errors.yaml` and `cloud-agent-service/processing/errors.yaml`

**Implementation:**

```python
def check_duplicate_errors(specs, result):
    """Flag same-name errors in parent/child domains."""
    error_registry = {}  # {error_name: [domain_ids]}
    for sid, spec in specs.items():
        errors_data = load_yaml(spec.dir + "/errors.yaml")
        if not errors_data:
            continue
        for err in errors_data.get("errors", []):
            name = err.get("name", "")
            if name not in error_registry:
                error_registry[name] = []
            error_registry[name].append(sid)

    for name, domains in error_registry.items():
        if len(domains) > 1:
            # Check if any pair is parent/child
            for i, d1 in enumerate(domains):
                for d2 in domains[i+1:]:
                    if d1.startswith(d2 + "/") or d2.startswith(d1 + "/"):
                        result.warn("duplicate-error", d1,
                            f"error '{name}' defined in both '{d1}' and '{d2}' "
                            f"— differentiate names or document scope distinction")
```

## Rule 4: Escrow Queue Cross-Reference

**What it catches:** Escrow queue identifiers referenced in `errors.yaml` that don't appear as UL terms in any domain.

**Concrete examples found:**
- `MDE` (MissingDelegableApproval) in `keri/identity/establishment/errors.yaml` with no UL term defined

**Implementation:**

```python
def check_escrow_references(specs, result):
    """Cross-reference escrow_queue fields against UL terms."""
    # Collect all UL term names and synonyms
    all_terms = set()
    for sid, spec in specs.items():
        for t in spec.terms:
            all_terms.add(t.get("term", ""))
            for syn in t.get("synonyms", []):
                all_terms.add(syn)

    # Check escrow_queue fields in errors.yaml
    for sid, spec in specs.items():
        errors_data = load_yaml(spec.dir + "/errors.yaml")
        if not errors_data:
            continue
        for err in errors_data.get("errors", []):
            queue = err.get("escrow_queue", "")
            if queue and queue not in all_terms:
                result.warn("escrow-ref", sid,
                    f"error '{err['name']}' references escrow queue '{queue}' "
                    f"which is not defined as a UL term or synonym in any domain")
```

## Acceptance Criteria

- [ ] `check_type_references()` validates type names in types.yaml fields and ports.yaml contracts
- [ ] `check_typeref_syntax()` enforces `TypeRef:` prefix for cross-domain type references
- [ ] `check_duplicate_errors()` flags same-name errors in parent/child hierarchies
- [ ] `check_escrow_references()` cross-references escrow_queue identifiers against UL terms
- [ ] All 4 rules produce warnings (not errors) — these are consistency improvements, not structural breaks
- [ ] Zero false positives on primitive types (string, integer, boolean, bytes, map, array[T])
- [ ] Configurable allowlist for implementation types that are acceptable in port contracts

## References

- 6 consistency issues found by cross-AI audit of 48-domain KERI spec
- All 6 were fixable but required manual detection across 254 YAML files
- These rules would catch all 6 automatically during `validate_spec.py` runs
