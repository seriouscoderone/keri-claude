# Bug: 90 false positive warnings from three linter rule categories

## Summary

After resolving all real issues in a 48-domain spec, `validate_spec.py` still produces 90 warnings — all false positives from three rule categories with overly broad pattern matching. These fall into three independent fixes.

## False Positive Category 1: Verification (75 warnings)

### Problem 1a: "MUST" flagged as vague language (estimated ~45 of 75)

The vague-language regex flags any property containing certain words, but doesn't distinguish vague qualifiers from strong prescriptive assertions.

**Flagged (false positive — this IS strong):**
```
"Both thresholds MUST be independently satisfied for a valid rotation"
"MUST be rejected as stale"
"Empty key list MUST be rejected for any threshold value"
"A judge MUST produce exactly one of three decisions"
```

**Actually vague (should be flagged):**
```
"Events are properly handled"
"Credentials are correctly processed"
```

**Fix:** Only flag "MUST" when combined with vague qualifiers: "MUST be properly", "MUST be correctly", "MUST be valid" (without adjacent constraint). Don't flag "MUST be rejected", "MUST satisfy", "MUST produce", "MUST equal", "MUST include" — these are action verbs with clear meaning.

Suggested regex refinement:
```python
# Current: flags any property with "MUST" + certain words
# Proposed: only flag MUST + vague qualifiers
VAGUE_PATTERNS = [
    r'\bproperly\b', r'\bcorrectly\b', r'\bhandled\b(?! by)',
    r'\bprocessed\b(?! through| by| in)',
    r'\bvalid\b(?! AID| SAID| signature| prefix| rotation| delegation)'
]
```

### Problem 1b: `@given` flagged as "tests attributes" (estimated ~30 of 75)

The linter flags any verification expression containing `@given`, `hasattr`, `isinstance`, or `assert` as "testing attributes instead of behaviors." But `@given` is the Hypothesis property-based testing decorator — it IS behavioral testing.

**Flagged (false positive — this IS behavioral):**
```python
@given(kel=kel_with_traits_strategy())
def test_traits_cumulative_irreversible(kel):
    # Tests that once a trait is set, no subsequent event removes it
    for event in kel.events:
        assert set(event.config) >= set(kel.events[0].config)
```

**Actually attribute-testing (should be flagged):**
```python
assert not hasattr(agent, 'private_key')
assert isinstance(result, AgentConfig)
```

**Fix:** Don't flag `@given` — it indicates property-based testing. Only flag `hasattr`, `isinstance`, `type(` when they appear WITHOUT `@given` context. Also respect the `language:` field — if `language: pseudocode`, don't apply Python-specific rules.

Suggested check:
```python
def is_attribute_test(expression):
    # @given tests are behavioral — skip
    if '@given' in expression:
        return False
    # These patterns test attributes, not behavior
    return any(p in expression for p in ['hasattr(', 'isinstance(', 'type(', '.__class__'])
```

## False Positive Category 2: Relationships (9 warnings)

### Problem: `pattern:` field not read by `check_mirror_consistency()`

All 9 warnings are for adjacent relationships with `pattern: "Conformist"`, `"Customer-Supplier"`, or `"Published Language"` — all intentionally one-directional. The `pattern:` field exists on every adjacent entry but the linter doesn't read it.

**Example warning:**
```
cloud-agent-service: lists 'discovery' as adjacent, but 'discovery' does not list
'cloud-agent-service' in adjacents or domain_clients
```

**The adjacent entry:**
```yaml
adjacents:
  - ref: "domain://discovery"
    relationship: "Customer-Supplier — uses discovery for OOBI resolution"
    pattern: "Customer-Supplier"   # ← linter should read this
```

**Fix:** In `check_mirror_consistency()`, read `pattern:` and skip bidirectional checks for one-way patterns:

```python
for adj in spec.data.get("adjacents", []):
    if not isinstance(adj, dict):
        continue
    pattern = adj.get("pattern", "").lower()
    # One-way patterns — bidirectional check not required
    if pattern in ("conformist", "customer-supplier",
                   "published language", "anticorruption layer"):
        continue
    # Partnership or unspecified — require bidirectional
    ref = strip_prefix(adj.get("ref", ""))
    if ref in specs:
        other = specs[ref]
        if sid not in other.adjacents and sid not in other.clients:
            result.warn(...)
```

Also skip bidirectional checks for `domain_clients` entries — upstream domains serve clients without needing to enumerate them.

## False Positive Category 3: Vocabulary (6 warnings)

### Problem: Regex matches `.xxx` inside bracket conventions and standard identifiers

The vocabulary check flags any `.xxx` pattern (3-5 char dotted identifier) as a potential LMDB subdatabase name. But it doesn't exclude:

1. **Wrapped references**: `[.ooes in keripy]` — the bracket convention we established for implementation vocabulary
2. **RFC standard paths**: `.well-known` (RFC 8615 Well-Known URI)
3. **Method calls**: `.get()`, `.groups()` — standard API method names

**Flagged (false positive):**
```
discovery: term 'Well-Known OOBI' definition contains implementation identifiers: .well
local-agent: term 'Local Database' invariant contains implementation identifiers: .evts, .kels
signify-client/resources: term 'Operation' invariant contains implementation identifiers: .get
```

**Fix:** Three refinements to the vocabulary regex:

```python
def is_implementation_vocab(text, match):
    # 1. Skip matches inside [.xxx in keripy] brackets
    bracket_pattern = r'\[' + re.escape(match) + r'\s+in\s+\w+\]'
    if re.search(bracket_pattern, text):
        return False

    # 2. Skip RFC standard paths
    RFC_PATHS = {'.well-known', '.well'}
    if match in RFC_PATHS:
        return False

    # 3. Skip common method call patterns
    METHOD_PATTERNS = {'.get', '.set', '.put', '.delete', '.post',
                       '.list', '.find', '.groups', '.items', '.keys', '.values'}
    if match in METHOD_PATTERNS:
        return False

    return True
```

## Impact

| Category | Current Warnings | After Fix | Remaining |
|---|---|---|---|
| verification | 75 | ~5 | Genuine vague language (few remaining) |
| relationships | 9 | 0 | All have `pattern:` field |
| vocabulary | 6 | 0 | All are bracket-wrapped, RFC, or methods |
| **Total** | **90** | **~5** | |

## Acceptance Criteria

- [ ] Vague-language regex refined: "MUST be rejected" not flagged, "properly handled" still flagged
- [ ] `@given` expressions not flagged as attribute tests
- [ ] `hasattr`/`isinstance` without `@given` context still flagged
- [ ] `language: pseudocode` expressions exempt from Python-specific rules
- [ ] `check_mirror_consistency()` reads `pattern:` field, skips one-way patterns
- [ ] `domain_clients` entries skip bidirectional checks
- [ ] Vocabulary regex excludes `[.xxx in impl]` bracket convention
- [ ] Vocabulary regex excludes RFC standard paths (`.well-known`)
- [ ] Vocabulary regex excludes common method names (`.get`, `.groups`)
- [ ] Configurable allowlist for project-specific vocabulary exceptions
- [ ] KERI 48-domain spec produces <= 5 warnings after all fixes
