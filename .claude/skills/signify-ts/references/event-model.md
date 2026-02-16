# Event Model — signify-ts

Compact reference for KERI event structure and field semantics.

---

## Event Types (Ilks)

```typescript
icp="icp", rot="rot", ixn="ixn", dip="dip", drt="drt", rct="rct", vrc="vrc", rpy="rpy", exn="exn", vcp="vcp", iss="iss", rev="rev"
```

**Semantics:** Establishment events (icp/rot/dip/drt) change key state. Non-establishment (ixn) anchors data without key changes. Delegated (dip/drt) require delegator approval. Reply (rpy) are service responses. Exchange (exn) for peer coordination.

---

## Serialization

```typescript
enum Serials { JSON = "JSON", MGPK = "MGPK", CBOR = "CBOR" }
enum Ident { KERI = "KERI", ACDC = "ACDC" }
```

**Default:** `Serials.JSON`

---

## Version Strings

```typescript
versify(ident = Ident.KERI, kind = Serials.JSON, version = Versionage, size = 0): string
deversify(vs: string): [Ident, Serials, Version, string]
```

**Format:** `{proto}{major}{minor}{kind}{size}_` → Example: `KERI10JSON00007b_` = KERI v1.0, JSON, 123 bytes
**Pattern:** `VEREX = /(KERI|ACDC)([0-9a-f])([0-9a-f])([A-Z]{4})([0-9a-f]{6})_/`
**Constants:** `VERFULLSIZE=17, MINSNIFFSIZE=29, MINSIGSIZE=4`

---

## Event Field Ordering

**icp:** `["v","i","s","t","kt","k","n","bt","b","c","a"]`
**dip:** `["v","i","s","t","kt","k","n","bt","b","c","a","di"]`
**rot/drt:** `["v","i","s","t","p","kt","k","n","bt","br","ba","a"]`
**ixn:** `["v","i","s","t","p","a"]`
**rpy:** `["v","t","d","dt","r","a"]`
**ksn:** `["v","i","s","t","p","d","f","dt","et","kt","k","n","bt","b","c","ee","di","r"]`

Fields MUST appear in this order in serialized KEDs.

---

## Field Meanings

v=version string, i=AID prefix (qb64), s=hex sequence (0-indexed), t=ilk, kt=signing threshold (int/hex/weighted), k=current keys (qb64 Verfer[]), n=next digests (qb64 Diger[]), bt=witness threshold (toad), b=witness prefixes (qb64[]), c=config traits (string[]), a=anchors (seal objects), di=delegator identifier (qb64), p=prior digest (qb64 Diger), br=witness cuts (qb64[]), ba=witness adds (qb64[]), d=SAID digest or payload, f=first seen ordinal, dt=ISO 8601 timestamp, et=establishment type, ee=establishment event, r=route/reply path

---

## Inception (icp/dip)

**Identifier derivation:**
- Single non-digestive key: `i = keys[0]`
- Digestive code: `i = SAID(ked)`
- Delegated (dip): MUST use digestive code, includes `di` field

**Defaults:** `isith = max(1, ceil(keys.length/2))`, `nsith = max(0, ceil(ndigs.length/2))`, `toad = ample(wits.length)` or `0`, `version = Versionage (1.0)`, `kind = Serials.JSON`

**Validation:** `tholder.num >= 1`, `tholder.size <= keys.length`, no duplicate wits, `1 <= toad <= |wits|` OR `toad == 0` if no witnesses

---

## Rotation (rot/drt)

**Witness set update:** `new_wits = (wits - cuts) ∪ adds`

**Validation:** `sn >= 1`, no duplicates in wits/cuts/adds, `wits ∩ adds = ∅`, `cuts ∩ adds = ∅`, `1 <= toad <= |new_wits|` OR `toad == 0`

**Defaults:** `ilk = Ilks.rot`, `sn = 1`, `intive = true` (use int thresholds when <= MaxIntThold)

---

## Interaction (ixn)

**Rules:** `sn >= 1`, no key/witness changes, signed by current keys (from last establishment)

---

## Reply (rpy)

**Fields:** No `i` or `s` (not part of KEL), `d` = SAID of reply message, `dt` = ISO 8601 timestamp (auto-generated)

---

## Anchor/Seal Semantics

**SealEvent:** `{i: string, s: string, d: string}` — reference specific event by identifier, sequence, digest. Counter: `-F` (TransIdxSigGroups)

**SealLast:** `{i: string}` — reference latest event by identifier only. Counter: `-H` (TransLastIdxSigGroups)

**Other Seals:** SealSourceCouples (`-G`): (s,d) pairs; SealSourceTriples (`-I`): (s,n,d) triples

---

## Counter Codes (CtrDex)

`-A`=ControllerIdxSigs, `-B`=WitnessIdxSigs, `-C`=NonTransReceiptCouples, `-D`=TransReceiptQuadruples, `-E`=FirstSeenReplayCouples, `-F`=TransIdxSigGroups (seal event i,s,d), `-G`=SealSourceCouples (s,d), `-H`=TransLastIdxSigGroups (seal last i), `-I`=SealSourceTriples (s,n,d), `-J`=SadPathSig, `-K`=SadPathSigGroup, `-L`=PathedMaterialQuadlets, `-V`=AttachedMaterialQuadlets, `-0V`=BigAttachedMaterialQuadlets, `--AAA`=KERIProtocolStack

---

## Constants

```typescript
MaxIntThold = 2**32 - 1  // 4294967295 — max integer threshold
```

Thresholds above this MUST be hex-encoded.

---

## Base64-Integer Conversion

```typescript
intToB64(i: number, l = 1): string      // Encode int as CESR base64
b64ToInt(s: string): number             // Decode CESR base64 to int
```

**Alphabet:** A-Z, a-z, 0-9, -, _

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
