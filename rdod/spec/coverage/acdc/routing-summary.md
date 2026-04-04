# Routing Summary — ACDC Specification UL Coverage

## By Route Type

### UL Terms (12 findings)
New adopter-facing concepts to add to ubiquitous-language.yaml files.

| ID | Domain | Proposed Term | Action |
|----|--------|--------------|--------|
| ACDC-Z0-001 | credential-lifecycle | CredentialGraph | New term |
| ACDC-Z1-001 | credential-lifecycle | *(collapses into Z0-001)* | — |
| ACDC-Z1-003 | privacy | ThreePartyExploitationModel | New term |
| ACDC-Z2-001 | credential-lifecycle | TypeIsSchema | New term |
| ACDC-Z2-002 | credential-lifecycle | TargetedACDC, UntargetedACDC, CargoField | New terms (3) |
| ACDC-Z2-004 | discovery | PercolatedDiscovery | New term |
| ACDC-Z2-005 | privacy/aggregation | *(broaden MostCompactForm)* | Enrich existing |
| ACDC-Z2-006 | privacy | *(enrich BespokeACDC)* | Enrich existing |
| ACDC-Z2-008 | privacy | *(collapses into Z1-003)* | — |
| ACDC-Z2-009 | privacy | DataPrivacyPrinciple | New term |
| ACDC-Z3-001 | privacy/aggregation | *(enrich AGID)* | Enrich existing |
| ACDC-Z4-002 | privacy/blinding | *(enrich BLID)* | Enrich existing |

### Types (4 findings)
Developer-facing structural/mechanism types for types.yaml files.

| ID | Domain | Proposed Type | Action |
|----|--------|--------------|--------|
| ACDC-Z2-003 | credential-lifecycle | CredentialEdge, EdgeGroup | New types |
| ACDC-Z2-010 | privacy | BulkIssuanceAggregate | New type |
| ACDC-Z2-011 | credential-lifecycle | SectionMessage | New type |
| ACDC-Z3-002 | privacy/blinding | HierarchicalDerivation | New type |
| ACDC-Z4-001 | cesr | FixedFieldBlock | New type |

### Verification Rules (2 findings)
Invariants/constraints for verification.yaml files.

| ID | Domain | Proposed Rule |
|----|--------|--------------|
| ACDC-Z1-002 | cesr | SecurityLevel (128-bit minimum) |
| ACDC-Z1-004 | credential-lifecycle | TemporalKeyStateBinding |
| ACDC-Z2-007 | credential-lifecycle | TransactionEventValidation workflow |

## By Domain

### credential-lifecycle (7 findings)
- ACDC-Z0-001: CredentialGraph (UL term)
- ACDC-Z1-004: TemporalKeyStateBinding (verification)
- ACDC-Z2-001: TypeIsSchema (UL term)
- ACDC-Z2-002: TargetedACDC, UntargetedACDC, CargoField (UL terms)
- ACDC-Z2-003: CredentialEdge, EdgeGroup (types)
- ACDC-Z2-007: TransactionEventValidation (verification)
- ACDC-Z2-011: SectionMessage (type)

### privacy (4 findings)
- ACDC-Z1-003: ThreePartyExploitationModel (UL term)
- ACDC-Z2-006: Enrich BespokeACDC (UL term)
- ACDC-Z2-009: DataPrivacyPrinciple (UL term)
- ACDC-Z2-010: BulkIssuanceAggregate (type)

### privacy/aggregation (2 findings)
- ACDC-Z2-005: Broaden MostCompactForm scope (UL term)
- ACDC-Z3-001: Enrich AGID with computation algorithm (UL term)

### privacy/blinding (2 findings)
- ACDC-Z3-002: HierarchicalDerivation (type)
- ACDC-Z4-002: Enrich BLID as fixed-field SAID variant (UL term)

### cesr (2 findings)
- ACDC-Z1-002: SecurityLevel verification rule
- ACDC-Z4-001: FixedFieldBlock (type)

### discovery (1 finding)
- ACDC-Z2-004: PercolatedDiscovery (UL term)

## Collapses

Two collapse chains identified:
1. **ACDC-Z0-001 <- ACDC-Z1-001**: Graph-level authorization chain concept
2. **ACDC-Z1-003 <- ACDC-Z2-008**: Three-party exploitation model roles
