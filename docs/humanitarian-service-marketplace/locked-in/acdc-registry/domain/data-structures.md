# Data Structures — locked-in-acdc-registry

> KERI protocol data structures used by components in the **acdc-registry** stack.

## Data Structure Catalog

| Name | Type | Serialization Formats | Used By Components |
|------|------|-----------------------|--------------------|
| ACDC | acdc | cesr, json, cbor | registry-acdc-tel-manager |
| PresenceAttestationACDC | acdc | cesr, json | registry-acdc-tel-manager |
| RegistryInceptionEvent | tel-event | cesr, json | registry-acdc-tel-manager |
| TELUpdateEvent | tel-event | cesr, json | registry-acdc-tel-manager |
| TELBlindableUpdateEvent | tel-event | cesr, json | registry-acdc-tel-manager |
| InteractionEvent | key-event | cesr, json, cbor, msgpack | registry-event-log-engine |

---

## Structure Details

### ACDC (Generic)

**Type:** acdc

The base Authentic Chained Data Container structure. All LockedIn credentials are specialized ACDCs.

#### Fields

Field order when present MUST be: `[v, t, d, u, i, rd, s, a, A, e, r]`

| Name | Type | Required | Constraints | Description |
|------|------|----------|-------------|-------------|
| v | string | MUST | Regex `ACDCMmmGggKKKKSSSS.`; protocol MUST be ACDC | Version string (MUST be first field) |
| t | string | conditional | 3-char message type; default `acm` if absent | Message type |
| d | string | MUST | Valid CESR-qualified digest | SAID — self-addressing identifier |
| u | string | MAY | ~128 bits entropy for Private variant | Salty nonce — controls variant |
| i | string | MUST | Valid AID derivable from key pair(s) | Issuer AID prefix |
| rd | string | MAY | Must equal rip event's d (REGID) | Registry identifier |
| s | string/map | MUST | Must reference static SAIDified schema; $id = bare SAID | Schema SAID or schema block |
| a | object | MAY | Must validate against schema; MUST NOT coexist with non-empty A | Attribute section |
| A | string | MAY | MUST NOT coexist with non-empty a | Attribute Aggregate (selective disclosure) |
| e | object | MAY | Edge references must be valid ACDC SAIDs | Edge section — chained credentials |
| r | object | MAY | Valid rule structure | Rule section — Ricardian contract |

#### ACDC Variants

| Variant | Determination |
|---------|--------------|
| Public | No top-level `u` field |
| Private | Top-level `u` with sufficient entropy (~128 bits) |
| Metadata | Top-level `u` = `""` (empty) — SAID differs from actual ACDC |
| Targeted | Issuee `i` present in `a`/`A` top level |
| Untargeted | No `i` in `a`/`A` |
| Compact | Section values are SAIDs (orthogonal modifier) |

#### Serialization

**CESR Encoding:**
- ACDC uses CESR envelope with protocol type `ACDC` (not `KERI`)
- SAID computation: digest of serialized ACDC with `d` field set to placeholder
- Version string determines encoding format (JSON, CBOR, MGPK)

**JSON Mapping:**
- Single-character field abbreviations in canonical order
- Nested objects for attribute, edge, and rule sections
- Schema referenced by SAID, not inline
- Schema `additionalProperties` MUST be `false` on all schema objects

#### Validation Rules

1. `d` MUST equal digest of ACDC serialized with `d` as placeholder
2. `i` MUST be a valid AID derivable from key pair(s) with a verifiable KEL
3. `s` MUST reference a static SAIDified schema — `$id` MUST be bare SAID
4. `a` and `A` are mutually exclusive — MUST NOT both be non-empty
5. `a` (if present) MUST validate against the schema referenced by `s`
6. `rd` (if present) MUST equal the REGID of the associated registry
7. Each edge in `e` MUST reference a valid ACDC SAID (chaining)
8. Issuer signature verified via KEL seal, not direct signature on ACDC

---

### PresenceAttestationACDC

**Type:** acdc (specialized)

The core LockedIn credential — a presence attestation proving the user was at a specific location at a specific time.

#### Attribute Fields (within `a` section)

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| dt | string | ISO 8601 datetime | Attestation timestamp |
| location | object | Valid geographic coordinates | GPS: lat, lon, altitude |
| barometric_pressure | number | Physically plausible range | Barometric reading (hPa) |
| biometric_confirmed | boolean | Boolean | Whether biometric auth was active |
| verification_method | string | gps+barometric, gps+biometric, or gps+barometric+biometric | How presence was verified |
| verification_strength | string | low, medium, or high | Trust level |
| witness_tier | string | free, paid, or byow | Witness tier at attestation time |
| witness_aids | string[] | Valid AID prefixes | Witnesses that receipted |

#### Edge Section (within `e`)

Optional chain to related credentials:
- `service_commitment` — links to a service_commitment ACDC (for humanitarian marketplace integration)
- `proof_of_service` — links to a proof_of_service credential

#### Rule Section (within `r`)

Defines selective disclosure rules:
- Which attributes can be disclosed independently
- Minimum disclosure scope (e.g., cannot disclose location without timestamp)
- Privacy constraints on biometric and location data

#### Example (Annotated)

```json
{
  "v": "ACDC10JSON000200_",
  "d": "EQzFVaMasUf4...",
  "i": "EBfxc4RiVY6...",
  "s": "ESchema1234...",
  "a": {
    "dt": "2026-02-17T14:30:00Z",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "alt": 10.5
    },
    "barometric_pressure": 1013.25,
    "biometric_confirmed": true,
    "verification_method": "gps+barometric+biometric",
    "verification_strength": "high",
    "witness_tier": "paid",
    "witness_aids": [
      "BDf2KYVjpT2r...",
      "BD8UaA0NfCz7...",
      "BEk9JmL3pQw5..."
    ]
  },
  "e": {
    "service_commitment": {
      "d": "EHnR7uBz9kQp..."
    }
  },
  "r": {
    "disclosure": "selective",
    "minimum_scope": ["dt", "location"]
  }
}
```

---

### RegistryInceptionEvent (`rip`)

**Type:** tel-event

Creates a new TEL registry. The `d` field becomes the REGID (registry identifier) referenced by all ACDCs and TEL events in this registry.

#### Fields

Field order: `[v, t, d, u, i, n, dt]`

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Protocol type MUST be ACDC | Version string |
| t | string | Must be `rip` | Event type (registry inception) |
| d | string | Valid CESR-qualified digest | SAID — becomes the REGID |
| u | string | ~128 bits entropy | Salty nonce |
| i | string | Must match ACDC issuer AID | Issuer AID |
| n | string | Must be hex `0` | Sequence number (0 for inception) |
| dt | string | ISO 8601 with microseconds + UTC offset | Inception datetime |

#### Validation Rules

1. `d` (REGID) is referenced by all subsequent TEL events via their `rd` field
2. `i` MUST match the issuer's AID — binds the issuer to this registry
3. MUST be sealed in the issuer's KEL via interaction event before any ACDC references it
4. For backed registries: `RB` config trait designates registrar backers

---

### TELUpdateEvent (`upd`) — Non-Blindable

**Type:** tel-event

Records credential state changes (issuance, revocation) with publicly visible ACDC binding. Used when privacy of credential state is not required.

#### Fields

Field order: `[v, t, d, rd, n, p, dt, ta, ts]`

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Protocol type MUST be ACDC | Version string |
| t | string | Must be `upd` | Event type (non-blindable update) |
| d | string | Valid CESR-qualified digest | SAID of this TEL event |
| rd | string | Must match rip `d` (REGID) | Registry identifier |
| n | string | Monotonically increasing hex from 0 | TEL sequence number |
| p | string | Must match prior TEL event's `d` | Prior TEL event SAID |
| dt | string | ISO 8601 with microseconds + UTC | Update datetime |
| ta | string | Must equal ACDC top-level `d` | ACDC SAID — binds to credential |
| ts | string | CESR Text domain encoded state | State (e.g., `0Missued`, `Yrevoked`) |

#### State Machine

```
(none) --rip--> [registry created]
[registry created] --upd(ta=SAID, ts=0Missued, n=1)--> [issued]
[issued] --upd(ta=SAID, ts=Yrevoked, n=2)--> [revoked]
```

#### Validation Rules

1. `rd` MUST equal the rip event's `d` (REGID)
2. `p` MUST equal the `d` of the immediately prior TEL event
3. `n` MUST increment monotonically
4. `ta` MUST equal the ACDC's top-level `d` field
5. `ts` MUST be a valid CESR-encoded state string
6. TEL event MUST be sealed in issuer's KEL via SealTrans `[s, d]`
7. TEL events do NOT need own signatures — KEL seal is cryptographically equivalent
8. A revoked ACDC cannot be re-issued — new SAID required

---

### TELBlindableUpdateEvent (`bup`) — Privacy-Preserving

**Type:** tel-event

Records credential state changes with blinded attribute blocks. Used when privacy of credential state is required (e.g., hiding which specific ACDC was revoked).

#### Fields

Field order: `[v, t, d, rd, n, p, dt, b]`

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| v | string | Protocol type MUST be ACDC | Version string |
| t | string | Must be `bup` | Event type (blindable update) |
| d | string | Valid CESR-qualified digest | SAID of this TEL event |
| rd | string | Must match rip `d` (REGID) | Registry identifier |
| n | string | Monotonically increasing hex from 0 | TEL sequence number |
| p | string | Must match prior TEL event's `d` | Prior TEL event SAID |
| dt | string | ISO 8601 with microseconds + UTC | Update datetime |
| b | string | Must equal BLID of blinded attribute block | Blinded attribute SAID |

#### BLID Computation

BLID is computed over CESR concatenation of: `[d, u, td, ts]` (quintuple):
- `d` = SAID of blinded block
- `u` = salty nonce (derived from shared secret salt + sequence number)
- `td` = target ACDC SAID (or placeholder `1AAP` for decorrelation)
- `ts` = target state (or placeholder `1AAP`)

#### State Machine

```
(none) --rip--> [placeholder]
[placeholder] --bup(td=1AAP, ts=1AAP)--> [placeholder]    (decorrelate)
[placeholder] --bup(td=SAID, ts=0Missued)--> [issued]
[issued] --bup(new u/b, same td/ts)--> [issued]            (re-blind)
[issued] --bup(td=SAID, ts=Yrevoked)--> [revoked]
[revoked] --bup(new u/b, same td/ts)--> [revoked]          (re-blind)
```

#### Validation Rules

1. `rd` MUST equal the rip event's `d` (REGID)
2. `p` MUST equal the `d` of the immediately prior TEL event
3. `n` MUST increment monotonically
4. `b` MUST equal the BLID computed from the blinded attribute block
5. Shared secret salt MUST have ~128 bits cryptographic entropy
6. TEL event MUST be sealed in issuer's KEL via SealTrans `[s, d]`

---

### InteractionEvent

**Type:** key-event

Used to anchor TEL events in the issuer's KEL. The seal in the `a` field references the TEL event's SAID.

See `docs/humanitarian-service-marketplace/locked-in/witness-pool/domain/data-structures.md` for full field definitions.

#### TEL Anchoring Seal Example

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
      "d": "ETelEvent123..."
    }
  ]
}
```

The seal uses SealTrans format `[s, d]`: `s` is the TEL sequence number (hex), `d` is the TEL event SAID. CESR attachment count code: `-S##` or `--S#####`.

**Key property:** TEL events do NOT need their own signatures — the signed seal digest in the KEL is cryptographically equivalent. Key state binding persists despite issuer key rotation.

---

## CESR Encoding Notes

ACDC and TEL events use CESR encoding but with protocol type `ACDC` (not `KERI`):
- **SAID** computation follows the same algorithm (digest with `d` as placeholder)
- **Version string** for ACDCs: `ACDCMmmGggKKKKSSSS.` (different from KERI's `KERIvvSSSSSSSSSS_`)
- **Qualified primitives** (qb64/qb2) for all cryptographic values
- **CESR-encoded states:** `1AAP` (placeholder), `0Missued` (issued), `Yrevoked` (revoked)

## Cross-Structure References

- **ACDC.d** (SAID) is referenced by TEL `upd` events via `ta` field
- **ACDC.rd** references the registry via the `rip` event's `d` (REGID)
- **ACDC.s** (schema SAID) references the credential schema definition
- **ACDC.e** (edges) reference other ACDCs by SAID (chaining)
- **RegistryInceptionEvent.d** (REGID) is referenced by all TEL events via `rd`
- **TELUpdateEvent.ta** binds the TEL event to the ACDC SAID
- **TELUpdateEvent.p** / **TELBlindableUpdateEvent.p** chains to prior TEL event's SAID
- **InteractionEvent.a** (seals) anchor TEL events into the issuer's KEL using SealTrans `[s, d]`
- **PresenceAttestationACDC.a.witness_aids** references witness AIDs from the witness-pool stack
