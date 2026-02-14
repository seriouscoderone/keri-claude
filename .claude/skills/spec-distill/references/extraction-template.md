# Extraction Template

When extracting from a spec chunk, organize content into the 6 categories below. Use the exact table formats shown. If a category has no content in the chunk, omit it entirely.

## General Rules

- **Preserve normative keywords exactly:** MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, OPTIONAL (per RFC 2119)
- **Use tables, not prose:** Convert paragraph descriptions into structured rows
- **Flag ambiguities:** If the spec is unclear or contradictory, insert `[AMBIGUOUS: brief description of the issue]`
- **Note cross-references:** When content references another section or concept defined elsewhere, insert `[XREF: section-name or concept]`
- **One fact per row:** Don't combine multiple requirements into a single table row
- **Keep field names verbatim:** Use the exact names from the spec (e.g., `kt`, not `key_threshold`)

---

## Category 1: Data Structures

Capture message formats, field definitions, serialization layouts, and structural constraints.

**Format:**

```markdown
### Data Structure: <Name>

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `v`   | str  | MUST     | Regex: `KERI\d+...` | Version string |
| `t`   | str  | MUST     | One of: `icp`, `rot`, `ixn` | Message type (ilk) |
| ...   | ...  | ...      | ...         | ...         |

Serialization: <JSON/CBOR/MGPK/CESR>
Ordering: <field order matters / unordered>
Notes: <any additional structural constraints>
```

**What to capture:**
- Every field name, type, and constraint
- Required vs. optional status (using MUST/SHOULD/MAY)
- Field ordering requirements
- Serialization format(s)
- Size limits or length constraints
- Default values
- Relationships between fields (e.g., "length of `k` array MUST equal `kt`")

---

## Category 2: Rules and Invariants

Capture all normative requirements — every MUST, SHOULD, MAY statement.

**Format:**

```markdown
### Rules: <Topic>

| ID | Level | Statement | Condition | Source |
|----|-------|-----------|-----------|--------|
| R1 | MUST  | Sequence number MUST be monotonically increasing | For all events after inception | §3.2 |
| R2 | MUST NOT | Prior event digest MUST NOT be empty | For rotation and interaction events | §3.4 |
| R3 | SHOULD | Witnesses SHOULD be chosen from diverse infrastructure | When selecting backers | §5.1 |
| ...| ...   | ...       | ...       | ...    |
```

**What to capture:**
- The exact normative statement
- The condition under which it applies
- Section reference for traceability
- Assign sequential IDs (R1, R2...) within each topic for cross-referencing

---

## Category 3: State Machines

Capture protocol states, transitions, events, and guards.

**Format:**

```markdown
### State Machine: <Name>

**States:** <list all states>
**Initial state:** <state>
**Terminal states:** <states, if any>

| Current State | Event | Guard/Condition | Next State | Actions |
|---------------|-------|-----------------|------------|---------|
| `unverified`  | `receipt` | Valid signature | `verified` | Store receipt |
| `verified`    | `rotation` | Valid rotation event | `rotated` | Update keys |
| ...           | ...   | ...             | ...        | ...     |

**Error transitions:**
| Current State | Event | Failure Condition | Error State | Recovery |
|---|---|---|---|---|
| `any` | `invalid_sig` | Signature fails | `escrowed` | Await valid sig |
```

**What to capture:**
- All named states
- All transitions with triggering events
- Guard conditions on transitions
- Actions performed during transitions
- Error/failure transitions and recovery paths
- Escrow conditions (common in KERI)

---

## Category 4: Algorithms

Capture computation procedures with inputs, outputs, and ordered steps.

**Format:**

```markdown
### Algorithm: <Name>

**Purpose:** <one-line description>
**Inputs:** <list with types>
**Outputs:** <list with types>

**Steps:**
1. <Step description>
2. <Step description>
   - Sub-step if needed
3. If <condition>:
   a. <Step for true case>
   b. Else: <Step for false case>
4. Return <output>

**Complexity:** <if stated>
**Error conditions:** <what can go wrong>
```

**What to capture:**
- Algorithm name and purpose
- All inputs with types/constraints
- All outputs with types
- Every step in order — do not summarize or skip steps
- Branching conditions
- Iteration/loop bounds
- Error conditions and how they're handled

---

## Category 5: Error Conditions

Capture failure modes, error responses, and recovery procedures.

**Format:**

```markdown
### Errors: <Context>

| Error | Trigger | Required Response | Recovery | Severity |
|-------|---------|-------------------|----------|----------|
| Stale event | `sn` less than current | MUST discard, MAY log | None — idempotent | Warning |
| Duplicitous event | Different event at same `sn` | MUST escrow, MUST flag | Await resolution | Critical |
| ...   | ...     | ...               | ...      | ...      |
```

**What to capture:**
- The error condition name or description
- What triggers it (specific conditions)
- Required response (normative — MUST/SHOULD/MAY)
- Recovery path, if any
- Severity or impact if stated

---

## Category 6: Terminology

Capture protocol-defined terms, abbreviations, and acronyms.

**Format:**

```markdown
### Terminology

| Term | Abbreviation | Definition |
|------|-------------|------------|
| Key Event Log | KEL | Append-only log of key events for an identifier |
| Self-Addressing Identifier | SAID | Content-addressable identifier derived from digest of content |
| ...  | ...         | ...        |
```

**What to capture:**
- Terms explicitly defined in the spec (not general knowledge terms)
- Official abbreviations and acronyms
- Definitions as stated in the spec (don't paraphrase)
- Only terms that would be needed when implementing the protocol

---

## Output File Format

Write the extraction as a single markdown file with this structure:

```markdown
# Extraction: <chunk_id> — <slug>
# Source: <spec-path> lines <start>–<end>
# Content types: <types from survey>

## Data Structures
<tables if any>

## Rules
<tables if any>

## State Machines
<tables if any>

## Algorithms
<procedures if any>

## Errors
<tables if any>

## Terminology
<tables if any>
```

Omit any category section that has no content for this chunk.
