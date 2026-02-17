---
name: keriox-skill
description: >
  Rust KERI protocol implementation (keriox). Auto-activates when working with keriox imports,
  keriox_core types, keriox_sdk Controller/Identifier, KERI event processing in Rust,
  redb database operations, witness/watcher components, or Rust TEL (teliox) processing.
  Covers the full API: event construction, processor pipeline, escrow system, database traits,
  transport abstraction, controller lifecycle, and component configuration.
  For protocol semantics see keri-spec; for CESR encoding see cesr-spec; for credentials see acdc-spec.
---

# keriox — Rust KERI Protocol Implementation

## Overview

keriox is a production Rust implementation of the KERI (Key Event Receipt Infrastructure) protocol,
developed by the Human Colossus Foundation. It provides a complete workspace of crates covering
core protocol logic, high-level SDK, infrastructure components (witness, watcher, controller),
and TEL (Transaction Event Log) support via teliox.

The codebase uses redb (embedded key-value store) for storage, rkyv for zero-copy deserialization
of hot-path data, and Cargo feature gates to compose functionality (`query`, `mailbox`, `oobi`,
`oobi-manager`, `query_cache`). All cryptographic operations use Ed25519 by default with ECDSA
secp256k1 support. CESR encoding bridges through cesrox via From/Into impls.

Key design principle: **two-phase signing** — events are generated as unsigned serialized strings,
signed externally (enforcing "signing at the edge"), then finalized with the signature attached.

## Workspace Crates

| Crate | Role | Key Types |
|-------|------|-----------|
| `keriox_core` | Core protocol logic | `KeriEvent`, `EventData`, `BasicProcessor`, `EventStorage`, `RedbDatabase` |
| `keriox_sdk` | High-level entry point | `Controller<D,T>`, `Identifier<D>` |
| `components/controller` | Production controller | `Controller`, `Identifier`, `KnownEvents` |
| `components/witness` | Witness node | `Witness`, `WitnessListener` |
| `components/watcher` | Watcher node | `Watcher`, `WatcherData`, `WatcherListener` |
| `support/teliox` | TEL processor | `TelEventProcessor`, `Tel`, `ManagerTelEvent`, `VcTelEvent` |
| `support/gossip` | UDP gossip | `Server<T>`, `Data<T>` |

## Quick Reference

| Type | Purpose |
|------|---------|
| `KeriEvent<D>` | Generic event envelope (alias for `TypedEvent<EventType, D>`) |
| `EventData` | Enum: `Icp`, `Rot`, `Ixn`, `Dip`, `Drt` |
| `SignedEventMessage` | Event + signatures (dual serde: JSON+CESR wire / struct for DB) |
| `EventMsgBuilder` | Fluent builder, defaults Ed25519/Blake3/JSON |
| `IdentifierPrefix` | Enum: `Basic`, `SelfAddressing`, `SelfSigning` |
| `BasicProcessor<D>` | Processes events with strategy-based error routing |
| `EventStorage<D>` | Read layer over `EventDatabase` (state, KEL, receipts) |
| `NotificationBus` | Observer/pub-sub: `JustNotification` → `Vec<Arc<dyn Notifier>>` |
| `RedbDatabase` | Concrete storage backend (redb tables, rkyv serialization) |
| `Transport<E>` | Async trait for HTTP message delivery |
| `Signer` | Keypair wrapper; `CryptoBox` manages current+next for rotation |
| `IdentifierState` | Computed key state (rkyv-stored, `apply()` via `EventSemantics`) |

## Import Guide

```rust
// SDK (high-level)
use keriox_sdk::{Controller, Identifier, Signer};

// Core types
use keri_core::event::event_data::{EventData, InceptionEvent, RotationEvent};
use keri_core::event_message::{KeriEvent, SignedEventMessage, EventMsgBuilder};
use keri_core::prefix::{IdentifierPrefix, BasicPrefix, SelfSigningPrefix};
use keri_core::processor::{BasicProcessor, Processor, EventStorage};
use keri_core::database::redb::RedbDatabase;
use keri_core::state::IdentifierState;
use keri_core::signer::Signer;
use keri_core::keys::PublicKey;

// Components
use controller::{Controller, Identifier, ControllerConfig};
use witness::Witness;
use watcher::Watcher;

// TEL
use teliox::tel::Tel;
use teliox::processor::TelEventProcessor;
```

## Reference Files

| File | Contents | Size |
|------|----------|------|
| references/api.md | Method signatures for all public APIs | 15KB |
| references/types.md | Struct fields, enum variants, serde/rkyv annotations | 10KB |
| references/patterns.md | Notification bus, escrow pipeline, two-phase sign, startup | 7KB |
| references/components.md | Controller, witness, watcher, teliox, gossip APIs + config | 10KB |
| references/errors.md | Error enums, From chains, error→notification routing | 8KB |

## Common Workflows

### Inception (two-phase sign)
```rust
let builder = EventMsgBuilder::new(EventTypeTag::Icp)
    .with_keys(vec![basic_prefix])
    .with_next_keys(vec![next_digest])
    .with_threshold(&SignatureThreshold::Simple(1));
let icp_event = builder.build()?;        // unsigned serialized
let sig = signer.sign(icp_event.encode()?)?;
let signed = icp_event.sign(vec![sig]);  // finalize
processor.process_notice(&signed)?;
```

### Escrow wiring
```rust
let (notification_bus, escrows) = default_escrow_bus(db.clone(), escrow_config);
notification_bus.register_observer(signed_escrow, vec![
    JustNotification::KeyEventAdded,
    JustNotification::PartiallySignedEscrow,
]);
```

### Controller lifecycle
```rust
let config = ControllerConfig { db_path, transport, tel_transport, .. };
let controller = Controller::new(config)?;
let pk = PublicKey::new(key_bytes);
let (icp_msg, op) = controller.incept(vec![pk], vec![npk], 1, vec![witness_oobi])?;
let signature = signer.sign(&icp_msg)?;
let identifier = controller.finalize_inception(icp_msg, &[signature])?;
```

## Anti-Patterns

- **Don't use `keriox_sdk` for production** — error types are erased (`Result<_, ()>` / `Result<_, String>`). Use `components/controller` instead.
- **Don't skip `EventSemantics::apply()`** — state is computed by replaying events, not cached separately.
- **Don't assume escrow timeouts work** — `EscrowConfig` durations are accepted but unused at runtime.
- **Don't mix serialization formats** — hot-path events use rkyv; mailbox/KSN use serde_cbor; OOBI uses CBOR. Each has different error paths.
- **Don't forget feature gates** — `query`, `mailbox`, `oobi` gate significant functionality. Missing gates cause missing trait impls, not compile errors.

## Spec Skill Boundaries

This skill covers **Rust implementation details only**. For protocol knowledge, use:
- **keri-spec** — KEL rules, witness agreement (KAWA), delegation, pre-rotation, OOBI resolution
- **cesr-spec** — CESR encoding tables, derivation codes, stream parsing, SAID
- **acdc-spec** — ACDC credential schemas, graduated disclosure, IPEX exchange
