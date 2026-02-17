# Components — locked-in-frontend

> Domain components for the **frontend** stack in the **LockedIn** service (Humanitarian Service Marketplace).

## Domain Overview

This stack implements the **frontend** deployment pattern — a thin client that delegates all KERI protocol operations to the agent-service and acdc-registry stacks. No C3 domain components are required.

**Runtime:** TypeScript / signify-ts
**Rationale:** Browser/mobile signing at the edge. Keys never leave the device.

---

## Component Inventory

*No C3 domain components.* The frontend is a Signify protocol client.

---

## Frontend Responsibilities (Non-C3)

The LockedIn app handles:

1. **Device Data Collection** — GPS location, barometric pressure, biometric authentication from phone OS APIs
2. **Event Signing** — Uses signify-ts to sign presence events locally before submitting to the agent-service
3. **Agent API Communication** — REST calls to the agent-service for AID management, event submission, credential operations
4. **Proof Presentation** — Receives selective disclosure proofs from the agent/registry and presents them to proof requesters
5. **User Interface** — Presence history browsing, trust tier selection, proof sharing (link, QR code, API push)

These are all application-layer concerns, not KERI domain logic. The KERI protocol invariants are enforced by the server-side stacks.

---

## State Mapping

| Frontend State | AWS Resource (from stack.yaml) | Description |
|---------------|-------------------------------|-------------|
| Static assets | FrontendBucket (S3) | React/mobile app build output |
| CDN | FrontendCDN (CloudFront) | Global content delivery with SPA routing |

---

## Security Boundaries

- Private keys are generated and stored on-device by signify-ts — never transmitted to the server
- The agent-service receives signed events, not raw keys
- Selective disclosure proofs are packaged server-side but presented by the frontend
- Device biometric data is used only for local attestation — never uploaded
