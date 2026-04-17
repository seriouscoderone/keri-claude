# LockedIn Bridge Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python bridge module that wraps keripy for the LockedIn iOS app — AID lifecycle, ACDC attestation pipeline (Observation → Epoch → Chronicle), and local timeline query.

**Architecture:** A Python package (`lockedin`) with a single `bridge.py` module exposing 12 functions that Swift calls via PythonKit. All state lives in keripy's SQLiteDBer. The bridge initializes Habery with SQLiteDBer, creates/manages AIDs, issues Untargeted ACDCs for presence observations, bulk-anchors epochs, and queries the local timeline. No networking in this plan — witness sync and OOBI are Plan 3.

**Tech Stack:** Python 3.12+, keripy (feat/dynamodb-backend with SQLiteDBer), pytest. Depends on: `pip install git+https://github.com/seriouscoderone/keripy.git@feat/dynamodb-backend`

**Working directory:** `~/code/locked-in` (new repo)

**Scope:** This plan covers bridge functions 1, 4, 5, 6, 7, 8, 13, 14, 15 from the design spec (Section 7). Functions 2, 3, 9, 10, 11, 16, 17 (OOBI, witness management, disclosure, verification) are Plan 3.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `~/code/locked-in/README.md` | Project overview |
| Create | `~/code/locked-in/pyproject.toml` | Package config, keripy dependency |
| Create | `~/code/locked-in/src/lockedin/__init__.py` | Package marker |
| Create | `~/code/locked-in/src/lockedin/bridge.py` | Bridge module — all 12 functions |
| Create | `~/code/locked-in/src/lockedin/schema.py` | ACDC schema SAIDs for Observation, Epoch, Chronicle |
| Create | `~/code/locked-in/tests/__init__.py` | Test package marker |
| Create | `~/code/locked-in/tests/test_bridge_lifecycle.py` | AID inception, rotation tests |
| Create | `~/code/locked-in/tests/test_bridge_attestation.py` | Observation, Epoch, Chronicle tests |
| Create | `~/code/locked-in/tests/test_bridge_query.py` | Timeline query tests |

---

### Task 1: Repository Setup and Bootstrap

**Files:**
- Create: `~/code/locked-in/README.md`
- Create: `~/code/locked-in/pyproject.toml`
- Create: `~/code/locked-in/src/lockedin/__init__.py`
- Create: `~/code/locked-in/src/lockedin/bridge.py`
- Create: `~/code/locked-in/tests/__init__.py`
- Create: `~/code/locked-in/tests/test_bridge_lifecycle.py`

- [ ] **Step 1: Create repo and project structure**

```bash
mkdir -p ~/code/locked-in/src/lockedin ~/code/locked-in/tests
cd ~/code/locked-in
git init
```

- [ ] **Step 2: Create pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "lockedin"
version = "0.1.0"
description = "LockedIn presence attestation bridge for iOS"
requires-python = ">=3.12"
dependencies = [
    "keri @ git+https://github.com/seriouscoderone/keripy.git@feat/dynamodb-backend",
]

[project.optional-dependencies]
dev = ["pytest>=7.0"]

[tool.setuptools.packages.find]
where = ["src"]
```

- [ ] **Step 3: Create package markers**

```python
# src/lockedin/__init__.py
"""LockedIn — presence attestation bridge for iOS."""
```

```python
# tests/__init__.py
```

- [ ] **Step 4: Create bridge.py with LockedIn class and bootstrap**

The bridge is a class that owns the keripy stack (Habery + Regery) backed by SQLiteDBer.

```python
# src/lockedin/bridge.py
"""
LockedIn Bridge — Python API for iOS PythonKit integration.

Wraps keripy operations for the LockedIn presence attestation app.
All state lives in SQLiteDBer. No networking in this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterator

from keri.app.habbing import Habery
from keri.app.keeping import Manager
from keri.db.sqlitedbing import SQLiteDBer
from keri.db.basing import Baser


# Store names required by Habery's Baser
BASER_STORES = [s + "." for s in [
    "evts", "fels", "kels", "dtss", "aess", "sigs", "wigs",
    "rcts", "ures", "vrcs", "vres", "pses", "pwes", "pdes",
    "udes", "uwes", "ooes", "dels", "ldes", "qnfs", "fons",
    "migs", "vers", "esrs", "misfits", "delegables", "states",
    "wits", "habs", "names", "sdts", "ssgs", "scgs", "rpys",
    "rpes", "eans", "lans", "ends", "locs", "obvs", "tops",
    "gpse", "gdee", "gpwe", "cgms", "epse", "epsd", "exns",
    "erpy", "esigs", "ecigs", "epath", "essrs", "chas", "reps",
    "wkas", "kdts", "ksns", "knas", "wwas", "oobis", "eoobi",
    "coobi", "roobi", "woobi", "moobi", "mfa", "rmfa", "schema",
    "cfld", "hbys", "cons", "ccigs", "imgs", "ifld", "sids",
    "icigs", "iimgs", "dpwe", "dune",
]]

# Store names required by Keeper (key management)
KEEPER_STORES = [s + "." for s in [
    "gbls", "pris", "pres", "prms", "sits", "pubs",
]]


@dataclass
class AIDResult:
    """Result of AID inception."""
    prefix: str          # AID prefix (qb64)
    transferable: bool
    witness_count: int


class LockedIn:
    """
    Bridge between iOS native shell and keripy.

    Owns the full KERI stack backed by SQLiteDBer.
    All application data lives as ACDCs in the KERI database.
    """

    def __init__(self, *, db_path: str, ks_path: str, name: str = "lockedin"):
        self.name = name
        self._db_path = db_path
        self._ks_path = ks_path
        self._hby: Habery | None = None
        self._hab = None  # current Hab (AID)

    def bootstrap(self):
        """Initialize the KERI stack with SQLiteDBer."""
        db = SQLiteDBer.open(
            name=f"{self.name}-db",
            stores=BASER_STORES,
            path=self._db_path,
        )
        ks = SQLiteDBer.open(
            name=f"{self.name}-ks",
            stores=KEEPER_STORES,
            path=self._ks_path,
        )
        self._hby = Habery(name=self.name, db=db, ks=ks, temp=False)

    def close(self):
        """Close the KERI stack."""
        if self._hby:
            self._hby.close()
            self._hby = None
            self._hab = None

    @property
    def hab(self):
        """Current Hab (AID). None if no AID created yet."""
        return self._hab

    @property
    def hby(self) -> Habery:
        """The Habery instance. Raises if not bootstrapped."""
        if self._hby is None:
            raise RuntimeError("LockedIn not bootstrapped. Call bootstrap() first.")
        return self._hby

    # --- AID Lifecycle (Task 2) ---

    def incept_aid(self, *, transferable: bool = True,
                   wits: list[str] | None = None,
                   toad: int | None = None) -> AIDResult:
        """Create a new AID. Journey 1: First-time setup."""
        raise NotImplementedError

    def rotate_keys(self) -> str:
        """Rotate to pre-committed next keys. Journey 4."""
        raise NotImplementedError

    # --- Attestation (Tasks 3-4) ---
    # --- Query (Task 5) ---
```

- [ ] **Step 5: Write bootstrap test**

```python
# tests/test_bridge_lifecycle.py
"""Tests for LockedIn bridge — AID lifecycle."""

import pytest

from lockedin.bridge import LockedIn, AIDResult


@pytest.fixture
def bridge(tmp_path):
    """Provides a bootstrapped LockedIn bridge backed by temp SQLite files."""
    li = LockedIn(
        db_path=str(tmp_path / "lockedin.sqlite"),
        ks_path=str(tmp_path / "lockedin-ks.sqlite"),
        name="test",
    )
    li.bootstrap()
    yield li
    li.close()


class TestBootstrap:
    def test_bootstrap_creates_habery(self, bridge):
        assert bridge.hby is not None
        assert bridge.hab is None  # no AID yet

    def test_bootstrap_raises_before_init(self, tmp_path):
        li = LockedIn(
            db_path=str(tmp_path / "x.sqlite"),
            ks_path=str(tmp_path / "x-ks.sqlite"),
        )
        with pytest.raises(RuntimeError, match="not bootstrapped"):
            _ = li.hby

    def test_close_and_reopen(self, tmp_path):
        db_path = str(tmp_path / "reopen.sqlite")
        ks_path = str(tmp_path / "reopen-ks.sqlite")
        li = LockedIn(db_path=db_path, ks_path=ks_path, name="reopen")
        li.bootstrap()
        li.close()
        assert li.hab is None

        li2 = LockedIn(db_path=db_path, ks_path=ks_path, name="reopen")
        li2.bootstrap()
        assert li2.hby is not None
        li2.close()
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ~/code/locked-in
pip install -e ".[dev]"
python -m pytest tests/test_bridge_lifecycle.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 7: Create README.md**

```markdown
# LockedIn

Presence attestation iOS app powered by KERI.

## Development

```bash
pip install -e ".[dev]"
pytest
```

## Architecture

See: `../keri-claude/docs/superpowers/specs/2026-04-15-lockedin-ios-app-design.md`
```

- [ ] **Step 8: Commit**

```bash
cd ~/code/locked-in
git add -A
git commit -m "feat: repo setup — LockedIn bridge with SQLiteDBer bootstrap"
```

---

### Task 2: AID Inception and Rotation

**Files:**
- Modify: `src/lockedin/bridge.py`
- Modify: `tests/test_bridge_lifecycle.py`

- [ ] **Step 1: Write failing tests for inception and rotation**

Append to `tests/test_bridge_lifecycle.py`:

```python
class TestAIDInception:
    def test_incept_aid_basic(self, bridge):
        result = bridge.incept_aid()
        assert isinstance(result, AIDResult)
        assert len(result.prefix) > 0
        assert result.transferable is True

    def test_incept_aid_sets_hab(self, bridge):
        bridge.incept_aid()
        assert bridge.hab is not None
        assert bridge.hab.pre == bridge.incept_aid.__wrapped_result.prefix  # we'll verify differently

    def test_incept_aid_prefix_persists(self, tmp_path):
        """AID survives close and reopen."""
        db_path = str(tmp_path / "persist.sqlite")
        ks_path = str(tmp_path / "persist-ks.sqlite")

        li = LockedIn(db_path=db_path, ks_path=ks_path, name="persist")
        li.bootstrap()
        result = li.incept_aid()
        prefix = result.prefix
        li.close()

        li2 = LockedIn(db_path=db_path, ks_path=ks_path, name="persist")
        li2.bootstrap()
        li2.load_existing_aid()
        assert li2.hab is not None
        assert li2.hab.pre == prefix
        li2.close()

    def test_incept_aid_with_witnesses(self, bridge):
        # Without actual witness infrastructure, we test the parameter passing
        result = bridge.incept_aid(wits=[], toad=0)
        assert result.witness_count == 0


class TestKeyRotation:
    def test_rotate_keys(self, bridge):
        bridge.incept_aid()
        old_verfers = [v.qb64 for v in bridge.hab.kever.verfers]
        new_prefix = bridge.rotate_keys()
        new_verfers = [v.qb64 for v in bridge.hab.kever.verfers]
        assert new_prefix == bridge.hab.pre  # prefix unchanged
        assert old_verfers != new_verfers  # keys changed

    def test_rotate_increments_sn(self, bridge):
        bridge.incept_aid()
        assert bridge.hab.kever.sn == 0
        bridge.rotate_keys()
        assert bridge.hab.kever.sn == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_lifecycle.py -v -k "TestAIDInception or TestKeyRotation" 2>&1 | tail -15`
Expected: FAIL — NotImplementedError.

- [ ] **Step 3: Implement incept_aid, rotate_keys, load_existing_aid**

Replace the placeholder methods in `bridge.py`:

```python
    def incept_aid(self, *, transferable: bool = True,
                   wits: list[str] | None = None,
                   toad: int | None = None) -> AIDResult:
        """Create a new AID. Journey 1: First-time setup."""
        kwa = dict(transferable=transferable)
        if wits is not None:
            kwa["wits"] = wits
        if toad is not None:
            kwa["toad"] = toad

        self._hab = self.hby.makeHab(name=self.name, **kwa)

        return AIDResult(
            prefix=self._hab.pre,
            transferable=transferable,
            witness_count=len(wits) if wits else 0,
        )

    def load_existing_aid(self) -> bool:
        """Load a previously created AID from the database.

        Returns True if an AID was found, False otherwise.
        """
        existing = self.hby.habs
        if existing:
            # Load the first (and typically only) hab
            hab_name = list(existing.keys())[0] if isinstance(existing, dict) else None
            if hab_name:
                self._hab = self.hby.habByName(hab_name)
                return self._hab is not None

        # Try loading by our name
        self._hab = self.hby.habByName(self.name)
        return self._hab is not None

    def rotate_keys(self) -> str:
        """Rotate to pre-committed next keys. Journey 4."""
        if self._hab is None:
            raise RuntimeError("No AID to rotate. Call incept_aid() first.")
        self._hab.rotate()
        return self._hab.pre
```

- [ ] **Step 4: Fix test_incept_aid_sets_hab**

The test as written has a bad assertion. Replace `TestAIDInception` with:

```python
class TestAIDInception:
    def test_incept_aid_basic(self, bridge):
        result = bridge.incept_aid()
        assert isinstance(result, AIDResult)
        assert len(result.prefix) > 0
        assert result.transferable is True

    def test_incept_aid_sets_hab(self, bridge):
        result = bridge.incept_aid()
        assert bridge.hab is not None
        assert bridge.hab.pre == result.prefix

    def test_incept_aid_prefix_persists(self, tmp_path):
        """AID survives close and reopen."""
        db_path = str(tmp_path / "persist.sqlite")
        ks_path = str(tmp_path / "persist-ks.sqlite")

        li = LockedIn(db_path=db_path, ks_path=ks_path, name="persist")
        li.bootstrap()
        result = li.incept_aid()
        prefix = result.prefix
        li.close()

        li2 = LockedIn(db_path=db_path, ks_path=ks_path, name="persist")
        li2.bootstrap()
        loaded = li2.load_existing_aid()
        assert loaded is True
        assert li2.hab is not None
        assert li2.hab.pre == prefix
        li2.close()

    def test_incept_aid_with_no_witnesses(self, bridge):
        result = bridge.incept_aid(wits=[], toad=0)
        assert result.witness_count == 0
```

- [ ] **Step 5: Run tests**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_lifecycle.py -v 2>&1 | tail -20`
Expected: All tests PASS (3 bootstrap + 4 inception + 2 rotation = 9).

- [ ] **Step 6: Commit**

```bash
cd ~/code/locked-in
git add src/lockedin/bridge.py tests/test_bridge_lifecycle.py
git commit -m "feat: AID inception, rotation, and persistence"
```

---

### Task 3: Observation Attestation (Single ACDC)

**Files:**
- Modify: `src/lockedin/bridge.py`
- Create: `src/lockedin/schema.py`
- Create: `tests/test_bridge_attestation.py`

This task implements `attest()` — creating a single Untargeted ACDC for one GPS/barometric/biometric observation.

- [ ] **Step 1: Create schema.py with Observation ACDC schema**

```python
# src/lockedin/schema.py
"""
ACDC schema definitions for LockedIn presence attestation.

Each schema is a JSON Schema document with a SAID. The SAID is used
as the schema reference in issued ACDCs.
"""

from keri.core import Saider

# Observation: a single signed sensor reading (every 5 min)
OBSERVATION_SCHEMA = {
    "$id": "",  # SAID placeholder — computed on first use
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "LockedIn Observation",
    "description": "A single presence attestation — GPS, barometric, biometric.",
    "type": "object",
    "credentialType": "LockedInObservation",
    "properties": {
        "v": {"type": "string"},
        "d": {"type": "string"},
        "i": {"type": "string", "description": "Issuer AID (the phone)"},
        "ri": {"type": "string", "description": "Registry AID"},
        "s": {"type": "string", "description": "Schema SAID"},
        "a": {
            "type": "object",
            "properties": {
                "d": {"type": "string"},
                "dt": {"type": "string", "format": "date-time"},
                "lat": {"type": "number"},
                "lon": {"type": "number"},
                "alt": {"type": "number", "description": "Altitude in meters"},
                "baro": {"type": "number", "description": "Barometric pressure hPa"},
                "acc": {"type": "number", "description": "Horizontal accuracy meters"},
                "bio": {"type": "string", "description": "Biometric method"},
                "bioc": {"type": ["number", "null"], "description": "Biometric confidence"},
            },
            "required": ["d", "dt", "lat", "lon"],
        },
    },
}

# Epoch: hourly aggregation (edges reference child Observations)
EPOCH_SCHEMA = {
    "$id": "",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "LockedIn Epoch",
    "description": "Hourly aggregation of presence Observations.",
    "type": "object",
    "credentialType": "LockedInEpoch",
    "properties": {
        "v": {"type": "string"},
        "d": {"type": "string"},
        "i": {"type": "string"},
        "ri": {"type": "string"},
        "s": {"type": "string"},
        "a": {
            "type": "object",
            "properties": {
                "d": {"type": "string"},
                "dt": {"type": "string", "format": "date-time"},
                "starts_at": {"type": "string", "format": "date-time"},
                "ends_at": {"type": "string", "format": "date-time"},
                "observation_count": {"type": "integer"},
                "bio_count": {"type": "integer"},
            },
            "required": ["d", "dt", "starts_at", "ends_at", "observation_count"],
        },
        "e": {
            "type": "object",
            "description": "Edge references to child Observation SAIDs",
        },
    },
}

# Chronicle: daily aggregation (edges reference child Epochs)
CHRONICLE_SCHEMA = {
    "$id": "",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "LockedIn Chronicle",
    "description": "Daily aggregation of presence Epochs.",
    "type": "object",
    "credentialType": "LockedInChronicle",
    "properties": {
        "v": {"type": "string"},
        "d": {"type": "string"},
        "i": {"type": "string"},
        "ri": {"type": "string"},
        "s": {"type": "string"},
        "a": {
            "type": "object",
            "properties": {
                "d": {"type": "string"},
                "dt": {"type": "string", "format": "date-time"},
                "date": {"type": "string", "format": "date"},
                "epoch_count": {"type": "integer"},
                "total_observations": {"type": "integer"},
            },
            "required": ["d", "dt", "date", "epoch_count", "total_observations"],
        },
        "e": {
            "type": "object",
            "description": "Edge references to child Epoch SAIDs",
        },
    },
}
```

- [ ] **Step 2: Write failing attestation tests**

```python
# tests/test_bridge_attestation.py
"""Tests for LockedIn bridge — attestation pipeline."""

import pytest
from datetime import datetime, timezone

from lockedin.bridge import LockedIn, Observation


@pytest.fixture
def attester(tmp_path):
    """Provides a LockedIn bridge with an AID ready to attest."""
    li = LockedIn(
        db_path=str(tmp_path / "attest.sqlite"),
        ks_path=str(tmp_path / "attest-ks.sqlite"),
        name="attester",
    )
    li.bootstrap()
    li.incept_aid()
    yield li
    li.close()


def make_observation(**overrides) -> Observation:
    """Factory for test observations."""
    defaults = dict(
        lat=40.7128,
        lon=-74.0060,
        altitude=10.5,
        barometric_pressure=1013.25,
        horizontal_accuracy=5.0,
        biometric_method="face_id",
        biometric_confidence=0.99,
        observed_at=datetime(2026, 4, 15, 12, 0, 0, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    return Observation(**defaults)


class TestAttestation:
    def test_attest_returns_said(self, attester):
        obs = make_observation()
        said = attester.attest(obs)
        assert isinstance(said, str)
        assert len(said) > 0

    def test_attest_creates_unique_saids(self, attester):
        obs1 = make_observation(observed_at=datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc))
        obs2 = make_observation(observed_at=datetime(2026, 4, 15, 12, 5, tzinfo=timezone.utc))
        said1 = attester.attest(obs1)
        said2 = attester.attest(obs2)
        assert said1 != said2

    def test_attest_without_biometric(self, attester):
        obs = make_observation(biometric_method="none", biometric_confidence=None)
        said = attester.attest(obs)
        assert isinstance(said, str)

    def test_attest_manual_has_higher_confidence(self, attester):
        obs = make_observation(biometric_method="face_id", biometric_confidence=1.0)
        said = attester.attest_manual(obs)
        assert isinstance(said, str)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_attestation.py -v 2>&1 | tail -15`
Expected: FAIL — Observation not defined, attest not implemented.

- [ ] **Step 4: Add Observation dataclass and attest methods to bridge.py**

Add to `bridge.py`:

```python
@dataclass
class Observation:
    """A single sensor reading — the data that becomes an Untargeted ACDC."""
    lat: float
    lon: float
    altitude: float = 0.0
    barometric_pressure: float = 0.0
    horizontal_accuracy: float = 0.0
    biometric_method: str = "none"       # "face_id", "touch_id", "none"
    biometric_confidence: float | None = None
    observed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
```

Add attest methods to `LockedIn` class:

```python
    def _observation_to_sad(self, obs: Observation) -> dict:
        """Convert an Observation to an ACDC SAD (Self-Addressing Data)."""
        return {
            "v": "ACDC10JSON000000_",
            "t": "acdc",
            "d": "",  # SAID — computed by serder
            "i": self.hab.pre,  # Issuer: this phone's AID
            # No "ii" field — Untargeted ACDC (no issuee)
            "s": "observation_schema_said",  # placeholder until schema registry
            "a": {
                "d": "",  # SAID of attribute block
                "dt": obs.observed_at.isoformat(),
                "lat": obs.lat,
                "lon": obs.lon,
                "alt": obs.altitude,
                "baro": obs.barometric_pressure,
                "acc": obs.horizontal_accuracy,
                "bio": obs.biometric_method,
                "bioc": obs.biometric_confidence,
            },
        }

    def attest(self, obs: Observation) -> str:
        """Sign an Observation as an Untargeted ACDC. Journey 5.

        Returns the SAID of the issued ACDC.
        """
        if self._hab is None:
            raise RuntimeError("No AID. Call incept_aid() first.")

        sad = self._observation_to_sad(obs)

        # Create ACDC with SAID computation
        from keri.core import Saider
        saider = Saider(sad=sad["a"], label="d")
        sad["a"]["d"] = saider.qb64
        saider = Saider(sad=sad, label="d")
        sad["d"] = saider.qb64

        # Sign the serialized ACDC
        import json
        ser = json.dumps(sad, separators=(",", ":")).encode()
        self._hab.sign(ser=ser, indexed=True)

        # Store the ACDC in our database under a custom subdb
        sdb = self.hby.db.env.open_db(b"exns.")  # reuse exns for ACDC storage
        self.hby.db.setVal(sdb, sad["d"].encode(), ser)

        return sad["d"]

    def attest_manual(self, obs: Observation) -> str:
        """Manual attestation with explicit biometric. Journey 7.

        Same as attest() — the biometric data is already in the Observation.
        The distinction is that the caller confirmed biometric before calling.
        """
        return self.attest(obs)
```

- [ ] **Step 5: Run tests**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_attestation.py -v 2>&1 | tail -15`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/code/locked-in
git add -A
git commit -m "feat: Observation attestation — sign GPS/bio data as Untargeted ACDCs"
```

---

### Task 4: Epoch and Chronicle Anchoring

**Files:**
- Modify: `src/lockedin/bridge.py`
- Modify: `tests/test_bridge_attestation.py`

Implements `anchorEpoch()` and `anchorChronicle()` — bulk-issuing observations into hourly/daily aggregation ACDCs anchored to the KEL via interaction events.

- [ ] **Step 1: Write failing tests for Epoch and Chronicle**

Append to `tests/test_bridge_attestation.py`:

```python
@dataclass
class EpochResult:
    pass

@dataclass
class ChronicleResult:
    pass

# Import these from bridge instead:
from lockedin.bridge import EpochResult, ChronicleResult


class TestEpochAnchoring:
    def test_anchor_epoch(self, attester):
        """Anchor 3 observations into an epoch."""
        obs_saids = []
        for minute in range(0, 15, 5):
            obs = make_observation(
                observed_at=datetime(2026, 4, 15, 12, minute, tzinfo=timezone.utc)
            )
            obs_saids.append(attester.attest(obs))

        result = attester.anchor_epoch(obs_saids)
        assert isinstance(result, EpochResult)
        assert result.said is not None
        assert result.observation_count == 3
        assert result.anchored is True

    def test_anchor_epoch_creates_kel_event(self, attester):
        """Epoch anchoring should create a KEL interaction event."""
        sn_before = attester.hab.kever.sn
        obs = make_observation()
        said = attester.attest(obs)
        attester.anchor_epoch([said])
        assert attester.hab.kever.sn == sn_before + 1


class TestChronicleAnchoring:
    def test_anchor_chronicle(self, attester):
        """Anchor epoch SAIDs into a daily chronicle."""
        # Create 2 epochs
        epoch_saids = []
        for hour in [10, 11]:
            obs = make_observation(
                observed_at=datetime(2026, 4, 15, hour, 0, tzinfo=timezone.utc)
            )
            obs_said = attester.attest(obs)
            epoch_result = attester.anchor_epoch([obs_said])
            epoch_saids.append(epoch_result.said)

        result = attester.anchor_chronicle(epoch_saids)
        assert isinstance(result, ChronicleResult)
        assert result.said is not None
        assert result.epoch_count == 2
        assert result.anchored is True
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_attestation.py -k "TestEpoch or TestChronicle" -v 2>&1 | tail -15`
Expected: FAIL — EpochResult/ChronicleResult not importable.

- [ ] **Step 3: Implement EpochResult, ChronicleResult, anchor_epoch, anchor_chronicle**

Add to `bridge.py`:

```python
@dataclass
class EpochResult:
    """Result of anchoring an epoch."""
    said: str              # SAID of the Epoch ACDC
    observation_count: int
    anchored: bool         # True if KEL interaction event created


@dataclass
class ChronicleResult:
    """Result of anchoring a chronicle."""
    said: str              # SAID of the Chronicle ACDC
    epoch_count: int
    anchored: bool
```

Add methods to `LockedIn`:

```python
    def anchor_epoch(self, observation_saids: list[str]) -> EpochResult:
        """Bulk-issue an Epoch aggregating Observations. Journey 5.

        Creates an Epoch ACDC with edges referencing the child Observation SAIDs,
        then anchors it to the KEL via an interaction event.
        """
        if self._hab is None:
            raise RuntimeError("No AID. Call incept_aid() first.")

        now = datetime.now(timezone.utc)

        # Build Epoch ACDC SAD with edge references
        edges = {str(i): {"d": said} for i, said in enumerate(observation_saids)}
        epoch_sad = {
            "v": "ACDC10JSON000000_",
            "t": "acdc",
            "d": "",
            "i": self.hab.pre,
            "s": "epoch_schema_said",
            "a": {
                "d": "",
                "dt": now.isoformat(),
                "starts_at": now.isoformat(),
                "ends_at": now.isoformat(),
                "observation_count": len(observation_saids),
                "bio_count": 0,
            },
            "e": edges,
        }

        # Compute SAIDs
        from keri.core import Saider
        saider = Saider(sad=epoch_sad["a"], label="d")
        epoch_sad["a"]["d"] = saider.qb64
        saider = Saider(sad=epoch_sad, label="d")
        epoch_sad["d"] = saider.qb64

        # Store Epoch ACDC
        import json
        ser = json.dumps(epoch_sad, separators=(",", ":")).encode()
        self._hab.sign(ser=ser, indexed=True)
        sdb = self.hby.db.env.open_db(b"exns.")
        self.hby.db.setVal(sdb, epoch_sad["d"].encode(), ser)

        # Anchor to KEL via interaction event
        seal = {"d": epoch_sad["d"]}
        self._hab.interact(data=[seal])

        return EpochResult(
            said=epoch_sad["d"],
            observation_count=len(observation_saids),
            anchored=True,
        )

    def anchor_chronicle(self, epoch_saids: list[str]) -> ChronicleResult:
        """Anchor a daily Chronicle aggregating Epochs. Journey 5.

        Creates a Chronicle ACDC with edges referencing child Epoch SAIDs,
        then anchors to KEL.
        """
        if self._hab is None:
            raise RuntimeError("No AID. Call incept_aid() first.")

        now = datetime.now(timezone.utc)

        edges = {str(i): {"d": said} for i, said in enumerate(epoch_saids)}
        chronicle_sad = {
            "v": "ACDC10JSON000000_",
            "t": "acdc",
            "d": "",
            "i": self.hab.pre,
            "s": "chronicle_schema_said",
            "a": {
                "d": "",
                "dt": now.isoformat(),
                "date": now.strftime("%Y-%m-%d"),
                "epoch_count": len(epoch_saids),
                "total_observations": 0,
            },
            "e": edges,
        }

        from keri.core import Saider
        saider = Saider(sad=chronicle_sad["a"], label="d")
        chronicle_sad["a"]["d"] = saider.qb64
        saider = Saider(sad=chronicle_sad, label="d")
        chronicle_sad["d"] = saider.qb64

        import json
        ser = json.dumps(chronicle_sad, separators=(",", ":")).encode()
        self._hab.sign(ser=ser, indexed=True)
        sdb = self.hby.db.env.open_db(b"exns.")
        self.hby.db.setVal(sdb, chronicle_sad["d"].encode(), ser)

        seal = {"d": chronicle_sad["d"]}
        self._hab.interact(data=[seal])

        return ChronicleResult(
            said=chronicle_sad["d"],
            epoch_count=len(epoch_saids),
            anchored=True,
        )
```

- [ ] **Step 4: Fix test imports**

In `tests/test_bridge_attestation.py`, update the import line:

```python
from lockedin.bridge import LockedIn, Observation, EpochResult, ChronicleResult
```

Remove the local `@dataclass` stubs for EpochResult and ChronicleResult.

- [ ] **Step 5: Run tests**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_attestation.py -v 2>&1 | tail -20`
Expected: All tests PASS (4 attestation + 2 epoch + 1 chronicle = 7).

- [ ] **Step 6: Commit**

```bash
cd ~/code/locked-in
git add -A
git commit -m "feat: Epoch and Chronicle anchoring — bulk ACDC issuance with KEL interaction events"
```

---

### Task 5: Timeline Query

**Files:**
- Modify: `src/lockedin/bridge.py`
- Create: `tests/test_bridge_query.py`

Implements `queryChronicles()`, `queryEpochs()`, `queryObservations()` — local queries against the SQLiteDBer.

- [ ] **Step 1: Write failing query tests**

```python
# tests/test_bridge_query.py
"""Tests for LockedIn bridge — timeline query."""

import pytest
from datetime import datetime, timezone

from lockedin.bridge import LockedIn, Observation


@pytest.fixture
def populated_bridge(tmp_path):
    """Provides a bridge with attestation data for querying."""
    li = LockedIn(
        db_path=str(tmp_path / "query.sqlite"),
        ks_path=str(tmp_path / "query-ks.sqlite"),
        name="query",
    )
    li.bootstrap()
    li.incept_aid()

    # Create 3 observations, 1 epoch, 1 chronicle
    saids = []
    for minute in [0, 5, 10]:
        obs = Observation(
            lat=40.7128, lon=-74.0060, altitude=10.0,
            barometric_pressure=1013.25, horizontal_accuracy=5.0,
            biometric_method="face_id", biometric_confidence=0.99,
            observed_at=datetime(2026, 4, 15, 12, minute, tzinfo=timezone.utc),
        )
        saids.append(li.attest(obs))

    epoch_result = li.anchor_epoch(saids)
    li.anchor_chronicle([epoch_result.said])

    yield li
    li.close()


class TestQueryObservations:
    def test_query_all_observations(self, populated_bridge):
        obs_list = populated_bridge.query_observations()
        assert len(obs_list) == 3

    def test_query_observations_returns_dicts(self, populated_bridge):
        obs_list = populated_bridge.query_observations()
        assert all(isinstance(o, dict) for o in obs_list)
        assert all("lat" in o.get("a", {}) for o in obs_list)


class TestQueryEpochs:
    def test_query_all_epochs(self, populated_bridge):
        epochs = populated_bridge.query_epochs()
        assert len(epochs) == 1

    def test_epoch_has_observation_count(self, populated_bridge):
        epochs = populated_bridge.query_epochs()
        assert epochs[0]["a"]["observation_count"] == 3


class TestQueryChronicles:
    def test_query_all_chronicles(self, populated_bridge):
        chronicles = populated_bridge.query_chronicles()
        assert len(chronicles) == 1

    def test_chronicle_has_epoch_count(self, populated_bridge):
        chronicles = populated_bridge.query_chronicles()
        assert chronicles[0]["a"]["epoch_count"] == 1
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_query.py -v 2>&1 | tail -15`
Expected: FAIL — query methods not defined.

- [ ] **Step 3: Implement query methods**

Add to `LockedIn` in `bridge.py`:

```python
    def _query_acdcs_by_type(self, schema_said: str) -> list[dict]:
        """Query all ACDCs with a given schema SAID."""
        import json
        sdb = self.hby.db.env.open_db(b"exns.")
        results = []
        for key, val in self.hby.db.getTopItemIter(sdb):
            try:
                sad = json.loads(val)
                if sad.get("s") == schema_said:
                    results.append(sad)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
        return results

    def query_observations(self) -> list[dict]:
        """Query all Observation ACDCs. Journey 6."""
        return self._query_acdcs_by_type("observation_schema_said")

    def query_epochs(self) -> list[dict]:
        """Query all Epoch ACDCs. Journey 6."""
        return self._query_acdcs_by_type("epoch_schema_said")

    def query_chronicles(self) -> list[dict]:
        """Query all Chronicle ACDCs. Journey 6."""
        return self._query_acdcs_by_type("chronicle_schema_said")
```

- [ ] **Step 4: Run tests**

Run: `cd ~/code/locked-in && python -m pytest tests/test_bridge_query.py -v 2>&1 | tail -15`
Expected: All 6 tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd ~/code/locked-in && python -m pytest -v 2>&1 | tail -25`
Expected: All tests PASS (9 lifecycle + 7 attestation + 6 query = 22).

- [ ] **Step 6: Commit**

```bash
cd ~/code/locked-in
git add -A
git commit -m "feat: timeline query — queryObservations, queryEpochs, queryChronicles"
```

---

## Post-Implementation Verification

After all 5 tasks:

```bash
cd ~/code/locked-in
python -m pytest -v
```

Expected: ~22 tests passing across 3 test files.

```bash
python -c "from lockedin.bridge import LockedIn, Observation, AIDResult, EpochResult, ChronicleResult; print('imports OK')"
```

---

## What This Plan Does NOT Cover (Plan 3)

- `resolveOOBI()` — requires networking
- `updateWitnesses()` — requires witness infrastructure
- `generateOOBI()` — requires endpoint configuration
- `disclose()` — selective disclosure packaging
- `verifyDisclosure()` — disclosure verification
- `witnessStatus()` — requires witness connectivity
- `trustTier()` — depends on witness configuration
- `syncWitnesses()` — requires networking
- Proper ACDC schema registration and SAID computation
- TEL/Registry integration (using Regery)
- Proper credential chaining with Serder/SerderACDC

This plan builds the **offline-capable core** — the phone can attest, anchor, and query without any network. Plan 3 adds the connected features.
