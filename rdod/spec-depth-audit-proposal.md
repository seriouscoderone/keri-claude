# Feature Request: Spec-Depth Audit Phase in DDD-Spec Crawl Pipeline

## Summary

Add a "depth audit" phase to the ddd-spec crawl pipeline that systematically probes each domain's specification source material for concepts the initial crawl may have missed. The initial crawl captures code structure (classes, functions, modules). The depth audit captures protocol-level richness (design patterns, architectural principles, variant taxonomies, philosophical constraints) that hide behind simple code.

## Problem

The current ddd-spec crawl pipeline discovers domains by analyzing code structure — AST extraction, import graphs, class hierarchies. This produces accurate domain boundaries and symbol mappings, but misses concepts that exist in the specification or design philosophy rather than in code:

### Concrete incident

During a 48-domain KERI specification effort, the `discovery/` domain was initially modeled with a thin OOBI type (2 variants: witness + well-known). A cohesion audit months later revealed the KERI specification actually defines:

- **4 URL variant patterns** (role-based, data/SAID, well-known, blind) with distinct semantics
- **Percolated discovery** — an architectural principle that anyone can re-serve verified data
- **Endpoint independence** — any HTTP service with KEL data can serve OOBIs, regardless of infrastructure role
- **Blind OOBI bootstrapping** — a self-introduction pattern for service discovery
- **Data OOBIs** — content-addressed discovery for schemas and credentials (not just AIDs)

None of these showed up in the initial crawl because:
1. URL patterns are regex constants, not classes — AST extraction doesn't capture them
2. Percolation is a design philosophy, not a function
3. Endpoint independence is an architectural property, not a code artifact
4. Blind OOBIs and Data OOBIs are URL pattern variants, not separate classes

The initial crawl produced correct domain boundaries but shallow domain content. The missing concepts were only discovered when another AI audited domain cohesion and asked "who owns OOBI resolution?"

### Estimated prevalence

In the KERI spec, at least 4 of 9 top-level domains likely have similar hidden richness beyond what code structure reveals:

| Domain | Likely hidden concepts |
|---|---|
| Discovery | 5 concepts found (fixed) |
| Privacy | Graduated disclosure forms, blinding derivation, chain-link gating |
| Accountability | KAWA consensus nuances, witness designation semantics |
| Integrity | Superseding recovery decision cascade, reconciliation algorithm |

## Proposed Solution: Spec-Depth Audit Phase

Add a new phase after the initial domain crawl that systematically probes each domain's source material for concepts the code structure didn't capture.

### Phase position in pipeline

```
Existing phases:
  1. Source crawl (AST extraction, code structure analysis)
  2. Domain boundary identification
  3. Ubiquitous language extraction
  4. Relationship mapping
  5. Verification property authoring

New phase (insert after step 3, before step 4):
  3b. Spec-depth audit
```

### Phase steps

For each domain identified in step 2:

**Step 3b.1: Source material inventory**

List ALL source materials declared in `domain.yaml`'s `source_material:` section. These are the authoritative references the domain was derived from.

```yaml
source_material:
  - type: document
    reference: "keri-specification.md — sections: OOBI, Well-Known, Discovery"
  - type: implementation
    reference: "keripy — src/keri/end/ending.py, src/keri/app/oobiing.py"
```

**Step 3b.2: Concept extraction questions**

For each source material, ask these probing questions (either via RAG chat if available, or by reading the source directly):

1. **Variant taxonomy**: "What are ALL the variants/forms/modes of [domain concept]? Not just the main one — what are the edge cases, special forms, and alternative patterns?"

2. **Architectural principles**: "What design principles or philosophical constraints govern [domain concept]? Why was it designed this way? What alternatives were explicitly rejected?"

3. **Independence/coupling**: "Can [domain concept] operate independently of [assumed dependency]? What is the minimum infrastructure required?"

4. **Consumer patterns**: "Who uses [domain concept] and HOW? Are there different usage patterns for different consumers?"

5. **Lifecycle/evolution**: "How does [domain concept] change over time? Is it immutable? Append-only? Replaceable? What update semantics apply?"

**Step 3b.3: Gap identification**

Compare the probed concepts against the domain's current UL terms. For each concept found in the source material but NOT in the UL:

- Is it a new term? → Add it
- Is it a variant of an existing term? → Expand the existing term's type definition
- Is it an architectural property? → Add to UL as a principle term with invariants
- Is it an implementation detail? → Skip (not domain-level)

**Step 3b.4: Cross-domain concept check**

Some concepts span domains. For each new concept found, ask: "Does this concept affect other domains?" If yes, check those domains for corresponding terms or relationships.

### Without RAG chat (general case)

The depth audit doesn't require a RAG-based chat system. The probing questions can be answered by:

1. **Reading the source material directly** — the `source_material` references point to the authoritative documents
2. **Examining the implementation** — look beyond classes/functions at constants, configuration, URL patterns, error messages, comments
3. **Asking the domain expert** — if the crawl is interactive, present the 5 probing questions to the human
4. **Cross-referencing existing UL terms** — for each UL term, ask "does the source material describe more variants, principles, or usage patterns than we captured?"

### With RAG chat (enhanced case)

If the project has a RAG-based knowledge base (like keri.host for KERI):

1. Submit each probing question to the chat
2. Cross-reference answers against existing UL terms
3. Auto-generate candidate UL term additions
4. Present candidates to the human for review

## Linter Integration

The depth audit can be partially automated via linter rules:

### Rule: Source material coverage check

```python
def check_source_material_coverage(specs, result):
    """Warn if source materials exist but UL terms seem thin."""
    for sid, spec in specs.items():
        source_count = len(spec.data.get("source_material", []))
        term_count = len(spec.terms)

        # Heuristic: domains with rich source material but few terms
        # may have unexplored depth
        if source_count >= 2 and term_count < 5:
            result.info("depth-audit", sid,
                f"domain has {source_count} source materials but only "
                f"{term_count} UL terms — consider a spec-depth audit")
```

### Rule: Type variant completeness

```python
def check_type_variant_completeness(specs, result):
    """Flag types with enum constraints that might have undiscovered variants."""
    for sid, spec in specs.items():
        types_data = load_yaml(spec.dir + "/types.yaml")
        if not types_data:
            continue
        for t in types_data.get("types", []):
            for variant in t.get("variants", []):
                for field in variant.get("fields", []):
                    constraints = field.get("constraints", {})
                    enum_values = constraints.get("enum", [])
                    # Small enum with generic name might be incomplete
                    if 1 <= len(enum_values) <= 2 and field.get("name") in ("type", "role", "kind", "variant", "mode"):
                        result.info("depth-audit", sid,
                            f"type '{t['name']}' field '{field['name']}' has only "
                            f"{len(enum_values)} enum values — verify against spec for completeness")
```

## Acceptance Criteria

- [ ] Spec-depth audit documented as phase 3b in the ddd-spec crawl pipeline
- [ ] 5 probing questions documented with examples
- [ ] Gap identification process documented (new term vs expanded variant vs principle vs skip)
- [ ] Cross-domain concept check documented
- [ ] Linter rule `check_source_material_coverage` implemented (info severity)
- [ ] Linter rule `check_type_variant_completeness` implemented (info severity)
- [ ] At least one example domain demonstrates the full depth audit (before/after)

## References

- KERI discovery domain: initial crawl produced 2 OOBI variants, depth audit revealed 4 variants + 4 architectural concepts
- Root cause: AST extraction captures code structure but not protocol semantics, URL patterns, or design philosophy
- Estimated 40-60% of domains benefit from depth audit in specification-heavy projects
