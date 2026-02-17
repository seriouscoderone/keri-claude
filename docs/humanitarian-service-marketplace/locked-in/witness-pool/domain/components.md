# Components — locked-in-witness-pool

> Domain components for the **witness-pool** stack in the **LockedIn** service (Humanitarian Service Marketplace).

## Domain Overview

This stack implements the **witness-pool** deployment pattern within the **LockedIn** service. It belongs to the **Humanitarian Service Marketplace** ecosystem and provides event receipting for presence attestation events — the core trust anchor for LockedIn's cryptographic proof-of-presence.

The witness pool is **public** — any controller can submit events for receipting. Business-tier gating (free vs. paid witness count) is enforced at the agent service layer, not at the witness protocol layer. This enables ecosystem interoperability and third-party witness marketplace participation.

**Runtime:** Rust / keriox + cesride
**Rationale:** Serverless Lambda requires Rust — keripy's LMDB and HIO are incompatible with Lambda's ephemeral filesystem and request-response model. Rust compiles to custom runtime (provided.al2023, arm64/Graviton) with <50ms cold starts.

---

## Component Inventory

| Name | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| witness-event-log-engine | event-log-engine | Deterministic key state machine for validating events before receipting | — |
| witness-receipting-service | witness-service | First-seen enforcement, receipt generation, KAACE consensus | witness-event-log-engine |

---

## Component Details

### witness-event-log-engine

**Type:** event-log-engine
**Purpose:** Deterministic key state machine for validating incoming events before witness receipting. Replays KEL to compute current key state, validates signatures, enforces sequence monotonicity, and detects equivocation.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| validate_event | key_event, prior_key_state | validation_result | Validate event against prior key state — signatures, sequence, next key digest, SAID |
| compute_key_state | prefix | key_state | Replay stored KEL to derive current key state |
| apply_event | prior_key_state, key_event | key_state | Apply validated event to produce updated key state (pure function) |
| detect_equivocation | events_at_same_sn | equivocation_result | Check for different SAIDs at same (prefix, sn) |
| deserialize_event | raw_bytes | key_event | Parse CESR-encoded bytes into structured key event |
| compute_said | serialized_event | said | Compute SAID by digesting event with d field as placeholder |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| kel_store | WitnessKELTable (DynamoDB) | Append-only event log per AID prefix, keyed by (prefix, sn), GSI on SAID |

#### Invariants

These protocol rules MUST be enforced by this component. Invariant violations indicate implementation bugs or protocol attacks.

- Sequence numbers MUST increment by exactly 1 — no gaps, no duplicates
- Rotated-in keys MUST match prior event's next key digests (`n` field)
- Signatures MUST verify against current signing keys (`k` field) at signing threshold (`kt`); rotation requires DUAL threshold — current `kt` AND prior `nt`
- SAID (`d` field) MUST equal the digest of the serialized event with `d` set to placeholder
- Inception event `i` field MUST equal `d` for self-addressing AIDs
- Delegated events (dip/drt) MUST have anchoring seal in delegator's KEL
- Version string MUST be well-formed (`KERIvvSSSSSSSSSS_`)
- Event type code MUST be one of: `icp`, `rot`, `ixn`, `dip`, `drt`

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Invalid signature | Event rejected — not stored, not receipted | Return validation error to controller |
| Sequence number gap | Event cannot be validated without prior key state | Escrow event; request missing events from controller |
| Wrong next key digest | Rotation rejected — potential key compromise attempt | Return validation error; do not update key state |
| Equivocation detected | Duplicity — controller may be compromised | Record both versions; alert watcher network via EventBridge |

#### Observability

**Metrics:**
- `events_validated_total` — count of events passing validation
- `validation_failures_total` — count of events failing validation, by reason
- `equivocations_detected_total` — count of equivocation detections
- `kel_depth_per_aid` — histogram of KEL depth across AIDs
- `event_deserialization_errors_total` — count of malformed event submissions

**Logs:**
- `event_received` — raw event received, before validation
- `validation_succeeded` — event passed all checks
- `validation_failed` — event failed, with reason code
- `equivocation_detected` — two events at same (prefix, sn) with different SAIDs

**Traces:**
- `validate_event_span` — full validation pipeline
- `compute_key_state_span` — KEL replay for key state derivation
- `deserialize_event_span` — CESR parsing

---

### witness-receipting-service

**Type:** witness-service
**Purpose:** Receives events from any controller (public witness), applies the first-seen rule, validates via the Event Log Engine, generates receipts by signing the event SAID with the witness's own key, and participates in KAACE consensus with peer witnesses.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| receive_event | key_event | receipt_result | Primary entry point — validate, first-seen check, store, receipt, broadcast |
| generate_receipt | event_said, witness_signing_key | receipt | Sign event SAID with witness key |
| broadcast_receipt | receipt, peer_witness_endpoints | broadcast_result | Send receipt to peers for KAACE consensus |
| query_kel | prefix | key_event_log | Return stored KEL for an AID prefix |
| query_receipts | event_said | receipts | Return all receipts for an event SAID |
| serve_oobi | witness_aid | oobi_response | Serve witness OOBI endpoint for discovery |

#### receive_event Algorithm

1. Validate event structure (well-formed CESR, valid version string)
2. Check first-seen for this (prefix, sn) via DynamoDB conditional write:
   - If write succeeds: this is first-seen — proceed
   - If `ConditionalCheckFailedException`: read existing event, compare SAIDs
     - Same SAID: return `AlreadySeen` (idempotent)
     - Different SAID: record duplicity, return `Duplicitous`
3. Validate event against prior key state via Event Log Engine
4. If validation fails: remove first-seen record, return `ValidationError`
5. Generate receipt (sign event SAID with witness key)
6. Broadcast receipt to peer witnesses via EventBridge
7. Return `Success` with receipt

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| kel_store | WitnessKELTable (DynamoDB) | Append-only event log; first-seen enforced via conditional write on (prefix, sn) |
| receipt_store | WitnessReceiptTable (DynamoDB) | Receipts indexed by (event_said, witness_aid) |
| receipt_notifications | WitnessEventBus (EventBridge) | Receipt events for consumers (peers, watchers, controllers) |

#### Invariants

- First-seen rule: only ONE version of an event at (prefix, sn) is accepted — enforced by DynamoDB conditional write
- Witness AIDs MUST be non-transferable (`B` prefix for Ed25519) — no KEL rotation
- Receipts use type `rct` — witness signs the RECEIPTED EVENT's serialization, not the receipt body
- Receipt `d` field is the SAID of the receipted event, not the receipt itself
- Witness MUST NOT receipt an event that fails Event Log Engine validation
- KAWA fault model: given N witnesses, tally M, at most F*=N-M unavailable and F<M duplicitous — at most one sufficient agreement can exist
- Duplicate event with same SAID at same (prefix, sn) returns `AlreadySeen` (idempotent)
- Duplicate event with different SAID at same (prefix, sn) returns `Duplicitous` and records both versions
- Witness MUST serve its OOBI endpoint for discovery

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Duplicity detected | Controller may be compromised; trust degraded | Record both versions; publish duplicity event to EventBridge |
| KAACE timeout | Consensus not reached; controller cannot confirm | Escrow receipt; retry with exponential backoff |
| Witness key compromise | Invalid receipts generated | Rotate witness key; re-receipt pending events |
| DynamoDB conditional write failure | First-seen already recorded | Read existing; compare SAIDs; return AlreadySeen or Duplicitous |

#### Observability

**Metrics:**
- `events_receipted_total` — successfully receipted events
- `receipts_generated_total` — receipts signed
- `first_seen_conflicts_total` — conditional write failures (duplicates or duplicity)
- `duplicity_events_total` — confirmed duplicity detections
- `kaace_consensus_reached_total` — successful KAACE completions
- `kaace_timeouts_total` — KAACE failures
- `oobi_queries_total` — OOBI discovery requests

**Logs:**
- `event_received` — event submitted for receipting
- `first_seen_stored` — first-seen recorded successfully
- `receipt_generated` — receipt signed
- `receipt_broadcast` — receipt sent to peers
- `duplicity_detected` — equivocation found
- `kaace_consensus_reached` — threshold met
- `kaace_timeout` — threshold not met within window

**Traces:**
- `receive_event_span` — full receive pipeline
- `generate_receipt_span` — signing operation
- `broadcast_receipt_span` — peer notification
- `kaace_consensus_span` — end-to-end consensus

---

## Component Interaction Diagram

```
Controller
    |
    | POST /events (key_event)
    v
witness-receipting-service
    |
    |--- validate_event() ---> witness-event-log-engine
    |                              |
    |                              |--- read KEL ---> WitnessKELTable (DynamoDB)
    |                              |
    |                              |<-- validation_result
    |
    |--- conditional write ------> WitnessKELTable (DynamoDB, first-seen)
    |
    |--- generate_receipt() -----> (sign event SAID with witness key)
    |
    |--- store receipt ----------> WitnessReceiptTable (DynamoDB)
    |
    |--- broadcast_receipt() ----> WitnessEventBus (EventBridge)
    |                                  |
    |                                  +--> peer witnesses
    |                                  +--> watcher-node (subscriber)
    |
    |<-- Success(receipt)
    |
    v
Controller
```

---

## Cross-Cutting Concerns

### Error Propagation
- Event Log Engine validation failures propagate to the Receipting Service as `ValidationError` — the event is not stored and no receipt is generated
- DynamoDB conditional write failures are caught and classified as `AlreadySeen` or `Duplicitous` by reading the existing record
- EventBridge delivery failures do not block the receipt response to the controller — receipts are stored locally first, broadcast is best-effort with retry

### State Consistency
- First-seen atomicity is guaranteed by DynamoDB conditional writes (`attribute_not_exists(sn)` on the partition key)
- KEL and receipt stores are append-only — no updates or deletes
- Point-in-time recovery enabled on all DynamoDB tables for disaster recovery

### Security Boundaries
- The witness's own signing key is the only sensitive material — stored as a Lambda environment variable (from Secrets Manager in production)
- Controller events are untrusted input — fully validated before any state mutation
- The witness never has access to controller private keys — it only receipts events
