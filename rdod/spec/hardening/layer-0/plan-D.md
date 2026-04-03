# Implementation Plan: Layer 0 — Group D (Accountability/Consensus, Accountability/Dissemination, CESR/Composition, CESR/Primitives)

---

## Domain 1: accountability/consensus

### 1. Module Structure

```
@kerizon/keri-core
  accountability/
    consensus/
      mod.ts (or index.ts)        — public exports
      quorum.ts                   — BFT quorum computation (ample, simple)
      first-seen.ts               — first-seen rule enforcement
      immune.ts                   — immune constraint check
      types.ts                    — Receipt, AlreadySeen
      errors.ts                   — consensus error types
```

### 2. Type Definitions

**Receipt**
- `aid: AID` — identifier whose event was receipted
- `sn: number` — sequence number of the receipted event
- `said: SAID` — SAID of the receipted event
- `witnessSignatures: Cigar[]` — non-indexed (Cigar) signatures from signing witnesses
- `witnessAid: AID` — AID of the witness that issued this receipt
- Invariants: signatures verify against witness's current signing keys; immutable once issued; duplicate receipts (same witness, same event SAID) absorbed idempotently

**AlreadySeen**
- `aid: AID` — the identifier prefix
- `sn: number` — sequence number that was already occupied
- `firstSeenSaid: SAID` — SAID of the event first-seen at this (aid, sn)
- Invariants: any new event at same (aid, sn) with different SAID is rejected; first-seen record is immutable once written

### 3. Port Interfaces

**Inbound: Quorum Evaluation** (`port://accountability/consensus/inbound/quorum-evaluation`)
- Semantics: query, idempotent
- `computeAmple(witnessCount: number, faults?: number): number` — BFT quorum floor
- `computeSimple(n: number): number` — simple majority
- `checkImmune(m: number, n: number, f: number): boolean` — immune constraint check
- Errors: `InsufficientWitnessesError`, `TOADExceedsWitnessCountError`

**Inbound: First-seen Check** (`port://accountability/consensus/inbound/first-seen-check`)
- Semantics: command, NOT idempotent
- `applyFirstSeen(witnessId: AID, aid: AID, sn: number, eventSaid: SAID): AlreadySeen | Accepted`
- Errors: `FirstSeenConflictError`

### 4. Application Service

```
ConsensusService
  computeAmple(witnessCount, faults?)  — ceil((n + f + 1) / 2), f defaults to floor((n-1)/3)
  computeSimple(n)                     — floor(n/2) + 1
  checkImmune(m, n, f)                 — m > (n + f + 1) / 2 AND f < m
  applyFirstSeen(witnessId, aid, sn, eventSaid) — enforces first-seen rule
```

### 5. Repository Interfaces

No outbound repository ports defined. First-seen state is tracked internally by the service or passed via the accountability parent domain's storage.

### 6. Error Types

- **InsufficientWitnessesError** (fatal/abort): `{ witnessCount: number, minimumRequired: number }`
- **TOADExceedsWitnessCountError** (fatal/abort): `{ toad: number, witnessCount: number }`
- **FirstSeenConflictError** (fatal/abort): `{ prefix: string, sn: number, firstSeenSaid: string, conflictingSaid: string }`

### 7. State Machines

**First-seen Lifecycle**: `unseen -> first-seen -> receipted -> accountable`
- `unseen -> first-seen`: `applyFirstSeen()` with no prior event at (aid, sn)
- `first-seen -> first-seen`: idempotent resubmission of same event SAID (no state change)
- `first-seen -> receipted`: witness signs and stores receipt (signatures verified, consistent with prior KEL)
- `receipted -> accountable`: `verified_receipts >= TOAD AND TOAD > 0 AND TOAD <= len(witnesses)`
- Terminal: `accountable`
- Rejection: different event at same (aid, sn) is rejected, never queued or escrowed

### 8. Validation Pipeline

Three-part conjunction for accountability acceptance:
1. `receipts >= toad`
2. `toad > 0` (or toad == 0 only when witnesses empty)
3. `toad <= len(witnesses)`

TOAD boundary conditions:
- TOAD=0 + non-empty witnesses = invalid configuration
- TOAD=0 + empty witnesses = valid unwitnessed identifier
- TOAD > len(witnesses) = structurally impossible, reject

### 9. Builder(s)

Receipt type has 5 required fields but no optional fields, so no Builder needed. All fields are required.

### 10. Test Plan

- **ample() formula correctness**: for n in 0..1000, verify `ample(n) == ceil((n + 1 + floor((n-1)/3)) / 2)` for n>0, and 0 for n==0
- **ample() bounds**: for n >= 1, verify 1 <= ample(n) <= n
- **Quorum overlap**: for any two sets of size >= ample(n), intersection >= 1
- **Immune constraint**: Z3 pigeonhole — two M-receipt sets must share honest witness
- **TOAD boundary**: TOAD=0 with witnesses = invalid; TOAD > witnesses = invalid
- **First-seen immutability**: second different event at same (aid, sn) is rejected
- **First-seen idempotency**: same event resubmitted returns accepted or already-seen, never rejection
- **Receipt accumulation**: duplicate witness receipts do not increment count
- **Zero-witness edge case**: TOAD=0, witnesses=[] — trivially satisfied
- **Single-witness behavior**: no BFT guarantees but first-seen ordering preserved
- Integration: `SingleSigInception_happy` — at least TOAD receipts exist after inception

### 11. Dependencies

- `types://cesr/primitives#AID` — identifier type
- `types://cesr/primitives#SAID` — self-addressing identifier type
- `types://cesr/primitives#Cigar` — unindexed signature type
- `domain://externals/cryptographic-primitives` — signature verification for receipt validation

### 12. Open Questions

1. **Q-CONS-1: Does ample() allow f=0 as input, or must f >= 1?** The UL says "When f is not specified, ample defaults to f = floor((n-1)/3)." For n=1, this gives f=0. For n=2, f=0. Is ample(1) = 1 and ample(2) = 2? Or is there a minimum fault tolerance floor?

2. **Q-CONS-2: What happens when a superseding recovery rotation arrives at a witness that already has a first-seen event at that sn?** The UL mentions "Exception: superseding recovery rotation may replace a first-seen event." What are the precise conditions under which the first-seen rule can be overridden? Is this a separate port operation or a guard on `applyFirstSeen`?

3. **Q-CONS-3: Does the consensus domain own the receipt storage, or is receipt persistence delegated to accountability/receipting?** The types.yaml defines `Receipt` here, but the domain.yaml says consensus provides "rules and computations" not "storage." Who stores receipts?

4. **Q-CONS-4: For the TOAD=0 + empty witnesses case, should computeAmple return 0 (valid unwitnessed) or reject?** The verification.yaml says ample(0) = 0, but the `InsufficientWitnessesError` says "fewer than minimum required for BFT." Is 0 witnesses a valid input to ample(), or does it only apply when the caller explicitly sets TOAD=0?

5. **Q-CONS-5: Is the `first-seen-check` port truly non-idempotent?** The ports.yaml marks it `idempotent: false`, but the verification.yaml says resubmitting the SAME event is idempotent (no state change). This seems like it should be idempotent for same-SAID resubmissions and non-idempotent for different-SAID attempts. Should the port contract clarify this distinction?

---

## Domain 2: accountability/dissemination

### 1. Module Structure

```
@kerizon/keri-core
  accountability/
    dissemination/
      mod.ts                      — public exports
      propagation.ts              — event propagation (round-robin, gossip)
      witness-management.ts       — witness designation, set modification
      types.ts                    — DisseminationReport, DisseminationStrategy, WitnessConfig
      errors.ts                   — dissemination error types
```

### 2. Type Definitions

**DisseminationReport**
- `witnessesContacted: number` — how many witnesses received the event
- `receiptsCollected: number` — how many receipts came back
- `mode: string` — strategy used
- Invariants: `receiptsCollected <= witnessesContacted`

**DisseminationStrategy** (enum)
- `RoundRobin` | `Gossip` | `Direct`

**WitnessConfig**
- `witnesses: AID[]` — ordered list of designated witness AIDs
- `tally: number` — TOAD (minimum receipts for accountability), min 0
- Invariants: `tally <= witnesses.length`; witnesses must be non-transferable AIDs; modified via rotation events

### 3. Port Interfaces

**Inbound: Event Propagation** (`port://accountability/dissemination/inbound/event-propagation`)
- Semantics: command, NOT idempotent
- `propagateEvent(event: KeyEvent, witnesses: AID[], strategy: DisseminationStrategy): DisseminationReport`
- Errors: `DisseminationTimeoutError`, `WitnessUnreachableError`, `WitnessRejectionError`

**Inbound: Witness Management** (`port://accountability/dissemination/inbound/witness-management`)
- Semantics: command, NOT idempotent
- `getWitnessSet(aid: AID, sn: number): WitnessConfig`
- `amendWitnesses(config: WitnessConfig, prune: AID[], graft: AID[], newTally: number): WitnessConfig`
- Errors: none declared

**Outbound: Network Transport** (`port://accountability/dissemination/outbound/transport`)
- Semantics: command, NOT idempotent
- `sendToWitness(endpoint: Endpoint, event: KeyEvent): Receipt | TransportError`
- `broadcastReceipts(endpoint: Endpoint, receipts: Receipt[]): DisseminationReport`
- Refs: `domain://externals/transport`

### 4. Application Service

```
DisseminationService
  propagateEvent(event, witnesses, strategy)
    — RoundRobin: visit each witness in sequence, 2 passes, <=2*N exchanges
    — Gossip: witnesses forward receipts to each other, N*log(N) bandwidth
    — Direct: no witnesses, controller sends directly to validator

  getWitnessSet(aid, sn)
    — returns current witness configuration from establishment event state

  amendWitnesses(config, prune, graft, newTally)
    — validates: pruned witnesses absent, grafted witnesses present, tally in bounds
    — returns updated WitnessConfig
```

### 5. Repository Interfaces

No explicit repository port. Witness state is derived from establishment events owned by the identity domain. The outbound transport port delegates to `domain://externals/transport`.

### 6. Error Types

- **WitnessUnreachableError** (transient/retry): `{ witnessAid: string, endpoint: string }`
- **WitnessRejectionError** (recoverable/abort): `{ witnessAid: string, reason: string }`
- **DisseminationTimeoutError** (transient/retry): `{ respondedCount: number, totalCount: number, timeoutSeconds: number }`

### 7. State Machines

No explicit FSM defined. The dissemination lifecycle is procedural: send event -> collect receipts -> report.

### 8. Validation Pipeline

- Witness designation validation: all witness AIDs in `b` field must be non-transferable (B prefix); unique; controller signature required
- SAID commitment: modifying `b` field produces different SAID — tamper detection
- Atomic witnessing: sign, store, acknowledge — all succeed or none persist
- Direct mode: `bt == 0 AND len(b) == 0` — no witnesses required
- Indirect mode: `len(b) >= 1 AND bt >= 1 AND bt <= len(b)`

### 9. Builder(s)

**WitnessConfig** has only 2 required fields — no Builder needed.

### 10. Test Plan

- **Round-robin bound**: for N witnesses, <=2*N exchanges; N=0 -> 0 exchanges; N=1 -> <=2 exchanges
- **Gossip bandwidth**: for N witnesses, <=N*ceil(log2(N+1))
- **Witness designation**: witnesses in `b` field require controller signature; all must be non-transferable
- **SAID commitment**: modifying witness list changes SAID
- **Atomic witnessing**: if acceptance fails, nothing persists (sign, store, acknowledge are atomic)
- **Direct mode**: bt=0, b=[] -> no witnesses, accepted without receipts
- **Indirect mode**: len(b) >= 1, bt >= 1, bt <= len(b)
- **amendWitnesses postcondition**: pruned witnesses absent, grafted witnesses present
- Integration: `SingleSigInception_happy` — witness receipts exist for inception event

### 11. Dependencies

- `types://cesr/primitives#AID` — identifier type
- `types://accountability/consensus#Receipt` — receipt type from sibling domain
- `domain://externals/transport` — network transport abstraction

### 12. Open Questions

1. **Q-DISS-1: Does the dissemination domain own the witness-to-endpoint mapping, or is that discovery's responsibility?** The outbound transport port takes an `Endpoint`, but witness OOBIs are resolved by the discovery domain. Who translates `witnessAid` -> `Endpoint` before calling `sendToWitness`?

2. **Q-DISS-2: What is the precise round-robin algorithm?** The UL says "at most 2*N acknowledged exchanges for full dissemination" and "on each visit, controller also sends receipts collected from prior witnesses." Is the algorithm: pass 1 (send event, collect receipts), pass 2 (send accumulated receipts to each witness)? Or is it interleaved within a single pass?

3. **Q-DISS-3: Should the `getWitnessSet` operation read from the identity/state domain's key state, or does dissemination maintain its own witness registry?** The domain.yaml says "does not own consensus rules or receipt creation — only the movement of events and receipts." This implies witness configuration state is borrowed from identity/state. But the port contract returns `WitnessConfig` as if it owns it.

4. **Q-DISS-4: What is the semantic difference between DisseminationStrategy.Direct and DisseminationStrategy.RoundRobin with 0 witnesses?** Direct mode is defined as "controller sends events directly to the validator" — but the strategy enum also has a `Direct` variant. Is this variant ever selected by the caller, or is it automatically selected when witnesses is empty?

5. **Q-DISS-5: The UL states "A witness MUST only accept local (protected) events from the controller — remote acceptance is a security vulnerability." Does the dissemination domain enforce this, or is it the witness's responsibility?** If dissemination enforces it, the propagation port needs a concept of "protected" vs "unprotected" channels.

---

## Domain 3: cesr/composition

### 1. Module Structure

```
@kerizon/cesr
  composition/
    mod.ts                        — public exports (Serder, Creder, Sadder, CesrGroup, etc.)
    stream.ts                     — stream parsing, cold-start dispatch
    counter.ts                    — count code parsing, CountCode type
    group.ts                      — CesrGroup enum, GroupItem trait, concrete group types
    message.ts                    — Message, MessageList, CustomPayload
    version-string.ts             — VersionString v1/v2 parsing and construction
    attachment.ts                 — AttachmentGroup, PathedMaterialQuadlets
    sadder.ts                     — Sadder base (inhale/exhale), Serder, Creder
    cold-code.ts                  — ColdCode enum, tritet dispatch table
    types.ts                      — CountCode, CESRGroup, ColdStartTritet, VersionString, FrameType
    errors.ts                     — composition error types
```

### 2. Type Definitions

**CountCode** (discriminated union)
- Variant `small`: `{ selector: string (single letter), count: number (0-4095) }` — 4 chars T-domain
- Variant `large`: `{ selector: string, count: number (0-1,073,741,823) }` — 8 chars T-domain
- Invariants: text_size_bytes = 4 * count; binary_size_bytes = 3 * count; no raw value component; count invariant between T and B domains

**CESRGroup** (discriminated union)
- Variant `attachment`: `{ counter: CountCode, primitives: Matter[] }` — attachment groups (-C##)
- Variant `message`: `{ body: FieldMap, attachments: CESRGroup[] }` — message+attachments (-B##)
- Invariants: total encoded size of primitives must equal counter.count quadlets/triplets

**ColdStartTritet** (enum)
- Values 0-7: `Free(0), CtB64(1), OpB64(2), Json(3), MGPK1(4), Cbor(5), MGPK2(6), CtOpB2(7)`
- Computed as `byte >> 5`

**VersionString** (discriminated union)
- Variant `v2`: `{ protocol: "KERI"|"ACDC", major, minor, cesrMajor, cesrMinor, kind: "JSON"|"CBOR"|"MGPK"|"CESR", size }` — 19 chars, period terminated
- Variant `v1`: `{ protocol, major, minor, kind, size }` — 17 chars, underscore terminated

**FrameType** (enum)
- `CesrGroup` | `NonNativePayload` | `Annotated`

**Published types (from published_language):**
- **Sadder**: base SAD serializer — `inhale(raw) -> ked`, `exhale(ked) -> raw`, plus `code()`, `raw()`, `ked()`, `ident()`, `kind()`, `size()`, `version()`, `saider()`
- **Serder**: extends Sadder, validates ident=='KERI', provides `verfers()`, `digers()`, `werfers()`
- **Creder**: extends Sadder, validates ident=='ACDC', provides `issuer()`, `schema()`, `subject()`, `status()`

### 3. Port Interfaces

**Inbound: Stream Composition** (`port://cesr/composition/inbound/stream-composition`)
- Semantics: query, idempotent
- `composeGroup(items: Matter[], countCode: CountCode): CESRGroup`
- `serializeGroup(group: CESRGroup): Uint8Array`
- Errors: `GroupNestingError`

**Inbound: Stream Parsing** (`port://cesr/composition/inbound/stream-parsing`)
- Semantics: query, idempotent
- `parseStream(bytes: Uint8Array): { messages: Message[], remaining: Uint8Array }`
- `classifyTritet(byte: number): ColdStartTritet`
- `sniffVersionString(bytes: Uint8Array): VersionString`
- Errors: `ColdStartError`, `TruncatedStreamError`, `VersionStringParseError`

**Inbound: Attachment Management** (`port://cesr/composition/inbound/attachment-management`)
- Semantics: command, NOT idempotent
- `attachSignatures(message: CESRGroup, signatures: CESRGroup): CESRGroup`
- `extractAttachments(message: CESRGroup): { body: FieldMap, attachments: CESRGroup[] }`
- Errors: `UnexpectedCountCodeError`, `GroupNestingError`

**Outbound: Transport Layer** (`port://cesr/composition/outbound/transport`)
- Refs: `domain://externals/transport`

### 4. Application Service

```
CompositionService
  composeGroup(items, countCode)     — compose primitives into a count-code-framed group
  serializeGroup(group)              — serialize CESRGroup to qb64 bytes
  parseStream(bytes)                 — cold-start -> tritet dispatch -> group/message parsing
  classifyTritet(byte)               — byte >> 5, map to ColdCode variant
  sniffVersionString(bytes)          — regex extract from first field of non-native serialization
  attachSignatures(message, sigs)    — append signature group after message body
  extractAttachments(message)        — split body from attachment groups

StreamParser (internal)
  — Two-stage dispatch: ColdCode selects frame type, counter.code() selects group parser
  — All parsers return (remaining_bytes, parsed_value)
  — many0(message_parser) for MessageList

Sadder / Serder / Creder (published types)
  — inhale/exhale for SAD round-trip
  — Serder.verfers(), Serder.digers(), Serder.werfers()
  — Creder.issuer(), Creder.schema(), Creder.subject(), Creder.status()
```

### 5. Repository Interfaces

No repository ports — composition is purely computational (serialize/deserialize). The outbound transport port delegates to externals.

### 6. Error Types

- **UnexpectedCountCodeError** (fatal/abort): `{ code: string, context: string }`
- **TruncatedStreamError** (transient/retry): `{ expectedBytes: number, availableBytes: number }`
- **ColdStartError** (fatal/abort): `{ firstByte: number, tritet: number }`
- **VersionStringParseError** (fatal/abort): `{ rawVersion: string, reason: string }`
- **GroupNestingError** (fatal/abort): `{ outerGroup: string, innerGroup: string }`

### 7. State Machines

No explicit FSM. Stream parsing is stateless — cold-start dispatch determines parser path for each frame.

### 8. Validation Pipeline

- **Stream self-framing**: every element must satisfy `len(qb64) % 4 == 0` and `len(qb2) % 3 == 0`
- **Count code alignment**: small=4 chars (3 bytes), large=8 chars (6 bytes) — both 24-bit aligned
- **Count domain invariance**: parsing count from qb64 and qb2 yields identical numeric value
- **Group nesting rules**:
  - AttachmentGroup (-C##) contains only primitive groups (sigs, couples, triples, quadruples)
  - MessageGroup (-B##) contains one body + one AttachmentGroup
  - Count-code groups (-K, -L, etc.) are flat — no nesting
- **Attachment ordering**: attachments follow body, never interleaved; not part of signed content
- **Version string placement**: first field of non-native serializations must be 'v'
- **Frame independence**: N frames concatenated, parsed sequentially, yield exactly N frames
- **Group content rules**: -K contains Sigers, -M contains (Prefixer, Cigar) couples, -N contains quadruples, etc.
- **Round-trip**: parse(serialize(group)) == group

### 9. Builder(s)

**VersionString v2** has 7 fields — needs a Builder:
```
VersionString.builder()
  .protocol("KERI")
  .version(2, 0)
  .cesrVersion(2, 0)
  .kind("JSON")
  .size(1234)
  .build()  // -> "KERICAACAAJSON...." (19 chars)
```

**CESRGroup.message** has body + attachments — consider a convenience builder:
```
MessageBuilder
  .body(serializedFieldMap)
  .attach(controllerSigs)
  .attach(witnessReceipts)
  .build()  // -> CESRGroup.message
```

### 10. Test Plan

- **Self-framing**: every parsed element has qb64 % 4 == 0 and qb2 % 3 == 0
- **Tritet dispatch**: all 256 byte values map to exactly one of 8 frame types via byte >> 5
- **Tritet bijection**: 8 tritets -> 8 distinct frame types (injective)
- **Specific tritet assignments**: '-' -> 1, '_' -> 2, '{' -> 3, 0x80 -> 4, 0xA0 -> 5, 0xDE -> 6, 0xE0 -> 7
- **Count code structure**: small = 4 chars ('-' + type + 2 B64), large = 8 chars ('--' + type + 5 B64)
- **Count domain invariance**: T-domain count == B-domain count for same count code
- **Count size**: text_size = 4 * count, binary_size = 3 * count
- **Group nesting**: AttachmentGroup contains only primitive groups; MessageGroup = body + attachment
- **Attachment separation**: attachments follow body, not part of signed content
- **Version string**: v1 = 17 chars underscore terminated, v2 = 19 chars period terminated
- **Cold start**: O(1) dispatch, no scanning or lookahead
- **Round-trip**: serialize -> parse -> serialize produces identical bytes
- **Frame independence**: concatenated frames parse independently
- Integration: appears in every scenario that processes CESR messages

### 11. Dependencies

- `types://cesr/primitives#Matter` — base primitive type for group elements
- `types://cesr/primitives#Siger`, `Cigar`, `Diger`, `Prefixer`, `Seqner`, `Saider` — concrete primitives appearing in groups
- `domain://externals/transport` — stream delivery

### 12. Open Questions

1. **Q-COMP-1: What is the exact v2 version string regex?** The UL says "PPPPMmmGggKKKKBBBB." (19 chars) with "BBBB provides serialization size in Base64." But is BBBB truly 4 Base64 chars (max 16,777,216 bytes), or could it be different? What is the precise regex pattern for parsing v2?

2. **Q-COMP-2: How does genus/version code (-_GGGVVV) interact with the parser dispatch?** The UL says "Modifies interpretation of all subsequent count codes until another genus/version code appears." Is this state maintained per-stream, per-frame, or per-group? Does the parser need to track the "active genus" as mutable state?

3. **Q-COMP-3: For the signable count codes (-E, -F, -G), how does the parser know where the signed content ends and the signature group begins?** The count value measures content to be signed, excluding the -C attachment. Does the parser: (a) read the count, extract that many bytes as signed content, then parse the next element as -C attachments? Or (b) is there a separator?

4. **Q-COMP-4: The CesrGroup UL mentions "12 variants in the KERI/ACDC genus" but the Concrete Group Types term lists more than 12 (universal + genus-specific). Which 12 are the canonical KERI/ACDC group variants?** Can we get an exhaustive enum of CesrGroup variants?

5. **Q-COMP-5: Does the Sadder/Serder/Creder hierarchy belong in cesr/composition or should it be split?** Sadder is a generic SAD serializer, Serder adds KERI event awareness, Creder adds ACDC credential awareness. The domain.yaml publishes all three as composition's language, but Serder references identity concepts (verfers, digers, werfers) and Creder references credential concepts (issuer, schema). Should these be facades that delegate to identity and credential domains for validation?

6. **Q-COMP-6: What is the encoding rule for the -H enclosure code (non-native inside count code groups)?** The UL says "nested non-native serializations within count code groups MUST use the -H## enclosure code." Is the body inside -H the raw JSON/CBOR/MGPK bytes, or is it a version-string-prefixed field map? Does -H include the version string or just the serialized content?

7. **Q-COMP-7: Is tritet 0b000 ("Annotated T-domain" / "Free") actually used in practice?** The ColdCode UL calls it "Free" in one place and "annotated T-domain" in another. What concrete stream content starts with a byte whose high 3 bits are 000? Base64 uppercase A-O have tritet 000-010 — so 'A' through 'O' map to tritet 0. Are standalone CESR primitives (not inside groups) the content here?

---

## Domain 4: cesr/primitives

### 1. Module Structure

```
@kerizon/cesr
  primitives/
    mod.ts                        — public exports
    matter.ts                     — Matter base type (code, raw, qb64, qb2)
    indexer.ts                    — Indexer base type (extends Matter with index/ondex)
    verfer.ts                     — Verfer (public key, verify method)
    diger.ts                      — Diger (digest, compare method)
    signer.ts                     — Signer (private key, sign method)
    siger.ts                      — Siger (indexed signature)
    cigar.ts                      — Cigar (unindexed signature)
    salter.ts                     — Salter (salt/seed, key derivation)
    prefixer.ts                   — Prefixer (AID prefix)
    seqner.ts                     — Seqner (sequence number)
    saider.ts                     — Saider (SAID computation)
    tholder.ts                    — Tholder (signing threshold)
    code-table.ts                 — MtrDex, NumDex, DigDex frozen code constants
    sizage.ts                     — Sizage entries (hs/ss/fs/ls), IndexedSizage
    types.ts                      — AID, SAID, Seal, SigningThreshold, DateTime, etc.
    errors.ts                     — primitive error types
```

### 2. Type Definitions

**Matter** (base type)
- `code: string` — CESR type code
- `raw: Uint8Array` — raw cryptographic material
- `qb64: string` (derived) — text domain representation
- `qb2: Uint8Array` (derived) — binary domain representation
- Invariants: code + raw <-> qb64 <-> qb2; code determines expected raw length; qb64 length % 4 == 0; qb2 length % 3 == 0

**SigningThreshold** (discriminated union)
- Variant `simple`: `{ value: number (min 1) }` — integer threshold, hex-encoded in kt/nt/bt
- Variant `weighted`: `{ weights: string[] }` — fractional weights e.g. ['1/2', '1/2', '1/2']
- Variant `combination`: `{ clauses: string[][] }` — array of arrays of fractional weights; ALL clauses must be satisfied (AND logic)

**Seal** (discriminated union)
- Variant `digest`: `{ d: string }` — single SAID
- Variant `event`: `{ i: string, s: string, d: string }` — (prefix, sn, SAID)
- Variant `eventLocation`: `{ i: string, s: string, t: string, p: string }` — (prefix, sn, type, prior SAID)

**AID** (discriminated union)
- Variant `transferable`: `{ prefix: string }` — digest-derived (E, I, 0D codes)
- Variant `nonTransferable`: `{ prefix: string }` — key-derived (B, 1AAA, 1AAI codes)

**SAID**: `{ digest: string }` — CESR qb64 encoded content-addressable digest

**DateTime**: `{ value: string }` — ISO 8601 with microsecond precision, UTC

**Siger**: `{ qb64, index, ondex? }` — indexed signature with key list position
- CurrentSigCodex (B#, D#): ondex is always None
- BothSigCodex (A#, C#): ondex implicitly equals index
- Dual-indexed (0A##, 2A####): ondex is explicit and may differ from index

**Cigar**: `{ qb64, verfer: Matter }` — unindexed signature with associated public key

**Diger**: `{ qb64, code }` — digest with algorithm code

**EventSeal**: `{ i, s, d }` — cross-KEL reference (prefix, sn, SAID)

**IndexedSizage**: `{ hardSize, softSize, fullSize, mainIndexSize, otherIndexSize }`
- Invariant: mainIndexSize + otherIndexSize == softSize

**Signature** (generic, discriminated union): `indexed: { siger: Siger }` | `unindexed: { cigar: Cigar }`

**Endpoint**: `{ url: string }`

**UUID**: `{ value: string }` — CESR-qualified, >=128 bits entropy for privacy

**Salt**: `{ qb64: string }` — >=128 bits, used for hierarchical deterministic key derivation

### 3. Port Interfaces

**Inbound: Primitive Qualification** (`port://cesr/primitives/inbound/qualification`)
- Semantics: query, idempotent
- `qualify(code: string, raw: Uint8Array): Matter` — R-domain construction
- `dequalifyQb64(qb64: string): Matter` — T-domain construction
- `dequalifyQb2(qb2: Uint8Array): Matter` — B-domain construction
- `verify(verfer: Matter, sig: Uint8Array, ser: Uint8Array): boolean` — signature verification
- `digest(code: string, ser: Uint8Array): Matter` — compute digest
- `compare(diger: Matter, ser: Uint8Array): boolean` — digest comparison
- Errors: `InvalidPrimitiveCodeError`, `RawSizeMismatchError`, `InvalidQB64Error`, `InvalidQB2Error`, `SignatureVerificationError`, `DigestMismatchError`

**Inbound: Code Resolution** (`port://cesr/primitives/inbound/code-resolution`)
- Semantics: query, idempotent
- `lookupSizage(code: string): IndexedSizage`
- Errors: `InvalidPrimitiveCodeError`

**Outbound: Cryptographic Operations** (`port://cesr/primitives/outbound/crypto`)
- Semantics: query, idempotent
- `ed25519Sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array`
- `ed25519Verify(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): boolean`
- `blake3_256(data: Uint8Array): Uint8Array`
- `sha2_256(data: Uint8Array): Uint8Array`
- `argon2Derive(salt: Uint8Array, path: string): Uint8Array`
- Refs: `domain://externals/cryptographic-primitives`

### 4. Application Service

```
PrimitivesService
  qualify(code, raw)                    — validate code in table, check raw size, produce Matter
  dequalifyQb64(qb64)                  — parse code from prefix, extract raw, validate
  dequalifyQb2(qb2)                    — binary dequalification
  lookupSizage(code)                   — code table lookup returning Sizage entry

Verfer (extends Matter)
  verify(sig, ser)                     — Ed25519/ECDSA signature verification

Diger (extends Matter)
  compare(ser)                         — Blake3/SHA2 digest comparison

Signer (extends Matter)
  sign(ser, index?)                    — produce Siger (indexed) or Cigar (unindexed)
  .verfer                              — derived public key

Salter (extends Matter)
  signer(path, code)                   — argon2 key stretching -> Signer

Saider (extends Matter)
  saidify(sad, label)                  — compute and inject SAID into field map

Tholder
  satisfy(indices)                     — check if signature indices satisfy threshold
  .limen                               — threshold value
```

### 5. Repository Interfaces

No repository ports — primitives are purely computational. The outbound crypto port delegates to `domain://externals/cryptographic-primitives`.

### 6. Error Types

- **InvalidPrimitiveCodeError** (fatal/abort): `{ code: string, genus: string }`
- **RawSizeMismatchError** (fatal/abort): `{ code: string, expectedSize: number, actualSize: number }`
- **InvalidQB64Error** (fatal/abort): `{ qb64: string, reason: string }`
- **InvalidQB2Error** (fatal/abort): `{ qb2Length: number, reason: string }`
- **SignatureVerificationError** (fatal/abort): `{ verferCode: string, messageLength: number }`
- **DigestMismatchError** (fatal/abort): `{ digerCode: string, expected: string, computed: string }`
- **SAIDVerificationError** (fatal/abort): `{ expectedSaid: string, computedSaid: string }`

### 7. State Machines

No explicit FSM — primitives are immutable value objects with no lifecycle transitions.

### 8. Validation Pipeline

- **Interface contract**: every primitive supports 3 construction paths (R, T, B domain) and exposes .code, .raw, .qb64, .qb2
- **Code-is-algorithm**: code is the sole algorithm identifier, no secondary dispatch
- **Raw size match**: raw length must equal size specified by code's Sizage entry
- **Domain consistency**: constructing from any one representation yields identical other two
- **qb64 composability**: len(qb64) % 4 == 0 always
- **qb2 composability**: len(qb2) % 3 == 0 always
- **Round-trip**: Matter(qb64=m.qb64).raw == m.raw; Matter(qb2=m.qb2).raw == m.raw; Matter(raw=m.raw, code=m.code).qb64 == m.qb64
- **Saidify algorithm**: replace 'd' with dummy of correct length -> serialize (deterministic field order) -> digest -> inject result
- **Nested saidification**: depth-first — inner sections before outer

### 9. Builder(s)

**SigningThreshold.combination** has nested arrays — needs a Builder:
```
SigningThreshold.builder()
  .clause(['1/2', '1/3', '1/4'])
  .clause(['1/2', '1/2'])
  .build()  // -> SigningThreshold.combination
```

**Seal.event** has 3 fields — borderline, but a Builder clarifies intent:
```
Seal.event()
  .identifier(aid)
  .sequenceNumber(sn)
  .said(digest)
  .build()
```

### 10. Test Plan

- **Interface contract**: all primitive types support R, T, B domain construction and expose .code, .raw, .qb64, .qb2
- **Code-is-algorithm**: no .algorithm attribute; code IS the identifier
- **Raw size match**: raw length == code table entry's expected size
- **Domain consistency**: any single representation fully determines the other two
- **qb64 composability**: len(qb64) % 4 == 0 for all primitives
- **qb2 composability**: len(qb2) % 3 == 0 for all primitives
- **Round-trip**: T->R->T, B->R->B, R->T->R all produce identical output
- **Verfer.verify**: Ed25519 key verifies valid signature, rejects invalid
- **Diger.compare**: Blake3-256 digest matches original data, mismatches on tampered data
- **Siger index/ondex**: BothSigCodex has ondex==index; CurrentSigCodex has ondex==None; dual-indexed has explicit ondex
- **Saidify**: dummy injection -> serialize -> digest -> verify self-referential integrity
- **Salter.signer**: argon2 derivation produces deterministic Signer for given path/code
- **Code table coverage**: all 110 master codes + 19 indexed codes + 22 count codes have valid Sizage entries
- **One-char codes**: pad size 1, 32-byte raw, 44-char qb64 (A, B, D, E, M, etc.)
- **Two-char codes**: pad size 2, 64-byte raw, 88-char qb64 (0B, 0C, 0D, etc.)
- **Four-char codes**: pad size 0/1/2, various raw sizes (1AAA, 1AAB, etc.)
- Integration: every scenario uses CESR primitives for signatures, digests, and identifiers

### 11. Dependencies

- `domain://externals/cryptographic-primitives` — Ed25519, ECDSA, Blake3, SHA2, argon2

### 12. Open Questions

1. **Q-PRIM-1: What is the complete Sizage table for all 151 code table entries?** The code-table.yaml lists 110 master + 19 indexed + 22 count codes, but the Sizage entries (hs, ss, fs, ls) for each are not explicitly enumerated. Are these derivable from a formula based on the code prefix character, or must each be looked up individually?

2. **Q-PRIM-2: How does the Tholder.satisfy() method work for weighted/combination thresholds?** The types.yaml says "Satisfaction requires ALL clauses to be independently satisfied (AND logic) — each clause's verified-signature weights must sum to >= 1.0." But the published_language lists Tholder in this domain, while the notes say "Satisfaction semantics defined by identity/thresholds domain." Does cesr/primitives own Tholder encoding only, with satisfaction logic in identity/thresholds?

3. **Q-PRIM-3: Is the mid-padding algorithm for qb64 encoding specified?** The qualification term says "qb64 string = code + Base64-encoded mid-padded raw." What is the precise mid-padding algorithm? Where do the pad bytes go relative to the code prefix — are they between code and raw, or at the boundary of the 24-bit alignment?

4. **Q-PRIM-4: For Siger dual-indexed codes (0A##, 2A####), how is the index/ondex encoded in the soft part of the code?** The UL says small indexed codes have 1-char index (64 values) and big codes have 2-char index (4096 values). For dual-indexed, is the soft part split evenly (e.g., 2A: 2 chars index + 2 chars ondex), or is the split asymmetric?

5. **Q-PRIM-5: The code table has encryption-related codes (C=X25519, O=X25519_Private, P=X25519_Cipher_Seed). Are these in scope for the primitives domain, or should they be deferred to a separate encryption subdomain?** The domain description focuses on "qualifying raw cryptographic material" which includes encryption keys, but the published_language doesn't mention Decrypter or Encrypter.

6. **Q-PRIM-6: The DateTime type has microsecond precision and is used for KRAM timeliness checking. Does this domain own DateTime, or should it be a shared type?** It appears in types.yaml but is not in the published_language. KRAM is a messaging concern, not a primitive qualification concern.

7. **Q-PRIM-7: What are the precise one-character code assignments for letters beyond E?** The code-table.yaml shows A-Z and 'a', but the UL mentions "52 possible codes (letters only)" for one-character codes. Are lowercase letters a-z all assigned, or only 'a' (Salt_256)?

---

## Cross-Domain Open Questions

1. **Q-CROSS-1: The cesr/composition domain publishes Serder, Creder, Sadder — but these types reference concepts from identity (verfers, digers) and credential-lifecycle (issuer, schema). Should these types be split across domain boundaries, or is it acceptable for composition to have these accessor methods that return primitives without domain-level validation?**

2. **Q-CROSS-2: The accountability/consensus and accountability/dissemination domains are both in the same package (@kerizon/keri-core) per packaging.yaml. Should they share internal types freely, or should they communicate only through their published languages?** The dissemination domain's transport port references `types://accountability/consensus#Receipt` — is this a published type or a cross-domain import?

3. **Q-CROSS-3: The build-order.txt places all four of these domains at Layer 0 with no dependencies between them. But cesr/composition depends on cesr/primitives types (Matter, Siger, Cigar, Diger, Prefixer, Seqner). Should cesr/composition be Layer 1 (after cesr/primitives)?** Currently the build order has both at Layer 0 and `cesr` (the parent) at Layer 1.

4. **Q-CROSS-4: The packaging.yaml places cesr/primitives and cesr/composition together in @kerizon/cesr. Does this mean they can import each other freely (package-internal), or must they respect domain boundaries even within the same package?**

5. **Q-CROSS-5: Integration scenario `EscrowCascade_full_pipeline` references accountability domain for PWE (Partially-Witnessed Escrow). The consensus domain defines the quorum rules, and dissemination handles propagation — but who owns the PWE escrow queue? Is it the parent accountability domain (Layer 4), or one of these Layer 0 subdomains?**
