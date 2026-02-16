# Identifier Lifecycle — signify-ts

KERI identifier key management, event construction, serialization, signing.

**Flow:** Key Generation → Storage → Manager → Event Construction → Serialization → Signing

---

## Key Generation

```typescript
interface Creator { create(codes, count, code, transferable, pidx?, ridx?, kidx?, temp?): Keys; salt: string; stem: string; tier: Tier }
class RandyCreator implements Creator  // Random, NO PATHS, encryption REQUIRED
class SaltyCreator implements Creator  // Deterministic path = stem + ridx(hex32) + kidx(hex32)
class Creatory { constructor(algo=salty); make(...args): Creator }
enum Algos { randy, salty, group }
```

**Pattern:** `Creatory.make(algo, salt?, stem?, tier?)` → `creator.create(...)` → `Keys {signers, paths?}`

**Defaults:** code=`Ed25519_Seed`, tier=`Tier.low`, stem=`"signify:aid"`

---

## Storage

```typescript
interface KeyStore {
  getPres(key): string?; pinPres(key, val): void
  getPrms(key): PrePrm?; putPrms(key, val): bool; pinPrms(key, val): void
  getPris(key): Cipher?; putPris(key, val): bool; pinPris(key, val): void
  getPths(key): PubPath?; putPths(key, val): bool; pinPths(key, val): void
  getSits(key): PreSit?; putSits(key, val): bool; pinSits(key, val): void
  getPubs(key): PubSet?; putPubs(key, val): bool; pinPubs(key, val): void
}
```

**Semantics:** `putX`=insert-only (false if exists), `pinX`=upsert, `getX`=read, `remX`=delete

**Storage key:** `riKey(pre, ridx) = pre + "." + ridx(hex32)`

**Types:** PrePrm (params), PreSit (key state: old/new/nxt PubLots), Cipher (encrypted keys), PubPath (derivation paths), PubSet (public keys)

**Modes:** Encrypted (putPris), Salty unencrypted (putPths, regenerate), Randy unencrypted (ERROR)

---

## Keepers

```typescript
class SaltyKeeper {
  constructor(salter, pidx, kidx=0, tier=low, transferable=false, stem?, code=Ed25519_Seed, count=1, icodes?,
              ncode=Ed25519_Seed, ncount=1, ncodes?, dcode=Blake3_256, bran?, sxlt?)
  params(): PrePrm; incept(transferable): [Verfer[], Diger[]]; rotate(ncodes?, transferable?): [Verfer[], Diger[]]
  sign(ser, indexed, indices?, ondices?): Siger[] | Cigar[]
}
class RandyKeeper { /* same signature, encryption REQUIRED */ }
class GroupKeeper { constructor(manager, mhab?, states?, rstates?, keys?, ndigs?) /* delegates */ }
class KeyManager { static new(algo, pidx, kargs): Keeper; static get(aid): Keeper }
```

---

## Manager

```typescript
interface ManagerArgs { ks?: KeyStore; seed?: string; aeid?: string; pidx?: number; algo?: Algos; salter?: Salter; tier?: string }

class Manager {
  constructor(args: ManagerArgs)

  incept({icodes?, icount=1, icode=Ed25519_Seed, ncodes?, ncount=1, ncode=Ed25519_Seed, dcode=Blake3_256,
          algo?, salt?, stem?, tier?, rooted=true, transferable=true, temp=false}): [Verfer[], Diger[]]
  // Create Creator → generate signing (ridx=0) + rotation (ridx=1) keys → store → increment pidx

  rotate({pre, ncodes?, ncount=1, ncode=Ed25519_Seed, dcode=Blake3_256, transferable=true, temp=false, erase=true}): [Verfer[], Diger[]]
  // Retrieve → shift: old←new, new←nxt → decrypt/regenerate → generate new nxt (ridx+1) → update → store → delete old if erase

  sign({ser, pubs?, verfers?, indexed=true, indices?, ondices?}): Siger[] | Cigar[]

  move(old: string, gnu: string): void
}

function openManager(passcode: string, salt?: string): Manager  // Passcode min 21 chars
```

**Defaults:** ks=`new Keeper()`, pidx=0, algo=salty, tier=Tier.low

---

## Event Construction

```typescript
// Inception
incept({keys, isith?, ndigs=[], nsith?, toad?, wits=[], cnfg=[], data=[], version?, kind=JSON, code?, intive=false, delpre?}): Serder
// Defaults: isith=max(1,⌈keys.length/2⌉), nsith=max(0,⌈ndigs.length/2⌉), toad=ample(wits.length)|0
// Versify → ilk=delpre?"dip":"icp" → Tholder → validate wits → ked → Prefixer → Saidify → Serder

// Rotation
rotate({pre, keys, dig, ilk=rot, sn=1, isith?, ndigs=[], nsith?, toad?, wits=[], cuts=[], adds=[], cnfg=[], data=[], version?, kind=JSON, intive=true}): Serder
// Defaults: isith=max(1,⌈keys.length/2⌉), nsith=max(1,⌈ndigs.length/2⌉), toad=ample(newitset.size)|0
// Versify → validate ilk(rot/drt), sn≥1 → Tholder → validate witness sets → newitset=(wits-cuts)+adds → ked → Saidify → Serder

// Interaction
interact({pre, dig, sn, data=[], version?, kind=JSON}): Serder

// Reply
reply(route="", data={}, stamp=new Date().toISOString(), version?, kind=JSON): Serder

// Witness Threshold
ample(n, f=max(1,floor((n-1)/3)), weak=true): number  // weak: min(n,ceil((n+f+1)/2)), strong: min(n,max(n-f,ceil((n+f+1)/2)))
```

---

## Serialization

```typescript
class Serder {
  constructor(ked: Dict<any>, kind=JSON, code?)
  get pre(): string; get ked(): Dict<any>; get raw(): Uint8Array; get verfers(): Verfer[]; get digers(): Diger[]
  pretty(): string
}
```

---

## Counters & Attachments

**Codes:** `-A` ControllerIdxSigs, `-B` WitnessIdxSigs, `-C` NonTransReceiptCouples, `-D` TransReceiptQuadruples, `-E` FirstSeenReplayCouples, `-F` TransIdxSigGroups, `-G` SealSourceCouples, `-H` TransLastIdxSigGroups, `-I` SealSourceTriples, `-V` AttachedMaterialQuadlets, `-0V` BigAttachedMaterialQuadlets

```typescript
class Counter { constructor({code?, count=1, countB64?, qb64b?, qb64?, qb2?}); get code/count/qb64(): string/number/string }
```

---

## Signing Workflow

```typescript
messagize(serder: Serder, sigers?: Siger[], seal?: any, wigers?: Cigar[], cigars?: Cigar[], pipelined=false): Uint8Array
```

**Steps:** msg=serder.raw → build atc (seal: TransIdxSigGroups/TransLastIdxSigGroups, sigers: ControllerIdxSigs+qb64b, wigers: validate+counter+qb64b, cigars: validate+counter+qb64b, pipelined: quadlet count+AttachedMaterialQuadlets) → msg+atc

**Errors:** Missing all signatures, transferable prefix in wigers/cigars, atc.length%4!=0 when pipelined

---

## Lifecycle State Transitions

```
[Uninitialized] → openManager(passcode)
             → mgr.incept({icount,ncount}) → [Incepted] ridx=0
             → incept({keys,ndigs}) → Serder + mgr.sign → messagize → [Published Inception]
             → mgr.rotate({pre,ncount}) → shift old←new←nxt, nxt←new(ridx+1) → [Rotated] ridx=1
             → rotate({pre,keys,dig,sn:1,ndigs}) → Serder + mgr.sign → messagize → [Published Rotation]
             → interact({pre,dig,sn:2,data}) → Serder + mgr.sign → messagize → [Published Interaction]
```

---

## Key Errors

**Manager:** "Bran too short" (passcode<21), "Already incepted" (putPres fails), "randy keys without encryption", "Attempt to rotate nonexistent pre", "Missing prikey in db"

**Event:** "sn < 1", "tholder.num < 1" (isith/nsith rotation), "tholder.num < 0" (nsith inception), "tholder.size > keys.length", duplicate/intersecting wits/cuts/adds, "saider.verify() fails"

**Messagize:** "Missing all signature types", "Transferable prefix used for receipt"

---

## Dependencies

Encrypter/Decrypter, Salter/Tier, Signer/Verfer, MtrDex, Diger, Cigar/Siger, Cipher, Prefixer, Tholder, Saider, CesrNumber/Seqner, Versionage/Ident/Ilks/Serials
