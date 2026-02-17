# keriox Components Reference

## Controller

Crate: `components/controller`

### Controller API

| Method | Signature | Returns |
|--------|-----------|---------|
| `new` | `(ControllerConfig)` | `Result<Self, ControllerError>` |
| `incept` | `(pks, npks, witnesses, threshold)` | `Result<String>` |
| `finalize_incept` | `(event_bytes, sig)` | `Result<Identifier>` |
| `verify` | `(data, signature)` | `Result<()>` |
| `find_state` | `(id)` | `Result<IdentifierState>` |
| `get_kel_with_receipts` | `(id)` | `Result<...>` |

### Identifier API (per-identifier handle)

| Method | Signature | Notes |
|--------|-----------|-------|
| `rotate` | `(...)` | Generate rotation event |
| `finalize_rotate` | `(event, sig)` | Persist rotation |
| `anchor` | `(payload)` | Generate interaction event |
| `anchor_with_seal` | `(seals)` | Interaction with seals |
| `finalize_anchor` | `(event, sig)` | Persist interaction |
| `notify_witnesses` | `()` | Publish pending events |
| `incept_registry` | `()` | TEL management inception |
| `finalize_incept_registry` | `()` | Persist registry |
| `issue` | `(digest)` | VC issuance event |
| `finalize_issue` | `()` | Persist issuance |
| `revoke` | `(sai)` | VC revocation event |
| `finalize_revoke` | `()` | Persist revocation |
| `notify_backers` | `()` | Publish TEL events |
| `incept_group` | `(participants, threshold, ...)` | Returns `(String, Vec<String>)` |
| `finalize_group_incept` | `(event, sig, exchanges)` | Persist group inception |
| `query_watchers` | `(seal)` | Query watcher nodes |
| `finalize_query` | `(signed_queries)` | Returns `(QueryResponse, Vec<Error>)` |
| `query_mailbox` | `(id, witnesses)` | Mailbox query |
| `finalize_query_mailbox` | `(...)` | Returns `Vec<ActionRequired>` |
| `add_watcher` / `remove_watcher` | `(id)` | Watcher management |
| `sign_data` | `(data, sigs)` | Sign arbitrary data |
| `sign_to_cesr` | `(json, sigs)` | CESR-encoded signing |
| `verify_from_cesr` | `(stream)` | Verify CESR stream |

### NontransferableIdentifier API

| Method | Notes |
|--------|-------|
| `sign` | Sign data |
| `query_log` / `query_ksn` | KEL queries |
| `finalize_query` | Finalize KEL query |
| `query_tel` / `finalize_query_tel` | TEL queries |

### ControllerConfig

| Field | Type | Default |
|-------|------|---------|
| `db_path` | `PathBuf` | `"db"` |
| `initial_oobis` | `Vec<LocationScheme>` | `[]` |
| `escrow_config` | `EscrowConfig` | `EscrowConfig::default()` |
| `transport` | `Box<dyn Transport>` | `DefaultTransport` |
| `tel_transport` | `Box<dyn IdentifierTelTransport>` | `HTTPTelTransport` |

Feature flag `query_cache`: enables `IdentifierCache` (SQLite-backed mailbox index).

### Re-exports

`keri_core::oobi::{EndRole, LocationScheme, Oobi}`, `keri_core::prefix::{BasicPrefix, CesrPrimitive, IdentifierPrefix, SeedPrefix, SelfSigningPrefix}`, `keri_core::signer::{CryptoBox, KeyManager}`, `teliox::{parse_tel_query_stream, TelState, ManagerTelState}`

---

## Witness

Crate: `components/witness`

### Witness API

| Method | Signature | Returns |
|--------|-----------|---------|
| `new` | `(address, signer, event_path, escrow_config)` | `Self` |
| `setup` | `(public_address, event_db_path, priv_key, escrow_config)` | `Self` |
| `process_notice` | `(Notice)` | `Result<()>` |
| `process_query` | `(SignedQueryMessage)` | `Option<PossibleResponse>` |
| `process_exchange` | `(SignedExchange)` | `Result<()>` |
| `process_reply` | `(SignedReply)` | `Result<()>` |
| `get_mailbox_messages` | `(id)` | `MailboxResponse` |
| `oobi` | `()` | `LocationScheme` |

WitnessProcessor routing: Ok -> `KeyEventAdded`, `NotEnoughReceiptsError` -> accepted, `NotEnoughSigsError` -> `PartiallySigned` escrow, `EventOutOfOrderError` -> `OutOfOrder` escrow, `MissingDelegatingEventError` -> `MissingDelegatingEvent` escrow, `EventDuplicateError` -> `DupliciousEvent` notification.

### HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| GET | `/introduce` | Own OOBI JSON |
| GET | `/oobi/{id}` | Location scheme for identifier |
| GET | `/oobi/{cid}/{role}/{eid}` | Role OOBI + KEL |
| POST | `/process` | KEL events (notices) |
| POST | `/query` | KSN/log queries |
| POST | `/query/tel` | TEL queries |
| POST | `/process/tel` | TEL events |
| POST | `/register` | Reply messages |
| POST | `/forward` | Exchange messages |
| GET | `/info` | Version JSON |

### Config (CLI/Env/YAML via Figment)

| Field | Type | Default | CLI | Env |
|-------|------|---------|-----|-----|
| `db_path` | `PathBuf` | `./witness_db` | `-d` | `WITNESS_DB_PATH` |
| `public_url` | `Url` | `http://localhost:3232` | `-u` | `WITNESS_PUBLIC_URL` |
| `http_port` | `u16` | `3232` | `-p` | `WITNESS_HTTP_PORT` |
| `seed` | `Option<String>` | `null` | `-s` | `WITNESS_SEED` |
| `partially_signed_timeout` | `u64` | `600` | - | - |
| `out_of_order_timeout` | `u64` | `600` | - | - |
| `delegation_timeout` | `u64` | `600` | - | - |

---

## Watcher

Crate: `components/watcher`

### Watcher API

| Method | Signature | Returns |
|--------|-----------|---------|
| `new` | `(WatcherConfig)` | `Self` |
| `process_update_requests` | `()` | Background KEL update task |
| `process_update_tel_requests` | `()` | Background TEL update task |
| `parse_and_process_notices` | `(stream)` | `Result<()>` |
| `parse_and_process_queries` | `(stream)` | `Result<Vec<...>>` |
| `parse_and_process_replies` | `(stream)` | `Result<()>` |
| `parse_and_process_tel_queries` | `(stream)` | `Vec<TelReplyType>` |
| `resolve_end_role` | `(er)` | `Result<()>` |
| `resolve_loc_scheme` | `(loc)` | `Result<()>` |
| `oobi` | `()` | `LocationScheme` |

TEL handling: file-based forwarding via `TelToForward` + `RegistryMapping` (no full TEL processor).

### HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| GET | `/introduce` | Own OOBI |
| GET | `/oobi/{id}` | Location scheme |
| GET | `/oobi/{cid}/{role}/{eid}` | Role OOBI |
| POST | `/process` | KEL events |
| POST | `/query` | KEL queries |
| POST | `/register` | Reply messages |
| POST | `/resolve` | OOBI resolution (JSON) |
| POST | `/query/tel` | TEL queries |
| GET | `/info` | Version JSON |

Differences from witness: no `/forward`, no `/process/tel`, has `/resolve`.

### WatcherConfig

| Field | Type | Default |
|-------|------|---------|
| `public_address` | `Url` | `http://localhost:3236` |
| `db_path` | `PathBuf` | `"db"` |
| `priv_key` | `Option<String>` | `None` |
| `transport` | `Box<dyn Transport>` | - |
| `tel_transport` | `Box<dyn WatcherTelTransport>` | - |
| `tel_storage_path` | `PathBuf` | `"tel_storage"` |
| `escrow_config` | `EscrowConfig` | default (5 timeout fields) |

---

## Teliox (TEL Support)

Crate: `support/teliox`

### Event Types

**Management TEL** (registry): `vcp` (inception), `vrt` (rotation) -> `ManagerTelState { prefix, sn, last, issuer, backers }`

**VC TEL** (credential): `iss`/`bis` (issuance), `rev`/`brv` (revocation) -> `TelState { NotIssued | Issued(digest) | Revoked }`

### Event Generator Functions

| Function | Purpose |
|----------|---------|
| `make_inception_event` | Registry inception (issuer, config, backers) |
| `make_rotation_event` | Backer rotation (ba, br) |
| `make_simple_issuance_event` | Simple VC issuance |
| `make_issuance_event` | Backed VC issuance |
| `make_simple_revoke_event` | Simple VC revocation |
| `make_revoke_event` | Backed VC revocation |

Defaults: Blake3_256 hash, JSON serialization.

### Escrows

| Escrow | Trigger | Re-process on |
|--------|---------|---------------|
| `MissingIssuerEscrow` | `MissingIssuerEventError` | `KeyEventAdded` (from KEL) |
| `MissingRegistryEscrow` | `MissingRegistryError` | `TelEventAdded` |
| `OutOfOrderEscrow` | `OutOfOrderError` | `TelEventAdded` |

Setup: `escrow::default_escrow_bus(tel_db, kel_storage, escrow_db)`.

### Database Traits

`TelEventDatabase`: `new`, `add_new_event`, `get_events`, `get_management_events`. Impl: `RedbTelDatabase` (redb, CBOR serialization).

---

## Gossip

Crate: `support/gossip`

### Server\<T\> API

| Method | Notes |
|--------|-------|
| `Server::new(data, addr)` | Binds UDP socket |
| `start()` | Send loop (3-4s random, fan-out 3) + receive loop |
| `bootstrap(peer_addr)` | Join network |
| `peers()` | Read peer map |
| `data()` | Access local data (DerefMut auto-increments version) |

Protocol: UDP, bincode, 2048-byte buffer, UUID v4 peer identity, single `Sync` message type.

---

## Dependency Graph

```
cesrox
  -> keri_core
       -> controller  [+teliox, +redb, +reqwest, ?rusqlite]
       -> witness      [+teliox, +redb, +actix-web]
       -> watcher      [+teliox, +redb, +actix-web, +reqwest]
       -> teliox       [+redb]
gossip                 [tokio, bincode, serde — no keri_core]
```

## Shared Traits

| Trait | Crate | Implementors |
|-------|-------|-------------|
| `Processor` | keri_core | `WitnessProcessor`, `BasicProcessor` |
| `EventDatabase` | keri_core | `RedbDatabase` |
| `Transport` | keri_core | `DefaultTransport` (reqwest) |
| `Notifier` | keri_core | `WitnessReceiptGenerator`, `MissingIssuerEscrow`, escrows |
| `TelEventDatabase` | teliox | `RedbTelDatabase` |
| `TelNotifier` | teliox | `MissingIssuerEscrow`, `MissingRegistryEscrow`, `OutOfOrderEscrow`, `RecentlyAddedEvents` |
| `IdentifierTelTransport` | controller | `HTTPTelTransport` |
| `WatcherTelTransport` | watcher | `HttpTelTransport` |

## Component Comparison

| Aspect | Controller | Witness | Watcher |
|--------|-----------|---------|---------|
| Processor | `BasicProcessor` | `WitnessProcessor` | `BasicProcessor` |
| Transport | Outbound only | Inbound only | Both |
| TEL | Full `Tel` coordinator | Full `Tel` coordinator | File-based forwarding |
| Async model | Caller-driven | Sync handlers | mpsc background tasks |
| Database | Redb + optional SQLite | Redb | Redb + file stores |
| Identity | Transferable (full KEL) | Nontransferable | Nontransferable |

## Shared Patterns

- **Figment config**: YAML -> env vars (`WITNESS_*`/`WATCHER_*`) -> CLI args
- **Nontransferable identity**: witness + watcher use `BasicPrefix::Ed25519NT`, self-sign OOBI at startup
- **parse_and_process_***: all components expose raw CESR byte stream ingestion
- **NotificationBus**: KEL events trigger escrow re-processing; controller bridges KEL->TEL via `MissingIssuerEscrow`
- **actix-web**: witness + watcher use listener wrappers implementing `TestActor` for integration tests
