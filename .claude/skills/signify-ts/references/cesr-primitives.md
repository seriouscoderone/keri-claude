# CESR Primitives — signify-ts

> For CESR encoding theory, code table values, Sizage formulas, and SAID algorithms, see the **cesr** skill. This file covers the TypeScript API only.

## Inheritance Tree
```
Matter (base)
├── Verfer, Diger, Signer, Salter, Saider, Prefixer, Seqner, CesrNumber
├── Bexter → Pather
├── Cipher, Cigar, Encrypter, Decrypter

Indexer (base)
└── Siger

Tholder (standalone)
```

**Codex enums:** MtrDex, NonTransDex, DigiDex, NumDex, BexDex, SmallVrzDex, LargeVrzDex, IdrDex, IdxSigDex, IdxCrtSigDex, IdxBthSigDex — see cesr for code point registry.

## Base Classes

### Codex
`class Codex { has(prop: string): boolean }`

### Sizage / Xizage
`class Sizage(hs, ss, fs?, ls?)` — see cesr for field semantics.
`class Xizage(hs, ss, os, fs?, ls?)` — `get ms() { return ss - os; }`

### Matter
**Constructor:** `new Matter({ raw?, code?, qb64b?, qb64?, qb2?, rize? })` — mutual exclusivity: ONE of (raw+code), qb64, qb64b, qb2

**Properties:** `.code` (readonly), `.size`, `.raw`, `.qb64`, `.qb64b`, `.transferable`, `.digestive`

**Static maps:** `Matter.Sizes: Map<string, Sizage>` (68 entries), `Matter.Hards: Map<string, number>` (maps first chars to hard size length)

**Internal:** `_infil(code, raw, rize?)` builds from raw, `_exfil(qb64b)` extracts from qb64

### Indexer
**Constructor:** `new Indexer({ raw?, code?, index?, ondex?, qb64b?, qb64?, qb2? })`

**Properties:** `.code`, `.raw`, `.index`, `.ondex`, `.qb64`, `.qb64b`

**Static maps:** `Indexer.Hards: Map<string, number>` (45 entries), `Indexer.Sizes: Map<string, Xizage>` (14 entries)

## Primitive Subclasses

**Verfer** extends Matter — Ed25519 public key.
`verify(sig: Uint8Array, ser: Uint8Array): boolean`

**Diger** extends Matter — Digest primitive.
`verify(ser: Uint8Array): boolean`
`static blake3_256(ser, dig?, diger?): boolean`
`compare(ser, dig?, diger?): boolean`

**Signer** extends Matter — Ed25519 signing key; generates random seed if no raw provided.
`get verfer(): Verfer`
`sign(ser, index?, only?, ondex?): Siger | Cigar` — index null returns Cigar, index provided returns Siger

**Salter** extends Matter — Argon2id key stretching; generates random salt if no raw provided.
`get tier(): Tier`
`signer(code?, transferable?, path?, tier?, temp?): Signer`

**Saider** extends Matter — Self-addressing identifier.
`static saidify(sad, code?, kind?, label?): [Saider, Dict]`
`verify(sad, prefixed?, versioned?, kind?, label?): boolean`

**Prefixer** extends Matter — AID prefix derivation.
`derive(ked): void`
`verify(ked, prefixed?): boolean`

**Seqner** extends Matter — Sequence number.
`get sn(): number`
`get snh(): string` (hex padded 32 chars)

**CesrNumber** extends Matter — Auto-sized ordinals (auto-selects code by value range).
`get num(): number`
`get numh(): string`
`get positive(): boolean`

**Bexter** extends Matter — Base64 text primitive (A-Z,a-z,0-9,-,_).
`get bext(): string`

**Pather** extends Bexter — Field path encoding.
`get path(): string[]` — format: '-component1-component2-index3'

**Siger** extends Indexer — Indexed signature.
`get/set verfer: Verfer?`

**Cigar** extends Matter — Non-indexed signature.
`get/set verfer: Verfer?`

**Cipher** extends Matter — X25519 encrypted content (auto-selects code by payload length).
`decrypt(prikey?, seed?): Salter | Signer`

**Encrypter** extends Matter — X25519 public key; converts Ed25519 to X25519.
`verifySeed(seed): boolean`
`encrypt(ser?, matter?): Cipher`

**Decrypter** extends Matter — X25519 private key; converts Ed25519 to X25519.
`decrypt(ser?, cipher?, transferable?): Salter | Signer`

## Tholder

`class Tholder({ thold?, limen?, sith? })` — thold: number (unweighted) or any[][] (weighted)

**Properties:** `.weighted`, `.thold`, `.size`, `.limen`, `.sith`, `.json`, `.num` (-1 if weighted)

**Methods:**
`satisfy(indices: number[]): boolean` — unweighted: len >= thold; weighted: sum weights per clause >= 1
`weight(w: Map<number, number>): boolean`

## Tier Enum
```typescript
enum Tier { low = 'low', med = 'med', high = 'high' }
```
Argon2 parameters: low(ops=2,mem=64MB) med(ops=3,mem=256MB) high(ops=4,mem=1GB) temp(ops=1,mem=8KB)

## Errors

**EmptyMaterialError** extends Error — raised when no constructor material provided. Caught in: Prefixer, Saider, Signer, Salter, Bexter, Pather, Decrypter to enable derived constructors.

Common error messages: "Improper initialization: raw without code", "Empty Material", "Unexpected/Unsupported code", "Invalid index/ondex", "Missing threshold expression", "Invalid Base64", "invalid SAD ptr"

## Constants
```typescript
const Dummy = '#';  // derivation padding
const B64REX = '^[A-Za-z0-9\\-_]*$';
enum Ids { d = 'd' }
enum Serials { JSON = 'JSON', CBOR = 'CBOR', MGPK = 'MGPK' }
```

## Dependencies
libsodium-wrappers-sumo, blake3, mathjs(Fraction)
