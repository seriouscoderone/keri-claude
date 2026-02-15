# Compression Formats — Library Distillation

8 formats for compressing extracted library data into compact reference material. Formats 1-6 are shared with spec-distill; formats 7-8 are library-specific.

---

## Format 1: Decision Trees

**Use for:** validation logic, conditional processing, branching behavior.

```
IF <condition>
  → <action/result>
ELIF <condition>
  → <action/result>
ELSE
  → <default/error>
```

**Before (30 lines of source):**
```python
def resolve(self, identifier):
    if identifier.startswith("did:keri:"):
        prefix = identifier[9:]
        if prefix in self._cache:
            return self._cache[prefix]
        result = self._resolver.resolve(prefix)
        if result is None:
            raise ResolutionError(f"Unknown prefix: {prefix}")
        self._cache[prefix] = result
        return result
    elif identifier.startswith("oobi:"):
        ...
```

**After (5 lines):**
```
resolve(identifier):
  IF starts with "did:keri:" → strip prefix, check cache, then resolver; raise ResolutionError if not found
  ELIF starts with "oobi:" → OOBI resolution path
  ELSE → raise ValueError("unsupported scheme")
```

---

## Format 2: Field Tables

**Use for:** constructor params, config options, message fields, struct members.

| Field | Type | Required | Default | Constraint |
|-------|------|----------|---------|------------|
| `name` | `Type` | Y/N | `value` | description |

Keep one row per field. Omit columns that are all empty.

---

## Format 3: Checklists

**Use for:** setup sequences, initialization order, migration steps.

```
Setup <Component>:
1. [ ] Create X with params (a, b)
2. [ ] Call .connect() — blocks until ready
3. [ ] Register handlers via .on(event, callback)
4. [ ] Call .start() — must be after step 3
```

Number items. Note ordering constraints inline.

---

## Format 4: Code Templates

**Use for:** data structure layouts, message formats, common boilerplate.

```
<ClassName>(
  <field>: <Type>        # <constraint or note>
  <field>: <Type> = <default>
)
```

Keep to structural skeleton — no method bodies, no docstrings.

---

## Format 5: Anti-Pattern Lists

**Use for:** common mistakes, security pitfalls, performance traps.

```
DON'T: <wrong approach>
DO:    <correct approach>
WHY:   <one-line reason>
```

---

## Format 6: State Transition Notation

**Use for:** object lifecycle, connection states, protocol phases.

```
[Created] --init()--> [Ready] --connect()--> [Connected]
[Connected] --error--> [Disconnected] --reconnect()--> [Connected]
[Connected] --close()--> [Closed] (terminal)
```

Mark terminal states. Note guards on transitions.

---

## Format 7: Compact Signature Tables (NEW)

**Use for:** API reference — public methods organized by class.

```
### ClassName

Constructor: (param1: Type, param2: Type = default) -> ClassName
  .method1(arg: Type) -> ReturnType          # brief note
  .method2(arg: Type) raises ErrorType        # brief note
  .property: Type (readonly)                  # brief note

Inherits: ParentClass
See also: RelatedClass
```

**Rules:**
- One line per method, indented under class name.
- Params use `: Type` notation regardless of source language.
- Note `raises`/`throws` on the same line.
- Mark `readonly`, `async`, `static`, `classmethod` inline.
- Group overloads on one line with `|`: `.parse(str) | .parse(bytes) -> Result`.

**Before (40 lines of source):**
```python
class Diger:
    def __init__(self, raw=None, code=None, qb64=None, qb64b=None, qb2=None, ser=None):
        """Create digest instance from raw bytes, code, or qualified form."""
        ...

    @property
    def raw(self):
        """Raw bytes of digest."""
        return self._raw

    def verify(self, ser):
        """Verify digest against serialization."""
        ...

    def compare(self, other, ser=None):
        """Compare with another Diger or verify against ser."""
        ...
```

**After (6 lines):**
```
### Diger
Constructor: (raw=None, code=None, qb64=None, qb64b=None, qb2=None, ser=None)
  .raw: bytes (readonly)                     # raw digest bytes
  .verify(ser: bytes) -> bool                # verify digest against serialization
  .compare(other: Diger, ser=None) -> bool   # compare with another Diger
Inherits: Matter
```

---

## Format 8: Import Maps (NEW)

**Use for:** showing how to access library functionality, module organization.

```
<library-name>
├── <module>
│   ├── ClassName        — one-line purpose
│   ├── function_name    — one-line purpose
│   └── CONSTANT         — value or purpose
├── <module>
│   └── ...
```

**Rules:**
- Tree structure mirrors actual import paths.
- Only public/exported items.
- One-line description after dash.
- For Python: show `from <package>.<module> import <name>`.
- For TypeScript: show `import { name } from '<package>/<module>'`.
- For Rust: show `use <crate>::<module>::<name>`.

**Example:**
```
keri.core
├── coring
│   ├── Matter           — base class for all CESR primitives
│   ├── Verfer           — public key verification
│   ├── Diger            — digest/hash
│   ├── Siger            — indexed signature
│   └── Cigar            — unindexed signature
├── eventing
│   ├── incept()         — create inception event
│   ├── rotate()         — create rotation event
│   └── interact()       — create interaction event
```

---

## Compression Heuristics

- **Target ratio:** ~1 line of output per 5-10 lines of source code.
- **Always drop:** obvious docstrings, inline comments, private methods, import statements, blank lines, type stubs, trivial getters/setters, test code.
- **Always keep:** every public class + constructor, every exported function signature, every enum variant, every error type, every config default, lifecycle methods.
- **Size target:** 5-15KB per reference file. Split if exceeded.
- **Verify coverage:** count public API items in output vs Phase 1 survey. Target ≥80%.
