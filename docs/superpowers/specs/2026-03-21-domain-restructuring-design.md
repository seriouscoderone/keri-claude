# Domain Restructuring: Adoptable DDD for the KERI Ecosystem

**Date:** 2026-03-21
**Status:** Approved (conversation-validated)

## Problem

The current domain decomposition in `rdod/spec/domains/` uses KERI specification vocabulary — mechanical names derived from data structures and protocol mechanisms. This makes the domain model inaccessible to adopters. Names like `event-log`, `tel`, `ipex`, `duplicity-detection`, and `cesr-stream` describe implementation artifacts, not domain concepts.

The KERI specification must be **encapsulated** inside understandable domain concepts. The spec stays faithful — nothing is lost — but the domain boundaries and names should answer "what problem am I solving?" not "what data structure is this?"

## Design Principle

> The spec describes HOW. Domains describe WHY.

Each domain is named for the **job it does**, not the **mechanism it uses**. Spec terms (KEL, TEL, IPEX, OOBI, KAWA, KRAM) live inside domains as implementation vocabulary, not as domain names.

## Full Domain Map

### Protocol Layer

```
cesr/                              # How data is encoded
  primitives/                      #   Self-describing cryptographic types
  composition/                     #   Composing primitives into messages

keri/                              # How you prove who you are
  identity/                        #   Create and manage identifiers
    establishment                  #     inception, rotation
    key-commitment                 #     pre-rotation (future key safety)
    thresholds                     #     multi-sig requirements
    state                          #     current key configuration
    anchoring                      #     binding data to your identifier
  delegation/                      #   Hierarchical trust
    authorization                  #     delegator approves/denies
    lifecycle                      #     delegated inception/rotation
    recovery                       #     superseding rules
  accountability/                  #   Others can verify your claims
    receipting                     #     witnesses sign what they saw
    consensus                      #     enough witnesses agree (KAWA)
    dissemination                  #     spreading events to validators
  integrity/                       #   Detecting and recovering from compromise
    detection                      #     finding forks in event logs
    evidence                       #     collecting proof of duplicity
    recovery                       #     honest controller wins

acdc/                              # How you prove what's true about you
  credential-lifecycle/            #   Issue, track, revoke credentials
    status                         #     active or revoked?
    verification                   #     ACDC → TEL → KEL chain
    registry                       #     creating/managing registries
  credential-exchange/             #   Share credentials with others
    negotiation                    #     apply/offer/agree/grant/admit
    proof                          #     Proof of Issuance, Proof of Disclosure
  privacy/                         #   Control what you reveal
    disclosure                     #     graduated: compact → partial → full
    blinding                       #     hidden credential status
    aggregation                    #     selective disclosure mechanics

discovery/                         # How you find others (was: oobi)
```

### Service Layer

```
cloud-agent-service/               # Hosted identity management
  api/                             #   3 ports: boot, admin, message router
  provisioning/                    #   multi-tenant agent lifecycle
  processing/                      #   async pipeline orchestration

witness-service/                   # Accountability infrastructure
  api/                             #   receives events, returns receipts

watcher-service/                   # Integrity infrastructure
  api/                             #   collects KELs, reports duplicity
```

### Application Layer

```
signify-client/                    # Thin wallet — keys at the edge
  key-management/                  #   passcode, keepers, tiers
  resources/                       #   API surface for identifiers, credentials

local-agent/                       # Fat wallet — everything local
  api/                             #   CLI + direct interface
```

## Rename Mapping

### keri/ subdomains

| Old Path | New Path | Rationale |
|---|---|---|
| `keri/event-log` | `keri/identity` | The KEL implements identity management. Identity is the concept. |
| `keri/event-log/validation` | `keri/identity/establishment` | Validation isn't standalone — you validate establishments, anchors, etc. |
| `keri/event-log/escrow` | **eliminated** | Escrow is an implementation pattern, not a domain concept. |
| `keri/event-log/serialization` | **eliminated** | Wire format belongs in `cesr/`. |
| `keri/event-log/storage` | **eliminated** | Infrastructure concern — every domain stores things. |
| `keri/key-state` | `keri/identity/state` | Key state IS identity state — who controls this AID right now. |
| `keri/key-state/commitment` | `keri/identity/key-commitment` | Pre-rotation: commit to next keys for recovery. |
| `keri/key-state/thresholds` | `keri/identity/thresholds` | Multi-sig: how many keys must sign. |
| `keri/key-state/tracking` | `keri/identity/state` | Merged — Kever tracks current state. That's just "state." |
| `keri/witness-agreement` | `keri/accountability` | Witnesses exist to make you accountable. |
| `keri/witness-agreement/consensus` | `keri/accountability/consensus` | Kept. |
| `keri/witness-agreement/receipting` | `keri/accountability/receipting` | Kept. |
| `keri/witness-agreement/dissemination` | `keri/accountability/dissemination` | Kept. |
| `keri/duplicity-detection` | `keri/integrity` | Positive framing — the goal is integrity, not just detection. |
| `keri/duplicity-detection/evidence` | `keri/integrity/evidence` | Kept. |
| `keri/duplicity-detection/monitoring` | `keri/integrity/detection` | Renamed for clarity. |
| `keri/duplicity-detection/recovery` | `keri/integrity/recovery` | Kept. |

### keri/ new subdomains

| New Path | Content |
|---|---|
| `keri/identity/establishment` | Inception and rotation events. Creating and changing identity. |
| `keri/identity/key-commitment` | Pre-rotation. Committing to future keys for recovery. |
| `keri/identity/thresholds` | Multi-sig requirements and threshold satisfaction. |
| `keri/identity/state` | Current key configuration. What Kever tracks. |
| `keri/identity/anchoring` | Interaction events. Binding data to your identifier via seals. |
| `keri/delegation/authorization` | Delegator approves or denies. Cooperative delegation. |
| `keri/delegation/lifecycle` | Delegated inception and rotation. |
| `keri/delegation/recovery` | Superseding rules when delegation goes wrong. |

### acdc/ subdomains

| Old Path | New Path | Rationale |
|---|---|---|
| `acdc/tel` | `acdc/credential-lifecycle` | TEL is an acronym. The concept is managing a credential's life. |
| `acdc/tel/state` | `acdc/credential-lifecycle/status` | "Status" is universally understood. |
| `acdc/tel/validation` | `acdc/credential-lifecycle/verification` | Verifying the ACDC → TEL → KEL chain. |
| `acdc/tel/storage` | **eliminated** | Infrastructure concern. |
| `acdc/tel/blinding` | `acdc/privacy/blinding` | Blinding is a privacy concern — moved to privacy parent. |
| `acdc/ipex` | `acdc/credential-exchange` | IPEX is an acronym. The concept is exchanging credentials. |
| `acdc/ipex/negotiation` | `acdc/credential-exchange/negotiation` | Kept. |
| `acdc/ipex/verification` | `acdc/credential-exchange/proof` | Proof of Issuance, Proof of Disclosure. |
| `acdc/ipex/messaging` | **absorbed into negotiation** | EXN construction is plumbing. The negotiation steps ARE the messages. |
| `acdc/disclosure` | `acdc/privacy` | Disclosure is the mechanism. Privacy is the concern. |
| `acdc/disclosure/modes` | `acdc/privacy/disclosure` | The modes ARE disclosure. |
| `acdc/disclosure/privacy` | **absorbed into parent** | Privacy levels are the parent concept now. |
| `acdc/disclosure/aggregation` | `acdc/privacy/aggregation` | Selective disclosure mechanics. |

### acdc/ new subdomains

| New Path | Content |
|---|---|
| `acdc/credential-lifecycle/registry` | Creating and managing credential registries (vcp/vrt events). |

### Other domains

| Old Path | New Path | Rationale |
|---|---|---|
| `oobi` | `discovery` | OOBI is protocol jargon. Discovery is the job. |
| `cesr/cesr-primitives` | `cesr/primitives` | Drop redundant prefix. |
| `cesr/cesr-stream` | `cesr/composition` | Primitives compose into messages. |

### New subdomains

| New Path | Content |
|---|---|
| `witness-service/api` | Inbound message boundary — receives events, returns receipts. |
| `watcher-service/api` | Inbound message boundary — collects KELs, reports duplicity. |
| `local-agent/api` | CLI and direct function interface. |

## Domains Eliminated

| Domain | Reason |
|---|---|
| `*/storage` | Infrastructure — every domain stores things. Not a domain concept. |
| `keri/event-log/serialization` | CESR's job. Wire format is encoding, not identity. |
| `keri/event-log/escrow` | Implementation pattern. Events wait in escrow inside each domain that needs them. |
| `acdc/ipex/messaging` | Plumbing. The negotiation steps (apply/offer/agree/grant/admit) ARE the messages. |
| `acdc/disclosure/modes` | Absorbed into `acdc/privacy/disclosure`. The modes are disclosure. |
| `acdc/disclosure/privacy` | Absorbed into parent `acdc/privacy`. Privacy levels are the parent concept. |
| `agent` (deprecated) | Already deprecated — superseded by cloud-agent-service, signify-client, local-agent. |

## Cross-cutting Concerns

These are NOT domains. They are implementation details encapsulated inside each service's `api/` subdomain:

- **KRAM** (replay protection) — configured and injected by each service. Cloud Agent Service decides cache windows; Witness Service may not need it (KEL events have built-in ordering).
- **CESR deserialization** — every API deserializes inbound CESR messages.
- **Signature verification** — every API verifies signatures against key state.
- **Message dispatch** — every API routes messages to domain handlers by ilk/route.

The KERI spec defines the rules for these. Each service enforces them at its API boundary. This is the integration seam where services consume the KERI protocol as an adjacent context.

## Adopter Narrative

> **CESR** is how all data is encoded — self-describing cryptographic primitives that compose into messages.
>
> **KERI** gives you a cryptographic **identity** you control, with **delegation** for hierarchical trust, **accountability** through witnesses, and **integrity** through watchers.
>
> **ACDC** lets you issue **credentials** that prove things about your identity, **exchange** them with others through structured negotiation, and protect **privacy** through graduated disclosure.
>
> **Discovery** bootstraps it all — finding other identifiers' endpoints so you can start communicating.
>
> You deploy this via **services** (cloud agents, witnesses, watchers) and interact through **applications** (thin wallets that keep keys safe at the edge, or fat wallets that run everything locally).

## Implementation Plan

1. Rename directories in `rdod/spec/domains/` to match new structure
2. Update each `domain.yaml` with new name, description, and adopter-centric framing
3. Update all `domain://` URI references across all YAML files
4. Update `verification.yaml` files (content unchanged, just path references)
5. Add new `api/` subdomain YAMLs to witness-service, watcher-service, local-agent
6. Create new leaf domains (identity/establishment, identity/anchoring, delegation/authorization, delegation/lifecycle, credential-lifecycle/registry)
7. Update README.md domain map
8. Regenerate context-map.html
