# keriox Error Reference

## Error Enum Summary

| Enum | Crate | Variants | Role |
|---|---|---|---|
| `Error` | `keri_core::error` | ~16 | Central processing error; drives escrow routing |
| `ActorError` | `keri_core::actor::error` | 14 | HTTP-facing; has `http_status_code()` |
| `ParseError` | `keri_core::event_message::cesr_adapter` | 4 | CESR/deser/attachment/wrong-type |
| `SignatureError` | `keri_core::event::sections::key_config` | 6 | Threshold checking (isolated, no `From` chain) |
| `VerificationError` | `keri_core::processor::validator` | 5 | Wraps `SignatureError` + `MoreInfoError` |
| `TransportError<E>` | `keri_core::transport` | 5 | Generic over remote error (`E = ActorError`) |
| `OobiError` | `keri_core::oobi` | 6 | OOBI resolution |
| `QueryError` | `keri_core::query` | 4 | Stale KSN/RPY, catch-all `Error(String)` |
| `SignedQueryError` | `keri_core::actor` | 4 | Signed query validation |
| `KeysError` | `keri_core::keys` | 3 | Crypto key errors (no `#[from]`) |
| `PrefixError` | `keri_core::prefix::error` | 5 | Prefix parsing |
| `ThresholdError` | `keri_core::event::sections::threshold` | 2 | Standalone, no conversions |
| `ControllerError` | `controller::error` | 13 | SDK-level aggregate |
| `MechanicsError` | `controller::error` | 13 | Identifier operations |
| `SendingError` | `controller::error` | 5 | Network/transport |
| `WatcherResponseError` | `controller::error` | 5 | Watcher query results |
| `ResponseProcessingError` | `controller::error` | 4 | Receipt/multisig/delegate |
| `BroadcastingError` | `controller::error` | 3 | Witness broadcasting |
| `OobiRetrieveError` | `controller::error` | 2 | OOBI lookup |
| `TelError` | `teliox::error` | 12 | TEL processing + escrow |
| `WitnessError` | `witness` | 4 | Witness component |
| `TransportError` (watcher) | `watcher::transport` | 2 | Simple network error (separate type) |
| `StoreError` | `watcher::tel_providing` | 3 | File-based TEL store |
| `ApiError` | witness/watcher shared | newtype(`ActorError`) | HTTP `ResponseError` wrapper |

## From Conversion Chains

```
reqwest::Error ─────────────────────────┐
url::ParseError ────────────────────────┤
OobiRetrieveError ──────────────────────┤
ActorError ─────────────────────────────┼─► SendingError ──┬─► MechanicsError ──┬─► ControllerError
TransportError (custom From) ───────────┘                  │                    │
                                                           ├───────────────────►┤
OobiError ──────────────────────────────────────────────────┼─► MechanicsError  │
BroadcastingError ──────────────────────────────────────────┘                   │
ResponseProcessingError ────────────────────────────────────► MechanicsError ──►│
keri_core::error::Error ────────► MechanicsError ──────────────────────────────►│
                        ────────► ControllerError (direct)                      │
                        ────────► WitnessError                                  │
                        ────────► TelError                                      │
                        ────────► ActorError (as KeriError)                     │
ParseError ─────────────────────► ActorError ──────────────────────────────────►│ (via SendingError)
                        ────────► ControllerError (direct)                      │
RedbError ──────────────────────► ControllerError                               │
                        ────────► WitnessError (manual, as DatabaseError)       │
                        ────────► TelError (4 redb error types)                 │
teliox::error::Error ───────────► ControllerError                               │
                        ────────► WitnessError                                  │
VersionError ───────────────────► ControllerError                               │
WatcherResponseError ───────────► ControllerError                               │
rusqlite::Error ────────────────► ControllerError (feature: query_cache)        │
```

## ActorError HTTP Status Mapping

| Variant | Status |
|---|---|
| `KeriError::DeserializeError` | 400 |
| `KeriError::IncorrectDigest` | 400 |
| `KeriError::FaultySignatureVerification` | 403 |
| `KeriError::SignatureVerificationError` | 403 |
| `OobiError::SignerMismatch` | 401 |
| `DbError` | 500 |
| Everything else | 500 |

## Error-to-Notification Routing (KEL)

| `keri_core::error::Error` variant | Notification | Escrow |
|---|---|---|
| `EventOutOfOrderError` | `OutOfOrder` | `MaybeOutOfOrderEscrow` |
| `NotEnoughSigsError` | `PartiallySigned` | `PartiallySignedEscrow` |
| `NotEnoughReceiptsError` | `PartiallyWitnessed` | `PartiallyWitnessedEscrow` |
| `EventDuplicateError` | `DupliciousEvent` | `DuplicateEventEscrow` |
| `MissingDelegatingEventError` | `MissingDelegatingEvent` | `DelegationEscrow` |
| `MissingDelegatorSealError` | `MissingDelegatingEvent` | `DelegationEscrow` |
| `MissingEvent` (receipt, NT) | `ReceiptOutOfOrder` | Receipt escrow |
| `MissingEvent` (receipt, T) | `TransReceiptOutOfOrder` | Receipt escrow |
| Success | `KeyEventAdded` | stored in KEL |
| Other errors | propagated as `Err(e)` | none |

**Overrides:** Witness accepts `NotEnoughReceiptsError` (emits `KeyEventAdded`). Watcher routes `MissingDelegatorSealError` to `add_mailbox_delegate`.

## Error-to-Notification Routing (TEL)

| `teliox::error::Error` variant | Notification | Escrow |
|---|---|---|
| `OutOfOrderError` | `TelNotification::OutOfOrder` | `OutOfOrderEscrow` |
| `MissingIssuerEventError` | `TelNotification::MissingIssuer` | `MissingIssuerEscrow` |
| `MissingRegistryError` | `TelNotification::MissingRegistry` | `MissingRegistryEscrow` |
| `EventAlreadySavedError` | silently accepted | idempotent |
| Success | `TelNotification::TelEventAdded` | stored in TEL |

**Cross-system:** `MissingIssuerEscrow` listens for KEL `KeyEventAdded`. `MissingRegistryEscrow` and `OutOfOrderEscrow` listen for `TelEventAdded`.

**Re-validation outcomes:** Ok = remove + store + emit. `MissingSealError` = remove permanently. `MissingIssuer/Registry` = re-route to other escrow. Other = keep in escrow.

## Anti-patterns

- **DB error erasure:** All `events_db` writes use `.map_err(|_| Error::DbError)`, discarding root cause
- **Typo in public API:** `SendingError::WatcherDosntHaveOobi` (misspelled "Doesn't")
- **Duplicate `TransportError` types:** `keri_core::transport::TransportError<E>` (5 variants) vs `watcher::transport::TransportError` (2 variants) -- unrelated types, same name
- **`SignatureError`/`ThresholdError` isolation:** No `From` into `keri_core::error::Error`; callers map manually
- **`VerificationError` not convertible** to `keri_core::error::Error`; controller wraps as `Vec<(VerificationError, String)>`
- **`ResponseProcessingError`** has 3 variants (`Receipts`, `Multisig`, `Delegate`) all wrapping the same `Error` type
- **`QueryError::Error(String)`** is stringly-typed catch-all; call sites use `format!("{:?}", e)`
- **Serde asymmetry:** `keri_core` errors derive `Serialize + Deserialize`; controller-layer errors do NOT
- **`SeedPrefix::RandomSeed128`** has `derivation_code()` incorrectly mapped to `SeedCode::RandomSeed448`
- **`StoreError` disconnected:** No conversion path to `ActorError`; boundary callers use `GeneralError(...)` manually
