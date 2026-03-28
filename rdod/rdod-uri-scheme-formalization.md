# Feature Request: Formalize URI scheme grammar in RDOD toolkit

## Summary

The 8 URI reference schemes (`domain://`, `kernel://`, `port://`, `types://`, `errors://`, `verification://`, `protocols://`, `external://`) are fundamental to how RDOD specs cross-reference. Their grammar and resolution rules should be part of the toolkit, not defined per-spec in conventions.yaml.

## Problem

Currently each spec must define its own URI scheme documentation (we added it to conventions.yaml for the KERI spec). But these schemes are universal — every RDOD spec uses the same grammar. Having them in per-spec conventions means:
- Each new spec must rediscover and re-document the schemes
- The linter validates against ad-hoc patterns instead of a formal grammar
- No single source of truth for how references work

## Proposed Location

Add to the RDOD toolkit's `references/templates.md` (or a new `references/uri-schemes.md`):

```yaml
uri_schemes:
  - scheme: "domain://"
    grammar: "domain://{domain_id}"
    resolves_to: "{domain_id}/domain.yaml"

  - scheme: "kernel://"
    grammar: "kernel://{domain_id}"
    resolves_to: "{domain_id}/domain.yaml (kernel adoption)"

  - scheme: "port://"
    grammar: "port://{domain_id}/{direction}/{port_name}"
    resolves_to: "{domain_id}/ports.yaml -> ports[id == full_uri]"

  - scheme: "types://"
    grammar: "types://{domain_id}#{type_name}"
    resolves_to: "{domain_id}/types.yaml -> types[name == {type_name}]"

  - scheme: "errors://"
    grammar: "errors://{domain_id}#{error_name}"
    resolves_to: "{domain_id}/errors.yaml -> errors[name == {error_name}]"

  - scheme: "verification://"
    grammar: "verification://{domain_id}#{term_or_constraint}"
    resolves_to: "{domain_id}/verification.yaml"

  - scheme: "protocols://"
    grammar: "protocols://{domain_id}#{protocol_name}"
    resolves_to: "{domain_id}/protocols.yaml -> protocols[name == {protocol_name}]"

  - scheme: "external://"
    grammar: "external://{external_name}"
    resolves_to: "Abstract — no file. Documented in spec's conventions.yaml"
```

## Linter Integration

The linter already validates some of these ad-hoc. With formal grammars it could:
- Parse any URI into (scheme, domain_id, fragment) using the grammar
- Validate the domain_id resolves to a directory
- Validate the fragment resolves to a named element in the target file
- Report malformed URIs that don't match the grammar

## Acceptance Criteria

- [ ] URI scheme definitions added to RDOD toolkit reference documentation
- [ ] Linter uses formal grammar for URI parsing (not regex patterns)
- [ ] Per-spec conventions.yaml can extend with spec-specific schemes (e.g., `external://`)
- [ ] ddd-spec skill's SKILL.md references the URI scheme documentation
