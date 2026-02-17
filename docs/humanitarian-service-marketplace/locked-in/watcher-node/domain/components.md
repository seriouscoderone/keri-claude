# Components — locked-in-watcher

> Domain components for the **watcher-node** stack in the **LockedIn** service (Humanitarian Service Marketplace).

## Domain Overview

This stack implements the **watcher-node** deployment pattern within the **LockedIn** service. It provides ambient verifiability for presence attestation events — monitoring watched AIDs for duplicity and serving as an independent verification point for proof requesters.

The watcher operates in two modes:
1. **On-demand response** — processes events and queries as they arrive via REST API
2. **Periodic audit** — syncs KELs from witnesses every 30 minutes via EventBridge-scheduled Lambda to catch gaps and detect cross-witness inconsistencies

**C2 Update Required:** stack.yaml specifies `python3.12` and WebSocket API. Domain recommends Rust Lambda and REST API + EventBridge schedule instead.

**Runtime:** Rust / keriox + cesride
**Rationale:** Lambda requires Rust (keripy LMDB/HIO incompatible). Stateless event validation and DynamoDB conditional writes for first-seen atomicity.

---

## Component Inventory

| Name | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| watcher-event-log-engine | event-log-engine | Event validation for correctness before first-seen recording | — |
| watcher-duplicity-service | watcher-service | First-seen tracking, duplicity detection, periodic witness sync | watcher-event-log-engine |
| watcher-oobi-resolver | oobi-resolver | Witness endpoint discovery and caching for periodic sync | — |

---

## Component Details

### watcher-event-log-engine

**Type:** event-log-engine
**Purpose:** Validates events for correctness before recording first-seen. Prevents storing invalid events as first-seen records.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| validate_event | key_event, prior_key_state | validation_result | Validate event — signatures, sequence, SAID |
| compute_key_state | prefix | key_state | Replay stored KEL to derive key state |
| apply_event | prior_key_state, key_event | key_state | Apply validated event (pure function) |
| deserialize_event | raw_bytes | key_event | Parse CESR-encoded bytes |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| kel_store | WatcherKELTable (DynamoDB) | KEL storage for watched AIDs, keyed by (prefix, sn) |

#### Invariants

- Sequence numbers MUST increment by exactly 1
- Rotated-in keys MUST match prior event's next key digests
- Signatures MUST verify against current signing keys at threshold
- SAID MUST equal digest of serialized event with `d` as placeholder
- Version string MUST be well-formed

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Invalid event from witness sync | Event not stored; watcher does not propagate | Log validation error; flag witness as potentially unreliable |
| Sequence gap in synced KEL | Incomplete key state | Request missing events from alternate witnesses |

#### Observability

**Metrics:** `events_validated_total`, `validation_failures_total`, `kel_depth_per_watched_aid`
**Logs:** `event_validated`, `validation_failed`
**Traces:** `validate_event_span`, `compute_key_state_span`

---

### watcher-duplicity-service

**Type:** watcher-service
**Purpose:** Monitors watched AIDs for duplicity by maintaining first-seen records and detecting conflicting events. Operates in on-demand response mode and periodic 30-minute witness audit mode.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| receive_event | key_event | receive_result | Process event — first-seen check, store or record duplicity |
| query_duplicity | prefix, sn | duplicity_evidence | Return all versions seen for (prefix, sn) |
| query_kel | prefix | key_event_log | Return first-seen KEL for an AID |
| sync_with_witnesses | watched_aid_list, witness_endpoints | sync_result | Periodic audit — pull KELs from witnesses, detect gaps/inconsistencies |
| alert_duplicity | duplicity_evidence | alert_result | Publish evidence to SNS topic |

#### receive_event Algorithm

1. Check if prefix is in watched AIDs (public watcher — accept any AID)
2. Attempt first-seen write via DynamoDB conditional PutItem (`attribute_not_exists(event_said)`)
   - Write succeeds: first-seen recorded, proceed to validate via Event Log Engine
   - `ConditionalCheckFailedException`: read existing, compare SAIDs
     - Same SAID: return `AlreadySeen`
     - Different SAID: duplicity detected
3. If duplicity: store variant in WatcherDuplicityTable, publish alert to SNS
4. If first-seen and valid: store in WatcherKELTable
5. Return result

#### sync_with_witnesses Algorithm (Every 30 Minutes)

1. For each watched AID with known witness endpoints:
2. Pull latest KEL from each witness via OOBI-resolved endpoints
3. Compare witness KELs against stored first-seen records
4. If witness has events we don't have: process as `receive_event` (filling gaps)
5. If witnesses disagree with each other: flag as potential duplicity
6. If witnesses disagree with our first-seen: record as duplicity evidence
7. Log sync results; publish discrepancies

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| kel_store | WatcherKELTable (DynamoDB) | First-seen event storage per AID |
| first_seen_index | WatcherFirstSeenTable (DynamoDB) | Atomic first-seen via conditional writes, TTL for auto-expiry (365 days) |
| duplicity_evidence | WatcherDuplicityTable (DynamoDB) | All versions of duplicitous events |
| duplicity_alerts | WatcherAlertTopic (SNS) | Real-time duplicity notifications |

#### Invariants

- First-seen recording is immutable — cannot be overwritten
- All versions of a duplicitous event MUST be preserved as evidence
- Duplicity alerts MUST include both (or all) conflicting versions with SAIDs
- Watchers MUST NOT sign receipts — only witnesses receipt events
- Periodic sync MUST compare witness KELs against stored first-seen records
- Sync discrepancies between witnesses MUST be treated as potential duplicity
- First-seen policy is strict — late duplicates are rejected and flagged

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Duplicity detected | AID trustworthiness degraded | Record all variants; publish alert; return Duplicitous |
| Witness unreachable during sync | Incomplete audit | Log warning; retry on next 30-minute sync; alert if persistent |
| False duplicity (network partition) | Premature alert | Verify with multiple witnesses before confirming |
| Storage approaching retention | Old records auto-expire | TTL handles cleanup automatically |

#### Observability

**Metrics:** `events_received_total`, `first_seen_stored_total`, `duplicity_detected_total`, `sync_cycles_completed_total`, `sync_discrepancies_found_total`, `alerts_published_total`, `watched_aids_count`
**Logs:** `event_received`, `first_seen_stored`, `duplicity_detected`, `sync_started`, `sync_completed`, `sync_discrepancy_found`, `alert_published`
**Traces:** `receive_event_span`, `sync_with_witnesses_span`, `alert_duplicity_span`

---

### watcher-oobi-resolver

**Type:** oobi-resolver
**Purpose:** Discovers and caches witness endpoint information for periodic KEL sync.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| resolve | oobi_url | resolved_endpoint | Fetch OOBI URL, parse, verify against KEL, cache |
| discover_witnesses | aid_prefix | witness_endpoints | Look up witness endpoints from inception event's `b` field |
| refresh_cache | stale_entries | refresh_result | Re-resolve stale OOBI entries on sync failure |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| oobi_cache | WatcherKELTable (DynamoDB) | OOBI resolution cache alongside KEL data, TTL-managed |

#### Invariants

- OOBI resolution MUST NOT trust endpoints without verifying the KEL
- Cached endpoints MUST have TTL; stale entries re-resolved on next sync
- Failed resolutions MUST NOT evict valid cached entries

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| OOBI URL unreachable | Cannot discover witness endpoint | Use cached endpoint; retry on next sync |
| OOBI returns invalid KEL | Witness endpoint untrusted | Reject resolution; try alternate URLs |

#### Observability

**Metrics:** `oobi_resolutions_total`, `oobi_resolution_failures_total`, `cache_hits_total`, `cache_misses_total`
**Logs:** `oobi_resolved`, `oobi_resolution_failed`, `cache_refreshed`
**Traces:** `resolve_oobi_span`

---

## Component Interaction Diagram

```
                              EventBridge Schedule (every 30 min)
                                        |
                                        v
                              watcher-duplicity-service
                                    sync_with_witnesses()
                                        |
               +------------------------+------------------------+
               |                                                 |
               v                                                 v
    watcher-oobi-resolver                              watcher-event-log-engine
    discover_witnesses()                               validate_event()
               |                                                 |
               v                                                 v
    [HTTP to witness OOBI endpoints]                   WatcherKELTable (read)
               |
               v
    [HTTP to witness KEL endpoints]
               |
               v
    watcher-duplicity-service
    receive_event() for each synced event
               |
    +----------+-----------+
    |                      |
    v                      v
WatcherFirstSeenTable   WatcherDuplicityTable
(conditional write)     (if duplicity)
                           |
                           v
                    WatcherAlertTopic (SNS)

--- On-Demand Path ---

REST API Request
    |
    v
watcher-duplicity-service
    receive_event() / query_kel() / query_duplicity()
    |
    v
watcher-event-log-engine (for validation)
    |
    v
DynamoDB tables (read/write)
```

---

## Cross-Cutting Concerns

### Error Propagation
- Event Log Engine validation failures in on-demand mode return errors to the caller
- Validation failures during periodic sync are logged but do not halt the sync — the watcher continues to the next AID
- SNS delivery failures do not block event processing — alerts are best-effort with DLQ for retry

### State Consistency
- First-seen atomicity guaranteed by DynamoDB conditional writes (`attribute_not_exists(event_said)`)
- KEL and duplicity evidence stores are append-only
- TTL on WatcherFirstSeenTable ensures automatic cleanup after 365-day retention
- Point-in-time recovery enabled for all tables

### Security Boundaries
- The watcher has NO signing keys — it does not generate receipts (only witnesses do)
- All events from witnesses are untrusted input — fully validated before storing
- The watcher does not have access to any controller's private keys
- Duplicity evidence is stored immutably — cannot be modified or deleted by any party
