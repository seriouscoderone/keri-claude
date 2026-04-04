# Implementation Plan Template

For each domain in the layer, read ALL spec files and produce a plan covering these sections.

## Spec Files to Read Per Domain

For each domain `{d}`, read (all paths relative to `rdod/spec/domains/`):

1. `{d}/domain.yaml` -- identity, neighbors, published language, domain_clients
2. `{d}/ubiquitous-language.yaml` -- canonical terms, imports, specializations, events, rules
3. `{d}/ports.yaml` -- inbound + outbound port interfaces
4. `{d}/types.yaml` -- data structures with fields, constraints, variants, invariants
5. `{d}/errors.yaml` -- typed errors with cause, recovery, severity, recovery_target
6. `{d}/verification.yaml` -- invariants, state machines, validation_constraints DAGs, port contracts
7. `{d}/protocols.yaml` (if exists) -- cross-domain orchestration sequences

Also read once: `packaging.yaml`, `integration-scenarios.yaml`, `build-order.txt`.

## Planning Sections

### A. Types and Data Structures

For each type in `types.yaml`:
1. Plan type/struct/class with all fields, constraints, variants
2. Multiple variants: discriminated union (Rust enum, TS union, Python dataclass hierarchy)
3. `constraints.enum`: language-native enum
4. `types://` URIs from other domains: imports from already-implemented packages
5. **Builder pattern**: any type with 3+ optional fields or dimensional variants MUST have a typed Builder. Builders produce correct field maps -- adopters never construct raw field maps directly.

### B. Naming Conventions

1. **Adopter-centric names**: use UL term names, NOT spec-mechanism names
2. **No implementation-specific names**: no keripy class names, no LMDB subdatabase names
3. **KERI gerund-agent pattern** (protocol-level code): modules as gerunds, classes as agent nouns, code tables as `-Dex`, transforms as `-ify`
4. **Published language boundary**: terms in `published_language:` are the domain's public API

### C. Port Interfaces

1. **Inbound ports**: Application Service classes/modules with methods from `contract:`
2. **Outbound Repository ports**: trait/interface/protocol with methods from `contract:` and `invariants:` as assertions
3. **Outbound Adapter ports**: trait/interface referencing `external://` abstractions
4. Verify each type referenced in port contracts exists in types.yaml, errors.yaml, or UL
5. Port IDs follow: `port://{domain}/{direction}/{name}`

### D. Error Handling

1. Plan error types with `cause`, `context`, and `recovery` strategy
2. `recovery: "escrow"` MUST include `recovery_target` routing
3. `recovery: "abort"` -- terminal (exceptions/panics/Result::Err)
4. `recovery: "retry"` -- transient (retry logic at caller)
5. Map each error to the port operation that produces it

### E. Verification and Invariants

1. **State machines**: FSM with all states, transitions, guards, rejection paths. Missing transitions = bugs.
2. **validation_constraints**: pipeline respecting `depends_on` ordering. Each constraint has `on_failure` (reject, escrow, ignore).
3. **Property-based test expressions**: specification-grade pseudocode. Read invariant + expression to understand WHAT to test, then plan tests in target language.
4. **Port contracts (pre/postconditions)**: assertions at port boundaries -- defensive at inbound, trusting at outbound.

### F. Cross-Domain Protocols

1. Plan orchestration sequence with typed step inputs/outputs
2. Each step references a port -- call through port interface
3. Plan failure paths explicitly -- every `failure_paths` entry needs a handler
4. Sub-steps with conditions are conditional branches

### G. Kernel Adoption

1. `kernel://cesr` domains use CESR types (Matter, Verfer, Diger, Siger) directly -- no wrapping
2. `kernel://keri-messaging` domains use message types (exn, qry, rpy) and KRAM auth directly
3. Kernel types appear unchanged in domain's public surface -- plan imports, not adapters

### H. Integration Scenario Assertions

1. Check `integration-scenarios.yaml` for scenarios involving this domain
2. Each `end_state_assertions` entry is a test assertion -- plan integration tests
3. `EscrowCascade_full_pipeline` is most complex -- plan escrow routing carefully if participating

### I. v2 TEL Model (credential domains only)

1. Normative event types: `rip` (registry inception), `bup` (blindable update), `upd` (non-blindable update)
2. `ts` field carries transaction state: `"issued"` or `"revoked"`
3. Do NOT implement v1 ilks (`vcp`, `vrt`, `iss`, `rev`, `bis`, `brv`) -- LEGACY
4. Builder: `UpdateEvent.builder().blindable().registry(regid).credential(said).state('issued').build()`

### J. Packaging Boundaries

1. Check `packaging.yaml` for which package this domain belongs to
2. Plan module/crate/package structure to match declared packages
3. Domain packages define interfaces; adapter packages implement externals
4. Service packages depend on core but not on each other

## Output Per Domain

Produce these 12 sections:

1. **Module structure** -- files/modules to create
2. **Type definitions** -- structs/enums/classes with fields
3. **Port interfaces** -- traits/interfaces/protocols
4. **Application Service** -- inbound port implementation
5. **Repository interfaces** -- outbound port traits
6. **Error types** -- error enum/hierarchy
7. **State machines** -- FSM implementations
8. **Validation pipeline** -- constraint DAG execution
9. **Builder(s)** -- typed construction interfaces for complex types
10. **Test plan** -- key properties to test
11. **Dependencies** -- imports from prior-layer domains
12. **Open questions** -- anything ambiguous needing clarification
