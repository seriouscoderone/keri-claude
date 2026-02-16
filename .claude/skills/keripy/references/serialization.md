# serialization — Serder, Parser, Structor, Mapper

> For version strings and SAID algorithm, see cesr-spec. For event field semantics, see keri-spec. For BADA policy, see keri-spec routing-discovery ref.

**Source:** `core/serdering.py`, `core/parsing.py`, `core/routing.py`, `core/scheming.py`, `core/structing.py`, `core/mapping.py`, `core/annotating.py`

---

## 1. Serder Hierarchy

**Serder** — Base class for saidified messages. Constructor: `__init__(*, raw=b'', sad=None, strip=False, verify=True, makify=False, proto=None, pvrsn=None, genus=GenDex.KERI, kind=None, ilk=None, saids=None)`. Key params: `raw` (bytes), `sad` (dict), `makify` (compute saids/sizes), `verify` (verify saids).

**Properties:** `.raw` (bytes), `.sad` (dict), `.proto` (KERI/ACDC), `.pvrsn` (Versionage), `.genus`, `.kind` (json/cbor/mgpk/cesr), `.size`, `.said` (qb64), `.ilk` (packet type).

**Methods:** `verify()` (bool), `makify(sad, ...)` (compute saids/sizes), `compare(said)` (bool), `pretty()` (str), `loads(raw, kind)` (dict), `dumps(sad, kind)` (bytes).

**SerderKERI** — KERI events. Additional properties: `.estive` (bool: icp/rot/dip/drt), `.ked` (alias .sad), `.pre` (sad["i"]), `.sner/.sn/.snh` (sequence number), `.seals` (sad["a"]), `.traits` (sad["c"]), `.tholder` (sad["kt"]), `.keys/.verfers` (sad["k"]), `.ntholder` (sad["nt"]), `.ndigs` (sad["n"]), `.backs` (sad["b"]), `.prior` (sad["p"]).

**SerderACDC** — ACDC credentials. Additional properties: `.uuid` (sad["u"]), `.issuer` (sad["i"]), `.regid` (sad["ri"]/sad["rd"]), `.schema` (sad["s"]), `.attrib` (sad["a"]), `.issuee` (sad["a"]["i"]), `.aggreg` (sad["A"]), `.edge` (sad["e"]), `.rule` (sad["r"]). Methods support compactification.

**Serdery** — Factory. `reap(ims, genus, svrsn, ...)` → Serder subclass from stream.

**FieldDom** — dataclass: `alls` (allowed fields), `opts` (optional), `alts` (alternate), `saids` (saidive), `strict` (bool).

---

## 2. Parser (Stream Parsing)

**Constructor:** `__init__(ims=None, framed=True, piped=False, kvy=None, tvy=None, exc=None, rvy=None, vry=None, local=False, version=Vrsn_2_0)`. Params: `ims` (bytearray stream), `framed` (single/multiple), `kvy/tvy/exc/rvy/vry` (message routers), `local` (bool), `version` (CESR version).

**Methods:** `parse(ims, ...)` (blocking: all msgs), `parseOne(ims, ...)` (blocking: one msg), `allParsator(ims, ...)` (gen: all then return), `onceParsator(ims, ...)` (gen: one then return), `parsator(ims, ...)` (gen: never returns), `extract(ims, klas, cold)` (extract instance).

**Attachment Extraction:** `_<Type><Version>(exts, ims, ctr, cold, abort)` updates `exts` dict: `sigers` (controller sigs), `wigers` (witness sigs), `cigars` (non-trans receipts), `trqs` (trans receipt quads), `tsgs` (trans sig groups), `frcs` (first-seen replay), `sscs` (seal source couples), `ssts` (seal source triples).

---

## 3. Router & Revery (Reply Routing)

**Router** — `__init__(routes=None)`, `addRoute(routeTemplate, resource, suffix=None)`, `dispatch(serder, saider, cigars, tsgs)`. Dispatch RPY by route to handlers via `processReply{suffix}()`.

**Revery** — `__init__(db, rtr=None, cues=None, lax=True, local=False)`, `processReply(serder, cigars, tsgs)`, `acceptReply(...)` → bool, `processEscrowReply()`. BADA policy: accept if datetime + sn > old. Escrow if last Est Evt pending.

---

## 4. Schemer (Schema Validation)

**Schemer** — `__init__(raw=b'', sed=None, kind=None, typ=JSONSchema(), code=MtrDex.Blake3_256, verify=True)`. Properties: `.raw`, `.sed`, `.kind`, `.saider`, `.said`. Methods: `verify(raw)` → bool, `pretty()` → str.

**JSONSchema** — Draft 7 validation. `load()`, `dump()`, `verify_json()`, `verify_schema()`.

**CacheResolver** — $ref resolution. `add(key, schema)`, `resolve(uri)`.

---

## 5. Structor Classes (CESR Native Structures)

**Structor** — Base class. `__init__(data=None, *, clan=None, cast=None, crew=None, naive=False, qb64b=None, qb64=None, qb2=None, strip=False, makify=False, verify=True, saids=None, saidive=False)`. Properties: `.data` (NamedTuple), `.clan` (type), `.cast` (Castage), `.crew` (qb64 values), `.qb64/.qb2`, `.said`, `.asdict`. Class methods: `enclose(structors, cold)` → bytearray, `extract(qb64b, ...)` → list.

**Sealer** — KERI Seals. Clans: `SealDigest(d)`, `SealRoot(rd)`, `SealSource(s, d)`, `SealEvent(i, s, d)`, `SealLast(i)`, `SealBack(bi, d)`, `SealKind(t, d)`.

**Blinder** — ACDC blinded state. Clans: `BlindState(d, u, td, ts)`, `BoundState(d, u, td, ts, bsn, bd)`. Properties: `.blid`, `.uuid`, `.acdc`, `.state`, `.bsn`, `.bd`. Class methods: `blind(*, salt, sn, acdc, state, bound, ...)` → Blinder, `unblind(said, *, uuid, acdc, states, salt, sn, bound, ...)` → Blinder | None.

**Mediar** — IANA media type with blindable SAID. Properties: `.uuid`, `.mt`, `.mv`.

---

## 6. Mapper Classes (CESR Native Field Maps)

**Mapper** — `__init__(*, mad=None, raw=None, qb64b=None, qb64=None, qb2=None, strip=False, makify=False, verify=True, strict=True, saids=None, saidive=False, kind=Kinds.cesr)`. Properties: `.mad` (dict), `.raw/.qb64/.qb2`, `.count`, `.size`, `.said`, `.kind`.

**Compactor** — Hierarchical partial disclosure. Properties: `.leaves` (path → Mapper), `.partials` (variants), `.iscompact` (bool | None). Methods: `trace(saidify)` → list[str], `getTail(path, mad)`, `getMad(path, mad)`, `compact()`, `expand(greedy)`.

**Aggor** — Aggregate lists (AGID). `__init__(*, ael=None, raw=None, qb64b=None, qb64=None, qb2=None, strip=False, code=DigDex.Blake3_256, makify=False, verify=True, strict=True, saids=None, kind=Kinds.cesr)`. Properties: `.agid`, `.ael`, `.code`. Class method: `verifyDisclosure(ael, kind, code, saids)` → bool. Instance method: `disclose(indices)` → tuple[ael, kind].

---

## 7. Annotating

`annot(ims)` → str (annotate CESR stream for readability), `denot(ams)` → bytes (de-annotate).

---

## 8. Key Patterns

- **Deserialize:** `Serder(raw=bytes)` or `Serder(raw=bytes, verify=False)`
- **Create with SAID:** `Serder(sad=dict, makify=True, kind=Kinds.json)`
- **Parse stream:** `Parser(kvy=kevery, tvy=tevery).parse(ims=bytearray(...))`
- **Route replies:** `Router().addRoute(template, resource)` → `Revery(db, rtr).processReply(serder, cigars, tsgs)`
- **Seals:** `Sealer(data=SealDigest(d=diger))`, `Sealer.enclose([...])`, `Sealer.extract(qb64b=...)`
- **Blinding:** `Blinder.blind(salt=, sn=, acdc=, state=)`, `Blinder.unblind(said=, salt=, states=)`
- **Maps:** `Mapper(mad=dict, makify=True, saidive=True)`, `Compactor(mad=, makify=True).trace(saidify=True)`
