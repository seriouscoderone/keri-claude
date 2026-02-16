# Primitive Parser Factories

## Parsers Struct

`Parsers` is a stateless struct with only `pub(crate)` factory methods. Each factory takes a `&ColdCode` and returns a function pointer (`ParserRet<'a, T>`) that nom can compose.

```rust
pub struct Parsers {}
pub type ParserRet<'a, T> = fn(&'a [u8]) -> nom::IResult<&'a [u8], T>;
```

## Parser Factory Methods

| Factory | Returns | cesride Trait | Used by groups |
|---------|---------|--------------|----------------|
| `pather_parser` | `Pather` | Matter (Bext) | SadPathSig, SadPathSigGroup |
| `diger_parser` | `Diger` | Matter | (unused, `#[allow(unused)]`) |
| `siger_parser` | `Siger` | Indexer | ControllerIdxSigs, WitnessIdxSigs, TransReceiptQuadruples |
| `cigar_parser` | `Cigar` | Matter | NonTransReceiptCouples |
| `prefixer_parser` | `Prefixer` | Matter | TransReceiptQuadruples, TransIdxSigGroups, TransLastIdxSigGroups, SadPathSig |
| `seqner_parser` | `Seqner` | Matter | TransReceiptQuadruples, TransIdxSigGroups, FirstSeenReplayCouples, SealSourceCouples, SadPathSig |
| `dater_parser` | `Dater` | Matter | FirstSeenReplayCouples |
| `saider_parser` | `Saider` | Matter | TransReceiptQuadruples, TransIdxSigGroups, SealSourceCouples, SadPathSig |
| `counter_parser` | `Counter` | — | CesrGroup dispatch, SadPathSigGroup, SadPathSig |
| `siger_list_parser` | `Vec<Siger>` | Indexer | TransIdxSigGroups, TransLastIdxSigGroups |

## ColdCode Dispatch (all parsers)

Every parser factory follows the same dispatch:

```
ColdCode::CtB64 | ColdCode::OpB64 → parse from qb64b (text/Base64 domain)
ColdCode::CtOpB2                  → parse from qb2 (binary domain)
_ (Json, Cbor, MGPK, Free)       → Err(Unexpected)
```

## Size Calculation

### qb64b path (Matter trait primitives)
```rust
let matter = T::new_with_qb64b(bytes)?;
let size = matter.full_size()?;          // chars consumed in qb64
Ok((&bytes[size..], matter))
```

### qb2 path (Matter trait primitives)
```rust
let matter = T::new_with_qb2(bytes)?;
let size = matter.full_size()? / 4 * 3;  // bytes consumed in qb2
Ok((&bytes[size..], matter))
```

**Invariant:** `qb2_size = qb64_size / 4 * 3` (integer division, always exact because CESR primitives align on 24-bit boundaries).

## Special Parser Cases

### Siger (Indexer, not Matter)
```rust
// Constructor takes optional verfer reference (None for standalone)
Siger::new_with_qb64b(bytes, None)?
Siger::new_with_qb2(bytes, None)?
```

### Cigar (two-phase parse)
Parses a **Verfer then a Cigar** — the cigar references the preceding verfer:
```rust
// qb64b path:
let verfer = Verfer::new_with_qb64b(bytes)?;
let vsize = verfer.full_size()?;
let cigar = Cigar::new_with_qb64b(&bytes[vsize..], Some(&verfer))?;
let csize = cigar.full_size()?;
Ok((&bytes[vsize + csize..], cigar))
```
Total consumption: `verfer.full_size() + cigar.full_size()` bytes.

### Counter (different constructor)
```rust
// qb64b: positional args, qb64b is 4th parameter
Counter::new(None, None, None, Some(bytes), None, None)?
// qb2: positional args, qb2 is 6th parameter
Counter::new(None, None, None, None, None, Some(bytes))?
```

### siger_list_parser (compound: counter + N sigers)
```rust
// Parses a counter, then counter.count() sigers
let (rest, counter) = counter_from_qb64b(bytes)?;
let (rest, sigers) = nom::multi::count(
    nomify!(siger_from_qb64b),
    counter.count() as usize
)(rest)?;
Ok((rest, sigers))
```

## nomify! Macro

Bridges `ParsideResult<(&[u8], T)>` → `nom::IResult<&[u8], T>`:

```rust
macro_rules! nomify {
    ($func:expr) => {
        |bytes: &'a [u8]| {
            $func(bytes).map_err(|_| {
                nom::Err::Error(nom::error::Error::new(bytes, nom::error::ErrorKind::IsNot))
            })
        }
    };
}
```

All parside/cesride errors become `ErrorKind::IsNot`. Error detail is lost in the conversion — nom only sees "parse failed here".

Used in two contexts:
1. Parser factories: `Ok(nomify!(Self::siger_from_qb64b))` — wraps a method as a nom parser
2. `MessageList`: `many0(nomify!(Message::from_stream_bytes))` — wraps the top-level parser

## PathedMaterialQuadlets (no Parsers, direct slicing)

Does not use `Parsers` at all. Computes byte count from counter:

```
qb64: byte_count = counter.count() * 4   (quadlets → chars)
qb2:  byte_count = counter.count() * 3   (quadlets → bytes)
```

Splits bytes at `byte_count`, stores raw material without further parsing.
