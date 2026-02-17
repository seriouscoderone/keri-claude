# sad-serialization — SAD Model + Protocol Framing

> For CESR version strings, SAID algorithms, and counter code tables, see cesr skill.
> For event types (ilks) and field labels, see spec skill. For ACDC structure, see acdc skill.

## A. SAD (Self-Addressing Data)

### Sadder Trait (Base Interface)

**Accessors:** `code()` → digest code | `raw()` → bytes | `ked()` → Value | `ident()` → protocol | `kind()` → encoding | `size()` → u32 | `version()` → Version | `saider()` → Saider | `said()` → qb64 | `saidb()` → qb64 bytes | `pretty(size)` → formatted

**Construction:** `new(code, raw, kind, ked, sad)` → dispatch: raw → ked → sad | `populate_from_raw(raw)` → inhale | `populate_from_ked(ked, kind)` → exhale+sizeify | `populate_from_kind_and_self(kind)` → re-serialize

**Internal:** `inhale(raw)` = sniff + loads | `exhale(ked, kind)` = sizeify

### Serder (KERI Event Serializer)

**Fields:** `code, raw, ked, ident, kind, size, version, saider` (ident=`"KERI"`)

**Construction:** `new(code, raw, kind, ked, sad)` | `new_with_ked(ked, code, kind)` | `new_with_raw(raw)`

**Field Extractors:** `pre()` → i (prefix qb64) | `preb()` → i bytes | `sn()` → s (u128) | `sner()` → s (Number) | `fner()` → f (optional) | `_fn()` → f (u128, error if absent) | `verfers()` → k (Vec\<Verfer\>) | `digers()` → n (Vec\<Diger\>) | `werfers()` → b (Vec\<Verfer\>) | `tholder()` → kt (optional) | `ntholder()` → nt (optional) | `est()` → true if t in EST_ILKS

**Default:** `code: Blake3_256, ident: "KERI", kind: "JSON", version: v1.0`

Serder uses `versify`/`deversify`/`sniff` internally for version string handling.

### Creder (ACDC Credential Serializer)

**Fields:** Same as Serder, but ident=`"ACDC"`. **Construction:** Same as Serder.

**Field Extractors:** `crd()` → ked alias | `issuer()` → i | `schema()` → s | `subject()` → a | `status()` → ri (optional) | `chains()` → e

**Default:** Same as Serder, but ident=`"ACDC"`

### SAID Injection (cesride API)

`Saider::saidify(&ked)` → `Serder::new_with_ked(&ked)` (triggers exhale → sizeify) → extract `serder.raw()`, `serder.said()`. See cesr-spec for SAID algorithm details.

### sizeify

Internal: extracts `ked["v"]`, serializes, measures, rebuilds version string with correct size. Returns `SizeifyResult { raw, ident, kind, ked, version }`.

### Serialization Helpers

| Function | Purpose |
|----------|---------|
| `loads(raw, size, kind)` | Deserialize bytes to Value; truncates at size |
| `dumps(ked, kind)` | Serialize Value to bytes |

### Ids (Field Label Constants)

Rust constants in `Ids` module: `v d i s t k n b a f kt nt di` + `$id @id id`. See keri-spec for semantics.

## B. Counters (Group Framing Constructs)

Counters encode (type code + count) to frame groups of CESR primitives in streams. NOT Matter primitives.

### Counter Struct & API

`Counter{code:String, count:u32}` default `{"",0}`

**Construction:** `new(count, count_b64, code, qb64b, qb64, qb2)` dispatch: code → qb64b → qb64 → qb2 | `new_with_code_and_count(code, count)` | `new_with_qb64(qb64)` | `new_with_qb64b(qb64b)` | `new_with_qb2(qb2)`

**Public:** `code()` | `count()` | `count_as_b64(len)` | `qb64()` | `qb64b()` | `qb2()` | `full_size()` | `sem_ver_str_to_b64("1.2.3")→"BCD"` | `sem_ver_to_b64(1,2,3)→"BCD"`

**Internal:** `infil()` encode qb64 | `binfil()` encode qb2 | `exfil(qb64)` decode | `bexfil(qb2)` decode

73 counter codes defined in `Counter::Codex` — see cesr for full registry.

### Semantic Versioning

**Functions:** `sem_ver_str_to_b64(version)`, `sem_ver_to_b64(major, minor, patch)`, `sem_ver_parts_to_b64(parts)` (internal)

**Constraints:** max 3 parts, each 0-63, empty parts default to 0.

## C. Constants

Rust modules `Ilkage` and `Tierage` provide string constants. See keri-spec for event type semantics.

`EST_ILKS: &["icp", "rot", "dip", "drt"]` — used by `Serder::est()`
`Tierage: {min, low, med, high}` — Argon2 key derivation tiers for `Salter`

## Notes

- SAID injection: saidify() first (with placeholder size), then sizeify() corrects size
- Counter opcode 0x3f is rejected (reserved for other primitives)
- Counter max count = 64^ss - 1
- Pretty printing uses 2-space indentation (differs from keripy's 4 spaces)
