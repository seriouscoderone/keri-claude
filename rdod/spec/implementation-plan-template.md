# Implementation Plan: Layer {LAYER_NUMBER} — {DOMAIN_LIST}

## Context

You are planning the implementation of KERI protocol domains from a formal DDD specification. The spec is at:
`/Users/seriouscoderone/KERI/code/keri-claude/rdod/spec/domains/`

You are implementing Layer {LAYER_NUMBER} of the build order (`rdod/spec/domains/build-order.txt`). All domains in prior layers are already implemented and available as dependencies.

## Domains to plan

{DOMAIN_LIST — e.g., "cesr/composition, cesr/primitives, identity/establishment, identity/state, ..."}

## Spec files to read per domain

For EACH domain `{d}` in this layer, read these files (all paths relative to `rdod/spec/domains/`):

1. **`{d}/domain.yaml`** — identity, neighbors (kernels, adjacents, subdomains, externals), published language, domain_clients
2. **`{d}/ubiquitous-language.yaml`** — canonical terms (the ONLY source of truth for naming), imports, specializations, events, rules
3. **`{d}/ports.yaml`** — inbound ports (Application Service interfaces) and outbound ports (Repository + Adapter interfaces)
4. **`{d}/types.yaml`** — formal data structures with fields, constraints, variants, and invariants
5. **`{d}/errors.yaml`** — typed errors with cause, recovery strategy, severity, and `recovery_target` (escrow routing)
6. **`{d}/verification.yaml`** — formalized invariants, state machines, validation_constraints DAGs, port contracts
7. **`{d}/protocols.yaml`** (if exists) — cross-domain orchestration sequences with failure paths

Also read these cross-domain files ONCE:
- **`conventions.yaml`** — URI scheme grammar, Result<T,E> pattern, primitive types, external abstractions, file template rules, packaging boundaries
- **`integration-scenarios.yaml`** — end-state assertions that this domain participates in
- **`build-order.txt`** — dependency layers (verify all deps are in prior layers)

## Planning requirements — what the plan MUST cover

### A. Types and data structures

For each type in `types.yaml`:
1. Plan the type/struct/class definition with all fields, constraints, and variants
2. For types with multiple variants: plan a **discriminated union** (Rust enum, TypeScript union, Python dataclass hierarchy)
3. For types with `constraints.enum`: plan as a language-native enum
4. For types referenced via `types://` URIs from other domains: plan as imports from already-implemented packages
5. **Builder pattern**: any type with 3+ optional fields or dimensional variants MUST have a typed Builder. Reference the "Identifier Construction" and "Credential Construction" patterns in the identity and credential-lifecycle UL files. Builders produce the correct field maps — adopters never construct raw field maps directly.

### B. Naming conventions

1. **Adopter-centric names**: use the UL term names, NOT spec-mechanism names. If the UL says "Event Repository" that's the name — not "Baser" or "event_store" or "db"
2. **No implementation-specific names**: no keripy class names, no LMDB subdatabase names, no keriox names
3. **KERI gerund-agent pattern** (for protocol-level code): modules as gerunds (`coring`, `eventing`), classes as agent nouns (`Verfer`, `Diger`), code tables as `-Dex` suffix, transforms as `-ify` suffix. See `.claude/skills/keri-style/` if implementing in the KERI naming style.
4. **Published language boundary**: terms in `published_language:` are the domain's public API. Other terms are internal. Plan exports accordingly.

### C. Port interfaces

1. **Inbound ports** → plan as Application Service classes/modules with the methods from the `contract:` field
2. **Outbound Repository ports** → plan as trait/interface/protocol with the methods from `contract:` and the `invariants:` as doc-comments or test assertions. Repository implementations are in separate adapter packages — plan only the interface here.
3. **Outbound Adapter ports** (transport, crypto) → plan as trait/interface referencing `external://` abstractions in conventions.yaml
4. Every port contract references types by name — verify each type exists in types.yaml, errors.yaml, or UL terms before using it
5. Port IDs follow the URI scheme: `port://{domain}/{direction}/{name}` — preserve these as identifiers

### D. Error handling

1. For each error in `errors.yaml`: plan the error type with `cause`, `context` fields, and `recovery` strategy
2. Errors with `recovery: "escrow"` MUST include `recovery_target` routing — plan the escrow dispatch
3. Errors with `recovery: "abort"` are terminal — plan as exceptions/panics/Result::Err
4. Errors with `recovery: "retry"` are transient — plan retry logic at the caller
5. Map each error to the port operation that can produce it

### E. Verification and invariants

1. **State machines**: for each state machine in `verification.yaml`, plan the FSM with all states, transitions, guards, and rejection paths. Missing transitions = bugs.
2. **validation_constraints**: for each DAG, plan the validation pipeline respecting `depends_on` ordering. Each constraint has an `on_failure` action (reject, escrow to specific queue, or ignore).
3. **Property-based test expressions**: these are specification-grade pseudocode, not runnable tests. Read the invariant text + formal expression to understand WHAT to test, then plan tests in your target language's testing framework.
4. **Port contracts (pre/postconditions)**: plan these as assertions at port boundaries — defensive at inbound, trusting at outbound.

### F. Cross-domain protocols

1. For each protocol in `protocols.yaml`: plan the orchestration sequence with typed step inputs/outputs
2. Each step references a port — plan the call through the port interface
3. Plan failure paths explicitly — every `failure_paths` entry needs a handler
4. Sub-steps (`sub_steps:` with conditions) are conditional branches — plan as if/match

### G. Kernel adoption

1. Domains declaring `kernel://cesr` use CESR types (Matter, Verfer, Diger, Siger, etc.) directly — no wrapping, no translation layer
2. Domains declaring `kernel://keri-messaging` use message types (exn, qry, rpy) and KRAM authentication directly
3. Kernel types appear unchanged in the domain's public surface — plan imports, not adapters

### H. Integration scenario assertions

1. Check `integration-scenarios.yaml` for scenarios involving this domain
2. Each `end_state_assertions` entry for this domain is a test assertion — plan an integration test that verifies it
3. The `EscrowCascade_full_pipeline` scenario is the most complex — if this domain participates in it, plan the escrow routing carefully

### I. v2 TEL model (credential domains only)

1. The normative event types are `rip` (registry inception), `bup` (blindable update), `upd` (non-blindable update)
2. The `ts` field carries the transaction state: `"issued"` or `"revoked"`
3. Do NOT implement v1 ilks (`vcp`, `vrt`, `iss`, `rev`, `bis`, `brv`) — these are marked LEGACY in the spec
4. The Builder pattern for TEL events: `UpdateEvent.builder().blindable().registry(regid).credential(said).state('issued').build()`

### J. Packaging boundaries

1. Check `conventions.yaml` `packaging:` section for which package this domain belongs to
2. Plan module/crate/package structure to match the declared packages
3. Domain packages define interfaces; adapter packages implement externals
4. Service packages depend on core but not on each other

## Output format

For each domain in this layer, produce:

1. **Module structure** — files/modules to create
2. **Type definitions** — structs/enums/classes with fields (from types.yaml)
3. **Port interfaces** — traits/interfaces/protocols (from ports.yaml)
4. **Application Service** — the inbound port implementation (from ports.yaml + UL terms)
5. **Repository interfaces** — outbound port traits (from ports.yaml invariants)
6. **Error types** — error enum/hierarchy (from errors.yaml)
7. **State machines** — FSM implementations (from verification.yaml)
8. **Validation pipeline** — constraint DAG execution (from verification.yaml validation_constraints)
9. **Builder(s)** — typed construction interfaces for complex types
10. **Test plan** — key properties to test (from verification.yaml invariants + integration-scenarios.yaml)
11. **Dependencies** — imports from prior-layer domains
12. **Open questions** — anything ambiguous that needs clarification before implementation
