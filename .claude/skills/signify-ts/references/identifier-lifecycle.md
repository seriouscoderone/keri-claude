# Identifier Lifecycle — signify-ts

> For key state machine, event construction rules, and threshold semantics, see **keri-spec** skill. For CESR encoding and SAID algorithms, see **cesr-spec** skill.

TypeScript API for KERI identifier key management, event construction, serialization, signing.

---

## Key Generation

```typescript
class SaltyCreator implements Creator  // Deterministic, path = stem + ridx(hex32) + kidx(hex32)
class RandyCreator implements Creator  // Random, encryption REQUIRED
class Creatory { constructor(algo=salty); make(algo, salt?, stem?, tier?): Creator }
enum Algos { randy, salty, group }
```

`Creatory.make()` → `creator.create(codes, count, code, transferable, pidx?, ridx?, kidx?, temp?)` → `Keys {signers, paths?}`

---

## Storage

```typescript
interface KeyStore {
  // Stores: Pres(string), Prms(PrePrm), Pris(Cipher), Pths(PubPath), Sits(PreSit), Pubs(PubSet)
  // Each: getX, putX (insert-only), pinX (upsert), remX (delete)
}
```

**Key format:** `riKey(pre, ridx) = pre + "." + ridx(hex32)`

---

## Keepers

```typescript
class SaltyKeeper {
  constructor(salter, pidx, kidx=0, tier=low, transferable=false, stem?, code=Ed25519_Seed,
              count=1, icodes?, ncode=Ed25519_Seed, ncount=1, ncodes?, dcode=Blake3_256, bran?, sxlt?)
  params(): PrePrm; incept(transferable): [Verfer[], Diger[]]
  rotate(ncodes?, transferable?): [Verfer[], Diger[]]
  sign(ser, indexed, indices?, ondices?): Siger[] | Cigar[]
}
class RandyKeeper { /* same interface, encryption REQUIRED */ }
class GroupKeeper { constructor(manager, mhab?, states?, rstates?, keys?, ndigs?) }
```

---

## Manager

```typescript
class Manager {
  constructor({ks?, seed?, aeid?, pidx?, algo?, salter?, tier?}: ManagerArgs)
  incept({icodes?, icount=1, icode=Ed25519_Seed, ncodes?, ncount=1, ncode=Ed25519_Seed,
          dcode=Blake3_256, algo?, salt?, stem?, tier?, rooted=true, transferable=true, temp=false}): [Verfer[], Diger[]]
  rotate({pre, ncodes?, ncount=1, ncode=Ed25519_Seed, dcode=Blake3_256,
          transferable=true, temp=false, erase=true}): [Verfer[], Diger[]]
  sign({ser, pubs?, verfers?, indexed=true, indices?, ondices?}): Siger[] | Cigar[]
  move(old: string, gnu: string): void
}
function openManager(passcode: string, salt?: string): Manager  // passcode min 21 chars
```

---

## Event Construction

```typescript
incept({keys, isith?, ndigs=[], nsith?, toad?, wits=[], cnfg=[], data=[], version?, kind=JSON, code?, intive=false, delpre?}): Serder
rotate({pre, keys, dig, ilk=rot, sn=1, isith?, ndigs=[], nsith?, toad?, wits=[], cuts=[], adds=[], data=[], version?, kind=JSON}): Serder
interact({pre, dig, sn, data=[], version?, kind=JSON}): Serder
reply(route="", data={}, stamp?, version?, kind=JSON): Serder
```

---

## Serialization & Counters

```typescript
class Serder {
  constructor(ked: Dict<any>, kind=JSON, code?)
  get pre/ked/raw/verfers/digers; pretty(): string
}
class Counter { constructor({code?, count=1, qb64b?, qb64?, qb2?}); get code/count/qb64 }
```

**Counter codes:** `-A` ControllerIdxSigs, `-B` WitnessIdxSigs, `-C` NonTransReceiptCouples, `-F` TransIdxSigGroups, `-V` AttachedMaterialQuadlets

---

## Signing

```typescript
messagize(serder: Serder, sigers?: Siger[], seal?: any, wigers?: Cigar[], cigars?: Cigar[], pipelined=false): Uint8Array
```

Assembles serder.raw + attachment groups with Counter codes.

---

## Lifecycle

```
openManager(passcode) → mgr.incept() → [ridx=0]
  → incept({keys,ndigs}) + mgr.sign → messagize → [Published Inception]
  → mgr.rotate({pre}) → [ridx=1]
  → rotate({pre,keys,dig,sn:1}) + mgr.sign → messagize → [Published Rotation]
  → interact({pre,dig,sn:2,data}) + mgr.sign → messagize → [Published Interaction]
```

---

## Errors

**Manager:** "Bran too short" (passcode<21), "Already incepted", "randy keys without encryption", "Attempt to rotate nonexistent pre", "Missing prikey in db"

**Event:** "sn < 1", "tholder.num < 1" (rotation), "tholder.size > keys.length", duplicate wits/cuts/adds

**Messagize:** "Missing all signature types", "Transferable prefix used for receipt"
