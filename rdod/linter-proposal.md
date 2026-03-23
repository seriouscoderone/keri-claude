# Feature Request: DDD-Spec Linter and Validation Script

## Summary

Create a `ddd-lint` validation tool that checks domain specifications for structural correctness, relationship consistency, term ownership, and quality issues. Every issue we manually discovered and fixed during a 48-domain KERI specification effort could have been caught automatically.

## Motivation

During a comprehensive DDD specification effort (48 domains, 400+ UL terms, 50+ types, 625 verification properties), we repeatedly discovered structural issues only through manual review — often after significant work had already been built on top of the broken foundation. A linter running after each change would have caught these immediately.

## Issues That Would Have Been Caught

### Category 1: Broken References

**What we found:** `domain://` URIs pointing to renamed or deleted domains, `port://` URIs referencing ports that don't exist, `kernel://` refs with stale names.

**Concrete examples:**
- `domain://oobi` referenced in 4 files after renaming to `discovery/`
- `domain://agent` referenced in 12 files after the agent domain was eliminated
- `domain://acdc/tel` referenced after renaming to `acdc/credential-lifecycle`
- `port://keri/identity/inbound/identifier-lifecycle` referenced but actual port was `port://keri/identity/inbound/identity-management`
- `kernel://cesr-primitives` referenced after renaming to `cesr/primitives`

**Lint rule:** Every `domain://`, `port://`, and `kernel://` URI must resolve to an existing domain directory, port definition in a ports.yaml, or kernel entry. Flag dangling references.

**Impact if caught early:** Would have saved a full pass of grep + manual fix across all 48 domains after every rename.

### Category 2: Asymmetric Relationships

**What we found:** Domain A declares Domain B as an adjacent, but Domain B doesn't reference Domain A. Parent lists subdomain X, but X's `domain_clients` doesn't point back. Port refs don't match on both sides of a relationship.

**Concrete examples:**
- `signify-client` referenced `cloud-agent-service/inbound/admin-api` but cloud-agent-service referenced `cloud-agent-service/api/inbound/admin-api` (different port)
- `cesr/` listed `keri/` and `acdc/` as adjacents, but CESR is consumed BY them (wrong relationship direction)
- 32 subdomains were missing `domain_clients` back-references to their parents

**Lint rules:**
- If A lists B in `adjacents`, B must list A in `adjacents` or `domain_clients`
- If parent lists child in `subdomains`, child must list parent in `domain_clients`
- Port URIs in relationship `via_port` fields must match on both sides
- `adjacents` should not list domains that are actually upstream/downstream (use `domain_clients`/`subdomains` instead)

**Impact if caught early:** Would have prevented the entire "asymmetric bidirectional relationships" audit.

### Category 3: Duplicate Port Definitions

**What we found:** Parent domains and their child subdomains defining identical ports with the same contract. Creates ambiguity about which port is authoritative.

**Concrete examples:**
- `witness-service/ports.yaml` and `witness-service/api/ports.yaml` both defined receipt-accepting ports with identical contracts
- Same pattern in `watcher-service/` and `watcher-service/api/`

**Lint rule:** No two ports across a parent-child hierarchy should have the same `name` and `contract`. If a child defines a port, the parent should reference it via `via_port`, not redefine it.

**Impact if caught early:** Would have caught this during the initial creation of api/ subdomains.

### Category 4: Term Duplication Without Published Language

**What we found:** The same term defined in multiple domains with overlapping but different definitions. No clear ownership. Child domains redefining parent terms without the `specializes:` field.

**Concrete examples:**
- "Witness" defined in 3 places (keri/, keri/accountability/, witness-service/) with slightly different definitions
- "SAID" defined in acdc/ but should have lived in cesr/primitives (it's an encoding concept)
- "Threshold Satisfaction" defined in both establishment/ and thresholds/ with overlapping definitions
- 19 terms in child domains duplicated parent terms without `specializes:` declaration

**Lint rules:**
- If a term appears in a domain's `published_language`, no other domain should define the same term without `imports` or `specializes`
- If a child domain defines a term that also exists in its parent, it must declare `specializes: domain://parent`
- If a domain uses a term from another domain's `published_language` without an `imports` entry, flag as implicit dependency
- Terms should not be defined in domains that don't own them (e.g., SAID in acdc instead of cesr)

**Impact if caught early:** Would have prevented the entire UL dedup exercise and SAID relocation.

### Category 5: Vague Verification Properties

**What we found:** Verification properties using untestable language — "properly handled", "correctly processed", "valid" without defining what valid means. Properties testing attributes (hasattr) instead of behaviors.

**Concrete examples:**
- `assert not hasattr(agent, 'private_key')` — tests an attribute, not the security guarantee
- "Events are properly validated" — no definition of "properly"
- "Credential state is tracked" — no specification of the state machine
- `isinstance(result, AgentConfig)` — tests a type, not a behavior

**Lint rules:**
- Flag properties containing: "properly", "correctly", "valid" (without adjacent constraint definition), "handled", "processed" (without specifying the processing steps)
- Flag `formal.expression` containing: `hasattr`, `isinstance`, `type(`, `.__class__` — these test attributes, not behaviors
- Flag properties with `language: python` that use Python-specific constructs (pytest.raises, assert not hasattr) — suggest `language: pseudocode`
- Flag properties without a `formal:` section (prose-only invariants are untestable)

**Impact if caught early:** Would have caught all 28 hasattr/isinstance patterns and ~70 vague invariants during authoring rather than in a bulk polish pass.

### Category 6: Missing Required Files

**What we found:** Domains referenced in parent `subdomains:` lists but with incomplete file sets. Domains missing standard files (domain.yaml exists but ports.yaml, ubiquitous-language.yaml, or verification.yaml missing).

**Lint rules:**
- Every domain directory must contain at minimum: `domain.yaml`
- Every domain referenced in a `subdomains:` list must exist as a directory
- Warn if a domain has `domain.yaml` but is missing `ports.yaml`, `ubiquitous-language.yaml`, or `verification.yaml`
- Warn if `errors.yaml`, `types.yaml`, or `protocols.yaml` exist but are empty (just the template header)

**Impact if caught early:** Would have caught the 5 "incomplete subdomain specs" flags immediately.

### Category 7: Stale Implementation Vocabulary

**What we found:** Domain definitions, invariants, and term definitions using implementation-specific vocabulary (LMDB subdatabase names, keripy class names, HIO framework terms) as primary terminology rather than domain terms.

**Concrete examples:**
- `.ooes`, `.pses`, `.pwes` (LMDB subdatabase names) in domain definitions
- `Habery`, `Kevery`, `Baser` (keripy class names) as primary terms
- `Doer`, `DoDoer`, `recur()` (HIO framework terms) in domain definitions
- `pytest.raises(ValidationError)` in verification expressions

**Lint rules:**
- Flag 3-5 character dotted identifiers (`.xxxx`) in term definitions and invariants — likely LMDB subdatabase names
- Flag CamelCase words ending in -ery, -er, -er that appear in definitions without "(ClassName in implementation)" parenthetical — likely implementation class names leaking into domain language
- Flag `pytest`, `unittest`, `#[test]`, `cargo test` in verification formal expressions without `language:` being set to a specific language
- Configurable implementation vocabulary allowlist/blocklist per project

**Impact if caught early:** Would have caught all 68 LMDB references, 38 keripy class name references, and 28 HIO terms during authoring.

### Category 8: Schema Conformance

**What we found:** YAML files that don't conform to the template schema — missing required fields, wrong field types, unexpected keys.

**Lint rules:**
- Validate every domain.yaml against the template schema (required: id, domain_clients)
- Validate ports.yaml entries (required: id, type, name)
- Validate UL terms (required: term, definition)
- Validate verification properties (required: invariant)
- Validate errors.yaml entries (required: name, description, cause, recovery, severity)
- Validate types.yaml entries (required: name, description, variants)
- Validate protocols.yaml entries (required: name, description, participants, steps)
- Flag unknown keys that aren't in the template

**Impact if caught early:** Would have caught the 3 API subdomain YAML format issues immediately.

## Proposed Tool Design

### Interface

```bash
# Lint entire spec
ddd-lint rdod/spec/domains/

# Lint single domain
ddd-lint rdod/spec/domains/keri/identity/

# Lint with specific rule categories
ddd-lint --rules references,relationships,terms rdod/spec/domains/

# Fix auto-fixable issues
ddd-lint --fix rdod/spec/domains/

# Output as JSON (for CI integration)
ddd-lint --format json rdod/spec/domains/
```

### Rule Categories

| Category | Rules | Auto-fixable? |
|---|---|---|
| `references` | Dangling domain://, port://, kernel:// URIs | Partial (can suggest renames) |
| `relationships` | Asymmetric adjacents, missing back-references | Yes (add missing back-refs) |
| `ports` | Duplicate ports, unreferenced ports, missing ports | No (requires judgment) |
| `terms` | Duplication without specializes, missing imports, ownership violations | Partial |
| `verification` | Vague language, attribute tests, missing formal expressions | No (requires rewriting) |
| `files` | Missing required files, empty templates, incomplete subdomains | Yes (create from template) |
| `vocabulary` | Implementation-specific terms in domain definitions | Partial (flag, suggest domain name) |
| `schema` | YAML conformance to template schemas | Yes (add missing fields) |

### Severity Levels

| Level | Meaning | Example |
|---|---|---|
| `error` | Broken spec — references don't resolve, schema invalid | Dangling domain:// URI |
| `warning` | Inconsistency — may cause confusion or incorrect code generation | Asymmetric relationship |
| `info` | Quality improvement — spec works but could be stronger | Vague verification property |

### Configuration

```yaml
# .ddd-lint.yaml (project-level config)
rules:
  references: error
  relationships: warning
  ports: warning
  terms: warning
  verification: info
  files: warning
  vocabulary: info
  schema: error

ignore:
  - "rdod/spec/domains/_deprecated/**"

vocabulary:
  blocklist: [".ooes", ".pses", ".pwes", "Habery", "Kevery", "Baser"]
  allowlist_pattern: "\\(.*in keripy\\)"  # allowed if parenthetical
```

## Integration Points

- **CLI:** Standalone command for manual runs
- **CI/CD:** JSON output for GitHub Actions / pre-commit hooks
- **Context map generator:** Run lint before regenerating — refuse to generate with errors
- **IDE:** Could produce diagnostics compatible with LSP (future enhancement)

## Acceptance Criteria

- [ ] Tool validates all 8 rule categories
- [ ] Produces human-readable terminal output with file paths and line numbers
- [ ] Produces machine-readable JSON output for CI
- [ ] Supports `--fix` for auto-fixable issues
- [ ] Configurable via `.ddd-lint.yaml`
- [ ] Runs on the KERI 48-domain spec in under 5 seconds
- [ ] Catches all issues documented in this proposal when run against the pre-fix state
- [ ] Zero false positives on the current (post-fix) state of the KERI spec
- [ ] Distributed as part of the domain-design-toolkit plugin or as a standalone script

## References

- All examples drawn from actual issues found during KERI ecosystem DDD specification (48 domains)
- Manual fix effort: ~15 agent dispatches across 4 sessions to fix issues a linter would catch instantly
- Categories ordered by frequency of occurrence during the KERI spec work
