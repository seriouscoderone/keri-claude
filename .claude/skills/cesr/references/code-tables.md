# CESR Code Tables

Normative registry: all CESR encoding schemes, parse sizes, and KERI/ACDC v2.00 code points.

## Encoding Scheme Summary

15 T-domain coding schemes by selector:

| Table | Selector | Code Size | Lead | Pad | Format |
|-------|----------|-----------|------|-----|--------|
| 1-char fixed | `[A-Z,a-z]` | 1 | 0 | 1 | `$&&&` |
| 2-char fixed | `0` | 2 | 0 | 2 | `*$&&` |
| Large fixed, 0 lead | `1` | 4 | 0 | 0 | `*$$$&&&&` |
| Large fixed, 1 lead | `2` | 4 | 1 | 1 | `*$$$%&&&` |
| Large fixed, 2 lead | `3` | 4 | 2 | 2 | `*$$$%%&&` |
| Small var, 0 lead | `4` | 4 | 0 | 0 | `*$##&&&&` |
| Small var, 1 lead | `5` | 4 | 1 | 1 | `*$##%&&&` |
| Small var, 2 lead | `6` | 4 | 2 | 2 | `*$##%%&&` |
| Large var, 0 lead | `7` | 8 | 0 | 0 | `*$$$####&&&&` |
| Large var, 1 lead | `8` | 8 | 1 | 1 | `*$$$####%&&&` |
| Large var, 2 lead | `9` | 8 | 2 | 2 | `*$$$####%%&&` |
| Small count | `-` + `[A-Z,a-z]` | 4 | 0 | 0 | `*$##` |
| Large count | `--` | 8 | 0 | 0 | `**$#####` |
| Genus/version | `-_` | 8 | 0 | 0 | `**$$$###` |
| Other count (reserved) | `-` + `[0-9]` | TBD | | | `**` |
| Op codes (reserved) | `_` | TBD | | | `*` |

Format: `*` selector, `$` type, `%` lead byte, `#` B64 size int, `&` B64 value. Selector doubles as type in 1-char and small count tables. Special fixed codes MAY encode small values in the value-size portion.

## Parse Size Labels

| Label | Formula / Description |
|-------|----------------------|
| `hs` | Hard size (chars), fixed part of code |
| `ss` | Soft size (chars), variable part of code |
| `os` | Other size (chars), when soft has two values |
| `ms` | ms = ss - os (main size) |
| `cs` | cs = hs + ss (code size) |
| `vs` | Value size (chars) |
| `fs` | fs = hs + ss + vs (full size) |
| `ls` | Lead size (bytes) |
| `ps` | Pad size (chars, B64 encoded) |
| `rs` | Raw size (bytes), derived from R(T) |
| `bs` | bs = ls + rs (binary size) |

## Normative Rules

### Selectors

- First char MUST determine code table; 1-char codes double as selectors AND pad-size-1 types (R1-R4)
- `-` MUST select count codes, `_` MUST select opcodes, `[0-9]` MUST select other tables (R6-R10)

### Count Codes

- Count value MUST be Quadlets (T) / Triplets (B), invariant across domains (R11)
- MUST align on 24-bit boundary; MUST NOT have value component (type+size only) (R12-R16)
- Size MUST count Quadlets/Triplets in following group, not number of Primitives (R15, R17)
- Small: 4 chars `-X##` max 4,095; Large: 8 chars `--X#####` max 1,073,741,823 (R22-R31)

### Genus/Version

- Format `-_GGGVVV`; MUST modify all following top-level Count Codes until next genus/version (R32-R34)
- Genus/version table MUST be shared across all protocols; universal codes shared, non-universal MAY vary (R35-R38)
- Overrideable groups (`-A` to `-C`): parser MUST switch if first code is genus/version (R41-R44)

### Compliance

- All genera MUST implement Universal Codes (`-A` to `-J` + big variants) (R45-R47)
- KERI/ACDC MUST support Master + Indexed code tables (R48-R50)
- Entries SHOULD have >= 128-bit crypto strength (R51-R52)
- fs MUST = hs + ss + vs; cs MUST = hs + ss; bs MUST = ls + rs (R53-R55)

## Algorithms

### Pad Size Calculation

```
pad_size = (3 - (raw_size % 3)) % 3
```

Examples: 32 bytes -> 1, 64 bytes -> 2, 33 bytes -> 0.

### Minimum Text Code Size

```
pad_size 1 -> 1-char code
pad_size 2 -> 2-char code (selector 0)
pad_size 0 -> 4-char code (selector 1)
```

### Variable-Size Value Length

```
T-domain: length = size_value * 4  (Quadlets to chars)
B-domain: length = size_value * 3  (Triplets to bytes)
```

### Genus/Version Decoding

```
Input: -_GGGVVV (8 chars)
genus = code[2:5]          # 3 B64 chars (262,144 genera)
major = B64int(code[5])    # 0-63
minor = B64int(code[6:8])  # 0-4095
Example: -_AAACAA -> genus AAA, version 2.00
```

## Master Code Table -- KERI/ACDC v2.00

Protocol genus/version: `-_AAACAA` (v2.00). Codes `-_AAABAA` (v1.00) also defined.

### Count Codes

Codes `-A` through `-J` (and `--A` through `--J`) are **universal** across all genera. `-A` through `-C` allow genus/version override; `-D` through `-J` do not. Codes `-K` onward are **genus-specific** to KERI/ACDC.

Small = 4 chars `-X##` (max 4,095). Large = 8 chars `--X#####` (max 1,073,741,823). All count Quadlets/Triplets.

| Code | Description |
|------|-------------|
| `-A` | Generic pipeline group |
| `-B` | Message + attachments group |
| `-C` | Attachments only group |
| `-D` | Datagram stream segment |
| `-E` | ESSR wrapper signable |
| `-F` | CESR native fixed field signable |
| `-G` | CESR native field map signable |
| `-H` | Non-native message group |
| `-I` | Generic field map mixed types |
| `-J` | Generic list mixed types |
| `-K` | Indexed controller signature group |
| `-L` | Indexed witness signature group |
| `-M` | Nontransferable receipt couples (pre+sig) |
| `-N` | Transferable receipt quadruples (pre+snu+dig+sig) |
| `-O` | First seen replay couples (fnu+dt) |
| `-P` | Pathed material group (path+mixed) |
| `-Q` | Digest seal singles (dig) |
| `-R` | Merkle root seal singles (rdig) |
| `-S` | Event seal source couple (snu+dig) |
| `-T` | Anchoring seal source triple (pre+snu+dig) |
| `-U` | Last event seal singles (aid+dig) |
| `-V` | Backer registrar seal couples (brid+dig) |
| `-W` | Typed digest seal couples (type+dig) |
| `-X` | Transferable indexed sig group (pre+snu+dig+sigs) |
| `-Y` | Transferable last indexed sig group (pre+sigs) |
| `-Z` | ESSR/TSP Payload |
| `-a` | Blinded State quadruples (dig+uuid+said+state) |
| `-b` | Bound Blinded State sextuples |
| `-c` | Typed Blinded IANA media quadruples |

Each has big variant `--X#####`. Note: `-S#####` in spec uses single dash (likely typo; all others use `--`).

### Primitive Codes: 1-Character (Code Length = 1)

| Code | Description | fs |
|------|-------------|----|
| `A` | Seed of Ed25519 private key | 44 |
| `B` | Ed25519 non-transferable prefix public verkey | 44 |
| `C` | X25519 public encryption key | 44 |
| `D` | Ed25519 public verkey | 44 |
| `E` | Blake3-256 Digest | 44 |
| `F` | Blake2b-256 Digest | 44 |
| `G` | Blake2s-256 Digest | 44 |
| `H` | SHA3-256 Digest | 44 |
| `I` | SHA2-256 Digest | 44 |
| `J` | ECDSA secp256k1 private key seed | 44 |
| `K` | Ed448 private key seed | 76 |
| `L` | X448 public encryption key | 76 |
| `M` | Short number 2-byte b2 | 4 |
| `N` | Big number 8-byte b2 | 12 |
| `O` | X25519 private decryption key/seed | 44 |
| `P` | X25519 Cipher of qb64 Seed | 124 |
| `Q` | ECDSA secp256r1 256-bit random Seed | 44 |
| `R` | Tall 5-byte b2 number | 8 |
| `S` | Large 11-byte b2 number | 16 |
| `T` | Great 14-byte b2 number | 20 |
| `U` | Vast 17-byte b2 number | 24 |
| `V` | Label1 (1 byte, lead size 1) | 4 |
| `W` | Label2 (2 bytes, lead size 0) | 4 |
| `X` | Tag3 (3 B64 chars for special values) | 4 |
| `Y` | Tag7 (7 B64 chars for special values) | 8 |
| `Z` | Tag11 (11 B64 chars for special values) | 12 |
| `a` | Blinding factor 256 bits | 44 |

### Primitive Codes: 2-Character (Code Length = 2)

| Code | Description | fs |
|------|-------------|----|
| `0A` | Random salt/seed/nonce/private key/sn, 128 bits | 24 |
| `0B` | Ed25519 signature | 88 |
| `0C` | ECDSA secp256k1 signature | 88 |
| `0D` | Blake3-512 Digest | 88 |
| `0E` | Blake2b-512 Digest | 88 |
| `0F` | SHA3-512 Digest | 88 |
| `0G` | SHA2-512 Digest | 88 |
| `0H` | Long number 4-byte b2 | 8 |
| `0I` | ECDSA secp256r1 signature | 88 |
| `0J` | Tag1 (1 B64 char + 1 prepad) | 4 |
| `0K` | Tag2 (2 B64 chars) | 4 |
| `0L` | Tag5 (5 B64 chars + 1 prepad) | 8 |
| `0M` | Tag6 (6 B64 chars) | 8 |
| `0N` | Tag9 (9 B64 chars + 1 prepad) | 12 |
| `0O` | Tag10 (10 B64 chars) | 12 |
| `0P` | Gram Head Neck | 32 |
| `0Q` | Gram Head | 28 |
| `0R` | Gram Head AID Neck | 76 |
| `0S` | Gram Head AID | 72 |

### Primitive Codes: 4-Character (Code Length = 4)

| Code | Description | fs |
|------|-------------|----|
| `1AAA` | ECDSA secp256k1 non-transferable prefix verkey | 48 |
| `1AAB` | ECDSA secp256k1 verkey/enckey | 48 |
| `1AAC` | Ed448 non-transferable prefix verkey | 80 |
| `1AAD` | Ed448 public verkey | 80 |
| `1AAE` | Ed448 signature | 156 |
| `1AAF` | Tag4 (4 B64 chars) | 8 |
| `1AAG` | DateTime B64 encoded 32-char ISO-8601 | 36 |
| `1AAH` | X25519 Cipher of qb64 Salt | 100 |
| `1AAI` | ECDSA secp256r1 non-transferable verkey | 48 |
| `1AAJ` | ECDSA secp256r1 verkey/enckey | 48 |
| `1AAK` | Null (None/empty) | 4 |
| `1AAL` | No (falsey Boolean) | 4 |
| `1AAM` | Yes (truthy Boolean) | 4 |
| `1AAN` | Tag8 (8 B64 chars) | 12 |
| `1AAO` | Escape code for map field values | 4 |
| `1AAP` | Empty value (nonce/string) | 4 |

### Variable Raw Size Codes

Each type has 6 variants: small (4-char code) with 0/1/2 lead bytes (selectors `4`/`5`/`6`) and big (8-char code) with 0/1/2 lead bytes (selectors `7`/`8`/`9`). Small max: 4,095 Quadlets. Big max: 16,777,215 Quadlets.

| Type | Description |
|------|-------------|
| `A` / `AAA` | String Base64 Only |
| `B` / `AAB` | Bytes |
| `C` / `AAC` | X25519 sealed box cipher of sniffable plaintext |
| `D` / `AAD` | X25519 sealed box cipher of QB64 plaintext |
| `E` / `AAE` | X25519 sealed box cipher of QB2 plaintext |
| `F` / `AAF` | HPKE Base cipher of QB2 plaintext |
| `H` / `AAH` | Decimal number string |

Full codes expand as: `4X`, `5X`, `6X` (small) and `7AAX`, `8AAX`, `9AAX` (big) for each type letter X above.

## Indexed Code Table

Context-specific (indexed signature context). Selector implicit from context.

| Code | Description | Code Len | Index | Ondex | fs |
|------|-------------|----------|-------|-------|----|
| `A#` | Ed25519 indexed sig, both same | 2 | 1 | 0 | 88 |
| `B#` | Ed25519 indexed sig, current only | 2 | 1 | 0 | 88 |
| `C#` | ECDSA secp256k1 indexed sig, both same | 2 | 1 | 0 | 88 |
| `D#` | ECDSA secp256k1 indexed sig, current only | 2 | 1 | 0 | 88 |
| `0A##` | Ed448 indexed sig, dual | 4 | 1 | 1 | 156 |
| `0B##` | Ed448 indexed sig, current only | 4 | 1 | 1 | 156 |
| `2A####` | Ed25519 indexed sig, big dual | 6 | 2 | 2 | 92 |
| `2B####` | Ed25519 indexed sig, big current only | 6 | 2 | 2 | 92 |
| `2C####` | ECDSA secp256k1 indexed sig, big dual | 6 | 2 | 2 | 92 |
| `2D####` | ECDSA secp256k1 indexed sig, big current only | 6 | 2 | 2 | 92 |
| `3A######` | Ed448 indexed sig, big dual | 8 | 3 | 3 | 160 |
| `3B######` | Ed448 indexed sig, big current only | 8 | 3 | 3 | 160 |

Index = position in current key list. Ondex = position in next (rotation) key list. "Both same" = index serves for both. "Current only" = indexes current list only.

## Key Terms

| Term | Definition |
|------|-----------|
| Quadlet | 4 B64 chars (T-domain unit) |
| Triplet | 3 bytes (B-domain unit) |
| Count Code | type+size group header, no value; counts Quadlets/Triplets |
| Gram | CESR native message (`0P`/`0Q`/`0R`/`0S`) |
| ESSR | Encapsulated Signed Streaming Reply (`-E` + `-Z`) |
| Overrideable | `-A` to `-C`: allow genus/version switch |
| Non-overrideable | `-D` to `-J`: ignore embedded genus/version |
