# keriox Patterns Quick Reference

## Notification Bus Wiring

| Notification | Observers |
|---|---|
| `KeyEventAdded` | MaybeOutOfOrderEscrow, DelegationEscrow, ReplyEscrow* |
| `OutOfOrder` | MaybeOutOfOrderEscrow |
| `PartiallySigned` | PartiallySignedEscrow |
| `PartiallyWitnessed` | PartiallyWitnessedEscrow, WitnessReceiptGenerator** |
| `ReceiptOutOfOrder` | PartiallyWitnessedEscrow |
| `MissingDelegating` | DelegationEscrow |
| `DuplicitousEvent` | DuplicitousEvents |
| `KsnOutOfOrder` | ReplyEscrow* |
| `ReceiptAccepted` | WitnessReceiptGenerator** |

\* feature = `query` only | \*\* witness component only

### Registration Template

```rust
let mut bus = NotificationBus::new();
let escrow = Arc::new(SomeEscrow::new(db.clone(), duration));
bus.register_observer(escrow, vec![
    JustNotification::OutOfOrder,
    JustNotification::KeyEventAdded,
]);
```

### Factory

`default_escrow_bus(db, config)` returns `(NotificationBus, (Arc<MaybeOutOfOrder>, Arc<PartiallySigned>, Arc<PartiallyWitnessed>, Arc<Delegation>, Arc<Duplicitous>))`. ReplyEscrow registered separately (feature-gated).

---

## Escrow Error Routing

| Validation Error | Notification Emitted |
|---|---|
| `Ok` | `KeyEventAdded` (add to KEL) |
| `EventOutOfOrderError` | `OutOfOrder` |
| `NotEnoughSigsError` | `PartiallySigned` |
| `NotEnoughReceiptsError` | `PartiallyWitnessed` |
| `MissingDelegatingEventError` | `MissingDelegatingEvent` |
| `EventDuplicateError` | `DupliciousEvent` |

### Re-processing Checklist (on `KeyEventAdded`)

- [ ] Iterate escrowed events
- [ ] Re-validate against updated KEL
- [ ] `Ok` -> accept to KEL, remove from escrow, notify `KeyEventAdded`
- [ ] Still failing -> keep in escrow
- [ ] `SignatureVerificationError` -> discard from escrow

### Anti-Patterns

- **No batch accept:** MaybeOutOfOrder and Delegation escrows `break` after first accept -- KEL state changed, re-evaluate via bus re-notify
- **No empty sigs:** All escrows silently drop events with empty signatures
- **No raw error discard:** Failed validation routes to escrow, never dropped silently

### Signature Merging (PartiallySignedEscrow)

- [ ] Collect existing + new signatures, deduplicate
- [ ] Re-validate merged event
- [ ] `Ok` -> accept, remove, notify `KeyEventAdded`
- [ ] `NotEnoughSigsError` -> keep with merged sigs
- [ ] `NotEnoughReceiptsError` -> re-notify as `PartiallyWitnessed`
- [ ] `MissingDelegatingEventError` -> re-notify as `MissingDelegatingEvent`

---

## Two-Phase Sign Pattern

| Operation | Generate | Finalize |
|---|---|---|
| Inception | `controller.incept(pks, npks, wits, thr)` | `controller.finalize_incept(bytes, &sig)` |
| Rotation | `identifier.rotate(...)` | `identifier.finalize_rotate(bytes, sig)` |
| Anchor | `identifier.anchor(...)` | `identifier.finalize_anchor(bytes, sig)` |
| Add watcher | `identifier.add_watcher(id)` | `identifier.finalize_add_watcher(bytes, sig)` |
| Registry incept | `identifier.incept_registry()` | `identifier.finalize_incept_registry(bytes, sig)` |
| Issue credential | `identifier.issue(digest)` | `identifier.finalize_issue(bytes, sig)` |
| Revoke | `identifier.revoke(&sai)` | `identifier.finalize_revoke(bytes, sig)` |
| Query | `identifier.query_watchers(seal)` | `identifier.finalize_query(signed)` |
| Mailbox query | `identifier.query_mailbox(id, wits)` | `identifier.finalize_query_mailbox(signed)` |

### Checklist

- [ ] Generate unsigned event (returns `String`)
- [ ] Sign externally (user's key manager)
- [ ] Finalize (verify sig, process event, persist to KEL)
- [ ] Publish to witnesses (`identifier.notify_witnesses().await`)

### Group/Multisig Extension

```rust
let (group_icp, exchanges) = identifier.incept_group(
    participants, threshold, ...)?;
let sig = sign(&group_icp);
let signed_exn = exchanges.iter()
    .map(|exn| (exn.as_bytes().to_vec(), sign(exn)))
    .collect();
identifier.finalize_group_incept(
    group_icp.as_bytes(), sig, signed_exn).await?;
```

---

## Feature Gates

| Feature | Modules / Types Gated |
|---|---|
| `query` | `query` mod, `ReplyEscrow`, `process_reply`, `process_signed_query`, `KsnOutOfOrder`/`KsnUpdated`/`ReplayLog`/`ReplyKsn` notifications, `Transport::send_query`, `PossibleResponse::Ksn` |
| `mailbox` | `mailbox` mod, `parse_exchange_stream`, `process_signed_exn`, `Exchange`/`SignedExchange`/`ForwardTopic`/`MailboxResponse`, `PossibleResponse::Mbx` |
| `oobi` | `oobi` mod, `GotOobi` notification, `generate_end_role`, `ReplyRoute::LocScheme`/`EndRoleAdd`/`EndRoleCut`, `Identifier::add_watcher` |
| `oobi-manager` | `oobi_manager` + `transport` mods, `parse_op_stream`, `OobiManager`/`OobiStorage` |
| `query_cache` | `IdentifierCache` (SQLite), mailbox index tracking |

Implicit deps: `oobi-manager` requires `oobi`; watcher needs `query` + `oobi-manager`.

---

## Transport URL Routing

| Message Type | Method | Path |
|---|---|---|
| Notice | POST | `/process` |
| Reply | POST | `/register` |
| Exchange | POST | `/forward` |
| Query | POST | `/query` |
| OOBI loc scheme | GET | `/oobi/{eid}` |
| OOBI end role | GET | `/oobi/{cid}/{role}/{eid}` |
| OOBI resolve | POST | `/resolve` (JSON body) |

### Transport Injection Template

```rust
ControllerConfig {
    transport: Box::new(DefaultTransport::new()),
    tel_transport: Box::new(HTTPTelTransport),
    ..Default::default()
}
```

---

## Component Startup Checklist

- [ ] Config resolution (Figment: YAML -> env vars -> CLI args)
- [ ] Signer creation (from seed or random Ed25519)
- [ ] Database open (`RedbDatabase` at `{db_path}/events_database`)
- [ ] Processor + escrow bus creation
- [ ] Observer registration on bus
- [ ] OobiManager creation
- [ ] Self-sign own LocationScheme OOBI
- [ ] TEL database creation
- [ ] Wrap component in `Arc` via Listener
- [ ] HTTP server start (actix-web)

### Witness vs Watcher Differences

| Aspect | Witness | Watcher |
|---|---|---|
| Processor | `WitnessProcessor` (custom strategy) | `BasicProcessor` (standard) |
| Escrows | 3 (no PartiallyWitnessed, no Reply) | 5 + ReplyEscrow |
| Async | Sync handlers only | Async + background mpsc tasks |
| Outbound transport | None (receive-only) | `Transport` + `WatcherTelTransport` |
| Initial OOBIs | None | Resolves witness OOBIs at startup |
| Env prefix | `WITNESS_` | `WATCHER_` |

### Witness Strategy Override

Witness accepts events with `NotEnoughReceiptsError` (doesn't require receipts from itself). All other errors route identically to standard `BasicProcessor`.

---

## Database Layout

```
{db_path}/
  events_database/    -- redb (KEL + escrows + OOBI)
  query_cache         -- SQLite (feature = "query_cache")
  tel/
    events/           -- redb (TEL)
    escrow/           -- TEL escrow
```

### Serialization

| Data | Format |
|---|---|
| KEL / escrow events | rkyv (zero-copy) |
| OOBI store | CBOR (serde_cbor) |
| Query cache | SQLite |

### Anti-Patterns

- **No error context:** All DB ops use `.map_err(|_| Error::DbError)` -- original error discarded
- **No batch transactions:** Individual write txn per operation (no explicit batch mode)
- **No mixed serialization:** KEL = rkyv, OOBI = CBOR -- do not cross formats
