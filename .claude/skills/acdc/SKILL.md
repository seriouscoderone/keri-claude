---
name: acdc
description: >
  ACDC (Authentic Chained Data Containers) specification for verifiable credential
  and data provenance implementations. Activates when working on ACDC credential
  construction/validation, schema anchoring, attribute/aggregate/edge/rule sections,
  graduated disclosure (partial, selective, full), IPEX exchange protocol, TEL
  registries (issuance, revocation, blinded state), bulk issuance, or ACDC CESR
  native encoding. Covers all ACDC message types, section types, field ordering,
  and the composable identity graph model.
---

# ACDC Protocol Specification Skill

ACDC defines authenticatable, chainable data containers for verifiable credentials and data provenance. Built on KERI (identifiers/key state) and CESR (encoding), ACDCs provide granular proof-of-authorship via DAGs of linked containers with graduated disclosure and contractual protection.

## Architecture (5 Layers)

1. **Structural** — Immutability + identity: SAID, schema binding, deterministic serialization, variants
2. **Semantic Graph** — Composable identity graph: Attribute, Aggregate, Edge, Rule sections
3. **Contractual Governance** — Regulated exchange: disclosure mechanisms, exploitation protection, IPEX
4. **Lifecycle/State** — Temporal state: TEL registries, issuance, revocation, blinded state
5. **Crypto/Transport** — Cryptographic objects: selective disclosure, bulk issuance, CESR native encoding

## Top-Level Fields

When present, fields MUST appear in order: `[v, t, d, u, i, rd, s, a, A, e, r]`. Required: `[v, d, i, s]`. Mutually exclusive: `a` (attributes) vs `A` (aggregate).

## Message Types

**ACDC:** `acm` (field map), `act` (fixed fields + attribute), `acg` (fixed fields + aggregate). **Registry TEL:** `rip` (registry inception), `upd` (update). **Sections:** `sch`, `att`, `agg`, `edg`, `rul`.

## Reference Files

- **acdc-structure.md** — Top-level fields, reserved fields, version string, SAID/UUID/AID fields, ACDC variants (public/private/metadata/compact/targeted/untargeted), schema section (type-is-schema, immutable, versioning, composable JSON schema), most compact form SAID algorithm
- **sections.md** — Attribute section (4 variants, compact form, disclosure rules), Aggregate section (AGID computation, selective disclosure, inclusion proof), Edge section (edge-group, edge, operators, graph fragments), Rule section (rule-group, rule, Ricardian contracts)
- **disclosure-ipex.md** — Graduated disclosure (metadata→partial→selective→full), exploitation model, chain-link confidentiality, contractually protected disclosure, IPEX protocol (non-normative: routes, state machine, validation), ACDC state binding
- **tel-registry.md** — TEL architecture, registry events (rip/bup/upd), field reference, BLID computation, blinded attribute blocks, blinded state disclosure, bound blinded blocks, 4 registry patterns, 5 state machines
- **issuance-encoding.md** — Crypto strength, selective disclosure tiers, bulk issuance (basic, independent AID, independent registry), ACDC message types table, CESR native formats (field map vs fixed fields, count codes, emptiness codes), section messages, extensibility

## Key Invariants

- ACDCs use insertion-ordered field maps; MUST support JSON, CBOR, MGPK, CESR
- Every block with a `d` field is SAIDed; replacing a block with its `d` value = compact form
- `u` field (UUID salt) enables privacy; without `u`, SAID provides compactness only
- Schema MUST be static/immutable — `$id` MUST be a bare SAID
- Edge `n` field distinguishes edges from edge-groups; MUST have `n` = edge, MUST NOT = edge-group
- Rule `l` field is REQUIRED in every Rule block (legal language)
- TEL events MUST be sealed in the Issuer's KEL via transaction event seals
- IPEX section is explicitly non-normative (baseline for ecosystem-specific protocols)
