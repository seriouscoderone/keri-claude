# SAD Path Signatures

Transposable cryptographic signature attachments on Self-Addressing Data (SADs), using a Base64-compatible pathing language to locate signed content.

## Key Properties

- **Streamable:** Signatures attach alongside content in a CESR stream (T or B domain, over TCP/UDP/HTTP) -- not wrapped inside an envelope
- **Transposable:** When a signed SAD is embedded in an `exn`/`rpy`/`exp` event, signatures move to the outer attachment stream by path rewrite alone -- no re-signing
- **Partial verification:** Verifiers check signatures on nested SAD subsets without deserializing the enclosing envelope; enables ACDC selective disclosure

## SAD Path Language

### Grammar

```
SAD Path Syntax:
  path     = "-"                     # root (whole SAD)
           | "-" component+          # nested path
  component = "-" label              # field name in map
           | "-" integer             # index into map (static field order) or array
  trailing  = "-"?                   # MAY be present; ignored

Reserved character: `-` (dash) only -- Base64 char 62
Root context is always a map. No wildcards.
```

### CESR Codes

| Code | Lead Bytes | Description |
|------|-----------|-------------|
| `4A##` | 0 | SAD Path, variable size (## = 0..4095 quadlets) |
| `5A##` | 1 | SAD Path, 1 lead byte |
| `6A##` | 2 | SAD Path, 2 lead bytes |

Max path: 16,380 chars (T) / 12,285 bytes (B).

## Path Examples

| SAD Path | CESR (T domain) | Target |
|----------|-----------------|--------|
| `-` | `6AABAAA-` | Whole SAD |
| `-a-personal` | `4AADA-a-personal` | `{'name': 'John Doe', 'home': 'Atlanta'}` |
| `-5-3` | `4AAB-5-3` | Same as above via integer indices |
| `-5-3-name` | `6AADAAA-5-3-name` | `'John Doe'` |
| `-a-personal-1` | `6AAEAAA-a-personal-1` | `'Atlanta'` (index into map by static field order) |
| `-a-p-1-0` | `4AAC-a-p-1-0` | `{'name': 'Bob', 'i': 'ECWJZFBtllh99fESUOrBvT3EtBujWtDKCmyzDAXWhYmf'}` |
| `-a-p-0-0-name` | `6AAEAAA-a-p-0-0-name` | `'Amy'` |
| `-a-p-0-ref0-i` | `6AAEAAA-a-p-0-ref0-i` | `'ECmiMVHTfZIjhA_rovnfx73T3G_FJzIQtzDn1meBVLAz'` |

Note: `-5-3` and `-a-personal` are equivalent. Integer `5` = zero-based index of field `a` in the top-level map; `3` = index of `personal` within `a`.

## Path Resolution Algorithm

```
resolve(path, sad):
1. Split path on `-`, discard empty trailing strings
2. If path == "-" (root only) → return entire SAD
3. Set context = sad (root map)
4. For each component c:
   a. context is MAP:
      - c is integer → retrieve value at field position c (static order)
      - c is string  → retrieve value of field labeled c
      - Set context = retrieved value
   b. context is ARRAY:
      - c MUST be integer, else → ERROR
      - Set context = element at index c
   c. context is LEAF with components remaining → ERROR
5. Return context
```

## Signature Transposition Algorithm

Moves signature attachments from an embedded SAD to its enveloping SAD.

```
normalize(path):
  if path == "-": return "-"
  strip trailing "-" if present
  return path

transpose(signature_group, envelope_path):
1. Extract old_root from signature group attachment
2. Normalize both envelope_path and old_root
3. Compute new_root:
   - old_root == "-" → new_root = envelope_path
   - otherwise       → new_root = normalize(envelope_path) + old_root[1:]
   Example: envelope_path="-payload", old_root="-a-personal"
            → new_root = "-payload-a-personal"
4. Re-encode new_root with CESR code (4A##/5A##/6A##)
5. Replace root path in signature group
6. Attach updated group to enveloping SAD's CESR stream
```

Note: Algorithm reconstructed from spec narrative. Verify against keripy implementation.

## Rules

| ID | Rule | Level |
|----|------|-------|
| R1 | Array context: all path components MUST be integers | MUST |
| R2 | Sub-path resolving to a leaf (not map/array) with components remaining is an error | Error |
| R3 | Root context after initial `-` is always a map | Convention |
| R4 | Trailing `-` in path MAY be present; ignored | MAY |
| R5 | All maps in SADs require static field ordering | Convention |
| R6 | Map context accepts any mix of integer indices and field labels | Convention |
| R7 | SAD Path Signatures MAY attach to JSON, MessagePack, or CBOR serialized SADs | MAY |
| R8 | Signed SADs streamable in T or B domain alongside any KERI event | Capability |
| R9 | Signed subsets are SADs themselves or SAIDs of out-of-band SADs | Capability |
| R10 | CESR attachments on embedded SADs cannot nest inside map serializations (JSON/CBOR/MSGPACK) | Constraint |
| R11 | Signatures transposable to enveloping SAD without re-signing | Mechanism |
| R12 | Transposition = rewrite root path to embedded location inside envelope | Mechanism |

## Error Conditions

```
DON'T: Use string labels to index into arrays
DO:    MUST use integer indices in array context → reject path on violation

DON'T: Continue resolving a path when current context is a leaf value
DO:    MUST reject path when sub-path resolves to non-container

DON'T: Embed CESR attachment groups inside JSON/CBOR/MSGPACK map values
DO:    MUST transpose signatures to the enveloping SAD's attachment stream

DON'T: Transpose when result exceeds size limits
DO:    MUST reject transposition if path > 16,380 chars (T) / 12,285 bytes (B)

DON'T: Wrap signed content inside a signature envelope (JWS-style)
DO:    Attach signatures alongside content; reference target via path expression
```

## Key Terms

| Term | Definition |
|------|-----------|
| SAD | Self-Addressing Data -- content-addressable via its own digest (SAID); requires static field ordering |
| SAD Path Language | Base64-compatible pathing using `-` as sole delimiter to locate content within a SAD |
| Transposable Signature | Signature movable across envelope boundaries by root path rewrite, without re-signing |
| Root Path | Single `-` representing the top level of a SAD |
| `exn`/`rpy`/`exp` | KERI event types (exchange/replay/expose) that can embed signed SADs as payload |
