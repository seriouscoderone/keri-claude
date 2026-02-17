# Stream Framing and Dispatch

## Cold Start Detection

The first byte of any CESR stream determines the serialization format. Extract the **tritet** (top 3 bits):

```
tritet = byte >> 5
```

| Tritet | Binary | ColdCode | Routes to |
|--------|--------|----------|-----------|
| 0 | `000` | `Free` | Err(Unexpected) — unassigned |
| 1 | `001` | `CtB64` | `CesrGroup::from_stream_bytes` (Counter in Base64) |
| 2 | `010` | `OpB64` | `CesrGroup::from_stream_bytes` (OpCode in Base64) |
| 3 | `011` | `Json` | `CustomPayload::from_json_stream` |
| 4 | `100` | `MGPK1` | `CustomPayload::from_mgpk_stream` (Fixed Map) |
| 5 | `101` | `Cbor` | `CustomPayload::from_cbor_stream` |
| 6 | `110` | `MGPK2` | `CustomPayload::from_mgpk_stream` (Big Map) |
| 7 | `111` | `CtOpB2` | `CesrGroup::from_stream_bytes` (Counter/OpCode in Binary) |

**Why this works:** JSON starts with `{` (0x7B = 0b011...), CBOR maps start with 0xA_ (0b101...), MGPK fixed maps start with 0x8_ (0b100...). CESR counter codes in qb64 start with `-` (0x2D = 0b001...).

`ColdCode` is `pub(crate)` — not exposed to callers.

## Message-Level Parsing

### Single message
```rust
let (rest, msg) = Message::from_stream_bytes(bytes)?;
```
1. Check empty → Err(EmptyBytesStream)
2. `ColdCode::try_from(bytes[0])?` — tritet dispatch
3. Route to CesrGroup or CustomPayload parser
4. Wrap result in `Message::Group` or `Message::Custom`

### Multi-message stream
```rust
let (rest, list) = MessageList::from_stream_bytes(bytes)?;
```
1. Check empty → Err(EmptyBytesStream)
2. `nom::multi::many0(nomify!(Message::from_stream_bytes))(bytes)`
3. Parses as many messages as possible
4. Returns `(unparsable_rest, MessageList)`

**Behavior:** `many0` stops at first parse failure and returns accumulated results. Unparsable trailing bytes are returned as `rest`, not as an error.

## CesrGroup Counter Dispatch

After cold start routes to CESR:

```rust
let cold_code = ColdCode::try_from(bytes[0])?;
let (rest, counter) = Parsers::counter_parser(&cold_code)?(bytes)?;
match counter.code().as_str() {
    AttachedMaterialQuadlets::CODE => /* -V */ ...,
    ControllerIdxSigs::CODE       => /* -A */ ...,
    WitnessIdxSigs::CODE          => /* -B */ ...,
    // ... 9 more variants
    _ => Err(Unexpected),
}
```

Each branch calls `GroupType::from_stream_bytes(rest, &counter, &cold_code)`.

## CustomPayload Deserialization

All three formats use streaming deserializers that consume exactly one value:

| Format | Deserializer | Position tracking |
|--------|-------------|-------------------|
| JSON | `serde_json::Deserializer::from_slice().into_iter()` | `stream.byte_offset()` |
| CBOR | `serde_cbor::Deserializer::from_slice().into_iter()` | `stream.byte_offset()` |
| MGPK | `rmp_serde::Deserializer::new(Cursor::new(s))` | `deser.get_ref().position()` |

All produce `serde_json::Value` as the internal representation. Wire format is lost after parsing.

**Typed extraction:**
```rust
let event: MyKeriEvent = payload.to_typed_message()?;
// internally: serde_json::from_value(self.value.to_owned())
```

## KERI Version String Compatibility

Parside handles both KERI version formats transparently:

| Version | Format | Length | Terminator | Example |
|---------|--------|--------|-----------|---------|
| V1 (1.XX) | `PPPP vv KKKK llllll _` | 17 chars | `_` | `KERI10JSON000091_` |
| V2 (2.XX) | `PPPP Mmm Ggg KKKK BBBB .` | 19 chars | `.` | `KERICAACAAJSONAACP.` |

Both are JSON-serialized, so cold start detection routes them to `CustomPayload::from_json_stream`. The version string is just a field value — parside parses the JSON without interpreting version semantics.

## Typical KERI Message Stream

A KERI message stream typically interleaves payloads and attachment groups:

```
[JSON event payload] [CESR attachment group] [CESR attachment group] ...
     Message::Custom      Message::Group           Message::Group
```

Example: `{icp event json}` + `-AAB{controller sigs}` + `-BAB{witness sigs}`

MessageList parses all three as separate Message entries.
