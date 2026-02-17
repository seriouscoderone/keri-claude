# crypto — Raw-Bytes Cryptographic Operations

**Scope:** Raw-byte cryptographic primitives (signing, hashing, key derivation, CSPRNG). CESR encoding happens in higher layers.

**Modules:** `csprng`, `hash`, `salt`, `sign` (all `pub(crate)`)

---

## Signing

### Dispatch Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `generate` | `fn(code: &str) -> Result<Vec<u8>>` | Generate private key (seed) |
| `public_key` | `fn(code: &str, private_key: &[u8]) -> Result<Vec<u8>>` | Derive public key |
| `sign` | `fn(code: &str, private_key: &[u8], ser: &[u8]) -> Result<Vec<u8>>` | Sign message → raw signature |
| `verify` | `fn(code: &str, public_key: &[u8], sig: &[u8], ser: &[u8]) -> Result<bool>` | Verify signature → bool |
| `ed448_to_x448` | `fn(ed448_pubkey: &[u8]) -> Result<Vec<u8>>` | Convert Ed448 → X448 (Montgomery) |

### Algorithm Dispatch (code → submodule)

| Code Pattern | Algorithm | Dispatch | Private | Public | Signature |
|--------------|-----------|----------|---------|--------|-----------|
| `Ed25519*` | Ed25519 | ed25519::* | 32B | 32B | 64B |
| `ECDSA_256k1*` | ECDSA secp256k1 | ecdsa_256k1::* | 32B | 33B (SEC1) | DER |
| `ECDSA_256r1*` | ECDSA secp256r1 | ecdsa_256r1::* | 32B | 33B (SEC1) | DER |
| `Ed448*` | Ed448 | ed448::* | 57B | 57B | 114B |
| `X448` | X448 (Montgomery) | ed448::x448_public_key | 57B (Ed448) | 56B | — |

**Special:**
- Ed25519: regenerates until `!verifying_key.is_weak()`
- ECDSA: uses `sign_with_rng(&mut OsRng, ser)` for nonce randomization
- Ed448: pure EdDSA with empty context
- X448: derives Montgomery form from Ed448 private key
- Verification failures return `Ok(false)`, not `Err`

### Ed448 ↔ X448 Conversion

**x448_public_key(ed448_private):** seed → SigningKey → verifying_key → EdwardsPoint → MontgomeryPoint → 56B

**ed448_to_x448(ed448_public):** 57B → VerifyingKey → EdwardsPoint → MontgomeryPoint → 56B

---

## Hashing

### Dispatch Function

`digest(code: &str, ser: &[u8]) -> Result<Vec<u8>>`

### Algorithm Table

| Code | Algorithm | Output | Crate | Pattern |
|------|-----------|--------|-------|---------|
| `Blake3_256` | BLAKE3-256 | 32B | blake3 | One-shot `hash(ser)` |
| `Blake3_512` | BLAKE3-512 (XOF) | 64B | blake3 | `Hasher::new()` → `update(ser)` → `finalize_xof()` → `fill()` |
| `Blake2b_256` | BLAKE2b-256 | 32B | blake2 | `Blake2b<U32>` → `update(ser)` → `finalize()` |
| `Blake2b_512` | BLAKE2b-512 | 64B | blake2 | `Blake2b512` → `update(ser)` → `finalize()` |
| `Blake2s_256` | BLAKE2s-256 | 32B | blake2 | `Blake2s256` → `update(ser)` → `finalize()` |
| `SHA3_256` | SHA3-256 | 32B | sha3 | `Sha3_256` → `update(ser)` → `finalize()` |
| `SHA3_512` | SHA3-512 | 64B | sha3 | `Sha3_512` → `update(ser)` → `finalize()` |
| `SHA2_256` | SHA2-256 | 32B | sha2 | `Sha256` → `update(ser)` → `finalize()` |
| `SHA2_512` | SHA2-512 | 64B | sha2 | `Sha512` → `update(ser)` → `finalize()` |

**Type alias:** `Blake2b256 = blake2::Blake2b<blake2::digest::consts::U32>`

---

## Key Stretching

### Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `params` | `fn(tier: &str, length: usize) -> Result<Params>` | Build Argon2 Params |
| `stretch` | `fn(pwd: &[u8], salt: &[u8], length: usize, tier: &str) -> Result<Vec<u8>>` | Derive key from pwd/salt |

### Tier Table

| Tier | Memory (KiB) | Iterations | Parallelism |
|------|--------------|------------|-------------|
| `min` | 8 | 1 | 1 |
| `low` | 65536 | 2 | 1 |
| `med` | 262144 | 3 | 1 |
| `high` | 1048576 | 4 | 1 |

**Algorithm:** Always `Argon2id` version `0x13` (libsodium compatible)

**Call sequence:**
1. `params(tier, length)` → `argon2::Params`
2. `Argon2::new(Algorithm::Argon2id, Version::V0x13, params)`
3. `stretcher.hash_password_into(pwd, salt, &mut result)`

---

## CSPRNG

### Function

`fill_bytes(bytes: &mut [u8])` — Fill slice with OS-backed random data via `rand_core::OsRng`

**Usage:** Instantiated per-operation (`OsRng {}` or `&mut OsRng`), no global state

**Contexts:**
- Ed25519/ECDSA key generation: `let mut csprng = OsRng {};`
- Ed448 generation: `SigningKey::generate(&mut OsRng)`
- ECDSA signing: `sign_with_rng(&mut OsRng, ser)`

---

## Error Model

- **Unsupported code:** `Error::UnexpectedCode(code)`
- **Size mismatch:** `anyhow::anyhow!("... expected X bytes, got Y")`
- **Verification failure:** `Ok(false)` (not `Err`)
- **Crypto errors:** Propagated via `?` (TryIntoError, argon2 errors)
- **Derivation failure:** `Error::Derivation(e.to_string())`

---

## Key Constants (Ed448)

| Constant | Value | Description |
|----------|-------|-------------|
| `ED448_SEED_SIZE` | 57 | Ed448 private key size |
| `ED448_PUBLIC_KEY_SIZE` | 57 | Ed448 public key size |
| `ED448_SIGNATURE_SIZE` | 114 | Ed448 signature size |
| `X448_PUBLIC_KEY_SIZE` | 56 | X448 public key size |
