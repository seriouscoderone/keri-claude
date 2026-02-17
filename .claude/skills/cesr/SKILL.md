---
name: cesr
description: >
  CESR (Composable Event Streaming Representation) encoding specification for KERI
  protocol implementations. Activates when working on CESR codecs, code tables, stream
  parsing, SAID derivation/verification, SAD path signatures, or any code that encodes/decodes
  CESR primitives (qb64/qb2), count codes, or indexed signatures. Covers the full CESR spec:
  T/B domain conversion, composability property, cold start parsing, version strings, and
  the normative Annex A code point registry.
---

# CESR Specification Skill

CESR is a dual-domain (Text/Binary) composable encoding for cryptographic primitives used across the KERI ecosystem. It provides round-trip T<->B conversion with the composability property: `T(cat(b[k])) = cat(T(b[k]))`. All KERI events, credentials (ACDCs), and protocol messages use CESR encoding.

## Quick Reference

### Core Size Formulas

```
pad_size = (3 - (raw_size % 3)) % 3    # 0, 1, or 2
lead_bytes = pad_size                    # always equal
cs = hs + ss                            # code size
fs = hs + ss + vs                       # full size (T-domain)
bs = ls + rs                            # binary size
```

### Most-Used Code Points

| Code | What | fs |
|------|------|----|
| `D` | Ed25519 public verkey | 44 |
| `E` | Blake3-256 Digest | 44 |
| `B` | Ed25519 non-transferable prefix | 44 |
| `0B` | Ed25519 signature | 88 |
| `0A` | 128-bit salt/seed/nonce | 24 |
| `1AAG` | DateTime ISO-8601 | 36 |
| `M` | Short number (2-byte) | 4 |
| `-A` | Generic pipeline group | count |
| `-G` | CESR native field map | count |

### SAID Generation (5-Step)

1. Determine CESR-encoded digest length for chosen algorithm
2. Fill SAID field with `#` chars of that length
3. Serialize canonically (compact JSON, insertion-order fields)
4. Compute digest of serialized bytes
5. Encode digest with CESR derivation code, replace `#`s

## Reference Files

- **encoding-and-framing.md** — T/B domain conversion, composability proof, stream structure, cold start parsing, count code framing, CESR native serialization
- **code-tables.md** — Normative code point registry (Annex A): all 15 encoding schemes, selector dispatch, parse size labels, Master + Indexed code tables for KERI/ACDC v2.00, normative rules for selectors/counts/genus
- **version-said.md** — Version string formats (1.XX + 2.XX), SAID generation/verification algorithms, canonicalization rules, hash agility model, post-quantum security via pre-rotation digest commitments
- **sad-path-signatures.md** — SAD path language, path resolution algorithm, transposable signature attachments, transposition algorithm, relationship to ACDC selective disclosure

## Validation Checklist

- [ ] All primitives align on 24-bit (3-byte / 4-char) boundaries
- [ ] Count codes count Quadlets/Triplets, not number of primitives
- [ ] SAID dummy string uses `#` chars of exact CESR-encoded digest length
- [ ] JSON serialization for SAID is compact (no whitespace, insertion-order keys)
- [ ] Version string `v` field is first in every non-CESR field map
- [ ] Cold start parser uses tritet dispatch (first 3 bits) for domain detection
- [ ] Genus/version code modifies all following top-level counts until next genus/version
- [ ] Overrideable groups (`-A` to `-C`) check first embedded code for genus/version switch
- [ ] SAD paths use only `-` as delimiter (Base64-safe)
- [ ] Transposed signatures update root path only, never re-sign

## Anti-Patterns

**DON'T** count the number of primitives in a count code size field.
**DO** count Quadlets (T) or Triplets (B) in the following group.

**DON'T** use JSON pretty-printing when computing SAIDs.
**DO** use compact serialization: `separators=(",", ":")`, no whitespace.

**DON'T** assume all code tables are universal across genera.
**DO** check: `-A` to `-J` are universal; `-K` onward are genus-specific.

**DON'T** re-sign when embedding a signed SAD inside an envelope event.
**DO** transpose by rewriting the root path: `new_root = normalize(envelope_path) + old_root[1:]`.

**DON'T** use JSONPtr (`/`) or JSONPath for SAD path expressions.
**DO** use the SAD Path Language with `-` delimiter (natively Base64 compatible).
