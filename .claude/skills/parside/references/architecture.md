# Parside Architecture

## Role in the KERI Stack

```
┌─────────────────────────────────────────────┐
│  Application Layer (keriox, keria, keripy)  │
│  KEL validation, signature verification,     │
│  event state, delegation, witness logic      │
├─────────────────────────────────────────────┤
│  parside — CESR Stream Parser               │
│  Byte stream → structured Message/Group     │
│  Cold start detection, counter dispatch,     │
│  round-trip serialization (qb64/qb2)         │
├─────────────────────────────────────────────┤
│  cesride — CESR Primitives                  │
│  Verfer, Diger, Siger, Cigar, Counter, etc. │
│  Qualified encoding, crypto operations       │
├─────────────────────────────────────────────┤
│  Cryptographic Layer (libsodium, blake3)     │
└─────────────────────────────────────────────┘
```

## What Parside Does

- Parses CESR byte streams into typed `Message` and `CesrGroup` structures
- Detects serialization format via cold start tritet (top 3 bits of first byte)
- Routes JSON/CBOR/MGPK payloads to `CustomPayload` (generic `serde_json::Value`)
- Routes CESR-encoded material to `CesrGroup` via counter code dispatch
- Provides round-trip serialization: parse → modify → `qb64()` back to bytes
- Handles both qb64 (text/Base64) and qb2 (binary) domains

## What Parside Does NOT Do

- **No KEL validation** — does not verify event sequence rules or state
- **No signature verification** — parses signatures but never verifies them
- **No key state tracking** — no identifier state machines or databases
- **No event semantics** — does not interpret event types (icp, rot, ixn, etc.)
- **No delegation logic** — no delegated event handling
- **No witness/watcher behavior** — purely structural parsing
- **No networking/IO** — pure synchronous parsing functions, no async

Parside is a **structural decoder**. It answers "what CESR groups are in this byte stream?" not "is this a valid KERI message?".

## Companion Skills

| Skill | Defers to for |
|-------|--------------|
| **cesride** | Individual primitive API (Verfer, Diger, Siger constructors, Matter/Indexer traits) |
| **cesr** | Encoding theory, code table registry, SAID algorithm, composability rules |
| **spec** | Event types, KEL rules, delegation, witness agreement, pre-rotation |
| **acdc** | Credential structure, graduated disclosure, TEL registries |

## Dependencies

| Crate | Role |
|-------|------|
| `cesride 0.6.0` | All CESR primitive types and Counter |
| `nom ~7.1` | Parser combinator framework |
| `serde` + `serde_json` | JSON payload parsing, typed deserialization |
| `serde_cbor` | CBOR payload parsing |
| `rmp-serde` | MessagePack payload parsing |
| `thiserror` | Error derive macro |
| `anyhow` | Error propagation |

## Key Design Decisions

1. **nom for combinators** — All group parsing uses nom's `count`, `many0`, `tuple`. The `nomify!` macro bridges parside's `ParsideResult` to nom's `IResult`.

2. **Cold code is internal** — `ColdCode` is `pub(crate)`, not exposed. Callers use `Message::from_stream_bytes()` which handles routing transparently.

3. **Parsers are factories** — `Parsers::siger_parser(&cold_code)` returns a function pointer, not a parsed value. This lets nom compose parsers before executing them.

4. **All payloads become JsonValue** — JSON, CBOR, and MGPK all deserialize to `serde_json::Value`. Wire format is lost after parsing.

5. **Groups are enums, not traits** — `CesrGroup` is a closed enum with 12 variants, not an open trait. Adding new group types requires modifying the enum and dispatch.
