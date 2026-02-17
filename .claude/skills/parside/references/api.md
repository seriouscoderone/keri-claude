# Parside API Reference

## Parsing Mental Model

```
Byte Stream
    │
    ▼ first byte >> 5 (tritet)
    ├── 0b001 (CtB64) ──┐
    ├── 0b010 (OpB64) ──┼──► CesrGroup::from_stream_bytes()
    ├── 0b111 (CtOpB2) ─┘        │ parse Counter
    │                            │ dispatch on counter.code()
    │                            ▼
    │                    CesrGroup enum (12 variants)
    │
    ├── 0b011 (Json)  ──► CustomPayload::from_json_stream()
    ├── 0b101 (Cbor)  ──► CustomPayload::from_cbor_stream()
    ├── 0b100 (MGPK1) ─┐
    ├── 0b110 (MGPK2) ─┴► CustomPayload::from_mgpk_stream()
    │
    └── 0b000 (Free)  ──► Err(Unexpected)

All paths return: ParsideResult<(&[u8], Message)>
                            rest ──┘     └── Custom { CustomPayload }
                                              or Group { CesrGroup }
```

## Public Types

### Message
```rust
pub enum Message {
    Custom { value: CustomPayload },
    Group { value: CesrGroup },
}
```

| Method | Signature | Returns |
|--------|-----------|---------|
| `from_stream_bytes` | `(bytes: &[u8]) -> ParsideResult<(&[u8], Message)>` | Parses one message, returns rest |
| `payload` | `(&self) -> ParsideResult<&CustomPayload>` | Err(NotExist) if Group |
| `typed_payload` | `<D: DeserializeOwned>(&self) -> ParsideResult<D>` | Err(NotExist) if Group |
| `cesr_group` | `(&self) -> ParsideResult<&CesrGroup>` | Err(NotExist) if Custom |

### MessageList
```rust
pub struct MessageList {
    pub messages: Vec<Message>,
}
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `from_stream_bytes` | `(bytes: &[u8]) -> ParsideResult<(&[u8], MessageList)>` | Uses `many0` — parses until failure, returns unparsable rest |

### CustomPayload
```rust
pub struct CustomPayload {
    pub value: JsonValue,  // serde_json::Value
}
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `to_typed_message` | `<D: DeserializeOwned>(&self) -> ParsideResult<D>` | Via `serde_json::from_value` |

### CesrGroup
```rust
pub enum CesrGroup {
    ControllerIdxSigsVariant { value: ControllerIdxSigs },
    WitnessIdxSigsVariant { value: WitnessIdxSigs },
    NonTransReceiptCouplesVariant { value: NonTransReceiptCouples },
    TransReceiptQuadruplesVariant { value: TransReceiptQuadruples },
    TransIdxSigGroupsVariant { value: TransIdxSigGroups },
    TransLastIdxSigGroupsVariant { value: TransLastIdxSigGroups },
    FirstSeenReplayCouplesVariant { value: FirstSeenReplayCouples },
    SealSourceCouplesVariant { value: SealSourceCouples },
    AttachedMaterialQuadletsVariant { value: AttachedMaterialQuadlets },
    SadPathSigGroupVariant { value: SadPathSigGroups },
    SadPathSigVariant { value: SadPathSigs },
    PathedMaterialQuadletsVariant { value: PathedMaterialQuadlets },
}
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `from_stream_bytes` | `(bytes: &[u8]) -> ParsideResult<(&[u8], CesrGroup)>` | Parses counter, dispatches by code |

CesrGroup also implements `GroupItem` — delegates qb64/qb64b/qb2/full_size to inner variant.

## Traits

### Group\<T: GroupItem\>
```rust
pub trait Group<T: GroupItem> {
    const CODE: &'static str;
    fn new(value: Vec<T>) -> Self;
    fn value(&self) -> &Vec<T>;
    fn counter(&self) -> ParsideResult<Counter>;  // default impl
    fn count(&self) -> ParsideResult<u32>;         // default impl
    fn qb64(&self) -> ParsideResult<String>;       // default impl
    fn qb64b(&self) -> ParsideResult<Vec<u8>>;     // default impl
    fn qb2(&self) -> ParsideResult<Vec<u8>>;       // default impl
    fn full_size(&self) -> ParsideResult<usize>;    // default impl
}
```

Default `qb64()`: `counter.qb64() + items.map(qb64).join("")`

### GroupItem
```rust
pub trait GroupItem {
    fn qb64(&self) -> ParsideResult<String>;
    fn qb64b(&self) -> ParsideResult<Vec<u8>>;
    fn qb2(&self) -> ParsideResult<Vec<u8>>;
    fn full_size(&self) -> ParsideResult<usize>;
}
```

## Public Re-exports (lib.rs)

`CesrGroup`, `CustomPayload`, `Group`, `Message`, `MessageList`

Plus all group container and item types via `pub use groups::*`.

## Invariants

- `group.count()? == group.value().len() as u32` for all groups except AttachedMaterialQuadlets
- AttachedMaterialQuadlets: `count()? == full_size()? as u32 / 4 - 1` (quadlet count, not item count)
- `group.qb64()?.len() == group.full_size()?`
- `group.qb2()?.len() == group.full_size()? / 4 * 3`
- Round-trip: `CesrGroup::from_stream_bytes(group.qb64()?.as_bytes())` reconstructs equivalent group
- `MessageList::from_stream_bytes` never fails on valid prefix — stops at first unparsable byte, returns rest
