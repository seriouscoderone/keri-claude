# CESR Native Encoding

CESR native is one of four serialization kinds (alongside JSON, CBOR, MGPK). In native CESR, top-level fields carry no labels -- field identity is determined entirely by position in a strict per-type order. List values use CESR generic list count codes; nested field maps (seals) use generic field map count codes. Each primitive is self-framing via its derivation code (algorithm + length). Message size is in the message count code, not the version field. SAIDive fields change from JSON/CBOR/MGPK values because the digest is computed over the CESR serialization.

## Version Field

Code `0O` with 10 Base64 characters of payload:

| Component | Size | Range |
|-----------|------|-------|
| Protocol type | 4 chars | `KERI` for normative |
| Protocol version major | 1 char | 0-63 |
| Protocol version minor | 2 chars | 0-4095 |
| Genus version major | 1 char | 0-63 |
| Genus version minor | 2 chars | 0-4095 |

Example: `0OKERICAACAA` = KERI v2.0, genus v2.0. Omits message size and serialization kind (both external in native CESR).

## Field Encodings

### DateTime (`dt`)

ISO-8601 with microseconds and UTC offset (RFC 3339). Non-Base64 characters substituted before encoding:

`:` -> `c`, `.` -> `d`, `+` -> `p`

Example: `2020-08-22T17:50:09.988921+00:00` -> `2020-08-22T17c50c09d988921p00c00`

### Fractionally Weighted Threshold (`kt`/`nt`)

Variable-length Base64 with infix operator conversion (one nesting level only):

| Operation | Infix | Description |
|-----------|-------|-------------|
| `/` | `s` | fraction separator |
| `{:[,]}` key | `k` | map key |
| `{:[,]}` value | `v` | nested weight list element |
| `[,]` | `c` | simple weight list element |
| `[[],[]]` | `a` | ANDed weight list |

Example: `[[{"1/2":["1/2","1/2","1/2"]},"1/2",{"1/2":["1","1"]}],["1/2",{"1/2":["1","1"]}]]` -> `1s2k1s2v1s2v1s2c1s2c1s2k1v1a1s21s2k1v1`

### Route (`r`/`rr`)

If route has no `-` and no non-Base64 chars besides `/`: MAY convert `/` to `-` and encode as variable-length Base64 string. Otherwise MUST convert as binary to Base64. Example: `/ipex/offer` -> `-ipex-offer`.

## Message Field Orders

All field orders are strict left-to-right. List fields (`k`, `n`, `b`, `br`, `ba`, `c`, `a`, `q`) use CESR generic list count codes. Nested maps (seals in `a`) use generic field map count codes.

| Type | CESR Field Order |
|------|-----------------|
| `icp` | v, t, d, i, s, kt, k, nt, n, bt, b, c, a |
| `rot` | v, t, d, i, s, p, kt, k, nt, n, bt, br, ba, c, a |
| `ixn` | v, t, d, i, s, p, a |
| `dip` | v, t, d, i, s, kt, k, nt, n, bt, b, c, a, di |
| `drt` | v, t, d, i, s, p, kt, k, nt, n, bt, br, ba, c, a, di |
| `rct` | v, t, d, i, s |
| `qry` | v, t, d, i, dt, r, rr, q |
| `rpy` | v, t, d, i, dt, r, a |
| `pro` | v, t, d, i, dt, r, rr, q |
| `bar` | v, t, d, i, dt, r, a |
| `xip` | v, t, d, u, i, ri, dt, r, q, a |
| `exn` | v, t, d, i, ri, x, p, dt, r, q, a |

**Spec ambiguity:** The normative prose field lists for `qry`/`rpy`/`pro`/`bar` omit `i`, and `xip` omits `u`. The spec examples and CESR serializations include them. Implementations should include `i` (position 4 for routed messages) and `u` (position 4 for `xip`).

## Seal Count Codes

Seals use type-specific count codes. Fields are unlabeled; identity determined by position within the seal.

| Seal Type | Code (sm/big) | Fields (strict order) |
|-----------|---------------|----------------------|
| SealDigest | `-Q` / `--Q` | d |
| SealRoot | `-R` / `--R` | rd |
| SealTrans | `-S` / `--S` | s, d |
| SealEvent | `-T` / `--T` | i, s, d |
| SealLast | `-U` / `--U` | i |
| SealBack | `-V` / `--V` | bi, d |
| TypedSeal | `-W` / `--W` | t, d |

**SealDigest:** Undifferentiated digest of external data (SAID if data is a SAD).
**SealRoot:** Merkle tree root digest -- compact commitment to many data items.
**SealTrans:** Source event seal with implied AID from context. Used for registry issuance/revocation and delegation references.
**SealEvent:** External KEL event reference (explicit AID + sequence + SAID).
**SealLast:** References latest establishment event for an AID (no specific event).
**SealBack:** Backer AID + metadata digest. Must appear in same establishment event that designates the registrar backer with config trait `RB`.
**TypedSeal:** Versioned type code (`Y` prefix: 4 chars type + 3 chars version) + digest. Example: `YCSMTCAA` = type `CSMT`, v2.0.

**Encoding rules:** In JSON/CBOR/MGPK, seals MUST be field maps. In CESR native or attachments, seals MUST use the appropriate count code.
