# KERI Code Patterns Reference

## Matter Base Class Pattern

All cryptographic material classes inherit from `Matter` and follow consistent patterns:

```python
class Matter:
    """Base class for all qualified material in KERI"""

    # Class attributes define code tables
    Hards = {}  # Hard code table
    Sizes = {}  # Size table mapping codes to (hs, ss, xs, fs, ls)

    def __init__(self, raw=None, qb64b=None, qb64=None, qb2=None,
                 code=None, **kwa):
        """
        Initialize with one of:
            raw: bytes of unqualified material
            qb64b: bytes of qualified base64
            qb64: str of qualified base64
            qb2: bytes of qualified binary
            code: derivation code (with raw)
        """
        if raw is not None:
            self._exfil(raw, code, **kwa)
        elif qb64b is not None:
            self._bexfil(qb64b)
        elif qb64 is not None:
            self._infil(qb64)
        elif qb2 is not None:
            self._binfil(qb2)
        else:
            raise EmptyMaterialError("Missing material.")

    @property
    def raw(self):
        """Return raw bytes"""
        return self._raw

    @property
    def code(self):
        """Return derivation code"""
        return self._code

    @property
    def qb64(self):
        """Return qualified base64 as str"""
        return self._qb64

    @property
    def qb64b(self):
        """Return qualified base64 as bytes"""
        return self._qb64.encode("utf-8")

    @property
    def qb2(self):
        """Return qualified base2"""
        return self._qb2
```

### Subclass Implementation Pattern

```python
class Diger(Matter):
    """Digest class for hashes"""

    # Override class code tables
    Hards = {c: hs for c, (hs, ss, _, _, _) in DigDex.__dict__.items()}
    Sizes = DigDex.__dict__.copy()

    def __init__(self, raw=None, code=DigDex.Blake3_256, **kwa):
        """
        Initialize with raw bytes or qualified forms
        Default to Blake3_256 if not specified
        """
        super().__init__(raw=raw, code=code, **kwa)

    def compare(self, ser=None, diger=None):
        """Compare digest against serialization or another diger"""
        if ser is not None:
            return self.raw == hashlib.blake3(ser).digest()
        elif diger is not None:
            return self.raw == diger.raw
        return False
```

## Material Extraction Pattern (_infil, _binfil, etc.)

Material classes use private "fill" methods to extract code and raw from various formats:

```python
def _infil(self, qb64):
    """Extract from qb64 string"""
    # 1. Extract first char(s) to identify code
    first = qb64[:1]

    # 2. Look up hard size from code selector
    if first not in self.Hards:
        raise UnexpectedCodeError(f"Unsupported code start ={first}.")
    hs = self.Hards[first]

    # 3. Extract full code
    hard = qb64[:hs]

    # 4. Look up size parameters
    hs, ss, xs, fs, ls = self.Sizes[hard]
    cs = hs + ss

    # 5. Extract code parts (hard + soft)
    code = qb64[:cs]

    # 6. Extract raw material
    raw = decodeB64(qb64[cs:])

    # 7. Validate and store
    self._code = hard
    self._raw = raw


def _binfil(self, qb2):
    """Extract from qb2 binary"""
    # Similar pattern but works with binary sextets
    first = nabSextets(qb2, 1)
    # ... rest of extraction logic


def _exfil(self, raw, code):
    """Build qualified form from raw + code"""
    if code not in self.Sizes:
        raise InvalidCodeError(f"Unsupported code ={code}.")

    # Store raw and code
    self._code = code
    self._raw = raw

    # Build qualified forms on demand via properties
```

## Cryptographic Primitive Patterns

### Digest Pattern

```python
class Diger(Matter):
    """Digest/hash primitive"""

    def __init__(self, raw=None, ser=None, code=DigDex.Blake3_256, **kwa):
        """
        Parameters:
            raw: pre-computed digest bytes
            ser: serialization to digest
            code: digest algorithm code
        """
        if ser is not None:
            # Compute digest from serialization
            if code == DigDex.Blake3_256:
                raw = blake3.blake3(ser).digest()[:32]
            elif code == DigDex.Blake2b_256:
                raw = hashlib.blake2b(ser, digest_size=32).digest()
            elif code == DigDex.SHA3_256:
                raw = hashlib.sha3_256(ser).digest()
            # ... other algorithms

        super().__init__(raw=raw, code=code, **kwa)
```

### Signature Pattern

```python
class Siger(Indexer):
    """Indexed signature primitive"""

    def __init__(self, raw=None, code=None, index=0, **kwa):
        """
        Parameters:
            raw: signature bytes
            code: signature algorithm code
            index: position in key list (for multi-sig)
        """
        super().__init__(raw=raw, code=code, index=index, **kwa)

    def verfer(self, keys):
        """Get corresponding Verfer from key list"""
        return Verfer(qb64=keys[self.index])
```

### Verifier Pattern

```python
class Verfer(Matter):
    """Verification key primitive"""

    def verify(self, sig, ser):
        """
        Verify signature against serialization

        Parameters:
            sig: signature bytes or Siger
            ser: serialization bytes

        Returns:
            bool: True if valid
        """
        if isinstance(sig, Siger):
            sig = sig.raw

        if self.code == PreDex.Ed25519:
            return pysodium.crypto_sign_verify_detached(sig, ser, self.raw)
        # ... other algorithms

        return False
```

## Key Event Dict (KED) Pattern

Key Event Dicts use specific field names and structures:

```python
# Inception event
ked = {
    "v": "KERI10JSON00011c_",  # Version string
    "t": "icp",                 # Type (ilk)
    "d": "EPYuj8mq_P...",      # Digest (SAID)
    "i": "EPYuj8mq_P...",      # Identifier prefix
    "s": "0",                   # Sequence number (hex)
    "kt": "1",                  # Key threshold
    "k": ["DqI2cOZ..."],       # Keys (current)
    "nt": "1",                  # Next key threshold
    "n": ["EPYuj8m..."],       # Next keys (digest)
    "bt": "2",                  # Witness threshold
    "b": ["BGKVzj4...", "BuyR..."],  # Witness list
    "c": [],                    # Configuration
    "a": []                     # Anchors
}

# Rotation event
ked = {
    "v": "KERI10JSON00011c_",
    "t": "rot",                 # Type
    "d": "E8ipype...",         # Digest
    "i": "EPYuj8mq_P...",      # Identifier (same)
    "s": "1",                   # Sequence number (incremented)
    "p": "EPYuj8mq_P...",      # Prior event digest
    "kt": "1",                  # Key threshold
    "k": ["DaU6JR2...", "DKxy..."],  # Keys (revealed from previous 'n')
    "nt": "1",                  # Next key threshold
    "n": ["EQS1kcs..."],       # Next keys (new digest)
    "bt": "2",                  # Witness threshold
    "br": [],                   # Witness remove
    "ba": ["DKPE5g..."],       # Witness add
    "a": []                     # Anchors
}
```

### Field Abbreviations in KEDs
```python
v   # Version string
t   # Type (ilk): icp, rot, ixn, dip, drt
d   # Digest (SAID - Self-Addressing IDentifier)
i   # Identifier prefix
s   # Sequence number (hex string)
p   # Prior event digest
kt  # Key threshold (signing threshold)
k   # Keys (current signing keys)
nt  # Next key threshold
n   # Next key digests (blinded pre-rotation)
bt  # Witness threshold (receipt threshold)
b   # Witness list (backers)
br  # Witness remove list
ba  # Witness add list
c   # Configuration traits
a   # Anchors (seals to other events)
```

## SAID (Self-Addressing IDentifier) Pattern

SAIDs are digests that include themselves:

```python
def saidify(ked, sad=None, label=Saids.d, code=DigDex.Blake3_256, kind=Kinds.json):
    """
    Create SAID for key event dict

    Process:
    1. Replace SAID field with dummy value of correct length
    2. Serialize to get stable byte representation
    3. Compute digest of serialization
    4. Replace dummy with actual digest
    5. Verify digest matches
    """
    if label not in ked:
        raise ValidationError(f"Missing SAID field {label} in ked.")

    # Save original and replace with dummy
    original = ked[label]
    ked[label] = '#' * Matter._rawSize(code)

    # Serialize and compute digest
    raw = dumps(ked, kind=kind)
    diger = Diger(raw=hashlib.blake3(raw).digest()[:32], code=code)

    # Replace with actual SAID
    ked[label] = diger.qb64

    # Verify SAID is correct
    raw = dumps(ked, kind=kind)
    if diger.raw != hashlib.blake3(raw).digest()[:32]:
        raise ValidationError("SAID verification failed.")

    return diger
```

## Helper Function Patterns

### Descriptor Functions

```python
def smell(raw):
    """
    Sniff/detect version string in raw bytes
    Returns Smellage namedtuple or None
    """
    match = Rever.search(raw)
    if not match:
        return None
    return rematch(match)


def sceil(r):
    """
    Symmetric ceiling function
    Returns ceiling away from zero
    """
    return int(r) + isign(r - int(r))


def isign(i):
    """
    Integer sign function
    Returns 1, -1, or 0
    """
    return (1 if i > 0 else -1 if i < 0 else 0)
```

### Validation Functions

```python
def simple(n):
    """
    Returns simple majority threshold for n elements
    Minimum: n//2 + 1
    """
    return min(max(0, n), (max(0, n) // 2) + 1)


def ample(n, f=None, weak=True):
    """
    Returns sufficient immune (ample) majority
    Byzantine fault tolerant threshold
    Constraint: n >= 3*f+1
    Range: (n+f+1)/2 <= m <= n-f
    """
    n = max(0, n)
    if f is None:
        f = max(1, max(0, n - 1) // 3)

    m1 = ceil((n + f + 1) / 2)
    m2 = max(0, n - f)

    if weak:
        return min(n, m1, m2)
    else:
        return min(n, max(m1, m2))
```

## Version String Pattern

Version strings encode protocol, version, kind, and size:

```python
# Format: PPPPXYZZZZSSSSS_
# PPPP = Protocol (4 chars): KERI, ACDC
# X    = Major version (1 hex char)
# Y    = Minor version (1 hex char)
# ZZZZ = Kind (4 chars): JSON, MGPK, CBOR
# SSSSS = Size (6 hex chars): byte count
# _    = Terminator

def versify(proto=Protocols.keri, pvrsn=Version, kind=Kinds.json, size=0):
    """Create version string"""
    return f"{proto}{pvrsn.major:x}{pvrsn.minor:x}{kind}{size:06x}_"


def deversify(vs):
    """Parse version string"""
    match = Rever.match(vs)
    if not match:
        raise VersionError(f"Invalid version string {vs}")

    proto, major, minor, kind, size = match.groups()
    pvrsn = Versionage(major=int(major, 16), minor=int(minor, 16))
    size = int(size, 16)

    return proto, pvrsn, kind, size
```
