# TEL Registry: Lifecycle and State Machine

## Event Types

| Ilk | Name | Purpose |
|-----|------|---------|
| `rip` | Registry Inception | Initialize a new registry |
| `bup` | Blindable Update | Update state with optional blinding |
| `upd` | Update | Update state with publicly visible state |

A Registry MAY use `bup`, `upd`, or both, switching between them as state evolves.

### Transaction Event Seal

Fields: `[s, d]`. `d` (SAID) MUST be present. `s` (hex sequence number) MAY be included for easier lookup. CESR couple via count code `-T##` or `--T#####`.

### `rip` Field Ordering: `[v, t, d, u, i, n, dt]`

| Field | Constraint |
|-------|-----------|
| `v` | MUST have protocol type `ACDC` |
| `t` | MUST = `rip` |
| `d` | MUST = SAID of enclosing block; becomes REGID |
| `u` | MUST have ~128 bits entropy |
| `i` | MUST be valid Issuer AID |
| `n` | MUST = hex `0` for inception |
| `dt` | MUST be ISO-8601 with microseconds + UTC offset (RFC 3339) |

[AMBIGUOUS: spec prose says `s` for sequence number but field ordering and tables use `n`]

### `bup` Field Ordering: `[v, t, d, rd, n, p, dt, b]`

Common fields (`v`, `t`, `d`, `n`, `dt`) same constraints as `rip`; `t` MUST = `bup`. Additional:

| Field | Constraint |
|-------|-----------|
| `rd` | MUST = `d` field of the `rip` event (REGID) |
| `p` | MUST = `d` field of immediately prior event |
| `b` | MUST = SAID (BLID) of blinded attribute block |

### `upd` Field Ordering: `[v, t, d, rd, n, p, dt, ta, ts]`

Common fields same as `bup`; `t` MUST = `upd`. Additional:

| Field | Constraint |
|-------|-----------|
| `ta` | MUST = SAID of associated ACDC (top-level `d`) |
| `ts` | MUST be string from finite set of state values; MUST be CESR Text domain encoded |

[AMBIGUOUS: top-level event uses `ta`; blinded attribute block uses `td` for same concept. Likely `ta` is the correct event-level label, `td` is the virtual label in blinded blocks.]

---

## Transaction Event Validation

### TEL Event Creation

1. Assign TEL a universally unique identifier (e.g., SAID of associated ACDC)
2. Associate TEL with KEL Controller AID (the Issuer)
3. Create transaction event with event SAID
4. Generate seal including the event SAID
5. Include seal in a key event in the controlling KEL
6. Have sealing key event accepted into KEL (sign; MAY include witnessing/delegation)
7. Acceptance creates verifiable, nonrepudiable commitment to the seal

TEL events do not need signing -- the signed seal digest in the KEL is cryptographically equivalent.

### TEL Event Validation

1. Receive seal reference (Issuer AID, key event sequence number, key event SAID)
2. Look up the seal in the KEL using the seal reference
3. Cryptographically verify presence of the seal in the associated KEL
4. Seal verification is equivalent to signature verification on the transaction event

Key state binding persists despite Issuer key rotation -- events are bound to key state at point of sealing.

---

## Blinded Attribute Block (Quintuple)

Serialization: CESR concatenation only (no field labels). Labels are virtual mnemonics.
Ordering: MUST be `[d, u, td, ts]`
Attachment: CESR group `-a##` (`BlindedStateQuadruples`) or `--a######` (big variant). Multiple blocks MAY be in one group.

| Virtual Label | Constraints |
|---------------|------------|
| `d` | BLID = SAID over CESR concat of all fields; BLAKE3-256 (`E` code), 44 chars qb64; any 44-char digest code MAY be used |
| `u` | Blinded: ~128 bits entropy, SHOULD use `Salt_256` (32-byte); MUST be 2x shared secret salt length. Public/unblinded: MAY be `1AAP` |
| `td` | ACDC top-level SAID or `1AAP` placeholder. MUST be one or the other |
| `ts` | State string or `1AAP` placeholder; MAY use any CESR Tag/String code |

[AMBIGUOUS: spec line 4661 says "`ts` field" when clearly meaning `td` -- typo]

Block is NOT part of the `bup` message; MAY be provided as attachment (e.g., to the ACDC).

### Common State String CESR Encodings

| Plain | CESR |
|-------|------|
| `""` (empty) | `1AAP` |
| `"issued"` | `0Missued` |
| `"revoked"` | `Yrevoked` |

### Transaction State CESR Encoding Codes (`ts` field)

Tag codes: `0J`(1) `0K`(2) `X`(3) `1AAF`(4) `0L`(5) `0M`(6) `Y`(7) `1AAN`(8) `0N`(9) `0O`(10) `Z`(11) -- B64 char count in parens
StrB64: `4A`/`5A`/`6A` (lead 0/1/2), big: `7AAA`/`8AAA`/`9AAA`
Labels: `V`(1-byte) `W`(2-byte)
Bytes: `4B`/`5B`/`6B` (lead 0/1/2), big: `7AAB`/`8AAB`/`9AAB`
Empty: `1AAP`

---

## Bound Blinded Attribute Block (Sextuple)

Extends quintuple with Issuee key state binding for delegated authority chains.
Ordering: MUST be `[d, u, td, ts, bn, bd]`
Attachment: CESR group `-b##` (`BoundStateSextuples`) or `--b######` (big variant).

| Virtual Label | Constraints |
|---------------|------------|
| `d` | BLAKE3-256 SAID of serialized block (44 chars CESR) |
| `u` | Random or HD from salt + sequence number; MUST be 2x shared secret salt |
| `td` | ACDC SAID or `1AAP` placeholder |
| `ts` | CESR-encoded state: `1AAP`, `0Missued`, or `Yrevoked` |
| `bn` | CESR-encoded non-negative integer; placeholder = `MAAA` (0). Active: MUST = Issuee key event `s` at time of `bup` publication |
| `bd` | Issuee key event SAID or `1AAP` placeholder. Active: MUST = Issuee key event `d` at time of `bup` publication |

[AMBIGUOUS: spec uses `tn` in prose but `bn` in data structures -- `bn` is correct]

CESR integer codes for `bn`: `M`(2B) `0H`(4B) `R`(5B) `N`(8B) `S`(11B) `T`(14B) `0A`(16B) `U`(17B)

---

## BLID Computation Algorithm

1. Determine CESR Text domain length of chosen digest (BLAKE3-256 = 44 chars)
2. Create `#` placeholder of that length for `d` field
3. Concatenate CESR Text serializations in order: `[dummied_d, u, td, ts]` (quintuple) or `[dummied_d, u, td, ts, bn, bd]` (sextuple)
4. Compute digest (BLAKE3-256) on full dummied serialization string (QB64 TEXT domain)
5. CESR-encode raw digest in Text domain (qualified Base64) -- this is the BLID
6. Replace `#` placeholder with computed BLID
7. Result = final serialized blinded attribute block
8. Return BLID + serialized block

Placeholder values: `td` = `1AAP`, `ts` = `1AAP`, `u` (public mode) = `1AAP`. Incorrect dummy length causes SAID mismatch.

Serialization length formulas:
- Quintuple placeholder: 44 + 44 + 4 + 4 = 96 chars
- Quintuple with values: 44 + 44 + 44 + len(ts) chars
- Sextuple placeholder: 44 + 44 + 4 + 4 + 4 + 4 = 104 chars
- Sextuple with values: 44 + 44 + 44 + len(ts) + len(bn) + 44 chars

---

## Discloser Unblinding Algorithm (Brute-Force)

Inputs: shared secret salt, `n` from published `bup`, BLID `b` from `bup`, known ACDC SAID, state set `{1AAP, 0Missued, Yrevoked}`

1. Derive UUID `u` from shared secret salt + sequence number `n` via HD algorithm
2. Enumerate `td` values: `{1AAP, <real ACDC SAID>}` (2)
3. Enumerate `ts` values: `{1AAP, 0Missued, Yrevoked}` (3)
4. Yields 6 combinations (quintuple). For sextuple, also enumerate `bn`/`bd` from Issuee KEL
5. Compute BLID for each combination
6. Match against published `b` field -- match reveals true `td` and `ts`
7. Disclosee verifies by recomputing BLID from disclosed block and comparing to published `b`

No match = corrupted data, wrong salt, or wrong ACDC SAID.

---

## Registry Patterns

| Pattern | Events | Privacy | Placeholder | Re-blind | Key Binding |
|---------|--------|---------|-------------|----------|-------------|
| 1. Blinded | `rip` -> `bup`* | Full blind | MAY precede issuance | MAY decorrelate timing | No |
| 2. Public Blindable | `rip` -> `bup`* | Public (expanded block attached) | Same as blinded | Can switch to private later | No |
| 3. Non-Blindable | `rip` -> `upd`* | None (`ta`/`ts` exposed) | No placeholders | No | No |
| 4. Bound Blinded | `rip` -> `bup`* (sextuple) | Full blind + Issuee binding | MAY precede issuance | MAY decorrelate timing | `bn`/`bd` bind to Issuee KEL |

Pattern 2: Issuer MUST attach expanded blinded attribute block to `bup` publication. `u` MAY be `1AAP`. Attachment MUST use `-a##` or `--a######`.

Pattern 3: `i` field of ACDC MUST match `i` field of `rip`. No placeholder events. First `upd` binds the ACDC.

Pattern 4: Active bound blocks set `bn` = Issuee current key event `s`, `bd` = Issuee current key event `d`. Placeholder: `bn` = `MAAA`, `bd` = `1AAP`.

---

## Field Reference (All 12 Labels)

`v`=Version String (all), `t`=Ilk (all), `d`=Event SAID (all), `u`=UUID nonce (`rip`), `i`=Issuer AID (`rip`), `rd`=Registry SAID (`bup`,`upd`), `n`=Sequence number (all; hex, no leading zeros, zero-based monotonically increasing), `p`=Prior event SAID (`bup`,`upd`), `dt`=Datetime (all; ISO-8601 microsecond + UTC), `b`=Blinded block SAID (`bup`), `ta`=Transaction ACDC SAID (`upd`), `ts`=Transaction state (`upd`; MUST be CESR Text domain encoded)

---

## State Machines

### Registry Event Lifecycle (Generic TEL)

```
[uninitialized] --rip (n=0, sealed in KEL)--> [incepted]
[incepted] --bup (rd=REGID, n++, p=prior d, sealed)--> [active:blinded]
[incepted] --upd (rd=REGID, n++, p=prior d, sealed)--> [active:unblinded]
[active] --bup (valid chain)--> [active:new-blinded]
[active] --upd (valid chain)--> [active:new-unblinded]
```

MAY switch between `bup` and `upd` as state evolves. No defined terminal state.

### Blinded State Registry

```
(none) --rip--> [placeholder]
[placeholder] --bup(td=1AAP,ts=1AAP)--> [placeholder]  (decorrelate init)
[placeholder] --bup(td=SAID,ts=0Missued)--> [issued]
[issued] --bup(td/ts unchanged, new u/b)--> [issued]  (re-blind)
[issued] --bup(td=SAID,ts=Yrevoked)--> [revoked]
[revoked] --bup(td/ts unchanged, new u/b)--> [revoked]  (re-blind)
```

[AMBIGUOUS: spec does not state whether revoked can transition back to issued]

### Bound Blinded State Registry

Same transitions as blinded, with additional guards:
- Issue: `bn` = Issuee key event `s`, `bd` = Issuee key event `d`
- Re-blind: MAY update `bn`/`bd` to current Issuee key state
- Revoke: `bn`/`bd` bind revocation to Issuee key state
- Placeholder: `bn` = `MAAA`, `bd` = `1AAP`

### Non-Blindable State Registry

```
(none) --rip--> [awaiting issuance]
[awaiting issuance] --upd(ta=SAID,ts=issued,p=rip SAID,n=1)--> [issued]
[issued] --upd(ta=SAID,ts=revoked,valid chain)--> [revoked]
```

No placeholder events. `ta`/`ts` publicly visible. No re-blinding capability.

### Blinded State Disclosure Flow

```
[blinded] --disclosure (derive u from salt+n, match BLID)--> [disclosed]
[disclosed] --re-blind (Issuer publishes new bup, new u)--> [re-blinded]
[re-blinded] --disclosure (new interaction)--> [disclosed]
```

Cyclical, no terminal state. Observer cannot correlate state changes to publication events.

---

## Cross-Cutting Rules

- All transaction events MUST be sealed in a KEL via transaction event seals
- ACDC `i` field MUST match `rip` `i` field (binds Issuer to both)
- ACDC top-level `d` MUST match `td` of the `bup` that issues it
- ACDC MAY include `rd` reference to registry; presentation MAY attach `rd` separately
- Each new event MUST increment sequence number and hence blinding factor
- New events MAY or MAY NOT change actual blinded state (decorrelation)
- Issuer MAY define empty placeholder values to prevent correlation
- Discloser MAY request re-blinding via authenticated endpoint; MAY have blind updated periodically
- Shared secret salt MUST have ~128 bits cryptographic entropy
- HD derivation MUST preserve ~128 bits strength; MUST use salt + sequence number as path
