# Feature Request: AI-Implementability Extensions for DDD-Spec Template

## Summary

Add three new file types (`errors.yaml`, `types.yaml`, `protocols.yaml`) to the RDOD/ddd-spec domain template and strengthen the existing `verification.yaml` guidance. These extensions close the gap between a domain specification that documents well and one that an AI developer agent can implement from directly.

## Motivation

The current RDOD template (`domain.yaml`, `ports.yaml`, `ubiquitous-language.yaml`, `verification.yaml`) captures domain boundaries, relationships, vocabulary, interfaces, and invariants. This is sufficient for human comprehension and architectural governance.

However, when using the spec as input for AI-assisted code generation, four gaps emerge:

1. **Error handling is fragmented** — Error types are scattered across UL terms, port contracts, and verification properties. An AI generating code must synthesize error handling from multiple sources, leading to ad-hoc or incomplete error coverage.

2. **Data structures lack formal schemas** — Key domain types are described in prose (UL definitions) with some constraints in invariants. There is no structured, machine-parseable type definition with field names, types, constraints, valid ranges, and variant representations.

3. **Cross-domain protocols are implicit** — Domains define their own interfaces (ports), but multi-domain orchestrations (e.g., "multi-sig rotation spanning identity, cloud-agent, and accountability") are not specified as end-to-end sequences. An AI can build individual domains but cannot wire them together.

4. **Invariants vary in testability** — Some domains have strong, falsifiable invariants ("sequence number must be monotonically increasing with no gaps"). Others have vague invariants ("events are properly validated"). An AI needs invariants it can translate directly into assertions.

## Proposed New File Types

### 1. `errors.yaml`

**Purpose:** Consolidated error taxonomy per domain. Every error a domain can produce, its cause, recovery strategy, and context fields.

**Template:**
```yaml
# errors.yaml
domain_ref: "domain-path"

errors:
  - name: "ErrorName"
    description: "Human-readable description of when this error occurs"
    cause: "The specific condition that triggers this error"
    recovery: "What the caller should do — retry | escrow | escalate | abort"
    severity: "fatal | recoverable | transient"
    context:
      - field: "field_name"
        type: "field_type"
        description: "What this context field tells the caller"
    related_port: "port://domain/inbound/operation"  # which operation produces this
```

**Why it matters:** An AI can enumerate all error branches for every operation, generate exhaustive error handling, and produce meaningful error messages with the right context fields.

### 2. `types.yaml`

**Purpose:** Formal data structure definitions per domain. Machine-parseable type schemas with constraints, variants, and encoding rules.

**Template:**
```yaml
# types.yaml
domain_ref: "domain-path"

types:
  - name: "TypeName"
    description: "What this type represents in the domain"
    variants:
      - name: "variant_name"
        fields:
          - name: "field_name"
            type: "string | integer | array[T] | map | TypeRef"
            required: true | false
            constraints:
              min: value
              max: value
              pattern: "regex"
              enum: [value1, value2]
            description: "What this field means"
        invariants:
          - "Constraint that must hold for this variant"
    default_variant: "variant_name"
    construction_defaults:
      field_name: "default_value_or_algorithm"
    encoding:
      - format: "json | cbor | cesr"
        notes: "Encoding-specific rules"
```

**Why it matters:** An AI can generate type definitions, validation logic, serialization/deserialization, and builder interfaces directly from structured type schemas. No prose interpretation needed.

### 3. `protocols.yaml`

**Purpose:** Explicit cross-domain orchestration sequences. End-to-end flows that span multiple domains, with step ordering, failure paths, and compensation logic.

**Template:**
```yaml
# protocols.yaml
domain_ref: "domain-path"

protocols:
  - name: "ProtocolName"
    description: "What this end-to-end flow accomplishes"
    participants:
      - domain: "domain://participant-1"
        role: "What this domain does in the protocol"
      - domain: "domain://participant-2"
        role: "What this domain does"
    trigger: "What initiates this protocol"
    steps:
      - seq: 1
        domain: "domain://participant-1"
        action: "operation_name"
        port: "port://participant-1/inbound/operation"
        input: "What goes in"
        output: "What comes out"
        on_failure:
          - error: "ErrorType"
            action: "escrow | retry | abort | compensate"
            compensation: "What to undo if needed"
      - seq: 2
        domain: "domain://participant-2"
        action: "next_operation"
        depends_on: [1]
        # ...
    timeout: "Duration after which the protocol is considered failed"
    compensation: "Global rollback/cleanup if protocol fails after partial completion"
    terminal_states:
      success: "What 'done' looks like"
      failure: "What 'failed' looks like"
```

**Why it matters:** An AI building a system from this spec can generate orchestration code, saga/process managers, timeout handling, and compensation logic. Without this, cross-domain wiring requires human intervention.

## Proposed Changes to Existing Templates

### Strengthen `verification.yaml` guidance

Add guidance (in the RDOD template documentation, not in each file) that verification properties should be:

1. **Testable** — An AI should be able to translate every property into an assertion. If a property uses "properly", "correctly", or "valid" without defining what those mean, it is incomplete.

2. **Boundary-aware** — Properties should specify behavior at edges: empty inputs, zero values, maximum values, single-element collections.

3. **Error-path-aware** — Properties should specify what happens when the happy path fails, not just what happens when everything works.

4. **Falsifiable** — Every property should have a conceivable scenario that would violate it. If no violation is conceivable, the property is either trivially true or too vague.

**Quality rubric for properties:**

| Rating | Criteria | Example |
|---|---|---|
| Strong | Precise bounds, testable, specifies error path | "If sn > expected, route to OOE escrow" |
| Adequate | Measurable but incomplete error handling | "Sequence numbers must increase" |
| Weak | Descriptive, not prescriptive | "Events are processed" |
| Vague | Uses may/can/should without conditions | "The system should handle events" |

### Add `language` field to verification proofs

When verification properties include code examples, they should declare the example language:

```yaml
properties:
  - name: "property_name"
    specification: "..."
    proof:
      language: "python"  # or "pseudocode" or "rust"
      code: |
        def test_property():
            ...
```

This tells AI code generators to translate the example rather than copy it verbatim.

## Impact on Existing Specs

These are **additive** changes — no existing files need modification. The new file types are optional per domain. Domains can adopt them incrementally:

- `errors.yaml` — start with domains that have complex error handling (protocol domains, service APIs)
- `types.yaml` — start with domains that define key data structures (encoding, identity, credentials)
- `protocols.yaml` — start with parent domains that orchestrate subdomains

## Acceptance Criteria

- [ ] RDOD template includes `errors.yaml` with documented schema
- [ ] RDOD template includes `types.yaml` with documented schema
- [ ] RDOD template includes `protocols.yaml` with documented schema
- [ ] RDOD template documentation includes verification quality rubric
- [ ] RDOD template documentation includes `language` field guidance for verification proofs
- [ ] Context map generator (`generate_context_map.py` or equivalent plugin) enriches from new file types
- [ ] At least one example domain demonstrates all three new file types

## References

- Analysis performed on KERI ecosystem DDD spec (48 domains, 1,849 invariants)
- Invariant quality audit: 18% strong, 70% adequate, 12% weak/vague
- AI-implementability assessment: 70-75% ready with current template, estimated 95%+ with proposed extensions
- Gold standard domain: `keri/identity/establishment` (107 invariants, 39% strong, explicit error routing, typed state machine)
