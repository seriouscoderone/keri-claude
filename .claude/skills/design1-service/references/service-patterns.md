# C1 Service Patterns

Four canonical patterns for human-facing KERI services. Each pattern describes
what the service looks like to humans, what KERI infrastructure powers it,
typical business models, and which C2 stacks are required.

---

## Pattern 1: Identity Lifecycle Service

**Human-Facing Name:** "Secure Digital Identity Management"

### What It Does (Human Terms)
- Issues you a cryptographic identity
- Helps you recover if you lose your device
- Protects you from identity theft
- Lets you prove who you are without revealing private data

### What It Provides (KERI Terms)
- AID creation + KEL hosting via KERIA agent
- Witness pool management for event receipting
- Backup/recovery via delegation chains
- Credential wallet hosting (KERIA)
- Watcher network access for ambient verifiability

### Business Models
| Model | Description |
|-------|-------------|
| Freemium | Basic witness hosting free, premium recovery services paid |
| Enterprise | White-label identity infrastructure, per-seat licensing |
| Per-transaction | Credential issuance fees per credential created |

### Required C2 Stacks
| Stack | Purpose |
|-------|---------|
| `agent-service` | KERIA deployment for AID management and wallet |
| `witness-pool` | Event receipting and first-seen validation |
| `frontend` | User-facing web/mobile interface |

### Service Mapping

| C1 Service | C3 KERI Components | C2 Infrastructure |
|------------|-------------------|-------------------|
| Identity creation | AID inception, KEL hosting | KERIA deployment, witness cluster |
| Device recovery | Delegation, key rotation | Agent service, backup storage |
| Identity proof | Credential presentation, graduated disclosure | Watcher network, cache layer |
| Theft protection | Duplicity detection, pre-rotation | Watcher nodes, witness pool |

---

## Pattern 2: Credential Verification Service

**Human-Facing Name:** "Instant Background Checks" / "Credential Validation"

### What It Does (Human Terms)
- Verifies someone's credentials in real-time
- No centralized database lookups needed
- Privacy-preserving: only get yes/no, not raw data
- Provides an audit trail of verification requests

### What It Provides (KERI Terms)
- Watcher network access for KEL verification
- ACDC validation service for credential checking
- Judge/jury service for duplicity evidence aggregation
- Graduated disclosure protocol handling (selective attribute reveal)

### Business Models
| Model | Description |
|-------|-------------|
| Per-verification API | Pay per API call, tiered volume pricing |
| Enterprise subscription | Bulk verification for large organizations |
| Premium | Enhanced duplicity protection, faster SLAs |

### Required C2 Stacks
| Stack | Purpose |
|-------|---------|
| `watcher-node` | KEL monitoring and duplicity detection |
| `judge-jury` | Evidence aggregation and judgment |
| `frontend` | Verification portal and API dashboard |

### Service Mapping

| C1 Service | C3 KERI Components | C2 Infrastructure |
|------------|-------------------|-------------------|
| Real-time verification | KEL validation, ACDC verification | Watcher network, cache layer |
| Privacy-preserving checks | Graduated disclosure, selective reveal | API gateway, disclosure engine |
| Audit trail | TEL anchoring, event logging | Append-only log, archive storage |
| Fraud detection | Duplicity detection, evidence collection | Judge/jury service, alert system |

---

## Pattern 3: Marketplace Trust Service

**Human-Facing Name:** "Portable Reputation System"

### What It Does (Human Terms)
- Build reputation that works across platforms
- Take your reviews and ratings with you when you leave
- Prove experience without revealing client names
- Reputation cannot be faked or bought

### What It Provides (KERI Terms)
- ACDC issuance for reputation events (reviews, completions, ratings)
- TEL-backed state management for reputation score tracking
- Multi-issuer reputation aggregation via chained ACDCs
- Zero-knowledge/graduated disclosure for sensitive reputation data

### Business Models
| Model | Description |
|-------|-------------|
| Platform integration | Fees charged to platforms that integrate reputation APIs |
| Premium portability | Users pay to export/import reputation across platforms |
| Verified badges | Premium credential badges for verified professionals |

### Required C2 Stacks
| Stack | Purpose |
|-------|---------|
| `agent-service` | KERIA for AID management and credential wallet |
| `acdc-registry` | Credential issuance, TEL tracking, revocation |
| `witness-pool` | Event receipting for reputation events |
| `frontend` | User reputation dashboard, platform integration portal |

### Service Mapping

| C1 Service | C3 KERI Components | C2 Infrastructure |
|------------|-------------------|-------------------|
| Reputation building | ACDC issuance per event, TEL anchoring | ACDC registry, witness cluster |
| Cross-platform portability | Multi-issuer ACDC chaining | Agent service, aggregation engine |
| Privacy-preserving proof | Graduated disclosure, selective reveal | Disclosure engine, API gateway |
| Anti-fraud | Duplicity detection, witness consensus | Watcher network, witness pool |

---

## Pattern 4: Compliance-as-a-Service

**Human-Facing Name:** "Automated Regulatory Compliance"

### What It Does (Human Terms)
- Prove compliance without invasive audits
- Real-time compliance monitoring and alerting
- Privacy-preserving regulatory reporting
- Immutable audit trails that cannot be tampered with

### What It Provides (KERI Terms)
- ACDC-based compliance certificates issued by authorized auditors
- KEL/TEL anchoring for tamper-evident audit trails
- Automated schema validation against regulatory requirement schemas
- Watcher network for tamper-evidence and duplicity detection

### Business Models
| Model | Description |
|-------|-------------|
| Per-company subscription | Monthly/annual compliance monitoring per organization |
| Per-audit fees | On-demand proof generation and compliance reports |
| Regulatory body licensing | Licensed to regulatory bodies for automated oversight |

### Required C2 Stacks
| Stack | Purpose |
|-------|---------|
| `acdc-registry` | Compliance certificate issuance and revocation |
| `watcher-node` | Tamper-evidence monitoring and duplicity detection |
| `agent-service` | KERIA for organization AID management |
| `frontend` | Compliance dashboard, reporting portal |

### Service Mapping

| C1 Service | C3 KERI Components | C2 Infrastructure |
|------------|-------------------|-------------------|
| Compliance certification | ACDC issuance, schema validation | ACDC registry, validation engine |
| Audit trail | KEL/TEL anchoring, event logging | Append-only storage, witness pool |
| Real-time monitoring | Watcher network, event subscription | Watcher nodes, alert system |
| Regulatory reporting | Proof generation, graduated disclosure | Report generator, API gateway |
