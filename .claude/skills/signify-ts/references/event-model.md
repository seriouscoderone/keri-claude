# Event Model — signify-ts

TypeScript API for KERI event construction and serialization.

> For event types, field ordering, and seal types, see **spec** skill.
> For version strings and counter codes, see **cesr** skill.

---

## Ilks Enum

```typescript
icp="icp", rot="rot", ixn="ixn", dip="dip", drt="drt", rct="rct",
vrc="vrc", rpy="rpy", exn="exn", vcp="vcp", iss="iss", rev="rev"
```

---

## Serialization Enums

```typescript
enum Serials { JSON = "JSON", MGPK = "MGPK", CBOR = "CBOR" }
enum Ident { KERI = "KERI", ACDC = "ACDC" }
```

**Default:** `Serials.JSON`

---

## Version String Functions

```typescript
versify(ident = Ident.KERI, kind = Serials.JSON, version = Versionage, size = 0): string
deversify(vs: string): [Ident, Serials, Version, string]
```

See cesr-spec for version string format and VEREX pattern.

---

## Base64-Integer Conversion

```typescript
intToB64(i: number, l = 1): string   // Encode int as CESR base64
b64ToInt(s: string): number          // Decode CESR base64 to int
```

**Alphabet:** A-Z, a-z, 0-9, -, _

---

## Constants

```typescript
MaxIntThold = 2**32 - 1  // 4294967295
```

Thresholds above this MUST be hex-encoded.

---

## Counter Codes

TypeScript enum: `CtrDex`. See cesr-spec for the full code registry.

---

## Inception Defaults (icp/dip)

```typescript
isith = max(1, ceil(keys.length / 2))
nsith = max(0, ceil(ndigs.length / 2))
toad  = ample(wits.length) or 0
version = Versionage  // 1.0
kind = Serials.JSON
```

---

## Event Type Summary

| Ilk | Required Signatures |
|-----|---------------------|
| icp | Current keys (kt, k) |
| dip | Current keys + delegator anchor |
| rot | Prior keys (before rotation) |
| drt | Prior keys + delegator anchor |
| ixn | Current keys (from last establishment) |
| rpy | None (or signer's keys if authenticated) |
| ksn | None |
