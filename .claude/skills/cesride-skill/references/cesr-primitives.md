# cesr-primitives — Typed Matter Specializations

> For CESR encoding theory and code tables, see cesr-spec skill.

**Concern:** Concrete CESR primitive types for cryptographic operations, self-addressing data, numeric encoding, and path resolution.

**Dependencies:** Matter/Indexer traits (cesr-encoding), crypto functions, Counter/Serder (sad-serialization)

---

## Common Constructor Pattern

All Matter-based primitives (everything except Siger) share identical constructors:

```rust
T::new(code, raw, qb64b, qb64, qb2) -> Result<Self>     // General (picks first non-None)
T::new_with_raw(raw, code) -> Result<Self>                // From raw bytes + code
T::new_with_qb64(qb64) -> Result<Self>                    // From qualified base64 string
T::new_with_qb64b(qb64b) -> Result<Self>                  // From qualified base64 bytes
T::new_with_qb2(qb2) -> Result<Self>                      // From qualified binary
```

Primitives with domain-specific inputs add extra constructors listed per-type below.

---

## A. Key & Signature Primitives

### Verfer (Public Key Verifier)

```rust
struct Verfer { raw: Vec<u8>, code: String, size: u32 }
```

**Methods:**
```rust
pub fn verify(&self, sig: &[u8], ser: &[u8]) -> Result<bool>
```

**Codes:** `Ed25519`, `Ed25519N`, `ECDSA_256k1`, `ECDSA_256k1N`, `ECDSA_256r1`, `ECDSA_256r1N`, `Ed448`, `Ed448N`. N-suffix = non-transferable. See cesr-spec Annex A.

---

### Signer (Private Signing Key)

AUTO-ZEROIZED on drop (`#[derive(ZeroizeOnDrop)]`).

```rust
struct Signer { raw: Vec<u8>, code: String, size: u32, verfer: Verfer }
```

**Extra constructors:**
```rust
Signer::new(transferable, code, raw, qb64b, qb64, qb2) -> Result<Self>
Signer::new_with_defaults(transferable, code) -> Result<Self>  // Generates random key
Signer::new_with_raw(raw, transferable, code) -> Result<Self>
Signer::new_with_qb64(qb64, transferable) -> Result<Self>
Signer::new_with_qb64b(qb64b, transferable) -> Result<Self>
Signer::new_with_qb2(qb2, transferable) -> Result<Self>
```

All constructors take `transferable` flag which selects verfer code: true -> `Ed25519`, false -> `Ed25519N` (and similarly for other algorithms).

**Methods:**
```rust
pub fn verfer(&self) -> Verfer
pub fn sign_unindexed(&self, ser: &[u8]) -> Result<Cigar>
pub fn sign_indexed(&self, ser: &[u8], only: bool, index: u32, ondex: Option<u32>) -> Result<Siger>
// only=true -> Crt codes (current-only), only=false -> dual-indexed codes
```

**Codes:** `Ed25519_Seed`, `ECDSA_256k1_Seed`, `ECDSA_256r1_Seed`, `Ed448_Seed`. See cesr-spec Annex A.

**Indexed signature code selection:** `only=true` uses `*_Crt` codes; `only=false` uses dual-indexed codes. Index >= 64 uses `*_Big*` variants. When `only=false` and `ondex=None`, ondex mirrors index.

---

### Salter (Key Derivation Salt)

AUTO-ZEROIZED on drop (`#[derive(ZeroizeOnDrop)]`).

```rust
struct Salter { code: String, raw: Vec<u8>, size: u32, tier: String }
```

**Extra constructors:**
```rust
Salter::new(tier, code, raw, qb64b, qb64, qb2) -> Result<Self>
Salter::new_with_defaults(tier) -> Result<Self>  // Generates random 16-byte salt
Salter::new_with_raw(raw, code, tier) -> Result<Self>
Salter::new_with_qb64(qb64, tier) -> Result<Self>
Salter::new_with_qb64b(qb64b, tier) -> Result<Self>
Salter::new_with_qb2(qb2, tier) -> Result<Self>
```

**Methods:**
```rust
pub fn tier(&self) -> String
pub fn stretch(&self, size: Option<usize>, path: Option<&str>, tier: Option<&str>, temp: Option<bool>) -> Result<Vec<u8>>
pub fn signer(&self, code: Option<&str>, transferable: Option<bool>, path: Option<&str>, tier: Option<&str>, temp: Option<bool>) -> Result<Signer>
pub fn signers(&self, count: Option<usize>, start: Option<usize>, path: Option<&str>, code: Option<&str>, transferable: Option<bool>, tier: Option<&str>, temp: Option<bool>) -> Result<Vec<Signer>>
// signers() uses path format: {path}{n:x} with hexadecimal suffixes (e.g., "rot-0", "rot-1")
```

**Code:** `Salt_128` only (16 bytes). **Tiers:** `low`, `med`, `high`.

---

### Cigar (Unindexed Signature)

```rust
struct Cigar { raw: Vec<u8>, code: String, size: u32, verfer: Verfer }
```

**Extra constructors** accept `verfer` parameter: `new(verfer, ...)`, `new_with_raw(raw, verfer, code)`, `new_with_qb64(qb64, verfer)`, etc.

**Methods:**
```rust
pub fn verfer(&self) -> Verfer
```

**Codes:** `Ed25519_Sig`, `ECDSA_256k1_Sig`, `ECDSA_256r1_Sig`, `Ed448_Sig`. See cesr-spec Annex A.

---

### Siger (Indexed Signature)

Implements `Indexer` trait (not Matter).

```rust
struct Siger { raw: Vec<u8>, code: String, index: u32, ondex: u32, verfer: Verfer }
```

**Constructors:**
```rust
Siger::new(verfer, index, ondex, code, raw, qb64b, qb64, qb2) -> Result<Self>
Siger::new_with_raw(raw, verfer, index, ondex, code) -> Result<Self>
Siger::new_with_qb64(qb64, verfer) -> Result<Self>  // Parses indices from code
Siger::new_with_qb64b(qb64b, verfer) -> Result<Self>
Siger::new_with_qb2(qb2, verfer) -> Result<Self>
```

**Methods (Indexer trait):**
```rust
pub fn index(&self) -> u32
pub fn ondex(&self) -> u32
pub fn verfer(&self) -> Verfer
```

**Codes:** Dual-indexed (`Ed25519`, `ECDSA_256k1`, `ECDSA_256r1`, `Ed448`) and current-only (`*_Crt`) variants, plus `*_Big` and `*_Big_Crt` for index >= 64. See cesr-spec Annex A.

**Ondex behavior:** `_Crt` codes -> ondex=0. Dual-indexed: ondex=None mirrors index; ondex=Some(y) -> ondex=y. Big codes used when index >= 64 OR index != ondex.

---

## B. Digest & Self-Addressing Primitives

### Diger (Digest/Hash)

```rust
struct Diger { raw: Vec<u8>, code: String, size: u32 }
```

**Extra constructor:**
```rust
Diger::new_with_ser(ser, code) -> Result<Self>  // Hashes serialized data
```

**Methods:**
```rust
pub fn verify(&self, ser: &[u8]) -> Result<bool>  // Re-hashes ser, compares to stored digest
pub fn compare(&self, ser: &[u8], dig: Option<&[u8]>, diger: Option<&Diger>) -> Result<bool>
```

**Codes:** `Blake3_256` (default), `Blake3_512`, `Blake2b_256`, `Blake2b_512`, `Blake2s_256`, `SHA3_256`, `SHA3_512`, `SHA2_256`, `SHA2_512`. See cesr-spec Annex A.

---

### Saider (Self-Addressing Identifier)

```rust
struct Saider { raw: Vec<u8>, code: String, size: u32 }
```

**Extra constructor:**
```rust
Saider::new_with_sad(sad, label, kind, ignore, code) -> Result<Self>
```

**Methods:**
```rust
pub fn saidify(sad: &Value, code: Option<&str>, kind: Option<&str>, label: Option<&str>, ignore: Option<&[&str]>) -> Result<(Saider, Value)>
// Returns SAID and saidified SAD with label field populated
// kind: "JSON"/"CBOR"/"MGPK", label default: "d"

pub fn verify(&self, sad: &Value, prefixed: Option<bool>, versioned: Option<bool>, kind: Option<&str>, label: Option<&str>, ignore: Option<&[&str]>) -> Result<bool>
// prefixed=true checks sad[label]==SAID qb64, versioned=true checks sad['v'] derivation
```

**Codes:** Same as Diger. See cesr-spec Annex A.

**SAID Derivation:** (1) Set sad[label]=dummy, (2) If versioned, compute/insert 'v', (3) Serialize (kind format), (4) Hash, (5) Return SAID + saidified SAD.

---

### Prefixer (Identifier Prefix)

```rust
struct Prefixer { code: String, raw: Vec<u8>, size: u32 }
```

**Extra constructor:**
```rust
Prefixer::new_with_ked(ked, allows, code) -> Result<Self>
```

**Methods:**
```rust
pub fn verify(&self, ked: &Value, prefixed: Option<bool>) -> Result<bool>
```

**Derivation routing:**
- Non-transferable codes (`*N`) -> extract ked['k'][0], validate ked['n']/['b']/['a'] empty
- Transferable codes -> extract ked['k'][0]
- Digest codes -> set ked['i']/['d']=dummy, sizeify, hash entire KED

**Valid inception ilks:** `icp`, `dip`, `vcp`

**Codes:** Non-transferable (`Ed25519N`, etc.), transferable (`Ed25519`, etc.), and digest-based (`Blake3_256`, etc.). See cesr-spec Annex A.

---

## C. Numeric/Structural Primitives

### Seqner (Sequence Number)

KERI event sequence numbers as 16-byte unsigned integers.

```rust
struct Seqner { raw: Vec<u8>, code: String, size: u32 }
```

**Extra constructors:**
```rust
Seqner::new_with_sn(sn: u128) -> Result<Self>
Seqner::new_with_snh(snh: &str) -> Result<Self>  // From hex string
```

**Methods:**
```rust
pub fn sn(&self) -> Result<u128>
pub fn snh(&self) -> Result<String>  // Lowercase hex
```

**Code:** `Salt_128` only (16 bytes).

---

### Number (Auto-Sized Unsigned Integer)

```rust
struct Number { raw: Vec<u8>, code: String, size: u32 }
```

**Extra constructors:**
```rust
Number::new_with_num(num: u128) -> Result<Self>   // Auto-sizes
Number::new_with_numh(numh: &str) -> Result<Self> // From hex, auto-sizes
```

**Methods:**
```rust
pub fn num(&self) -> Result<u128>
pub fn numh(&self) -> Result<String>  // Lowercase hex
pub fn positive(&self) -> Result<bool>  // num > 0
```

**Auto-sizing:** `num < 2^16 -> Short (2B)`, `< 2^32 -> Long (4B)`, `< 2^64 -> Big (8B)`, else `Huge (16B)`.

---

### Dater (ISO 8601 Timestamp)

```rust
struct Dater { raw: Vec<u8>, code: String, size: u32 }
```

**Extra constructor:**
```rust
Dater::new_with_dts(dts: &str, code) -> Result<Self>
```

**Methods:**
```rust
pub fn dts(&self) -> Result<String>   // ISO 8601 string
pub fn dtsb(&self) -> Result<Vec<u8>> // ISO 8601 bytes
```

**Code:** `DateTime` only. **Format:** `YYYY-MM-DDTHH:MM:SS.ffffff+00:00`. Base64-safe encoding: `:` -> `c`, `.` -> `d`, `+` -> `p`.

---

## D. Pathing/Textual Primitives

### Bexter (Base64 Text)

Arbitrary base64-safe text strings. Implements `Bext` trait.

```rust
struct Bexter { code: String, raw: Vec<u8>, size: u32 }
```

**Extra constructor:**
```rust
Bexter::new_with_bext(bext: &str) -> Result<Self>
```

**Methods (Bext trait):**
```rust
pub fn bext(&self) -> Result<String>  // Decodes raw bytes to UTF-8
```

**Codes:** `StrB64_L0`/`L1`/`L2` and `StrB64_Big_L0`/`L1`/`L2`. See cesr-spec Annex A.

---

### Pather (SAD Path)

Hierarchical paths into Self-Addressing Data. Implements `Bext` trait.

```rust
struct Pather { code: String, raw: Vec<u8>, size: u32 }
```

**Extra constructors:**
```rust
Pather::new_with_path(path: &Value) -> Result<Self>  // From Value array
Pather::new_with_bext(bext: &str) -> Result<Self>    // From string "-a-b-c"
```

**Methods:**
```rust
pub fn bext(&self) -> Result<String>                    // Bext trait
pub fn path(&self) -> Result<Value>                     // To Value array: ["-", "a", "b"]
pub fn root(&self, root: &Self) -> Result<Self>         // Prepend root path
pub fn strip(&self, root: &Self) -> Result<Self>        // Remove root prefix
pub fn starts_with(&self, path: &Self) -> Result<bool>
pub fn resolve(&self, sad: &Value) -> Result<Value>     // Resolve path in SAD
pub fn tail(&self, serder: &Serder) -> Result<String>   // Resolve, return as JSON/SAID string
```

**Path format:** Separator=`"-"`. Example: `"-a-b-c"` = path `["a", "b", "c"]`. Root path: `"-"`.

**Codes:** Same as Bexter (`StrB64_L*`). See cesr-spec Annex A.

---

**Cross-References:** Matter/Indexer traits (cesr-encoding), Counter/Serder (sad-serialization), crypto::{sign,hash,salt,csprng}, Tierage (common)
