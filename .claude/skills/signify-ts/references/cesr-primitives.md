# CESR Primitives — signify-ts

## Inheritance Tree
```
Matter (base)
├── Verfer, Diger, Signer, Salter, Saider, Prefixer, Seqner, CesrNumber
├── Bexter → Pather
├── Cipher, Cigar, Encrypter, Decrypter

Indexer (base)
└── Siger

Codex → MtrDex, NonTransDex, DigiDex, NumDex, BexDex, SmallVrzDex, LargeVrzDex, IdrDex, IdxSigDex, IdxCrtSigDex, IdxBthSigDex

Tholder (standalone)
```

## Base Classes

### Codex
`class Codex { has(prop: string): boolean }`

### Sizage
`class Sizage(hs, ss, fs?, ls?)` — hs: hard size, ss: soft size, fs: full size (undefined for variable), ls: lead bytes

### Xizage
`class Xizage(hs, ss, os, fs?, ls?)` — os: ondex size, get ms() { return ss - os; }

### Matter
**Constructor:** `new Matter({ raw?, code?, qb64b?, qb64?, qb2?, rize? })` — mutual exclusivity: ONE of (raw+code), qb64, qb64b, qb2

**Properties:** `.code` (readonly), `.size`, `.raw`, `.qb64`, `.qb64b`, `.transferable` (!(code in NonTransDex)), `.digestive` (code in DigiDex)

**Static:** `Matter.Sizes: Map<string, Sizage>` (68 entries), `Matter.Hards: Map<string, number>` (A-z → 1, 0-4 → 2, 5-9 → 4)

**Behaviors:** Immutable after construction, `_infil(code, raw, rize?)` from raw, `_exfil(qb64b)` from qb64, variable-length: fs=undefined

### Indexer
**Constructor:** `new Indexer({ raw?, code?, index?, ondex?, qb64b?, qb64?, qb2? })`

**Properties:** `.code`, `.raw`, `.index`, `.ondex`, `.qb64`, `.qb64b`

**Static:** `Indexer.Hards: Map<string, number>` (45 entries), `Indexer.Sizes: Map<string, Xizage>` (14 entries)

**Ondex:** Crt codes (IdxCrtSigDex) ondex must be undefined, Bth codes (IdxBthSigDex) ondex=index if undefined, Standard: optional

## Codex Tables

### MtrDex (MatterCodex)
A=Ed25519_Seed B=Ed25519N C=X25519 D=Ed25519 E=Blake3_256 F=Blake2b_256 G=Blake2s_256 H=SHA3_256 I=SHA2_256 0D=Blake3_512 0E=SHA3_512 0F=Blake2b_512 0G=SHA2_512 O=X25519_Private P=X25519_Cipher_Seed 1AAH=X25519_Cipher_Salt 0A=Salt_128 0B=Ed25519_Sig J=ECDSA_256k1_Seed 1AAE=ECDSA_256k1 0C=ECDSA_256k1_Sig 4A=StrB64_L0 5A=StrB64_L1 6A=StrB64_L2 7AAA=StrB64_Big_L0 8AAA=StrB64_Big_L1 9AAA=StrB64_Big_L2

### NonTransDex
B=Ed25519N

### DigiDex
E=Blake3_256 F=Blake2b_256 G=Blake2s_256 H=SHA3_256 I=SHA2_256 0D=Blake3_512 0E=SHA3_512 0F=Blake2b_512 0G=SHA2_512

### NumDex
M=Short(2-byte) 0H=Long(4-byte) N=Big(8-byte) 0A=Huge(16-byte)

### BexDex
4A=StrB64_L0 5A=StrB64_L1 6A=StrB64_L2 7AAA=StrB64_Big_L0 8AAA=StrB64_Big_L1 9AAA=StrB64_Big_L2

### SmallVrzDex
4=Lead0 5=Lead1 6=Lead2

### LargeVrzDex
7=Lead0 8=Lead1 9=Lead2

### IdrDex (IndexerCodex)
A=Ed25519_Sig B=Ed25519_Crt_Sig C=ECDSA_256k1_Sig D=ECDSA_256k1_Crt_Sig 0A=Ed448_Sig 0B=Ed448_Crt_Sig 2A=Ed25519_Big_Sig 2B=Ed25519_Big_Crt_Sig 2C=ECDSA_256k1_Big_Sig 2D=ECDSA_256k1_Big_Crt_Sig 3A=Ed448_Big_Sig 3B=Ed448_Big_Crt_Sig

### IdxSigDex
A=Ed25519_Sig C=ECDSA_256k1_Sig 0A=Ed448_Sig 2A=Ed25519_Big_Sig 2C=ECDSA_256k1_Big_Sig 3A=Ed448_Big_Sig

### IdxCrtSigDex
B=Ed25519_Crt_Sig D=ECDSA_256k1_Crt_Sig 0B=Ed448_Crt_Sig 2B=Ed25519_Big_Crt_Sig 2D=ECDSA_256k1_Big_Crt_Sig 3B=Ed448_Big_Crt_Sig

### IdxBthSigDex
0B=Ed25519 0C=ECDSA_256k1 0D=Ed448

## Primitive Subclasses

**Verfer** extends Matter — Ed25519 public key. `verify(sig: Uint8Array, ser: Uint8Array): boolean`. Codes: D, B

**Diger** extends Matter — Blake3-256 digest. `verify(ser: Uint8Array): boolean`, `static blake3_256(ser, dig?, diger?): boolean`, `compare(ser, dig?, diger?): boolean`. Code: E

**Signer** extends Matter — Ed25519 signing key, generates random seed if no raw. `get verfer(): Verfer`, `sign(ser, index?, only?, ondex?): Siger | Cigar`. index null → Cigar, index provided → Siger (A/B if ≤63, 2A/2B if >63). Code: A

**Salter** extends Matter — Argon2id key stretching, generates random salt if no raw. `get tier(): Tier`, `signer(code=A, transferable=true, path="", tier?, temp=false): Signer`. Params: low(ops=2,mem=64MB) med(ops=3,mem=256MB) high(ops=4,mem=1GB) temp(ops=1,mem=8KB). Code: 0A

**Saider** extends Matter — Self-addressing identifier. `static saidify(sad, code=E, kind=JSON, label=d): [Saider, Dict]` (pad label with # → serialize → Blake3 → update label), `verify(sad, prefixed?, versioned?, kind?, label?): boolean`. Code: E

**Prefixer** extends Matter — AID prefix derivation. `derive(ked): void`, `verify(ked, prefixed?): boolean`. Derivation: Ed25519N(B)=non-transferable first key, Ed25519(D)=transferable first key, Blake3_256(E)=hash ked with dummy i

**Seqner** extends Matter — Sequence number. `get sn(): number`, `get snh(): string` (hex padded 32 chars). Code: 0A

**CesrNumber** extends Matter — Auto-sized ordinals. Auto-selects: <2^16→M(2B), <2^32→0H(4B), <2^64→N(8B), <2^128→0A(16B). `get num(): number`, `get numh(): string`, `get positive(): boolean`

**Bexter** extends Matter — Base64 text primitive (A-Z,a-z,0-9,-,_). `get bext(): string`. Default code: 4A

**Pather** extends Bexter — Field path encoding. `get path(): string[]`. Format: '-component1-component2-index3' (leading '-' = SAD pointer)

**Siger** extends Indexer — Indexed signature. `get/set verfer: Verfer?`

**Cigar** extends Matter — Non-indexed signature (no multisig/rotation). `get/set verfer: Verfer?`. Code: 0B

**Cipher** extends Matter — X25519 encrypted content. Auto-selects: len==16+SEALBYTES→1AAH(Salt), len==32+SEALBYTES→P(Seed). `decrypt(prikey?, seed?): Salter | Signer`

**Encrypter** extends Matter — X25519 public key encryption, converts Ed25519→X25519. `verifySeed(seed): boolean`, `encrypt(ser?, matter?): Cipher` (libsodium.crypto_box_seal). Code: C

**Decrypter** extends Matter — X25519 private key decryption, converts Ed25519→X25519. `decrypt(ser?, cipher?, transferable?): Salter | Signer` (libsodium.crypto_box_seal_open). Code: O

## Tholder

`class Tholder({ thold?, limen?, sith? })` — thold: number (unweighted) or any[][] (weighted), limen: CESR string, sith: weighted clauses

**Properties:** `.weighted`, `.thold`, `.size`, `.limen`, `.sith`, `.json`, `.num` (-1 if weighted)

**Methods:** `satisfy(indices: number[]): boolean` (unweighted: len≥thold, weighted: sum weights per clause ≥1), `weight(w: Map<number, number>): boolean`

**Weighted:** array of fractional string arrays. Example: [["1/2","1/2","1/2"]] requires any 2 of 3. Each clause must sum ≥1.

## Tier Enum
```typescript
enum Tier { low = 'low', med = 'med', high = 'high' }
```

## Errors

**EmptyMaterialError** extends Error — raised when no constructor material provided. Caught in: Prefixer, Saider, Signer, Salter, Bexter, Pather, Decrypter

**Common:** "Improper initialization: raw without code", "Empty Material", "Unexpected/Unsupported code", "Non zeroed prepad bits/lead byte", "Invalid index/ondex", "Non None ondex for code" (Crt), "Non matching ondex and index" (Bth), "Missing threshold expression", "Non-positive int threshold", "Invalid Base64", "invalid SAD ptr"

## Tables

### Sizage/Xizage Fields
Sizage: hs(hard size), ss(soft size), fs(full size, undefined=variable), ls(lead bytes)
Xizage: +os(ondex size), ms=ss-os(main index)

### Matter.Sizes (sample)
A=(1,0,44,0) B=(1,0,44,0) D=(1,0,44,0) E=(1,0,44,0) 0B=(2,0,88,0) 0A=(2,0,24,0) 4A=(2,2,undef,0) 7AAA=(4,4,undef,0)

### Indexer.Sizes
A=(1,2,0,88,0) B=(1,2,1,88,0) 0A=(2,2,0,156,0) 2A=(2,4,0,92,0)

## Constants
```typescript
const Dummy = '#';  // derivation padding
const B64REX = '^[A-Za-z0-9\\-_]*$';
enum Ids { d = 'd' }
enum Serials { JSON = 'JSON', CBOR = 'CBOR', MGPK = 'MGPK' }
```

## Key Behaviors
1. **Immutable:** frozen after construction
2. **Code-driven:** constructor assigns functions by code
3. **Variable-length:** fs=undefined → size in soft part
4. **Lead bytes:** align raw to 3-byte boundaries
5. **Derivation fallback:** EmptyMaterialError catch enables derived constructors
6. **Ed25519↔X25519:** Encrypter/Decrypter convert signing↔encryption keys
7. **Sealed box:** anonymous public-key encryption
8. **Range-based:** CesrNumber auto-selects code by value
9. **Ondex modes:** Crt(undefined), Bth(=index), Standard(optional)
10. **Self-addressing:** Saider uses dummy padding + hash + replace pattern

## Dependencies
libsodium-wrappers-sumo, blake3, mathjs(Fraction)
