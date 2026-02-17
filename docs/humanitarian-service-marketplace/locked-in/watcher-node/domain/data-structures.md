# Data Structures — locked-in-watcher

> KERI protocol data structures used by components in the **watcher-node** stack.

## Data Structure Catalog

| Name | Type | Serialization Formats | Used By Components |
|------|------|-----------------------|--------------------|
| InceptionEvent | key-event | cesr, json, cbor, msgpack | watcher-event-log-engine, watcher-duplicity-service |
| RotationEvent | key-event | cesr, json, cbor, msgpack | watcher-event-log-engine, watcher-duplicity-service |
| InteractionEvent | key-event | cesr, json, cbor, msgpack | watcher-event-log-engine, watcher-duplicity-service |
| Receipt | receipt | cesr, json | watcher-duplicity-service |
| DuplicityEvidence | key-event | json | watcher-duplicity-service |
| KeyState | key-state | json | watcher-event-log-engine |

---

## Structure Details

### InceptionEvent, RotationEvent, InteractionEvent

These structures are identical to those defined in the witness-pool data structures. The watcher processes the same event types but does not generate receipts — it only validates and records first-seen.

See `docs/humanitarian-service-marketplace/locked-in/witness-pool/domain/data-structures.md` for full field definitions.

---

### Receipt

**Type:** receipt

The watcher collects receipts from witnesses during periodic sync to verify witness attestation. It does NOT generate its own receipts.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Must match version regex | Version string |
| t | string | `vrc` (transferable) or `rct` (non-transferable) | Event type |
| d | string | Valid CESR-qualified digest | SAID of receipt |
| i | string | Valid AID prefix | Receipted event controller AID |
| s | string | Must match receipted event | Receipted event sequence number |
| a | object | Must contain receipted event SAID | Seal referencing receipted event |

#### Validation Rules

1. Receipt signature MUST verify against the issuing witness's current signing keys
2. `i` and `s` MUST match the receipted event's controller prefix and sequence number
3. The watcher verifies receipts to confirm witness attestation but does not generate them

---

### DuplicityEvidence

**Type:** key-event (composite)

Watcher-specific structure that bundles all conflicting versions of an event at the same (prefix, sn).

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| prefix | string | Valid AID | AID prefix of the duplicitous controller |
| sn | string | Non-negative integer | Sequence number where duplicity was detected |
| variants | object[] | At least 2 entries with different SAIDs | All versions of the event |
| detection_time | string | Valid ISO 8601 timestamp | When duplicity was detected |
| source_witnesses | string[] | Valid AID prefixes | Witnesses that provided conflicting events |

#### Validation Rules

1. At least two variants MUST exist with different SAIDs
2. Each variant MUST be a structurally valid key event
3. All variants MUST share the same (prefix, sn)
4. Evidence MUST NOT be modified after recording — immutable audit trail

#### Example (Annotated)

```json
{
  "prefix": "EBfxc4RiVY6...",
  "sn": "5",
  "variants": [
    {
      "d": "EGpfIxLa0c0F...",
      "t": "ixn",
      "s": "5",
      "a": [{"i": "EQzFVaMasUf4...", "s": "0", "d": "EQzFVaMasUf4..."}]
    },
    {
      "d": "EHnR7uBz9kQp...",
      "t": "ixn",
      "s": "5",
      "a": [{"i": "EXyZ8aBc1d2E...", "s": "0", "d": "EXyZ8aBc1d2E..."}]
    }
  ],
  "detection_time": "2026-02-17T12:00:00Z",
  "source_witnesses": ["BDf2KYVjpT2r...", "BD8UaA0NfCz7..."]
}
```

---

### KeyState

**Type:** key-state

Derived data structure computed by replaying the KEL. Identical to the witness-pool KeyState definition.

See `docs/humanitarian-service-marketplace/locked-in/witness-pool/domain/data-structures.md` for full field definitions.

---

## CESR Encoding Notes

Same CESR encoding conventions as the witness-pool. All cryptographic primitives use qualified base-64 (qb64) with type prefix codes.

## Cross-Structure References

- **InceptionEvent.b** (witness list) is used by the OOBI Resolver to discover witness endpoints for periodic sync
- **Event.d** (SAID) is compared across witnesses during sync — mismatches indicate duplicity
- **DuplicityEvidence.variants[].d** preserves the SAIDs of all conflicting event versions
- **Receipt.a** (seal) references the event SAID, allowing the watcher to verify witness attestation
