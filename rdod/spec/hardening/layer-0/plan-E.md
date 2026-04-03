# Implementation Plan: Layer 0 — Group E (Services Cluster)

## Domains

1. `cloud-agent-service/api` (Agent API)
2. `cloud-agent-service/processing` (Agent Processing)
3. `cloud-agent-service/provisioning` (Agent Provisioning)
4. `signify-client/key-management` (Signify Key Management)
5. `signify-client/resources` (Signify Resources)

All five domains are Layer 0 (no prior-layer dependencies). They belong to two packages:
- `@kerizon/agent` — cloud-agent-service/api, processing, provisioning
- `@kerizon/signify-client` — signify-client/key-management, resources

---

# Domain 1: cloud-agent-service/api

## 1. Module Structure

```
@kerizon/agent/
  api/
    admin-api.ts          — Admin API inbound port (KRAM-authenticated, port 3901)
    message-router.ts     — Message Router inbound port (KERI-authenticated, port 3902)
    boot-api.ts           — Boot endpoint inbound port (port 3903)
    types.ts              — BootRequest, AdminRequest
    errors.ts             — AuthNError, MissingSignifyResourceError, etc.
    notifications.ts      — Notification queueing and polling
    end-roles.ts          — End-Role Authorization tracking
```

## 2. Type Definitions

**BootRequest** — Agent provisioning request (POST /boot):
- `icp: InceptionEvent` (required) — from `types://identity/establishment`
- `sig: string` (required)
- `salty?: map` / `randy?: map` — mutually exclusive key params
- Invariant: exactly one of salty/randy present; sig verifies against icp keys

**AdminRequest** — KRAM-authenticated admin request:
- `method: "GET" | "POST" | "PUT" | "DELETE"` (required)
- `path: string` (required)
- `body?: map`
- `auth: SignifyAuth` (required) — from `types://signify-client/key-management`
- Invariant: auth.signify_resource matches controller AID; signature verifies against current key state

## 3. Port Interfaces

**Inbound: Boot API** (`port://cloud-agent-service/api/inbound/boot`)
- `boot(request: BootRequest): OperationStatus`
- Errors: InvalidBootInceptionError, AgentAlreadyExistsError

**Inbound: Admin API** (`port://cloud-agent-service/api/inbound/admin-api`)
- `handle(request: AdminRequest): OperationStatus`
- Errors: AuthNError, MissingSignifyResourceError, AgentNotFoundError, InvalidAgentConfigurationError, IdentifierNotFoundError, MissingParameterError, ForbiddenSignatureError, OperationNotFoundError, ConfigurationError

**Inbound: Message Router** (`port://cloud-agent-service/api/inbound/message-router`)
- `route(message: CESRMessage): RoutingResult`
- No KRAM required — KERI protocol authentication

## 4. Application Service

**AdminApiService** — Authenticates requests via KRAM, scopes to controller's agent instance, dispatches to resource handlers:
- Pre: valid Signature + Signature-Input + Signify-Resource headers
- Pre: signature verifies against controller's current key state
- Pre: agent provisioned for this controller
- Post: request routed to appropriate handler, result or 202 + operation handle

**MessageRouterService** — Routes external KERI messages by target AID:
- Pre: valid KERI protocol message with identifiable target AID
- Post: message routed to correct agent, notification queued for edge polling

## 5. Repository Interfaces

No outbound repositories in this subdomain. The HTTP Server external is an adapter:

**Outbound: HTTP Server** (`port://cloud-agent-service/outbound/http-server`)
- Adapter interface exposing admin (3901) and message router (3902) endpoints
- Implementations: Falcon/hio (keria), API Gateway+Lambda (serious-keri)

## 6. Error Types

All errors are `severity: fatal`, `recovery: abort`:
- **AuthNError** — HTTP signature verification failed (controller_aid, reason)
- **MissingSignifyResourceError** — Signify-Resource header missing (endpoint)
- **AgentNotFoundError** — No agent for controller AID (controller_aid)
- **InvalidAgentConfigurationError** — Agent/controller config invalid (agent_aid, controller_aid, reason)
- **InvalidBootInceptionError** — Boot inception event invalid (reason)
- **IdentifierNotFoundError** — Identifier not found under agent (identifier_name, agent_aid)
- **MissingParameterError** — Required body parameter missing (parameter_name, endpoint)
- **ForbiddenSignatureError** — Signature present but invalid (controller_aid)
- **OperationNotFoundError** — Operation name not found (operation_name)
- **ConfigurationError** — Agent type incompatible (agent_aid, reason)

## 7. State Machines

No state machines in the API subdomain — it is stateless request/response. Lifecycle state machines live in provisioning and processing subdomains.

## 8. Validation Pipeline

KRAM Authentication validation (per Admin API request):
1. Check Signify-Resource header present -> else MissingSignifyResourceError
2. Check Signature + Signature-Input headers present -> else AuthNError
3. Look up controller AID in agent registry -> else AgentNotFoundError
4. Verify signature against controller's current key state -> else ForbiddenSignatureError
5. Verify agent configuration consistency -> else InvalidAgentConfigurationError
6. Route to resource handler

## 9. Builder(s)

**AdminRequest** has 4 fields (1 optional) — builder recommended:
```
AdminRequest.builder()
  .method("POST")
  .path("/identifiers")
  .body({ alias: "test" })
  .auth(signifyAuth)
  .build()
```

**BootRequest** has mutually exclusive optional fields — builder enforces the XOR:
```
BootRequest.builder()
  .inceptionEvent(icp)
  .signature(sig)
  .saltyParams({ ... })  // XOR with .randyParams()
  .build()
```

## 10. Test Plan

- **KRAM enforcement**: All unsigned admin requests return 401 (property-based: random methods/paths/bodies)
- **KRAM binding**: Tampering with method, path, or body breaks verification (property-based)
- **Tenant scoping**: Controller A cannot see Controller B's identifiers (property-based: two controllers)
- **Message Router auth**: KERI-authenticated messages accepted without KRAM (property-based)
- **Async operations**: Mutating operations return 202 + pollable operation handle (from integration scenario `AgentProvisioning_happy`)
- **Notification polling**: Queued notifications discoverable via GET /notifications (property-based: variable counts)
- **Integration**: `AgentProvisioning_happy` scenario — POST /boot -> admin API accepts authenticated requests from controller's Signify client

## 11. Dependencies

- `types://identity/establishment#InceptionEvent` (Layer 0 — same layer)
- `types://signify-client/key-management#SignifyAuth` (Layer 0 — same layer)
- `types://signify-client/resources#OperationStatus` (Layer 0 — same layer)
- `errors://cloud-agent-service/provisioning#AgentAlreadyExistsError` (Layer 0 — same layer)

## 12. Open Questions

1. **What is the KRAM timeliness window?** The spec says `signify_timestamp must pass KRAM timeliness check` but does not define the window duration. Is it 5 seconds? 30 seconds? Configurable? This is a domain rule question: how stale can a request be before the agent rejects it?

2. **Does the boot endpoint (port 3903) require any authentication?** The spec says it receives POST /boot with a signed inception event, but it's unclear whether the boot endpoint has its own authentication middleware or relies solely on the inception event signature. The admin API requires KRAM, the message router requires KERI signatures — what does boot require?

3. **What happens when a notification is not acknowledged?** The spec defines polling and read/unread state, but does not specify: (a) do notifications expire? (b) is there a maximum notification queue depth per agent? (c) what is the notification retention policy?

4. **Is the Message Router spec complete for the OpenAPI endpoint?** The spec mentions `/spec.yaml` on port 3902 for OpenAPI 3.1.0 spec generation (from `specing.py`). Should this be a formal port or is it an operational concern outside the domain?

5. **BootRequest: what validation does the boot endpoint perform on the inception event beyond structure?** The spec says "icp must be a valid inception event with correct version string" and "sig must verify against the keys in the inception event." Does it also check that the AID is non-transferable (agent AIDs are non-transferable in keria) or that it's a single-sig event (no multisig groups)?

---

# Domain 2: cloud-agent-service/processing

## 1. Module Structure

```
@kerizon/agent/
  processing/
    work-processor.ts     — Processing Unit base + work cycle
    message-queue.ts      — Message Queue (Deck) FIFO implementation
    escrow-manager.ts     — Escrow lifecycle with timeout enforcement
    operation-monitor.ts  — Long-running Operation tracking (Monitor)
    multisig-assembly.ts  — Multi-sig signature assembly + threshold check
    credential-index.ts   — Credential search index (Seeker)
    postman.ts            — Peer-to-peer message delivery
    types.ts              — WorkItem, ServerOperation, EscrowedItem, etc.
    errors.ts             — EscrowTimeoutError, OperationLookupError
```

## 2. Type Definitions

**WorkItem** — Unit of async work:
- `deck: string` (required)
- `operation_type: string` (required)
- `payload: map` (required)

**DeckName** — Enum: `"cues" | "groups" | "anchors" | "witners" | "queries"`
- Note: "witners" appears to be a typo for "witnesses" — flag for clarification

**OpType** — Enum: `"oobi" | "witness" | "delegation" | "group" | "query" | "registry" | "credential" | "endrole" | "done"`

**SignedEventMessage** — Key event with partial signatures:
- `event: KeyEvent` (from `types://identity/establishment`)
- `signatures: Siger[]` (from `types://cesr/primitives`)
- `group_aid: AID` (from `types://cesr/primitives`)

**GroupStatus** — Enum: `"Pending" | "Satisfied" | "Failed"`

**EscrowedItem** — Temporarily held event/message:
- `key: string` (required)
- `payload: bytes` (required)
- `escrowed_at: DateTime` (from `types://cesr/primitives`)

**EscrowKey** — Composite lookup key:
- `prefix: string` (required)
- `sn: integer` (required)

**OperationType** — Alias for OpType (backward compat — should normalize to single enum)

**OperationName** — Unique identifier `{type}.{qualifier}`

**ServerOperation** — Long-running operation record:
- `name: string` (required) — format `{type}.{qualifier}`
- `done: boolean` (required)
- `operation_type: OperationType` (required)
- `response?: map` — present only when done=true, no error
- `error?: map` — present only when done=true, failed
- Invariant: done=false => both absent; done=true => XOR(response, error)

**CredentialFilter** — Credential search filter:
- `issuer?: AID` (from `types://cesr/primitives`)
- `schema?: SAID` (from `types://cesr/primitives`)
- `subject?: AID` (from `types://cesr/primitives`)
- All specified fields ANDed together

## 3. Port Interfaces

**Inbound: Work Processing** (`port://cloud-agent-service/processing/inbound/process-work`)
- `enqueue_work(item: WorkItem): void`
- `get_operation(name: string): ServerOperation`
- Errors: OperationLookupError

**Inbound: Multi-sig Assembly** (`port://cloud-agent-service/processing/inbound/multisig`)
- `submit_partial_signature(msg: SignedEventMessage): GroupStatus`
- Errors: EscrowTimeoutError

**Inbound: Credential Operations** (`port://cloud-agent-service/processing/inbound/credential-ops`)
- `search_credentials(filter: CredentialFilter): SAID[]`
- `issue_credential(filter: CredentialFilter): ServerOperation`
- Errors: OperationLookupError

**Outbound: Escrow Repository** (`port://cloud-agent-service/processing/outbound/escrow-repository`)
- `store(item: EscrowedItem): void`
- `get(key: EscrowKey): EscrowedItem | null`
- `list_expired(timeout: Duration): EscrowedItem[]`
- `remove(key: EscrowKey): void`
- Errors: EscrowTimeoutError

**Outbound: Operation Repository** (`port://cloud-agent-service/processing/outbound/operation-repository`)
- `save(op: ServerOperation): void`
- `get(name: string): ServerOperation | null`
- `update(name: string, status: Partial<ServerOperation>): void`
- Errors: OperationLookupError

**Outbound: Credential Index Repository** (`port://cloud-agent-service/processing/outbound/credential-index-repository`)
- `index(credential_said: SAID, fields: map): void`
- `search(filter: CredentialFilter): SAID[]`

**Outbound: Timer** (`port://cloud-agent-service/processing/outbound/timer`)
- `set(key: string, duration: Duration): void`
- `expired(key: string): boolean`

## 4. Application Service

**WorkProcessingService** — Cooperative scheduling engine:
- Drains work from Message Queues in periodic work cycles
- Non-blocking: each cycle processes available work and returns (<1s)
- Key workers: Witnesser, Delegator, Escrow Processor, Parser Worker

**OperationMonitor** — Tracks async operation completion:
- Creates operations with `{type}.{oid}` naming
- Delegates completion checks to correct component (Counselor for group, Boatswain for delegation, etc.)
- Returns done/response/error triple to edge client polling

**MultisigAssemblyService** — Collects and assembles partial signatures:
- Accumulates signatures from multiple edge clients
- Threshold-aware: escrows below-threshold sets, assembles when satisfied

## 5. Repository Interfaces

Three outbound repositories defined above (Escrow, Operation, Credential Index) plus Timer.

## 6. Error Types

- **EscrowTimeoutError** (severity: recoverable, recovery: abort) — escrowed item exceeded TTL (escrow_type, item_said, age_seconds, timeout_seconds)
- **OperationLookupError** (severity: fatal, recovery: abort) — no operation entry found (operation_name)

## 7. State Machines

**LongRunningOperation** lifecycle:
- States: `Submitted -> Processing -> Done | Failed | Timedout`
- Initial: Submitted
- Terminal: Done, Failed, Timedout
- Transitions:
  - Submitted -> Processing: operation picked up by processing loop (guard: recognized type)
  - Processing -> Done: all prerequisites met (type-specific guard)
  - Processing -> Failed: unrecoverable error
  - Processing -> Timedout: elapsed > timeout
- Invariants: Client polls via GET /operations/{name}; done operations carry response; failed carry error; names immutable

## 8. Validation Pipeline

Escrow processing sweep (per work cycle):
1. For each escrow type (OOE, PSE, PWE, PDE):
   - Enumerate active escrow items
   - Check timeout: age >= configured timeout -> prune (EscrowTimeoutError)
   - Check resolution: blocking condition resolved -> promote
2. Escrow timeouts: OOE=1200s, PSE/PWE=3600s, PDE=86400s

Operation completion check:
1. Identify operation type from name prefix
2. Dispatch to correct component (Counselor, Boatswain, Registrar, etc.)
3. Return done/response/error triple

Multi-sig assembly:
1. Validate incoming partial signature (valid Siger, valid event)
2. Accumulate with existing signatures for this group+event
3. Check threshold satisfaction: collected >= threshold -> assembled
4. Below threshold -> escrow with timeout

## 9. Builder(s)

**ServerOperation** has 5 fields (2 optional, XOR constraint) — builder required:
```
ServerOperation.builder()
  .name("witness.EDP1...")
  .type(OpType.Witness)
  .done(false)
  .build()

// On completion:
ServerOperation.builder()
  .name("credential.ESAID...")
  .type(OpType.Credential)
  .done(true)
  .response({ said: "ESAID..." })
  .build()
```

**EscrowedItem** builder:
```
EscrowedItem.builder()
  .key("EDP1...0")
  .payload(serializedBytes)
  .escrowedAt(DateTime.now())
  .build()
```

## 10. Test Plan

- **Non-blocking work cycle**: Each Processing Unit work cycle completes <1s (property-based: varying queue sizes)
- **FIFO ordering**: Message Queue drains in insertion order (property-based)
- **Escrow timeout enforcement**: Items with age >= timeout are pruned (SMT proof + property-based)
- **Operation naming**: All operations follow `{type}.{oid}` convention (property-based)
- **Operation lifecycle consistency**: done=true => XOR(response, error); done=false => both absent (property-based)
- **Multi-sig assembly threshold**: Cannot assemble below threshold (SMT proof); below-threshold escrowed not rejected (property-based)
- **Monitor delegation**: Completion checks dispatched to correct component per operation type
- **Credential indexing**: Every schema field becomes a searchable index (property-based)
- **Escrow cascade**: participation in `EscrowCascade_full_pipeline` scenario (PSE contribution)

## 11. Dependencies

- `types://identity/establishment#KeyEvent` (Layer 0 — same layer)
- `types://cesr/primitives#Siger` (Layer 0 — same layer)
- `types://cesr/primitives#AID` (Layer 0 — same layer)
- `types://cesr/primitives#SAID` (Layer 0 — same layer)
- `types://cesr/primitives#DateTime` (Layer 0 — same layer)
- Imports from higher layers (NOT available at Layer 0): Counselor (identity/thresholds, Layer 1), Boatswain (delegation, Layer 2), TEL Registrar (credential-lifecycle, Layer 7), Credentialer (credential-lifecycle, Layer 7), Seeker (credential-lifecycle, Layer 7)

## 12. Open Questions

1. **DeckName "witners" — is this a typo for "witnesses"?** The enum value is `"witners"` in the spec, but the UL term "Witnesser" and all other references say "witness." If this is the actual keria field name, we preserve it; if it's a spec typo, it should be "witnesses." This is a domain naming question: what is the canonical name for the witness receipt work queue?

2. **OperationType vs OpType — which is canonical?** Both types exist in types.yaml with identical enum values. The spec says "Alias for OpType — retained for backward compatibility." Should the spec normalize to a single type and remove the alias? Having two identical types creates confusion about which to use in port contracts.

3. **How does the Monitor discover which component to query for each operation type?** The spec says "Monitor queries Counselor for group, Boatswain for delegation, etc." but Counselor is in Layer 1 and Boatswain is in Layer 2. At Layer 0, the processing domain cannot import these. Is the Monitor designed around a pluggable completion-check interface that higher-layer domains register into? Or does the Monitor live at a higher layer than the processing subdomain?

4. **What are the exact escrow timeout values for cloud-agent-service escrows vs core protocol escrows?** The core protocol defines OOE=1200s, PSE/PWE=3600s, PDE=86400s. Does the cloud agent processing layer use the same timeouts, or does it have its own timeout configuration for agent-level escrows (e.g., partial multi-sig signatures awaiting more signers)?

5. **Is ServerOperation immutable after done=true?** The spec says "Once done=true, the operation is in a terminal state and will not revert." But can the operation be deleted after completion? What is the garbage collection policy for completed operations?

6. **What happens when the Escrow Processing Worker sweeps and finds items that span multiple escrow types?** The core protocol defines a strict OOE -> PSE -> PWE -> PDE sweep order. Does the cloud agent processing layer follow the same sweep order for its own escrow queues, or does it use a different ordering?

7. **Credential filter: what happens when no filter fields are provided?** The CredentialFilter invariant says "At least one filter field should be provided" — is this a hard requirement (error if empty) or a soft recommendation (return all credentials if empty)?

---

# Domain 3: cloud-agent-service/provisioning

## 1. Module Structure

```
@kerizon/agent/
  provisioning/
    agency.ts             — Agency service (boot endpoint logic)
    agent-instance.ts     — Agent Instance type + lifecycle
    agent-registry.ts     — Registry interface (bidirectional mappings)
    types.ts              — AgentInstance, ControllerAgentMapping, AgentConfig
    errors.ts             — AgentAlreadyExistsError, AgentInitializationError, AgentDeletionError
```

## 2. Type Definitions

**AgentInstance** — Provisioned agent workspace:
- `controller_aid: string` (required) — unique across agency
- `agent_aid: string` (required) — immutable after creation
- `managed_aids: string[]` (required)
- `database_name: string` (required)
- `active: boolean` (required)
- Invariant: one agent per controller; isolated database

**ControllerAgentMapping** — Bidirectional mapping:
- `controller_aid: string` (required)
- `agent_aid: string` (required)
- `managed_aids: string[]` (required)
- Invariant: bidirectional lookup by controller_aid, agent_aid, or managed AID

**AgentConfig** — Provisioning parameters:
- `controller_aid: AID` (required, from `types://cesr/primitives`)
- `agent_name: string` (required)
- Invariant: controller_aid must not already have a provisioned agent

## 3. Port Interfaces

**Inbound: Agent Lifecycle** (`port://cloud-agent-service/provisioning/inbound/agent-lifecycle`)
- `provision(config: AgentConfig): AgentInstance`
- `destroy(agent_aid: string): void`
- Errors: AgentAlreadyExistsError, AgentInitializationError, AgentDeletionError

**Outbound: Agent Registry** (`port://cloud-agent-service/provisioning/outbound/agent-registry`)
- `store(mapping: ControllerAgentMapping): void`
- `get_by_controller(controller_aid: string): AgentInstance | null`
- `get_by_agent(agent_aid: string): AgentInstance | null`
- `remove(agent_aid: string): void`
- Errors: AgentAlreadyExistsError

## 4. Application Service

**AgencyService** — Multi-tenant agent lifecycle management:
- `provision(config: AgentConfig): AgentInstance` — creates isolated agent instance, writes all three registry mappings atomically, returns configuration
- `destroy(agent_aid: string): void` — removes all owned resources (AIDs, credentials, contacts) and registry mappings
- `get_by_controller(controller_aid: string): AgentInstance | null` — forward lookup
- `get_by_agent(agent_aid: string): AgentInstance | null` — reverse lookup
- Enforces one-agent-per-controller invariant
- Provisioning is NOT idempotent — re-provisioning raises AgentAlreadyExistsError

## 5. Repository Interfaces

**Agent Registry** (outbound, defined above) — persistent store of bidirectional mappings:
- Agent-to-controller index (agent AID -> controller AID)
- Controller-to-agent index (controller AID -> agent AID)
- Managed-AID index (agent AID -> [managed AIDs])
- All three updated atomically during provisioning

## 6. Error Types

- **AgentAlreadyExistsError** (severity: fatal, recovery: abort) — controller already has agent (controller_aid, existing_agent_aid)
- **AgentInitializationError** (severity: fatal, recovery: abort) — component failed during init (controller_aid, component, reason)
- **AgentDeletionError** (severity: recoverable, recovery: escalate) — cleanup failed during destruction (agent_aid, component)

## 7. State Machines

**AgentInstanceLifecycle**:
- States: `unprovisioned -> provisioning -> active -> destroying -> destroyed`
- Initial: unprovisioned
- Terminal: destroyed
- Transitions:
  - unprovisioned -> provisioning: POST /boot with valid inception (guard: inception valid, no existing agent)
  - provisioning -> active: all mappings written, components initialized
  - provisioning -> unprovisioned: provisioning error — partial state rolled back
  - active -> destroying: controller/operator initiates destruction
  - destroying -> destroyed: all resources and mappings removed
- Invariants: active => consistent bidirectional mappings; destroyed => no remaining entries; NOT idempotent

## 8. Validation Pipeline

Provisioning validation:
1. Validate inception event structure -> else InvalidBootInceptionError (from api domain)
2. Check controller AID not already provisioned -> else AgentAlreadyExistsError
3. Create isolated database -> else AgentInitializationError
4. Initialize components (Identifier Repository, Registry Manager, Verifier) -> else AgentInitializationError
5. Write all three registry mappings atomically -> success

Destruction validation:
1. Verify agent exists -> else AgentDeletionError
2. Remove all owned resources (AIDs, credentials, contacts)
3. Remove all registry mappings
4. Verify clean removal -> else AgentDeletionError (escalate)

## 9. Builder(s)

**AgentInstance** has 5 fields — builder required:
```
AgentInstance.builder()
  .controllerAid("EDP1...")
  .agentAid("EAGENT...")
  .databaseName("agent_EDP1")
  .active(true)
  .build()
```

**AgentConfig** is 2 fields — builder not needed, constructor sufficient.

## 10. Test Plan

- **One-agent-per-controller**: Re-provisioning raises AgentAlreadyExistsError (property-based)
- **Agent-to-controller binding**: One agent cannot bind to two controllers (SMT proof)
- **Tenant isolation**: Controller A's data invisible to Controller B (property-based)
- **Bidirectional mappings**: Forward and reverse lookups consistent (property-based)
- **Atomic registry updates**: All three mappings present after provisioning (property-based)
- **Access model**: Non-owner cannot access (SMT proof)
- **State machine**: Full lifecycle unprovisioned -> active -> destroyed
- **Integration**: `AgentProvisioning_happy` scenario — POST /boot creates agent, stores mappings, admin API accepts requests

## 11. Dependencies

- `types://cesr/primitives#AID` (Layer 0 — same layer)
- `errors://cloud-agent-service/api#InvalidBootInceptionError` (Layer 0 — same layer, sibling subdomain)

## 12. Open Questions

1. **What components must be initialized during provisioning?** The spec mentions "Identifier Repository (Habery), Registry State Manager (Reger), Verifier" but these are implementation terms. In the DDD model, what are the adopter-centric names for the components that must be initialized per agent? This matters because the initialization order and failure handling depend on the component list.

2. **Is agent destruction a synchronous or asynchronous operation?** Provisioning is synchronous (30s timeout per the protocol). But destruction involves removing potentially many AIDs, credentials, and contacts. Should it be a long-running operation tracked by the Monitor? Or is it always synchronous?

3. **What happens to in-flight operations when an agent is destroyed?** If the agent has pending long-running operations (e.g., witness receipting in progress), are they cancelled? Do they complete before destruction? The state machine shows active -> destroying -> destroyed, but the interaction with the processing subdomain during destruction is unspecified.

4. **Can a destroyed agent be re-provisioned?** After an agent reaches the "destroyed" terminal state, can the same controller AID provision a new agent? The one-agent-per-controller invariant says "controller_aid is unique across the agency" — does "unique among active agents" or "unique for all time" (historical uniqueness)?

5. **AgentInstance.database_name — is this an implementation detail that should not be in the domain spec?** The type has a `database_name: string` field. This is LMDB-specific. In a DynamoDB implementation (serious-keri), there is no "database name" — there are table partitions. Should this field be replaced with a generic `storage_namespace: string` or removed entirely from the domain type?

---

# Domain 4: signify-client/key-management

## 1. Module Structure

```
@kerizon/signify-client/
  key-management/
    session.ts            — Session lifecycle (lock/unlock/timeout)
    keeper.ts             — Keeper interface + factory
    salty-keeper.ts       — Deterministic key derivation from salt
    randy-keeper.ts       — Random key generation with encrypted storage
    group-keeper.ts       — Multi-sig proxy delegating to member keeper
    encrypter.ts          — X25519 ECDH key-at-rest encryption
    key-derivation.ts     — Derivation path computation
    types.ts              — KeyTier, SignifyAuth, Keeper, SessionState, etc.
    errors.ts             — InvalidPasscodeError, PasscodeExpiredError, UnsupportedKeeperTypeError
```

## 2. Type Definitions

**KeyTier** — Argon2 stretching parameters (discriminated union):
- `low`: ops_limit=2, mem_limit=67108864 (64MB)
- `med`: ops_limit=3, mem_limit=268435456 (256MB)
- `high`: ops_limit=4, mem_limit=1073741824 (1GB)
- Invariant: immutable once set; implementations MUST NOT allow custom Argon2 params

**SignifyAuth** — KRAM headers:
- `signify_resource: string` (required) — controller AID
- `signify_timestamp: string` (required) — ISO 8601 with microseconds
- `signature: string` (required) — CESR Ed25519 signature
- `signature_input: string` (required) — components covered by signature
- Invariant: signature covers method + path + body digest + timestamp; must verify against current keys

**Keeper** — Key management strategy (discriminated union with 4 variants):
- `salty`: salt, tier, stem, signing_indices, rotation_indices — deterministic
- `randy`: signing_keys, next_keys — random, encrypted storage
- `group`: member_keeper, group_aid, local_member_index — multi-sig proxy
- `extern`: provider — external HSM/KMS (not yet in signify-ts)
- Common interface: `incept(): [Verfer[], Diger[]]`, `sign(content): Siger[]`, `rotate(): [Verfer[], Diger[]]`

**SessionState** — Active session:
- `controller_aid: string` (required)
- `agent_aid: string` (required)
- `agent_url: string` (required)
- `passcode_active: boolean` (required)
- `passcode_timeout?: integer`
- Invariant: passcode_active=false => signing fails until re-authenticated

**EncryptedSalt** — Encrypted master salt (stored on cloud agent):
- `ciphertext: bytes` (required)
- `algorithm: string` (required) — e.g., X25519-XSalsa20-Poly1305
- Invariant: only passcode holder can decrypt

**EncryptedKey** — Single encrypted private key:
- `ciphertext: bytes` (required)
- `key_index: integer` (required, >= 0)

**EncryptedKeyPair** — Paired current + next keys for randy keeper:
- `current: EncryptedKey[]` (required)
- `next: EncryptedKey[]` (required)

## 3. Port Interfaces

**Inbound: Key Operations** (`port://signify-client/key-management/inbound/key-ops`)
- `unlock(passcode: string, tier: KeyTier): SessionState`
- `lock(): void`
- `create_keeper(algo: Algos, pidx: integer, config: map): Keeper`
- `sign(aid: string, content: bytes): Siger[]`
- `rotate_keys(aid: string): [Verfer[], Diger[]]`
- Errors: InvalidPasscodeError, PasscodeExpiredError, UnsupportedKeeperTypeError

**Outbound: Key Repository** (`port://signify-client/key-management/outbound/key-repository`)
- `store_encrypted_salt(sxlt: EncryptedSalt): void`
- `load_encrypted_salt(): EncryptedSalt | null`
- `store_encrypted_keys(pair: EncryptedKeyPair): void`
- `load_encrypted_keys(): EncryptedKeyPair | null`

## 4. Application Service

**KeyManagementService** — Session-gated key operations:
- All operations require active session (passcode unlocked)
- `unlock()`: stretches passcode via Argon2 at configured tier, derives salt, loads key material
- `lock()`: zeroes all key material from memory
- `create_keeper()`: creates appropriate Keeper subtype based on Algos enum
- `sign()`: delegates to AID's Keeper, produces indexed signatures
- `rotate_keys()`: increments ridx on Keeper, derives new keys from new path

**EncrypterService** — Key-at-rest encryption:
- X25519 ECDH key agreement + secretbox symmetric encryption
- Encrypts salt for sxlt cloud storage
- Encrypts randy key proxies (prxs, nxts)
- Cloud agent cannot decrypt — only passcode holder can

## 5. Repository Interfaces

**Key Repository** (outbound, defined above) — encrypted key material persistence:
- Stores encrypted salt (sxlt) and encrypted key pairs (prxs/nxts)
- Never sees plaintext private keys
- Implementation: cloud agent storage (keria holds sxlt), local storage (browser extension)

## 6. Error Types

- **InvalidPasscodeError** (severity: fatal, recovery: abort) — passcode doesn't derive expected salt (tier)
- **PasscodeExpiredError** (severity: recoverable, recovery: abort) — session timeout expired (timeout_seconds)
- **UnsupportedKeeperTypeError** (severity: fatal, recovery: abort) — unknown keeper type (requested_type, supported_types)

## 7. State Machines

**SessionLifecycle**:
- States: `locked -> unlocking -> active -> timeout -> locked` (cycle); also `unlocking -> error -> locked`
- Initial: locked
- Terminal: none (cycles back to locked)
- Transitions:
  - locked -> unlocking: passcode provided (guard: len >= 21)
  - unlocking -> active: salt derived, key material loaded
  - unlocking -> error: invalid passcode or corrupted sxlt
  - error -> locked: error cleared, partial material zeroed
  - active -> locked: explicit lock
  - active -> timeout: inactivity exceeds session_timeout
  - timeout -> locked: key material zeroed
- Invariants: key material ONLY in 'active' state; any -> locked guarantees zeroed bytes

**KeeperLifecycle**:
- States: `created -> signing <-> rotated -> destroyed`
- Initial: created
- Terminal: destroyed
- Transitions:
  - created -> signing: incept() — keys derived
  - signing -> signing: sign() — produces signatures (self-loop)
  - signing -> rotated: rotate() — new keys derived
  - rotated -> signing: new keys activated
  - signing -> destroyed: session end or explicit
  - rotated -> destroyed: destruction during rotation
- Invariants: signing state has valid verfers+digers; SaltyKeeper recoverable from passcode; destroyed has no material

## 8. Validation Pipeline

Passcode validation:
1. Check length >= 21 chars -> else InvalidPasscodeError
2. Stretch via Argon2 at configured tier -> derive salt
3. If existing sxlt: decrypt and compare derived salt
4. If mismatch -> InvalidPasscodeError

Session activity check (before any key operation):
1. Check session.active -> else PasscodeExpiredError
2. Check timeout not expired -> else trigger timeout -> PasscodeExpiredError

Keeper creation:
1. Validate algo in {salty, randy, group, extern} -> else UnsupportedKeeperTypeError
2. Validate pidx >= 0
3. Create appropriate Keeper subtype

## 9. Builder(s)

**Keeper (salty variant)** has 5 fields — builder required:
```
Keeper.salty()
  .salt(salterQb64)
  .tier(KeyTier.Med)
  .stem("signify:aid")
  .signingIndices([0])
  .rotationIndices([1])
  .build()
```

**Keeper (randy variant)**:
```
Keeper.randy()
  .signingKeys([privKey1])
  .nextKeys([nextKey1])
  .build()
```

**Keeper (group variant)**:
```
Keeper.group()
  .memberKeeper(saltyKeeper)
  .groupAid("EGROUP...")
  .localMemberIndex(0)
  .build()
```

**SignifyAuth** has 4 required fields — builder recommended:
```
SignifyAuth.builder()
  .resource(controllerAid)
  .timestamp(iso8601)
  .signature(cesrSig)
  .signatureInput(inputSpec)
  .build()
```

## 10. Test Plan

- **Passcode entropy**: 21 base64 chars = 126 raw bits; Argon2 low tier adds >= 2 bits => >= 128 effective (SMT proof)
- **Passcode never transmitted**: No network traffic contains passcode (property-based with traffic capture)
- **Passcode zeroed on timeout**: Session end zeroes all memory (property-based)
- **Tier determinism**: Each tier maps to exactly one Argon2 parameter set (SMT proof)
- **Key derivation determinism**: Same passcode + salt -> same keys (property-based)
- **Keeper interface uniformity**: All keeper types support incept/sign/rotate lifecycle (property-based across all algos)
- **SaltyKeeper recoverability**: Destroy + recreate from same passcode yields same keys (property-based)
- **Derivation path determinism**: Same salt + path -> same key (property-based)
- **Encrypted salt opacity**: Agent cannot decrypt sxlt without passcode (property-based)
- **Session lifecycle**: Key material exists only in active state; zeroed on lock/timeout
- **Integration**: `AgentProvisioning_happy` — Signify client generates edge keys + inception event

## 11. Dependencies

- `types://cesr/primitives#Verfer` (Layer 0 — same layer, implicit through Keeper output)
- `types://cesr/primitives#Diger` (Layer 0 — same layer, implicit through Keeper output)
- `types://cesr/primitives#Siger` (Layer 0 — same layer, implicit through sign output)
- External: argon2 (passcode stretching), Ed25519/ECDSA (key generation), X25519 (ECDH encryption)

## 12. Open Questions

1. **What is the session timeout duration?** The spec says "zeroed from memory on session timeout" and "5-minute timeout" in the browser extension example, but does not specify a default or configurable range. Is this a per-deployment configuration, a per-client setting, or a protocol-level constant?

2. **Extern keeper: what is the contract?** The spec lists an `extern` variant with just a `provider: string` field and notes it's "not yet implemented in signify-ts." What operations must an external provider support? Is there a formal interface (HSM PKCS#11, cloud KMS API, WebAuthn)? The spec should either define the external provider interface or explicitly mark extern as "future" and exclude it from the current implementation plan.

3. **Key derivation path formula: is offset a constant?** The UL says `Path = stem + hex(ridx) + hex(kidx + offset)`. What is the offset value? Is it always 0? The spec provides the formula but not the offset. In signify-ts, the offset appears to be `transferable ? pidx * icodes.count : 0`. Should the domain spec capture this formula explicitly?

4. **Is the Encrypter a separate service or part of the Keeper?** The UL defines Encrypter as a separate term with its own responsibilities (X25519 ECDH + secretbox). But in signify-ts/signifypy, the Encrypter is tightly coupled to the Keeper. Should the domain spec model it as a separate service (better separation of concerns) or as a helper within the Keeper (matching implementation)?

5. **What is the KRAM signature input format?** SignifyAuth has `signature_input: string` described as "describes which components were included in the signature." The exact format (RFC 8941 structured fields? Custom? HTTP Message Signatures RFC 9421?) is not specified. This is a protocol-level question that affects both signify-client and cloud-agent-service.

6. **PasscodeExpiredError recovery: should the client auto-prompt for re-entry?** The error has `recovery: abort` but `severity: recoverable`. The session lifecycle shows timeout -> locked (not terminal). What is the expected UX: should the client library automatically transition to the locked state and wait for re-entry, or should it surface the error and let the application decide?

---

# Domain 5: signify-client/resources

## 1. Module Structure

```
@kerizon/signify-client/
  resources/
    identifiers.ts        — Identifier Resource (create, rotate, interact, list, get, addEndRole)
    credentials.ts        — Credential Resource (issue, list, get, revoke)
    exchanges.ts          — Exchange Resource (createExchangeMessage, send)
    groups.ts             — Group Resource (sendRequest, getRequest)
    registries.ts         — Registry Resource (create)
    operations.ts         — Operation polling (get, list, wait)
    types.ts              — OperationStatus, AgentConfig
    errors.ts             — AgentConnectionError, SignifyAuthError, ResourceNotFoundError, OperationTimeoutError
```

## 2. Type Definitions

**OperationStatus** — Edge-client view of a long-running operation:
- `name: string` (required) — unique identifier
- `done: boolean` (required)
- `operation_type: string` (required) — enum: oobi|witness|delegation|group|query|registry|credential|endrole|done
- `result?: map` — present only when done=true, successful
- `error?: map` — present only when done=true, failed; contains code (int), message (string), details (map)
- Invariant: done=false => both absent; done=true => XOR(result, error)

**AgentConfig** — Connection configuration:
- `agent_aid: AID` (from `types://cesr/primitives`)
- `admin_url: string` (required) — admin API (port 3901)
- `boot_url: string` (required) — boot endpoint (port 3903)

## 3. Port Interfaces

**Inbound: Resource Operations** (`port://signify-client/resources/inbound/resource-ops`)
- `createIdentifier(alias: string, config: map): { aid: AID, operation: OperationStatus }`
- `rotateIdentifier(aid: string): OperationStatus`
- `listIdentifiers(): IdentifierRecord[]`
- `getIdentifier(alias: string): IdentifierRecord`
- `addEndRole(alias: string, role: string, eid: string): OperationStatus`
- `issueCredential(name: string, registryName: string, schemaSaid: string, recipient: string, data: map): OperationStatus`
- `listCredentials(filter?: CredentialFilter): CredentialRecord[]`
- `createRegistry(name: string, registryName: string): OperationStatus`
- `sendExchange(name: string, route: string, payload: map, embeds: map, recipients: string[]): void`
- `pollOperation(name: string): OperationStatus`
- Errors: ResourceNotFoundError, OperationTimeoutError, AgentConnectionError

**Outbound: Cloud Agent Communication** (`port://signify-client/resources/outbound/cloud-agent-comms`)
- `boot(inceptionEvent: InceptionEvent): AgentConfig`
- `request(method: string, path: string, body?: map): Response`
- `poll_operation(name: string): OperationStatus`
- All requests carry KRAM signature headers
- Errors: AgentConnectionError, SignifyAuthError

## 4. Application Service

**IdentifierResource** — AID lifecycle:
- create(alias, config) -> signs inception + sends to agent + returns operation handle
- rotate(aid) -> signs rotation + sends to agent + returns operation handle
- addEndRole(alias, role, eid) -> signs end-role authorization + returns operation handle

**CredentialResource** — Credential operations:
- issue(name, registryName, schemaSaid, recipient, data) -> signs + sends + returns operation handle
- list(filter?) -> KRAM-signed GET /credentials
- Requires pre-existing registry (enforced by system)

**ExchangeResource** — IPEX and multi-sig exchange:
- send(name, route, payload, embeds, recipients) -> builds signed exn + delivers

**GroupResource** — Multi-sig coordination:
- sendRequest(name, exn, sigs, atc) -> distributes to group members
- getRequest(said) -> fetches pending request

**RegistryResource** — TEL registry:
- create(name, registryName) -> returns operation handle

**OperationsResource** — Operation polling:
- get(name) -> polls single operation status
- wait(name, timeout) -> polls until done or timeout

## 5. Repository Interfaces

No repositories — this subdomain is a pure API client. The Cloud Agent Communication outbound port is an adapter to the HTTP transport.

## 6. Error Types

- **AgentConnectionError** (severity: transient, recovery: retry) — agent unreachable (agent_url, reason)
- **SignifyAuthError** (severity: fatal, recovery: abort) — KRAM signature rejected (controller_aid, reason)
- **ResourceNotFoundError** (severity: fatal, recovery: abort) — resource doesn't exist on agent (resource_type, resource_id)
- **OperationTimeoutError** (severity: transient, recovery: retry) — polling timeout (operation_name, operation_type)

## 7. State Machines

No state machines — resource operations are stateless request/response. The operation lifecycle state machine is in cloud-agent-service/processing.

## 8. Validation Pipeline

Pre-request validation (all resource operations):
1. Check session active -> else PasscodeExpiredError (from key-management)
2. Sign request with KRAM headers -> attach Signature, Signature-Input, Signify-Resource, Signify-Timestamp

Post-response validation:
1. Check HTTP status -> map to domain errors (401 -> SignifyAuthError, 404 -> ResourceNotFoundError)
2. For async operations (202): extract operation handle from response

Operation polling:
1. GET /operations/{name}
2. Check done flag
3. If done=true: extract result or error
4. If done=false: wait and retry (bounded by OperationTimeoutError)

## 9. Builder(s)

**OperationStatus** has 5 fields (2 optional, XOR constraint) — builder required:
```
OperationStatus.builder()
  .name("witness.EDP1...")
  .done(true)
  .operationType("witness")
  .result({ receipts: 3 })
  .build()
```

**AgentConfig** has 3 required fields — constructor sufficient, no builder needed.

## 10. Test Plan

- **All mutating operations return pollable handles**: create/rotate/issue/createRegistry/addEndRole all return OperationStatus with {type}.{oid} name (property-based)
- **Operation polling consistency**: Polling returns consistent status; done is immutable once true (property-based)
- **Controller AID is trust anchor**: All KRAM headers reference controller AID; rotation updates authentication (property-based)
- **Identifier creation**: Returns valid CESR prefix + pollable witness operation (property-based)
- **Credential issuance**: Returns credential SAID + pollable TEL operation; requires pre-existing registry (property-based)
- **Registry prerequisite**: Issuing without registry fails with clear error (property-based)
- **End-Role validation**: Only 11 defined roles accepted; arbitrary strings rejected (property-based)
- **KRAM enforcement**: All resource endpoints reject unauthenticated requests (property-based)
- **AgentConnectionError retry**: Transient connection failures trigger retry (property-based)
- **Integration**: `AgentProvisioning_happy` — admin API accepts authenticated requests from Signify client

## 11. Dependencies

- `types://signify-client/key-management#SignifyAuth` (Layer 0 — same layer, sibling subdomain)
- `types://cesr/primitives#AID` (Layer 0 — same layer)
- `types://cesr/primitives#SAID` (Layer 0 — same layer)

## 12. Open Questions

1. **End-Role: is "mediator" a valid role?** The verification spec notes 11 roles from keripy `Rolage` (witness, controller, agent, watcher, registrar, gateway, judge, juror, peer, mailbox, indexer) but the UL mentions "mediator" as a possible role. The spec explicitly flags this: "mediator should be treated as an open question pending KSWG clarification." Which is the authoritative role set?

2. **OperationStatus vs ServerOperation: what is the mapping?** The processing domain defines `ServerOperation` (server-side); the resources domain defines `OperationStatus` (client-side). They have nearly identical fields (name, done, type, result/response, error) but different names for the result field (`response` server-side, `result` client-side). Is this intentional (different perspectives on the same concept) or a spec inconsistency that should be normalized?

3. **What is the retry policy for AgentConnectionError?** The error has `recovery: retry` but the spec does not define: (a) maximum retry count, (b) backoff strategy (exponential? fixed?), (c) circuit breaker threshold. Should these be domain-level constants or caller-configurable?

4. **OperationTimeoutError: what is the default polling timeout?** The error says "done never became true before timeout" but no default timeout is specified. Different operation types likely have different expected durations (witness receipting < delegation approval). Should the timeout be per-operation-type or a global default?

5. **Does the Signify client maintain local state about created identifiers?** The spec describes resource classes as pure API clients (request/response). But signify-ts's `Identifiers` class caches identifier records locally. Should the domain spec acknowledge this caching behavior, or is it an implementation detail outside the domain boundary?

6. **Controller AID rotation: what happens to in-flight operations?** The spec says "Rotation of this AID rotates the authentication relationship." If the controller rotates while operations are in-flight, do existing operations continue with the old key state or are they re-authenticated? This has implications for the cloud agent's signature verification: does it check against the key state at request time or at operation creation time?

---

# Cross-Domain Open Questions

1. **OperationStatus / ServerOperation duality**: The client-side `OperationStatus` and server-side `ServerOperation` represent the same concept from different perspectives. The field naming is inconsistent (`result` vs `response`). Should the spec normalize to a single shared type used by both domains, with a note about which fields are visible to which party? Or is the intentional asymmetry a feature (server can have internal fields not exposed to client)?

2. **KRAM signature format**: The `SignifyAuth` type references signatures and signature inputs, but the exact format (HTTP Message Signatures RFC 9421, custom CESR format, or something else) is not specified in any of the five domains. This is a cross-cutting protocol concern that both signify-client and cloud-agent-service depend on. Should it be a shared type in a kernel or a separate specification reference?

3. **Boot endpoint authentication model**: The boot endpoint (port 3903) sits between the Admin API (KRAM-authenticated) and the Message Router (KERI-authenticated). The boot request includes an inception event and a signature, but the spec doesn't clearly define whether this is "KRAM authentication with a to-be-provisioned controller AID" or "inception-event self-authentication." This affects the security model for initial provisioning.

4. **Circular dependency between signify-client/resources and cloud-agent-service/api**: The resources domain references the cloud agent's admin API via the outbound Cloud Agent Communication port. The api domain's AdminRequest type references SignifyAuth from signify-client/key-management. Both are Layer 0. While they're in the same layer, the packaging (different packages: @kerizon/signify-client vs @kerizon/agent) means they import from each other. Is this a legitimate cross-package dependency or a sign that SignifyAuth should live in a shared types package?

5. **"done" as an OpType value**: The OpType enum includes `"done"` as a value alongside the workflow types (witness, delegation, etc.). This is semantically different — it's a status, not a workflow type. The spec says it's "a terminal pseudo-type indicating the operation completed synchronously." Should this be removed from OpType and handled as a special case in the operation lifecycle state machine?
