---
name: signify-ts
description: >
  TypeScript client library for KERI signing at the edge via Signify protocol.
  Auto-activates when working with signify-ts imports, SignifyClient usage,
  KERI identifier management in TypeScript, or Signify-based authentication.
  Covers the full API: client setup, identifier lifecycle, CESR primitives,
  HTTP signing, event construction, and credential management.
---

# signify-ts — KERI Signing at the Edge

## Overview

signify-ts is the TypeScript client library for the KERI Signify protocol. It enables
"signing at the edge" — private keys never leave the client, while a cloud agent (KERIA)
hosts identifiers and handles protocol interactions. The library provides:

- **SignifyClient** — main entry point for all KERIA interactions
- **CESR primitives** — Matter/Indexer hierarchy for cryptographic material (keys, digests, signatures)
- **Key management** — Manager/Keeper system for salty (deterministic) and randy (random) key strategies
- **Event construction** — incept/rotate/interact functions for building KERI events
- **HTTP signing** — Authenticater for signed request headers (RFC 8941)

## Quick Reference

| Class/Function | Purpose | Reference File |
|---------------|---------|---------------|
| `SignifyClient` | Main client — boot, connect, fetch | client-api.md |
| `Identifier` | Create/rotate/list identifiers | client-api.md |
| `Credentials` | Issue/revoke/present credentials | client-api.md |
| `Manager` | Key state orchestration | identifier-lifecycle.md |
| `SaltyKeeper` | Deterministic key management | identifier-lifecycle.md |
| `RandyKeeper` | Random key management | identifier-lifecycle.md |
| `incept()` | Build inception event | identifier-lifecycle.md |
| `rotate()` | Build rotation event | identifier-lifecycle.md |
| `interact()` | Build interaction event | identifier-lifecycle.md |
| `messagize()` | Attach signatures to events | identifier-lifecycle.md |
| `Matter` | Base CESR primitive class | cesr-primitives.md |
| `Verfer` / `Diger` / `Signer` | Key/digest/signature primitives | cesr-primitives.md |
| `MtrDex` | Matter code table | cesr-primitives.md |
| `Authenticater` | HTTP request signing/verification | crypto-signing.md |
| `Ilks` | Event type constants | event-model.md |
| `Serder` | Serialized event container | identifier-lifecycle.md |

## Import Guide

```typescript
import { SignifyClient, ready } from 'signify-ts';

// Must initialize libsodium before use
await ready();

// Then create client
const client = new SignifyClient(url, bran, tier, temp);
await client.boot();
await client.connect();
```

Key imports by concern:
- **Client:** `SignifyClient, ready`
- **Primitives:** `Matter, Verfer, Diger, Signer, Salter, Siger, Cigar, MtrDex`
- **Events:** `incept, rotate, interact, messagize, Serder, Ilks`
- **Signing:** `Authenticater, Signage, signature, designature`
- **Keys:** `Manager, SaltyKeeper, RandyKeeper, Algos`
- **Utilities:** `b, d, concat, randomPasscode, randomNonce`

## Reference Files

| File | Contents | Size |
|------|----------|------|
| references/client-api.md | SignifyClient + all resource classes | 5KB |
| references/identifier-lifecycle.md | Manager, Keepers, event construction, signing | 7KB |
| references/cesr-primitives.md | Matter hierarchy, codex tables, primitives | 8KB |
| references/crypto-signing.md | HTTP Authenticater, signature headers | 8KB |
| references/event-model.md | Ilks, Serials, labels, version strings | 5KB |
| references/core-utils.md | B64, byte helpers, Agent, Controller | 7KB |

## Usage Patterns

### 1. Boot and Connect
```typescript
await ready();
const client = new SignifyClient(url, bran, Tier.low, temp);
await client.boot();
await client.connect();
```

### 2. Create Identifier
```typescript
const result = await client.identifiers().create('myAlias', {
  toad: 3, wits: ['wit1AID', 'wit2AID', 'wit3AID']
});
await result.op();  // poll until complete
```

### 3. Issue Credential
```typescript
const result = await client.credentials().issue(
  'issuerAlias', registryName, schema, recipient, credentialData
);
```

### 4. Sign HTTP Request
```typescript
const authenticater = new Authenticater(signer, verfer);
const headers = authenticater.sign(existingHeaders, 'GET', '/path');
```

### 5. Construct Event Manually
```typescript
const [serder, keys] = incept({ keys, ndigs, code: MtrDex.Blake3_256 });
const msg = messagize(serder, sigers);
```

## Anti-Patterns

**DON'T:** Call `client.identifiers().create()` without `await ready()` first
**DO:** Always `await ready()` before any signify-ts operations

**DON'T:** Store private keys or passcodes — they exist only in memory
**DO:** Use `randomPasscode()` for 21-char CSPRNG passcodes, let Manager handle key material

**DON'T:** Skip `client.boot()` and go straight to `connect()`
**DO:** Boot provisions the agent, connect establishes the session — both required in order

**DON'T:** Use `Algos.group` for single-sig identifiers
**DO:** Use `Algos.salty` (deterministic, recoverable) or `Algos.randy` (random) for single-sig

**DON'T:** Construct version strings manually
**DO:** Use `versify()` / `deversify()` for KERI version string handling
