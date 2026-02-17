---
name: parside
description: >
  Rust CESR stream parser for KERI protocol. Auto-activates when working with
  parside imports, CESR stream parsing, Message/MessageList/CesrGroup types,
  counter-code group dispatch, cold start detection, or Rust CESR group
  construction/serialization. Covers the full API: stream-level parsing,
  12 CESR group types, round-trip qb64/qb2 serialization, and nom integration.
  Defers to cesride for primitive API, cesr-spec for encoding theory,
  keri-spec for protocol semantics.
---

# parside — Rust CESR Stream Parser

## Overview

parside is a Rust library for parsing CESR (Composable Event Streaming Representation)
byte streams into structured types. It sits one layer above cesride in the KERI stack:
where cesride handles individual cryptographic primitives (Verfer, Diger, Siger, etc.),
parside handles stream-level framing — detecting serialization format via cold start,
dispatching counter-coded groups, and parsing interleaved JSON/CBOR/MGPK payloads.

parside is a **structural decoder only**. It does not validate KELs, verify signatures,
or track key state. It answers "what CESR groups are in this byte stream?" — protocol
semantics are the responsibility of higher layers (keriox, keripy).

Key design: all parsing is synchronous, stateless, and uses nom combinators. Every
parsed group supports round-trip serialization via `qb64()` / `qb2()`.

## Quick Reference

| Type | Purpose |
|------|---------|
| `Message` | Sum type: `Custom { CustomPayload }` or `Group { CesrGroup }` |
| `MessageList` | Parse multiple messages from a byte stream |
| `CustomPayload` | JSON/CBOR/MGPK payload as `serde_json::Value` |
| `CesrGroup` | Enum of 12 CESR group variants |
| `Group<T>` | Trait: `CODE`, `new()`, `value()`, `qb64()`, `qb2()`, `full_size()` |
| `GroupItem` | Trait: `qb64()`, `qb64b()`, `qb2()`, `full_size()` |
| `ControllerIdxSigs` | `-A` counter: indexed controller signatures |
| `WitnessIdxSigs` | `-B` counter: indexed witness signatures |
| `NonTransReceiptCouples` | `-C` counter: non-transferable receipt couples (Verfer+Cigar) |
| `TransReceiptQuadruples` | `-D` counter: transferable receipt quadruples |
| `FirstSeenReplayCouples` | `-E` counter: first-seen replay couples (Seqner+Dater) |
| `TransIdxSigGroups` | `-F` counter: transferable indexed sig groups (nested) |
| `SealSourceCouples` | `-G` counter: seal source couples (Seqner+Saider) |
| `TransLastIdxSigGroups` | `-H` counter: transferable last idx sig groups (nested) |
| `SadPathSigs` | `-J` counter: SAD path signatures (deeply nested) |
| `SadPathSigGroups` | `-K` counter: SAD path sig groups (doubly nested) |
| `PathedMaterialQuadlets` | `-L` counter: raw unparsed CESR material |
| `AttachedMaterialQuadlets` | `-V` counter: recursive container of CesrGroups |
| `ParsideError` | Error enum: 6 variants |

## Import Guide

```rust
// Top-level types (re-exported from lib.rs)
use parside::{Message, MessageList, CesrGroup, CustomPayload, Group};

// Group types (re-exported via groups::*)
use parside::{
    ControllerIdxSigs, ControllerIdxSig,
    WitnessIdxSigs, WitnessIdxSig,
    NonTransReceiptCouples, NonTransReceiptCouple,
    TransReceiptQuadruples, TransReceiptQuadruple,
    FirstSeenReplayCouples, FirstSeenReplayCouple,
    TransIdxSigGroups, TransIdxSigGroup,
    SealSourceCouples, SealSourceCouple,
    TransLastIdxSigGroups, TransLastIdxSigGroup,
    SadPathSigs, SadPathSig,
    SadPathSigGroups, SadPathSigGroup,
    PathedMaterialQuadlets, PathedMaterialQuadlet,
    AttachedMaterialQuadlets,
    GroupItem,
};

// Errors
use parside::error::{ParsideError, ParsideResult};

// cesride primitives (used within group items)
use cesride::{Siger, Cigar, Verfer, Prefixer, Seqner, Saider, Dater, Pather, Counter};
use cesride::{Matter, Indexer};  // traits for .code(), .qb64(), .raw(), etc.
```

## Reference Files

| File | Contents | Size |
|------|----------|------|
| `references/architecture.md` | KERI stack position, boundaries, companion skills | ~2KB |
| `references/api.md` | Parsing mental model, Message/MessageList/CesrGroup API, Group/GroupItem traits, invariants | ~4KB |
| `references/types.md` | Counter code mapping table, nesting hierarchy, all 12 group structs with fields | ~5KB |
| `references/stream.md` | Cold start tritet dispatch, ColdCode routing, CustomPayload deserialization, KERI version compat | ~3KB |
| `references/primitives.md` | Parsers factory methods, qb64/qb2 size math, nomify! macro, special cases (Cigar, siger_list) | ~3KB |
| `references/errors.md` | ParsideError variants, error origin mapping, recoverability, From conversions | ~2KB |

## Usage Patterns

### Parse a KERI message stream
```rust
let (rest, list) = MessageList::from_stream_bytes(stream_bytes)?;
for msg in &list.messages {
    match msg {
        Message::Custom { value } => {
            // JSON/CBOR/MGPK payload
            let v_field = value.value["v"].as_str();
        }
        Message::Group { value } => {
            // CESR attachment group
            match value {
                CesrGroup::ControllerIdxSigsVariant { value: sigs } => {
                    for sig in &sigs.value {
                        let idx = sig.siger.index();
                    }
                }
                // ... other variants
            }
        }
    }
}
```

### Construct and serialize a group
```rust
let sigs = ControllerIdxSigs::new(vec![
    ControllerIdxSig::new(siger),
]);
let qb64_string = sigs.qb64()?;   // includes "-AAB" counter prefix
let qb64_bytes = sigs.qb64b()?;
```

### Round-trip parse and serialize
```rust
let (rest, group) = CesrGroup::from_stream_bytes(original)?;
let reserialized = group.qb64()?;
assert_eq!(reserialized.as_bytes(), original);
```

### Extract typed KERI event
```rust
let (_, msg) = Message::from_stream_bytes(json_bytes)?;
let event: MyKeriEvent = msg.typed_payload()?;
```

## Anti-Patterns

**DON'T** assume `count()` returns item count for AttachedMaterialQuadlets.
**DO** use `value().len()` for item count. AMQ's `count()` returns quadlet count.

**DON'T** call `payload()` or `cesr_group()` without checking the variant.
**DO** pattern match on `Message::Custom` / `Message::Group`.

**DON'T** expect error details from nom-path failures.
**DO** know that `nomify!` erases all error detail to `ErrorKind::IsNot`.

**DON'T** assume PathedMaterialQuadlets parses its internal structure.
**DO** treat `PathedMaterialQuadlet.raw` as opaque bytes for application-level parsing.

**DON'T** forget that Cigar parsing consumes a Verfer first.
**DO** account for `verfer.full_size() + cigar.full_size()` total bytes.
