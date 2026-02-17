# CESR Encoding and Framing

## Primitive Structure

```
T-Domain Primitive Layout (ps > 0, replacement):
┌───────────────┬───────────────┬────────────────────────┐
│  type code    │  mid-pad 0s   │  value (right-aligned) │
│  (replaces    │  (zero-value  │  (Base64 encoded raw)  │
│   first ps    │   sextets)    │                        │
│   chars)      │               │                        │
├───────────────┴───────────────┴────────────────────────┤
│  total length: integer multiple of 4 chars (T domain)  │
│                integer multiple of 3 bytes (B domain)  │
└────────────────────────────────────────────────────────┘

T-Domain Primitive Layout (ps = 0, prepend):
┌─────────────────────┬──────────────────────────────────┐
│  type code           │  value (Base64 encoded raw)      │
│  (4*M chars,         │  (already 24-bit aligned)        │
│   prepended)         │                                  │
├─────────────────────┴──────────────────────────────────┤
│  total length: integer multiple of 4 chars             │
└────────────────────────────────────────────────────────┘

R-Domain Primitive = (text_code, raw_binary)
  text_code: Base64 string identifying type/size
  raw_binary: N bytes of usable cryptographic material
```

### Layout by Pad Size

| ps | Raw mod 3 | Code position | Layout | Min chars |
|----|-----------|---------------|--------|-----------|
| 2 | N%3=1 | Replaces first 2 chars | `C1 C0 V1 V0` | 4 |
| 1 | N%3=2 | Replaces first 1 char | `C0 V2 V1 V0` | 4 |
| 0 | N%3=0 | Prepended (4*M chars) | `C3 C2 C1 C0 V3 V2 V1 V0` | 8 |

`Cx` = code character, `Vx` = Base64 character from converted pre-padded raw.

## Domain Model

Three representation domains for every CESR Primitive:

| Domain | Symbol | Format | Streamable | Length constraint |
|--------|--------|--------|------------|-------------------|
| Text | T | URL-safe Base64 string | Yes | Multiple of 4 chars, min 4 |
| Binary | B | Byte string | Yes | Multiple of 3 bytes, min 3 |
| Raw | R | Tuple `(code, raw)` | No | Code is text; raw is bytes |

Six transformations: `T(B)`, `B(T)`, `T(R)`, `R(T)`, `B(R)`, `R(B)` -- all six MUST be supported [R8].

Composability property: `T(cat(b[k])) = cat(T(b[k]))` AND `B(cat(t[k])) = cat(B(t[k]))` for all k.

Base64 character set: A-Z (0-25), a-z (26-51), 0-9 (52-61), `-` (62), `_` (63). The `=` pad character is NEVER used in CESR.

## Pad Size and Code Size

### Pad Size Computation

```
ps = (3 - (N mod 3)) mod 3
```

| N mod 3 | ps | Meaning |
|---------|-----|---------|
| 0 | 0 | Already 24-bit aligned; code MUST be prepended (4*M chars) |
| 1 | 2 | 2 lead zero bytes; code replaces first 2 converted chars |
| 2 | 1 | 1 lead zero byte; code replaces first 1 converted char |

### Lead Byte Calculation

```
lead_bytes = (3 - (raw_length mod 3)) mod 3     [same formula as ps]
padded_length = raw_length + lead_bytes          [multiple of 3]
base64_length = padded_length * 4 / 3            [multiple of 4]
```

| Raw (bytes) | Lead bytes | Padded (bytes) | Base64 (chars) |
|-------------|-----------|----------------|----------------|
| 1 | 2 | 3 | 4 |
| 2 | 1 | 3 | 4 |
| 3 | 0 | 3 | 4 |
| 32 | 1 | 33 | 44 |
| 64 | 2 | 66 | 88 |

Pre-pad/post-pad equivalence: prepending ps zero bytes before encoding produces identical value sextets to appending ps `=` chars, but zeros appear at the beginning. Code replaces zero-only sextets, so value bits are unaffected.

### Text Code Size

| ps | Formula | Min M | Min code size (chars) |
|----|---------|-------|----------------------|
| 0 | `4 * M` | 1 | 4 |
| 1 | `4 * M + 1` | 0 | 1 |
| 2 | `4 * M + 2` | 0 | 2 |

Larger codes: increase M. Total T-domain length (code + converted raw) is always a multiple of 4 chars.

## T-Domain Encoding Algorithm

```
encode_t_domain(code, raw):
  1. [ ] N = len(raw)
  2. [ ] ps = (3 - (N mod 3)) mod 3
  3. [ ] padded_raw = (ps zero bytes) + raw        // length = N + ps
  4. [ ] converted = base64_encode(padded_raw)
  5. [ ] if ps > 0:
           assert len(code) == ps (for minimum code size)
           result = code + converted[ps:]           // replace first ps chars
       if ps == 0:
           assert len(code) mod 4 == 0
           result = code + converted                // prepend code
  6. [ ] return result                              // length mod 4 == 0
```

Error conditions:
- Code length does not match required size for given pad size
- Raw binary length does not correspond to a valid Primitive type

## Count Codes

A Count Code is a Primitive with an empty raw binary element (code only).

- Length MUST be multiple of 4 chars (T) / 3 bytes (B) [R19]
- Pad size MUST always be 0 (raw is empty) [R20]
- MAY be used as group delimiters or to interleave non-native serializations [R21]
- Groups MAY be recursively composed into groups of groups

### Non-CESR Interleaving

```
interleave_non_native(stream_position, serialization):
  if top-level stream → MAY interleave JSON/CBOR/MGPK directly [R22]
  if inside Count Code group → NOT permitted to interleave directly [R23]
    → MUST encode as CESR Primitive inside special Count Code [R24]
```

## Cold Start Stream Parsing

### Tritet Dispatch Table

Extract top 3 bits of first byte: `tritet = (byte >> 5) & 0x07`

| Tritet | Binary | Serialization | First byte / char | Action |
|--------|--------|---------------|-------------------|--------|
| 0 | `000` | Annotated T-domain | whitespace (LF, CR, Tab) | De-annotate, re-parse |
| 1 | `001` | CESR T-domain Count Code | `-` (0x2D) | Parse Count Code for group size |
| 2 | `010` | CESR T-domain Op Code | `_` (0x5F) | Parse Op Code |
| 3 | `011` | JSON | `{` (0x7B) | Version String in first field MUST |
| 4 | `100` | MGPK FixMap | 0x80-0x8F | Version String in first field MUST |
| 5 | `101` | CBOR Map (Major Type 5) | 0xA0-0xBF | Version String in first field MUST |
| 6 | `110` | MGPK Map16/Map32 | 0xDE-0xDF | Version String in first field MUST |
| 7 | `111` | CESR B-domain | 0xE0-0xFF | Check first sextet: 0x3E=Count, 0x3F=Op |

### Parsing Algorithm

```
cold_start_parse(stream):
  1. [ ] Read first byte
  2. [ ] tritet = (byte >> 5) & 0x07
  3. [ ] Dispatch on tritet (table above)
  4. [ ] For tritets 3-6 (JSON/CBOR/MGPK): first field MUST be Version String [R28]
  5. [ ] For tritet 7 (B-domain): convert first sextet to distinguish Count vs Op Code
  6. [ ] Parse frame according to determined type
  7. [ ] After frame completes, resume at step 1 for next frame [R29]
  On error: skip forward to next byte with valid starting tritet (cold-start resync)
```

Stream MUST start/restart with one of 8 cases [R27]. Boundary start bits MUST be mutually distinct [R26]. Parser MUST support JSON, CBOR, and MGPK interleaved serializations [R25].

## Rules

| ID | Level | Statement |
|----|-------|-----------|
| R1 | MUST | All Primitives MUST be composable |
| R2 | MUST | All Primitives MUST be self-framing |
| R3 | MUST | All Count Code groups MUST be composable |
| R4 | MUST | All Count Code groups MUST be self-framing |
| R5 | MUST | Primitive lengths MUST be multiples of 4 Base64 chars (T) or 3 bytes (B) |
| R6 | MUST | B-domain Primitive length MUST be multiple of 3 bytes, minimum 3 |
| R7 | MUST | T-domain Primitive length MUST be multiple of 4 chars, minimum 4 |
| R8 | MUST | Implementations MUST support all six domain transformations (T,B,R) |
| R9 | MUST | Type portion of Framing Codes MUST be stable in T domain |
| R10 | MUST | Type coding portion MUST consume a fixed integral number of chars per type |
| R11 | MUST | Type portion MUST begin the Framing Code |
| R12 | MAY | T-domain stable coding translates to B-domain, but MAY NOT respect byte boundaries |
| R13 | MUST | Value portion MUST be right-aligned |
| R14 | MUST | Zero padding MUST appear in the middle (after code, before value) |
| R15 | MUST | Text code size MUST be a function of ps (hence N mod 3) |
| R16 | MUST | When ps=0, prepended code MUST be multiple of 4 Base64 chars |
| R17 | MUST | All Primitives MUST employ mid-padding |
| R18 | MUST | Each code table MUST be uniquely indicated by its first T-domain character |
| R19 | MUST | Count Code length MUST be multiple of 4 chars (T) or 3 bytes (B) |
| R20 | MUST | Count Code raw element is empty; ps MUST be 0 |
| R21 | MAY | Count Codes MAY be used as separators or to interleave non-native serializations |
| R22 | MAY | Top-level stream MAY interleave non-native serializations (JSON/CBOR/MGPK) |
| R23 | NOT | Interleaving non-native serializations NOT permitted inside Count Code groups |
| R24 | MUST | Nested non-native serializations MUST be encoded as CESR Primitives in special Count Codes |
| R25 | MUST | Stream parser MUST support JSON, CBOR, and MGPK interleaved serializations |
| R26 | MUST | Boundary start bits MUST be mutually distinct |
| R27 | MUST | Each stream start/restart MUST begin with one of 8 tritet cases |
| R28 | MUST | Non-CESR serialization first field MUST be a Version String |
| R29 | MUST | After each frame, stream MUST resume with a valid starting tritet byte |

## Key Terms

| Term | Definition |
|------|-----------|
| Composability | Property: concatenated self-framing Primitives in T or B domain convert to the other domain and back without loss |
| Count Code | Code-only Primitive (no raw binary) used to frame groups or interleave non-native serializations |
| Cold start | Parser (re)synchronization to find next stream element boundary |
| Domain | Representation space: Text (T), Binary (B), or Raw (R) |
| Framing Code | Prepended code prefix encoding type and optionally size |
| Lead bytes | Pre-padded zero bytes added before Base64 conversion for 24-bit alignment |
| Mid-padding | CESR approach: leading pad bytes placed after code, before value |
| Ondex | "Other index" -- second index in dual-indexed signature codes |
| Op Code | Code type identified by `_` character (tritet `010`); selector reserved |
| Pad size (ps) | `(3 - (N mod 3)) mod 3` -- lead zero bytes for 24-bit alignment |
| Primitive | Self-framing, composable, type-size-value encoded unit |
| Quadlet | 4 Base64 chars = 3 bytes = 24 bits |
| Self-framing | Encoding includes type+size+value; extractable without external delimiters |
| Stable | Type portion of Framing Code is invariant across Primitive value changes |
| Tritet | 3-bit group identifying serialization type at stream boundaries |
