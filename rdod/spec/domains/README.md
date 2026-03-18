# KERI Ecosystem — Domain Specification

## System Description

KERI (Key Event Receipt Infrastructure) is a decentralized key management protocol and ecosystem for self-sovereign identity. Controllers hold private keys and generate cryptographically signed, append-only Key Event Logs (KELs) that establish and transfer control authority over Autonomic Identifiers (AIDs). Pre-rotation commits to future keys before rotation, providing post-quantum resistant recovery from key compromise. Witnesses receipt events under a first-seen consensus rule (KAWA). Watchers monitor for duplicity — inconsistent event histories that constitute a provable breach. CESR (Composable Event Streaming Representation) provides the encoding layer: self-framing, composable primitives with lossless text/binary conversion. ACDC (Authentic Chained Data Containers) provides the credential layer: cryptographically authenticatable credentials with graduated disclosure, chained via edges, with lifecycle managed by Transaction Event Logs (TELs). IPEX negotiates credential exchange. OOBIs bootstrap discovery. Agent infrastructure (KERIA + Signify) separates cloud hosting from edge signing — private keys never leave the controller.

## Domain Map

```mermaid
graph TD
    agent["agent<br/><i>Client: Agent Architecture</i>"]
    keri["keri<br/><i>Core: Key Management Protocol</i>"]
    cesr["cesr<br/><i>Core: Composable Encoding</i>"]
    acdc["acdc<br/><i>Core: Credential Framework</i>"]
    oobi["oobi<br/><i>Adjacent: Discovery</i>"]
    crypto["cryptographic-algorithms<br/><i>Kernel</i>"]:::kernel

    agent --> keri
    agent --> acdc
    agent --> oobi
    keri -. "OHS+PL" .-> cesr
    acdc -. "OHS+PL" .-> cesr
    keri -. "Partnership" .-> acdc
    keri -. "Partnership" .-> oobi

    subgraph "keri subdomains"
        ks["key-state"]
        el["event-log"]
        wa["witness-agreement"]
        dd["duplicity-detection"]
        dl["delegation"]
    end
    keri --> ks
    keri --> el
    keri --> wa
    keri --> dd
    keri --> dl

    subgraph "cesr subdomains"
        cp["cesr-primitives"]
        cs["cesr-stream"]
    end
    cesr --> cp
    cesr --> cs

    subgraph "acdc subdomains"
        disc["disclosure"]
        tel["tel"]
        ipex["ipex"]
    end
    acdc --> disc
    acdc --> tel
    acdc --> ipex

    subgraph "agent subdomains"
        es["edge-signing<br/><i>(Signify)</i>"]
        ch["cloud-hosting<br/><i>(KERIA)</i>"]
    end
    agent --> es
    agent --> ch
    es -. "Customer-Supplier" .-> ch

    keri -.-> crypto
    cesr -.-> crypto
    es -.-> crypto

    classDef kernel fill:#f0e6ff,stroke:#7c3aed
```

## Domains

| ID | Name | Role | Status | Terms | Description |
|----|------|------|--------|-------|-------------|
| `keri` | KERI Protocol | core | complete | 18 | Hab/Habery, Kevery, Baser, Parser, escrow architecture |
| `keri/key-state` | Key State | subdomain | complete | 20 | Kever/IdentifierState, KeyConfig, WitnessConfig, state reconstruction |
| `keri/event-log` | Event Log | subdomain | complete | 16 | KEL, 5 event types, SAID, seals, field basics (orchestrates 4 sub-subdomains) |
| `keri/event-log/validation` | Event Validation | sub-subdomain | complete | 8 | Pipeline, dual threshold, pre-rotation binding, delegation validation |
| `keri/event-log/escrow` | Event Escrow | sub-subdomain | complete | 11 | Cascade, 7 escrow types, processing order, timeouts, sig accumulation |
| `keri/event-log/serialization` | Event Serialization | sub-subdomain | complete | 9 | SerderKERI, field structure, creation functions, seal types, quorum |
| `keri/event-log/storage` | Event Storage | sub-subdomain | complete | 10 | KEL schema, first-seen ordering, idempotent logging, key patterns |
| `keri/witness-agreement` | Witness Agreement | subdomain | complete | 19 | TOAD, receipt types/escrows, WitnessReceiptGenerator, BFT quorum |
| `keri/duplicity-detection` | Duplicity Detection | subdomain | complete | 20 | Fork detection, LDE/DEL storage, notification bus |
| `keri/delegation` | Delegation | subdomain | complete | 20 | Seal source, PDE/delegables escrow, approved seals, validation pipeline |
| `cesr` | CESR Encoding | core | complete | 20 | Composable Event Streaming Representation — encoding layer |
| `cesr/cesr-primitives` | CESR Primitives | subdomain | complete | 34 | Matter/Indexer traits, Verfer–Cipher, Sadder/Serder/Creder, Tholder |
| `cesr/cesr-stream` | CESR Stream | subdomain | complete | 24 | Count codes, 12 concrete group types, parser dispatch, round-trip serialization |
| `acdc` | ACDC Credentials | core | complete | 27 | SerderACDC/Creder, Schemer, Verifier, credential indexing/artifacts |
| `acdc/disclosure` | Disclosure | subdomain | complete | 18 | Compactor, SAD path signatures, graduated partial disclosure |
| `acdc/tel` | Transaction Event Log | subdomain | complete | 25 | Regery/Tever/Tevery/Reger, credential/registry state, TEL escrows |
| `acdc/ipex` | IPEX Exchange | subdomain | complete | 18 | IpexHandler, Exchanger, message construction, grant artifacts |
| `oobi` | Out-of-Band Introduction | adjacent | complete | 6 | Bootstrap discovery, BADA endpoint authorization |
| `agent` | Agent Infrastructure | client | complete | 4 | Edge/cloud separation, Signify protocol contract |
| `agent/edge-signing` | Edge Signing (Signify) | subdomain | complete | 22 | Controller-side: keepers, tiers, derivation paths, resource API, operations |
| `agent/cloud-hosting` | Cloud Hosting (KERIA) | subdomain | complete | 20 | Server-side: HIO doers, escrows, long-running ops, seeker, registrar |

## Source Material

| Type | Reference |
|------|-----------|
| document | keri-specification.md — KERI protocol specification (ToIP/IETF) |
| document | cesr-specification.md — CESR encoding specification |
| document | acdc-specification.md — ACDC credential specification |
| document | KERI_WP_2.x.web.md — KERI whitepaper v2.x |
| document | KERI_Overview.web.md — KERI protocol overview |
| document | KERI_SecurityDeepDive.web.md — security analysis |
| document | IdentifierTheory_web.md — universal identifier theory |
| document | SPAC_Message.md — privacy, authenticity, confidentiality |
| document | KERIArchGroupIssuance.md — group issuance architecture |
| document | vlei-llm-doc.md — vLEI credential ecosystem |
| document | vlei-trainings-llm-context.md — vLEI training materials |
| document | keridoc-llms-full.md — KERI documentation suite |
| document | KERIVerifiableTrustBases.web.md — verifiable trust bases |

## Skipped Domains (by user request)

| ID | Reason |
|----|--------|
| `vlei` | Application-level governance ecosystem — out of scope for protocol spec |
| `trust-model` | Foundational theory (PAC, trust bases) — not a bounded domain |
| `identifier-theory` | Foundational theory (AID/LID, Zooko) — not a bounded domain |

## Open Questions

- **TEL vs KERI relationship:** TEL anchors to the issuer's KEL, creating a tight coupling. Is TEL better modeled as an ACDC subdomain (current) or a KERI-adjacent domain?
- **OOBI scope:** Currently minimal. As endpoint authorization (BADA) grows in complexity, OOBI may need its own subdomains.
- **Cross-implementation language drift:** Terms like "Hab" (keripy), "Controller" (keriox), and "SignifyClient" (signify-ts) differ across implementations. The spec uses protocol-level terms; implementation-specific terms are not captured here.
