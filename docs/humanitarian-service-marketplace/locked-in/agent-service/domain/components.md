# Components — locked-in-agent

> Domain components for the **agent-service** stack in the **LockedIn** service (Humanitarian Service Marketplace).

## Domain Overview

This stack implements the **agent-service** deployment pattern within the **LockedIn** service. It is the central orchestrator — managing user AIDs, submitting presence attestation events to witnesses, coordinating with the ACDC registry for credential operations, and handling the freemium business logic (witness tier gating).

This is NOT KERIA. It is a ground-up serverless KERI agent built for Lambda's request-response model. KERIA depends on LMDB and HIO which require persistent processes.

**Key design decision:** ACDC issuance and revocation are delegated to the separate `locked-in-acdc-registry` stack. The agent stores credential wallet references (ACDC SAIDs), not full ACDC documents.

**Runtime:** Rust / keriox + cesride
**Rationale:** Lambda requires Rust. <50ms cold starts on Graviton. Key material encrypted in Secrets Manager via KMS.

---

## Component Inventory

| Name | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| agent-event-log-engine | event-log-engine | Full KEL management for user AIDs (inception, rotation, interaction) | — |
| agent-keri-service | keri-agent | Multi-tenant agent orchestrating AID lifecycle, witness coordination, credential wallet | agent-event-log-engine |
| agent-oobi-resolver | oobi-resolver | Witness, watcher, and peer endpoint discovery | — |

---

## Component Details

### agent-event-log-engine

**Type:** event-log-engine
**Purpose:** Full KEL management for all managed AIDs. Unlike the witness/watcher engines which only validate incoming events, the agent engine also *creates* events (inception, rotation, interaction).

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| incept | inception_config | key_event (icp) | Create inception event with key pairs |
| rotate | aid_prefix, rotation_config | key_event (rot) | Rotate keys using pre-committed digests |
| interact | aid_prefix, seal_data | key_event (ixn) | Create interaction for seal anchoring |
| validate_event | key_event, prior_key_state | validation_result | Validate incoming events |
| compute_key_state | prefix | key_state | Replay KEL to derive current state |
| deserialize_event | raw_bytes | key_event | Parse CESR bytes |
| serialize_event | key_event | raw_bytes | Serialize for witness transmission |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| kel_store | AgentKELTable (DynamoDB) | Per-tenant event logs, keyed by (prefix, sn), GSI on SAID |

#### Invariants

- Sequence numbers MUST increment by exactly 1
- Rotated-in keys MUST match prior event's next key digests
- Signatures MUST verify against current signing keys at threshold
- SAID MUST equal digest of serialized event with `d` as placeholder
- All events MUST be signed before submission to witnesses

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Key pair generation failure | AID cannot be created | Return error; retry with different entropy |
| Sequence gap in stored KEL | Cannot create new events | Re-sync KEL from witnesses |

---

### agent-keri-service

**Type:** keri-agent
**Purpose:** Multi-tenant KERI agent orchestrating AID lifecycle, witness coordination, and credential wallet management. Each LockedIn user gets an isolated agent tenant.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| provision_agent | provisioning_request | agent_tenant | Create tenant, generate keys, store in Secrets Manager, create AID |
| create_aid | tenant_id, inception_config | new_aid | Incept AID, submit to witnesses, collect receipts |
| rotate_keys | tenant_id, aid_prefix, rotation_config | rotation_result | Rotate keys, submit to witnesses, update Secrets Manager |
| submit_presence_event | tenant_id, presence_event | submission_result | Submit signed presence attestation to witnesses per tier |
| request_credential | tenant_id, credential_request | credential_reference | Request ACDC from registry stack, store wallet reference |
| present_credential | tenant_id, acdc_said, disclosure_scope | presentation | Package selective disclosure proof from wallet reference |
| receive_message | keri_message | message_result | Process external KERI protocol messages |

#### provision_agent Flow

1. Validate provisioning request
2. Generate key pairs (signing + next pre-rotation) using cesride Salter
3. Create Secrets Manager entry at `locked-in-agent/keys/{tenant_id}`
4. Encrypt key material with KMS envelope encryption
5. Create AID via Event Log Engine `incept()`
6. Submit inception event to witnesses via OOBI Resolver endpoints
7. Collect receipts via SQS async processing (wait for witness threshold)
8. Store agent tenant metadata in AgentStateTable
9. Return tenant with AID prefix

#### submit_presence_event Flow

1. Look up tenant — verify subscription tier
2. Determine witness list based on tier:
   - Free: 1 witness (LockedIn only)
   - Paid: 3 witnesses (LockedIn + 2 ecosystem)
   - BYOW: user-configured witnesses
3. Retrieve signing key from Secrets Manager (decrypt via KMS)
4. Sign the presence event via Event Log Engine
5. Submit to each designated witness
6. Queue receipt collection in SQS
7. Return submission result (witnesses contacted; receipts pending)

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| agent_state | AgentStateTable (DynamoDB) | Tenant index, AID metadata, config, subscription tier |
| kel_store | AgentKELTable (DynamoDB) | Event logs for all managed AIDs |
| wallet | AgentWalletTable (DynamoDB) | Credential wallet — ACDC SAID references |
| key_material | AgentKeySecret (Secrets Manager + KMS) | Encrypted private keys per tenant |
| async_operations | AgentAsyncQueue (SQS) | Async processing — receipts, credential requests |

#### Invariants

- Private keys MUST be encrypted at rest via KMS envelope encryption
- Private keys MUST NOT leave the agent service — signing happens server-side
- All events MUST be receipted by witness threshold before confirmation
- Tenant state MUST be completely isolated — no cross-tenant data access
- Presence events MUST be submitted to witnesses matching the user's subscription tier
- Free tier: 1 witness (LockedIn only). Paid tier: 3 witnesses (LockedIn + 2 ecosystem)
- Credential wallet stores references to registry ACDCs, not full ACDC documents
- Agent provisioning MUST create Secrets Manager entry before creating AID

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Witness pool unavailable | Cannot receipt events; attestations queued | Queue in SQS; retry when witnesses return; DLQ for persistent failures |
| Key compromise suspected | User's AID may be compromised | Immediate rotation using pre-rotated keys; alert user |
| Registry stack unavailable | Cannot issue/retrieve credentials | Queue requests in SQS; retry with backoff |
| Secrets Manager throttling | Cannot access key material | Retry with backoff; cache in Lambda memory for request duration only |

#### Observability

**Metrics:**
- `agents_provisioned_total`, `aids_created_total`, `key_rotations_total`
- `presence_events_submitted_total` (by tier: free, paid, byow)
- `credential_requests_total`, `credential_presentations_total`
- `witness_receipt_latency_ms` (histogram)
- `async_queue_depth`, `dlq_messages_total`

**Logs:**
- `agent_provisioned`, `aid_created`, `key_rotated`
- `presence_event_submitted`, `witness_receipts_collected`
- `credential_requested`, `credential_presented`, `message_received`

**Traces:**
- `provision_agent_span`, `create_aid_span`
- `submit_presence_event_span`, `request_credential_span`, `present_credential_span`

---

### agent-oobi-resolver

**Type:** oobi-resolver
**Purpose:** Discovers and caches endpoint information for witnesses, watchers, and peer agents.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| resolve | oobi_url | resolved_endpoint | Fetch, parse, verify, cache OOBI |
| discover_witnesses | witness_oobis | witness_endpoints | Resolve witness pool endpoints |
| discover_watchers | watcher_oobis | watcher_endpoints | Resolve watcher endpoints |
| refresh_cache | stale_entries | refresh_result | Re-resolve stale entries |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| oobi_cache | AgentStateTable (DynamoDB) | OOBI cache with resource_type "oobi", TTL-managed |

#### Invariants

- OOBI resolution MUST NOT trust endpoints without verifying the KEL
- Cached endpoints MUST have TTL; stale entries re-resolved on demand
- Failed resolutions MUST NOT evict valid cached entries
- Witness and watcher OOBIs from stack configuration are pre-resolved at deploy

---

## Component Interaction Diagram

```
LockedIn App (signify-ts)
    |
    | POST /boot (provisioning) or POST /agent/{aid}/events (presence)
    v
agent-keri-service
    |
    |--- incept/rotate/interact ---> agent-event-log-engine
    |                                    |
    |                                    |--- read/write ---> AgentKELTable
    |
    |--- get signing key ------------> AgentKeySecret (Secrets Manager + KMS)
    |
    |--- discover_witnesses ---------> agent-oobi-resolver
    |                                    |
    |                                    |--- cache ---------> AgentStateTable
    |
    |--- submit to witnesses --------> [HTTP to witness-pool API]
    |
    |--- queue receipt collection ---> AgentAsyncQueue (SQS)
    |                                    |
    |                                    v
    |                               AgentAsyncFunction (Lambda)
    |                                    |
    |                                    |--- collect receipts from witnesses
    |                                    |--- store receipts in AgentKELTable
    |
    |--- request credential ---------> [HTTP to acdc-registry API]
    |
    |--- store wallet reference -----> AgentWalletTable
    |
    |--- lifecycle events -----------> AgentEventBus (EventBridge)
```

---

## Cross-Cutting Concerns

### Error Propagation
- Witness submission failures are absorbed by SQS — events are queued for retry
- Secrets Manager failures are fatal for the current request but do not affect other tenants
- Registry unavailability is handled via SQS queuing — credentials are eventually consistent
- DLQ captures persistent failures for operations alerting

### State Consistency
- Each tenant's state is isolated via the (tenant_id, resource_type) key schema
- KEL is append-only — no updates or deletes
- Credential wallet stores SAID references, not ACDC documents — registry is source of truth
- Key material changes (rotation) use Secrets Manager versioning — rollback possible

### Security Boundaries
- Private keys are the most sensitive material — encrypted in Secrets Manager via KMS
- Keys are decrypted only in Lambda memory for the duration of a signing operation
- Tenant isolation enforced at the DynamoDB key schema level — no shared partition keys
- The agent never exposes private keys to the LockedIn app or to witnesses
- OOBI resolution verifies KEL before trusting any endpoint
