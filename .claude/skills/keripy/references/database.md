# database — LMDB Persistence Layer

> keripy-specific. No spec overlap.

**Source:** `db/dbing.py`, `db/basing.py`, `db/subing.py`, `db/koming.py`, `db/escrowing.py`

## Three-Tier Architecture

**LMDBer (Base)** → raw LMDB environment + key-value operations
**Baser (KERI)** → 60+ named sub-databases for events/state/endpoints
**Suber/Komer (Typed)** → type-safe wrappers with serialization

## LMDBer (Base Layer)

**Constructor:**
```python
LMDBer(name="main", temp=False, headDirPath=None, perm=0o775,
       reopen=False, reload=False, clean=False)
```

**Attributes:** `name`, `temp`, `path`, `perm`, `env`, `opened`, `headDirPath`, `MapSize`, `MaxDBs`

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `reopen(**kwa)` | Open/reopen environment |
| `close(clear=False)` | Close environment |
| `putVal(db, key, val)` | Put value (no overwrite) |
| `setVal(db, key, val)` | Set value (overwrite) |
| `getVal(db, key)` | Get value or None |
| `delVal(db, key)` | Delete value |
| `putIoVals(db, key, vals)` | Put multiple vals (dupsort) |
| `addIoVal(db, key, val)` | Add val (dupsort) |
| `getIoVals(db, key)` | Get all vals (dupsort) |
| `getAllOrdItemIter(db, key)` | Iterate all items |

**Key Construction:**
- `snKey(pre, sn)` → `{pre}{sn:032x}` (sequence number)
- `dgKey(pre, dig)` → `{pre}{dig}` (digest)
- `fnKey(pre, fn)` → `{pre}{fn:032x}` (first seen ordinal)
- `splitKey(key, sep='.')` → split at last separator
- `splitKeySN(key)` → split into (pre, sn)

**Context Managers:**
```python
with openDB(name="test", temp=True) as baser: ...
with reopenDB(db) as env: ...
```

## Baser Named Sub-Databases (60+ total, all end with `.`)

**Core events:** `evts.` (event bytes), `kels.` (KEL sn→dig), `fels.` (FEL fn→dig), `fons.` (dig→fn), `dtss.` (timestamps), `aess.` (authz seals), `esrs.` (event source)

**Signatures/receipts:** `sigs.`, `wigs.` (indexed sigs), `rcts.`, `ures.`, `vrcs.`, `vres.` (receipts)

**Escrows:** `pses.`, `pwes.` (partial sig/witness), `pdes.`, `udes.`, `uwes.` (delegation), `ooes.` (out-of-order), `dels.`, `ldes.` (duplicitous), `qnfs.`, `mfes.`, `dees.` (query/misfit/delegable)

**Key state:** `stts.` (KeyStateRecord), `wits.` (witness lists)

**Habitats:** `habs.` (HabitatRecord), `names.` (name→AID)

**SAD:** `sdts.`, `ssgs.`, `scgs.` (SAD timestamps/sigs)

**Replies:** `rpys.`, `rpes.` (reply messages/escrow)

**Endpoints:** `eans.`, `lans.` (AuthN/AuthZ), `ends.`, `locs.`, `obvs.` (endpoint/location/observed), `witm.` (mailbox topics)

**Group multisig:** `gpse.`, `gdee.`, `gpwe.` (escrows), `cgms.` (completed)

**Exchange:** `epse.`, `epsd.`, `exns.`, `erpy.`, `esigs.`, `ecigs.`, `epath.`, `essrs.` (partial sig/messages/sigs/attachments)

**Challenge-response:** `chas.`, `reps.` (accepted/successful)

**OOBI:** `wkas.`, `oobis.`, `eoobi.`, `coobi.`, `roobi.`, `woobi.`, `moobi.`, `mfa.`, `rmfa.` (authorized/loaded/escrowed/outstanding/resolved/MFA)

**KSN:** `kdts.`, `ksns.`, `knas.`, `wwas.` (KSN timestamps/notices/SAIDs/watcher)

**Schema/metadata:** `schema.`, `cfld.`, `hbys.`, `cons.`, `ccigs.`, `imgs.`, `ifld.`, `sids.`, `icigs.`, `iimgs.` (schemas/contacts/identifiers/images)

**Delegation escrows:** `dpwe.`, `dune.`, `dpub.`, `cdel.` (delegated partial witness/unanchored/publication/completed)

**Multisig:** `meids.`, `maids.` (SAID→messages/AIDs)

**System:** `migs.`, `vers.` (migrations/versions), `pubs.`, `digs.` (public key/digest indices)

## Record Classes

| Class | Fields |
|-------|--------|
| `StateEERecord` | s, d, br, ba |
| `KeyStateRecord` | vn, i, s, p, d, f, dt, et, kt, k, nt, n, bt, b, c, ee, di |
| `EventSourceRecord` | local |
| `HabitatRecord` | hid, name, domain, mid, smids, rmids, sid, watchers |
| `TopicsRecord` | topics |
| `OobiQueryRecord` | cid, role, eids, scheme |
| `OobiRecord` | oobialias, said, cid, eid, role, date, state, urls |
| `EndpointRecord` | allowed, enabled, name |
| `EndAuthRecord` | cid, roles |
| `LocationRecord` | url |
| `ObservedRecord` | enabled, name, datetime |
| `WellKnownAuthN` | url, dt |

All records inherit from `RawRecord` with `_asdict()`, `_asjson()`, `_ascbor()`, `_asmgpk()` methods.

## Suber/Komer Hierarchy

**Suber variants:**
- `Suber` — simple key-value: `put`, `pin`, `get`, `rem`
- `OnSuber` — ordinal keys: `putOn`, `pinOn`, `appendOn`, `getOn`, `remOn`, `cntOn`
- `CesrSuber` — CESR Matter values: `put`, `get` (serializes qb64b)
- `CatCesrSuber` — concatenated CESR tuples: `put`, `get` (tuple→qb64b)
- `IoSetSuber` — insertion-ordered set: `put`, `add`, `get`, `getLast`, `rem`, `cnt`
- `CesrIoSetSuber` — CESR insertion-ordered
- `CatCesrIoSetSuber` — concatenated CESR insertion-ordered
- `SerderSuber` — Serder messages: `put`, `get` (serializes .raw)
- `SerderIoSetSuber` — Serder insertion-ordered
- `DupSuber` — lexicographic duplicates (dupsort=True)
- `IoDupSuber` — insertion-ordered duplicates (dupsort=True + proem)
- `OnIoDupSuber` — ordinal + insertion duplicates

**Komer variants (dataclass storage):**
- `Komer` — simple: `put`, `pin`, `get`, `getDict`, `rem`
- `IoSetKomer` — insertion-ordered: `put`, `add`, `get`, `getLast`, `getIter`
- `DupKomer` — lexicographic (dupsort=True)

**Serialization:** `kind=coring.Kinds.json` (default), `.cbor`, `.mgpk`

## Broker (Escrow Manager)

**Constructor:** `Broker(db, subkey, timeout=3600)`

**Attributes:** `db`, `timeout`, `daterdb` (CesrSuber→Dater), `serderdb` (SerderSuber), `tigerdb` (CesrIoSetSuber→Siger), `cigardb` (CatCesrIoSetSuber→Verfer+Cigar), `escrowdb` (CesrIoSetSuber→Saider), `saiderdb` (CesrSuber→Saider)

**Methods:**
- `current(keys)` → get saved TSN SAID by (prefix, aid)
- `processEscrowState(typ, processReply, extype)` → process escrows
- `escrowStateNotice(typ, pre, aid, serder, saider, dater, cigars, tsgs)` → escrow reply
- `updateReply(aid, serder, saider, dater)` → update reply SAD
- `removeState(saider)` → remove all state for TSN

## CRUD Pattern Summary

All Suber/Komer: `put(keys=tuple, val=)`, `get(keys=)`, `rem(keys=)`. IoSet adds `add()`, `getLast()`, `cnt()`. On adds `putOn(on=)`, `getOn(on=)`, `appendOn()`, `cntOn()`. CesrSuber serializes via `.qb64b`. CatCesrSuber stores tuples of CESR primitives. Komer stores dataclass instances via JSON/CBOR/MGPK.

## Configuration

**Default Paths:** `/usr/local/var/keri/db/{name}` (persistent), `/tmp/keri_lmdb_{random}/` (temp)
**Map Size:** 100 MB default, override via `KERI_BASER_MAP_SIZE` env var
**Max Named DBs:** 24
**Permissions:** 0o775 default
**Separator:** `.` (default for Suber/Komer)
**Dupsort Limit:** 511 bytes per key+value when dupsort=True
**Ordinal Format:** 32-character hex with leading zeros
**Escrow Timeout:** 3600 seconds (1 hour)
