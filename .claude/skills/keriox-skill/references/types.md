# keriox Types Reference

Source: `keriox_core/src/`

## Event Types

### KeyEvent

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `prefix` | `IdentifierPrefix` | `"i"` | yes |
| `sn` | `u64` | `"s"` SerHex | yes |
| `event_data` | `EventData` | flatten | yes |

Traits: `Typeable(EventTypeTag)`, `EventSemantics`

### EventData (enum, untagged)

| Variant | Type | Notes |
|---------|------|-------|
| `Dip` | `DelegatedInceptionEvent` | Must precede Icp (superset, has `di`) |
| `Icp` | `InceptionEvent` | |
| `Rot` | `RotationEvent` | |
| `Ixn` | `InteractionEvent` | |
| `Drt` | `RotationEvent` | Delegated rotation reuses RotationEvent |

Variant order matters for untagged deserialization.

### InceptionEvent

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `key_config` | `KeyConfig` | flatten | yes |
| `witness_config` | `InceptionWitnessConfig` | flatten | yes |
| `inception_configuration` | `Vec<String>` | `"c"` | yes |
| `data` | `Vec<Seal>` | `"a"` | yes |

Constructor: `new(key_config, Option<witness_config>, Option<inception_config>)`

### RotationEvent

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `previous_event_hash` | `SaidValue` | `"p"` (private) | yes |
| `key_config` | `KeyConfig` | flatten | yes |
| `witness_config` | `RotationWitnessConfig` | flatten | yes |
| `data` | `Vec<Seal>` | `"a"` | yes |

### InteractionEvent

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `previous_event_hash` | `SaidValue` | `"p"` (private) | yes |
| `data` | `Vec<Seal>` | `"a"` | yes |

### DelegatedInceptionEvent

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `inception_data` | `InceptionEvent` | flatten | yes |
| `delegator` | `IdentifierPrefix` | `"di"` | yes |

### Receipt

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `serialization_info` | `SerializationInfo` | `"v"` | **no** |
| `event_type` | `EventTypeTag` | `"t"` | **no** |
| `receipted_event_digest` | `SelfAddressingIdentifier` | `"d"` | **no** |
| `prefix` | `IdentifierPrefix` | `"i"` | **no** |
| `sn` | `u64` | `"s"` SerHex | **no** |

Traits: `Typeable` (always `Rct`), `From<Receipt> for Payload`

---

## Event Sections

### KeyConfig

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `threshold` | `SignatureThreshold` | `"kt"` | yes |
| `public_keys` | `Vec<BasicPrefix>` | `"k"` | yes |
| `next_keys_data` | `NextKeysData` | flatten | yes |

Methods: `verify(&[u8], &[IndexedSignature])`, `verify_next(&KeyConfig)`, `commit(&HashFunction) -> NextKeysData`

### NextKeysData

| Field | Type | Serde | rkyv |
|-------|------|-------|------|
| `threshold` | `SignatureThreshold` | `"nt"` | yes |
| `next_key_hashes` | `Vec<SaidValue>` | `"n"` (private) | yes |

### SignatureThreshold (enum, untagged)

| Variant | Fields | Notes |
|---------|--------|-------|
| `Simple` | `u64` | SerHex, default=1 |
| `Weighted` | `WeightedThreshold` | |

Methods: `simple(n)`, `single_weighted(vec)`, `multi_weighted(vec)`, `enough_signatures(&[u16])`

### WeightedThreshold (enum, untagged)

| Variant | Fields |
|---------|--------|
| `Single` | `ThresholdClause` (newtype `Vec<ThresholdFraction>`) |
| `Multi` | `MultiClauses` (newtype `Vec<ThresholdClause>`) |

`ThresholdFraction`: custom serde as `"n/d"` string, impl `FromStr`/`Display`.

### Seal (enum, untagged)

| Variant | Fields (serde keys) |
|---------|---------------------|
| `Location` | `i`: IdentifierPrefix, `s`: u64, `t`: String, `p`: SaidValue |
| `Event` | `i`: IdentifierPrefix, `s`: u64, `d`: SaidValue |
| `Digest` | `d`: SaidValue |
| `Root` | `rd`: SaidValue |

Standalone (not Seal variants): `DelegatingEventSeal{i,d}` (no rkyv), `SourceSeal{sn,digest}`

### InceptionWitnessConfig

| Field | Type | Serde | Default |
|-------|------|-------|---------|
| `tally` | `SignatureThreshold` | `"bt"` | Simple(0) |
| `initial_witnesses` | `Vec<BasicPrefix>` | `"b"` | [] |

### RotationWitnessConfig

| Field | Type | Serde | Default |
|-------|------|-------|---------|
| `tally` | `SignatureThreshold` | `"bt"` | Simple(0) |
| `prune` | `Vec<BasicPrefix>` | `"br"` | [] |
| `graft` | `Vec<BasicPrefix>` | `"ba"` | [] |

### Serde Flattening Chain

KeyConfig -> InceptionEvent/RotationEvent, NextKeysData -> KeyConfig, WitnessConfigs -> Events, InceptionEvent -> DelegatedInceptionEvent. All JSON is flat.

---

## Prefix Types

### IdentifierPrefix (enum)

| Variant | Inner | rkyv |
|---------|-------|------|
| `Basic` | `BasicPrefix` | yes |
| `SelfAddressing` | `SaidValue` | yes |
| `SelfSigning` | `SelfSigningPrefix` | yes |

Traits: `Display`, `FromStr` (tries Basic->SelfAddressing->SelfSigning), `CesrPrimitive`, custom serde (CESR qb64 string). Default: `SelfAddressing(SelfAddressingIdentifier::default().into())`

### BasicPrefix (enum)

| Variant | Transferable |
|---------|-------------|
| `ECDSAsecp256k1NT(PublicKey)` | no |
| `ECDSAsecp256k1(PublicKey)` | yes |
| `Ed25519NT(PublicKey)` | no |
| `Ed25519(PublicKey)` | yes |
| `Ed448NT(PublicKey)` | no |
| `Ed448(PublicKey)` | yes |
| `X25519(PublicKey)` | yes |
| `X448(PublicKey)` | yes |

Methods: `is_transferable()`, `verify(data, &SelfSigningPrefix)`

### SelfSigningPrefix (enum)

`Ed25519Sha512(Vec<u8>)`, `ECDSAsecp256k1Sha256(Vec<u8>)`, `Ed448(Vec<u8>)`

### IndexedSignature

| Field | Type | rkyv |
|-------|------|------|
| `index` | `Index` | yes |
| `signature` | `SelfSigningPrefix` | yes |

### Index (enum)

| Variant | Fields | Notes |
|---------|--------|-------|
| `CurrentOnly` | `u16` | |
| `BothSame` | `u16` | |
| `BothDifferent` | `(u16, u16)` | (current, previous_next) |

Methods: `current() -> u16`, `previous_next() -> Option<u16>`

### SeedPrefix (enum, no rkyv)

`RandomSeed128`, `RandomSeed256Ed25519`, `RandomSeed256ECDSAsecp256k1`, `RandomSeed448` — all `(Vec<u8>)`. Method: `derive_key_pair() -> Result<(PublicKey, Vec<u8>)>`

---

## cesr_adapter: From/Into Bridges

| cesrox -> keriox | keriox -> cesrox |
|------------------|------------------|
| `PublicKey` -> `BasicPrefix` | `BasicPrefix` -> `PublicKey` |
| `Signature` -> `SelfSigningPrefix` | `SelfSigningPrefix` -> `Signature` |
| `IndexedSignature` -> `IndexedSignature` | `IndexedSignature` -> `CesrIndexedSignature` |
| `Identifier` -> `IdentifierPrefix` | `IdentifierPrefix` -> `Identifier` |
| `CesrIndex` -> `Index` | `Index` -> `CesrIndex` (Big* when >=64) |
| `(u64, Digest)` -> `SourceSeal` | |

---

## Message Wrappers

- **`KeriEvent<T>`** — wraps typed event + `SerializationInfo` + SAID
- **`SignedEventMessage`** — `KeriEvent<KeyEvent>` + signatures (rkyv-stored)
- **`Nontransferable`/`Transferable`** — receipt types, multimap-stored by SAID
- **`Timestamped<M>`** — `{timestamp: DateTime<Local>, signed_event_message: M}`, method `is_stale(Duration)`

---

## Database

### Trait Hierarchy

- `EventDatabase` — top-level: `Error`, `LogDatabaseType`
- `LogDatabase<'db>` — digest-keyed event/sig/receipt log
- `SequencedEventDatabase` — (identifier, sn) -> digest index
- `EscrowCreator` — factory for escrow databases
- `EscrowDatabase` — combines index + log

### Concrete: `RedbDatabase` (all backed by `Arc<redb::Database>`)

### Tables

| Const | Name | Key | Value | Kind |
|-------|------|-----|-------|------|
| `KELS` | `kels` | `(&str, u64)` | rkyv SAID | Table |
| `KEY_STATES` | `key_states` | `&str` | rkyv IdentifierState | Table |
| `EVENTS` | `events` | rkyv SAID | rkyv KeriEvent | Table |
| `SIGS` | `signatures` | rkyv SAID | rkyv IndexedSignature | Multimap |
| `NONTRANS_RCTS` | `nontrans_receipts` | rkyv SAID | rkyv Nontransferable | Multimap |
| `TRANS_RCTS` | `trans_receipts` | rkyv SAID | rkyv Transferable | Multimap |
| `SEALS` | `seals` | rkyv SAID | rkyv SourceSeal | Table |
| `KSN` | `ksns` | rkyv SAID | cbor SignedReply | Table |
| `ACCEPTED_KSN` | `accepted` | `(&str, &str)` | SAID string | Table |
| `MAILBOX_LOG` | `mailbox_log` | Blake3 digest | cbor SignedEventMessage | Table |

Feature gates: `query` enables KSN tables; `mailbox` enables mailbox tables (`mbxrct`, `mbxrpy`, `mbxm`, `mbxd`).

### Serialization by Domain

| Domain | Format |
|--------|--------|
| Events, sigs, key state, seals, SAIDs | rkyv (zero-copy) |
| Mailbox, KSN replies | serde_cbor |
| Mailbox log keys | Blake3_256 content-addressed |

### rkyv Remote Derives

`SaidValue` wraps `SelfAddressingIdentifier` via `#[rkyv(remote)]` on `SAIDef`. Similar wrappers: `SerializationInfoDef`, `HashFunctionDef`, `HashFunctionCodeDef`, `SerializationFormatsDef`.

---

## Derive Pattern Summary

**Standard event/section types:** `Serialize, Deserialize, Debug, Clone, PartialEq, rkyv::Archive, rkyv::Serialize, rkyv::Deserialize` + `#[rkyv(derive(Debug))]`

**Exceptions:** Receipt/DelegatingEventSeal/SeedPrefix (no rkyv) | Error types (thiserror, some with serde) | All prefixes (custom serde)

## JSON Field Map

| Key | Field |
|-----|-------|
| `i` | prefix |
| `s` | sn |
| `kt` | threshold (signing) |
| `k` | public_keys |
| `nt` | threshold (next) |
| `n` | next_key_hashes |
| `bt` | tally |
| `b` | initial_witnesses |
| `br` | prune |
| `ba` | graft |
| `c` | inception_configuration |
| `a` | data (anchors) |
| `p` | previous_event_hash |
| `di` | delegator |
| `d` | receipted_event_digest |
| `v` | serialization_info |
| `t` | event_type |

## Error Types

- **`SignatureError`**: NotEnoughSigsError, DuplicateSignature, TooManySignatures, MissingIndex, WrongSignatureTypeError, WrongKeyTypeError
- **`ThresholdError`**: ParseIntError, FractionExpected
- **`prefix::Error`**: IncorrectLengthError, WrongSeedTypeError, DeserializeError, ParseError(cesrox), KeysError
- **`RedbError`**: DatabaseCreationFiled, TransactionFiled, CommitFiled, TableError, InsertingError, RetrievingError, WrongValue, WrongKey, NotFound, MissingDigest, Rkyv, AlreadySaved
