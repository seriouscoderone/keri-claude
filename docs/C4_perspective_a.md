KERI Ecosystem C4 Architecture Guide
====================================

For AI-Assisted Development in the KERI Economy
-----------------------------------------------

* * *

🌍 C0: Ecosystem / Governance Level
===================================

"Playing in a KERI-Backed Industry"
-----------------------------------

### Purpose

Define how an industry restructures around **verifiable, cryptographically-backed relationships** rather than centralized trust authorities.

### Key Insight

> **KERI doesn't replace your industry — it re-architects trust boundaries within it.**

* * *

C0 Architecture Patterns
------------------------

### Pattern 1: Credential Ecosystem Governance

**Industry Context**: Finance, Healthcare, Supply Chain, Sports, Insurance

**KERI Reframing**:

*   Replace "trusted intermediaries" → **ACDC-based verifiable claims**
*   Replace "data silos" → **distributed verifiable data registries**
*   Replace "reconciliation processes" → **cryptographic proof chains**

**Governance Components**:

1.  **Schema Registry** (what claims exist in this industry)
2.  **Credential Governance Framework** (who can issue what)
3.  **Trust Registry** (who are the recognized participants)
4.  **Legal/Liability Framework** (what does a verifiable claim mean legally)

**Example: Insurance Industry**

*   **Old model**: Insurance company verifies identity via SSN + documents
*   **KERI model**:
    *   Identity provider issues ACDC-backed credential
    *   Insurance company verifies cryptographic proof
    *   No central database breach risk
    *   Individual controls disclosure

* * *

### Pattern 2: Multi-Party Process Coordination

**Use Case**: Trade finance, clinical trials, supply chain provenance

**KERI Reframing**:

*   Replace "workflow engines" → **ACDC state progression**
*   Replace "audit trails" → **KEL + TEL anchoring**
*   Replace "dispute resolution" → **duplicity detection + evidence**

**Governance Questions**:

1.  What are the industry-standard ACDCs? (product certs, inspection records, etc.)
2.  Who are authorized issuers?
3.  What are the rules for ACDC chaining? (e.g., cannot ship without quality cert)
4.  How do we handle disputes? (judges/juries in KERI terms)

* * *

### Pattern 3: Marketplace / Platform Economics

**Use Case**: Gig economy, peer-to-peer platforms, reputation systems

**KERI Reframing**:

*   Replace "platform-owned reputation" → **self-sovereign verifiable reputation**
*   Replace "platform lock-in" → **portable credential wallets**
*   Replace "centralized identity" → **AIDs + delegated credentials**

**Governance Questions**:

1.  What credentials constitute "reputation"? (reviews, completion records, certifications)
2.  Can reputation transfer between platforms?
3.  Who issues platform participation credentials?
4.  How do we prevent fake credentials? (witness/watcher infrastructure)

* * *

C0 Deliverables (Per Industry)
------------------------------

### 1\. **Credential Schema Catalog**

A registry of industry-standard ACDCs:

    Industry: Healthcare
    - PatientIdentityCredential
    - MedicalLicenseCredential
    - PrescriptionCredential
    - InsuranceEligibilityCredential
    - ConsentRecordCredential
    

### 2\. **Trust Framework Document**

Legal + technical specification:

*   Who can issue each credential type
*   What KEL/TEL infrastructure they must maintain
*   Liability boundaries
*   Dispute resolution processes
*   Privacy requirements

### 3\. **Participant Roles Mapping**

Map industry roles to KERI infrastructure obligations:

Industry Role

KERI Infrastructure

Governance Obligation

Credential Issuer

KEL + ACDC Registry

Witness pool, schema compliance

Verifier

Watcher network access

Due diligence on duplicity

Individual

Wallet + Agent

Key management, backup

Auditor

Judge/Jury service

Duplicity investigation

### 4\. **Interoperability Requirements**

Cross-industry bridges:

*   Healthcare ↔ Insurance (eligibility verification)
*   Education ↔ Employment (degree verification)
*   Government ↔ Finance (KYC compliance)

* * *

C0 Design Questions for AI Systems
----------------------------------

When an AI is helping design at C0:

**Q1**: "What trust relationships currently require intermediaries?"  
**Q2**: "What data is currently duplicated across silos?"  
**Q3**: "What reconciliation processes exist?"  
**Q4**: "What are the liability boundaries?"  
**Q5**: "What credentials would reduce friction?"  
**Q6**: "Who should be authorized issuers?"  
**Q7**: "What privacy requirements exist?"  
**Q8**: "What are the regulatory compliance requirements?"

* * *

🏢 C1: System Level (Industry Service Provider)
===============================================

"A Player in the KERI Economy"
------------------------------

### Purpose

Define the **human-facing services** a participant provides by composing KERI infrastructure.

### Key Insight

> **You provide "Identity Protection" not "witness pools."**  
> **You provide "Credential Verification" not "KEL validation."**

* * *

C1 Service Patterns
-------------------

### Pattern 1: Identity Lifecycle Service

**Human-Facing Service**: "Secure Digital Identity Management"

**What It Does (Human Terms)**:

*   Issues you a cryptographic identity
*   Helps you recover if you lose your device
*   Protects you from identity theft
*   Lets you prove who you are without revealing private data

**What It Actually Provides (KERI Terms)**:

*   AID creation + KEL hosting
*   Witness pool management
*   Backup/recovery via delegation
*   Credential wallet hosting (KERIA)
*   Watcher network access

**Business Model**:

*   Freemium (basic witness hosting free, premium recovery services)
*   Enterprise (white-label identity infrastructure)
*   Per-transaction (credential issuance fees)

* * *

### Pattern 2: Credential Verification Service

**Human-Facing Service**: "Instant Background Checks" / "Credential Validation"

**What It Does (Human Terms)**:

*   Verifies someone's credentials in real-time
*   No centralized database lookups
*   Privacy-preserving (only get yes/no, not raw data)
*   Audit trail of verification requests

**What It Actually Provides (KERI Terms)**:

*   Watcher network access for KEL verification
*   ACDC validation service
*   Judge/jury duplicity checking
*   Graduated disclosure protocol handling

**Business Model**:

*   Per-verification API calls
*   Enterprise subscriptions (bulk verification)
*   Premium: enhanced duplicity protection

* * *

### Pattern 3: Marketplace Trust Service

**Human-Facing Service**: "Portable Reputation System"

**What It Does (Human Terms)**:

*   Build reputation across platforms
*   Take your reviews with you
*   Prove experience without revealing client names
*   Cannot be faked or bought

**What It Actually Provides (KERI Terms)**:

*   ACDC issuance for reputation events
*   TEL-backed state management (reputation score)
*   Multi-issuer reputation aggregation (chained ACDCs)
*   Zero-knowledge disclosure for sensitive reputation

**Business Model**:

*   Platform integration fees
*   Premium reputation portability
*   Verified credential badges

* * *

### Pattern 4: Compliance-as-a-Service

**Human-Facing Service**: "Automated Regulatory Compliance"

**What It Does (Human Terms)**:

*   Prove compliance without audits
*   Real-time compliance monitoring
*   Privacy-preserving regulatory reporting
*   Immutable audit trails

**What It Actually Provides (KERI Terms)**:

*   ACDC-based compliance certificates
*   KEL/TEL anchoring for audit trails
*   Automated schema validation against regulatory requirements
*   Watcher network for tamper-evidence

**Business Model**:

*   Per-company subscription
*   Per-audit fees (on-demand proof generation)
*   Regulatory body licensing

* * *

C1 Architecture Components
--------------------------

### Service Layer (Human Interface)

    ┌─────────────────────────────────────┐
    │  Human-Facing Service API          │
    │  - REST/GraphQL endpoints          │
    │  - Natural language descriptions    │
    │  - Business logic orchestration    │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │  Service Composition Layer          │
    │  - Workflow orchestration          │
    │  - Multi-step processes            │
    │  - Error handling & retry          │
    │  - Notifications & alerts          │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │  KERI Infrastructure (C2/C3)        │
    │  - Witness pools                    │
    │  - Watcher networks                │
    │  - KERIA agents                    │
    │  - ACDC registries                  │
    └─────────────────────────────────────┘
    

### Service Mapping Table

C1 Service

C3 KERI Components

C2 Infrastructure

Identity Creation

AID inception, KEL hosting

KERIA deployment, witness cluster

Credential Issuance

ACDC creation, TEL anchoring

ACDC registry, witness cluster

Credential Verification

KEL validation, ACDC verification

Watcher network, cache layer

Reputation Management

Multi-issuer ACDC chaining

TEL registry, aggregation service

Compliance Reporting

Schema validation, proof generation

Compliance engine, report generator

* * *

C1 Design Questions for AI Systems
----------------------------------

When an AI is helping design at C1:

**Q1**: "What problem does this solve for a human?"  
**Q2**: "What is the value proposition in non-technical terms?"  
**Q3**: "What are the user journeys?"  
**Q4**: "What KERI infrastructure is required?"  
**Q5**: "What are the SLA requirements?"  
**Q6**: "What is the business model?"  
**Q7**: "What are the integration points with existing systems?"  
**Q8**: "What are the onboarding/offboarding processes?"

* * *

☁️ C2: Deployment / Infrastructure Level
========================================

"AWS-Native KERI Service Deployments"
-------------------------------------

### Purpose

Define the **cloud infrastructure patterns** for deploying KERI services at scale.

### Key Insight

> **KERI services are event-driven, append-only, and need high availability.**  
> **Perfect fit for serverless + managed databases + event streams.**

* * *

C2 AWS Infrastructure Patterns
------------------------------

### Pattern 1: High-Availability Witness Pool

**Purpose**: Provide witness services for many controllers

**AWS Stack**:

    ┌────────────────────────────────────────┐
    │  Route53 (DNS + health checks)        │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Application Load Balancer (ALB)      │
    │  - SSL termination                      │
    │  - Path-based routing                  │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  ECS Fargate (witness service)        │
    │  - Auto-scaling                        │
    │  - Multi-AZ deployment                  │
    │  - Health checks                        │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  DynamoDB (KEL storage)                │
    │  - Global tables for geo-distribution  │
    │  - Point-in-time recovery              │
    │  - On-demand capacity                  │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  EventBridge (event pub/sub)          │
    │  - Witness receipt notifications        │
    │  - Cross-account event routing          │
    └────────────────────────────────────────┘
    

**CloudFormation Stack Name**: `keri-witness-pool`

**Key Parameters**:

*   Witness AID prefix
*   Number of witness instances (for KAACE threshold)
*   Allowed controller prefixes (access control)
*   Logging/monitoring endpoints

**Outputs**:

*   Witness pool OOBI URL
*   Health check endpoint
*   Metrics dashboard URL

* * *

### Pattern 2: Watcher Network Node

**Purpose**: Provide first-seen validation and duplicity detection

**AWS Stack**:

    ┌────────────────────────────────────────┐
    │  API Gateway (WebSocket API)          │
    │  - Real-time event streaming            │
    │  - Connection management                │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Lambda (event validation)            │
    │  - Stateless KEL validation            │
    │  - Duplicity detection                  │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Aurora Serverless (KEL + receipt DB)  │
    │  - First-seen timestamp tracking        │
    │  - Duplicity evidence storage          │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  SNS (duplicity alerts)                │
    │  - Real-time notifications              │
    │  - Multi-protocol delivery              │
    └────────────────────────────────────────┘
    

**CloudFormation Stack Name**: `keri-watcher-node`

**Key Parameters**:

*   Watched AID list (or wildcard for public watcher)
*   First-seen policy configuration
*   Alert destinations (SNS topics)
*   Data retention period

* * *

### Pattern 3: KERIA Agent Service

**Purpose**: Full-featured KERI agent with wallet, credential, and delegation support

**AWS Stack**:

    ┌────────────────────────────────────────┐
    │  CloudFront (CDN + DDoS protection)    │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  ALB (HTTPS termination)              │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  ECS Fargate (KERIA service)          │
    │  - Multi-tenant architecture            │
    │  - Auto-scaling based on requests      │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────────────┐
    │  RDS PostgreSQL (agent state)                │
    │  - KEL storage                                │
    │  - ACDC registry                              │
    │  - Wallet data                                │
    │  - Automated backups                          │
    └────────────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Secrets Manager (key material)        │
    │  - Encrypted private keys              │
    │  - Automatic rotation                  │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  SQS (async processing queue)          │
    │  - ACDC issuance                        │
    │  - Delegation workflows                │
    │  - Receipt collection                  │
    └────────────────────────────────────────┘
    

**CloudFormation Stack Name**: `keri-agent-service`

**Key Parameters**:

*   Multi-tenant vs single-tenant mode
*   Supported ACDC schemas
*   Witness pool OOBIs
*   Watcher network OOBIs
*   Backup retention period

* * *

### Pattern 4: ACDC Registry + TEL Service

**Purpose**: Issuance and revocation registry for verifiable credentials

**AWS Stack**:

    ┌────────────────────────────────────────┐
    │  API Gateway (REST API)                │
    │  - ACDC issuance endpoint              │
    │  - ACDC revocation endpoint            │
    │  - ACDC verification endpoint          │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Lambda (ACDC operations)              │
    │  - Schema validation                    │
    │  - TEL event creation                  │
    │  - Signature verification              │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  DynamoDB (ACDC + TEL storage)        │
    │  - SAID-indexed ACDC storage            │
    │  - TEL event log                        │
    │  - Revocation state tracking            │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  S3 (ACDC content storage)            │
    │  - Immutable ACDC documents            │
    │  - Versioned storage                    │
    │  - Lifecycle policies                  │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  EventBridge (ACDC lifecycle events)  │
    │  - Issuance notifications              │
    │  - Revocation notifications            │
    └────────────────────────────────────────┘
    

**CloudFormation Stack Name**: `keri-acdc-registry`

**Key Parameters**:

*   Issuer AID
*   Supported schema list
*   Revocation policy (backed vs backerless)
*   Witness pool OOBI
*   Access control rules

* * *

### Pattern 5: Judge + Jury Network

**Purpose**: Duplicity detection and evidence aggregation

**AWS Stack**:

    ┌────────────────────────────────────────┐
    │  Step Functions (jury consensus)      │
    │  - Multi-watcher evidence collection    │
    │  - Consensus algorithm execution        │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  Lambda (evidence validation)          │
    │  - Cryptographic proof verification    │
    │  - Duplicity classification            │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  DocumentDB (evidence storage)        │
    │  - Duplicity cases                      │
    │  - Resolution status                    │
    └────────────────────────────────────────┘
              ↓
    ┌────────────────────────────────────────┐
    │  SNS (judgment notifications)          │
    │  - Duplicity alerts                    │
    │  - Resolution updates                  │
    └────────────────────────────────────────┘
    

**CloudFormation Stack Name**: `keri-judge-jury`

* * *

C2 Infrastructure Decisions
---------------------------

### Database Selection

Component

Best AWS Service

Why

KEL Storage

**DynamoDB**

Append-only, high throughput, global tables \[2\]

ACDC Registry

**DynamoDB**

SAID-indexed lookups, on-demand scaling

KERIA Agent

**RDS PostgreSQL**

Complex queries, relational wallet data

TEL Storage

**DynamoDB**

Append-only, event streaming

Evidence Store

**DocumentDB**

Flexible schema for duplicity evidence

### Compute Selection

Component

Best AWS Service

Why

Witness Service

**ECS Fargate**

Long-running, stateful connections

Watcher Service

**Lambda**

Event-driven, stateless validation

KERIA Agent

**ECS Fargate**

Long-running, multi-tenant

ACDC Registry

**Lambda**

Bursty traffic, cost-effective

Judge/Jury

**Step Functions**

Multi-step consensus workflows

### Networking

Requirement

AWS Service

Public witness pools

ALB + Route53

Private KERIA agents

VPC + PrivateLink

Cross-region replication

DynamoDB global tables + S3 replication

DDoS protection

CloudFront + Shield

* * *

C2 Security Patterns
--------------------

### 1\. Key Material Protection

    Secrets Manager (encrypted at rest)
        ↓
    IAM role-based access (ECS task role)
        ↓
    Application (memory only, never disk)
        ↓
    KMS (envelope encryption)
    

### 2\. Network Security

    WAF (API Gateway / ALB)
        ↓
    Security Groups (least privilege)
        ↓
    VPC (private subnets for databases)
        ↓
    VPC Endpoints (no internet routing)
    

### 3\. Audit Logging

    All API calls → CloudTrail
    All database operations → RDS/DynamoDB audit logs
    All key access → CloudWatch Logs
    All events → EventBridge archive
    

* * *

C2 CloudFormation Stacks (Starter Templates)
--------------------------------------------

### Stack 1: `keri-witness-pool.yaml`

    Parameters:
      WitnessAID:
        Type: String
        Description: AID prefix for this witness
      WitnessThreshold:
        Type: Number
        Default: 2
        Description: KAACE threshold for receipt generation
      AllowedControllers:
        Type: CommaDelimitedList
        Description: List of AID prefixes allowed to use this witness
    
    Resources:
      WitnessECSCluster:
        Type: AWS::ECS::Cluster
      WitnessTaskDefinition:
        Type: AWS::ECS::TaskDefinition
        Properties:
          ContainerDefinitions:
            - Name: witness
              Image: !Sub ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/keri-witness:latest
              Environment:
                - Name: WITNESS_AID
                  Value: !Ref WitnessAID
      WitnessKELTable:
        Type: AWS::DynamoDB::Table
        Properties:
          BillingMode: PAY_PER_REQUEST
          AttributeDefinitions:
            - AttributeName: prefix
              AttributeType: S
            - AttributeName: sn
              AttributeType: N
          KeySchema:
            - AttributeName: prefix
              KeyType: HASH
            - AttributeName: sn
              KeyType: RANGE
    
    Outputs:
      WitnessOOBI:
        Value: !Sub "http://${WitnessALB.DNSName}/oobi/${WitnessAID}"
    

### Stack 2: `keri-watcher-node.yaml`

### Stack 3: `keri-agent-service.yaml`

### Stack 4: `keri-acdc-registry.yaml`

### Stack 5: `keri-judge-jury.yaml`

* * *

C2 Design Questions for AI Systems
----------------------------------

When an AI is helping design at C2:

**Q1**: "What are the availability requirements (SLA)?"  
**Q2**: "What is the expected throughput (events/sec, API calls/sec)?"  
**Q3**: "What are the data residency requirements?"  
**Q4**: "What are the disaster recovery requirements?"  
**Q5**: "What are the cost constraints?"  
**Q6**: "What are the security compliance requirements (HIPAA, SOC2, etc.)?"  
**Q7**: "What are the integration requirements (VPC peering, PrivateLink, etc.)?"  
**Q8**: "What are the observability requirements (metrics, logs, traces)?"

* * *

🧩 C3: Domain Concepts Level
============================

"Pure KERI Service Implementations"
-----------------------------------

### Purpose

Define the **core KERI domain concepts** as implemented software components.

### Key Insight

> **This is where the "work of KERI" gets done.**  
> **These are the building blocks all higher layers compose.**

* * *

C3 Core Components (The Five Primitives)
----------------------------------------

### 1\. Event Log Engine

**What It Does**: Deterministic key state machine over append-only event logs 12

**Core Operations**:

    # Event creation (controller mode)
    incept(config: InceptionConfig) -> KeyEvent
    rotate(aid: AID, rotation_config: RotationConfig) -> KeyEvent
    interact(aid: AID, data: dict) -> KeyEvent
    delegate(aid: AID, delegate_config: DelegationConfig) -> KeyEvent
    
    # Event validation (verifier mode)
    validate_event(event: KeyEvent, prior_state: KeyState) -> ValidationResult
    compute_key_state(events: List[KeyEvent]) -> KeyState
    apply_event(prior_state: KeyState, event: KeyEvent) -> KeyState
    
    # Receipt processing
    verify_receipt(receipt: Receipt, event: KeyEvent) -> bool
    apply_receipt(event: KeyEvent, receipt: Receipt) -> ReceiptState
    
    # Duplicity detection
    detect_equivocation(events: List[KeyEvent]) -> EquivocationResult
    
    # Serialization (CESR)
    serialize(event: KeyEvent) -> bytes
    deserialize(data: bytes) -> KeyEvent
    compute_said(serialized_event: bytes) -> str
    

**State Machine Invariants**:

*   Sequence numbers must increment by 1
*   Next key digest must match rotated-in keys
*   Signatures must verify against current keys
*   Delegated events must have anchoring seal in delegator KEL 1

**Implementation Notes**:

*   Must be deterministic (same inputs → same outputs)
*   Must be stateless (validation functions don't mutate)
*   Must be side-effect free (no I/O in core validation)

* * *

### 2\. Witness Service

**What It Does**: Receives events, validates them, stores first-seen, generates receipts 12

**Core Responsibilities**:

1.  **Event Reception**: Accept events from controllers
2.  **First-Seen Validation**: Validate against KEL, reject duplicates
3.  **Receipt Generation**: Sign event SAID with witness keys
4.  **Publication**: Make KEL + receipts available for query
5.  **KAACE Participation**: Exchange receipts with other witnesses 1

**Key Algorithms**:

    class WitnessService:
        def receive_event(self, event: KeyEvent) -> ReceiptResult:
            # 1. Validate event structure
            if not validate_event_structure(event):
                return ReceiptResult.Invalid
           
            # 2. Check first-seen
            if self.has_seen(event.prefix, event.sn):
                existing = self.get_event(event.prefix, event.sn)
                if existing.said != event.said:
                    # Duplicity detected
                    self.record_duplicity(event, existing)
                    return ReceiptResult.Duplicitous
                else:
                    # Duplicate submission (idempotent)
                    return ReceiptResult.AlreadySeen
           
            # 3. Validate against KEL
            prior_state = self.compute_key_state(event.prefix)
            validation = validate_event(event, prior_state)
            if not validation.valid:
                return ReceiptResult.Invalid
           
            # 4. Store as first-seen
            self.store_event(event)
           
            # 5. Generate receipt
            receipt = self.sign_receipt(event.said)
           
            # 6. Publish to other witnesses (KAACE)
            self.broadcast_receipt(receipt)
           
            return ReceiptResult.Success(receipt)
       
        def query_kel(self, prefix: str) -> List[KeyEvent]:
            return self.get_events(prefix)
       
        def query_receipts(self, said: str) -> List[Receipt]:
            return self.get_receipts(said)
    

**KAACE Algorithm** 1:

    def kaace_consensus(self, event: KeyEvent, threshold: int):
        """
        Witness Agreement Algorithm
        - Exchange receipts with other witnesses
        - Wait for threshold receipts
        - Confirm consensus
        """
        receipts = [self.generate_receipt(event)]
       
        # Broadcast to other witnesses
        for witness in self.witness_pool:
            if witness != self:
                witness.send_receipt(receipts[0])
       
        # Wait for threshold
        while len(receipts) < threshold:
            receipt = self.receive_receipt_from_peer()
            if verify_receipt(receipt, event):
                receipts.append(receipt)
       
        return receipts  # Consensus reached
    

* * *

### 3\. Watcher Service

**What It Does**: Monitors KELs for duplicity, provides ambient verifiability 2

**Core Responsibilities**:

1.  **KEL Monitoring**: Watch specific AIDs or all AIDs
2.  **First-Seen Recording**: Store first version seen of every event
3.  **Duplicity Detection**: Compare against first-seen on new submissions
4.  **Evidence Collection**: Store all versions for duplicitous events
5.  **Query Service**: Provide KEL + duplicity evidence to verifiers

**Key Algorithms**:

    class WatcherService:
        def watch(self, prefix: str):
            """Start watching an AID"""
            self.watched_aids.add(prefix)
            self.sync_kel(prefix)  # Initial sync
       
        def receive_event(self, event: KeyEvent):
            """Process incoming event"""
            if event.prefix not in self.watched_aids:
                return  # Not watching this AID
           
            # Check first-seen
            first_seen = self.get_first_seen(event.prefix, event.sn)
           
            if first_seen is None:
                # First time seeing this event
                self.store_first_seen(event)
                self.notify_subscribers(EventSeen(event))
            elif first_seen.said != event.said:
                # Duplicity detected!
                self.record_duplicity(event, first_seen)
                self.alert_duplicity(event.prefix, event.sn)
       
        def query_duplicity(self, prefix: str, sn: int) -> DuplicityEvidence:
            """Return all versions seen for given event"""
            return self.get_all_versions(prefix, sn)
       
        def sync_with_witnesses(self, prefix: str):
            """Proactively sync KEL from witnesses"""
            for witness in self.get_witnesses(prefix):
                kel = witness.query_kel(prefix)
                for event in kel:
                    self.receive_event(event)
    

**Watcher Mentoring** 2: New watchers inoculate themselves by syncing with established watchers before accepting new events ("first-seen-first").

* * *

### 4\. KERI Agent (KERIA)

**What It Does**: Orchestrates KERI operations for a controller (wallet functions) 3

**Core Responsibilities**:

1.  **AID Management**: Create, rotate, recover AIDs
2.  **Delegation**: Delegate AIDs, anchor delegation events
3.  **ACDC Lifecycle**: Issue, present, verify, revoke credentials
4.  **Witness Coordination**: Submit events, collect receipts
5.  **OOBI Exchange**: Discover and resolve OOBIs
6.  **Key Management**: Secure storage, backup, recovery

**Key Operations**:

    class KERIAgent:
        def create_aid(self, config: AIDConfig) -> AID:
            """Create new AID with inception event"""
            inception = self.event_engine.incept(config)
            self.submit_to_witnesses(inception)
            receipts = self.collect_receipts(inception)
            self.store_kel(inception)
            return AID(inception.prefix)
       
        def rotate_keys(self, aid: AID, new_keys: List[str]):
            """Rotate keys for an AID"""
            rotation = self.event_engine.rotate(aid, new_keys)
            self.submit_to_witnesses(rotation)
            receipts = self.collect_receipts(rotation)
            self.store_kel(rotation)
       
        def issue_credential(self, schema: str, data: dict,
                            issuee: AID) -> ACDC:
            """Issue ACDC credential"""
            acdc = self.create_acdc(schema, data, issuee)
            tel_event = self.create_tel_issuance(acdc)
            anchor_seal = self.create_seal(tel_event)
            interaction = self.event_engine.interact(
                self.aid,
                data={"seals": [anchor_seal]}
            )
            self.submit_to_witnesses(interaction)
            return acdc
       
        def verify_credential(self, acdc: ACDC) -> VerificationResult:
            """Verify ACDC credential"""
            # 1. Verify issuer KEL
            issuer_kel = self.watcher.query_kel(acdc.issuer)
            issuer_state = self.event_engine.compute_key_state(issuer_kel)
           
            # 2. Verify ACDC signature
            if not verify_signature(acdc, issuer_state.current_keys):
                return VerificationResult.InvalidSignature
           
            # 3. Check revocation status (TEL)
            tel = self.query_tel(acdc.said)
            if tel.is_revoked():
                return VerificationResult.Revoked
           
            # 4. Check duplicity
            duplicity = self.watcher.query_duplicity(acdc.issuer)
            if duplicity.exists():
                return VerificationResult.Duplicitous
           
            return VerificationResult.Valid
       
        def resolve_oobi(self, oobi: str):
            """Resolve OOBI to discover endpoints"""
            # OOBI format: http://witness.com/oobi/{aid}
            endpoints = self.fetch_oobi(oobi)
            self.store_endpoints(endpoints)
            self.sync_kel_from_endpoints(endpoints)
    

* * *

### 5\. ACDC Registry + TEL Manager

**What It Does**: Manages lifecycle of verifiable credentials 34

**Core Responsibilities**:

1.  **ACDC Issuance**: Create SAIDified credentials
2.  **TEL Management**: Track issuance/revocation state
3.  **Schema Validation**: Enforce credential schemas
4.  **Chained Credentials**: Support multi-issuer chains
5.  **Graduated Disclosure**: Privacy-preserving presentation

**Key Operations**:

    class ACDCRegistry:
        def issue(self, schema: str, attributes: dict,
                  issuer: AID, issuee: AID) -> ACDC:
            """Issue new ACDC"""
            # 1. Validate schema
            if not self.validate_schema(schema, attributes):
                raise InvalidSchema
           
            # 2. Create ACDC with SAID
            acdc = self.create_acdc({
                "v": "ACDC10JSON00011c_",
                "d": "",  # Will be computed
                "i": issuer.prefix,
                "s": schema,
                "a": attributes,
                "e": {},  # Edges (chained credentials)
                "r": {}  # Rules
            })
            acdc.d = self.compute_said(acdc)
           
            # 3. Sign ACDC
            signature = self.sign(acdc, issuer)
           
            # 4. Create TEL issuance event
            tel_event = {
                "v": "KERI10JSON00011c_",
                "t": "iss",  # Issuance
                "d": "",
                "i": acdc.d,  # ACDC SAID
                "s": 0,  # TEL sequence number
                "dt": timestamp()
            }
            tel_event["d"] = self.compute_said(tel_event)
           
            # 5. Anchor TEL in KEL
            seal = {"i": tel_event["d"]}
            self.agent.interact(issuer, data={"seals": [seal]})
           
            # 6. Store ACDC + TEL
            self.store_acdc(acdc)
            self.store_tel(tel_event)
           
            return acdc
       
        def revoke(self, acdc_said: str, issuer: AID):
            """Revoke ACDC"""
            # 1. Get current TEL state
            tel = self.get_tel(acdc_said)
           
            # 2. Create revocation event
            revoke_event = {
                "v": "KERI10JSON00011c_",
                "t": "rev",  # Revocation
                "d": "",
                "i": acdc_said,
                "s": tel.sn + 1,
                "dt": timestamp()
            }
            revoke_event["d"] = self.compute_said(revoke_event)
           
            # 3. Anchor in KEL
            seal = {"i": revoke_event["d"]}
            self.agent.interact(issuer, data={"seals": [seal]})
           
            # 4. Store TEL event
            self.store_tel(revoke_event)
       
        def verify_status(self, acdc_said: str) -> IssuanceStatus:
            """Check if ACDC is currently valid"""
            tel = self.get_tel(acdc_said)
            latest_event = tel.events[-1]
           
            if latest_event["t"] == "iss":
                return IssuanceStatus.Issued
            elif latest_event["t"] == "rev":
                return IssuanceStatus.Revoked
            else:
                return IssuanceStatus.Unknown
    

* * *

C3 Additional Domain Components
-------------------------------

### 6\. Delegator Service

**What It Does**: Manages delegated identifier lifecycle

**Key Operations**:

*   Approve/deny delegation requests
*   Anchor delegation events in delegator KEL
*   Revoke delegations
*   Monitor delegated KEL for policy violations

* * *

### 7\. OOBI Resolver

**What It Does**: Discovers and caches endpoint information 5

**Key Operations**:

    class OOBIResolver:
        def resolve(self, oobi: str) -> ResolvedEndpoints:
            """
            OOBI format: http://host:port/oobi/{aid}
            Or: http://host:port/oobi/{aid}/witness/{witness_aid}
            """
            # 1. Fetch OOBI endpoint
            response = self.fetch(oobi)
           
            # 2. Parse endpoint descriptors
            endpoints = self.parse_endpoints(response)
           
            # 3. Cache for future lookups
            self.cache_endpoints(endpoints)
           
            return endpoints
       
        def discover_witnesses(self, aid: AID) -> List[WitnessEndpoint]:
            """Discover witness endpoints for an AID"""
            kel = self.query_kel(aid)
            inception = kel[0]
            witness_aids = inception.witnesses
           
            endpoints = []
            for witness_aid in witness_aids:
                oobi = self.resolve_oobi_for_witness(aid, witness_aid)
                endpoints.append(oobi)
           
            return endpoints
    

* * *

### 8\. Judge + Jury Service

**What It Does**: Evaluates duplicity evidence and provides judgments 2

**Key Operations**:

    class JudgeService:
        def evaluate(self, prefix: str, sn: int) -> Judgment:
            """Evaluate duplicity evidence from jury"""
            # 1. Collect evidence from multiple jurors
            evidence = self.jury.collect_evidence(prefix, sn)
           
            # 2. Verify cryptographic proofs
            for variant in evidence.variants:
                if not self.verify_variant(variant):
                    # Invalid evidence, discard
                    continue
           
            # 3. Determine judgment
            if len(evidence.variants) > 1:
                # Multiple valid versions = duplicity
                return Judgment.Duplicitous(evidence)
            else:
                # Single version = no duplicity
                return Judgment.Trustworthy
       
    class JurorService:
        def collect_evidence(self, prefix: str, sn: int) -> Evidence:
            """Collect all versions seen of an event"""
            variants = []
           
            # Query multiple watchers
            for watcher in self.watcher_pool:
                versions = watcher.query_duplicity(prefix, sn)
                variants.extend(versions)
           
            # Deduplicate
            unique_variants = self.deduplicate(variants)
           
            return Evidence(prefix, sn, unique_variants)
    

* * *

C3 Data Structures
------------------

### KeyEvent (Establishment)

    @dataclass
    class InceptionEvent:
        v: str  # Version string
        t: str  # "icp"
        d: str  # SAID
        i: str  # AID prefix (self-referential)
        s: int  # Sequence number (0 for inception)
        kt: str  # Key signing threshold
        k: List[str]  # Current signing keys
        nt: str  # Next key threshold
        n: List[str]  # Next key digests (pre-rotation)
        bt: str  # Witness threshold
        b: List[str]  # Witness AIDs
        c: List[str]  # Configuration traits
        a: List[Dict]  # Seals
    

### KeyEvent (Rotation)

    @dataclass
    class RotationEvent:
        v: str
        t: str  # "rot"
        d: str  # SAID
        i: str  # AID prefix
        s: int  # Sequence number
        p: str  # Prior event SAID
        kt: str
        k: List[str]  # Rotated-in keys (must match prior next digest)
        nt: str
        n: List[str]  # New next key digests
        bt: str
        br: List[str]  # Witness rotation (remove)
        ba: List[str]  # Witness rotation (add)
        a: List[Dict]  # Seals
    

### KeyEvent (Interaction)

    @dataclass
    class InteractionEvent:
        v: str
        t: str  # "ixn"
        d: str  # SAID
        i: str  # AID prefix
        s: int  # Sequence number
        p: str  # Prior event SAID
        a: List[Dict]  # Seals (for anchoring)
    

### ACDC

    @dataclass
    class ACDC:
        v: str  # Version
        d: str  # SAID
        i: str  # Issuer AID
        s: str  # Schema SAID
        a: Dict  # Attributes
        e: Dict  # Edges (chained credentials)
        r: Dict  # Rules
    

### Receipt

    @dataclass
    class Receipt:
        v: str
        t: str  # "rct"
        d: str  # Receipted event SAID
        i: str  # Witness/Watcher AID
        s: int  # Sequence number of receipted event
    

* * *

C3 Design Questions for AI Systems
----------------------------------

When an AI is helping implement at C3:

**Q1**: "What is the core KERI operation being performed?"  
**Q2**: "Is this a controller operation or verifier operation?"  
**Q3**: "What are the validation invariants?"  
**Q4**: "What are the cryptographic requirements?"  
**Q5**: "What are the failure modes?"  
**Q6**: "What events need to be emitted for observability?"  
**Q7**: "What state needs to be persisted?"  
**Q8**: "What are the performance requirements (latency, throughput)?"  
**Q9**: "What are the security boundaries?"  
**Q10**: "How does this compose with other components?"

* * *

🧬 C4: Code / Libraries Level
=============================

"Runtime + Library Recommendations"
-----------------------------------

### Purpose

Point to existing implementations and libraries — AI doesn't need to implement these from scratch.

* * *

Official KERI Implementations
-----------------------------

### 1\. **KERIpy** (Python)

*   **Repo**: [https://github.com/WebOfTrust/keripy](https://github.com/WebOfTrust/keripy)
*   **Status**: Reference implementation
*   **Use for**: Core KERI logic, witnesses, watchers, agents

**Key Modules**:

    from keri.core import coring  # Core primitives (Verfer, Diger, Siger)
    from keri.core import eventing  # Key event creation/validation
    from keri.kering import Kever  # Key event verifier (state machine)
    from keri.db import dbing  # KEL storage
    from keri.app import habbing  # Habitat (agent context)
    

* * *

### 2\. **Signify (TypeScript)**

*   **Repo**: [https://github.com/WebOfTrust/signify-ts](https://github.com/WebOfTrust/signify-ts)
*   **Status**: Production-ready client library
*   **Use for**: Browser/Node.js wallets, web apps

**Key Operations**:

    import { Signify } from 'signify-ts';
    
    const client = new Signify();
    await client.connect();
    
    // Create AID
    const aid = await client.identifiers().create('my-aid');
    
    // Issue credential
    const acdc = await client.credentials().issue({
      schema: 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao',
      recipient: 'EKYLUMmNPZeEs77Zvclf0bSN5IN-mLfLpx2ySb-HDlk4',
      data: { name: 'Alice' }
    });
    

* * *

### 3\. **Cesride (Rust)**

*   **Repo**: [https://github.com/WebOfTrust/cesride](https://github.com/WebOfTrust/cesride)
*   **Status**: Emerging (CESR primitives focus)
*   **Use for**: High-performance embedded systems, IoT

* * *

### 4\. **KERIox (Rust)**

*   **Repo**: [https://github.com/WebOfTrust/keriox](https://github.com/WebOfTrust/keriox)
*   **Status**: Mature Rust implementation
*   **Use for**: Performance-critical services, Wasm targets

* * *

Supporting Libraries
--------------------

### CESR (Composable Event Streaming Representation)

*   **Spec**: [https://weboftrust.github.io/ietf-cesr/](https://weboftrust.github.io/ietf-cesr/)
*   **Implementations**:
    *   Python: `keri.core.coring`
    *   TypeScript: `signify-ts`
    *   Rust: `cesride`

**What it does**: Qualified base64 encoding for cryptographic primitives 13

* * *

### ACDC (Authentic Chained Data Containers)

*   **Spec**: [https://trustoverip.github.io/tswg-acdc-specification/](https://trustoverip.github.io/tswg-acdc-specification/)
*   **Implementations**:
    *   Python: `keri.vc.proving`
    *   TypeScript: `signify-ts` (credentials module)

**What it does**: Verifiable credentials with graduated disclosure 4

* * *

### IPEX (Issuance and Presentation Exchange)

*   **Spec**: (Part of ACDC spec)
*   **Implementations**: Built into KERIpy and Signify

**What it does**: Protocol for requesting, issuing, presenting, and verifying ACDCs

* * *

Runtime Recommendations
-----------------------

### For Witnesses (C2 Deployment)

*   **Language**: Python
*   **Runtime**: KERIpy + uvicorn (ASGI)
*   **Container**: `python:3.12-slim`
*   **Process Manager**: systemd or ECS

* * *

### For Watchers (C2 Deployment)

*   **Language**: Python or Rust
*   **Runtime**: KERIpy (stateless validation) or KERIox
*   **Deployment**: Lambda (event-driven) or ECS (long-running)

* * *

### For KERIA Agents (C2 Deployment)

*   **Language**: Python
*   **Runtime**: KERIpy + falcon (REST framework)
*   **Container**: `python:3.12`
*   **Database**: PostgreSQL (via KERIpy's LMDB wrapper)

* * *

### For Web Wallets (C1 Service)

*   **Language**: TypeScript
*   **Runtime**: Signify-TS
*   **Framework**: React/Vue/Svelte
*   **Backend**: Node.js + KERIA agent

* * *

### For Mobile Wallets (C1 Service)

*   **Language**: TypeScript (React Native) or Swift/Kotlin
*   **Runtime**: Signify-TS or KERIox (Rust → FFI)
*   **Backend**: KERIA agent

* * *

C4 Integration Pattern
----------------------

    ┌────────────────────────────────────────┐
    │  Your Application (C1 Service Layer)  │
    │  - Business logic                      │
    │  - User interface                      │
    │  - Workflows                          │
    └────────────────────────────────────────┘
                  ↓ uses
    ┌────────────────────────────────────────┐
    │  KERIpy / Signify (C3 Domain Layer)  │
    │  - AID management                      │
    │  - Event validation                    │
    │  - ACDC issuance                      │
    └────────────────────────────────────────┘
                  ↓ stores
    ┌────────────────────────────────────────┐
    │  Database (C2 Infrastructure)        │
    │  - KEL storage                        │
    │  - ACDC registry                      │
    └────────────────────────────────────────┘
    

* * *

C4 Design Questions for AI Systems
----------------------------------

When an AI is choosing libraries/runtime:

**Q1**: "What is the target deployment environment (cloud, edge, browser)?"  
**Q2**: "What are the performance requirements?"  
**Q3**: "What is the team's language expertise?"  
**Q4**: "Are there existing dependencies/constraints?"  
**Q5**: "Is the library actively maintained?"  
**Q6**: "Does it support the required KERI features?"  
**Q7**: "What is the licensing model?"

* * *

🎯 Putting It All Together: Example Scenarios
=============================================

Scenario 1: Building an "Identity Protection Service" (C1)
----------------------------------------------------------

### C0 Context

*   **Industry**: Financial services
*   **Governance**: Need to comply with KYC/AML but preserve privacy
*   **Credential types**: Government ID verification, proof of address

### C1 Service Definition

*   **Service name**: "VerifyMe"
*   **Human value prop**: "Prove your identity without sharing documents"
*   **Business model**: $5/month subscription

### C2 Infrastructure (AWS)

*   CloudFormation stack: `verifyme-production`
*   Components:
    *   KERIA agent (ECS Fargate)
    *   Witness pool (3 witnesses, multi-region)
    *   Watcher network (Lambda-based)
    *   ACDC registry (DynamoDB)
    *   User portal (CloudFront + S3)

### C3 Domain Logic

*   KERIA agent for AID management
*   ACDC issuance for ID credentials
*   Graduated disclosure for selective attribute sharing
*   TEL for revocation management

### C4 Runtime

*   Backend: KERIpy + PostgreSQL
*   Frontend: React + Signify-TS
*   Mobile: React Native + Signify-TS

* * *

Scenario 2: Building a "Portable Reputation Network" (C1)
---------------------------------------------------------

### C0 Context

*   **Industry**: Gig economy / marketplaces
*   **Governance**: Multi-platform reputation portability
*   **Credential types**: Task completion, peer reviews, skill certifications

### C1 Service Definition

*   **Service name**: "TrustScore"
*   **Human value prop**: "Your reputation follows you everywhere"
*   **Business model**: Platform integration fees

### C2 Infrastructure (AWS)

*   Multi-tenant KERIA agents (ECS)
*   Shared witness pool (DynamoDB global tables)
*   Judge + Jury service (Step Functions)
*   API Gateway for platform integrations

### C3 Domain Logic

*   Chained ACDCs (review → aggregated score)
*   Multi-issuer reputation (from different platforms)
*   Graduated disclosure (prove score without revealing reviews)

### C4 Runtime

*   Backend: KERIpy
*   SDK: Signify-TS (for platform integration)
*   Mobile: Native iOS/Android with KERIox FFI

* * *

🧠 Final AI System Instructions
===============================

When an AI is building in the KERI ecosystem:
---------------------------------------------

### Step 1: Identify the C-level

"Am I designing governance, services, infrastructure, domain logic, or code?"

### Step 2: Use the appropriate abstractions

*   **C0**: Think in terms of credentials, trust frameworks, participants
*   **C1**: Think in terms of human services, value propositions, workflows
*   **C2**: Think in terms of AWS services, CloudFormation, deployment
*   **C3**: Think in terms of KERI primitives (AID, KEL, ACDC, witness, watcher)
*   **C4**: Use existing libraries (KERIpy, Signify), don't reinvent

### Step 3: Compose upwards

*   C3 domain logic composes into C2 infrastructure
*   C2 infrastructure composes into C1 services
*   C1 services participate in C0 ecosystems

### Step 4: Validate against KERI principles

*   **Authenticity**: All claims must be cryptographically verifiable
*   **Duplicity detection**: Must support ambient verifiability 2
*   **Self-sovereignty**: Controllers must control their own keys
*   **Portability**: Credentials must work across platforms
*   **Privacy**: Support graduated disclosure

* * *

📚 Reference Materials
======================

Essential KERI Specs
--------------------

1.  **KERI Whitepaper**: [https://github.com/SmithSamuelM/Papers/blob/master/whitepapers/KERI\_WP\_2.x.web.pdf](https://github.com/SmithSamuelM/Papers/blob/master/whitepapers/KERI_WP_2.x.web.pdf)
2.  **KERI Spec**: [https://weboftrust.github.io/ietf-keri/](https://weboftrust.github.io/ietf-keri/)
3.  **CESR Spec**: [https://weboftrust.github.io/ietf-cesr/](https://weboftrust.github.io/ietf-cesr/)
4.  **ACDC Spec**: [https://trustoverip.github.io/tswg-acdc-specification/](https://trustoverip.github.io/tswg-acdc-specification/)

Implementation Guides
---------------------

*   **KERIpy Docs**: [https://github.com/WebOfTrust/keripy](https://github.com/WebOfTrust/keripy)
*   **Signify Docs**: [https://github.com/WebOfTrust/signify-ts](https://github.com/WebOfTrust/signify-ts)
*   **KERIA Docs**: [https://github.com/WebOfTrust/keria](https://github.com/WebOfTrust/keria)

Community Resources
-------------------

*   **KERI Suite Glossary**: [https://weboftrust.github.io/WOT-terms/](https://weboftrust.github.io/WOT-terms/)
*   **KERI Docs**: [https://weboftrust.github.io/keridoc/](https://weboftrust.github.io/keridoc/)

* * *

This comprehensive guide provides AI systems with the full architectural context needed to build correctly within the KERI ecosystem, from ecosystem governance down to code libraries, with special focus on AWS deployments at the C2 level.