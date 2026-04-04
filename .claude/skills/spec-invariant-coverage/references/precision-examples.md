# Invariant Precision Examples

## PBT-Ready Examples

### Good: Signing Threshold Boundary (from identity/thresholds)

```yaml
invariant: >
  Simple threshold M MUST satisfy 1 <= M <= len(keys);
  M == 0 MUST be rejected (unsatisfiable);
  M > len(keys) MUST be rejected (never satisfiable)
term: "Signing Threshold"
technique: property-based
```

**Why this is PBT-ready:**
- Inputs: M (integer), keys (list)
- Property: `valid(M, keys) ↔ (1 <= M <= len(keys))`
- Boundaries: M=0, M=len(keys), M=len(keys)+1, keys=[]
- Failure: rejection (ValidationError)

### Good: Dual Threshold Satisfaction (from identity/thresholds)

```yaml
invariant: >
  For rotations, signatures MUST satisfy both the new signing
  threshold (kt) AND the prior next threshold (nt) independently;
  if either fails, the rotation MUST be rejected
term: "Signing Threshold"
technique: property-based
```

**Why this is PBT-ready:**
- Inputs: kt (threshold), nt (threshold), indices (list), ondices (list)
- Property: `rotation_valid ↔ (kt.satisfy(indices) AND nt.satisfy(ondices))`
- Boundaries: one satisfied + one not, both satisfied, neither satisfied
- Failure: rotation rejected
- Independence: the two thresholds are checked independently

### Bad: Vague Threshold

```yaml
invariant: "Threshold must be valid for the key set"
term: "Signing Threshold"
```

**Why this fails:**
- "Valid" is undefined — what does it mean?
- No boundaries — what counts as invalid?
- No failure mode — what happens on invalid threshold?
- Cannot derive any test from this text

---

## Z3-Ready Examples

### Good: KAWA Immune Constraint (from accountability/consensus)

```yaml
invariant: >
  For any witness pool of N witnesses with F potentially faulty
  and M as the accountability threshold: M MUST satisfy
  M > (N + F) / 2 AND F < M. This guarantees at most one
  sufficient agreement despite F faulty witnesses.
term: "KAWA"
technique: smt
```

**Why this is Z3-ready:**
- Variables: N (Int, N >= 1), M (Int, M >= 1), F (Int, 0 <= F < N)
- Constraints: `And(M > (N + F) / 2, F < M)`
- Proof goal: Under these constraints, two independent agreements with different events are unsatisfiable
- Quantification: ∀ N, M, F satisfying the constraints

### Good: First-Seen Monotonicity (from accountability/consensus)

```yaml
invariant: >
  First-seen numbers are strictly monotonically increasing:
  for any two events e1, e2 accepted into the same KEL copy,
  if e1 was accepted before e2 then fn(e1) < fn(e2).
  fn values MUST NOT be reused or decremented.
term: "First-seen Rule"
technique: smt
```

**Why this is Z3-ready:**
- Variables: fn1 (Int), fn2 (Int), accepted_before (Bool)
- Constraints: `Implies(accepted_before, fn1 < fn2)`
- Proof goal: Prove that no valid sequence violates monotonicity
- Also derivable as PBT: generate sequences and check ordering

### Bad: Vague Monotonicity

```yaml
invariant: "First-seen numbers must be monotonic"
term: "First-seen Rule"
```

**Why this fails:**
- "Monotonic" is ambiguous — strictly increasing? Non-decreasing?
- No variables — what is being compared?
- No failure mode — what happens on violation?
- No quantification — for all events? For events at the same sn?

---

## The Upgrade Pattern

To upgrade a vague invariant to PBT-ready or Z3-ready:

### Step 1: Name the inputs
> Vague: "Threshold must be valid"
> Better: "**Given a threshold M and a key list of N keys**, threshold must be valid"

### Step 2: State the property as a predicate
> Better: "Given M and N keys, **M MUST satisfy 1 <= M <= N**"

### Step 3: Name the boundaries
> Better: "M MUST satisfy 1 <= M <= N; **M == 0 MUST be rejected; M > N MUST be rejected; N == 0 MUST be rejected**"

### Step 4: Name the failure mode
> Better: "M MUST satisfy 1 <= M <= N; M == 0 MUST be rejected **(ValidationError: unsatisfiable threshold)**; M > N MUST be rejected **(ValidationError: threshold exceeds key count)**"

### Step 5: Choose technique
- If the property involves finite enumerations, bounds, or implications → **Z3 SMT**
- If the property involves randomized inputs with deterministic expected outputs → **PBT**
- If the property involves state sequences or temporal ordering → **PBT with stateful testing** or **Z3 with sequence constraints**
- If both apply → provide both (Z3 for proof, PBT for regression)

---

## Technique Selection Guide

| Rule Pattern | Best Technique | Why |
|-------------|---------------|-----|
| Boundary constraints (M >= 1, M <= N) | Z3 SMT | Exhaustive proof over all values |
| Bijection / round-trip (encode → decode = identity) | PBT | Generate random inputs, check round-trip |
| State machine transitions | Z3 or PBT-stateful | Z3 proves no invalid transitions; PBT explores randomly |
| Ordering / monotonicity | Z3 SMT | Prove ordering holds for all pairs |
| Threshold satisfaction (M-of-N) | Both | Z3 proves boundaries; PBT checks satisfaction function |
| Cryptographic correctness (sign → verify) | PBT | Can't Z3 crypto functions, but can test property |
| Byzantine fault tolerance | Z3 SMT | Prove guarantees under fault assumptions |
| Data structure invariants (append-only, hash-chain) | PBT | Generate sequences, check structural property |
