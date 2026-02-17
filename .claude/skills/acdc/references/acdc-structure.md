# ACDC Structure and Schema Reference

## Top-Level Field Map

| Field | Type | Req | Constraint |
|-------|------|-----|------------|
| `v` | str | MUST | Regex `ACDCMmmGggKKKKSSSS.`; protocol MUST be `ACDC`; MUST be first field in JSON/CBOR/MGPK |
| `t` | str | conditional | 3-char message type; default `acm` if absent |
| `d` | str | MUST | SAID of enclosing map |
| `u` | str | MAY | High-entropy salty nonce; controls Public/Private/Metadata variant |
| `i` | str (AID) | MUST | Issuer SCID; MUST derive from key pair(s); key state via KERI |
| `rd` | str | MAY | SAID of TEL registry initializing event |
| `s` | str/map | MUST | Schema SAID or schema block; IS the type field (type-is-schema) |
| `a` | str/map | MAY | Attribute SAID or block; MUST NOT coexist with non-empty `A` |
| `A` | str | MAY | Attribute Aggregate; MUST NOT coexist with non-empty `a` |
| `e` | str/map | MAY | Edge SAID or block |
| `r` | str/map | MAY | Rule SAID or block (Ricardian contract) |

Required fields: `[v, d, i, s]`. Serialization: JSON, CBOR, MGPK, CESR.
Field order when present MUST be: `[v, t, d, u, i, rd, s, a, A, e, r]`.
All primary field labels MUST be 1-2 characters (compact labels).
Section fields `s`, `a`, `e`, `r` MAY be replaced by their SAID (compact form).

## Reserved Fields (All Nesting Levels)

These labels MUST NOT be redefined at any level.

| Field | Type | Purpose |
|-------|------|---------|
| `d` | str | SAID of enclosing block |
| `u` | str | Salty nonce / blinding factor |
| `i` | str (AID) | Context-dependent identifier (e.g., Issuee AID in `a`) |
| `rd` | str | Registry SAID |
| `dt` | str | Datetime; MUST be ISO-8601 with microseconds + UTC offset per RFC 3339 |
| `n` | str | Node: SAID of another ACDC (Edge terminus) |
| `o` | str | Operator: unary on Edge, m-ary on edge-group |
| `w` | str/num | Edge weight |
| `l` | str | Legal language (Ricardian clause) |
| `cargo` | any | Embedded data (top-level of `a` only); MUST be serializable with ACDC's kind |

A `u` field MAY appear in any block at any level; when present, the associated `d` field makes a blinded commitment.

## Version String

Format: `ACDCMmmGggKKKKSSSS.`

| Segment | Encoding | Constraint |
|---------|----------|------------|
| Protocol | `ACDC` | MUST be `ACDC` |
| Version | `Mmm` | Major.minor of ACDC protocol |
| CESR genus | `Ggg` | Major.minor of CESR protocol |
| Serialization+Size | `KKKKSSSSS.` | Kind, size, terminator |

v2.XX implementations MUST support legacy v1.x format.
Stream parser SHOULD use version string to extract/deserialize bodies. Each body in a stream MAY use different serialization.

## ACDC Variants

| Variant | Determination | Effect |
|---------|--------------|--------|
| **Public** | No top-level `u` | SAID not blinded; SHOULD be non-confidential |
| **Private** | Top-level `u` with sufficient entropy | SAID blinded; MAY be confidential; supports Partial Disclosure |
| **Metadata** | Top-level `u` = `""` (empty) | SAID differs from actual private ACDC; only Discloser commitments; `a`/`A` MAY be empty/missing |
| **Targeted** | Issuee `i` present in `a`/`A` top level | Issued to specific AID; `i` MUST be an AID; MUST be "issued by" Issuer and "issued to" Issuee |
| **Untargeted** | No `i` in `a`/`A` | "To whom it may concern"; verifiable authorship only |
| **Compact** | Section values are SAIDs | Orthogonal; applies to any variant; nested sub-blocks MAY independently be compact |

Compact/non-compact and Targeted/Untargeted are orthogonal modifiers combinable with Public/Private/Metadata.

## Message Type (`t` field)

```
determine_t_requirement(msg):
  if serialization is CESR-native (JSON/CBOR/MGPK) AND type is acm → MUST include t
  if type is not acm → MUST include t (regardless of serialization)
  if serialization is non-CESR-native AND type is acm → MAY omit t
  if t absent → assumed type acm
```

Protocol type in version string MUST be `ACDC`.

## Schema Section (`s` field target)

| Field | Type | Constraint |
|-------|------|------------|
| `$id` | str | MUST be bare SAID (no URI prefix); MUST be CESR-encoded; digest MUST have ~128-bit strength; IS the SAID of the entire schema SAD |
| `$schema` | str | MAY; when present for ACDC 1.0 MUST be `"https://json-schema.org/draft/2020-12/schema"`; treated as opaque identifier, MUST NOT dereference |
| `version` | str | MUST be `"major.minor.patch"` semantic version; informative only (not used in validation); `$id` SAID is normative version |

The `s` field at ACDC top level holds the SAID that appears in the schema's `$id`. Only JSON Schema validators supporting bare SAID (non-URI) base URI references are compatible.

## Static Schema Rules

DON'T: Use dynamic schema references or generation mechanisms
DO:    Use only static (SAIDified) schemas; schema MUST be self-contained and immutable

DON'T: Use non-local URI `$id` or `$ref` sub-schema references
DO:    Bundle all sub-schemas; each bundled sub-schema `$id` MUST include its own verifiable SAID

DON'T: Dereference `$schema` as a URI
DO:    Treat `$schema` as opaque identifier; validator MUST control dialect tooling

DON'T: Allow schema dialect mismatch silently
DO:    Mismatch between tooling dialect and `$schema` SHOULD cause validation failure

### Permitted Schema References

- Internal relative `$ref` within static (SAIDified) schema: MAY
- References to external static (SAIDified) schema parts: MAY
- Reference formats: bare SAID, `did:` URI/URL, `sad:` URI (`sad:SAID`), OOBI URL: all MAY
- Relative `$ref` MAY resolve against virtual base URI from top-level `$id` bare SAID

## Schema Versioning

- `version` field MUST be present, MUST be `"major.minor.patch"` format
- `version` is informative; `$id` SAID is normative identifier
- ACDC SHOULD validate regardless of `version` value
- Any schema change affecting `$id` MUST update `version`; backward-incompatible changes MUST bump major version

### Edge Schema Versioning

- Edge block MAY have schema `s` field constraining the pointed-to ACDC
- Edge schema version MAY differ from pointed-to ACDC's schema version
- Backward-compatible: edge schema MAY have higher minor version
- Backward-incompatible: edge schema MUST have higher major version
- On major version break: old ACDCs MUST be revoked+reissued OR edge schema MUST use `oneOf` accepting both versions

## Schema Availability

- ACDCs MUST be verifiable when available
- Schema caches SHOULD be sufficiently available for intended application
- Issuer REQUIRED to satisfy availability constraints imposed by ecosystem governance framework
- Composed bundled static schema MAY be cached/attached to ACDC or provided via highly available store

## Composable Schema Validation

- Compact sections (`a`, `e`, `r`) MAY be represented by their SAID alone
- Provided ACDC MUST validate against an allowed `oneOf` combination
- Schema MUST validate as SAD against its SAID
- Schema MUST validate against one of its `oneOf` variants
- Non-schema sections (`a`, `e`, `r`) compliance MUST be enforced via composed schema
- Validator SHOULD enforce compliance of composed schema for expected ACDC type

## Algorithm: Most Compact Form SAID

Computes the unique deterministic SAID for any ACDC or section, enabling Graduated Disclosure.

**Constraints (R33-R37):**
- Each compactable block MUST have exactly one SAID regardless of `oneOf` variants
- MUST be one unambiguous way to compute a block's SAID
- Compact form MUST be first variant in `oneOf` subschema list
- Leaf block SAID MUST be computed on full expanded representation
- Non-SAIDed subblocks with `oneOf`: use most fully expanded variant for enclosing SAID

**Procedure:**

1. [ ] Identify all SAIDed subblocks (blocks with `d` field)
2. [ ] Depth-first traversal over SAIDed subblock fields:
   - a. Descend to leaf blocks
   - b. For each leaf: expand all fields; for non-SAIDed `oneOf` subblocks use most expanded variant; compute SAID; replace leaf with SAID
   - c. Ascend: expand non-SAIDed subblock fields; keep SAIDed subblocks as SAIDs; compute SAID; replace with SAID
   - d. Continue ascending until top-level block reached
3. [ ] Final SAID at top level = "most compact form" SAID

**Verification (reverse):**
1. [ ] Expand block; verify SAID against expanded form
2. [ ] Expand enclosed blocks; verify their SAIDs
3. [ ] Repeat depth-wise to leaves

The `A` (Aggregate) section does NOT use this algorithm; it has its own compact/expanded mechanism.

## Security: Schema Attacks

DON'T: Use dynamic schema references
DO:    Use only static SAIDified schemas (prevents both attacks below)

| Attack | Mechanism | Impact |
|--------|-----------|--------|
| Schema revocation | Adversary changes dynamic schema at source | All referencing ACDCs fail validation |
| Semantic malleability | Adversary shifts schema semantics; ACDCs still pass validation | Downstream processing compromised (transaction malleability) |

## Ambiguities

1. **`a`/`A` mutual exclusion:** R22 prohibits co-presence of fields; R23 prohibits both having non-empty values. Conservative: prohibit co-presence of both fields.
2. **SAID mismatch handling:** Spec implies verification failure but does not specify required error behavior.
3. **Schema availability:** Constraints delegated to Ecosystem Governance Framework; spec only provides SHOULD (R79).
