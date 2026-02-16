# cesr-primitives — Python CESR Primitive Classes

> Code tables, encoding theory, and CESR formats: see **cesr-spec** skill.

**Source:** `core/coring.py`, `core/signing.py`, `core/indexing.py`, `core/counting.py`

## Matter — Base Class

Constructor dispatches on: `raw`+`code`, `qb64`, `qb64b`, or `qb2`. Use `strip=True` on bytearray to consume bytes from stream.
Properties: `.code`, `.soft`, `.both`, `.raw`, `.qb64`, `.qb64b`, `.qb2`, `.fullSize`, `.transferable`, `.digestive`

## Primitive Subclasses

| Class | Base | Purpose | Key API |
|-------|------|---------|---------|
| Verfer | Matter | Public verification key | `.verify(sig, ser) -> bool` |
| Diger | Matter | Digest (hash) | `.verify(ser)`, `.compare(ser, dig=, diger=)`, `_digest(ser, code)` classmethod; `ser=` in constructor computes digest |
| Saider | Matter | Self-Addressing ID (SAID) | `sad=` dict in constructor computes SAID; `.verify(sad, label=)` |
| Noncer | Diger | Salty nonce/UUID | Inherits Diger interface |
| Prefixer | Matter | AID prefix | Derives from inception event |
| Seqner | Matter | Fixed-size sequence number (24 chars) | `.sn` (int), `.snh` (hex); requires `code=MtrDex.Salt_128`, accepts `sn=` or `snh=` |
| Number | Matter | Variable-size ordinal (auto-sized) | `.num`, `.sn`, `.numh`, `.snh`, `.huge` (24-char qb64), `.positive`, `.inceptive`; `.validate()` |
| Decimer | Matter | Decimal number string | `.dns` (str), `.decimal` (int\|float); accepts `dns=` or `decimal=` |
| Dater | Matter | ISO-8601 datetime | `.dts` (str), `.dt` (datetime); accepts `dts=` or `dt=` |
| Tagger | Matter | Small tag (1-11 chars) | `.tag`; code auto-selected from TagDex |
| Ilker | Tagger | Event ilk tag | Inherits Tagger |
| Traitor | Tagger | Trait tag | Inherits Tagger |
| Verser | Tagger | Protocol version tag | Inherits Tagger |
| Texter | Matter | Variable UTF-8 text | `.text`; code auto-selected from TexDex |
| Bexter | Matter | Variable base64 string | `.bext`; code auto-selected from BexDex |
| Pather | Matter | JSON path | `.path` (list), `.bext`; accepts `path=` list or dot-separated string |
| Labeler | Matter | Compact label | `.label`; code auto-selected from LabelDex |

## Signer(Matter) — Private Key Signing

Constructor: `raw=None, code=MtrDex.Ed25519_Seed, transferable=True`. If `raw=None`, generates random seed.
Property: `.verfer` (Verfer). Suites: Ed25519, ECDSA secp256r1/k1.
`.sign(ser, index=None, only=False, ondex=None)` — returns Cigar if index=None, Siger if index=int. `only=True` for current-list-only codes. `ondex` for prior next list offset.

## Salter(Matter) — Argon2id Salt

Constructor: `raw=None, code=MtrDex.Salt_128, tier=Tiers.low`. Tiers: low (interactive), med (moderate), high (sensitive), temp (testing).
`.stretch(size=32, path="", tier=, temp=)` — raw key bytes.
`.signer(code=, transferable=, path=, tier=, temp=)` — derive single Signer.
`.signers(count=1, start=0, path="", **kwa)` — derive multiple; paths: `f"{path}{i+start:x}"`.

## Encryption

| Class | Base | Purpose | Key API |
|-------|------|---------|---------|
| Encrypter | Matter | X25519 public key encryption | `verkey=` in constructor; `.encrypt(ser=, prim=, code=) -> Cipher`, `.verifySeed(seed)` |
| Decrypter | Matter | X25519 private key decryption | `seed=` in constructor; `.decrypt(cipher=, klas=, transferable=, bare=)` — bare=True returns bytes |
| Cipher | Matter | Encrypted ciphertext | `.decrypt(prikey=, seed=, klas=, transferable=, bare=)` |

## Indexer — Base for Indexed Primitives

Constructor: `raw=None, code=IdrDex.Ed25519_Sig, index=0, ondex=None`. Properties: `.code`, `.raw`, `.index`, `.ondex`, `.qb64`, `.qb64b`, `.qb2`. Supports `strip=True`.

**Siger(Indexer)** — Indexed signature. `.verfer` (Verfer). Must use IdxSigDex codes. Current-only (`ondex=None`) vs both-lists (`ondex` differs from `index`).

## Counter — Framing/Grouping

Constructor: `code=None, count=None, countB64=None, qb64b=None, version=Vrsn_2_0`. Properties: `.version`, `.codes`, `.code`, `.name`, `.count`, `.soft`, `.both`, `.fullSize`, `.qb64`.
Class method: `enclose(qb64=, code=Codens.AttachmentGroup, version=)` — prepends counter to stream.
Static: `verToB64(version=)`, `b64ToVer(b64)` — genus-version conversion.
Instance: `.countToB64()`, `.byteCount(cold=)`, `.byteSize(cold=)`.

## Non-Matter Utilities

**Sadder** — Versioned KERI event. Constructor: `raw=None, ked=None, kind=Kinds.json, label=Saids.d`. Properties: `.raw`, `.ked`/`.sad`, `.kind`, `.saider`, `.version`, `.proto`, `.size`.

**Tholder** — Multi-sig threshold. Constructor: `thold=` (int|str|list|dict|Fraction). Properties: `.thold`, `.limen`, `.weighted`, `.size`, `.num`. Method: `.satisfy(indices) -> bool`.

**Dicter** — Message dict serializer. Properties: `.ked`, `.kind`, `.size`, `.raw`.

**Streamer** — Sniffable CESR stream. Constructor: `stream=, verify=`. Properties: `.stream`, `.text`, `.binary`, `.texter`, `.bexter`.

## Codex Classes

> Values in cesr-spec skill. Only class names listed here.

**Matter:** MtrDex, DigDex, PreDex, NumDex, TagDex, BexDex, TexDex, DecDex, NonceDex, LabelDex, NonTransDex, PreNonDigDex, SmallVrzDex, LargeVrzDex
**Cipher:** CiXDex (all), CiXFixQB64Dex, CiXVarQB64Dex, CiXAllQB64Dex, CiXVarQB2Dex, CiXVarStrmDex, CiXVarDex
**Indexer:** IdrDex, IdxSigDex, IdxCrtSigDex (current-only), IdxBthSigDex (both-lists)
**Counter:** GenDex (genus), CtrDex_1_0/CtrDex_2_0, UniDex_1_0/UniDex_2_0, SealDex_2_0; access by name via `Codens.AttachmentGroup`

## Namedtuples

Sizage(hs ss xs fs ls), Xizage(hs ss os fs ls), Cizage(hs ss fs), Digestage(klas size length), Saidage(dollar at id_ i d), Tierage(low med high)

## Defaults

Matter: `MtrDex.Ed25519N` | Diger/Saider: `DigDex.Blake3_256` | Seqner: `MtrDex.Salt_128` (required) | Signer: `MtrDex.Ed25519_Seed`, transferable=True | Salter: `MtrDex.Salt_128`, tier=low | Encrypter: `MtrDex.X25519` | Decrypter: `MtrDex.X25519_Private` | Indexer: `IdrDex.Ed25519_Sig`, index=0 | Counter: `Vrsn_2_0`, count=1
