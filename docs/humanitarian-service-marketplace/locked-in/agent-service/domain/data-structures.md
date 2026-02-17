# Data Structures — locked-in-agent

> KERI protocol data structures used by components in the **agent-service** stack.

## Data Structure Catalog

| Name | Type | Serialization Formats | Used By Components |
|------|------|-----------------------|--------------------|
| InceptionEvent | key-event | cesr, json, cbor, msgpack | agent-event-log-engine, agent-keri-service |
| RotationEvent | key-event | cesr, json, cbor, msgpack | agent-event-log-engine, agent-keri-service |
| InteractionEvent | key-event | cesr, json, cbor, msgpack | agent-event-log-engine, agent-keri-service |
| Receipt | receipt | cesr, json | agent-keri-service |
| OOBI | oobi | json | agent-oobi-resolver |
| PresenceAttestationSeal | key-event | json | agent-keri-service |
| AgentTenant | key-state | json | agent-keri-service |

---

## Structure Details

### InceptionEvent, RotationEvent, InteractionEvent, Receipt

These structures are identical to those defined in the witness-pool data structures. The agent creates and signs these events (controller mode) in addition to validating them (verifier mode).

See `docs/humanitarian-service-marketplace/locked-in/witness-pool/domain/data-structures.md` for full field definitions.

---

### OOBI

**Type:** oobi

Out-of-band introduction record used to discover witness, watcher, and peer endpoints.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| url | string | Valid HTTP(S) URL | OOBI endpoint URL |
| aid | string | Valid AID prefix | AID being introduced |
| role | string | Valid role identifier | Role: witness, watcher, controller |

#### OOBI URL Formats

- `https://host:port/oobi/{aid}` — general endpoint discovery
- `https://host:port/oobi/{aid}/witness/{witness_aid}` — specific witness
- `https://host:port/.well-known/keri/oobi/{aid}` — well-known path

#### Validation Rules

1. URL MUST be reachable and return valid KERI endpoint descriptors
2. Returned KEL MUST be verifiable before trusting the endpoint
3. Role MUST match the endpoint's actual function

---

### PresenceAttestationSeal

**Type:** key-event (seal within InteractionEvent.a)

Seal structure anchored in the user's KEL via interaction events to link presence attestation ACDCs to the user's event log.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| i | string | Valid CESR-qualified digest | SAID of the presence attestation ACDC |
| s | string | Non-negative integer | TEL sequence number for the attestation |
| d | string | Valid CESR-qualified digest | SAID of the TEL issuance event |

#### Validation Rules

1. `i` MUST reference a valid ACDC SAID in the registry
2. `s` MUST match the TEL issuance event's sequence number
3. `d` MUST match the TEL issuance event's SAID
4. This seal anchors the credential lifecycle into the user's KEL — providing a verifiable link

#### Example (in InteractionEvent.a)

```json
{
  "v": "KERI10JSON000098_",
  "t": "ixn",
  "d": "EGpfIxLa0c0F...",
  "i": "EBfxc4RiVY6...",
  "s": "42",
  "p": "EHpD0-CDWOdu...",
  "a": [
    {
      "i": "EQzFVaMasUf4...",
      "s": "0",
      "d": "EQzFVaMasUf4..."
    }
  ]
}
```

---

### AgentTenant

**Type:** key-state (agent-specific)

Represents the agent's per-user tenant configuration and metadata. Not a KERI protocol structure — an application-level data structure.

#### Fields

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| tenant_id | string | UUID v4 | Unique tenant identifier |
| aid_prefix | string | Valid AID | Primary AID for this tenant |
| subscription_tier | string | One of: free, paid, byow | Witness tier |
| witness_count | number | free=1, paid=3, byow=variable | Number of designated witnesses |
| witness_aids | string[] | Valid AID prefixes | AIDs of designated witnesses |
| created_at | string | Valid ISO 8601 timestamp | Tenant creation time |

#### Validation Rules

1. `tenant_id` MUST be unique across all tenants
2. `subscription_tier` determines `witness_count` and `witness_aids`
3. `witness_aids` length MUST match `witness_count`
4. For `free` tier: `witness_aids` MUST contain only the LockedIn witness AID

---

## CESR Encoding Notes

Same CESR conventions as the witness-pool. The agent is unique in that it both creates (serialize) and validates (deserialize) CESR-encoded events.

## Cross-Structure References

- **InceptionEvent** created by the agent anchors the user's identity in the KERI ecosystem
- **InteractionEvent.a** (seals) link presence attestation ACDCs to the user's KEL
- **PresenceAttestationSeal.i** references an ACDC SAID in the acdc-registry stack
- **Receipt** from witnesses confirms event acceptance — agent collects until threshold met
- **OOBI** resolves to witness/watcher endpoints for event submission and verification
- **AgentTenant.witness_aids** determines which witnesses receive the user's events
