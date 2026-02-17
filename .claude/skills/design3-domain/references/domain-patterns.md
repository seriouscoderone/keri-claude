# Domain Patterns — Stack Type to Component Mapping

Maps each C2 stack type to its required/optional C3 domain components, data structures, state mappings, and runtime recommendation.

## Runtime Selection Guide

The runtime recommendation depends on the deployment model chosen at C2:

| Deployment Model | Recommended Runtime | Skills to Use |
|---|---|---|
| **Serverless (Lambda)** | Rust / keriox + cesride | `/keriox-skill`, `/cesride-skill`, `/parside-skill` |
| **Container (ECS/Fargate)** | Python / keripy (KERIA) | `/keripy-skill` |
| **Frontend (S3/CDN)** | TypeScript / signify-ts | `/signify-ts-skill` |

**Important:** If the C2 stack uses Lambda (serverless), Python/keripy is NOT recommended because keripy depends on LMDB (memory-mapped files incompatible with Lambda's ephemeral filesystem) and HIO (long-running async orchestration incompatible with Lambda's request-response model). Use Rust/keriox or a custom Rust implementation built on cesride primitives instead.

Always verify the chosen runtime supports required operations by invoking the relevant implementation skill.

---

## Pattern Overview

| Stack Type | Required Components | Optional Components | Recommended Runtime |
|---|---|---|---|
| witness-pool | Event Log Engine, Witness Service | OOBI Resolver | Rust / keriox (serverless) or Python / keripy (container) |
| watcher-node | Event Log Engine, Watcher Service | OOBI Resolver | Rust / keriox (serverless) or Python / keripy (container) |
| agent-service | Event Log Engine, KERI Agent, OOBI Resolver | Delegator, ACDC Registry | Rust / keriox (serverless) or Python / keripy via KERIA (container) |
| acdc-registry | Event Log Engine, ACDC Registry + TEL | OOBI Resolver | Rust / keriox (serverless) or Python / keripy (container) |
| judge-jury | Judge Service, Jury Service | Watcher Service | Rust / keriox (serverless) or Python / keripy (container) |
| frontend | (none — thin client, signing at the edge) | — | TypeScript / signify-ts |

---

## witness-pool

### Components

**Required:**
- **Event Log Engine** — Validates incoming events before receipting. Must enforce all KEL invariants.
- **Witness Service** — Receives events, applies first-seen rule, generates receipts, participates in KAACE.

**Optional:**
- **OOBI Resolver** — Discovers controller endpoints for receipt delivery.

### Data Structures

| Structure | Type | Usage |
|-----------|------|-------|
| InceptionEvent | key-event | First event in any KEL |
| RotationEvent | key-event | Key rotation with pre-rotation commitment |
| InteractionEvent | key-event | Non-establishment event for anchoring seals |
| Receipt | receipt | Witness signature over event SAID |

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| KEL store | WitnessKELTable (DynamoDB) | Append-only event log per AID prefix |
| Receipt store | WitnessReceiptTable (DynamoDB) | Receipts indexed by event SAID |
| First-seen index | WitnessKELTable (DynamoDB, hash: prefix, range: sn) | Ensures one version per (prefix, sn) |
| Receipt notifications | WitnessEventBus (EventBridge) | Publishes receipt events for consumers |

### Runtime

- **Serverless (Lambda):** Rust / keriox + cesride — Use `/keriox-skill` and `/cesride-skill` for API reference. keripy is incompatible with Lambda (LMDB + HIO require persistent processes). Rust compiles to Lambda custom runtime (`provided.al2023`, arm64/Graviton) with <50ms cold starts.
- **Container (Fargate):** Python / keripy — Use `/keripy-skill` for API reference. keripy is the reference implementation with complete witness support and KAACE algorithm.

---

## watcher-node

### Components

**Required:**
- **Event Log Engine** — Validates events for correctness (optional — watchers may store without full validation).
- **Watcher Service** — Monitors AIDs, records first-seen, detects duplicity, serves queries.

**Optional:**
- **OOBI Resolver** — Discovers witness endpoints for proactive KEL sync.

### Data Structures

| Structure | Type | Usage |
|-----------|------|-------|
| InceptionEvent | key-event | Watched AID inception |
| RotationEvent | key-event | Watched AID rotation |
| InteractionEvent | key-event | Watched AID interactions |
| Receipt | receipt | Collected from witnesses for verification |

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| KEL store | WatcherKELTable (DynamoDB) | First-seen event storage per AID |
| Duplicity evidence | WatcherDuplicityTable (DynamoDB) | All versions of duplicitous events |
| First-seen index | WatcherFirstSeenTable (DynamoDB) | Atomic first-seen via conditional writes (`attribute_not_exists`) |
| Duplicity alerts | WatcherAlertTopic (SNS) | Real-time duplicity notifications |

### Runtime

- **Serverless (Lambda):** Rust / keriox + cesride — Use `/keriox-skill` and `/cesride-skill`. Watcher validation is stateless and event-driven — ideal for Lambda. DynamoDB conditional writes provide first-seen atomicity without relational databases.
- **Container (Fargate):** Python / keripy — Use `/keripy-skill`. keripy has full watcher support with LMDB-based first-seen tracking.

---

## agent-service

### Components

**Required:**
- **Event Log Engine** — Full KEL validation for all managed AIDs.
- **KERI Agent** — AID lifecycle, credential operations, witness coordination.
- **OOBI Resolver** — Endpoint discovery for witnesses, watchers, and peer agents.

**Optional:**
- **Delegator** — If this agent manages delegated AIDs.
- **ACDC Registry + TEL** — If this agent issues or manages credentials directly (vs. separate registry stack).

### Data Structures

| Structure | Type | Usage |
|-----------|------|-------|
| InceptionEvent | key-event | AID creation |
| RotationEvent | key-event | Key rotation |
| InteractionEvent | key-event | Seal anchoring (TEL, delegation) |
| ACDC | acdc | Verifiable credential |
| Receipt | receipt | Witness receipts for managed events |
| OOBI | oobi | Endpoint discovery records |

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| KEL store | AgentKELTable (DynamoDB) | Event logs for all managed AIDs |
| ACDC store | AgentWalletTable (DynamoDB) | Issued and received credentials |
| Agent state | AgentStateTable (DynamoDB) | Tenant index, AID metadata, configuration |
| Key material | AgentKeySecret (Secrets Manager + KMS) | Encrypted private keys (per-tenant secrets) |
| Async operations | AgentAsyncQueue (SQS) | Credential issuance, delegation workflows |

### Runtime

- **Serverless (Lambda):** Rust / keriox + cesride — Use `/keriox-skill` and `/cesride-skill`. This is NOT KERIA — it's a ground-up serverless KERI agent. KERIA depends on LMDB and HIO which require persistent processes. The Rust agent reimplements AID lifecycle, credential ops, and witness coordination for Lambda's request-response model. Use `/keri-spec` to verify protocol compliance for the reimplemented operations.
- **Container (Fargate):** Python / keripy via KERIA — Use `/keripy-skill`. KERIA is the production cloud agent. Multi-tenant, falcon REST framework. Signify protocol for edge signing.

---

## acdc-registry

### Components

**Required:**
- **Event Log Engine** — Validates issuer KEL for anchoring TEL events.
- **ACDC Registry + TEL Manager** — Credential issuance, revocation, schema validation.

**Optional:**
- **OOBI Resolver** — Discovers issuer and verifier endpoints.

### Data Structures

| Structure | Type | Usage |
|-----------|------|-------|
| ACDC | acdc | Verifiable credential with SAID |
| TEL issuance event | tel-event | Records credential issuance (iss/bis) |
| TEL revocation event | tel-event | Records credential revocation (rev/brv) |
| InteractionEvent | key-event | Anchors TEL events in issuer KEL |
| KeyEvent (any) | key-event | Issuer KEL for signature verification |

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| ACDC store | RegistryACDCTable (DynamoDB) | SAID-indexed credential storage |
| TEL store | RegistryTELTable (DynamoDB) | Transaction event log per ACDC |
| ACDC content | RegistryContentBucket (S3) | Immutable ACDC documents (versioned) |
| Lifecycle events | RegistryEventBus (EventBridge) | Issuance/revocation notifications |

### Runtime

- **Serverless (Lambda):** Rust / keriox + cesride — Use `/keriox-skill`, `/cesride-skill`, and `/acdc-spec` for TEL/ACDC structure details. ACDC issuance requires KEL + TEL support. keriox has TEL support via teliox. Use `/acdc-spec` to verify graduated disclosure implementation.
- **Container (Fargate):** Python / keripy — Use `/keripy-skill`. keripy has the most complete ACDC implementation including schema validation and graduated disclosure.

---

## judge-jury

### Components

**Required:**
- **Judge Service** — Evaluates duplicity evidence, renders judgments.
- **Jury Service** — Collects evidence from multiple watchers, deduplicates.

**Optional:**
- **Watcher Service** — If the judge-jury stack includes its own watcher.

### Data Structures

| Structure | Type | Usage |
|-----------|------|-------|
| KeyEvent (any) | key-event | Duplicitous event variants |
| Receipt | receipt | Evidence of witness attestation |

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| Evidence store | EvidenceDB (DocumentDB) | Duplicity cases with all variants |
| Consensus state | ConsensusStateMachine (Step Functions) | Multi-watcher evidence collection workflow |
| Judgment notifications | JudgmentTopic (SNS) | Duplicity alerts and resolution updates |

### Runtime

- **Serverless (Lambda + Step Functions):** Rust / keriox + cesride — Use `/keriox-skill` and `/cesride-skill`. Step Functions orchestrate multi-watcher evidence collection. Lambda handles cryptographic proof verification.
- **Container (Fargate):** Python / keripy — Use `/keripy-skill`. keripy provides all needed primitives for proof verification.

---

## frontend

### Components

**Required:** None at C3 level. Frontend is a thin client that delegates all KERI operations to the agent service via the Signify protocol.

### Data Structures

Handled by signify-ts library — no domain-level data structures to define.

### State Mapping

| Component State | AWS Resource (from stack.yaml) | Description |
|----------------|-------------------------------|-------------|
| Static assets | FrontendBucket (S3) | React/Vue/Svelte build output |
| CDN | FrontendDistribution (CloudFront) | Global content delivery |

### Runtime

- **Language:** TypeScript
- **Library:** signify-ts — Use `/signify-ts-skill` for API reference (SignifyClient, identifier lifecycle, credential operations, CESR primitives in TypeScript)
- **Rationale:** Browser-based signing at the edge. signify-ts handles all cryptographic operations client-side. Keys never leave the browser.
