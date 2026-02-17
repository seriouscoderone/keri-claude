# ACDC Section Types

Four composable section types. Each supports graduated disclosure via compact (SAID string) and expanded (full block) forms, unified by `oneOf` schema composition and optional `u`-field blinding.

---

## 1. Attribute Section (`a` field)

### Reserved Fields (all nesting levels)

| Field | Type | Description |
|-------|------|-------------|
| `d` | str | SAID of enclosing map |
| `u` | str | High-entropy salty nonce |
| `i` | str | Issuee AID |
| `rd` | str | Registry SAID |
| `dt` | str | ISO datetime |

Top-level only: `cargo` (any serializable) -- opaque embedded data. MUST be serializable in the ACDC's serialization kind.

### Variants

| Variant | `i` | `u` | Effect |
|---------|-----|-----|--------|
| Targeted public | yes | no | Issued to specific AID |
| Targeted private | yes | yes | Issued to specific AID, blinded |
| Untargeted public | no | no | "To whom it may concern" |
| Untargeted private | no | yes | Anonymous, blinded |

Determined by presence/absence of `i` and `u` at top level of uncompacted block.

### Block Structures

**Targeted private:** `d`(MUST), `u`(MUST), `i`(MUST), custom. Schema `required` MUST list all. `additionalProperties: false`.

**Targeted public:** `d`(MUST), `i`(MUST), custom. No `u`. Same schema constraints.

**Blindable sub-block (nested):** `d`(MUST), `u`(MUST), custom. No `i` (Issuee only at top level).

### Compact Form

Replace any block with the value of its own `d` field. Top-level `d` and sub-block `d` values are stable across all disclosure levels.

### Three Disclosure Levels

1. **Fully compact:** `"a"` is SAID string -- nothing revealed
2. **Partially disclosed:** `"a"` is full object, sub-blocks are SAID strings
3. **Fully uncompacted:** everything expanded

### `oneOf` Schema Composition

`"oneOf": [{"type":"string"}, {"type":"object", "required":[...], "additionalProperties":false}]`

- Pre-disclosure: composed schema (accepts both forms)
- Post-disclosure: decomposed (remove string alt) to enforce full disclosure

### Rules

- MUST: Issuee `i` at top level of `a` block is the ACDC's Issuee AID
- MUST: `i` value MUST be an AID (provably controllable identifier)
- MUST: Targeted ACDC MUST be "issued by" Issuer and "issued to" Issuee
- MUST: No `u` = Public-Attribute ACDC even when compact
- MAY: With sufficient-entropy `u` = MAY be considered private in compact form
- SHOULD: Issuee semantics SHOULD be defined by EGF Credential Frameworks
- SHOULD: Disclosed attributes SHOULD be verified against SAID `d` from compact form

### Privacy

- With `u`: SAID securely blinds contents (rainbow table resistant)
- Without `u`: SAID provides compactness only, NOT privacy; is a correlation point
- Private-attribute Issuee `i` nested in blinded block enables correlation-protected presentation

### Verify Compact Attribute Section

1. Extract `d` from disclosed block
2. Verify `d` == previously committed compact `a` value
3. Recompute SAID of disclosed block (with `d` placeholder) -- MUST match
4. Validate against decomposed schema for full-disclosure compliance

### Verify Nested Partial Disclosure

1. Validate partial block against composed schema (`oneOf` at sub-block level)
2. Record SAIDs of compacted sub-blocks
3. On later sub-block disclosure: extract `d`, verify match, recompute SAID, validate against decomposed sub-schema
4. Top-level `d` unchanged regardless of sub-block disclosure state

### Correlation-Protected Presentation

1. Present compact ACDC on behalf of presenter AID (Issuee hidden in blinded `a`)
2. Negotiate Chain-Link Confidentiality via Rules section
3. After agreement: disclose uncompacted `a`, revealing Issuee `i`
4. If Disclosee refuses: disclosure SHOULD NOT proceed

---

## 2. Aggregate Section (`A` field)

Uppercase `A` -- selectively disclosable bundle of blindable attribute blocks. Flat ordered list with self-referential AGID as zeroth element.

### `A` Field Forms

| Form | Type | Structure |
|------|------|-----------|
| Compact | string | AGID only |
| SAID-compacted list | `str[]` | `[AGID, a_1, ..., a_N]` each `a_i` = block SAID |
| Uncompacted | mixed[] | `[AGID, block_1, ..., block_N]` |
| Selective | mixed[] | each element is block detail (object) or block SAID (string) |

List has N+1 elements (N blocks + AGID at index 0). AGID is NOT a SAID.

### Blindable Attribute Block

Fields: `d`(MUST), `u`(MUST), then attribute fields. Reserved at all levels: `d`, `u`, `i`(context-dep), `dt`(context-dep).

DON'T: Disclose individual fields from a multi-field block independently.
DO: Disclose all fields in a block together as a set. Field labels within a block are also blinded.

### Schema Composition

| Level | Operator | Purpose |
|-------|----------|---------|
| Top `A` | `oneOf` | AGID string vs. array |
| Array items | `anyOf` | Allow one or more block types |
| Per-block | `oneOf` | Block SAID vs. block detail |

Array: `uniqueItems: true`. `anyOf` position NOT correlated to actual block order.

### AGID Computation

```
compute_agid(blocks[1..N], digest_algo, serialization_kind):
  1. L = qb64 length of digest type (44 for Blake3-256)
  2. list = ["#" * L, said(block_1), ..., said(block_N)]
  3. serialize(list, serialization_kind)  // MUST match enclosing ACDC
  4. agid = cesr_qb64(digest(serialized))
  5. list[0] = agid; return agid
```

`AGID = H(C(a_i for i in {0..N}))` where a_0 dummied during computation.

DON'T: Assume same blocks produce same AGID across serialization kinds.
DO: Use enclosing ACDC's serialization kind.

### Rules

- MUST: `u` of each block MUST have sufficient entropy (rainbow table resistant)
- MUST: All fields in a block MUST be disclosed together
- SHOULD: Detailed blocks SHOULD only be disclosed after Disclosee agrees to Rules section terms
- Disclosing the full SAID list is safe -- block contents remain blinded

### Selective Disclosure Proof -- Presentation

Discloser provides:
1. Detailed block at index j (all fields)
2. Full SAID list `[a_0, ..., a_N]` with AGID at a_0
3. Compact ACDC with `A` = AGID
4. Issuance seal evidence in Issuer's KEL bound to ACDC top-level SAID

### Selective Disclosure Proof -- Verification

```
verify(block_j, said_list, compact_acdc, issuer_kel):
  1. a_j = SAID(block_j)                              // MUST
  2. Confirm a_j in said_list                          // MUST
  3. Compute AGID from said_list                       // MUST
  4. Confirm AGID == compact_acdc.A == said_list[0]    // MUST
  5. Compute top-level SAID of ACDC (most compact)     // MUST
  6. Confirm issuance seal digest in Issuer's KEL      // MUST
  7. Confirm seal bound to ACDC SAID (direct or TEL)   // MUST
```

Failure at any step = invalid.

---

## 3. Edge Section (`e` field)

Directed edges between ACDCs. Near node (containing ACDC) -> far node (referenced ACDC). Edge-groups aggregate edges with logical/arithmetic operators.

### Block Type Identification

```
has `n` field -> Edge
has non-reserved labeled sub-blocks, no `n` -> Edge-group
```

Type-is-schema: types defined by subschema, MUST NOT include type field.

### Edge-group Block

Field order: `d`(MAY), `u`(MAY), `o`(MAY), `w`(MAY), then labeled fields.

- `d`: SAID of block. `u`: ~128 bits entropy. `o`: m-ary operator (default `AND`). `w`: weight for `WAVG`.
- Top-level Edge-group MUST NOT have `w`.
- MUST NOT have `n` field (distinguishes from Edge).
- Labeled fields MUST NOT use reserved names `[d,u,n,s,o,w]`; MUST appear after reserved fields.

### Edge Block

Field order: `d`(MAY), `u`(MAY), `n`(MUST), `s`(MAY), `o`(MAY), `w`(MAY), then labeled.

- `n`: MUST -- far node ACDC SAID; first field when `d` absent.
- `s`: schema SAID of far node. `o`: unary operator(s), string or list. `w`: edge weight.
- Labeled fields MUST NOT use reserved names; MUST appear after reserved fields.

### Edge Compact Forms

| Form | Value | Condition |
|------|-------|-----------|
| Full block | Edge object | Default |
| Compact | Edge SAID (`d` value) | Has `d` |
| Simple compact | Far node SAID (`n` value) | Only `n` field |

No `u` = public. With `u` = private (blinded, including far node SAID). Simple compact schema MUST indicate value is far node SAID.

### M-ary Operators (Edge-group `o`)

| Op | Semantics | Default? |
|----|-----------|----------|
| `AND` | All members valid | YES (absent `o`) |
| `OR` | At least one valid | no |
| `NAND` | Not all valid | no |
| `NOR` | All invalid | no |
| `AVG` | Average of member property | no |
| `WAVG` | Weighted average (`w` field) | no |

### Unary Operators (Edge `o`)

| Op | Semantics | Default? |
|----|-----------|----------|
| `I2I` | Issuer MUST = Issuee of far node; far MUST be Targeted | YES for Targeted far |
| `NI2I` | No I2I constraint | YES for Untargeted far |
| `DI2I` | Issuer MUST = Issuee or delegated AID of far Issuee; far MUST be Targeted | no |
| `NOT` | Invert far node validity | no |

Multiple unary operators: `o` is list. Conflicts: latest takes precedence.

Default resolution: if `o` missing/empty or lacks I2I/NI2I/DI2I, append `I2I` (Targeted far) or `NI2I` (Untargeted far).

### Edge Validation

```
validate_edge(near, far, edge):
  1. SAID(far) == edge.n
  2. far satisfies its own schema
  3. If edge.s: validate far against edge.s schema (skip if same as step 2)
  4. Resolve effective unary operator (defaults above)
  5. Apply: I2I/DI2I check issuer-issuee; NOT inverts; NI2I = no constraint
  6. Return result
```

### Compact/Schema Rules

- MUST: Compact edge schema MUST use `oneOf` (compact + expanded)
- MUST: Simple compact schema MUST state value is far node SAID
- MUST: Edge Section itself MUST have `oneOf` with its SAID

### Provenance Validation

- Chain: all links head-to-tail MUST be valid for head valid
- Tree: all branches MUST be valid for head valid
- Broken link = head invalid

---

## 4. Rule Section (`r` field)

Ricardian Contract layer -- human-readable and machine-verifiable. Sub-graph of Rule-groups (intermediate) and Rules (terminal leaves).

### Rule-group Block (intermediate)

Field order: `d`(MAY), `u`(MAY), `l`(MAY), then labeled nested blocks.

- `d`: SAID, MUST be first. `u`: ~128 bits, MUST be second, only when `d` present. `l`: legal language.
- Distinguished from Rule by: presence of non-reserved labeled fields.
- Each nested block: locally unique non-reserved label, MUST NOT include type field.

### Rule Block (terminal)

Fields: `d`(MAY, first), `u`(MAY, second), `l`(MUST). MUST NOT have any other fields.

### Compact Forms

| Form | Condition | Value | Privacy |
|------|-----------|-------|---------|
| Public compact | `d`, no `u` | SAID string | Discoverable via rainbow table |
| Private compact | `d` + `u` | SAID string | Blinded |
| Simple compact | only `l` | Legal language string | Public, no graduated disclosure |

### Disclosure Patterns

**Partially disclosable (all blocks have `d`+`u`):**
1. Most compact: `"r": "<SAID>"` -- nothing revealed
2. Partial: top-level expanded, nested as SAIDs -- independently disclosable
3. Full: all expanded

**Non-partially-disclosable (simple compact):**
1. Most compact: `"r": "<SAID>"`
2. Full: all rules as inline legal strings
3. All-or-nothing

### Rules

- MUST: Rule Section MUST have `oneOf` with its SAID
- MUST: Rule MUST have `l` field; MUST NOT have fields other than `d`, `u`, `l`
- MUST NOT: Nested blocks MUST NOT include type field (type-is-schema)
- MUST: Each block labeled with locally unique non-reserved label
- MUST: Each type defined by subschema designated by its label
- MUST: Compact clause schema MUST use `oneOf`; simple compact MUST state value is legal language

### SAID Computation

```
compute_rule_section_said(section):
  1. Bottom-up: replace each leaf Rule (with `d`) by its SAID
  2. Replace each Rule-group (with `d`) by its SAID
  3. Compute SAID of resulting most-compact top-level block
```

Top-level SAID identical at all disclosure levels.

### Rule Discovery

1. Start with SAID of target block
2. Bootstrap via OOBI linking endpoint to block SAID
3. Or: Issuer MAY provide contract copy at issuance
4. Verify: retrieved content MUST produce expected SAID; else invalid
