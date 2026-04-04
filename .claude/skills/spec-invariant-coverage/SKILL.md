---
name: spec-invariant-coverage
description: Use when evaluating whether RDOD verification.yaml invariants are precise enough to derive property-based tests (PBT) or Z3 SMT proofs from a protocol specification's normative rules. Activates for invariant gap analysis, verification precision audits, or test-derivability assessments.
command: /keri:spec-invariant-coverage
user_invocable: true
---

# Spec-Invariant Coverage Analysis

Stress-tests RDOD `verification.yaml` entries against the normative rules in a protocol specification. For every MUST/SHALL/MUST NOT in the spec, asks: does a verification entry exist, and is it precise enough to derive a property-based test or Z3 SMT proof?

**Input:** `<spec-markdown-path> [<rdod-domains-path>]`
- Spec markdown: e.g., `scripts/markdown/keri-specification.md`
- RDOD domains: defaults to `rdod/spec/domains/`

**Output:** Invariant coverage artifacts in `rdod/spec/coverage/<spec-name>/invariants/` + a findings file.

## Relationship to Sibling Skills

| Skill | Question | Tests |
|-------|----------|-------|
| **spec-ul-coverage** | "Can I *say* this?" | UL vocabulary against spec |
| **spec-invariant-coverage** | "Can I *prove* this?" | Verification precision against spec |
| **spec-hardening** | "Can I *build* this?" | Implementation planning against spec |

Best used AFTER spec-ul-coverage — the UL must be right before you can assess whether invariants about those UL terms are precise enough.

## What "Precise Enough" Means

An invariant is precise enough when a developer can derive a test from the invariant text alone, without reading the spec. Two levels:

### PBT-Derivable (property-based test)

From the invariant text, you can determine:
1. **Inputs** — what to generate (types, ranges, constraints)
2. **Property** — what must hold for all generated inputs
3. **Boundaries** — edge cases that must be tested explicitly
4. **Failure mode** — what happens when the property is violated

**Example — precise:**
> "Simple threshold M MUST satisfy 1 <= M <= len(keys); M == 0 MUST be rejected (unsatisfiable); M > len(keys) MUST be rejected (never satisfiable)"

A developer reads this and writes:
- Generator: `M ∈ integers, keys ∈ list[PublicKey]`
- Property: `valid(M, keys) ↔ (1 <= M <= len(keys))`
- Boundaries: `M=0`, `M=len(keys)`, `M=len(keys)+1`, `keys=[]`
- Failure: `ValidationError`

**Example — vague:**
> "Threshold must be valid"

A developer cannot write a test from this. What does "valid" mean? What inputs? What boundaries?

### Z3-Derivable (SMT proof)

From the invariant text, you can determine:
1. **Variables** — what symbolic values to declare
2. **Constraints** — what must be true (assertions)
3. **Proof goal** — what must be shown unsatisfiable or satisfiable
4. **Quantification** — universal (∀) or existential (∃)

**Example — precise:**
> "For any witness pool of N witnesses with F potentially faulty, the immune threshold M must satisfy: M > (N + F) / 2 AND F < M. This guarantees at most one sufficient agreement despite F faulty witnesses."

A developer reads this and writes:
```
N, M, F = Ints('N M F')
immune = And(M > (N + F) / 2, F < M, N >= 1, M >= 1, F >= 0)
# Prove: under immune constraint, two agreements impossible
```

## The Process

### Phase 1: Extract Normative Rules

Extract all normative statements (MUST, SHALL, MUST NOT, SHOULD, REQUIRED) from the spec at each zoom level. The spec-ul-coverage `structure.yaml` can be reused if it exists.

For each normative statement:
1. Record the statement verbatim
2. Note the spec section and line number
3. Classify as: constraint (testable), recommendation (SHOULD — may not need a proof), or definition (informational)
4. Map to the RDOD domain that owns this rule

### Phase 2: Cross-Reference Against Verification

For each extracted normative rule, search for a corresponding entry in the mapped domain's `verification.yaml`:

| Match Quality | Meaning |
|---------------|---------|
| **Exact** | An invariant entry quotes or paraphrases the rule precisely |
| **Partial** | An entry covers part of the rule but misses conditions or boundaries |
| **Absent** | No entry exists for this normative rule |

### Phase 3: Precision Assessment

For each matched entry, assess its test-derivability:

| Score | Symbol | Meaning |
|-------|--------|---------|
| **z3-ready** | Can derive a Z3 SMT proof from the invariant text alone |
| **pbt-ready** | Can derive a property-based test from the invariant text alone |
| **vague** | Entry exists but too imprecise — missing inputs, boundaries, or failure modes |
| **missing** | No verification entry for a normative spec rule |
| **untestable** | Rule is normative but not amenable to formal testing (e.g., "SHOULD use best practices") |

Priority: z3-ready > pbt-ready > vague > missing > untestable.

### Phase 4: Gap Report

For each `vague` or `missing` finding:
1. State what's missing (inputs? boundaries? proof goal?)
2. Draft a precise invariant that would be test-derivable
3. Note whether PBT or Z3 is more appropriate for this rule
4. Route to the correct `verification.yaml` file

### Phase 5: Application

Apply accepted fixes to verification.yaml files. Each fix should upgrade an invariant from vague → pbt-ready or missing → pbt-ready/z3-ready.

## Precision Checklist

For each invariant, check these qualities:

### For PBT derivability
- [ ] **Inputs named** — what types/values does the property take?
- [ ] **Domain constraints stated** — what ranges, valid sets, preconditions?
- [ ] **Property as equation or predicate** — the assertion itself, not just "must be valid"
- [ ] **Boundaries explicit** — zero, empty, maximum, off-by-one cases named
- [ ] **Failure mode named** — what error, rejection, or behavior on violation?
- [ ] **Independence clear** — what other state does this NOT depend on?

### For Z3 derivability
- [ ] **Variables typed** — Int, Bool, BitVec, Array?
- [ ] **Constraints as logical formula** — And, Or, Implies, ForAll?
- [ ] **Proof goal stated** — what must be unsat/sat?
- [ ] **Quantification explicit** — ∀ or ∃?
- [ ] **Finiteness bounds** — if needed, what are the bounds for bounded model checking?

## Output Artifacts

```
rdod/spec/coverage/<spec-name>/invariants/
  normative-rules.yaml     # Phase 1: extracted MUST/SHALL statements
  cross-reference.yaml     # Phase 2: rule → verification entry mapping
  precision-report.md       # Phase 3: scored entries
  findings.yaml            # Phase 4: vague/missing with proposed fixes
```

## Reusing spec-ul-coverage Artifacts

If spec-ul-coverage has already been run on the same spec:
- Reuse `structure.yaml` for heading-to-domain mapping
- Reuse Z3 analysis (which already identified rules and invariants)
- Focus effort on cross-referencing and precision assessment, not re-reading the spec

## Stopping Criteria

Stop when every MUST/SHALL in the spec either:
- Has a z3-ready or pbt-ready verification entry, OR
- Is classified as untestable with justification, OR
- Has a finding with a proposed precise invariant
