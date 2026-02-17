# threshold-utils — Threshold Logic + Encoding Helpers

> For threshold concepts (fractionally weighted, multi-clause), see spec skill.
> For B64 encoding theory, see cesr skill.

**Purpose:** Rust API for signing threshold satisfaction and B64 encoding utilities.
**Source:** `core/tholder.rs` (630 lines), `core/util.rs` (408 lines)

---

## Tholder — Signing Threshold Logic

### Struct

| Field | Type | Purpose |
|-------|------|---------|
| `thold` | `Value` | Threshold expression (integer or nested fraction arrays) |
| `weighted` | `bool` | `true` = rational weights, `false` = simple count |
| `size` | `u32` | Total number of weights across all clauses |
| `number` | `Option<Number>` | CESR Number for unweighted thresholds |
| `bexter` | `Option<Bexter>` | CESR Bexter (rational text encoding) for weighted |

**Default:** `thold=1, weighted=false, size=1, number=None, bexter=None`

---

### Constructors

| Method | Signature |
|--------|-----------|
| `new(thold, limen, sith)` | `pub fn new(Option<&Value>, Option<&[u8]>, Option<&Value>) -> Result<Self>` |
| `new_with_thold(thold)` | `pub fn new_with_thold(&Value) -> Result<Self>` |
| `new_with_limen(limen)` | `pub fn new_with_limen(&[u8]) -> Result<Self>` |
| `new_with_sith(sith)` | `pub fn new_with_sith(&Value) -> Result<Self>` |

**Rule:** Must provide at least one of `thold`/`limen`/`sith`, else `Error::EmptyMaterial`

---

### Threshold Formats

#### Unweighted (Simple Count)

**Fields:** `weighted=false`, `thold=dat!(n)`, `size=n`, `number=Some(Number)`, `bexter=None`
**Input:** `dat!(11)`, `dat!("b")`, `dat!("0x0b")`, `b"MAAL"` (CESR Number)
**Meaning:** Need exactly `n` signatures

#### Weighted (Rational Weights)

**Fields:** `weighted=true`, `thold=[["1/2", "1/2"], ["1"]]`, `size=sum_of_weights`, `number=None`, `bexter=Some(Bexter)`
**Input:** `dat!([["1/2", "1/2"]])` (single clause), `dat!([["1/2", "1/2"], ["1"]])` (multi-clause), `b"4AABA1s2c1s2a1"` (CESR Bexter)
**Notation:** `"1/2"` → `"1s2"` (s=slash), within clause: `c`, between clauses: `a`
**Example:** `[["1/2", "1/2"], ["1"]]` → `"1s2c1s2a1"`
**Meaning:** Each clause must independently sum ≥ 1

---

### Public Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `thold()` | `Value` | Get threshold expression |
| `weighted()` | `bool` | Check if weighted |
| `size()` | `u32` | Total weight count |
| `num()` | `Result<Option<u32>>` | `Some(n)` for unweighted, `None` for weighted |
| `number()` | `Option<Number>` | CESR Number (unweighted only) |
| `bexter()` | `Option<Bexter>` | CESR Bexter (weighted only) |
| `limen()` | `Result<Vec<u8>>` | CESR-encoded threshold bytes |
| `sith()` | `Result<Value>` | JSON-compatible threshold (hex string or nested array) |
| `to_json()` | `Result<String>` | JSON string of `thold` |
| `satisfy(indices)` | `Result<bool>` | Check if signature indices satisfy threshold |

---

## Satisfaction Logic

`satisfy(&self, indices: &[u32]) -> Result<bool>` — dispatches to numeric or weighted.

**Numeric:** dedup indices via `HashSet`, return `count >= threshold`

**Weighted:** dedup indices, build `sats[i]=signed` array, sum weights per clause, ALL clauses must reach `sum >= 1`. See keri-spec for threshold semantics.

---

### Helper Functions

**`values_to_rationals(val: &Value) -> Result<Vec<Vec<Rational32>>>`**
Parse nested arrays to rationals, validate each clause sum ≥ 1
**Errors:** Invalid weight (not 0/1 for integers, negative, >1), invalid clause sum

**`rationals_to_bext(rationals: &[Vec<Rational32>]) -> String`**
Encode rationals as text: `numer` (integer), `numer"s"denom` (fraction), join by `c`/`a`

---

### Format Conversions

**`limen() -> Result<Vec<u8>>`**
Unweighted: CESR Number (`b"MAAL"`), Weighted: CESR Bexter (`b"4AABA1s2c1s2a1"`)

**`sith() -> Result<Value>`**
Unweighted: hex string (`"b"`), Weighted: nested array (`[["1/2", "1/2"]]`)

**Roundtrip:**
```rust
Tholder::new_with_sith(&dat!([["1/2", "1/2"], ["1"]]))
  .limen() → b"4AABA1s2c1s2a1"
  → Tholder::new_with_limen(b"4AABA1s2c1s2a1")
    .sith() → [["1/2", "1/2"], ["1"]]
```

---

### Error Scenarios

| Error | Condition |
|-------|-----------|
| `EmptyMaterial("missing threshold expression")` | All inputs `None` |
| `Value("integral weight must be 0 or 1")` | Integer weight ∉ {0, 1} |
| `Value("negative weights do not make sense")` | `numer < 0` or `denom <= 0` |
| `Value("weight {numer}/{denom} > 1")` | Fraction > 1 |
| `Value("invalid sith clause")` | Clause sum < 1 |
| `Value("empty weight list")` | Empty sith array |
| `UnexpectedCode(code)` | Unknown CESR code in limen |

---

## B64 Utilities

### Constants

`REB64_STRING: &str = "^[A-Za-z0-9\\-_]*$"` — Valid URL-safe base64 regex. See cesr-spec for B64 alphabet.

### Conversion Functions (core/util.rs)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `b64_char_to_index(c)` | `fn(char) -> Result<u8>` | B64 char → 0-63 |
| `b64_index_to_char(i)` | `fn(u8) -> Result<char>` | 0-63 → B64 char |
| `u32_to_b64(n, length)` | `fn(u32, usize) -> Result<String>` | u32 → fixed-length B64 |
| `b64_to_u32(b64)` | `fn(&str) -> Result<u32>` | B64 → u32 |
| `u64_to_b64(n, length)` | `fn(u64, usize) -> Result<String>` | u64 → fixed-length B64 |
| `b64_to_u64(b64)` | `fn(&str) -> Result<u64>` | B64 → u64 |
| `code_b2_to_b64(b2, length)` | `fn(&[u8], usize) -> Result<String>` | Binary → B64 code |
| `code_b64_to_b2(code)` | `fn(&str) -> Result<Vec<u8>>` | B64 code → binary |
| `nab_sextets(binary, count)` | `fn(&[u8], usize) -> Result<Vec<u8>>` | Extract 6-bit sextets |

**Key deps:** `num_rational::Rational32`, `base64::URL_SAFE_NO_PAD`, `lazy_static`
