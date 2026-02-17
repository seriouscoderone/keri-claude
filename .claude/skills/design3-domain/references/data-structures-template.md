# Data Structures — {stack.name}

> KERI protocol data structures used by components in the **{stack.type}** stack.

## Data Structure Catalog

| Name | Type | Serialization Formats | Used By Components |
|------|------|-----------------------|--------------------|
| {ds.name} | {ds.type} | {ds.serialization[].format} | {component names} |

---

## Structure Details

### {data_structure.name}

**Type:** {data_structure.type}

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| {field.name} | {field.type} | {field.constraints} | {field.description} |

#### Serialization

**CESR Encoding:**
- Qualified base-64 representation with type prefix codes
- Version string determines serialization kind (JSON, CBOR, MGPK)
- SAID field (`d`) is self-referencing digest of the serialized structure

**JSON Mapping:**
- Field names map directly to JSON keys (single-character abbreviations)
- Arrays serialize as JSON arrays; nested objects as JSON objects
- Numeric fields (sequence numbers, thresholds) serialize as strings in JSON

#### Validation Rules

1. {Validation rule — what MUST be true for this structure to be valid}
2. {Additional validation rules}

#### Example (Annotated)

```json
{
  "v": "KERI10JSON00011c_",   // Version string: protocol + encoding + size
  "t": "{type_code}",          // Event type identifier
  "d": "EBfxc4...",            // SAID — digest of this structure
  ...
}
```

---

*Repeat "Structure Details" section for each data structure in the domain.*

---

## CESR Encoding Notes

All KERI data structures use CESR (Composable Event Streaming Representation) for encoding cryptographic primitives:

- **Prefix codes** identify the primitive type (e.g., `D` = Ed25519 public key, `E` = Blake3-256 digest)
- **qb64** is the qualified base-64 representation; **qb2** is the binary equivalent
- **SAID** (Self-Addressing Identifier) is a content digest embedded within the structure itself — the `d` field
- **Version string** format: `KERIvvSSSSSSSSSS_` where `vv` = version, `SSSSSSSSSS` = hex-encoded size

## Cross-Structure References

How data structures reference each other:

- **InceptionEvent.i** (AID prefix) is referenced by all subsequent events via their `i` field
- **Event.d** (SAID) is referenced by Receipts via their `d` field
- **ACDC.d** (SAID) is referenced by TEL events via their `i` field
- **InteractionEvent.a** (seals) anchors TEL events and delegations into the KEL
