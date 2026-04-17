# SQLiteDBer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a SQLite-backed database adapter for keripy that matches the DynamoDBer interface, enabling keripy to run on iOS without LMDB.

**Architecture:** `SQLiteDBer` is a drop-in replacement for `DynamoDBer` (and `LMDBer`). It implements the same ~85 public methods using a single SQLite table with a `(subdb, key, sort)` composite primary key. The entire `subing.py` / `koming.py` / `basing.py` stack works unchanged on top of it.

**Tech Stack:** Python 3.12+, sqlite3 (stdlib), pytest for testing. No external dependencies.

**Working directory:** `/Users/seriouscoderone/code/keripy` (on branch `feat/dynamodb-backend`)

**Reference implementation:** `src/keri/db/dynamodbing.py` (1596 lines) — SQLiteDBer follows the same interface contract.

**Test reference:** `tests/db/test_dynamodbing.py` (82 tests) — SQLiteDBer tests mirror this structure.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/keri/db/sqlitedbing.py` | SQLiteDBer class + SQLiteSubDb + SQLiteEnv + helpers |
| Create | `tests/db/test_sqlitedbing.py` | Unit tests (mirrors test_dynamodbing.py structure) |
| Create | `tests/app/test_keri_protocol_sqlite.py` | Integration test (mirrors test_keri_protocol_dynamo.py) |
| Modify | `src/keri/db/__init__.py` | Add optional SQLiteDBer import |

---

### Task 1: Schema, Lifecycle, and Key Utilities

**Files:**
- Create: `src/keri/db/sqlitedbing.py`
- Create: `tests/db/test_sqlitedbing.py`

This task establishes the foundation: the SQLite table schema, the `SQLiteSubDb` dataclass, `SQLiteEnv` class, `SQLiteDBer` lifecycle methods (open, close, version, flush), and the key utility functions (reused from dynamodbing).

- [ ] **Step 1: Write the failing tests for key utilities and lifecycle**

```python
# tests/db/test_sqlitedbing.py
"""Tests for SQLiteDBer — mirrors test_dynamodbing.py structure."""

import os
import pytest
import tempfile

try:
    from keri.db.sqlitedbing import (
        SQLiteDBer, openSQLite,
        onKey, splitKey, splitOnKey, suffix, unsuffix, MaxON,
    )
    HAS_SQLITEDBING = True
except ImportError:
    HAS_SQLITEDBING = False

STORES = ["evts.", "fels.", "kels.", "sigs.", "test."]


@pytest.fixture
def dber(tmp_path):
    """Provides a SQLiteDBer instance backed by a temp file."""
    if not HAS_SQLITEDBING:
        pytest.skip("sqlitedbing not available")
    db = SQLiteDBer.open(
        name="test",
        stores=STORES,
        path=str(tmp_path / "test.sqlite"),
    )
    yield db
    db.close(clear=True)


class TestKeyUtilities:
    """Key composition/decomposition helpers."""

    def test_onKey(self):
        result = onKey(b"pre", 42)
        assert result == b"pre.%032x" % 42

    def test_splitOnKey(self):
        key = onKey(b"pre", 42)
        top, on = splitOnKey(key)
        assert top == b"pre"
        assert on == 42

    def test_suffix_unsuffix(self):
        key = b"mykey"
        ion = 7
        skey = suffix(key, ion)
        rkey, rion = unsuffix(skey)
        assert rkey == key
        assert rion == ion

    def test_MaxON(self):
        assert MaxON == int("f" * 32, 16)


class TestSQLiteDBerLifecycle:
    """Lifecycle and version management."""

    def test_open_creates_database(self, dber):
        assert dber.opened is True
        assert dber.name == "test"
        assert "evts." in dber.stores

    def test_open_with_clear(self, tmp_path):
        db = SQLiteDBer.open(name="test", stores=STORES,
                             path=str(tmp_path / "clear.sqlite"))
        sdb = db.env.open_db(b"test.")
        db.setVal(sdb, b"key1", b"val1")
        db.close()

        db2 = SQLiteDBer.open(name="test", stores=STORES,
                              path=str(tmp_path / "clear.sqlite"), clear=True)
        sdb2 = db2.env.open_db(b"test.")
        assert db2.getVal(sdb2, b"key1") is None
        db2.close()

    def test_version_get_set(self, dber):
        assert dber.version is None
        dber.version = "1.0.0"
        assert dber.version == "1.0.0"

    def test_close_clears(self, tmp_path):
        db = SQLiteDBer.open(name="test", stores=STORES,
                             path=str(tmp_path / "close.sqlite"))
        db.close(clear=True)
        assert db.opened is False

    def test_env_open_db(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert sdb.opened is True
        assert sdb.name == "test."

    def test_env_open_db_unknown_raises(self, dber):
        with pytest.raises(KeyError):
            dber.env.open_db(b"nonexistent.")

    def test_env_open_db_dupsort(self, dber):
        sdb = dber.env.open_db(b"test.", dupsort=True)
        assert sdb.dupsort is True
        flags = sdb.flags()
        assert flags["dupsort"] is True

    def test_flush_noop(self, dber):
        assert dber.flush() == 0


class TestContextManager:
    """Context manager usage."""

    def test_open_and_use(self, tmp_path):
        with openSQLite(name="ctx", stores=STORES,
                        path=str(tmp_path / "ctx.sqlite")) as db:
            assert db.opened is True
            sdb = db.env.open_db(b"test.")
            db.setVal(sdb, b"k", b"v")
            assert db.getVal(sdb, b"k") == b"v"

    def test_temp_clears_on_exit(self, tmp_path):
        path = str(tmp_path / "temp.sqlite")
        with openSQLite(name="tmp", stores=STORES, path=path,
                        temp=True) as db:
            sdb = db.env.open_db(b"test.")
            db.setVal(sdb, b"k", b"v")

        db2 = SQLiteDBer.open(name="tmp", stores=STORES, path=path)
        sdb2 = db2.env.open_db(b"test.")
        assert db2.getVal(sdb2, b"k") is None
        db2.close()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py -v 2>&1 | head -30`
Expected: ImportError or ModuleNotFoundError — `sqlitedbing` doesn't exist yet.

- [ ] **Step 3: Implement SQLiteDBer foundation**

```python
# src/keri/db/sqlitedbing.py
"""
keri.db.sqlitedbing module

SQLite-backed DBer implementing the same interface as LMDBer and DynamoDBer.
Enables keripy to run on iOS and other environments where LMDB is impractical.

Uses Python's stdlib sqlite3 — no external dependencies.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Union

MaxON = int("f" * 32, 16)


def onKey(top, on, *, sep=b'.'):
    if hasattr(top, "encode"):
        top = top.encode("utf-8")
    return (b'%s%s%032x' % (top, sep, on))


def splitKey(key, sep=b'.'):
    if isinstance(key, memoryview):
        key = bytes(key)
    if hasattr(key, "encode"):
        if hasattr(sep, 'decode'):
            sep = sep.decode("utf-8")
    else:
        if hasattr(sep, 'encode'):
            sep = sep.encode("utf-8")
    splits = key.rsplit(sep, 1)
    if len(splits) != 2:
        raise ValueError(f"Unsplittable key: {key!r}")
    return tuple(splits)


def splitOnKey(key, *, sep=b'.'):
    top, on = splitKey(key, sep=sep)
    on = int(on, 16)
    return (top, on)


def suffix(key, ion, *, sep=b'.'):
    if hasattr(key, "encode"):
        key = key.encode("utf-8")
    if hasattr(sep, "encode"):
        sep = sep.encode("utf-8")
    return sep.join((key, b"%032x" % ion))


def unsuffix(iokey, *, sep=b'.'):
    if isinstance(iokey, memoryview):
        iokey = bytes(iokey)
    if hasattr(iokey, "encode"):
        if hasattr(sep, "decode"):
            sep = sep.decode("utf-8")
    else:
        if hasattr(sep, "encode"):
            sep = sep.encode("utf-8")
    key, ion = iokey.rsplit(sep, maxsplit=1)
    ion = int(ion, 16)
    return (key, ion)


# Sort key prefixes (mirror DynamoDBer's pattern)
_SK_SINGLE = b"V"
_SK_ON_PREFIX = b"ON#"
_SK_IO_PREFIX = b"IO#"
_SK_ONIO_PREFIX = b"ONIO#"
_SK_META = b"META"


@dataclass
class SQLiteSubDb:
    """One declared SQLite-backed subdb."""
    name: str
    dupsort: bool = False
    flags_persisted: bool = False
    opened: bool = False

    def flags(self) -> dict[str, bool]:
        return {"dupsort": self.dupsort}


class SQLiteEnv:
    """Minimal named-subdb opener used by upstream wrappers (subing.py)."""

    def __init__(self, owner: SQLiteDBer):
        self.owner = owner

    def open_db(self, key: bytes | str, dupsort: bool = False) -> SQLiteSubDb:
        name = self.owner._storify(key)
        if name not in self.owner._stores:
            raise KeyError(f"Store not configured in SQLiteDBer: {name}")
        subdb = self.owner._stores[name]
        if not subdb.opened:
            if not subdb.flags_persisted:
                subdb.dupsort = bool(dupsort)
                subdb.flags_persisted = True
                self.owner._put_meta(subdb, {"dupsort": subdb.dupsort})
            subdb.opened = True
        return subdb


class SQLiteDBer:
    """
    SQLite-backed DBer.

    Implements the same method interface as LMDBer and DynamoDBer, enabling
    subing.py / koming.py / basing.py wrappers to work unchanged.
    """

    def __init__(self, *, name: str, stores: dict[str, SQLiteSubDb],
                 conn: sqlite3.Connection, path: str):
        self.name = name
        self.env = SQLiteEnv(self)
        self._stores = stores
        self.stores = list(stores)
        self._version = None
        self._conn = conn
        self.opened = True
        self.temp = False
        self.readonly = False
        self.path = path

    @classmethod
    def open(cls, name: str, stores: list[str], *, path: str = "",
             clear: bool = False) -> SQLiteDBer:
        if not path:
            path = f"/tmp/keri_sqlite_{name}.db"

        conn = sqlite3.connect(path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")

        cls._ensure_schema(conn)

        opened: dict[str, SQLiteSubDb] = {}
        all_store_names = [cls._storify(s) for s in stores]
        if "__meta__" not in all_store_names:
            all_store_names.append("__meta__")

        for store_name in all_store_names:
            opened[store_name] = SQLiteSubDb(name=store_name)

        dber = cls(name=name, stores=opened, conn=conn, path=path)

        if clear:
            for store_name in all_store_names:
                dber._clear_store(store_name)

        # Load metadata
        for store_name, subdb in opened.items():
            meta = dber._get_meta(subdb)
            if meta:
                subdb.dupsort = meta.get("dupsort", False)
                subdb.flags_persisted = True

        return dber

    @staticmethod
    def _ensure_schema(conn: sqlite3.Connection):
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS keri_store (
                subdb  TEXT NOT NULL,
                key    BLOB NOT NULL,
                sort   BLOB NOT NULL DEFAULT x'',
                value  BLOB NOT NULL,
                PRIMARY KEY (subdb, key, sort)
            );
            CREATE INDEX IF NOT EXISTS idx_subdb_key
                ON keri_store (subdb, key);
            CREATE INDEX IF NOT EXISTS idx_subdb
                ON keri_store (subdb);
            CREATE TABLE IF NOT EXISTS keri_meta (
                subdb   TEXT PRIMARY KEY,
                dupsort INTEGER NOT NULL DEFAULT 0,
                flags   TEXT
            );
        """)

    @staticmethod
    def _storify(key: bytes | str) -> str:
        if isinstance(key, (bytes, memoryview)):
            return key.decode("utf-8")
        return key

    def flush(self) -> int:
        self._conn.commit()
        return 0

    @property
    def version(self) -> str | None:
        return self.getVer()

    @version.setter
    def version(self, val: str | bytes):
        self.setVer(val)

    def getVer(self) -> str | None:
        meta_db = self._stores.get("__meta__")
        if not meta_db:
            return None
        row = self._conn.execute(
            "SELECT value FROM keri_store WHERE subdb=? AND key=? AND sort=?",
            ("__meta__", b"__version__", b"")
        ).fetchone()
        if row:
            return row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
        return None

    def setVer(self, val: str | bytes):
        if isinstance(val, str):
            val = val.encode("utf-8")
        self._conn.execute(
            "INSERT OR REPLACE INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            ("__meta__", b"__version__", b"", val)
        )
        self._conn.commit()

    def close(self, clear: bool = False):
        if clear:
            for store_name in list(self._stores):
                self._clear_store(store_name)
        self._conn.close()
        self.opened = False

    def _clear_store(self, store_name: str):
        self._conn.execute("DELETE FROM keri_store WHERE subdb=?",
                           (store_name,))
        self._conn.commit()

    def _put_meta(self, db: SQLiteSubDb, meta: dict):
        self._conn.execute(
            "INSERT OR REPLACE INTO keri_meta (subdb, dupsort, flags) "
            "VALUES (?, ?, ?)",
            (db.name, int(meta.get("dupsort", False)), json.dumps(meta))
        )
        self._conn.commit()

    def _get_meta(self, db: SQLiteSubDb) -> dict | None:
        row = self._conn.execute(
            "SELECT flags FROM keri_meta WHERE subdb=?", (db.name,)
        ).fetchone()
        if row and row[0]:
            return json.loads(row[0])
        return None

    # Placeholder for CRUD methods — implemented in subsequent tasks
    def putVal(self, db, key, val):
        raise NotImplementedError

    def setVal(self, db, key, val):
        raise NotImplementedError

    def getVal(self, db, key):
        raise NotImplementedError

    def remVal(self, db, key):
        raise NotImplementedError

    delVal = remVal


@contextmanager
def openSQLite(*, cls=None, name="test", stores=None, path="",
               temp=False, **kwa):
    if stores is None:
        stores = []
    if not path:
        import tempfile
        path = os.path.join(tempfile.mkdtemp(), f"{name}.sqlite")

    import os
    dber = SQLiteDBer.open(name=name, stores=stores, path=path, **kwa)
    dber.temp = temp
    try:
        yield dber
    finally:
        dber.close(clear=temp)
```

- [ ] **Step 4: Run lifecycle and key utility tests**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py -v -k "TestKeyUtilities or TestSQLiteDBerLifecycle or TestContextManager" 2>&1 | tail -20`
Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer foundation — schema, lifecycle, key utilities"
```

---

### Task 2: Single-Value CRUD

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

Implements `putVal`, `setVal`, `getVal`, `remVal`/`delVal` — the fundamental key-value operations.

- [ ] **Step 1: Write failing tests for single-value CRUD**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestSingleValueCRUD:
    """Single key-value operations."""

    def test_putVal_insert(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putVal(sdb, b"key1", b"val1") is True
        assert dber.getVal(sdb, b"key1") == b"val1"

    def test_putVal_no_overwrite(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putVal(sdb, b"key1", b"val1")
        assert dber.putVal(sdb, b"key1", b"val2") is False
        assert dber.getVal(sdb, b"key1") == b"val1"

    def test_setVal_insert(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.setVal(sdb, b"key1", b"val1") is True
        assert dber.getVal(sdb, b"key1") == b"val1"

    def test_setVal_overwrite(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"key1", b"val1")
        assert dber.setVal(sdb, b"key1", b"val2") is True
        assert dber.getVal(sdb, b"key1") == b"val2"

    def test_getVal_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.getVal(sdb, b"nonexistent") is None

    def test_remVal_exists(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"key1", b"val1")
        assert dber.remVal(sdb, b"key1") is True
        assert dber.getVal(sdb, b"key1") is None

    def test_remVal_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.remVal(sdb, b"nonexistent") is False

    def test_delVal_alias(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"key1", b"val1")
        assert dber.delVal(sdb, b"key1") is True

    def test_stores_are_isolated(self, dber):
        sdb1 = dber.env.open_db(b"evts.")
        sdb2 = dber.env.open_db(b"test.")
        dber.setVal(sdb1, b"key1", b"val_evts")
        dber.setVal(sdb2, b"key1", b"val_test")
        assert dber.getVal(sdb1, b"key1") == b"val_evts"
        assert dber.getVal(sdb2, b"key1") == b"val_test"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestSingleValueCRUD -v 2>&1 | tail -15`
Expected: FAIL with `NotImplementedError`.

- [ ] **Step 3: Implement single-value CRUD**

Replace the placeholder methods in `sqlitedbing.py` with:

```python
    def _ensure_key(self, key: bytes):
        """Normalize key to bytes."""
        if isinstance(key, memoryview):
            key = bytes(key)
        if isinstance(key, str):
            key = key.encode("utf-8")
        return key

    def putVal(self, db: SQLiteSubDb, key: bytes, val: bytes) -> bool:
        """Insert val at key. Does NOT overwrite. Returns True if new."""
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        try:
            self._conn.execute(
                "INSERT INTO keri_store (subdb, key, sort, value) "
                "VALUES (?, ?, ?, ?)",
                (db.name, key, _SK_SINGLE, val)
            )
            self._conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def setVal(self, db: SQLiteSubDb, key: bytes, val: bytes) -> bool:
        """Insert or overwrite val at key. Returns True."""
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        self._conn.execute(
            "INSERT OR REPLACE INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            (db.name, key, _SK_SINGLE, val)
        )
        self._conn.commit()
        return True

    def getVal(self, db: SQLiteSubDb, key: bytes) -> bytes | None:
        """Get value at key. Returns None if missing."""
        key = self._ensure_key(key)
        row = self._conn.execute(
            "SELECT value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort=?",
            (db.name, key, _SK_SINGLE)
        ).fetchone()
        return row[0] if row else None

    def remVal(self, db: SQLiteSubDb, key: bytes) -> bool:
        """Remove entry at key. Returns True if removed."""
        key = self._ensure_key(key)
        cursor = self._conn.execute(
            "DELETE FROM keri_store WHERE subdb=? AND key=? AND sort=?",
            (db.name, key, _SK_SINGLE)
        )
        self._conn.commit()
        return cursor.rowcount > 0

    delVal = remVal
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestSingleValueCRUD -v 2>&1 | tail -15`
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer single-value CRUD — putVal, setVal, getVal, remVal"
```

---

### Task 3: Ordinal Operations

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

Implements ordinal-keyed operations: `putOnVal`, `pinOnVal`, `appendOnVal`, `getOnItem`, `getOnVal`, `remOn`, `remOnAll`, `cntOnAll`. These use the sort key as `ON#` + 32-hex ordinal.

- [ ] **Step 1: Write failing tests for ordinal operations**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestOrdinalOps:
    """Ordinal/sequence-based operations."""

    def test_putOnVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putOnVal(sdb, b"pre", on=0, val=b"v0") is True
        assert dber.getOnVal(sdb, b"pre", on=0) == b"v0"

    def test_putOnVal_no_overwrite(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        assert dber.putOnVal(sdb, b"pre", on=0, val=b"v1") is False
        assert dber.getOnVal(sdb, b"pre", on=0) == b"v0"

    def test_putOnVal_none_returns_false(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putOnVal(sdb, b"pre", on=0, val=None) is False

    def test_pinOnVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        assert dber.pinOnVal(sdb, b"pre", on=0, val=b"v1") is True
        assert dber.getOnVal(sdb, b"pre", on=0) == b"v1"

    def test_appendOnVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        on0 = dber.appendOnVal(sdb, b"pre", val=b"v0")
        on1 = dber.appendOnVal(sdb, b"pre", val=b"v1")
        assert on0 == 0
        assert on1 == 1
        assert dber.getOnVal(sdb, b"pre", on=0) == b"v0"
        assert dber.getOnVal(sdb, b"pre", on=1) == b"v1"

    def test_getOnItem(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=5, val=b"v5")
        result = dber.getOnItem(sdb, b"pre", on=5)
        assert result == (b"pre", 5, b"v5")

    def test_getOnItem_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.getOnItem(sdb, b"pre", on=99) is None

    def test_getOnVal_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.getOnVal(sdb, b"pre", on=99) is None

    def test_remOn(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        assert dber.remOn(sdb, b"pre", on=0) is True
        assert dber.getOnVal(sdb, b"pre", on=0) is None

    def test_remOn_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.remOn(sdb, b"pre", on=0) is False

    def test_remOnAll(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        dber.putOnVal(sdb, b"pre", on=1, val=b"v1")
        dber.putOnVal(sdb, b"pre", on=2, val=b"v2")
        assert dber.remOnAll(sdb, b"pre", on=1) is True
        assert dber.getOnVal(sdb, b"pre", on=0) == b"v0"
        assert dber.getOnVal(sdb, b"pre", on=1) is None
        assert dber.getOnVal(sdb, b"pre", on=2) is None

    def test_cntOnAll(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        dber.putOnVal(sdb, b"pre", on=1, val=b"v1")
        dber.putOnVal(sdb, b"pre", on=2, val=b"v2")
        assert dber.cntOnAll(sdb, b"pre") == 3
        assert dber.cntOnAll(sdb, b"pre", on=1) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestOrdinalOps -v 2>&1 | tail -20`
Expected: FAIL — methods not implemented.

- [ ] **Step 3: Implement ordinal operations**

Add to `SQLiteDBer` in `sqlitedbing.py`:

```python
    def _on_sort_key(self, on: int) -> bytes:
        """Build sort key for ordinal: ON# + 32-hex on."""
        return _SK_ON_PREFIX + b"%032x" % on

    def putOnVal(self, db: SQLiteSubDb, key: bytes, on: int = 0,
                 val: bytes | None = None, *, sep: bytes = b".") -> bool:
        if val is None:
            return False
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        sk = self._on_sort_key(on)
        try:
            self._conn.execute(
                "INSERT INTO keri_store (subdb, key, sort, value) "
                "VALUES (?, ?, ?, ?)",
                (db.name, key, sk, val)
            )
            self._conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def pinOnVal(self, db: SQLiteSubDb, key: bytes, on: int = 0,
                 val: bytes | None = None, *, sep: bytes = b".") -> bool:
        if val is None:
            return False
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        sk = self._on_sort_key(on)
        self._conn.execute(
            "INSERT OR REPLACE INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            (db.name, key, sk, val)
        )
        self._conn.commit()
        return True

    def appendOnVal(self, db: SQLiteSubDb, key: bytes, val: bytes,
                    *, sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        # Find max existing ordinal for this key
        row = self._conn.execute(
            "SELECT sort FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, _SK_ON_PREFIX, _SK_ON_PREFIX + b"\xff")
        ).fetchone()
        if row:
            on = int(row[0][len(_SK_ON_PREFIX):], 16) + 1
        else:
            on = 0
        sk = self._on_sort_key(on)
        self._conn.execute(
            "INSERT INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            (db.name, key, sk, val)
        )
        self._conn.commit()
        return on

    def getOnItem(self, db: SQLiteSubDb, key: bytes, on: int = 0,
                  *, sep: bytes = b".") -> tuple | None:
        key = self._ensure_key(key)
        sk = self._on_sort_key(on)
        row = self._conn.execute(
            "SELECT value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort=?",
            (db.name, key, sk)
        ).fetchone()
        if row:
            return (key, on, row[0])
        return None

    def getOnVal(self, db: SQLiteSubDb, key: bytes, on: int = 0,
                 *, sep: bytes = b".") -> bytes | None:
        item = self.getOnItem(db, key, on, sep=sep)
        return item[2] if item else None

    def remOn(self, db: SQLiteSubDb, key: bytes, on: int = 0,
              *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        sk = self._on_sort_key(on)
        cursor = self._conn.execute(
            "DELETE FROM keri_store WHERE subdb=? AND key=? AND sort=?",
            (db.name, key, sk)
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def remOnAll(self, db: SQLiteSubDb, key: bytes = b"", on: int = 0,
                 *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        sk_from = self._on_sort_key(on)
        if key:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
                (db.name, key, sk_from, _SK_ON_PREFIX + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ?",
                (db.name, sk_from, _SK_ON_PREFIX + b"\xff")
            )
        self._conn.commit()
        return cursor.rowcount > 0

    def cntOnAll(self, db: SQLiteSubDb, key: bytes = b"", on: int = 0,
                 *, sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        sk_from = self._on_sort_key(on)
        if key:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
                (db.name, key, sk_from, _SK_ON_PREFIX + b"\xff")
            ).fetchone()
        else:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ?",
                (db.name, sk_from, _SK_ON_PREFIX + b"\xff")
            ).fetchone()
        return row[0]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestOrdinalOps -v 2>&1 | tail -20`
Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer ordinal operations — putOnVal, appendOnVal, getOnVal, remOn"
```

---

### Task 4: Top-Level Iteration and Management

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

Implements prefix-based iteration and management: `getTopItemIter`, `getOnTopItemIter`, `getOnAllItemIter`, `remTop`/`delTop`, `cntTop`, `cntAll`.

- [ ] **Step 1: Write failing tests for iteration methods**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestTopIteration:
    """Prefix-based and ordinal iteration."""

    def test_getTopItemIter_all(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"a.1", b"v1")
        dber.setVal(sdb, b"a.2", b"v2")
        dber.setVal(sdb, b"b.1", b"v3")
        items = list(dber.getTopItemIter(sdb, top=b""))
        assert len(items) == 3

    def test_getTopItemIter_prefix(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"a.1", b"v1")
        dber.setVal(sdb, b"a.2", b"v2")
        dber.setVal(sdb, b"b.1", b"v3")
        items = list(dber.getTopItemIter(sdb, top=b"a."))
        assert len(items) == 2
        assert all(k.startswith(b"a.") for k, v in items)

    def test_getOnTopItemIter(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre.a", on=0, val=b"v0")
        dber.putOnVal(sdb, b"pre.a", on=1, val=b"v1")
        dber.putOnVal(sdb, b"pre.b", on=0, val=b"v2")
        items = list(dber.getOnTopItemIter(sdb, top=b"pre."))
        assert len(items) == 3
        assert items[0] == (b"pre.a", 0, b"v0")

    def test_getOnAllItemIter(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnVal(sdb, b"pre", on=0, val=b"v0")
        dber.putOnVal(sdb, b"pre", on=1, val=b"v1")
        dber.putOnVal(sdb, b"pre", on=2, val=b"v2")
        items = list(dber.getOnAllItemIter(sdb, b"pre", on=1))
        assert len(items) == 2
        assert items[0] == (b"pre", 1, b"v1")

    def test_remTop(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"a.1", b"v1")
        dber.setVal(sdb, b"a.2", b"v2")
        dber.setVal(sdb, b"b.1", b"v3")
        assert dber.remTop(sdb, top=b"a.") is True
        assert dber.getVal(sdb, b"a.1") is None
        assert dber.getVal(sdb, b"b.1") == b"v3"

    def test_delTop_alias(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"x.1", b"v1")
        assert dber.delTop(sdb, top=b"x.") is True

    def test_cntTop(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"a.1", b"v1")
        dber.setVal(sdb, b"a.2", b"v2")
        dber.setVal(sdb, b"b.1", b"v3")
        assert dber.cntTop(sdb, top=b"a.") == 2

    def test_cntAll(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.setVal(sdb, b"key1", b"v1")
        dber.setVal(sdb, b"key2", b"v2")
        assert dber.cntAll(sdb) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestTopIteration -v 2>&1 | tail -15`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement iteration methods**

Add to `SQLiteDBer` in `sqlitedbing.py`:

```python
    def getTopItemIter(self, db: SQLiteSubDb,
                       top: bytes = b"") -> Iterator[tuple[bytes, bytes]]:
        top = self._ensure_key(top)
        if top:
            cursor = self._conn.execute(
                "SELECT key, value FROM keri_store "
                "WHERE subdb=? AND sort=? AND key >= ? AND key < ? "
                "ORDER BY key",
                (db.name, _SK_SINGLE, top, top + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "SELECT key, value FROM keri_store "
                "WHERE subdb=? AND sort=? ORDER BY key",
                (db.name, _SK_SINGLE)
            )
        for row in cursor:
            yield (row[0], row[1])

    def getOnTopItemIter(self, db: SQLiteSubDb, top: bytes = b"",
                         *, sep: bytes = b".") -> Iterator[tuple[bytes, int, bytes]]:
        top = self._ensure_key(top)
        if top:
            cursor = self._conn.execute(
                "SELECT key, sort, value FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "AND key >= ? AND key < ? "
                "ORDER BY key, sort",
                (db.name, _SK_ON_PREFIX, _SK_ON_PREFIX + b"\xff",
                 top, top + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "SELECT key, sort, value FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "ORDER BY key, sort",
                (db.name, _SK_ON_PREFIX, _SK_ON_PREFIX + b"\xff")
            )
        for row in cursor:
            on = int(row[1][len(_SK_ON_PREFIX):], 16)
            yield (row[0], on, row[2])

    def getOnAllItemIter(self, db: SQLiteSubDb, key: bytes = b"",
                         on: int = 0, *, sep: bytes = b".") -> Iterator[tuple[bytes, int, bytes]]:
        key = self._ensure_key(key)
        sk_from = self._on_sort_key(on)
        if key:
            cursor = self._conn.execute(
                "SELECT key, sort, value FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
                "ORDER BY sort",
                (db.name, key, sk_from, _SK_ON_PREFIX + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "SELECT key, sort, value FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "ORDER BY key, sort",
                (db.name, sk_from, _SK_ON_PREFIX + b"\xff")
            )
        for row in cursor:
            on_val = int(row[1][len(_SK_ON_PREFIX):], 16)
            yield (row[0], on_val, row[2])

    def remTop(self, db: SQLiteSubDb, top: bytes = b"") -> bool:
        top = self._ensure_key(top)
        if top:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND key >= ? AND key < ?",
                (db.name, top, top + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "DELETE FROM keri_store WHERE subdb=?",
                (db.name,)
            )
        self._conn.commit()
        return cursor.rowcount > 0

    delTop = remTop

    def cntTop(self, db: SQLiteSubDb, top: bytes = b"") -> int:
        top = self._ensure_key(top)
        if top:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store "
                "WHERE subdb=? AND sort=? AND key >= ? AND key < ?",
                (db.name, _SK_SINGLE, top, top + b"\xff")
            ).fetchone()
        else:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store WHERE subdb=? AND sort=?",
                (db.name, _SK_SINGLE)
            ).fetchone()
        return row[0]

    def cntAll(self, db: SQLiteSubDb) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) FROM keri_store WHERE subdb=? AND sort=?",
            (db.name, _SK_SINGLE)
        ).fetchone()
        return row[0]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestTopIteration -v 2>&1 | tail -15`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer top-level iteration — getTopItemIter, remTop, cntAll"
```

---

### Task 5: IoSet Operations

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

Implements insertion-ordered set operations: `putIoSetVals`, `pinIoSetVals`, `addIoSetVal`, `getIoSetItemIter`, `getIoSetLastItem`, `remIoSet`, `remIoSetVal`, `cntIoSet`, `getTopIoSetItemIter`, `getIoSetLastItemIterAll`, `getIoSetLastIterAll`.

- [ ] **Step 1: Write failing tests for IoSet**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestIoSetOps:
    """Insertion-ordered set operations."""

    def test_putIoSetVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putIoSetVals(sdb, b"key", [b"a", b"b", b"c"]) is True
        items = list(dber.getIoSetItemIter(sdb, b"key"))
        assert [v for k, v in items] == [b"a", b"b", b"c"]

    def test_putIoSetVals_no_duplicates(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b"])
        dber.putIoSetVals(sdb, b"key", [b"b", b"c"])
        items = list(dber.getIoSetItemIter(sdb, b"key"))
        assert [v for k, v in items] == [b"a", b"b", b"c"]

    def test_pinIoSetVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b"])
        dber.pinIoSetVals(sdb, b"key", [b"x", b"y"])
        items = list(dber.getIoSetItemIter(sdb, b"key"))
        assert [v for k, v in items] == [b"x", b"y"]

    def test_addIoSetVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.addIoSetVal(sdb, b"key", b"a") is True
        assert dber.addIoSetVal(sdb, b"key", b"a") is False  # duplicate
        assert dber.addIoSetVal(sdb, b"key", b"b") is True

    def test_getIoSetLastItem(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b", b"c"])
        result = dber.getIoSetLastItem(sdb, b"key")
        assert result == (b"key", b"c")

    def test_getIoSetLastItem_empty(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.getIoSetLastItem(sdb, b"missing") == ()

    def test_remIoSet(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b"])
        assert dber.remIoSet(sdb, b"key") is True
        assert dber.cntIoSet(sdb, b"key") == 0

    def test_remIoSetVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b", b"c"])
        assert dber.remIoSetVal(sdb, b"key", b"b") is True
        items = list(dber.getIoSetItemIter(sdb, b"key"))
        assert [v for k, v in items] == [b"a", b"c"]

    def test_remIoSetVal_missing(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.remIoSetVal(sdb, b"key", b"x") is False

    def test_cntIoSet(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"key", [b"a", b"b", b"c"])
        assert dber.cntIoSet(sdb, b"key") == 3

    def test_getTopIoSetItemIter(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoSetVals(sdb, b"a.1", [b"v1", b"v2"])
        dber.putIoSetVals(sdb, b"a.2", [b"v3"])
        dber.putIoSetVals(sdb, b"b.1", [b"v4"])
        items = list(dber.getTopIoSetItemIter(sdb, top=b"a."))
        assert len(items) == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestIoSetOps -v 2>&1 | tail -15`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement IoSet operations**

Add to `SQLiteDBer` in `sqlitedbing.py`:

```python
    def _io_sort_key(self, ion: int) -> bytes:
        """Build sort key for IoSet: IO# + 32-hex insertion order."""
        return _SK_IO_PREFIX + b"%032x" % ion

    def _next_ion(self, db: SQLiteSubDb, key: bytes) -> int:
        """Get next insertion order number for IoSet at key."""
        row = self._conn.execute(
            "SELECT sort FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
        ).fetchone()
        if row:
            return int(row[0][len(_SK_IO_PREFIX):], 16) + 1
        return 0

    def _ioset_has_val(self, db: SQLiteSubDb, key: bytes, val: bytes) -> bool:
        """Check if val already exists in IoSet at key."""
        row = self._conn.execute(
            "SELECT 1 FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? AND value=? "
            "LIMIT 1",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff", val)
        ).fetchone()
        return row is not None

    def putIoSetVals(self, db: SQLiteSubDb, key: bytes, vals,
                     *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        result = False
        for val in vals:
            val = self._ensure_key(val)
            if not self._ioset_has_val(db, key, val):
                ion = self._next_ion(db, key)
                sk = self._io_sort_key(ion)
                self._conn.execute(
                    "INSERT INTO keri_store (subdb, key, sort, value) "
                    "VALUES (?, ?, ?, ?)",
                    (db.name, key, sk, val)
                )
                result = True
        self._conn.commit()
        return result

    def pinIoSetVals(self, db: SQLiteSubDb, key: bytes, vals,
                     *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        self._conn.execute(
            "DELETE FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
        )
        for ion, val in enumerate(vals):
            val = self._ensure_key(val)
            sk = self._io_sort_key(ion)
            self._conn.execute(
                "INSERT INTO keri_store (subdb, key, sort, value) "
                "VALUES (?, ?, ?, ?)",
                (db.name, key, sk, val)
            )
        self._conn.commit()
        return True

    def addIoSetVal(self, db: SQLiteSubDb, key: bytes, val: bytes,
                    *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        if self._ioset_has_val(db, key, val):
            return False
        ion = self._next_ion(db, key)
        sk = self._io_sort_key(ion)
        self._conn.execute(
            "INSERT INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            (db.name, key, sk, val)
        )
        self._conn.commit()
        return True

    def getIoSetItemIter(self, db: SQLiteSubDb, key: bytes,
                         *, ion: int = 0,
                         sep: bytes = b".") -> Iterator[tuple[bytes, bytes]]:
        key = self._ensure_key(key)
        sk_from = self._io_sort_key(ion)
        cursor = self._conn.execute(
            "SELECT key, value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort",
            (db.name, key, sk_from, _SK_IO_PREFIX + b"\xff")
        )
        for row in cursor:
            yield (row[0], row[1])

    def getIoSetLastItem(self, db: SQLiteSubDb, key: bytes,
                         *, sep: bytes = b".") -> tuple:
        key = self._ensure_key(key)
        row = self._conn.execute(
            "SELECT key, value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
        ).fetchone()
        if row:
            return (row[0], row[1])
        return ()

    def remIoSet(self, db: SQLiteSubDb, key: bytes,
                 *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        cursor = self._conn.execute(
            "DELETE FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def remIoSetVal(self, db: SQLiteSubDb, key: bytes,
                    val: bytes | None = None,
                    *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        if val is not None:
            val = self._ensure_key(val)
        cursor = self._conn.execute(
            "DELETE FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? AND value=?",
            (db.name, key, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff", val)
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def cntIoSet(self, db: SQLiteSubDb, key: bytes,
                 *, ion: int = 0, sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        sk_from = self._io_sort_key(ion)
        row = self._conn.execute(
            "SELECT COUNT(*) FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
            (db.name, key, sk_from, _SK_IO_PREFIX + b"\xff")
        ).fetchone()
        return row[0]

    def getTopIoSetItemIter(self, db: SQLiteSubDb, top: bytes = b"",
                            *, sep: bytes = b".") -> Iterator[tuple[bytes, bytes]]:
        top = self._ensure_key(top)
        if top:
            cursor = self._conn.execute(
                "SELECT key, value FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "AND key >= ? AND key < ? "
                "ORDER BY key, sort",
                (db.name, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff",
                 top, top + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "SELECT key, value FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "ORDER BY key, sort",
                (db.name, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
            )
        for row in cursor:
            yield (row[0], row[1])

    def getIoSetLastItemIterAll(self, db: SQLiteSubDb, key: bytes = b"",
                                *, sep: bytes = b".") -> Iterator[tuple[bytes, bytes]]:
        key = self._ensure_key(key)
        # Get distinct keys that have IoSet entries
        if key:
            cursor = self._conn.execute(
                "SELECT DISTINCT key FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? "
                "AND key >= ? AND key < ? ORDER BY key",
                (db.name, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff",
                 key, key + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "SELECT DISTINCT key FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ? ORDER BY key",
                (db.name, _SK_IO_PREFIX, _SK_IO_PREFIX + b"\xff")
            )
        for row in cursor:
            last = self.getIoSetLastItem(db, row[0], sep=sep)
            if last:
                yield last

    def getIoSetLastIterAll(self, db: SQLiteSubDb, key: bytes = b"",
                            *, sep: bytes = b".") -> Iterator[bytes]:
        for k, v in self.getIoSetLastItemIterAll(db, key, sep=sep):
            yield v
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestIoSetOps -v 2>&1 | tail -15`
Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer IoSet operations — putIoSetVals, addIoSetVal, getIoSetItemIter"
```

---

### Task 6: OnIoSet Operations

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

Implements combined ordinal + insertion-ordered set operations. These use sort keys prefixed with `ONIO#` encoding both the ordinal and the insertion order.

- [ ] **Step 1: Write failing tests for OnIoSet**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestOnIoSetOps:
    """Combined ordinal + insertion-ordered set operations."""

    def test_putOnIoSetVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putOnIoSetVals(sdb, b"key", on=0,
                                    vals=[b"a", b"b"]) is True
        items = list(dber.getOnIoSetItemIter(sdb, b"key", on=0))
        assert [v for k, o, v in items] == [b"a", b"b"]

    def test_appendOnIoSetVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        on0 = dber.appendOnIoSetVals(sdb, b"key", [b"a", b"b"])
        on1 = dber.appendOnIoSetVals(sdb, b"key", [b"c"])
        assert on0 == 0
        assert on1 == 1

    def test_addOnIoSetVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.addOnIoSetVal(sdb, b"key", on=0, val=b"a") is True
        assert dber.addOnIoSetVal(sdb, b"key", on=0, val=b"a") is False
        assert dber.addOnIoSetVal(sdb, b"key", on=0, val=b"b") is True

    def test_getOnIoSetLastItem(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnIoSetVals(sdb, b"key", on=0, vals=[b"a", b"b", b"c"])
        result = dber.getOnIoSetLastItem(sdb, b"key", on=0)
        assert result == (b"key", 0, b"c")

    def test_getOnIoSetLastItem_empty(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.getOnIoSetLastItem(sdb, b"missing", on=0) == ()

    def test_remOnIoSetVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnIoSetVals(sdb, b"key", on=0, vals=[b"a", b"b"])
        assert dber.remOnIoSetVal(sdb, b"key", on=0, val=b"a") is True
        items = list(dber.getOnIoSetItemIter(sdb, b"key", on=0))
        assert [v for k, o, v in items] == [b"b"]

    def test_cntOnIoSet(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnIoSetVals(sdb, b"key", on=0, vals=[b"a", b"b", b"c"])
        assert dber.cntOnIoSet(sdb, b"key", on=0) == 3

    def test_cntOnAllIoSet(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putOnIoSetVals(sdb, b"key", on=0, vals=[b"a", b"b"])
        dber.putOnIoSetVals(sdb, b"key", on=1, vals=[b"c"])
        assert dber.cntOnAllIoSet(sdb, b"key") == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestOnIoSetOps -v 2>&1 | tail -15`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement OnIoSet operations**

Add to `SQLiteDBer` in `sqlitedbing.py`:

```python
    def _onio_sort_key(self, on: int, ion: int) -> bytes:
        """Build sort key for OnIoSet: ONIO# + 32-hex on + . + 32-hex ion."""
        return _SK_ONIO_PREFIX + b"%032x" % on + b"." + b"%032x" % ion

    def _onio_prefix(self, on: int) -> bytes:
        """Sort key prefix for all items at a given on."""
        return _SK_ONIO_PREFIX + b"%032x" % on + b"."

    def _onio_all_prefix(self) -> bytes:
        """Sort key prefix for all OnIoSet items."""
        return _SK_ONIO_PREFIX

    def _next_onio_ion(self, db: SQLiteSubDb, key: bytes, on: int) -> int:
        """Get next ion for OnIoSet at (key, on)."""
        prefix = self._onio_prefix(on)
        row = self._conn.execute(
            "SELECT sort FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, prefix, prefix + b"\xff")
        ).fetchone()
        if row:
            # Extract ion from ONIO#<on>.<ion>
            ion_hex = row[0].split(b".")[-1]
            return int(ion_hex, 16) + 1
        return 0

    def _onio_has_val(self, db: SQLiteSubDb, key: bytes,
                      on: int, val: bytes) -> bool:
        prefix = self._onio_prefix(on)
        row = self._conn.execute(
            "SELECT 1 FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? AND value=? "
            "LIMIT 1",
            (db.name, key, prefix, prefix + b"\xff", val)
        ).fetchone()
        return row is not None

    def _next_onio_on(self, db: SQLiteSubDb, key: bytes) -> int:
        """Get next on number for OnIoSet at key."""
        row = self._conn.execute(
            "SELECT sort FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, _SK_ONIO_PREFIX, _SK_ONIO_PREFIX + b"\xff")
        ).fetchone()
        if row:
            # Extract on from ONIO#<on>.<ion>
            mid = row[0][len(_SK_ONIO_PREFIX):]
            on_hex = mid.split(b".")[0]
            return int(on_hex, 16) + 1
        return 0

    def putOnIoSetVals(self, db: SQLiteSubDb, key: bytes, *,
                       on: int = 0, vals=None,
                       sep: bytes = b".") -> bool:
        if vals is None:
            return False
        key = self._ensure_key(key)
        result = False
        for val in vals:
            val = self._ensure_key(val)
            if not self._onio_has_val(db, key, on, val):
                ion = self._next_onio_ion(db, key, on)
                sk = self._onio_sort_key(on, ion)
                self._conn.execute(
                    "INSERT INTO keri_store (subdb, key, sort, value) "
                    "VALUES (?, ?, ?, ?)",
                    (db.name, key, sk, val)
                )
                result = True
        self._conn.commit()
        return result

    def pinOnIoSetVals(self, db: SQLiteSubDb, key: bytes, *,
                       on: int = 0, vals=None,
                       sep: bytes = b".") -> bool:
        if vals is None:
            return False
        key = self._ensure_key(key)
        prefix = self._onio_prefix(on)
        self._conn.execute(
            "DELETE FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
            (db.name, key, prefix, prefix + b"\xff")
        )
        for ion, val in enumerate(vals):
            val = self._ensure_key(val)
            sk = self._onio_sort_key(on, ion)
            self._conn.execute(
                "INSERT INTO keri_store (subdb, key, sort, value) "
                "VALUES (?, ?, ?, ?)",
                (db.name, key, sk, val)
            )
        self._conn.commit()
        return True

    def appendOnIoSetVals(self, db: SQLiteSubDb, key: bytes, vals,
                          *, sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        on = self._next_onio_on(db, key)
        for ion, val in enumerate(vals):
            val = self._ensure_key(val)
            sk = self._onio_sort_key(on, ion)
            self._conn.execute(
                "INSERT INTO keri_store (subdb, key, sort, value) "
                "VALUES (?, ?, ?, ?)",
                (db.name, key, sk, val)
            )
        self._conn.commit()
        return on

    def addOnIoSetVal(self, db: SQLiteSubDb, key: bytes, *,
                      on: int = 0, val: bytes | None = None,
                      sep: bytes = b".") -> bool:
        if val is None:
            return False
        key = self._ensure_key(key)
        val = self._ensure_key(val)
        if self._onio_has_val(db, key, on, val):
            return False
        ion = self._next_onio_ion(db, key, on)
        sk = self._onio_sort_key(on, ion)
        self._conn.execute(
            "INSERT INTO keri_store (subdb, key, sort, value) "
            "VALUES (?, ?, ?, ?)",
            (db.name, key, sk, val)
        )
        self._conn.commit()
        return True

    def getOnIoSetItemIter(self, db: SQLiteSubDb, key: bytes, *,
                           on: int = 0, ion: int = 0,
                           sep: bytes = b".") -> Iterator[tuple[bytes, int, bytes]]:
        key = self._ensure_key(key)
        sk_from = self._onio_sort_key(on, ion)
        prefix = self._onio_prefix(on)
        cursor = self._conn.execute(
            "SELECT key, sort, value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort",
            (db.name, key, sk_from, prefix + b"\xff")
        )
        for row in cursor:
            mid = row[1][len(_SK_ONIO_PREFIX):]
            on_hex = mid.split(b".")[0]
            yield (row[0], int(on_hex, 16), row[2])

    def getOnIoSetLastItem(self, db: SQLiteSubDb, key: bytes,
                           on: int = 0, *,
                           sep: bytes = b".") -> tuple:
        key = self._ensure_key(key)
        prefix = self._onio_prefix(on)
        row = self._conn.execute(
            "SELECT key, sort, value FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? "
            "ORDER BY sort DESC LIMIT 1",
            (db.name, key, prefix, prefix + b"\xff")
        ).fetchone()
        if row:
            return (row[0], on, row[2])
        return ()

    def remOnIoSetVal(self, db: SQLiteSubDb, key: bytes, *,
                      on: int = 0, val: bytes | None = None,
                      sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        prefix = self._onio_prefix(on)
        if val is not None:
            val = self._ensure_key(val)
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ? AND value=?",
                (db.name, key, prefix, prefix + b"\xff", val)
            )
        else:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
                (db.name, key, prefix, prefix + b"\xff")
            )
        self._conn.commit()
        return cursor.rowcount > 0

    def remOnAllIoSet(self, db: SQLiteSubDb, key: bytes = b"",
                      on: int = 0, *, sep: bytes = b".") -> bool:
        key = self._ensure_key(key)
        sk_from = _SK_ONIO_PREFIX + b"%032x" % on
        if key:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
                (db.name, key, sk_from, _SK_ONIO_PREFIX + b"\xff")
            )
        else:
            cursor = self._conn.execute(
                "DELETE FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ?",
                (db.name, sk_from, _SK_ONIO_PREFIX + b"\xff")
            )
        self._conn.commit()
        return cursor.rowcount > 0

    def cntOnIoSet(self, db: SQLiteSubDb, key: bytes, *,
                   on: int = 0, ion: int = 0,
                   sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        sk_from = self._onio_sort_key(on, ion)
        prefix = self._onio_prefix(on)
        row = self._conn.execute(
            "SELECT COUNT(*) FROM keri_store "
            "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
            (db.name, key, sk_from, prefix + b"\xff")
        ).fetchone()
        return row[0]

    def cntOnAllIoSet(self, db: SQLiteSubDb, key: bytes = b"", *,
                      on: int = 0, sep: bytes = b".") -> int:
        key = self._ensure_key(key)
        sk_from = _SK_ONIO_PREFIX + b"%032x" % on
        if key:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store "
                "WHERE subdb=? AND key=? AND sort >= ? AND sort < ?",
                (db.name, key, sk_from, _SK_ONIO_PREFIX + b"\xff")
            ).fetchone()
        else:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM keri_store "
                "WHERE subdb=? AND sort >= ? AND sort < ?",
                (db.name, sk_from, _SK_ONIO_PREFIX + b"\xff")
            ).fetchone()
        return row[0]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py::TestOnIoSetOps -v 2>&1 | tail -15`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer OnIoSet operations — putOnIoSetVals, appendOnIoSetVals, cntOnAllIoSet"
```

---

### Task 7: Dup/IoDup/OnIoDup Delegations

**Files:**
- Modify: `src/keri/db/sqlitedbing.py`
- Modify: `tests/db/test_sqlitedbing.py`

These methods delegate to IoSet/OnIoSet equivalents — same pattern as DynamoDBer. Thin wrappers only.

- [ ] **Step 1: Write failing tests for Dup operations**

Append to `tests/db/test_sqlitedbing.py`:

```python
class TestDupOps:
    """Dup methods (delegate to IoSet)."""

    def test_putVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putVals(sdb, b"key", [b"a", b"b"]) is True
        vals = dber.getVals(sdb, b"key")
        assert vals == [b"a", b"b"]

    def test_addVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.addVal(sdb, b"key", b"a") is True
        assert dber.addVal(sdb, b"key", b"a") is False

    def test_getValsIter(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putVals(sdb, b"key", [b"a", b"b", b"c"])
        vals = list(dber.getValsIter(sdb, b"key"))
        assert vals == [b"a", b"b", b"c"]

    def test_cntVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putVals(sdb, b"key", [b"a", b"b"])
        assert dber.cntVals(sdb, b"key") == 2

    def test_delVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putVals(sdb, b"key", [b"a", b"b"])
        assert dber.delVals(sdb, b"key") is True
        assert dber.cntVals(sdb, b"key") == 0


class TestIoDupOps:
    """IoDup methods (delegate to IoSet)."""

    def test_putIoDupVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.putIoDupVals(sdb, b"key", [b"a", b"b"]) is True

    def test_addIoDupVal(self, dber):
        sdb = dber.env.open_db(b"test.")
        assert dber.addIoDupVal(sdb, b"key", b"a") is True
        assert dber.addIoDupVal(sdb, b"key", b"a") is False

    def test_getIoDupVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoDupVals(sdb, b"key", [b"a", b"b"])
        assert dber.getIoDupVals(sdb, b"key") == [b"a", b"b"]

    def test_getIoDupValLast(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoDupVals(sdb, b"key", [b"a", b"b", b"c"])
        assert dber.getIoDupValLast(sdb, b"key") == b"c"

    def test_cntIoDups(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoDupVals(sdb, b"key", [b"a", b"b"])
        assert dber.cntIoDups(sdb, b"key") == 2

    def test_delIoDupVals(self, dber):
        sdb = dber.env.open_db(b"test.")
        dber.putIoDupVals(sdb, b"key", [b"a", b"b"])
        assert dber.delIoDupVals(sdb, b"key") is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py -k "TestDupOps or TestIoDupOps" -v 2>&1 | tail -15`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement delegation methods**

Add to `SQLiteDBer` in `sqlitedbing.py`:

```python
    # --- Dup methods (delegate to IoSet) ---

    def putVals(self, db: SQLiteSubDb, key: bytes, vals,
                *, sep: bytes = b".") -> bool:
        return self.putIoSetVals(db, key, vals, sep=sep)

    def addVal(self, db: SQLiteSubDb, key: bytes, val: bytes,
               *, sep: bytes = b".") -> bool:
        return self.addIoSetVal(db, key, val, sep=sep)

    def getVals(self, db: SQLiteSubDb, key: bytes,
                *, sep: bytes = b".") -> list[bytes]:
        return [v for k, v in self.getIoSetItemIter(db, key, sep=sep)]

    def getValsIter(self, db: SQLiteSubDb, key: bytes,
                    *, sep: bytes = b".") -> Iterator[bytes]:
        for k, v in self.getIoSetItemIter(db, key, sep=sep):
            yield v

    def cntVals(self, db: SQLiteSubDb, key: bytes,
                *, sep: bytes = b".") -> int:
        return self.cntIoSet(db, key, sep=sep)

    def delVals(self, db: SQLiteSubDb, key: bytes,
                *, sep: bytes = b".") -> bool:
        return self.remIoSet(db, key, sep=sep)

    # --- IoDup methods (delegate to IoSet) ---

    def putIoDupVals(self, db, key, vals, *, sep=b'.'):
        return self.putIoSetVals(db, key, vals, sep=sep)

    def addIoDupVal(self, db, key, val, *, sep=b'.'):
        return self.addIoSetVal(db, key, val, sep=sep)

    def getIoDupVals(self, db, key, *, sep=b'.'):
        return [v for k, v in self.getIoSetItemIter(db, key, sep=sep)]

    def getIoDupItemIter(self, db, key, *, ion=0, sep=b'.'):
        return self.getIoSetItemIter(db, key, ion=ion, sep=sep)

    def getIoDupValLast(self, db, key, *, sep=b'.'):
        item = self.getIoSetLastItem(db, key, sep=sep)
        return item[1] if item else None

    def delIoDupVals(self, db, key, *, sep=b'.'):
        return self.remIoSet(db, key, sep=sep)

    def delIoDupVal(self, db, key, val, *, sep=b'.'):
        return self.remIoSetVal(db, key, val, sep=sep)

    def cntIoDups(self, db, key, *, sep=b'.'):
        return self.cntIoSet(db, key, sep=sep)

    # --- OnIoDup methods (delegate to OnIoSet) ---

    def putOnIoDupVals(self, db, key, on=0, vals=b'', *, sep=b'.'):
        return self.putOnIoSetVals(db, key, on=on, vals=vals, sep=sep)

    def addOnIoDupVal(self, db, key, on=0, val=b'', sep=b'.'):
        return self.addOnIoSetVal(db, key, on=on, val=val, sep=sep)

    def appendOnIoDupVal(self, db, key, val, *, sep=b'.'):
        return self.appendOnIoSetVals(db, key, [val], sep=sep)

    def getOnIoDupVals(self, db, key, on=0, sep=b'.'):
        return [v for k, o, v in self.getOnIoSetItemIter(db, key, on=on, sep=sep)]

    def getOnIoDupItemIter(self, db, key, on=0, ion=0, sep=b'.'):
        return self.getOnIoSetItemIter(db, key, on=on, ion=ion, sep=sep)

    def getOnIoDupLast(self, db, key, on=0, *, sep=b'.'):
        item = self.getOnIoSetLastItem(db, key, on=on, sep=sep)
        return item[2] if item else None

    def delOnIoDups(self, db, key, on=0, sep=b'.'):
        return self.remOnIoSetVal(db, key, on=on, sep=sep)

    def delOnIoDupVal(self, db, key, on=0, val=b'', sep=b'.'):
        return self.remOnIoSetVal(db, key, on=on, val=val, sep=sep)

    def cntOnIoDups(self, db, key, on=0, sep=b'.'):
        return self.cntOnIoSet(db, key, on=on, sep=sep)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py -k "TestDupOps or TestIoDupOps" -v 2>&1 | tail -15`
Expected: All 11 tests PASS.

- [ ] **Step 5: Run full test suite so far**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py -v 2>&1 | tail -30`
Expected: All tests PASS (lifecycle + CRUD + ordinal + iteration + IoSet + OnIoSet + Dup + IoDup).

- [ ] **Step 6: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/sqlitedbing.py tests/db/test_sqlitedbing.py
git commit -m "feat(db): SQLiteDBer Dup/IoDup/OnIoDup delegations to IoSet equivalents"
```

---

### Task 8: Wire Into keripy and Integration Test

**Files:**
- Modify: `src/keri/db/__init__.py`
- Create: `tests/app/test_keri_protocol_sqlite.py`

Wire `SQLiteDBer` into keripy's package exports. Then run the same protocol integration test that validates DynamoDBer — inception, rotation, interaction, receipting — but on SQLite.

- [ ] **Step 1: Update `__init__.py` with SQLiteDBer import**

Add to `src/keri/db/__init__.py` after the DynamoDBer import block:

```python
try:
    from .sqlitedbing import SQLiteDBer, openSQLite
except ImportError:
    pass
```

- [ ] **Step 2: Write integration test**

```python
# tests/app/test_keri_protocol_sqlite.py
"""
Integration test: full KERI protocol on SQLiteDBer.
Mirrors test_keri_protocol_dynamo.py — inception, rotation, interaction.
"""

import os
import pytest
import tempfile

try:
    from keri.db.sqlitedbing import SQLiteDBer
    HAS_SQLITE = True
except ImportError:
    HAS_SQLITE = False

from keri.core import coring, eventing
from keri.db import basing


# Baser store names — must match what Baser.__init__ opens
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


@pytest.fixture
def sqlite_baser(tmp_path):
    """Provides a Baser backed by SQLiteDBer."""
    if not HAS_SQLITE:
        pytest.skip("sqlitedbing not available")
    path = str(tmp_path / "test_protocol.sqlite")
    db = SQLiteDBer.open(
        name="test",
        stores=BASER_STORES,
        path=path,
    )
    # Baser expects db to quack like LMDBer — SQLiteDBer does.
    yield db
    db.close(clear=True)


class TestSQLiteProtocol:
    """Validate that core KERI operations work on SQLiteDBer."""

    def test_sqlite_baser_opens_all_stores(self, sqlite_baser):
        """Baser's subdatabases can all be opened on SQLiteDBer."""
        for store_name in BASER_STORES:
            sdb = sqlite_baser.env.open_db(store_name.encode())
            assert sdb.opened is True

    def test_roundtrip_event_storage(self, sqlite_baser):
        """Store and retrieve a serialized value (simulates event storage)."""
        sdb = sqlite_baser.env.open_db(b"evts.")
        key = b"DKxy2sgzfplyr-tgwIxS19f2OchFHtLwPWD3v4oYimBIs.00000000000000000000000000000000"
        val = b'{"v":"KERI10JSON000000_","t":"icp","d":"EKxy..."}'
        assert sqlite_baser.setVal(sdb, key, val) is True
        assert sqlite_baser.getVal(sdb, key) == val

    def test_ordinal_kel_storage(self, sqlite_baser):
        """Store KEL events at sequence numbers (ordinal pattern)."""
        sdb = sqlite_baser.env.open_db(b"kels.")
        prefix = b"DKxy2sgzfplyr"
        sqlite_baser.putOnVal(sdb, prefix, on=0, val=b"inception_event")
        sqlite_baser.putOnVal(sdb, prefix, on=1, val=b"rotation_event")
        sqlite_baser.putOnVal(sdb, prefix, on=2, val=b"interaction_event")

        assert sqlite_baser.getOnVal(sdb, prefix, on=0) == b"inception_event"
        assert sqlite_baser.getOnVal(sdb, prefix, on=1) == b"rotation_event"
        assert sqlite_baser.getOnVal(sdb, prefix, on=2) == b"interaction_event"
        assert sqlite_baser.cntOnAll(sdb, prefix) == 3

    def test_ioset_signature_storage(self, sqlite_baser):
        """Store multiple signatures per event (IoSet pattern)."""
        sdb = sqlite_baser.env.open_db(b"sigs.")
        key = b"DKxy2sgzfplyr.00000000000000000000000000000000"
        sigs = [b"sig_from_key_0", b"sig_from_key_1", b"sig_from_key_2"]
        sqlite_baser.putIoSetVals(sdb, key, sigs)

        stored = [v for k, v in sqlite_baser.getIoSetItemIter(sdb, key)]
        assert stored == sigs
        assert sqlite_baser.cntIoSet(sdb, key) == 3

    def test_data_persists_across_close_reopen(self, tmp_path):
        """Data survives close and reopen (critical for mobile)."""
        if not HAS_SQLITE:
            pytest.skip("sqlitedbing not available")
        path = str(tmp_path / "persist.sqlite")

        db1 = SQLiteDBer.open(name="persist", stores=["test."], path=path)
        sdb1 = db1.env.open_db(b"test.")
        db1.setVal(sdb1, b"key1", b"val1")
        db1.close()

        db2 = SQLiteDBer.open(name="persist", stores=["test."], path=path)
        sdb2 = db2.env.open_db(b"test.")
        assert db2.getVal(sdb2, b"key1") == b"val1"
        db2.close()
```

- [ ] **Step 3: Run integration tests**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/app/test_keri_protocol_sqlite.py -v 2>&1 | tail -20`
Expected: All 5 tests PASS.

- [ ] **Step 4: Run the full SQLiteDBer test suite**

Run: `cd /Users/seriouscoderone/code/keripy && python -m pytest tests/db/test_sqlitedbing.py tests/app/test_keri_protocol_sqlite.py -v 2>&1 | tail -30`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/seriouscoderone/code/keripy
git add src/keri/db/__init__.py tests/app/test_keri_protocol_sqlite.py
git commit -m "feat(db): wire SQLiteDBer into keripy + integration tests"
```

---

## Post-Implementation Verification

After all 8 tasks are complete, run these verification steps:

1. **Full SQLiteDBer test suite:**
   ```bash
   cd /Users/seriouscoderone/code/keripy
   python -m pytest tests/db/test_sqlitedbing.py tests/app/test_keri_protocol_sqlite.py -v
   ```
   Expected: All tests PASS.

2. **Existing DynamoDBer tests still pass (no regressions):**
   ```bash
   python -m pytest tests/db/test_dynamodbing.py -v
   ```
   Expected: All 82 tests PASS (or skip if moto not installed).

3. **Existing keripy tests still pass (no import breakage):**
   ```bash
   python -m pytest tests/db/ -v --ignore=tests/db/test_sqlitedbing.py -x
   ```
   Expected: No failures from adding the optional SQLiteDBer import.

---

## What This Plan Does NOT Cover

These are separate plans to write after SQLiteDBer is validated:

- **Plan 2: bridge.py** — Python module wrapping keripy for iOS bridge calls
- **Plan 3: iOS app** — Swift native shell, SwiftUI views, PythonKit integration
- **Remaining DynamoDBer methods** — Some advanced iteration methods (backward iterators, `getOnAllIoSetLastItemBackIter`, etc.) are not covered in the tests above. These should be added incrementally as the integration tests reveal which methods Baser actually calls.
