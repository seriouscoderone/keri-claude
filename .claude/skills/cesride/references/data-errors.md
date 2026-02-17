# data-errors — Data Model + Error Taxonomy

JSON-compatible data model (`data::Value`) and error taxonomy for CESR operations. **CRITICAL:** `data::Number` (JSON numeric wrapper) ≠ `core::number::Number` (CESR primitive implementing `Matter`).

---

## Value Enum

**Source:** data.rs:35-43

| Variant | Payload | Type Alias |
|---------|---------|------------|
| `Null` | — | — |
| `Boolean` | `bool` | — |
| `Number` | `Number` | — |
| `String` | `String` | — |
| `Array` | `Vec<Value>` | `Array` (data.rs:13) |
| `Object` | `IndexMap<String, Value>` | `Object` (data.rs:14) |

### Value Methods (Type Extraction)

| Method | Returns | Error | Source |
|--------|---------|-------|--------|
| `to_bool()` | `Result<bool>` | Not `Boolean` | data.rs:46-50 |
| `to_string()` | `Result<String>` | Not `String` | data.rs:54-58 |
| `to_i64()` | `Result<i64>` | Not `Number` or float | data.rs:61-73 |
| `to_f64()` | `Result<f64>` | Not `Number` or integer | data.rs:76-88 |
| `to_vec()` | `Result<Vec<Value>>` | Not `Array` | data.rs:91-95 |
| `to_map()` | `Result<IndexMap<String, Value>>` | Not `Object` | data.rs:98-102 |
| `to_json()` | `Result<String>` | Serialization failure | data.rs:105-132 |

**All failures return:** `Error::Conversion(msg)`

### Indexing Traits

| Trait | Behavior | Source |
|-------|----------|--------|
| `Index<usize>` | Access array/object by index | data.rs:146-154 |
| `Index<&str>` | Access object by key | data.rs:157-164 |
| `IndexMut<usize>` | Mutable array/object access | data.rs:167-174 |
| `IndexMut<&str>` | **Auto-inserts `Null` if missing** | data.rs:177-190 |

### Conversions

| Type | Target | Source |
|------|--------|--------|
| `f32`, `f64` | `Value::Number` (float) | data.rs:193-202 |
| `i8`-`i64`, `u8`-`u32` | `Value::Number` (integer) | data.rs:205-244 |
| `&str`, `&String` | `Value::String` | data.rs:247-256 |
| `&[Value]` | `Value::Array` | data.rs:259-262 |
| `&IndexMap<String, Value>` | `Value::Object` | data.rs:275-278 |
| `&serde_json::Value` | Recursive conversion | data.rs:281-309 |

---

## Number Struct

**Source:** data.rs:16-21

```rust
pub struct Number {
    f: f64,
    i: i64,
    float: bool,  // true=f64, false=i64
}
```

### Construction

| From | Creates | Source |
|------|---------|--------|
| `Number::from(f64)` | float (`float: true`) | data.rs:23-26 |
| `Number::from(i64)` | integer (`flat: false`) | data.rs:29-32 |

### Extraction

| Method | Returns | Fails If |
|--------|---------|----------|
| `to_i64()` | `Result<i64>` | `float == true` |
| `to_f64()` | `Result<f64>` | `float == false` |
| `to_u128()` | `Result<u128>` | `float == true` |

---

## Error Enum

**Source:** error.rs:3-69

```rust
pub type Result<T> = anyhow::Result<T>;
```

### Error Variants

| Variant | Payload | Category |
|---------|---------|----------|
| `Matter` | `String` | CESR primitives |
| `EmptyMaterial` | `String` | CESR primitives |
| `Decode` | `String` | CESR primitives |
| `UnexpectedCode` | `String` | Code validation |
| `UnexpectedCountCode` | `String` | Code validation |
| `UnexpectedOpCode` | `String` | Code validation |
| `InvalidCodeSize` | `String` | Code validation |
| `InvalidVarSize` | `String` | Size validation |
| `InvalidVarRawSize` | `String` | Size validation |
| `InvalidVarIndex` | `String` | Size validation |
| `Shortage` | `String` | Size validation |
| `TooSmall` | `usize` | Size validation |
| `InvalidBase64Character` | `char` | Base64 validation |
| `InvalidBase64Index` | `u8` | Base64 validation |
| `EmptyQb64` | — | Base64 validation |
| `Prepad` | — | Padding validation |
| `NonZeroedPrepad` | — | Padding validation |
| `NonZeroedLeadByte` | — | Padding validation |
| `NonZeroedLeadBytes` | — | Padding validation |
| `NonZeroedPadBits` | — | Padding validation |
| `UnknownSizage` | `String` | Size configuration |
| `UnknownHardage` | `String` | Size configuration |
| `UnknownBardage` | `String` | Size configuration |
| `UnsupportedSize` | — | Size configuration |
| `NonFixedSizeCode` | `String` | Size configuration |
| `Parsing` | `String` | Parsing |
| `ParseQb64` | `String` | Parsing |
| `ParseQb2` | `String` | Parsing |
| `Conversion` | `String` | Type conversion |
| `Value` | `String` | Value validation |
| `Validation` | `String` | General validation |
| `Derivation` | `String` | Key derivation |

---

## Macros

### dat! (data.rs:390-603)

```rust
dat!(null)                        // Value::Null
dat!(true)                        // Value::Boolean(true)
dat!(42)                          // Value::Number (integer)
dat!(3.14)                        // Value::Number (float)
dat!("text")                      // Value::String
dat!([1, 2, 3])                   // Value::Array
dat!({"key": "val", "n": 10})    // Value::Object
```

### err! (error.rs:71-77)

```rust
err!(Error::Matter("not enough bytes".to_string()))
// Expands to: Err(Error::Matter(...).into())
```

---

## Module Exports

### lib.rs

```rust
pub mod data;             // with #[macro_use] for dat!
pub use crate::error::{Error, Result};

// Core re-exports (CESR primitives)
pub use crate::core::{
    Bext, Bexter, Cigar, Counter, Creder, Dater, Diger,
    Indexer, Matter, Number,  // ← core::number::Number (CESR primitive)
    Pather, Prefixer, Sadder, Saider, Salter, Seqner,
    Serder, Siger, Signer, Tholder, Verfer
};
```

**NOTE:** `Number` in exports = `core::number::Number` (CESR primitive), NOT `data::Number`.

---

## Base64 Utilities (core/util.rs)

### Alphabet

| Range | Characters | Indices |
|-------|-----------|---------|
| A-Z | Uppercase | 0-25 |
| a-z | Lowercase | 26-51 |
| 0-9 | Digits | 52-61 |
| `-` | Hyphen | 62 |
| `_` | Underscore | 63 |

**Regex:** `^[A-Za-z0-9\-_]*$`

### Conversion Functions

| Function | Signature | Source |
|----------|-----------|--------|
| `b64_char_to_index` | `char -> Result<u8>` | util.rs:5-72 |
| `b64_index_to_char` | `u8 -> Result<char>` | util.rs:75-142 |
| `u32_to_b64` | `(u32, usize) -> Result<String>` | util.rs:165-187 |
| `b64_to_u32` | `&str -> Result<u32>` | util.rs:145-152 |
| `u64_to_b64` | `(u64, usize) -> Result<String>` | util.rs:190-212 |
| `b64_to_u64` | `&str -> Result<u64>` | util.rs:155-162 |
| `code_b2_to_b64` | `(&[u8], usize) -> Result<String>` | util.rs:215-242 |
| `code_b64_to_b2` | `&str -> Result<Vec<u8>>` | util.rs:245-249 |
| `nab_sextets` | `(&[u8], usize) -> Result<Vec<u8>>` | util.rs:252-281 |

### Examples

```rust
b64_char_to_index('D')?      // -> 3
u32_to_b64(4095, 2)?         // -> "__"
code_b64_to_b2("CESR")?      // -> vec![8, 68, 145]
nab_sextets(&[255, 255, 255], 4)?  // -> vec![63, 63, 63, 63]
```

---

## Design Rules

1. **Never confuse:** `data::Number` (JSON) vs `core::number::Number` (CESR)
2. **Error handling:** Use `anyhow::Result` + `err!` macro, never panic
3. **Base64:** URL-safe (A-Za-z0-9-_), unpadded, big-endian, zero lead bytes
4. **IndexMut:** Auto-inserts `Null` for missing object keys
5. **Type extraction:** Always returns `Error::Conversion` on type mismatch
