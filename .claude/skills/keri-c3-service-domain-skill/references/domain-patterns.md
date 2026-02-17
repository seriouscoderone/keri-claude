# Domain Patterns — Stack Type to Component Mapping

Maps each C2 stack type to its required/optional C3 domain components, data structures, state mappings, and runtime recommendation.

---

## Pattern Overview

| Stack Type | Required Components | Optional Components | Recommended Runtime |
|---|---|---|---|
| witness-pool | Event Log Engine, Witness Service | OOBI Resolver | Python / keripy |
| watcher-node | Event Log Engine, Watcher Service | OOBI Resolver | Python / keripy or Rust / keriox |
| agent-service | Event Log Engine, KERI Agent, OOBI Resolver | Delegator, ACDC Registry | Python / keripy |
| acdc-registry | Event Log Engine, ACDC Registry + TEL | OOBI Resolver | Python / keripy |
| judge-jury | Judge Service, Jury Service | Watcher Service | Python / keripy |
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

- **Language:** Python
- **Library:** keripy
- **Rationale:** Witness requires full KEL validation. keripy is the reference implementation with complete witness support and KAACE algorithm. Long-running process suits ECS Fargate.

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
| KEL store | WatcherDBCluster (Aurora) | First-seen event storage per AID |
| Duplicity evidence | WatcherDBCluster (Aurora) | All versions of duplicitous events |
| First-seen timestamps | WatcherDBCluster (Aurora) | Timestamp of first observation |
| Duplicity alerts | WatcherAlertTopic (SNS) | Real-time duplicity notifications |

### Runtime

- **Language:** Python or Rust
- **Library:** keripy or keriox
- **Rationale:** Watcher validation is stateless and event-driven — suits Lambda. keripy for full compatibility; keriox for performance-critical deployments. Rust/keriox compiles to Lambda custom runtime.

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
| KEL store | AgentDB (RDS PostgreSQL) | Event logs for all managed AIDs |
| ACDC store | AgentDB (RDS PostgreSQL) | Issued and received credentials |
| Wallet data | AgentDB (RDS PostgreSQL) | Agent state, contact book, settings |
| Key material | AgentSecrets (Secrets Manager) | Encrypted private keys (or key wrapping material) |
| Async operations | AgentQueue (SQS) | Credential issuance, delegation workflows |

### Runtime

- **Language:** Python
- **Library:** keripy (backend via KERIA)
- **Rationale:** KERIA is the production cloud agent built on keripy. Multi-tenant, falcon REST framework. Signify protocol for edge signing.

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

- **Language:** Python
- **Library:** keripy
- **Rationale:** ACDC issuance requires full KEL + TEL support. keripy has the most complete ACDC implementation including schema validation and graduated disclosure.

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

- **Language:** Python
- **Library:** keripy
- **Rationale:** Judge/jury requires cryptographic proof verification. keripy provides all needed primitives. Step Functions orchestrate multi-step consensus.

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
- **Library:** signify-ts
- **Rationale:** Browser-based signing at the edge. signify-ts handles all cryptographic operations client-side. Keys never leave the browser.
