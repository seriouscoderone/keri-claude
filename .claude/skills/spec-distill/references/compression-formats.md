# Compression Formats

Six patterns for compressing verbose specification content into compact, actionable reference material. Each pattern includes a before/after example.

## Compression Heuristics

- **Target ratio:** ~1 line of output per 10 lines of spec prose
- **Always drop:** motivation paragraphs, historical context, bibliography entries, redundant examples, preamble sentences ("This section describes...")
- **Always keep:** every MUST/SHOULD/MAY statement, every field name and constraint, every algorithm step, every state transition, every error condition
- **Verify:** After compression, the normative statement count (MUST/SHOULD/MAY) should match the synthesis input

---

## 1. Decision Trees

**Use for:** Validation logic, conditional processing rules, branching requirements

**Before (spec prose):**
> When processing an inception event, the validator MUST first check that the version string is present and conforms to the expected format. If the version string is missing, the event MUST be rejected. If the version is present but the protocol identifier does not match a known protocol, the event SHOULD be placed in escrow for possible future support. If the protocol is recognized, the validator MUST then verify that the identifier prefix is derived from the inception event content. This verification involves computing the digest of the inception event with the `d` field set to the appropriate placeholder and comparing it to the stated prefix. If the prefix does not match, the event MUST be rejected as invalid.

**After (decision tree):**
```
validate_inception(event):
  if no version string → REJECT (missing version)
  if unknown protocol → ESCROW (SHOULD, future support)
  if prefix ≠ digest(event with d=placeholder) → REJECT (invalid prefix)
  → ACCEPT
```

---

## 2. Field Tables

**Use for:** Message format descriptions, parameter definitions, configuration fields

**Before (spec prose):**
> The inception event contains a version string field labeled `v` which MUST be a string conforming to the version string format. The type field `t` MUST contain the ilk `icp` for inception events. The digest field `d` contains the SAID of the event and MUST be computed using the designated digest algorithm. The identifier prefix `i` is derived from the public key or the digest of the inception event. The sequence number `s` MUST be `0` for inception events. The keys field `k` is a list of public keys that MUST contain at least one entry. The key threshold `kt` may be a single integer or a fractional weight list.

**After (field table):**

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| `v` | str | MUST match version format | Version string |
| `t` | str | MUST = `"icp"` | Ilk |
| `d` | str | MUST = SAID of event | Digest |
| `i` | str | Derived from key or event digest | Prefix |
| `s` | str | MUST = `"0"` | Sequence number |
| `k` | list | MUST have ≥1 entry | Public keys |
| `kt` | str\|list | Integer or fractional weights | Key threshold |

---

## 3. Checklists

**Use for:** Multi-step procedures, verification processes, setup sequences

**Before (spec prose):**
> To verify a rotation event, the verifier must first retrieve the current key state for the identifier. The verifier then checks that the sequence number is exactly one greater than the current sequence number. Next, the verifier must verify that the prior event digest matches the digest of the event at the current sequence number. The verifier must then confirm that the new keys satisfy the prior next key commitment by computing the digests of the new keys and comparing them against the committed next key digests. If all checks pass, the verifier updates the key state with the new keys and increments the sequence number. The verifier must also validate any witness changes against the witness threshold.

**After (checklist):**
```
Verify rotation event:
1. [ ] Retrieve current key state for identifier
2. [ ] Check sn = current_sn + 1
3. [ ] Check prior digest matches event at current_sn
4. [ ] Compute digests of new keys
5. [ ] Compare against committed next key digests (MUST match)
6. [ ] Validate witness changes against witness threshold
7. [ ] Update key state: new keys, increment sn
```

---

## 4. Code Templates

**Use for:** Data structures, message layouts, serialization formats

**Before (spec prose):**
> A CESR primitive consists of a type code followed by the raw cryptographic material. The type code is composed of a hard part and an optional soft part. The hard part identifies the type and derivation of the primitive. The soft part, when present, encodes variable-length information such as a count or index. Together the hard and soft parts form the code. The full size of the primitive in its base-64 representation is determined by the code, and is always a multiple of 4 characters to ensure alignment. The raw bytes of the cryptographic material follow the code, padded as necessary to achieve proper alignment.

**After (code template):**
```
CESR Primitive Layout:
┌──────────┬──────────┬─────────────────────┐
│ hard (hs) │ soft (ss) │ raw material + pad  │
├──────────┴──────────┤                     │
│    code (cs=hs+ss)  │                     │
├─────────────────────┴─────────────────────┤
│           full size (fs) — multiple of 4   │
└───────────────────────────────────────────┘

hs = hard size (sextets) — identifies type
ss = soft size (sextets) — variable info (count/index), 0 if none
cs = hs + ss (code size)
fs = total base-64 chars, always fs mod 4 = 0
```

---

## 5. Anti-Pattern Lists

**Use for:** Scattered warnings, common implementation mistakes, security considerations

**Before (spec prose scattered across multiple sections):**
> "Implementers should be cautious about accepting events with sequence numbers that skip values, as this could indicate a compromised controller..." (§3.5)
> "A common implementation error is to verify only the current event's signature without checking the full chain of custody back to the inception event..." (§4.2)
> "Note that the digest algorithm used for the SAID must match the algorithm specified in the version string; using a different algorithm will produce an invalid identifier..." (§2.1)

**After (anti-pattern list):**
```
DON'T: Accept events with skipped sequence numbers
DO:    Require sn to increment by exactly 1 (detect compromise)

DON'T: Verify only the current event's signature
DO:    Verify the full chain of custody back to inception

DON'T: Use a digest algorithm that differs from the version string
DO:    Match SAID digest algorithm to version string algorithm
```

---

## 6. State Transition Notation

**Use for:** Protocol state machines, lifecycle flows, escrow processing

**Before (spec prose):**
> When an event is first received, it enters the unverified state. If the event's signatures can be verified against the current key state, the event transitions to the verified state. If the signatures cannot be verified because the signing keys are not yet known (for example, in the case of an out-of-order event), the event is placed in escrow in the partially-signed state. When sufficient signatures are later received, the escrowed event transitions from partially-signed to verified. If an event remains in escrow beyond the timeout period, it transitions to the timed-out state and is discarded. A verified event that is accepted and applied to the key event log enters the accepted state, which is terminal.

**After (state transition notation):**
```
[received] --valid sigs--> [verified] --applied to KEL--> [accepted] (terminal)
[received] --unknown keys--> [escrowed:partial-sig]
[escrowed:partial-sig] --sufficient sigs--> [verified]
[escrowed:partial-sig] --timeout--> [timed-out] (discard)
```

---

## Applying Compression

When compressing a synthesis file:

1. **Scan** the file and identify which content maps to which format
2. **Convert** each section using the matching format above
3. **Verify normative count:** Grep for MUST/SHOULD/MAY in both input and output — counts should match (±10% for deduplication)
4. **Check size:** Each output file should be 5–15KB
5. **Preserve structure:** Keep clear section headings so the content is scannable
6. **No lossy drops:** If you're unsure whether something is normative, keep it
