# Service Design: LockedIn

**Ecosystem:** humanitarian-service-marketplace
**Service Pattern:** credential-verification
**Version:** 1.0

---

## Value Proposition

Your phone silently builds a private, undeniable record of your presence. Nobody sees it unless you choose to share it — but when you need to prove where you were, the proof is absolute.

LockedIn flips the surveillance model on its head. Today's location tracking works against you — Google, your employer, or your phone carrier owns your location data and can use it however they want. LockedIn puts you in control: your presence data lives on your phone, witnessed by independent third parties you choose, and disclosed only when you decide to share it. Whether you need to prove volunteer hours, verify you were at a job site, support an insurance claim, or simply establish where you were on a given day, LockedIn provides cryptographic certainty — not just your word.

This is a cross-ecosystem service. While it lives within the Humanitarian Service Marketplace ecosystem as its first integration, LockedIn's presence attestations are consumable by any ecosystem — employment, insurance, legal, supply chain, compliance, or any context where proving presence matters.

---

## User Journeys

### Journey: First-Time Setup

**Actor:** Individual

A person downloads LockedIn from the app store. They grant the usual phone permissions — location, barometer, biometrics — and the app starts working immediately. Behind the scenes, a cryptographic identity is created (or an existing one is discovered if they're already in the KERI ecosystem). The user picks a witness tier: free (just LockedIn, low trust) or paid (multiple independent witnesses, real verifiability). A friendly message tells them what LockedIn is doing: silently, securely building their private presence record.

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | Download LockedIn app | None |
| 2 | Grant phone permissions (location, barometer, biometrics) | None |
| 3 | AID created behind the scenes (or existing AID discovered) | AID inception / OOBI discovery |
| 4 | App begins silently logging signed presence attestations | KEL event anchoring |
| 5 | User sees friendly message about what LockedIn is doing | None |
| 6 | User selects witness tier (free/paid/BYOW) | Witness designation, OOBI exchange |
| 7 | Witnesses begin receipting presence events | Witness receipting |

**KERI operations involved:** AID inception, OOBI exchange, KEL event anchoring, witness designation, witness receipting

---

### Journey: Daily Passive Use

**Actor:** Individual

LockedIn runs in the background. Every 3-5 minutes, it signs a presence attestation — GPS coordinates, barometric pressure, and optionally a biometric confirmation — and appends it to the user's personal event log. Witnesses receipt these events silently. The user never thinks about it unless they want to — they can open the app anytime to browse their presence history, check their witness health, or see their trust tier. All data lives on their phone. LockedIn the company doesn't have it.

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | Phone logs location + barometrics + biometrics at 3-5 min intervals | Signed presence events to KEL |
| 2 | Witnesses receipt events in background | Witness receipting, KAACE consensus |
| 3 | User browses presence history anytime | Local KEL query |
| 4 | User sees trust tier and witness health | Witness AID status check |

**KERI operations involved:** KEL event signing, witness receipting, KAACE consensus

---

### Journey: Sharing a Proof

**Actor:** Individual → Proof Requester

The moment LockedIn pays off. Someone asks the user to prove they were somewhere — a volunteer coordinator, an employer, an insurance adjuster, a lawyer. The user opens LockedIn, selects the time and location window they want to share, and the app packages a selective disclosure proof. Only that window is revealed — nothing before, nothing after, no other locations. The proof includes the witness list and their reputations, so the requester can see exactly how strong the proof is. The user shares it via link, QR code, or API push.

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | Someone asks user to prove presence at location X on date Y | None |
| 2 | User opens LockedIn, selects time/location window | KEL query for window |
| 3 | LockedIn packages selective disclosure proof | ACDC issuance (presence_attestation) |
| 4 | User shares proof (link, QR code, API push) | IPEX presentation exchange |
| 5 | Trust tier and witness list visible in proof | Witness AID references in edge block |

**KERI operations involved:** KEL query, ACDC issuance, selective disclosure, IPEX presentation, witness AID referencing

---

### Journey: Verifying a Proof

**Actor:** Proof Requester

A proof requester receives a LockedIn presence proof. They don't need the LockedIn app — they just need to verify the proof against the witnesses. The verification is instant: the witnesses confirm they receipted those events, the cryptographic signatures check out, and the requester gets a clear result with the trust tier and witness reputations. No phone calls, no paperwork, no "trust me."

For non-KERI systems, a REST API returns the same verification in standard JSON format with a verification URL — no KERI knowledge required.

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | Receive presence proof from individual | IPEX grant receipt |
| 2 | Check proof against witness receipts | KEL validation, witness receipt verification |
| 3 | See result with trust tier and witness reputation | ACDC verification, witness AID reputation |
| 4 | Accept or reject based on trust level | None (business decision) |

**KERI operations involved:** IPEX grant, KEL validation, ACDC verification, witness AID reputation check

---

### Journey: Ecosystem Integration

**Actor:** Ecosystem Integrator

A platform — like our Humanitarian Service Marketplace — integrates LockedIn's API. When a volunteer commits to a service opportunity, the platform requests a proof window covering the service period. After service, the presence attestation is automatically packaged and chained to the volunteer's service record. The platform can also offer its own witness service back to LockedIn users, earning revenue share through a perpetual referral chain anchored in verifiable attribution agreements.

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | Integrate LockedIn API into platform | OOBI exchange, API credential provisioning |
| 2 | Platform requests proof window for service commitment | Presence attestation request via IPEX |
| 3 | Proof auto-packaged and attached to service record | ACDC chaining (presence → proof_of_service) |
| 4 | Platform offers witness service to LockedIn users | Witness designation, attribution agreement |
| 5 | Referral revenue tracked via verifiable attribution chain | Attribution agreement ACDC |

**KERI operations involved:** OOBI exchange, IPEX request, ACDC chaining, witness designation, attribution agreement issuance

---

## Trust Tiers

LockedIn's proof strength is determined by the witness configuration. The trust tier is visible to both the user and any proof requester — there is no hiding weak verification.

| Tier | Witnesses | Trust Level | Cost | Notes |
|------|-----------|-------------|------|-------|
| Free | LockedIn only (1 witness) | Low | Free | Functional but warnings displayed; equivalent to today's self-reported systems |
| BYOW | User's own witness(es) | Variable | Free | Trust depends on witness AID reputation; for savvy users |
| Standard | LockedIn + 2 ecosystem witnesses | Standard | $2-5/month | Real verifiability; the core paid tier |
| Premium | Multiple reputable witnesses (university, municipality, etc.) | High | Varies | Strongest proof; cost shared across witness network |

---

## KERI Infrastructure Requirements

| Component | Needed | Justification |
|-----------|--------|---------------|
| Agent Service (KERIA) | Yes | AID creation for new users, KEL management for continuous presence events |
| Witness Pool | Yes | Core product — witnesses receipt location events; trust tiers are defined by witness quality and quantity |
| Watcher Network | Yes | Proof Requesters verify proofs against witness receipts; duplicity detection catches tampering |
| ACDC Registry + TEL | Yes | Presence proofs packaged as verifiable credentials for sharing and chaining to other ecosystem credentials |
| Judge/Jury Service | No | Watcher-level duplicity detection is sufficient; no need for evidence aggregation at this level |
| Frontend (Web/Mobile) | Yes | The phone app IS the product — user-facing interface for setup, browsing history, sharing proofs, managing witnesses |

**Credentials handled:**

- `presence_attestation` — The core LockedIn credential. A time-windowed, selectively-disclosable proof of presence backed by witness receipts. Cross-ecosystem: any ecosystem can consume this credential type.
- `proof_of_service` — When chained to a service commitment from the Humanitarian Service Marketplace, a presence attestation becomes a proof-of-service credential.
- `attribution_agreement` — Perpetual revenue sharing agreements between LockedIn and third-party witness services, anchored in verifiable referral provenance chains.

---

## Business Model

**Type:** Freemium + perpetual revenue sharing

The free tier gets people in the door with LockedIn as the sole witness — functional but visibly low-trust. The paid tier ($2-5/month) adds real verifiability through multiple independent witnesses. Ecosystem Integrators pay per-verification or subscription for API access.

The revenue sharing model is perpetual: when LockedIn introduces a user to a third-party witness service, LockedIn receives an ongoing share of resulting fees for as long as the relationship persists. Conversely, when other apps refer users to LockedIn's witness service, they receive their fair share. Referral provenance is anchored in verifiable attribution agreement credentials, so the chain of who-introduced-whom survives AID rotation and key migration. Depth limits and decay terms are governed by attribution agreements between participants — preventing MLM-like structures while rewarding genuine ecosystem growth.

This creates a virtuous cycle: LockedIn benefits from a growing witness network (stronger proofs, more integrations), and witness providers benefit from LockedIn's user acquisition. The incentives are aligned — everyone profits from a larger, more trustworthy ecosystem.

---

## SLA Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Availability | 99.9% | AWS-hosted; graceful degradation when LockedIn witness is down — other witnesses cover the gap |
| Latency (p99) | 200ms | Verification must feel instant to Proof Requesters |
| Throughput | Scales with user base | Location events every 3-5 minutes per active user; batch-tolerant for non-real-time operations |
| Recovery Time | 1 hour | Multi-witness architecture provides inherent redundancy; no data loss during LockedIn outage |

Latency-sensitive operations: proof verification (must be instant for real-time use cases like showing up to a volunteer site). Batch-tolerant operations: witness receipting (can catch up after brief outage), reporting aggregation, revenue share calculation.

---

## Integration Points

| Integration | Type | Direction | Description |
|-------------|------|-----------|-------------|
| Phone OS APIs | api | inbound | GPS, barometer, biometrics — core data sources. Data never leaves device except via selective disclosure. Hard dependency. |
| Humanitarian Service Marketplace | keri-service | bidirectional | First ecosystem integration. Chains presence attestations to service commitments. Marketplace can offer witness services. Soft dependency. |
| Third-party witness services | keri-service | bidirectional | KERI ecosystem apps providing witness services. Revenue sharing via attribution agreements. Soft dependency (free tier works without). |
| SEDI / State Identity Systems | keri-service | inbound | Government-issued digital identity for AID bootstrapping. Soft dependency (AID can be created without SEDI). |
| Non-KERI External Systems | api | outbound | REST API returning verifiable proofs in JSON format with verification URL. Enables traditional systems to consume LockedIn proofs. Soft dependency. |

---

## Next Steps

This service design defines **what** LockedIn does and **why**.
To define **how** it is deployed, run:

```
/keri-c2-service-infrastructure
```

This will read the `system.yaml` produced here and generate infrastructure
stacks (CloudFormation/CDK) for each required KERI component.
