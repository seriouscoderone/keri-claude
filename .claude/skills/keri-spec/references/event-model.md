# Event Model Reference

KERI messages are insertion-ordered field maps. All top-level fields are REQUIRED and MUST appear in the specified order per message type. No other top-level fields are allowed. Signatures MUST be attached via CESR attachment codes, never as top-level fields. JSON serialization MUST be compact (`separators=(",", ":")`, `ensure_ascii=False`).

## Field Label Reference

| Label | Type | Description |
|-------|------|-------------|
| `v` | str | Version string: `KERIMmmGggKKKKSSSS.` (protocol, CESR version, serialization kind, size, terminator). MUST be first field. |
| `t` | str | Message type (ilk): 3-char string |
| `d` | str | SAID of enclosing block. In `rct`, SAID of the receipted event (not the receipt itself) |
| `i` | str | Controller AID. In `icp`/`dip`, equals `d` (SAIDive). In `rct`, AID of receipted KEL |
| `s` | str | Sequence number: lowercase hex, no leading zeros. `"0"` for inception. Max `ffffffffffffffffffffffffffffffff` (2^128-1). Strictly monotonically increasing |
| `p` | str | Prior event SAID (hash chain backward link) |
| `kt` | str/list | Signing threshold: hex integer or fractionally weighted list |
| `k` | list[str] | Current signing public keys (CESR). MUST NOT be empty |
| `nt` | str/list | Next key threshold: hex integer or fractionally weighted list |
| `n` | list[str] | Next key digests (CESR). Empty list = non-transferable (inception) or abandoned (rotation); no further events allowed |
| `bt` | str | Backer threshold: hex integer. MUST be `"0"` when `b` is empty |
| `b` | list[str] | Backer AIDs (no duplicates). Witnesses MUST be non-transferable AIDs |
| `br` | list[str] | Backers to remove (no duplicates). Removals applied before additions |
| `ba` | list[str] | Backers to add (no duplicates). Applied after all removals |
| `c` | list[str] | Configuration traits |
| `a` | list/map | Anchors/seals (list in key events) or attributes (map in routed messages) |
| `di` | str | Delegator AID |
| `u` | str | Salty nonce (~128 bits entropy) for unique SAID |
| `ri` | str | Receiver AID |
| `x` | str | Exchange SAID (from `xip`'s `d`). Empty string if standalone |
| `dt` | str | ISO-8601 datetime with microseconds + UTC offset (RFC 3339) |
| `r` | str | Route: `/`-delimited path |
| `rr` | str | Return route: `/`-delimited path |
| `q` | map | Query parameters |
| `rd` | str | Merkle tree root digest |
| `bi` | str | Registrar backer AID (non-transferable) |

A field label MUST NOT change value type across contexts. The `a` field is `list` in key events, `map` in routed messages.

## Message Field Orders

### Key Events (form the KEL)

```
icp  [v, t, d, i, s, kt, k, nt, n, bt, b, c, a]
rot  [v, t, d, i, s, p, kt, k, nt, n, bt, br, ba, c, a]
ixn  [v, t, d, i, s, p, a]
dip  [v, t, d, i, s, kt, k, nt, n, bt, b, c, a, di]
drt  [v, t, d, i, s, p, kt, k, nt, n, bt, br, ba, c, a]
```

- `icp`/`dip`: `s` MUST be `"0"`, `d` and `i` are SAIDive (equal, derived via SAID protocol)
- `dip` = `icp` + `di` field at end. `drt` field set = `rot` (no `di`; delegator inherited from `dip`)
- `rot`/`drt` use `br`/`ba` instead of `b`; include `p` for backward chaining
- `ixn`: non-establishment (no key state change), just anchors seals via `a`

### Receipt

```
rct  [v, t, d, i, s]
```

The `d` field is the SAID of the receipted event, NOT this receipt. Attached signatures sign the referenced event's serialization, not the receipt body.

### Routed Messages (not part of KEL)

```
qry  [v, t, d, dt, r, rr, q]
rpy  [v, t, d, dt, r, a]
pro  [v, t, d, dt, r, rr, q]
bar  [v, t, d, dt, r, a]
xip  [v, t, d, u, i, ri, dt, r, q, a]
exn  [v, t, d, i, ri, x, p, dt, r, q, a]
```

- `qry`/`pro` are structurally identical; `pro` targets sealed-confidential data
- `rpy`/`bar` are structurally identical; `bar` returns sealed-confidential data
- `xip` starts an exchange transaction; its `d` becomes the `x` field for subsequent `exn` messages
- `exn`: `x` and `p` are empty strings when standalone (not in a transaction)

**Ambiguity note:** Normative field orders for `qry`/`rpy`/`pro`/`bar` omit `i`, but spec examples and CESR native encoding include `i` between `d` and `dt`. Implementations should handle both.

## Seals

Seals anchor external data to key state. In JSON/CBOR/MGPK: encoded as field maps. In CESR native/attachments: encoded with count codes.

| Seal | Fields | Count Codes | Notes |
|------|--------|-------------|-------|
| SealDigest | `[d]` | `-Q`/`--Q` | Undifferentiated digest |
| SealRoot | `[rd]` | `-R`/`--R` | Merkle tree root digest |
| SealTrans | `[s, d]` | `-S`/`--S` | Source event seal; AID implied from context |
| SealEvent | `[i, s, d]` | `-T`/`--T` | Key event seal; used for delegation anchoring |
| SealLast | `[i]` | `-U`/`--U` | Latest establishment event for AID |
| SealBack | `[bi, d]` | `-V`/`--V` | Registrar backer metadata. MUST appear in same establishment event with `RB` trait |
| Typed | `[t, d]` | `-W`/`--W` | Versioned type seal (`t`: 4-char type + 3 Base64-char version, CESR `Y` prefix) |

When sealed data is a SAD, the digest SHOULD be its SAID. Count codes frame multiple seals of the same type by counting total quadlets in the frame.

## Signatures and Thresholds

### Attachment Model

All signatures attach via CESR group codes, never as top-level fields. A message with zero verifiable controller signatures MUST be dropped (not escrowed). Messages with partial signatures SHOULD be escrowed awaiting completion.

For non-key-event messages, the attachment MUST include key state reference (AID, sequence number, SAID of establishment event). For key events, the AID can be inferred from the message body.

### Threshold Rules

| Event Type | Required Threshold(s) |
|-----------|----------------------|
| `icp`, `ixn`, `dip` | Current signing threshold (`kt`) |
| `rot`, `drt` | BOTH current signing threshold AND prior next rotation threshold (dual threshold) |
| Any event with non-empty witness list | Witness threshold (`bt`) of accountable duplicity |

### Dual-Index Signature Verification (Rotation)

Rotation signatures carry two indices: first index into the rotation's `k` list, second index into the prior establishment event's `n` list.

1. Look up committed digest from prior `n` list using second index
2. Look up exposed public key from rotation's `k` list using first index
3. Digest the exposed key with the same algorithm as the committed digest
4. Verify computed digest matches committed digest (pre-rotation fulfillment)
5. Verify signature against the exposed public key

Both thresholds (current `kt` and prior `nt`) MUST be satisfied for the rotation to be valid.

## Configuration Traits

| Trait | Effect | Inception-only |
|-------|--------|---------------|
| `EO` | Only establishment events allowed in KEL. Non-establishment events MUST be dropped | Yes |
| `DND` | KEL MUST NOT act as delegator. Delegated events referencing this as delegator MUST be dropped | Yes |
| `DID` | Validators treat delegates of this AID as the AID itself | Yes |
| `RB` | Backer list provides registrar backers; each MUST have a SealBack in the same event | No |
| `NRB` | Registrar backers no longer allowed | No |

If `RB` and `NRB` both appear, the last one in the list wins.

## Delegation

Delegation requires a cooperative two-way peg:

1. **Delegatee's `dip`** MUST include `di` field with the delegator's AID
2. **Delegator's KEL** MUST contain a SealEvent `[i, s, d]` in the `a` field of an `ixn` or `rot` event, anchoring the delegatee's establishment event

`drt` has no `di` field -- the delegator AID is inherited from the associated `dip` event. The `drt` message type signals validators to apply delegated validation rules.

## KEL Structure

The KEL is an append-only, doubly hash-chained data structure for one AID:
- **Backward chain:** each post-inception event includes `p` (SAID of prior event)
- **Forward chain:** each establishment event includes `n` (digests of pre-rotated keys)
- **Signing:** events are nonrepudiably signed with current key state private keys
- There MUST be at most one valid KEL per AID, or none. An alternate verifiable KEL constitutes duplicity

### Backer List Update Algorithm (Rotation)

1. Remove all AIDs in `br` from current backer list
2. After all removals, append AIDs from `ba` (skip if already present)
3. No duplicates allowed in `br` or `ba`
