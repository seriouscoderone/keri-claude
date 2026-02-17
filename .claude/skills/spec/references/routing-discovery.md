# Routing and Discovery (OOBI, BADA, OKEA, RUN)

## OOBI Overview

An **Out-Of-Band Introduction (OOBI)** is an untrusted (URL, AID) pair that bootstraps KERI's authenticated discovery. The OOBI itself is NOT signed or authenticatable by KERI -- it merely provides a starting URL from which cryptographically verifiable proofs can be fetched. All information obtained via an OOBI MUST be verified using BADA before it is trusted. OOBIs solve the chicken-and-egg problem: you need a KEL to verify endpoints, but need an endpoint to fetch the KEL.

## OOBI Variants

| Variant | Format | Notes |
|---------|--------|-------|
| Basic | Abstract (AID, URL) pair | Minimal form; all others are concrete representations |
| IURL | `scheme://host/oobi/{AID}[?role=witness&name=eve]` | AID in path, optional role/name query params |
| Well-Known | `/.well-known/keri/oobi/{AID}` | RFC 5785; GET returns target URL or redirect |
| CID/EID | `scheme://host/oobi/{CID}/{role}/{EID}` | Fully specifies controller, role, and endpoint provider |
| MOOBI | `rpy` message, route `/oobi/witness`, `a.cid` + `a.urls` list | Multi-OOBI: associates AID with multiple URLs at once |
| SOOBI | `scheme://host/oobi[?role=...&name=...]` (no AID) | Self/blind introduction; response depends on querier context |

Role values: `witness`, `watcher`, `controller`, `juror`, `judge`, `registrar`.

Reply-as-OOBI: An OOBI can be conveyed as an unsigned `rpy` message with `/oobi` route prefix. Variant A (MOOBI) carries `a: {cid, urls}`. Variant B (single endpoint) carries `a: {eid, scheme, url}` and combines role + location in one message.

## OOBI Verification Algorithm

1. Receive OOBI (URL, AID) pair.
2. Query URL for proof that it is an authorized endpoint for the AID.
3. Proof depends on endpoint role:
   - **Witness/registrar designated in KEL:** KEL/key-state reply serves as proof (implicit role auth). Still needs signed `/loc/scheme` for the URL.
   - **Any other role:** Requires explicitly signed `/end/role/add` reply (explicit role auth) PLUS signed `/loc/scheme` for URL.
4. Verify all reply signatures against key-state.
5. Apply BADA-RUN policy to accept or reject each update.
6. If accepted, store authenticated endpoint. Note: OOBI MAY resolve to a different URL than originally provided (OOBI forwarding) -- only fully KERI-authenticated URLs are treated as valid.

Errors: URL unreachable, proof not returned, signature verification fails, BADA rejection.

## BADA Policy (Best-Available-Data-Acceptance)

BADA guarantees monotonicity of updates to signed data at rest, protecting against replay and deletion attacks. Two variants:

### KEL-Anchored Updates

Accept/reject based on anchor position in the authorizing AID's KEL:

- IF no prior record exists: **accept**.
- IF prior exists AND update's anchor appears **later in KEL** than prior's anchor: **accept**.
- Otherwise: **reject**.

Precondition: confirm update is actually anchored/included in the AID's KEL.

### Signed (Not Anchored) Updates

Two-level monotonicity: first by key-state position, then by datetime:

1. Verify signature against the indicated key-state. Reject if verification fails.
2. IF no prior record: **accept**.
3. IF update's key-state appears **later in KEL** than prior's: **accept**.
4. IF **same key-state** AND update's datetime is **later** than prior's: **accept**.
5. Otherwise: **reject**.

All datetimes are relative to the controller's clock, NOT the database host's. For ephemeral (non-transferable) AIDs with fixed key-state, only the datetime comparison applies.

Every signed datetime-stamped update MUST either reference the key-state in the authorizing AID's KEL, or the AID MUST be ephemeral with fixed key-state (non-transferable derivation code).

## RUN Policy (Read, Update, Nullify)

RUN replaces CRUD for zero-trust peer-to-peer data:

- **No Create:** First Update from a peer implicitly establishes the record. Each peer is source of truth for its own data.
- **No Delete:** Deletion enables replay attacks. Instead, **nullify** -- set content to empty/invalid while preserving monotonic ordering metadata (anchor or datetime) that prevents replay.
- A destination peer MUST NOT ever delete a record storing the latest version of an update.

**GDPR note:** Naive total erasure exposes the controller to replay attacks. Use nullification (data becomes unusable, but monotonic reference is preserved).

## OKEA (OOBI KERI Endpoint Authorization)

OKEA applies BADA-RUN to OOBI-based endpoint discovery. Complete endpoint records require two separate signed authorizations:

### Two-Table Model

| Table | Route | Signed By | Payload (`a` fields) | Purpose |
|-------|-------|-----------|---------------------|---------|
| Role Authorization | `/end/role/add` | CID | `cid`, `role`, `eid` | Authorize EID to act in role for CID |
| Role Deauthorization | `/end/role/cut` | CID | `cid`, `role`, `eid` | Nullify EID's role (RUN nullification) |
| Location Scheme | `/loc/scheme` | EID | `eid`, `scheme`, `url` | Declare endpoint URL for EID |
| Location Nullify | `/loc/scheme` (url="") | EID | `eid`, `scheme`, `url:""` | Remove endpoint (RUN nullification) |

All four are `rpy` messages with standard fields: `v`, `t` (rpy), `d` (SAID), `i` (signer AID), `dt` (ISO 8601), `r` (route), `a` (payload map).

### Implicit vs Explicit Role Authorization

- **Implicit (witnesses, registrars):** Backer designation in KEL establishment events implicitly authorizes the role. No `/end/role/add` needed. But explicit `/loc/scheme` signed by the EID is still REQUIRED for the URL.
- **Explicit (all other roles -- watcher, juror, judge, forwarder, agent, etc.):** Requires a signed `/end/role/add` from the CID, plus `/loc/scheme` from the EID.

### Signing Rules

- `/end/role/add` and `/end/role/cut`: MUST be signed by CID (the principal controller).
- `/loc/scheme`: MUST be signed by EID (the endpoint provider declares its own location).
- Both authorizations combine to form a complete discoverable endpoint: CID authorizes the role, EID declares its own URL.

## JIT/NTK and SPED

KERI uses **percolated information discovery** -- no central directory. Each participant maintains a local database of authenticated endpoints built through OOBI resolution and BADA-verified updates.

**JIT/NTK:** Each exchanger MUST have already verified data before exchanging it. Proofs percolate at exchange time. **SPED:** Non-interactive scalable discovery combining OOBI + BADA-RUN. One round trip for OOBI, non-interactive signature verification, local database for lookups.
