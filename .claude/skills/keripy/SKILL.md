---
name: keripy
description: >
  Python KERI reference implementation. Auto-activates when working with keripy imports,
  KERI event processing in Python, Hab/Habery identifier management, LMDB database ops
  (Baser, Suber, Komer), Python CESR primitives (Matter, Verfer, Diger, Signer), Serder
  serialization, VDR/TEL credential registries, or keria cloud agent code. Covers the full
  Python API: constructors, class hierarchies, database schemas, HIO orchestration, and
  error handling. Defers to cesr/spec/acdc for protocol theory; focuses on
  Python API specifics.
---

# keripy — Python KERI Reference Implementation

## Overview

keripy is the canonical Python implementation of KERI (Key Event Receipt Infrastructure),
providing the complete protocol stack: CESR primitives, event creation/validation, key state
management, LMDB persistence, identifier lifecycle (Habery/Hab), credential registries (VDR),
and IPEX credential exchange. It uses HIO (Hierarchical Input/Output) for async orchestration
via Doer subclasses.

keripy follows the KERI naming conventions: gerund modules (`-ing`), agent noun classes (`-er`),
codex tables (`-Dex`), transform functions (`-ify`), and namedtuple results (`-age`).

**Companion skills:** For CESR encoding theory and code tables, see **cesr**. For KERI
event model and validation rules, see **spec**. For ACDC credential structure and IPEX
protocol, see **acdc**.

## Quick Reference

| Class | Module | Purpose |
|-------|--------|---------|
| `Matter` | core.coring | Base CESR primitive — qb64/qb2/raw encoding |
| `Verfer` | core.coring | Public verification key |
| `Signer` | core.coring | Private signing key (generates keypair) |
| `Salter` | core.coring | Argon2id salt for key derivation |
| `Diger` | core.coring | Cryptographic digest |
| `Siger` | core.signing | Indexed signature (multisig) |
| `Cigar` | core.signing | Unindexed signature |
| `Counter` | core.counting | CESR stream framing |
| `Serder` | core.serdering | Base saidified message |
| `SerderKERI` | core.serdering | KERI event serializer |
| `SerderACDC` | core.serdering | ACDC credential serializer |
| `Parser` | core.parsing | CESR stream parser |
| `Kever` | core.eventing | Key event verifier (KEL state machine) |
| `Kevery` | core.eventing | Key event message processor |
| `LMDBer` | db.dbing | Base LMDB environment |
| `Baser` | db.basing | KERI database (60+ sub-databases) |
| `Habery` | app.habbing | Shared identifier environment |
| `Hab` | app.habbing | Single identifier (keys, signing, events) |
| `Tever` | vdr.eventing | TEL event verifier |
| `Regery` | vdr.credentialing | Registry manager |

## Import Guide

```python
from keri.core.coring import Matter, Verfer, Diger, Signer, Salter, Saider, Seqner, Number
from keri.core.coring import MtrDex, DigDex, PreDex          # codex tables
from keri.core.signing import Siger, Cigar, IdxSigDex
from keri.core.counting import Counter
from keri.core.serdering import SerderKERI, SerderACDC
from keri.core.parsing import Parser
from keri.core.eventing import incept, rotate, interact, receipt, messagize, Kever, Kevery
from keri.db.dbing import LMDBer, openDB
from keri.db.basing import Baser
from keri.db.subing import Suber, CesrSuber, IoSetSuber
from keri.db.koming import Komer
from keri.app.habbing import Habery, openHby
from keri.vdr.credentialing import Regery, Registry
from keri.kering import KeriError, ValidationError, ShortageError
```

## Reference Files

| File | Contents | Size |
|------|----------|------|
| references/errors-constants.md | Error hierarchy, codex classes, namedtuples, version constants | 3KB |
| references/cesr-primitives.md | Matter base, 16 primitive subclasses, Signer, Salter, encryption, Indexer, Counter | 6KB |
| references/serialization.md | Serder hierarchy, Parser, Router/Revery, Schemer, Structor/Sealer/Blinder, Mapper | 7KB |
| references/eventing.md | Event creation functions, Kever, Kevery, escrow processing | 4KB |
| references/database.md | LMDBer, Baser (60+ sub-dbs), record classes, Suber/Komer hierarchy | 7KB |
| references/app-services.md | Habery/Hab, Manager, agent Doers, Counselor, Oobiery, services | 5KB |
| references/credentials.md | Tever/Tevery, Reger, Regery/Registry, Credentialer, Verifier, IPEX | 3KB |

## Usage Patterns

### 1. Create Identifier

```python
with openHby(name="test", temp=True, salt=b'0123456789abcdef') as hby:
    hab = hby.makeHab(name="alice", icount=1, ncount=1, isith='1', nsith='1')
    assert hab.pre  # AID prefix
```

### 2. Key Operations

```python
signer = Signer(transferable=True)  # generate Ed25519 keypair
verfer = signer.verfer
cigar = signer.sign(ser=msg)  # unindexed
siger = signer.sign(ser=msg, index=0)  # indexed for multisig
assert verfer.verify(sig=cigar.raw, ser=msg)
```

### 3. Create and Parse Events

```python
serder = incept(keys=[verfer.qb64], ndigs=[diger.qb64], code=MtrDex.Blake3_256)
raw = messagize(serder, sigers=[siger])
parser = Parser(kvy=kevery)
parser.parse(ims=bytearray(raw))
```

### 4. Database Access

```python
with openDB(name="test", temp=True) as db:
    baser = Baser(db=db)
    # Typed sub-database
    suber = CesrSuber(db=baser, subkey='mydata.', klas=Verfer)
    suber.put(keys=('pre1',), val=verfer)
    v = suber.get(keys=('pre1',))
```

## Anti-Patterns

**DON'T:** Use `Serder` directly for KERI events — use `SerderKERI` or `SerderACDC`.
**DO:** Use the protocol-specific subclass that validates field domains.

**DON'T:** Construct version strings manually.
**DO:** Use `versify()`/`deversify()` from `keri.kering`.

**DON'T:** Access `Signer.raw` after the object is garbage collected.
**DO:** Derive keys via `Salter.signers()` for reproducible key hierarchies.

**DON'T:** Use `Seqner` for variable-size sequence numbers.
**DO:** Use `Number` (auto-sizes) for general ordinals; `Seqner` only for fixed 24-char format.

**DON'T:** Open LMDB environments without context managers.
**DO:** Use `openDB()`, `openHby()`, `openReger()` context managers for cleanup.
