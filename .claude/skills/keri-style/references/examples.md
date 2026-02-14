# KERI Style Code Examples

## Complete Module Example

This shows a complete module following KERI conventions:

```python
# -*- encoding: utf-8 -*-
"""
keri.core.digesting module

Digest operations and utilities
"""
import hashlib
from dataclasses import dataclass, astuple

import blake3
import pysodium

from ..kering import (EmptyMaterialError, InvalidCodeError,
                      ValidationError, ConversionError)
from ..help.helping import sceil

from .coring import Matter, DigDex


@dataclass(frozen=True)
class DigestCodex:
    """Digest algorithm code table"""
    Blake3_256: str = 'E'
    Blake2b_256: str = 'F'
    Blake2s_256: str = 'G'
    SHA3_256: str = 'H'
    SHA2_256: str = 'I'
    Blake3_512: str = '0D'
    Blake2b_512: str = '0E'
    SHA3_512: str = '0F'
    SHA2_512: str = '0G'

    def __iter__(self):
        return iter(astuple(self))

DigDex = DigestCodex()  # Singleton instance


class Diger(Matter):
    """
    Diger class for cryptographic digests (hashes)

    Inherits from Matter to provide qualified base64/binary encoding
    """

    # Override class code tables with digest-specific codes
    Hards = {c: 1 if len(c) == 1 else 2 for c in DigDex}
    Sizes = {
        DigDex.Blake3_256: (1, 0, 0, 44, 0),   # (hs, ss, xs, fs, ls)
        DigDex.Blake2b_256: (1, 0, 0, 44, 0),
        DigDex.Blake2s_256: (1, 0, 0, 44, 0),
        DigDex.SHA3_256: (1, 0, 0, 44, 0),
        DigDex.SHA2_256: (1, 0, 0, 44, 0),
        DigDex.Blake3_512: (2, 0, 0, 88, 0),
        DigDex.Blake2b_512: (2, 0, 0, 88, 0),
        DigDex.SHA3_512: (2, 0, 0, 88, 0),
        DigDex.SHA2_512: (2, 0, 0, 88, 0),
    }

    def __init__(self, raw=None, ser=None, code=DigDex.Blake3_256, **kwa):
        """
        Initialize Diger

        Parameters:
            raw (bytes): pre-computed digest bytes
            ser (bytes): serialization to digest
            code (str): digest algorithm code from DigDex
            **kwa: additional Matter parameters (qb64, qb64b, qb2)
        """
        if raw is None and ser is not None:
            # Compute digest from serialization
            raw = self._digest(ser, code)

        super().__init__(raw=raw, code=code, **kwa)

    def _digest(self, ser, code):
        """
        Compute digest of serialization using specified algorithm

        Parameters:
            ser (bytes): serialization to digest
            code (str): algorithm code from DigDex

        Returns:
            bytes: digest bytes
        """
        if code == DigDex.Blake3_256:
            return blake3.blake3(ser).digest()[:32]
        elif code == DigDex.Blake2b_256:
            return hashlib.blake2b(ser, digest_size=32).digest()
        elif code == DigDex.Blake2s_256:
            return hashlib.blake2s(ser, digest_size=32).digest()
        elif code == DigDex.SHA3_256:
            return hashlib.sha3_256(ser).digest()
        elif code == DigDex.SHA2_256:
            return hashlib.sha256(ser).digest()
        elif code == DigDex.Blake3_512:
            return blake3.blake3(ser).digest()[:64]
        elif code == DigDex.Blake2b_512:
            return hashlib.blake2b(ser, digest_size=64).digest()
        elif code == DigDex.SHA3_512:
            return hashlib.sha3_512(ser).digest()
        elif code == DigDex.SHA2_512:
            return hashlib.sha512(ser).digest()
        else:
            raise InvalidCodeError(f"Unsupported digest code={code}")

    def compare(self, ser=None, diger=None):
        """
        Compare digest against serialization or another diger

        Parameters:
            ser (bytes): serialization to compare against
            diger (Diger): another diger to compare against

        Returns:
            bool: True if match
        """
        if ser is not None:
            return self.raw == self._digest(ser, self.code)
        elif diger is not None:
            return self.raw == diger.raw and self.code == diger.code
        return False

    def verify(self, ser):
        """
        Verify digest matches serialization

        Parameters:
            ser (bytes): serialization to verify

        Returns:
            bool: True if valid

        Raises:
            ValidationError: if digest doesn't match
        """
        if not self.compare(ser=ser):
            raise ValidationError(f"Digest verification failed.")
        return True


def digestify(ser, code=DigDex.Blake3_256):
    """
    Create Diger from serialization

    Convenience function for common digest operation

    Parameters:
        ser (bytes): serialization to digest
        code (str): digest algorithm code

    Returns:
        Diger: digest instance
    """
    return Diger(ser=ser, code=code)
```

## Class Hierarchy Example

```python
# Base material class
class Matter:
    """Base class for all qualified cryptographic material"""
    pass


# Primary derivatives
class Verfer(Matter):
    """Verification key material"""
    pass


class Diger(Matter):
    """Digest material"""
    pass


class Prefixer(Matter):
    """Identifier prefix material"""
    pass


class Salter(Matter):
    """Salt/seed material"""
    pass


# Specialized derivatives
class Noncer(Diger):
    """Nonce material (specialized digest)"""
    pass


class Saider(Matter):
    """Self-Addressing IDentifier material"""

    def verify(self, sad):
        """Verify SAID matches SAD (Self-Addressed Data)"""
        pass


# Indexed material
class Indexer(Matter):
    """Base for indexed material"""

    def __init__(self, index=0, **kwa):
        self.index = index
        super().__init__(**kwa)


class Siger(Indexer):
    """Indexed signature material"""
    pass


class Cigar(Siger):
    """Non-indexed signature (index-free)"""

    def __init__(self, **kwa):
        super().__init__(index=None, **kwa)
```

## Key Event Processing Example

```python
def process_inception(ked, sigers, werfers):
    """
    Process inception event following KERI style

    Parameters:
        ked (dict): key event dict
        sigers (list[Siger]): attached signatures
        werfers (list[Verfer]): witness verifiers

    Returns:
        bool: True if valid
    """
    # Extract and validate components
    pre = Prefixer(qb64=ked["i"])
    sn = Seqner(qb64=ked["s"])

    # Verify sequence number for inception
    if sn.sn != 0:
        raise ValidationError(f"Invalid inception sequence={sn.sn}")

    # Extract thresholds
    kt = Tholder(sith=ked["kt"])  # Key threshold
    bt = Tholder(sith=ked["bt"])  # Witness threshold

    # Extract keys
    verfers = [Verfer(qb64=k) for k in ked["k"]]

    # Extract next key digests
    digers = [Diger(qb64=n) for n in ked["n"]]

    # Serialize for signature verification
    raw = dumps(ked, kind=Kinds.json)

    # Verify signatures meet threshold
    validated = 0
    for siger in sigers:
        idx = siger.index
        if idx >= len(verfers):
            continue
        if verfers[idx].verify(sig=siger, ser=raw):
            validated += 1

    if validated < kt.num:
        raise ValidationError(f"Insufficient signatures {validated} < {kt.num}")

    return True


def rotate_keys(hab, data):
    """
    Rotate keys for habitat following KERI patterns

    Parameters:
        hab (Habery): habitat (key management)
        data (dict): rotation parameters

    Returns:
        tuple: (ked, sigers) event and signatures
    """
    # Get current state
    kever = hab.kevers[hab.pre]
    sn = kever.sn + 1  # Increment sequence

    # Get prior event digest
    diger = hab.db.getKeLast(key=hab.pre)
    prior = diger.qb64

    # Extract rotation parameters
    nkeys = data.get("nkeys", [])
    ndigs = data.get("ndigs", [])

    # Build rotation event dict
    ked = dict(
        v=versify(kind=Kinds.json, size=0),
        t=Ilks.rot,
        d="",  # Placeholder for SAID
        i=hab.pre,
        s=f"{sn:x}",
        p=prior,
        kt=kever.tholder.sith,
        k=nkeys,
        nt=kever.ntholder.sith,
        n=ndigs,
        bt=kever.thold,
        br=[],
        ba=[],
        a=[]
    )

    # Compute SAID
    saider = saidify(ked)

    # Sign with current keys
    sigers = hab.sign(ser=dumps(ked, kind=Kinds.json))

    return ked, sigers
```

## Testing Pattern Example

```python
def test_diger_creation():
    """Test Diger creation following KERI patterns"""
    # Test with raw bytes
    raw = b'0123456789abcdef' * 2  # 32 bytes
    diger = Diger(raw=raw)
    assert diger.code == DigDex.Blake3_256
    assert diger.raw == raw

    # Test with serialization
    ser = b'{"test": "data"}'
    diger = Diger(ser=ser)
    assert diger.verify(ser)

    # Test with different algorithms
    for code in [DigDex.Blake3_256, DigDex.SHA3_256, DigDex.Blake2b_256]:
        diger = Diger(ser=ser, code=code)
        assert diger.code == code
        assert diger.verify(ser)

    # Test qb64 round-trip
    qb64 = diger.qb64
    diger2 = Diger(qb64=qb64)
    assert diger2.raw == diger.raw
    assert diger2.code == diger.code


def test_event_processing():
    """Test event processing with proper style"""
    # Create inception event
    ked = dict(
        v="KERI10JSON00011c_",
        t="icp",
        d="",
        i="",
        s="0",
        kt="1",
        k=["DSuhyBcPZEZLK-fcw5tzHn2N46wRCG_ZOoeKtWTOunRA"],
        nt="1",
        n=["EGAPkzNZMtX-QiVgbRbyAIZGoXvbGv9IPb0foWTZvI_4"],
        bt="0",
        b=[],
        c=[],
        a=[]
    )

    # Compute SAID
    saider = saidify(ked)

    # Verify SAID field populated
    assert ked["d"] == saider.qb64
    assert ked["i"] == saider.qb64  # For inception, i == d

    # Verify SAID is correct
    assert saider.verify(ked)
```

## Utility Function Example

```python
def dewitness_couple(data):
    """
    Extract witness receipt couple following KERI patterns

    Returns tuple of (diger, wiger) where:
        diger: digest of receipted event
        wiger: indexed witness signature

    Pattern demonstrates:
    - Descriptive function names
    - Clear return types
    - Proper error handling
    """
    if isinstance(data, memoryview):
        data = bytes(data)
    if hasattr(data, "encode"):
        data = data.encode("utf-8")

    # Extract digest
    diger = Diger(qb64b=data)
    data = data[len(diger.qb64):]

    # Extract witness signature
    wiger = Siger(qb64b=data)

    return (diger, wiger)


def witnesser(hab, rct):
    """
    Process witness receipt following KERI style

    Demonstrates:
    - Agent noun function names for processors
    - Clear parameter semantics
    - Proper validation patterns
    """
    # Extract components
    pre = rct["i"]
    sn = int(rct["s"], 16)
    dig = rct["d"]

    # Get key state
    kever = hab.kevers.get(pre)
    if not kever:
        raise MissingEntryError(f"No key state for {pre}")

    # Validate sequence
    if sn != kever.sn:
        raise OutOfOrderError(f"Invalid sn={sn} expected {kever.sn}")

    # Process receipt
    return process_receipt(kever, rct)
```
