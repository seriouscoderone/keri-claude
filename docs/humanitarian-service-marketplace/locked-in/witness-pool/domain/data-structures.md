# Data Structures — locked-in-witness-pool

> KERI protocol data structures used by components in the **witness-pool** stack.

## Data Structure Catalog

| Name | Type | Serialization Formats | Used By Components |
|------|------|-----------------------|--------------------|
| InceptionEvent | key-event | cesr, json, cbor, msgpack | witness-event-log-engine, witness-receipting-service |
| RotationEvent | key-event | cesr, json, cbor, msgpack | witness-event-log-engine, witness-receipting-service |
| InteractionEvent | key-event | cesr, json, cbor, msgpack | witness-event-log-engine, witness-receipting-service |
| NonTransferableReceipt | receipt | cesr, json | witness-receipting-service |
| KeyState | key-state | json | witness-event-log-engine |

---

## Structure Details

### InceptionEvent

**Type:** key-event

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Must match version regex `KERIvvSSSSSSSSSS_` | Version string (e.g., `KERI10JSON00011c_`) |
| t | string | Must be `icp` | Event type identifier |
| d | string | Must be valid CESR-qualified digest | SAID — self-addressing identifier |
| i | string | Must equal `d` for self-addressing AIDs | AID prefix |
| s | string | Must be `0` | Sequence number (always 0 for inception) |
| kt | string | Must be valid threshold expression | Signing threshold |
| k | string[] | Length must satisfy signing threshold | Current signing keys (CESR-qualified) |
| nt | string | Must be valid threshold expression | Next key threshold (pre-rotation) |
| n | string[] | Must be valid CESR-qualified digests | Next key digests (pre-rotation commitment) |
| bt | string | Must be <= number of witnesses | Witness threshold (KAACE backer threshold) |
| b | string[] | Must be valid AID prefixes | Witness AID prefixes (backers) |
| c | string[] | Valid trait codes | Configuration traits |
| a | object[] | Valid seal structures | Anchored seals (optional) |

#### Serialization

**CESR Encoding:**
- Qualified base-64 with type prefix codes
- Version string determines serialization kind (JSON, CBOR, MGPK)
- SAID field (`d`) is self-referencing digest of the serialized structure

**JSON Mapping:**
- Single-character field names map directly to JSON keys
- Arrays as JSON arrays; key lists as arrays of CESR-qualified strings
- Sequence number serializes as string in JSON (hex for large values)

#### Validation Rules

1. `d` field MUST equal the digest of the event serialized with `d` set to placeholder (`#` * digest length)
2. `i` field MUST equal `d` for self-addressing AIDs
3. `s` field MUST be `0`
4. Number of keys in `k` MUST satisfy threshold `kt`
5. `bt` MUST be <= length of `b`
6. All keys in `k` MUST be valid CESR-qualified public keys
7. All digests in `n` MUST be valid CESR-qualified digests

#### Example (Annotated)

```json
{
  "v": "KERI10JSON00011c_",
  "t": "icp",
  "d": "EBfxc4RiVY6...",
  "i": "EBfxc4RiVY6...",
  "s": "0",
  "kt": "1",
  "k": ["DAbWjobbaJre..."],
  "nt": "1",
  "n": ["EDibgLbxRNJI..."],
  "bt": "2",
  "b": ["BDf2KYVjpT2r...", "BD8UaA0NfCz7..."],
  "c": [],
  "a": []
}
```

---

### RotationEvent

**Type:** key-event

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Must match version regex | Version string |
| t | string | Must be `rot` | Event type identifier |
| d | string | Must be valid CESR-qualified digest | SAID |
| i | string | Must match inception prefix | AID prefix |
| s | string | Must be prior sn + 1 | Sequence number |
| p | string | Must match SAID of event at sn - 1 | Prior event SAID |
| kt | string | Must be valid threshold expression | New signing threshold |
| k | string[] | Key digests must match prior `n` field | New signing keys |
| nt | string | Must be valid threshold expression | New next key threshold |
| n | string[] | Must be valid CESR-qualified digests | New next key digests |
| bt | string | Must be <= total witness count after changes | New witness threshold |
| br | string[] | Must be current witnesses | Witnesses to remove |
| ba | string[] | Must be valid AID prefixes | Witnesses to add |
| a | object[] | Valid seal structures | Anchored seals |

#### Validation Rules

1. `s` MUST equal prior event's `s` + 1
2. `p` MUST equal prior event's `d` (SAID chaining)
3. Digests of keys in `k` MUST match prior event's `n` field entries
4. `bt` MUST be <= (current witnesses - `br` + `ba`)
5. All entries in `br` MUST be in current witness list
6. SAID validation: `d` = digest of event with `d` as placeholder

---

### InteractionEvent

**Type:** key-event

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Must match version regex | Version string |
| t | string | Must be `ixn` | Event type identifier |
| d | string | Must be valid CESR-qualified digest | SAID |
| i | string | Must match inception prefix | AID prefix |
| s | string | Must be prior sn + 1 | Sequence number |
| p | string | Must match SAID of event at sn - 1 | Prior event SAID |
| a | object[] | Valid seal structures | Anchored seals (TEL seals, delegation seals) |

#### Validation Rules

1. `s` MUST equal prior event's `s` + 1
2. `p` MUST equal prior event's `d`
3. Interaction events do NOT change key state — signing keys remain unchanged
4. Signatures MUST verify against current signing keys (from most recent establishment event)
5. SAID validation applies

#### Example (Annotated)

```json
{
  "v": "KERI10JSON000098_",
  "t": "ixn",
  "d": "EGpfIxLa0c0F...",
  "i": "EBfxc4RiVY6...",
  "s": "3",
  "p": "EHpD0-CDWOdu...",
  "a": [
    {
      "i": "EQzFVaMasUf4...",
      "s": "0",
      "d": "EQzFVaMasUf4..."
    }
  ]
}
```

---

### NonTransferableReceipt

**Type:** receipt

Witnesses MUST use non-transferable AIDs (`B` prefix for Ed25519). Their receipts use the `rct` type. The signature target is the **receipted event's serialization**, not the receipt body.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Must match version regex | Version string |
| t | string | Must be `rct` (non-transferable receipt) | Event type |
| d | string | Must match receipted event's `d` field | SAID of the **receipted event** (NOT the receipt itself) |
| i | string | Must be valid AID prefix | AID of receipted event's controller |
| s | string | Must match receipted event's sn (hex) | Sequence number of receipted event |

Note: Signatures attach via CESR unindexed couplets (Cigar = verfer + signature), signing the receipted event's serialization.

#### Validation Rules

1. Witness signature MUST verify against the witness's non-transferable AID public key
2. Signature target is the **receipted event's serialization**, not the receipt message body
3. `d` MUST equal the receipted event's SAID
4. `i` and `s` MUST match the receipted event's controller prefix and sequence number
5. Witness AID MUST be non-transferable (`B` prefix for Ed25519)

---

### KeyState

**Type:** key-state

Derived data structure — computed by replaying the KEL, not stored as a protocol message.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| i | string | Must be valid AID | AID prefix |
| s | string | Must match latest applied event | Current sequence number |
| d | string | Must be valid digest | SAID of latest event |
| k | string[] | Must be CESR-qualified public keys | Current signing keys |
| kt | string | Must be valid threshold | Current signing threshold |
| n | string[] | Must be CESR-qualified digests | Next key digests |
| nt | string | Must be valid threshold | Next key threshold |
| b | string[] | Must be valid AID prefixes | Current witness list |
| bt | string | Must be <= witness count | Current witness threshold |

#### Validation Rules

1. Key state MUST be derivable by replaying the full KEL from inception
2. Two independent replays of the same KEL MUST produce identical key state (determinism)
3. Key state is never persisted as authoritative — always recomputable from the KEL

---

## CESR Encoding Notes

All KERI data structures use CESR (Composable Event Streaming Representation) for encoding cryptographic primitives:

- **Prefix codes** identify the primitive type (e.g., `D` = Ed25519 public key, `E` = Blake3-256 digest)
- **qb64** is the qualified base-64 representation; **qb2** is the binary equivalent
- **SAID** (Self-Addressing Identifier) is a content digest embedded within the structure itself — the `d` field
- **Version string** format: `KERIvvSSSSSSSSSS_` where `vv` = version, `SSSSSSSSSS` = hex-encoded size

## Cross-Structure References

- **InceptionEvent.i** (AID prefix) is referenced by all subsequent events via their `i` field
- **Event.d** (SAID) is referenced by the next event via its `p` field (SAID chaining)
- **Event.d** (SAID) is referenced by Receipts via their seal's `d` field
- **RotationEvent.ba/br** modify the witness list from inception's `b` field
- **InteractionEvent.a** (seals) anchor external data (TEL events, delegations) into the KEL
