# Feature Request: Allow documentation fields in types.yaml, ports.yaml, domain.yaml, and UL schemas

## Summary

Several useful documentation fields are rejected by the linter's strict `additionalProperties: false` schema validation. These fields are already used across the KERI DDD spec (and accepted in sibling schemas) but fail validation in specific sub-schemas. Propose adding them to the respective JSON schemas.

## Problem

The linter flags 38 schema warnings for fields that carry genuine documentation value. In each case, the field is either:
- Already accepted in a sibling context (e.g., `examples:` works on UL terms but not on type variants)
- A natural documentation extension that parallels accepted fields (e.g., `notes:` on encoding entries)

Stripping these fields would lose implementation-critical context (keripy subdatabase schemas, encoding format notes, delegation routing).

## Proposed Schema Changes

### 1. types.yaml — `variants[].examples` (8 warnings)

Currently, `examples:` is allowed on top-level types but not on individual variants. Variants benefit from concrete examples just as much as the parent type.

**Files affected:** identity, credential-lifecycle, keri-messaging, privacy

```yaml
# Currently rejected inside variants:
variants:
  - name: "Backerless"
    examples:                    # ← should be allowed
      - description: "Simple issuance"
        value: { v: "...", t: "iss", ... }
```

**Proposed:** Add `examples` as optional array to the variant item schema.

### 2. types.yaml — `encoding[].notes` (8 warnings)

Encoding entries (JSON, CBOR, CESR native) benefit from format-specific notes — e.g., "Fields in canonical insertion order" for JSON vs "CESR native with -G## count code" for CESR.

**Files affected:** cesr/primitives, credential-lifecycle, discovery, identity, keri-messaging

```yaml
# Currently rejected inside encoding:
encoding:
  - format: "JSON"
    notes: "Fields in canonical insertion order"   # ← should be allowed
  - format: "CESR"
    notes: "CESR native with -G## count code"      # ← should be allowed
```

**Proposed:** Add `notes` as optional string to the encoding item schema.

### 3. ports.yaml — `ports[].notes` (5 warnings)

Port entries document subdatabase schemas and escrow layouts. These are implementation-critical references that don't belong in UL terms (they're port-specific, not domain-concept-level).

**Files affected:** credential-lifecycle (3 ports), identity (2 ports)

```yaml
# Currently rejected on ports:
ports:
  - id: "inbound/event-persistence"
    notes: "Subdatabase schema: .evts (event bytes), .kels (sequence index)..."   # ← should be allowed
```

**Proposed:** Add `notes` as optional string to the port item schema.

### 4. ports.yaml — `ports[].delegates_to` (4 warnings)

Parent domains that delegate to subdomain ports use `delegates_to` to document routing. This expresses the parent→child port delegation pattern.

**Files affected:** integrity (3 ports), credential-lifecycle (1 port)

```yaml
# Currently rejected on ports:
ports:
  - id: "inbound/integrity-management"
    delegates_to: ["port://integrity/detection/inbound/monitoring-lifecycle"]   # ← should be allowed
```

**Proposed:** Add `delegates_to` as optional string-or-array to the port item schema.

### 5. domain.yaml — `externals[].relationship` and `externals[].source` (2 warnings)

External entries benefit from the same `relationship` field that adjacents and kernels already allow. The `source` field documents the kernel origin for externals that wrap kernel-provided infrastructure.

**Files affected:** integrity/detection, integrity/evidence

```yaml
# Currently rejected on externals:
externals:
  - id: "persistence"
    source: "domain://cesr"                       # ← should be allowed
    relationship: "LMDB storage for event logs"    # ← should be allowed
```

**Proposed:** Add `relationship` and `source` as optional strings to the external item schema.

### 6. ubiquitous-language.yaml — `terms[].note` → `terms[].notes` (2 warnings)

Two terms in the integrity domain use `note:` (singular). For uniformity with the rest of the spec, rename to `notes:` (plural) to match the canonical field name used everywhere else.

**Files affected:** integrity (2 terms)

**Proposed:** Rename `note` → `notes` in the affected files. No schema change needed if `notes` is already accepted on terms.

## Not Flagged (already accepted)

For reference, these fields are already accepted by the schema and need no changes:
- `examples:` on UL terms — works fine
- `relationship:` on adjacents and kernels in domain.yaml — works fine
- `source:` on kernels in domain.yaml — works fine
- `notes:` on verification properties — works fine

## Acceptance Criteria

- [ ] `variants[].examples` added to types.yaml variant schema
- [ ] `encoding[].notes` added to types.yaml encoding schema
- [ ] `ports[].notes` added to ports.yaml port schema
- [ ] `ports[].delegates_to` added to ports.yaml port schema
- [ ] `externals[].relationship` and `externals[].source` added to domain.yaml external schema
- [ ] `terms[].note` renamed to `terms[].notes` in integrity UL for uniformity
- [ ] All 38 schema warnings resolved without data loss
