# KERI Domain Primitives — C3 Reference

The five core primitives plus three additional components that compose all KERI service domains.

---

## 1. Event Log Engine

**Purpose:** Deterministic key state machine over append-only event logs.

### Operations

| Operation | Mode | Inputs | Outputs |
|-----------|------|--------|---------|
| incept | controller | InceptionConfig | KeyEvent (icp) |
| rotate | controller | AID, RotationConfig | KeyEvent (rot) |
| interact | controller | AID, seal data | KeyEvent (ixn) |
| delegate | controller | AID, DelegationConfig | KeyEvent (dip/drt) |
| validate_event | verifier | KeyEvent, prior KeyState | ValidationResult |
| compute_key_state | verifier | List[KeyEvent] | KeyState |
| apply_event | verifier | prior KeyState, KeyEvent | KeyState |
| verify_receipt | verifier | Receipt, KeyEvent | bool |
| detect_equivocation | verifier | List[KeyEvent] at same (prefix, sn) | EquivocationResult |
| serialize | codec | KeyEvent | bytes (CESR) |
| deserialize | codec | bytes | KeyEvent |
| compute_said | codec | serialized event | SAID string |

### Invariants

- Sequence numbers MUST increment by exactly 1
- Rotated-in keys MUST match prior event's next key digests (`n` field)
- Signatures MUST verify against current signing keys (`k` field)
- Delegated events (dip/drt) MUST have anchoring seal in delegator's KEL
- SAID (`d` field) MUST be the digest of the serialized event with `d` field set to placeholder
- Inception event's `i` field MUST equal `d` for self-addressing AIDs

### Implementation Constraints

- **Deterministic:** Same inputs always produce same outputs
- **Stateless validation:** Validation functions do not mutate state
- **Side-effect free:** No I/O in core validation logic
- **CESR-native:** All cryptographic primitives use qualified encoding

### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Invalid signature | Event rejected | Return validation error; do not store |
| Sequence gap | Event cannot be applied | Escrow until missing events arrive |
| Wrong next key digest | Rotation rejected | Return validation error |
| Missing delegator seal | Delegation rejected | Escrow until delegator anchors seal |

---

## 2. Witness Service

**Purpose:** Receives events, validates them, stores first-seen version, generates receipts.

### Operations

| Operation | Description |
|-----------|-------------|
| receive_event | Validate structure, check first-seen, validate against KEL, store, generate receipt, broadcast |
| generate_receipt | Sign event SAID with witness keys |
| broadcast_receipt | Send receipt to other witnesses in pool |
| query_kel | Return stored KEL for a given AID prefix |
| query_receipts | Return all receipts for a given event SAID |
| kaace_consensus | Exchange receipts with witness pool, wait for threshold |

### receive_event Algorithm

1. Validate event structure (well-formed CESR, valid version string)
2. Check first-seen for this (prefix, sn):
   - If seen with same SAID: return AlreadySeen (idempotent)
   - If seen with different SAID: record duplicity, return Duplicitous
3. Validate event against prior key state from stored KEL
4. Store event as first-seen
5. Generate receipt (sign event SAID with witness key)
6. Broadcast receipt to other witnesses (KAACE)
7. Return Success with receipt

### KAACE Algorithm (Key Agreement, Aggregation, Consensus, Escrow)

1. Generate own receipt for the event
2. Broadcast receipt to all other witnesses in pool
3. Collect receipts from peers
4. Verify each peer receipt (signature check)
5. When receipt count >= threshold: consensus reached
6. If timeout before threshold: escrow event, retry

### Invariants

- First-seen rule: only one version of event at (prefix, sn) accepted
- Receipts MUST be signed by the witness's own key
- KAACE threshold MUST be met before confirming consensus
- Witness MUST NOT receipt an event that fails validation

### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Duplicity detected | Two versions at same (prefix, sn) | Record both, alert watchers, return Duplicitous |
| KAACE timeout | Consensus not reached | Escrow event, retry with backoff |
| Witness key compromised | Invalid receipts | Rotate witness key, re-receipt pending events |

---

## 3. Watcher Service

**Purpose:** Monitors KELs for duplicity, provides ambient verifiability.

### Operations

| Operation | Description |
|-----------|-------------|
| watch | Start monitoring an AID — initial KEL sync |
| receive_event | Check first-seen, store or record duplicity |
| query_duplicity | Return all versions seen for (prefix, sn) |
| sync_with_witnesses | Proactively pull KEL from known witnesses |
| alert_duplicity | Notify subscribers of duplicity detection |

### receive_event Algorithm

1. Check if prefix is in watched AIDs (skip if not)
2. Look up first-seen for (prefix, sn):
   - If none: store as first-seen, notify subscribers
   - If exists with same SAID: ignore (already seen)
   - If exists with different SAID: duplicity detected — store variant, alert
3. Validate event against stored KEL (optional — watcher may store without full validation)

### Watcher Mentoring

New watchers "inoculate" themselves by syncing with established watchers before accepting new events. This prevents late-arriving fake events from being recorded as first-seen.

1. New watcher identifies trusted established watchers
2. Syncs full KEL history from established watchers
3. Only after sync completes does it begin accepting live events
4. This establishes a first-seen baseline that resists retroactive forgery

### Invariants

- First-seen recording is immutable — cannot be overwritten
- All versions of a duplicitous event MUST be preserved as evidence
- Duplicity alerts MUST include both (or all) conflicting versions
- Watchers MUST NOT sign receipts (only witnesses receipt events)

### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Watcher out of sync | Stale key state | Re-sync with witnesses |
| False duplicity (network split) | Premature alert | Verify with multiple witnesses before alerting |
| Storage full | Cannot record new events | Archive old events, scale storage |

---

## 4. KERI Agent (KERIA)

**Purpose:** Orchestrates KERI operations for a controller — wallet, credential, and delegation management.

### Operations

| Operation | Description |
|-----------|-------------|
| create_aid | Incept new AID, submit to witnesses, collect receipts |
| rotate_keys | Create rotation event, submit to witnesses |
| issue_credential | Create ACDC, TEL issuance event, anchor in KEL |
| verify_credential | Verify issuer KEL, check signature, check revocation via TEL, check duplicity |
| resolve_oobi | Fetch OOBI endpoint, parse, cache, sync KEL |
| delegate_aid | Create delegated inception, coordinate with delegator |

### create_aid Flow

1. Generate key pairs (signing + next pre-rotation)
2. Build inception event via Event Log Engine
3. Submit inception to configured witnesses
4. Collect receipts (wait for witness threshold)
5. Store KEL locally
6. Return new AID

### verify_credential Flow

1. Retrieve issuer's KEL from watcher network
2. Compute issuer's current key state
3. Verify ACDC signature against issuer's keys
4. Query TEL for ACDC SAID — check revocation status
5. Check watcher for duplicity on issuer's AID
6. Return verification result (Valid | InvalidSignature | Revoked | Duplicitous)

### Invariants

- Private keys NEVER leave the agent (signing at the edge in Signify mode)
- All events MUST be receipted by witness threshold before confirmation
- OOBI resolution MUST NOT trust endpoints without KEL verification
- Multi-tenant agents MUST isolate tenant state completely

### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Witness pool unavailable | Cannot receipt events | Queue events, retry when witnesses return |
| Key compromise suspected | AID may be compromised | Immediate rotation using pre-rotated keys |
| OOBI resolution fails | Cannot discover endpoints | Try alternate OOBI URLs, fall back to cached |

---

## 5. ACDC Registry + TEL Manager

**Purpose:** Manages lifecycle of verifiable credentials via Transaction Event Logs.

### Operations

| Operation | Description |
|-----------|-------------|
| issue | Validate schema, create ACDC with SAID, sign, create TEL issuance event, anchor in KEL |
| revoke | Create TEL revocation event, anchor in KEL |
| verify_status | Query TEL to determine if ACDC is issued, revoked, or unknown |
| validate_schema | Check ACDC attributes against referenced schema |
| resolve_chain | Follow edge references to verify chained credentials |

### issue Flow

1. Validate attributes against schema
2. Build ACDC structure (v, d, i, s, a, e, r)
3. Compute SAID for ACDC (fill `d` field)
4. Sign ACDC with issuer keys
5. Create TEL issuance event (type: `iss`, sn: 0)
6. Compute SAID for TEL event
7. Anchor TEL event in issuer's KEL via interaction event with seal
8. Store ACDC + TEL event

### revoke Flow

1. Look up current TEL state for ACDC SAID
2. Create TEL revocation event (type: `rev`, sn: prior + 1)
3. Anchor in issuer's KEL via interaction event
4. Store TEL revocation event

### TEL Types

| Type | Code | Description |
|------|------|-------------|
| Backed issuance | `bis` | Issuance with backer (witness) receipts |
| Backed revocation | `brv` | Revocation with backer receipts |
| Backerless issuance | `iss` | Issuance without backers (issuer-only) |
| Backerless revocation | `rev` | Revocation without backers |

### Invariants

- ACDC SAID MUST be the digest of the serialized ACDC with `d` as placeholder
- TEL sequence numbers MUST increment by 1
- TEL issuance event MUST be anchored in issuer's KEL
- Schema validation MUST pass before issuance
- Revoked ACDCs MUST NOT be re-issued (new SAID required)

### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Schema validation fails | Issuance rejected | Return error with schema violations |
| KEL anchor fails | TEL event orphaned | Retry KEL interaction; do not store TEL until anchored |
| TEL out of sync | Stale revocation status | Re-sync TEL from issuer's witnesses |

---

## 6. Delegator Service (Additional)

**Purpose:** Manages delegated identifier lifecycle.

### Operations

- approve_delegation: Anchor delegation seal in delegator's KEL
- deny_delegation: Reject delegation request
- revoke_delegation: Create revocation event for delegated AID
- monitor_delegate: Watch delegated KEL for policy violations

### Invariants

- Delegated inception (dip) requires anchoring seal from delegator
- Delegated rotation (drt) requires anchoring seal from delegator
- Delegation depth MUST respect configured limits
- Revocation of delegation MUST propagate to all downstream delegates

---

## 7. OOBI Resolver (Additional)

**Purpose:** Discovers and caches endpoint information for AIDs.

### Operations

- resolve: Fetch OOBI URL, parse endpoint descriptors, cache
- discover_witnesses: Look up witness endpoints for an AID from its inception event
- refresh_cache: Re-resolve stale OOBI entries

### OOBI Formats

- `http://host:port/oobi/{aid}` — general endpoint discovery
- `http://host:port/oobi/{aid}/witness/{witness_aid}` — specific witness endpoint
- `http://host:port/.well-known/keri/oobi/{aid}` — well-known path

### Invariants

- OOBI resolution MUST NOT trust endpoints without verifying the KEL
- Cached endpoints MUST have TTL; stale entries re-resolved
- Failed resolutions MUST NOT evict valid cached entries

---

## 8. Judge + Jury Service (Additional)

**Purpose:** Evaluates duplicity evidence and provides judgments.

### Operations

- **Jury:** collect_evidence — query multiple watchers for all versions of an event
- **Jury:** deduplicate — remove duplicate evidence entries
- **Judge:** evaluate — verify cryptographic proofs, determine if duplicity exists
- **Judge:** render_judgment — Duplicitous (with evidence) or Trustworthy

### Algorithm

1. Jury queries watcher pool for all versions of event at (prefix, sn)
2. Jury deduplicates by SAID
3. Judge verifies each variant's cryptographic proof (signatures, SAID)
4. If multiple valid versions exist: Judgment = Duplicitous (with evidence)
5. If single valid version: Judgment = Trustworthy

### Invariants

- Evidence MUST come from multiple independent watchers
- Each evidence variant MUST be cryptographically verified before judgment
- Judgments MUST include full evidence chain for auditability
- Judge MUST NOT modify or discard evidence
