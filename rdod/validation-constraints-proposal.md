# Feature Request: Add validation_constraints section to verification.yaml template

## Summary

Add an optional `validation_constraints:` section to the verification.yaml template for expressing validation pipelines as declarative constraint graphs with dependencies, complementing the existing procedural descriptions in UL terms.

## Problem

Validation pipelines are described procedurally in UL terms ("Step 1: check X. Step 2: check Y. Step 3: check Z."). This is human-readable but forces an AI to hard-code step ordering rather than derive it from constraint dependencies.

An AI that understands constraint dependencies can:
- Derive optimal evaluation order via topological sort
- Identify parallelizable constraints (independent branches)
- Generate constraint-solver-style validation logic
- Compose constraints from different domains

## Proposed Schema Addition

```yaml
# verification.yaml — new optional section
validation_constraints:
  - id: ""               # unique constraint identifier (e.g., "C1_registry_exists")
    constraint: ""       # declarative rule — what must be true
    depends_on: []       # list of constraint IDs that must be satisfied first
    on_failure: ""       # what happens if this constraint fails (escrow, reject, etc.)
```

## Example

```yaml
validation_constraints:
  - id: "C1_sigs_valid"
    constraint: "Signatures must verify against current key state"
    depends_on: []
    on_failure: "reject — no valid signatures"

  - id: "C2_threshold_met"
    constraint: "Verified signature count must satisfy signing threshold"
    depends_on: ["C1_sigs_valid"]
    on_failure: "escrow to PSE"

  - id: "C3_witnesses_met"
    constraint: "Witness receipt count must satisfy TOAD"
    depends_on: ["C2_threshold_met"]
    on_failure: "escrow to PWE"

  - id: "C4_accept"
    constraint: "All constraints satisfied — event accepted"
    depends_on: ["C3_witnesses_met"]
    on_failure: null
```

An AI reads this as a DAG:
```
C1_sigs_valid → C2_threshold_met → C3_witnesses_met → C4_accept
```

## Relationship to Existing Artifacts

- **UL terms** (procedural): "Step 1, Step 2, Step 3" — preserved as complementary human-readable guidance
- **verification.yaml properties** (invariants): "X MUST be true" — individual rules without ordering
- **validation_constraints** (declarative graph): "X depends on Y" — composable ordering derived from dependencies

All three describe the same pipeline from different angles. None replaces the others.

## Acceptance Criteria

- [ ] `validation_constraints:` section added to verification.yaml template as optional
- [ ] Each constraint has: id, constraint (declarative rule), depends_on (list of IDs), on_failure
- [ ] Linter validates: all depends_on IDs reference existing constraint IDs within the same file
- [ ] Linter validates: no cycles in the depends_on graph
- [ ] Template documentation describes relationship to procedural UL and invariant properties
