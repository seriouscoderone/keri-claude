# KERI Naming Conventions Reference

## Module Naming: Gerund Pattern (-ing suffix)

All modules use present participle gerunds to indicate ongoing action or capability:

### Core Modules
```python
coring.py        # Core cryptographic operations
eventing.py      # Event handling and processing
helping.py       # Helper utilities
indexing.py      # Index-based operations
serdering.py     # Serialization/deserialization
signing.py       # Signature operations
counting.py      # Counter operations
parsing.py       # Parsing operations
scheming.py      # Schema operations
structing.py     # Data structure operations
mapping.py       # Mapping operations
routing.py       # Routing operations
annotating.py    # Annotation operations
```

### Database Modules
```python
basing.py        # Database base operations
dbing.py         # Database operations
subing.py        # Subscription operations
koming.py        # Key operations
escrowing.py     # Escrow operations
```

### Application Modules
```python
agenting.py      # Agent operations
apping.py        # Application operations
habbing.py       # Habitat operations
keeping.py       # Keeper operations
challenging.py   # Challenge operations
delegating.py    # Delegation operations
directing.py     # Director operations
forwarding.py    # Forwarding operations
grouping.py      # Group operations
httping.py       # HTTP operations
indirecting.py   # Indirect operations
notifying.py     # Notification operations
oobiing.py       # OOBI (Out-Of-Band-Introduction) operations
configing.py     # Configuration operations
```

### Naming Pattern Rules
- Use descriptive base verbs: `event` → `eventing.py`
- Single word preferred, compound words acceptable: `oobiing.py`
- Never use generic names like `utils.py` or `helpers.py` without gerund form
- Exception: Top-level `__init__.py` files

## Class Naming: Agent Noun Pattern (-er suffix)

Cryptographic primitives and operational classes use agent nouns (one who does X):

### Primary Material Classes
```python
class Matter:        # Base class for all material
    pass

class Verfer(Matter):      # One who verifies (verification key)
class Diger(Matter):       # One who digests (digest/hash)
class Siger(Indexer):      # One who signs with index
class Cigar(Siger):        # One who signs (unindexed signature)
class Salter(Matter):      # One who salts (salt/seed)
class Prefixer(Matter):    # One who prefixes (identifier prefix)
class Saider(Matter):      # One who creates SAIDs
```

### Specialized Material Classes
```python
class Seqner(Matter):      # One who sequences (sequence number)
class Number(Matter):      # Numeric value holder
class Dater(Matter):       # One who dates (timestamp)
class Noncer(Diger):       # One who nonces (nonce/UUID)
class Decimer(Matter):     # One who decimals (decimal number)
```

### Text and Binary Handlers
```python
class Texter(Matter):      # One who texts (text handler)
class Bexter(Matter):      # One who works with hex/bytes
class Pather(Matter):      # One who paths (path handler)
class Labeler(Matter):     # One who labels
class Tagger(Matter):      # One who tags
```

### Advanced Classes
```python
class Signer(Matter):      # One who signs (signing operations)
class Encrypter(Matter):   # One who encrypts
class Decrypter(Matter):   # One who decrypts
class Cipher(Matter):      # One who ciphers (encryption)
class Blinder(Structor):   # One who blinds (blinding operations)
class Sealer(Structor):    # One who seals
class Compactor(Mapper):   # One who compacts
class Traitor(Tagger):     # One who traits (trait handler)
class Ilker(Tagger):       # One who ilks (ilk/type handler)
class Verser(Tagger):      # One who verses (version handler)
```

### Naming Pattern Rules
- Derive from clear base words: `verify` → `Verfer`, `digest` → `Diger`
- Use -er suffix even for words ending in 'e': `Cigar` (not `Cigarer`)
- Irregular forms acceptable: `Signer` (not `Signor`)
- Inheritors follow same pattern: `Noncer(Diger)`, `Ilker(Tagger)`

## Codex Pattern: Code Tables with -Dex suffix

Code tables are frozen dataclasses with instance variables ending in `Dex`:

```python
@dataclass(frozen=True)
class DigCodex:
    """Digest derivation code table"""
    Blake3_256: str = 'E'
    Blake2b_256: str = 'F'
    Blake2s_256: str = 'G'
    SHA3_256: str = 'H'
    SHA2_256: str = 'I'

    def __iter__(self):
        return iter(astuple(self))

DigDex = DigCodex()  # Make singleton instance


@dataclass(frozen=True)
class PreCodex:
    """Prefix derivation code table"""
    Ed25519N: str = 'B'
    Ed25519: str = 'D'
    X25519: str = 'C'

    def __iter__(self):
        return iter(astuple(self))

PreDex = PreCodex()  # Make singleton instance


@dataclass(frozen=True)
class NumCodex:
    """Number size code table"""
    Short: str = 'M'    # 2 byte
    Long: str = '0H'    # 4 byte
    Big: str = 'N'      # 8 byte
    Huge: str = '0A'    # 16 byte

    def __iter__(self):
        return iter(astuple(self))

NumDex = NumCodex()  # Make singleton instance
```

### Codex Naming Rules
- Class name: `<Purpose>Codex` (e.g., `DigCodex`, `PreCodex`)
- Instance name: `<Purpose>Dex` (e.g., `DigDex`, `PreDex`)
- Always frozen dataclass with `__iter__` method
- Create singleton instance immediately after class definition
- Field names use PascalCase: `Blake3_256`, not `blake3_256`

## Transformation Functions: -ify Suffix

Functions that transform or process data use -ify suffix:

```python
def sizeify(ked, kind=None, version=Version):
    """Compute serialized size of ked and update version field"""
    pass

def versify(proto=None, pvrsn=None, kind=None, size=0):
    """Create version string from components"""
    pass

def deversify(vs):
    """Parse version string into components"""
    pass

def klasify(sers, klases, args=None):
    """Convert serializations to class instances"""
    pass

def dictify(val):
    """Convert dataclass to dict"""
    pass

def datify(cls, d):
    """Convert dict to dataclass instance"""
    pass
```

### -ify Function Rules
- Use for transformations: `size` → `sizeify()`, `version` → `versify()`
- Opposite operations use `de-` prefix: `versify()` ↔ `deversify()`
- Should return transformed value, not modify in place (unless explicit)
- Document the transformation clearly in docstring

## Namedtuples: -age Suffix

Data structures use namedtuples with -age suffix:

```python
Versionage = namedtuple("Versionage", "major minor")
Version = Versionage(major=1, minor=0)

Kindage = namedtuple("Kindage", 'json mgpk cbor cesr')
Kinds = Kindage(json='JSON', mgpk='MGPK', cbor='CBOR', cesr='CESR')

Protocolage = namedtuple("Protocolage", "keri acdc")
Protocols = Protocolage(keri="KERI", acdc="ACDC")

Smellage = namedtuple("Smellage", "proto pvrsn kind size gvrsn")

Digestage = namedtuple("Digestage", "klas size length")

Saidage = namedtuple("Saidage", "dollar at id_ i d")
Saids = Saidage(dollar="$id", at="@id", id_="id", i="i", d="d")
```

### Namedtuple Naming Rules
- Type name: `<Concept>age` (e.g., `Versionage`, `Kindage`)
- Instance name: Plural or singular based on semantics
  - `Kinds = Kindage(...)` - Multiple kinds
  - `Version = Versionage(...)` - Single default version
  - `Protocols = Protocolage(...)` - Multiple protocols
- Field names: lowercase, abbreviated where appropriate
- Create common instances as module constants

## CESR Abbreviations

### Qualified Encoding Formats
```python
qb64    # Qualified base64 string (str)
qb64b   # Qualified base64 bytes (bytes)
qb2     # Qualified base2/binary (bytes)
```

### Size Parameters
```python
hs      # Hard size - code size in sextets
ss      # Soft size - variable part size in sextets
xs      # Extra size - padding size in sextets
fs      # Full size - total size in sextets (hs + ss + data)
ls      # Lead size - leading bytes
cs      # Code size - combined hard and soft (hs + ss)
ps      # Pad size - padding for alignment
bhs     # Byte hard size - hs converted to bytes
bcs     # Byte code size - cs converted to bytes
bfs     # Byte full size - fs converted to bytes
```

### Other Common Abbreviations
```python
ked     # Key Event Dict
raw     # Raw bytes (unqualified cryptographic material)
ser     # Serialization
des     # Deserialization
dig     # Digest
pre     # Prefix
sn      # Sequence number
ilk     # Type/kind of event
vs      # Version string
knd     # Kind (serialization type)
proto   # Protocol
vrsn    # Version (as namedtuple)
```

### Usage in Code
```python
def _infil(self, qb64):
    """Extract code and raw from qb64"""
    if not qb64:
        raise EmptyMaterialError("Empty material.")

    first = qb64[:1]  # First char is code selector
    if first not in self.Hards:
        raise UnexpectedCodeError(f"Unsupported code start ={first}.")

    hs = self.Hards[first]  # Get hard size
    if len(qb64) < hs:
        raise ShortageError(f"Need {hs - len(qb64)} more chars.")

    hard = qb64[:hs]  # Extract hard part
    if hard not in self.Sizes:
        raise UnexpectedCodeError(f"Unsupported code ={hard}.")

    hs, ss, xs, fs, ls = self.Sizes[hard]  # Unpack size parameters
    cs = hs + ss  # Calculate code size
```
