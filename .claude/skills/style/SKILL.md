---
name: style
description: KERI (Key Event Receipt Infrastructure) coding style guide implementing "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature". Use when working on KERI protocol implementations (keripy, keriox, signify-ts, keria, or related projects), writing Python code that interfaces with KERI libraries, creating KERI-compatible modules, or when the user explicitly requests KERI coding conventions. This style is characterized by gerund module names (-ing), agent noun classes (-er), codex patterns (-Dex), transformation functions (-ify), and CESR-native abbreviations (qb64, qb2, hs, ss, etc.).
---

# KERI Coding Style Guide

## Overview

The KERI coding style is a **Domain-Specific Linguistic Programming (DSLP)** approach that creates a 1:1 mapping between the KERI specification terminology and code structure. This style makes code self-documenting and enables implementers in other languages to translate patterns while maintaining conceptual fidelity.

**Core Philosophy:** Every naming convention reinforces KERI/CESR concepts. The code reads like the KERI spec itself.

## Quick Reference

### Five Primary Patterns

1. **Modules:** Use gerunds with `-ing` suffix (e.g., `coring.py`, `eventing.py`, `signing.py`)
2. **Classes:** Use agent nouns with `-er` suffix (e.g., `Verfer`, `Diger`, `Siger`, `Salter`)
3. **Code Tables:** Use frozen dataclasses with `-Dex` suffix (e.g., `DigDex`, `PreDex`, `NumDex`)
4. **Transformations:** Use verbs with `-ify` suffix (e.g., `sizeify()`, `versify()`, `saidify()`)
5. **Data Structures:** Use namedtuples with `-age` suffix (e.g., `Versionage`, `Smellage`)

### CESR Abbreviations
```python
qb64   # Qualified base64 string
qb64b  # Qualified base64 bytes
qb2    # Qualified base2 (binary)
hs     # Hard size (code size in sextets)
ss     # Soft size (variable part)
fs     # Full size (total)
cs     # Code size (hs + ss)
ked    # Key Event Dict
raw    # Raw unqualified bytes
```

## When to Apply This Style

**Always use** for:
- KERI protocol implementations (Python, Rust, TypeScript)
- Modules interfacing with keripy, keria, or signify-ts
- Cryptographic primitive wrappers
- CESR encoding/decoding implementations

**Never use** for:
- Generic Python utilities unrelated to KERI
- Public APIs targeting non-KERI developers
- CLI tools for end users (unless internal KERI operations)

## Module Organization

### File Naming Pattern

Use gerunds (present participles) indicating action or capability:

```python
# Core operations
coring.py        # Core cryptographic material classes
eventing.py      # Event processing and validation
signing.py       # Signature operations
indexing.py      # Index-based operations

# Specialized operations
serdering.py     # Serialization/deserialization
parsing.py       # Parsing operations
routing.py       # Message routing

# Database operations
basing.py        # Database foundation
dbing.py         # Database operations
escrowing.py     # Escrow management

# Application operations
agenting.py      # Agent lifecycle
habbing.py       # Habitat (key environment) management
keeping.py       # Key storage operations
oobiing.py       # Out-Of-Band-Introduction operations
```

**Rules:**
- Always gerund form: `event` → `eventing.py`, not `event.py`
- Single word preferred, compounds acceptable: `oobiing.py`
- Never: `utils.py`, `helpers.py`, `common.py` (use gerund equivalents)

### Module Structure Template

```python
# -*- encoding: utf-8 -*-
"""
keri.core.digesting module

[Brief description of module purpose]
"""
import [standard libraries]

from [keri imports]
from ..kering import [exceptions]
from ..help.helping import [utilities]

# Constants and code tables
@dataclass(frozen=True)
class SomeCodex:
    """Code table docstring"""
    pass

SomeDex = SomeCodex()

# Classes
class SomeClass(Matter):
    """Class docstring"""
    pass

# Functions
def someify(arg):
    """Transformation function"""
    pass
```

## Class Design

### Base Class: Matter

All cryptographic material inherits from `Matter`:

```python
class Matter:
    """Base for all qualified cryptographic material"""

    def __init__(self, raw=None, qb64b=None, qb64=None, qb2=None, code=None):
        """Accept material in any qualified or unqualified form"""
        pass

    @property
    def raw(self):
        """Raw unqualified bytes"""
        return self._raw

    @property
    def code(self):
        """Derivation code"""
        return self._code

    @property
    def qb64(self):
        """Qualified base64 string"""
        return self._qb64
```

### Agent Noun Classes

Name classes as "one who does X":

```python
class Verfer(Matter):      # One who verifies (public key)
class Diger(Matter):       # One who digests (hash)
class Siger(Indexer):      # One who signs (indexed signature)
class Salter(Matter):      # One who salts (seed/salt)
class Prefixer(Matter):    # One who prefixes (identifier)
class Seqner(Matter):      # One who sequences (sequence number)
class Dater(Matter):       # One who dates (timestamp)
class Saider(Matter):      # One who creates SAIDs
class Noncer(Diger):       # One who nonces (nonce/UUID)
class Bexter(Matter):      # One who works with bytes/hex
class Texter(Matter):      # One who works with text
class Pather(Matter):      # One who handles paths
class Labeler(Matter):     # One who labels
class Tagger(Matter):      # One who tags
```

**Naming Rules:**
- Derive from base verb: `verify` → `Verfer`, `digest` → `Diger`
- Drop 'e' before -er where natural: `Cigar` (not `Cigarer`)
- Irregular forms acceptable: `Signer` (not `Signor`)

### Class Template

```python
class Diger(Matter):
    """
    Diger class for cryptographic digests

    Inherits from Matter for qualified encoding
    """

    # Override code tables
    Hards = {c: hs for c in DigDex}
    Sizes = {...}

    def __init__(self, raw=None, ser=None, code=DigDex.Blake3_256, **kwa):
        """
        Initialize with raw digest or serialization to digest

        Parameters:
            raw: pre-computed digest bytes
            ser: serialization to digest
            code: algorithm code from DigDex
        """
        if ser is not None:
            raw = self._digest(ser, code)
        super().__init__(raw=raw, code=code, **kwa)

    def verify(self, ser):
        """Verify digest matches serialization"""
        return self.raw == self._digest(ser, self.code)
```

## Code Tables (Codex Pattern)

Use frozen dataclasses with singleton instances:

```python
@dataclass(frozen=True)
class DigestCodex:
    """Digest algorithm derivation codes"""
    Blake3_256: str = 'E'
    Blake2b_256: str = 'F'
    SHA3_256: str = 'H'
    SHA2_256: str = 'I'

    def __iter__(self):
        return iter(astuple(self))

DigDex = DigestCodex()  # Create singleton


@dataclass(frozen=True)
class PrefixCodex:
    """Identifier prefix derivation codes"""
    Ed25519N: str = 'B'    # Non-transferable
    Ed25519: str = 'D'     # Transferable
    X25519: str = 'C'      # Encryption key

    def __iter__(self):
        return iter(astuple(self))

PreDex = PrefixCodex()
```

**Rules:**
- Class name: `<Purpose>Codex`
- Instance name: `<Purpose>Dex`
- Always frozen dataclass
- Include `__iter__` for iteration
- Field names in PascalCase: `Blake3_256`

## Transformation Functions

Use `-ify` suffix for transformations:

```python
def sizeify(ked, kind=None, version=Version):
    """Compute and update size in version string"""
    raw = dumps(ked, kind)
    size = len(raw)
    ked["v"] = versify(kind=kind, size=size, version=version)
    return raw, size


def versify(proto=Protocols.keri, pvrsn=Version, kind=Kinds.json, size=0):
    """Create version string from components"""
    return f"{proto}{pvrsn.major:x}{pvrsn.minor:x}{kind}{size:06x}_"


def deversify(vs):
    """Parse version string into components"""
    match = Rever.match(vs)
    # ... parse and return components


def saidify(ked, label=Saids.d, code=DigDex.Blake3_256):
    """Create Self-Addressing IDentifier for dict"""
    # ... compute SAID digest that includes itself


def klasify(sers, klases):
    """Convert CESR serializations to class instances"""
    return [klas(qb64=ser) for ser, klas in zip(sers, klases)]


def dictify(dataclass_instance):
    """Convert dataclass to dict"""
    return asdict(dataclass_instance)
```

**Rules:**
- Transformation: `<base>ify`
- Inverse: `de<base>ify`
- Document transformation clearly
- Return transformed value

## Data Structures

Use namedtuples with `-age` suffix:

```python
Versionage = namedtuple("Versionage", "major minor")
Version = Versionage(major=1, minor=0)

Kindage = namedtuple("Kindage", "json mgpk cbor cesr")
Kinds = Kindage(json='JSON', mgpk='MGPK', cbor='CBOR', cesr='CESR')

Protocolage = namedtuple("Protocolage", "keri acdc")
Protocols = Protocolage(keri="KERI", acdc="ACDC")

Smellage = namedtuple("Smellage", "proto pvrsn kind size gvrsn")

Digestage = namedtuple("Digestage", "klas size length")
```

**Rules:**
- Type: `<Concept>age`
- Instance: Plural or singular based on semantics
- Field names: lowercase, abbreviated appropriately

## Helper Functions

Use creative descriptive names:

```python
def smell(raw):
    """Sniff/detect version string in bytes"""
    match = Rever.search(raw)
    return rematch(match) if match else None


def nabSextets(qb2, num):
    """Nab (grab) num sextets from qb2"""
    return qb2[:sceil(num * 3 / 4)]


def sceil(r):
    """Symmetric ceiling (away from zero)"""
    return int(r) + isign(r - int(r))


def isign(i):
    """Integer sign function"""
    return (1 if i > 0 else -1 if i < 0 else 0)


def simple(n):
    """Simple majority threshold"""
    return min(max(0, n), (max(0, n) // 2) + 1)


def ample(n, f=None, weak=True):
    """Byzantine fault tolerant (ample) majority"""
    # ... compute BFT threshold
```

## Variable Naming

### CESR Abbreviations

```python
qb64    # Qualified base64 string (str)
qb64b   # Qualified base64 bytes (bytes)
qb2     # Qualified base2/binary (bytes)

hs      # Hard size (code size in sextets)
ss      # Soft size (variable size in sextets)
xs      # Extra size (padding in sextets)
fs      # Full size (total in sextets)
ls      # Lead size (leading bytes)
cs      # Code size (hs + ss)
ps      # Pad size (for alignment)

bhs     # Byte hard size
bcs     # Byte code size
bfs     # Byte full size
```

### Key Event Dict Fields

```python
v       # Version string
t       # Type (ilk)
d       # Digest (SAID)
i       # Identifier prefix
s       # Sequence number
p       # Prior event digest
kt      # Key threshold
k       # Keys (current)
nt      # Next threshold
n       # Next key digests
bt      # Witness threshold
b       # Witness list (backers)
```

### Common Terms

```python
ked     # Key Event Dict
ser     # Serialization
dig     # Digest
pre     # Prefix
sn      # Sequence number
ilk     # Event type/kind
knd     # Serialization kind
```

## Advanced Patterns

See reference files for detailed patterns:

- **[naming_conventions.md](references/naming_conventions.md)** - Complete naming reference with all patterns and rules
- **[patterns.md](references/patterns.md)** - Matter class pattern, extraction methods, cryptographic primitives, KEDs
- **[examples.md](references/examples.md)** - Complete module examples, class hierarchies, event processing

## Style Checklist

When writing KERI-style code, verify:

- [ ] Module name uses `-ing` suffix
- [ ] Classes use agent noun `-er` suffix
- [ ] Code tables are frozen dataclasses with `-Dex` suffix
- [ ] Transformations use `-ify` suffix
- [ ] Namedtuples use `-age` suffix
- [ ] CESR abbreviations used consistently (`qb64`, `hs`, `ss`, etc.)
- [ ] Material classes inherit from `Matter` with proper extraction methods
- [ ] Helper functions have creative descriptive names
- [ ] Docstrings clearly explain purpose and parameters
- [ ] Code reads like the KERI specification

## Anti-Patterns to Avoid

**Don't:**
```python
# Generic utility names
utils.py              # Use helping.py or specific gerund
helpers.py            # Use helping.py
common.py             # Use specific gerund

# Non-agent noun classes
class Digest(Matter)  # Use Diger
class Verifier(Matter) # Use Verfer
class Signature(Matter) # Use Siger

# Generic variable names
data = ...            # Use ked, ser, raw, etc.
result = ...          # Use specific name
temp = ...            # Use descriptive name
```

**Do:**
```python
helping.py            # Helper utilities

class Diger(Matter)   # One who digests
class Verfer(Matter)  # One who verifies
class Siger(Indexer)  # One who signs

ked = {...}           # Key Event Dict
ser = b'...'          # Serialization
raw = b'...'          # Raw bytes
```
