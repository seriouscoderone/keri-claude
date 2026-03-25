# Feature Request: Integration Test Scenarios for Cross-Domain Protocol Verification

## Summary

Add an `integration-scenarios.yaml` file type to the RDOD/ddd-spec template that defines cross-domain end-state assertions for each protocol. This bridges the gap between protocols.yaml (step-by-step flows) and verification.yaml (single-domain invariants) by specifying what must be TRUE across ALL participating domains after a protocol completes.

## Problem

The current spec has two verification levels:

1. **Domain-level** (verification.yaml) — invariants within a single domain. "Sequence numbers are monotonically increasing."
2. **Protocol-level** (protocols.yaml) — step ordering across domains. "Step 1 → Step 2 → Step 3."

Missing: **Integration-level** — what's the system state after a protocol completes?

An AI implementing the SingleSigInception protocol can follow the steps but has no way to verify the end result is correct across domains. Did the identity domain create a KeyState? Did accountability collect enough receipts? Did discovery publish an OOBI? Each domain's verification.yaml checks its own invariants, but nothing asserts the cross-domain outcome.

### Concrete incident

A KERI spec with 17 cross-domain protocols and 47 domains has zero cross-domain test scenarios. The keripy reference implementation has these tests — they assert concrete SAID values across identity, credential, and exchange domains in a single test function. But the spec doesn't capture the assertions, only the implementation does. An AI implementing in Rust or TypeScript would have to reverse-engineer what "success" looks like from the Python tests.

## Proposed File Type: integration-scenarios.yaml

One file at the spec root (not per-domain — these are cross-domain by definition):

```yaml
# integration-scenarios.yaml
# Cross-domain end-state assertions for protocol verification.
# Each scenario references a protocol and asserts what must be
# TRUE across all participating domains after the protocol completes.

scenarios: []
# - name: ""                    # e.g., "SingleSigInception"
#   protocol: ""                # protocols://domain#ProtocolName
#   description: ""             # what this scenario verifies
#   setup:
#     description: ""           # initial conditions
#     preconditions:
#       - domain: ""            # domain://...
#         condition: ""         # what must be true before the protocol starts
#   end_state_assertions:
#     - domain: ""              # domain://...
#       assertion: ""           # what must be true after protocol succeeds
#       verifiable_by: ""       # how to check (query, inspect state, etc.)
#   failure_scenarios:
#     - name: ""                # e.g., "Insufficient witnesses"
#       inject_failure_at: ""   # which protocol step fails
#       expected_state:
#         - domain: ""
#           assertion: ""       # what must be true after this failure
#   reference_implementation:
#     source: ""                # e.g., "keripy tests/vc/test_protocoling.py::test_ipex"
#     notes: ""                 # what the reference test covers
```

## Example Scenario

```yaml
  - name: "SingleSigInception_with_witnesses"
    protocol: "protocols://identity#SingleSigInception"
    description: "Create a single-signature identifier with 3 witnesses and TOAD=2. Verify that all participating domains reach the correct end state."
    setup:
      description: "One Ed25519 signing key, one Blake3-256 next key digest, 3 non-transferable witness AIDs, TOAD=2"
      preconditions:
        - domain: "domain://identity/state"
          condition: "No KeyState exists for the new AID prefix"
        - domain: "domain://accountability"
          condition: "No witness receipts exist for the new AID"
        - domain: "domain://discovery"
          condition: "No OOBI endpoints registered for the new AID"
    end_state_assertions:
      - domain: "domain://identity/state"
        assertion: "KeyState exists with sn=0, transferable=true, signing_keys=[1 key], witnesses=[3 AIDs], toad=2"
        verifiable_by: "get_key_state(aid) returns valid KeyState"
      - domain: "domain://identity/establishment"
        assertion: "Inception event logged to KEL with first-seen ordinal assigned"
        verifiable_by: "get_event(aid, sn=0) returns the inception event"
      - domain: "domain://accountability/receipting"
        assertion: "At least 2 witness receipts exist for the inception event (satisfies TOAD=2)"
        verifiable_by: "get_receipts(aid, sn=0).count >= 2"
      - domain: "domain://discovery"
        assertion: "OOBI is resolvable for the new AID at each witness URL"
        verifiable_by: "resolve_oobi(witness_url/oobi/aid/witness) returns KEL replay"
    failure_scenarios:
      - name: "Insufficient_witnesses"
        inject_failure_at: "step 3 (collect_witness_receipts) — only 1 of 3 witnesses responds"
        expected_state:
          - domain: "domain://identity/establishment"
            assertion: "Inception event held in Partially-Witnessed Escrow (PWE), NOT accepted to KEL"
          - domain: "domain://identity/state"
            assertion: "No KeyState exists — event not yet accepted"
      - name: "Invalid_signature"
        inject_failure_at: "step 2 (validate_and_accept) — signatures don't verify"
        expected_state:
          - domain: "domain://identity/establishment"
            assertion: "Event rejected (not escrowed) — ValidationError raised"
          - domain: "domain://identity/state"
            assertion: "No KeyState exists"
    reference_implementation:
      source: "keripy tests/core/test_eventing.py::test_kever, tests/app/test_habbing.py::test_hab_rotate_with_witness"
      notes: "keripy test creates Hab with witnesses, verifies kever state, checks witness receipts"
```

## Scenario Coverage Map

Each of the 17 protocols should have at least one integration scenario. High-value protocols get multiple scenarios (happy path + failure variants):

| Protocol | Scenarios needed | Why |
|---|---|---|
| SingleSigInception | 3 (happy, insufficient witnesses, invalid sig) | Foundation — every other test builds on this |
| KeyRotation | 2 (happy, pre-rotation binding failure) | Tests key-commitment verification |
| DelegatedInception | 2 (happy, delegator timeout) | Tests cross-KEL coordination |
| MultisigInception | 2 (happy, coordination timeout) | Tests signature accumulation |
| CredentialIssuance | 2 (happy, missing registry) | Tests TEL + KEL anchor chain |
| DirectGrant | 2 (happy, chain verification failure) | Tests IPEX proof bundle |
| NegotiatedIssuance | 3 (happy, spurn, chain-link confidentiality) | Full IPEX flow |
| OOBIResolution | 2 (happy, invalid KEL) | Tests discovery chain |
| SupersedingRecovery | 2 (happy, recovery keys don't match) | Tests integrity recovery |
| EndpointDiscoveryRegistration | 1 (happy) | Tests endpoint publishing |
| Others | 1 each | Happy path minimum |

## Derivation from Reference Implementation

Integration scenarios can be partially derived from reference implementation tests:

1. **Read the keripy/keria test file** referenced in the scenario
2. **Extract the assert statements** — these ARE the end-state assertions
3. **Map each assert to a domain** — `assert kever.sn == 0` maps to identity/state
4. **Generalize** — replace concrete SAID values with property assertions

This is the same approach we used for the keripy symbol extraction — read the implementation, map to domains, generalize to spec-level assertions.

## Relationship to Other File Types

```
protocols.yaml     → HOW the flow executes (steps, ordering, failure paths)
verification.yaml  → WHAT each domain guarantees (invariants, state machines)
errors.yaml        → WHAT can go wrong (error catalog, recovery)
types.yaml         → WHAT data structures exist (fields, constraints)

integration-scenarios.yaml → WHAT'S TRUE AFTER (cross-domain end-state)
```

Integration scenarios are the missing verification level that connects protocol execution to domain invariants across boundaries.

## Acceptance Criteria

- [ ] `integration-scenarios.yaml` template added to ddd-spec assets
- [ ] Template includes: name, protocol ref, setup, end_state_assertions, failure_scenarios, reference_implementation
- [ ] End-state assertions reference specific domains and verifiable conditions
- [ ] Failure scenarios specify injection point and expected degraded state
- [ ] Reference implementation field links to source repo tests
- [ ] Linter validates protocol references resolve to existing protocols.yaml entries
- [ ] At least one example scenario demonstrates all fields
