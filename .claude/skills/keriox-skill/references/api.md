# keriox API Reference (Compact)

Abbreviations: `R<X>` = `Result<X, Error>`, `IP` = `IdentifierPrefix`, `BP` = `BasicPrefix`, `SSP` = `SelfSigningPrefix`, `SAI` = `SelfAddressingIdentifier`, `SEM` = `SignedEventMessage`, `KE<D>` = `KeriEvent<D>`, `IS` = `IdentifierState`, `LS` = `LocationScheme`, `ES` = `EventSeal`.

---

## keriox_sdk

### Controller\<D: EventDatabase, T: TelEventDatabase\>

| Method | Params | Returns |
|--------|--------|---------|
| `new` | `Arc<D>, Arc<T>` | `Self` |
| `incept` | `Vec<BP>, Vec<BP>` | `R<String, ()>` |
| `finalize_incept` | `&[u8], &SSP` | `R<Identifier<D>, ()>` |
| `load_identifier` | `&IP` | `R<Identifier<D>, String>` |
| `process_kel` | `&[Message]` | `R<(), String>` |
| `process_tel` | `&[u8]` | `R<(), String>` |
| `get_vc_state` | `&SAI` | `R<Option<TelState>, String>` |
| `get_state` | `&IP` | `Option<IS>` |

### Identifier\<D: EventDatabase\>

| Method | Params | Returns |
|--------|--------|---------|
| `new` | `IP, Arc<EventStorage<D>>` | `Self` |
| `get_prefix` | — | `&IP` |
| `get_own_kel` | — | `Option<Vec<Notice>>` |
| `add_watcher` | `IP` | `R<String, String>` |
| `finalize_add_watcher` | `&[u8], SSP` | `R<(IP, Vec<Message>), String>` |
| `get_log_query` | `IP, IP, Option<u64>, Option<u64>` | `QueryEvent` |
| `get_tel_query` | `IP, IP` | `R<TelQueryEvent, String>` |

---

## keriox_core::event_message

### TypedEvent\<T, D\>

| Field | Serde | Type |
|-------|-------|------|
| `serialization_info` | `v` | `SerializationInfo` |
| `event_type` | `t` | `T` |
| `digest` | `d` | `Option<SaidValue>` |
| `data` | flatten | `D` |

Constructor: `new(SerializationFormats, HashFunction, D) -> Self`

Type aliases: `KeriEvent<D> = TypedEvent<EventTypeTag, D>`, `TimeStamp = DateTime<FixedOffset>`

### EventTypeTag

Variants: `Icp`, `Rot`, `Ixn`, `Dip`, `Drt`, `Rct`, `Exn`, `Rpy` [query], `Qry`

### Message / Notice / Op

```
Message::Notice(Notice) | Op(Op) [query]
Notice::Event(SEM) | NontransferableRct(..) | TransferableRct(..)
Op::Exchange(SignedExchange) [mailbox] | Reply(SignedReply) [query] | Query(SignedQueryMessage) [query]
```

### SignedEventMessage

| Field | Type |
|-------|------|
| `event_message` | `KE<KeyEvent>` |
| `signatures` | `Vec<IndexedSignature>` |
| `witness_receipts` | `Option<Vec<Nontransferable>>` |
| `delegator_seal` | `Option<SourceSeal>` |

### Signature Types

```
Signature::Transferable(SignerData, Vec<IndexedSignature>) | NonTransferable(Nontransferable)
Nontransferable::Indexed(Vec<IndexedSignature>) | Couplet(Vec<(BP, SSP)>)
SignerData::EventSeal(ES) | LastEstablishment(IP) | JustSignatures
```

`Signature::verify(&self, &[u8], &EventStorage<D>) -> R<bool>`

### EventMsgBuilder

| Setter | Param |
|--------|-------|
| `new` | `EventTypeTag` |
| `with_prefix` | `&IP` |
| `with_keys` | `Vec<BP>` |
| `with_next_keys` | `Vec<BP>` |
| `with_next_keys_hashes` | `Vec<SAI>` |
| `with_sn` | `u64` |
| `with_previous_event` | `&SAI` |
| `with_seal` | `Vec<Seal>` |
| `with_delegator` | `&IP` |
| `with_threshold` | `&SignatureThreshold` |
| `with_next_threshold` | `&SignatureThreshold` |
| `with_witness_list` | `&[BP]` |
| `with_witness_to_add` | `&[BP]` |
| `with_witness_to_remove` | `&[BP]` |
| `with_witness_threshold` | `&SignatureThreshold` |
| `build` | — | `R<KE<KeyEvent>>` |

### ReceiptBuilder

`default() -> with_receipted_event(KE<KeyEvent>) -> with_format(SerializationFormats) -> build() -> R<Receipt>`

### Free Functions

| Function | Signature |
|----------|-----------|
| `signatures_into_groups` | `&[Signature] -> Vec<Group>` |
| `get_signatures` | `Group -> R<Vec<Signature>, ParseError>` |

---

## keriox_core::processor

### Processor trait

| Method | Signature | Gate |
|--------|-----------|------|
| `process_notice` | `&Notice -> R<()>` | — |
| `process_op_reply` | `&SignedReply -> R<()>` | query |
| `register_observer` | `Arc<dyn Notifier>, &[JustNotification] -> R<()>` | — |
| `process` | `&Message -> R<()>` | default impl |

### BasicProcessor\<D\>

`new(Arc<D>, Option<NotificationBus>) -> Self` — implements `Processor`.

### EventValidator\<D\>

| Method | Signature | Gate |
|--------|-----------|------|
| `new` | `Arc<D> -> Self` | — |
| `validate_event` | `&SEM -> R<Option<IS>>` | — |
| `validate_validator_receipt` | `&SignedTransferableReceipt -> R<Option<IS>>` | — |
| `validate_witness_receipt` | `&SignedNontransferableReceipt -> R<Option<IS>>` | — |
| `verify` | `&[u8], &Signature -> R<(), VerificationError>` | — |
| `process_signed_ksn_reply` | `&SignedReply -> R<Option<IS>>` | query |

### EventStorage\<D\>

**State queries:**

| Method | Returns |
|--------|---------|
| `get_state(&IP)` | `Option<IS>` |
| `compute_state_at_sn(&IP, u64)` | `R<Option<IS>>` |
| `compute_state_at_event(u64, &IP, &SAI)` | `R<Option<IS>>` |

**KEL retrieval:**

| Method | Returns |
|--------|---------|
| `get_kel(&IP)` | `R<Option<Vec<u8>>>` |
| `get_kel_messages(&IP)` | `R<Option<Vec<Notice>>>` |
| `get_kel_messages_with_receipts_all(&IP)` | `R<Option<Vec<Notice>>>` |
| `get_kel_messages_with_receipts_range(&IP, u64, u64)` | `R<Option<Vec<Notice>>>` |

**Event lookups:**

| Method | Returns |
|--------|---------|
| `get_event_at_sn(&IP, u64)` | `Option<TimestampedSignedEventMessage>` |
| `get_last_establishment_event_seal(&IP)` | `Option<ES>` |
| `get_keys_at_event(&IP, u64, &SAI)` | `R<Option<KeyConfig>>` |
| `get_witnesses_at_event(u64, &IP, &SAI)` | `R<Vec<BP>>` |
| `has_receipt(&IP, u64, &IP)` | `R<bool>` |

**Query** [query]: `get_ksn_for_prefix(&IP, SerializationFormats) -> R<KeyStateNotice>`

**Mailbox** [mailbox]: `add_mailbox_multisig`, `add_mailbox_delegate`, `add_mailbox_receipt`, `add_mailbox_reply`, `get_mailbox_messages`

### NotificationBus

`new() -> Self`, `register_observer(Arc<dyn Notifier>, Vec<JustNotification>)`, `notify(&Notification) -> R<()>`

### Notification variants

`KeyEventAdded`, `OutOfOrder`, `PartiallySigned`, `PartiallyWitnessed`, `ReceiptAccepted`, `ReceiptEscrowed`, `ReceiptOutOfOrder`, `TransReceiptOutOfOrder`, `DupliciousEvent`, `MissingDelegatingEvent`, `KsnOutOfOrder` [query]

---

## keriox_core::actor

### Parsing Functions

| Function | Returns | Gate |
|----------|---------|------|
| `parse_event_stream(&[u8])` | `R<Vec<Message>, ParseError>` | — |
| `parse_notice_stream(&[u8])` | `R<Vec<Notice>, ParseError>` | — |
| `parse_op_stream(&[u8])` | `R<Vec<Op>, ParseError>` | query/oobi-manager |
| `parse_query_stream(&[u8])` | `R<Vec<SignedQueryMessage>, ParseError>` | query/oobi-manager |
| `parse_reply_stream(&[u8])` | `R<Vec<SignedReply>, ParseError>` | query |
| `parse_exchange_stream(&[u8])` | `R<Vec<SignedExchange>, ParseError>` | mailbox |

### Processing Functions

| Function | Key Params | Returns | Gate |
|----------|-----------|---------|------|
| `process_notice` | `Notice, &P` | `R<()>` | — |
| `process_reply` | `SignedReply, &OobiManager, &P, &EventStorage` | `R<()>` | query |
| `process_signed_query` | `SignedQueryMessage, &EventStorage` | `R<ReplyType, SignedQueryError>` | query |
| `process_query` | `&QueryRoute, &EventStorage` | `R<ReplyType, QueryError>` | query |
| `process_signed_exn` | `SignedExchange, &EventStorage` | `R<()>` | mailbox |

### Event Generators (`actor::event_generator`)

| Function | Key Params | Returns |
|----------|-----------|---------|
| `incept` | `Vec<BP>, Vec<BP>, Vec<BP>, u64, Option<&IP>` | `R<String>` |
| `incept_with_next_hashes` | `Vec<BP>, &SigThreshold, Vec<SAI>, &SigThreshold, Vec<BP>, u64, Option<&IP>` | `R<KE<KeyEvent>>` |
| `rotate` | `IS, Vec<BP>, Vec<BP>, u64, Vec<BP>, Vec<BP>, u64` | `R<String>` |
| `anchor` | `IS, &[SAI]` | `R<String>` |
| `anchor_with_seal` | `IS, &[Seal]` | `R<KE<KeyEvent>>` |
| `generate_end_role` | `&IP, &IP, Role, bool` | `ReplyEvent` | oobi |
| `exchange` | `&IP, &KE<KeyEvent>, ForwardTopic` | `ExchangeMessage` | mailbox |

### SimpleController\<K: KeyManager, RedbDatabase\>

Test helper. Key methods: `incept`, `rotate`, `anchor`, `process`, `process_multisig`, `group_incept`, `create_forward_message`, `query_ksn` [query], `query_mailbox` [mailbox], `add_watcher` [oobi].

---

## keriox_core::query [query]

### ReplyType

`Ksn(KeyStateNotice)` | `Kel(Vec<Message>)` | `Mbx(MailboxResponse)` [mailbox]

### QueryRoute

`Logs { reply_route, args: LogsQueryArgs }` | `Ksn { args: LogsQueryArgs, reply_route }`

`LogsQueryArgs`: `s: Option<u64>`, `limit: Option<u64>`, `i: IP`, `src: Option<IP>`

### SignedQuery\<D\>

`new_nontrans(D, BP, SSP) -> Self`, `new_trans(D, IP, Vec<IndexedSignature>) -> Self`

### ReplyRoute

`Ksn(IP, KeyStateNotice)` | `LocScheme(LS)` [oobi] | `EndRoleAdd(EndRole)` [oobi] | `EndRoleCut(EndRole)` [oobi]

### SignedReply

`new_nontrans(ReplyEvent, BP, SSP) -> Self`, `new_trans(ReplyEvent, ES, Vec<IndexedSignature>) -> Self`

### KeyStateNotice

| Field | Type |
|-------|------|
| `serialization_info` | `SerializationInfo` |
| `state` | `IS` |
| `timestamp` | `DateTime<FixedOffset>` |

`new_ksn(IS, SerializationFormats) -> Self`

---

## keriox_core::state

### IdentifierState

| Field | Type |
|-------|------|
| `prefix` | `IP` |
| `sn` | `u64` |
| `last_event_digest` | `SaidValue` |
| `last_previous` | `Option<SaidValue>` |
| `last_event_type` | `Option<EventTypeTag>` |
| `current` | `KeyConfig` (flattened) |
| `witness_config` | `WitnessConfig` (flattened) |
| `delegator` | `Option<IP>` |
| `last_est` | `LastEstablishmentData` |

`apply<T: EventSemantics>(self, &T) -> R<Self>`

### WitnessConfig

| Field | Type |
|-------|------|
| `tally` | `SignatureThreshold` |
| `witnesses` | `Vec<BP>` |

`enough_receipts(couplets, indexed) -> R<bool>`

### EventSemantics trait

`apply_to(&self, IS) -> R<IS>`

---

## keriox_core::keys / signer

### PublicKey

`new(Vec<u8>)`, `key() -> Vec<u8>`, `verify_ed(&[u8], &[u8]) -> bool`, `verify_ecdsa(&[u8], &[u8]) -> bool`

### PrivateKey (zeroized on drop)

`new(Vec<u8>)`, `key() -> Vec<u8>`, `sign_ed(&[u8]) -> R<Vec<u8>, KeysError>`, `sign_ecdsa(&[u8]) -> R<Vec<u8>, KeysError>`

### KeyManager trait

`sign(&[u8]) -> R<Vec<u8>>`, `public_key() -> PublicKey`, `next_public_key() -> PublicKey`, `rotate() -> R<()>`

### Signer

`new() -> Self` (random Ed25519), `new_with_key(&[u8; 32]) -> R<Self>`, `new_with_seed(&SeedPrefix) -> R<Self>`, `sign(impl AsRef<[u8]>) -> R<Vec<u8>, KeysError>`, `public_key() -> PublicKey`

### CryptoBox

`new() -> R<Self>` (random Ed25519 current+next). Implements `KeyManager`.

---

## keriox_core::oobi [oobi]

### Oobi

`Location(LS)` | `EndRole(EndRole)`

### LocationScheme

| Field | Type |
|-------|------|
| `eid` | `IP` |
| `scheme` | `Scheme` |
| `url` | `Url` |

### EndRole

| Field | Type |
|-------|------|
| `cid` | `IP` |
| `role` | `Role` |
| `eid` | `IP` |

Enums: `Scheme::{Http, Tcp}`, `Role::{Controller, Witness, Watcher, Messagebox}`

### OobiManager [oobi-manager]

`new(Arc<RedbDatabase>)`, `parse_and_save(&str)`, `save_oobi(&SignedReply)`, `get_loc_scheme(&IP) -> R<Vec<ReplyEvent>>`, `get_end_role(&IP, Role) -> R<Option<Vec<SignedReply>>>`, `process_oobi(&SignedReply)`

---

## keriox_core::mailbox [mailbox]

### MailboxResponse

| Field | Type |
|-------|------|
| `receipt` | `Vec<SignedNontransferableReceipt>` |
| `multisig` | `Vec<SEM>` |
| `delegate` | `Vec<SEM>` |

### Exchange

`Fwd { args: FwdArgs, to_forward: KE<KeyEvent> }`

`ForwardTopic::{Multisig, Delegate}`

---

## keriox_core::transport [oobi-manager]

### Transport trait (async)

| Method | Returns |
|--------|---------|
| `send_message(LS, Message)` | `R<(), TransportError>` |
| `send_query(LS, SignedQueryMessage)` | `R<PossibleResponse, TransportError>` | [query]
| `request_loc_scheme(LS)` | `R<Vec<Op>, TransportError>` |
| `resolve_oobi(LS, Oobi)` | `R<(), TransportError>` |

### DefaultTransport

`new() -> Self`. Routes: Notice->`POST /process`, Reply->`POST /register`, Exchange->`POST /forward`, Query->`POST /query`, OOBI->`GET /oobi/{eid}`.

---

## components::controller (production)

### Controller

| Method | Params | Returns |
|--------|--------|---------|
| `new` | `ControllerConfig` | `R<Self, ControllerError>` |
| `incept` | `Vec<BP>, Vec<BP>, Vec<LS>, u64` | `async R<String, MechanicsError>` |
| `finalize_incept` | `&[u8], &SSP` | `R<Identifier, ControllerError>` |
| `verify` | `&[u8], &Signature` | `R<(), VerificationError>` |
| `find_state` | `&IP` | `R<IS, MechanicsError>` |

### ControllerConfig

| Field | Type | Default |
|-------|------|---------|
| `db_path` | `PathBuf` | `"db"` |
| `initial_oobis` | `Vec<LS>` | `[]` |
| `escrow_config` | `EscrowConfig` | default |
| `transport` | `Box<dyn Transport>` | `DefaultTransport` |
| `tel_transport` | `Box<dyn IdentifierTelTransport>` | `HTTPTelTransport` |

### Identifier (component)

**Accessors:** `id()`, `registry_id()`, `witnesses()`, `watchers()`, `current_public_keys()`, `find_state(&IP)`, `get_own_kel()`, `get_kel(&IP)`, `get_last_establishment_event_seal()`, `get_last_event_seal()`

**OOBI:** `resolve_oobi(&Oobi)` async, `send_oobi_to_watcher(&IP, &Oobi)` async, `get_location(&IP)`, `get_role_location(&IP, Role)`

**KEL (two-phase):** `rotate(...)` async `-> R<String>`, `anchor(&[SAI]) -> R<String>`, `anchor_with_seal(&[Seal]) -> R<KE<KeyEvent>>`, `finalize_rotate(&[u8], SSP)` async, `finalize_anchor(&[u8], SSP)` async, `notify_witnesses()` async

**Signing:** `sign_data(&[u8], &[SSP]) -> R<Signature>`, `sign_to_cesr(&str, &[SSP]) -> R<String>`, `verify_from_cesr(&[u8])`

**Groups:** `incept_group(Vec<IP>, u64, ...) -> R<(String, Vec<String>)>`, `finalize_group_incept(&[u8], SSP, exchanges)` async, `finalize_group_event(...)` async

**TEL:** `incept_registry()`, `issue(SAI)`, `revoke(&SAI)`, `finalize_issue/revoke(&[u8], SSP)` async, `query_tel(IP, IP)`, `finalize_query_tel(...)` async

**Delegation:** `delegate(&KE<KeyEvent>) -> R<(KE<KeyEvent>, ExchangeMessage)>`

**Watcher:** `query_watchers(&ES)`, `finalize_query(...)` async, `add_watcher(IP)`, `query_mailbox(&IP, &[BP])`, `finalize_query_mailbox(...)` async

### NontransferableIdentifier

Lightweight (no KEL). `query_log`, `query_ksn`, `finalize_query` async, `query_tel`, `finalize_query_tel` async.

### KnownEvents (RedbDatabase-concrete)

Core storage layer. Key methods: `new(PathBuf, EscrowConfig)`, `save(&Message)`, `process(&Message)`, `process_stream(&[u8])`, `incept(...)`, `finalize_inception(&[u8], &SSP)`, `anchor_with_seal(&IP, &[Seal])`, `finalize_key_event(...)`, `get_state(&IP)`, `verify(&[u8], &Signature)`.

### Communication

Async networking layer. `resolve_oobi`, `send_message_to`, `send_query_to`, `publish(Vec<BP>, &SEM)` async, `send_tel_query`, `send_tel_event`.

### DB Layout

```
{db_path}/events_database/   (RedbDatabase: KEL+OOBI)
{db_path}/query_cache         (SQLite) [query_cache]
{db_path}/tel/events/         (RedbTelDatabase)
{db_path}/tel/escrow/         (TEL escrow)
```

---

## Feature Gate Summary

| Feature | Enables |
|---------|---------|
| `query` | `Rpy` tag, `Op::Reply/Query`, `SignedReply/SignedQueryMessage`, KSN, query processing |
| `mailbox` | `Op::Exchange`, `SignedExchange`, `MailboxQuery`, forward/multisig/delegate mailbox |
| `oobi` | `Op` enum, `LocationScheme`, `EndRole`, `Role`, reply route variants |
| `oobi-manager` | `OobiManager`, `Transport` trait, `DefaultTransport`, OOBI resolution |
| `query_cache` | `IdentifierCache` (SQLite), mailbox index tracking |
