# Version String and SAID

> SAIDs are **derivation commitments**, not merely hashes -- self-referential digests embedded within the serialization from which they are derived.

## Version String 2.XX

```
Format: PPPPMmmGggKKKKBBBB.  (19 chars)
        ├──┤├─┤├─┤├──┤├──┤│
        proto ver genus kind size terminator

PPPP  4  Protocol identifier (KERI, ACDC, ...)
Mmm   3  Protocol version, base-64 numeric (major 0-63, minor 0-4095)
Ggg   3  CESR genus table version, base-64 numeric
KKKK  4  Serialization kind: JSON | CBOR | MGPK | CESR
BBBB  4  Total serialization length, base-64 encoded (max 2^24 = 16,777,216)
.     1  Literal period terminator
```

Field label: `v` (lowercase). MUST be first field in any top-level field map.

**Base-64 numeric notation:** Positional base-64 digits (`A`=0 .. `_`=63).
- `CAA` = major 2, minor 0 (v2.0)
- `CAQ` = major 2, minor 16 (v2.16)

**CESR native:** When kind = `CESR`, the version string is a placeholder in the in-memory object only; it does not appear in CESR native serialization. CESR native field maps use `-G##`/`--G#####` count codes for size and type.

**Large serializations:** For payloads exceeding 2^24 chars, use hash-chained Messages via SAIDs.

## Version String 1.XX (Legacy)

```
Format: PPPPvvKKKKllllll_  (17 chars)
        ├──┤├┤├──┤├────┤│
        proto ver kind length terminator

PPPP    4  Protocol identifier
vv      2  Lowercase hex (major 0-15, minor 0-15)
KKKK    4  Serialization kind: JSON | CBOR | MGPK | CESR
llllll  6  Lowercase hex length (max 2^24)
_       1  Literal underscore terminator
```

No genus version field. Examples: `01` = v0.1; `1c` = v1.12; length 384 = `000180`.

## SAID Generation Algorithm

Inputs: data structure with designated SAID field + target digest algorithm.

```
Generate SAID:
1. [ ] Determine SAID length from CESR derivation code
       (e.g., E prefix = Blake3-256 → 44 Base64 chars total)
2. [ ] Fill SAID field with dummy string: '#' x length
3. [ ] Serialize canonically
       - JSON: compact, no extra whitespace (separators=(",",":"))
       - Mappings: insertion-order fields (canonical)
4. [ ] Compute cryptographic digest of serialized bytes
5. [ ] Encode as CESR: prepend derivation code → CESR-encoded SAID
6. [ ] Replace dummy string with CESR-encoded SAID in data structure
7. [ ] Reserialize with embedded SAID (if final serialization needed)
```

**Key constraint:** CESR-encoded SAID length MUST equal dummy string length (guaranteed by CESR fixed-length output per derivation code).

**Errors:** Non-order-preserving serialization (SAID not reproducible); dummy length mismatch with CESR output length.

## SAID Verification Algorithm

Inputs: serialization containing embedded SAID + knowledge of which field holds the SAID.

```
Verify SAID:
1. [ ] Extract (copy) the CESR-encoded SAID from the serialization
2. [ ] Replace SAID field with dummy string '#' x len(copied SAID)
3. [ ] Compute digest of modified serialization using algorithm
       indicated by the copied SAID's CESR derivation code
4. [ ] Encode computed digest as CESR (prepend derivation code)
5. [ ] Compare copied SAID with recomputed SAID
       - Match → verification succeeds
       - Mismatch → verification fails
```

**Errors:** Unrecognized CESR derivation code (cannot determine algorithm); non-canonical serialization (digest will not match).

## Canonicalization Requirements

- Field ordering and sizing MUST be fixed and reproducible
- Mappings MUST preserve insertion order on any round trip
- JSON: MUST use compact serialization -- no insignificant whitespace, insertion-order fields, UTF-8 encoding, no duplicate keys
- CBOR/MGPK: must use order-preserving map representations

## Hash Agility

- Each SAID is prefixed with a derivation code identifying the digest algorithm -- no out-of-band negotiation needed
- Different serializations / SADs may use different digest algorithms
- Digest output sizes are fixed per derivation code, so SAID field lengths are deterministic
- Adopting a new algorithm requires only a new derivation code entry in the CESR code table; no protocol changes needed
- Common example: `E` prefix = Blake3-256, 44 Base64 URL-safe chars (1 code + 43 digest)

## Post-Quantum Security

Pre-rotation commits to a **digest** of the next public key, not the key itself. An attacker with a quantum computer must:
1. Invert the hash (digest to public key) -- classical computation, infeasible for 256-bit
2. Then invert the key generation (public key to private key) -- quantum computation

Step 1 blocks step 2.

| ID | Property |
|----|----------|
| PQ1 | Pre-rotation commits to digest of public key (not the key itself) |
| PQ2 | Digest verifiable once public key disclosed in later rotation |
| PQ3 | Unexposed pre-rotation keys hidden in digest are protected from quantum brute force |
| PQ4 | 256-bit Blake2/Blake3/SHA3 maintain 128-bit strength post-quantum |
| PQ5 | Hidden keys expressed as CESR-encoded qualified digests with algorithm in derivation code |
| PQ6 | Hiding pre-rotation keys imposes no additional storage burden |

## Rules

### Version String Rules

| ID | Lvl | Statement |
|----|-----|-----------|
| R1 | MUST | Non-CESR serializations interleaved in a CESR Stream MUST have a Version String as first field with label `v` |
| R2 | MUST | Version String `v` field MUST be first field in any top-level field map of interleaved JSON/CBOR/MGPK |
| R3 | MUST | Stream parser MUST use Version String to extract and deserialize any serialized field maps |
| R4 | MUST | Each field map in a Stream MUST use JSON, CBOR, or MGPK serialization |
| R5 | MAY | Each field map MAY use a different serialization type |
| R6 | MUST | Version 2.XX implementations MUST support 1.XX format for backward verification |

### CESR Native Rules

| ID | Lvl | Statement |
|----|-----|-----------|
| R14 | -- | CESR native field maps do not embed a version string in serialization |
| R15 | MAY | In-memory CESR native field map MAY inject placeholder version string with kind `CESR` |
| R16 | -- | Placeholder with kind `CESR` is normative indicator to reserialize as CESR native |

### SAID Rules

| ID | Lvl | Statement |
|----|-----|-----------|
| R7 | MUST | SAIDs MUST be encoded as a CESR Primitive |
| R8 | MUST | SAID MUST include prepended derivation code specifying the digest algorithm |
| R9 | MUST | SAID verification protocol MUST be implemented as specified (5-step process) |

### Canonicalization Rules

| ID | Lvl | Statement |
|----|-----|-----------|
| R10 | MUST | Ordering and sizing of fields MUST be fixed for reproducibility |
| R11 | MUST | Mappings MUST preserve field ordering on any round trip |
| R12 | -- | Natural canonical ordering for mappings is insertion order |
| R13 | -- | JSON for SAID MUST use compact serialization (no extra whitespace) |

## Key Terms

| Term | Definition |
|------|------------|
| SAID | Self-Addressing Identifier -- CESR-encoded cryptographic digest embedded within the serialization from which it is derived |
| SAD | Self-Addressing Data -- field map containing an embedded SAID |
| Version String | First field (`v`) in non-CESR serializations; provides protocol, version, kind, and length for stream parsing |
| Canonical ordering | Stable, round-trippable insertion-order field ordering |
| Base-64 numeric | Number in base-64 (not Base64-encoded string); `A`=0 .. `_`=63 |
| Dummy string | Placeholder of `#` chars (ASCII 35) replacing SAID field during generation/verification; same length as CESR-encoded digest |
| Derivation code | CESR prefix identifying cryptographic algorithm and output length; provides hash agility |
