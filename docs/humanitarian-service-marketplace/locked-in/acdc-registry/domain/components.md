# Components — locked-in-acdc-registry

> Domain components for the **acdc-registry** stack in the **LockedIn** service (Humanitarian Service Marketplace).

## Domain Overview

This stack implements the **acdc-registry** deployment pattern within the **LockedIn** service. It is the authoritative source of truth for presence attestation credentials — managing the full ACDC lifecycle from issuance through revocation, with backed TEL events (witness-receipted) and selective disclosure support.

The registry receives credential requests from the agent-service stack and returns issued ACDCs. It does not manage user AIDs — that responsibility belongs to the agent.

**C2 Update Required:** stack.yaml specifies `python3.12`. Domain recommends Rust Lambda (keripy LMDB/HIO incompatible with Lambda).

**Runtime:** Rust / keriox + cesride
**Rationale:** Lambda requires Rust. keriox includes teliox for TEL support. S3 for immutable ACDC document storage.

---

## Component Inventory

| Name | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| registry-event-log-engine | event-log-engine | Validates issuer KEL for TEL seal anchoring | — |
| registry-acdc-tel-manager | acdc-registry | ACDC lifecycle — issuance, revocation, status, selective disclosure | registry-event-log-engine |
| registry-oobi-resolver | oobi-resolver | Issuer, verifier, and backer endpoint discovery | — |

---

## Component Details

### registry-event-log-engine

**Type:** event-log-engine
**Purpose:** Validates issuer KEL for anchoring TEL events. Verifies that TEL issuance/revocation events are properly sealed in the issuer's KEL.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| validate_event | key_event, prior_key_state | validation_result | Validate issuer event |
| compute_key_state | prefix | key_state | Replay issuer KEL for key state |
| verify_seal_anchor | tel_event_said, issuer_prefix | anchor_result | Verify TEL event is anchored in issuer KEL |
| deserialize_event | raw_bytes | key_event | Parse CESR bytes |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| issuer_kel_cache | ACDCTable (DynamoDB) | Cached issuer KEL alongside ACDC records |

#### Invariants

- Issuer signatures MUST verify against issuer's current signing keys
- TEL anchoring seals MUST reference valid interaction events in issuer KEL
- Issuer key state MUST be current — stale key state may accept revoked keys

---

### registry-acdc-tel-manager

**Type:** acdc-registry
**Purpose:** Manages presence attestation credentials via Transaction Event Logs. Handles backed issuance/revocation, schema validation, status queries, and selective disclosure.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| issue | issuer_aid, schema_said, attributes, edge_references | acdc_with_said | Issue ACDC with schema validation, TEL creation, KEL anchoring |
| revoke | acdc_said, revocation_reason | revocation_result | Revoke ACDC with backed TEL event |
| verify_status | acdc_said | credential_status | Query TEL: Issued / Revoked / Unknown |
| validate_schema | schema_said, attributes | schema_validation_result | Validate attributes against schema |
| package_disclosure | acdc_said, disclosure_scope | disclosure_proof | Package selective disclosure for time/location window |
| resolve_chain | acdc_said | chain_verification_result | Verify chained credential references |

#### issue Flow

1. Validate attributes against presence_attestation schema (`validate_schema`)
2. Build ACDC structure: `v`, `d`, `i`, `s`, `a` (presence data), `e` (edge to service_commitment if applicable), `r` (disclosure rules)
3. Compute SAID for ACDC (fill `d` field with digest of serialized ACDC with `d` as placeholder)
4. Create TEL update event (type: `upd`, ta=ACDC SAID, ts=`0Missued`) or blindable update (`bup` with BLID)
5. Compute SAID for TEL event
6. Anchor TEL event in issuer's KEL via interaction event with SealTrans `[s, d]` (coordinate with agent-service)
7. Note: TEL events do NOT need own signatures — KEL seal is cryptographically equivalent
8. Store ACDC document in S3 (immutable, versioned)
9. Store ACDC metadata and TEL event in DynamoDB
10. Publish issuance notification to EventBridge
11. Return ACDC with SAID

#### revoke Flow

1. Look up current TEL state for ACDC SAID — verify it's currently `0Missued`
2. Create TEL update event (type: `upd`, ta=ACDC SAID, ts=`Yrevoked`, n=prior+1) or `bup` with new BLID
3. Anchor in issuer's KEL via interaction event with SealTrans `[s, d]` (coordinate with agent-service)
4. Store TEL revocation event in DynamoDB
5. Publish revocation notification to EventBridge
6. Return revocation result

#### Selective Disclosure for Presence Attestations

LockedIn's core value is **selective disclosure** — users reveal only a specific time/location window from their continuous presence record:

1. User selects a time/location window in the app
2. App requests disclosure package from registry via agent
3. Registry builds a selective disclosure proof containing ONLY:
   - Attestation data for the requested window
   - Witness AIDs and trust tier
   - SAID chain back to the user's KEL
4. All other attestation data remains hidden
5. Proof requester can verify the disclosed data without seeing anything else

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| acdc_metadata | ACDCTable (DynamoDB) | ACDC metadata by SAID, GSIs on issuer_aid and schema_said |
| tel_store | TELTable (DynamoDB) | TEL per ACDC, keyed by (acdc_said, sn) |
| acdc_documents | ACDCDocumentBucket (S3) | Immutable ACDC documents, versioned, encrypted, lifecycle-managed |
| lifecycle_events | RegistryEventBus (EventBridge) | Issuance/revocation notifications |

#### Invariants

- ACDC fields MUST appear in order: `[v, t, d, u, i, rd, s, a, A, e, r]`
- ACDC required fields: `[v, d, i, s]`; `a` and `A` are mutually exclusive
- ACDC SAID (`d`) MUST equal digest of serialized ACDC with `d` as placeholder
- ACDC `rd` MUST equal rip `d` (REGID) — binds credential to its registry
- Registry inception (`rip`) MUST be sealed in KEL before any ACDC references it
- All TEL events MUST be sealed in issuer's KEL via SealTrans `[s, d]`
- TEL events do NOT need own signatures — KEL seal is cryptographically equivalent
- TEL sequence numbers MUST increment monotonically from 0
- Non-blindable (`upd`): `ta` MUST equal ACDC `d`; `ts` MUST be CESR-encoded state
- Blindable (`bup`): `b` MUST equal BLID of blinded attribute block
- Schema validation MUST pass before issuance
- Revoked ACDCs MUST NOT be re-issued — new ACDC with new SAID required
- Backed TEL: backer AIDs MUST be non-transferable; backer threshold MUST be met
- ACDC documents in S3 are immutable — never modified after initial write
- Selective disclosure MUST NOT reveal attributes outside the requested scope

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| Schema validation fails | Issuance rejected | Return error with specific schema violations |
| KEL anchor fails | TEL event orphaned | Retry; do not store TEL until anchored |
| TEL out of sync | Stale revocation status | Re-sync TEL from issuer's witnesses |
| S3 write failure | ACDC document not stored | Retry with backoff; no success until confirmed |
| Witness receipts unavailable | TEL not confirmed | Queue for async collection; return pending |

#### Observability

**Metrics:**
- `credentials_issued_total`, `credentials_revoked_total`
- `schema_validations_total`, `schema_validation_failures_total`
- `status_queries_total`, `disclosure_packages_total`, `chain_resolutions_total`
- `tel_depth_per_acdc`

**Logs:**
- `credential_issued`, `credential_revoked`
- `schema_validated`, `schema_validation_failed`
- `status_queried`, `disclosure_packaged`, `chain_resolved`, `kel_anchor_verified`

**Traces:**
- `issue_credential_span`, `revoke_credential_span`
- `verify_status_span`, `package_disclosure_span`, `resolve_chain_span`

---

### registry-oobi-resolver

**Type:** oobi-resolver
**Purpose:** Discovers issuer, verifier, and backer endpoints for TEL operations.

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| resolve | oobi_url | resolved_endpoint | Fetch, parse, verify, cache OOBI |
| discover_backers | backer_aids | backer_endpoints | Resolve witness endpoints for backed TEL |
| refresh_cache | stale_entries | refresh_result | Re-resolve stale entries |

#### Invariants

- OOBI resolution MUST NOT trust endpoints without KEL verification
- Cached endpoints MUST have TTL
- Failed resolutions MUST NOT evict valid cached entries

---

## Component Interaction Diagram

```
agent-service (via REST API)
    |
    | POST /credentials (issuance request)
    v
registry-acdc-tel-manager
    |
    |--- validate_schema() ---------> (schema validation logic)
    |
    |--- build ACDC, compute SAID
    |
    |--- sign ACDC (issuer keys from agent-service)
    |
    |--- create TEL event (bis, sn=0)
    |
    |--- verify_seal_anchor() ------> registry-event-log-engine
    |                                      |
    |                                      |--- compute_key_state() --> ACDCTable (issuer KEL cache)
    |
    |--- store ACDC document --------> ACDCDocumentBucket (S3)
    |
    |--- store metadata + TEL -------> ACDCTable + TELTable (DynamoDB)
    |
    |--- discover_backers() ---------> registry-oobi-resolver
    |                                      |
    |                                      |--- cache ---------> ACDCTable
    |
    |--- collect backer receipts ----> [HTTP to witness-pool API]
    |
    |--- publish lifecycle event ----> RegistryEventBus (EventBridge)
    |
    |<-- return ACDC with SAID
    v
agent-service
```

---

## Cross-Cutting Concerns

### Error Propagation
- Schema validation failures are immediate rejects — no partial state created
- S3 write failures prevent success response — DynamoDB metadata and TEL event are only stored after S3 confirms
- KEL anchor failures escrow the TEL event — registry retries coordination with agent-service
- EventBridge delivery failures do not block the issuance response — notifications are best-effort

### State Consistency
- ACDC documents in S3 are immutable — write-once, never modified
- TEL is append-only — issuance at sn=0, revocation at sn=1, no other mutations
- DynamoDB metadata and TEL are written atomically (TransactWriteItems)
- Point-in-time recovery enabled on all DynamoDB tables

### Security Boundaries
- The registry does NOT hold issuer private keys — signing is coordinated with the agent-service
- ACDC documents are encrypted at rest in S3 (AES256)
- Schema validation prevents malformed credentials from entering the system
- Selective disclosure logic ensures only requested attributes are revealed
