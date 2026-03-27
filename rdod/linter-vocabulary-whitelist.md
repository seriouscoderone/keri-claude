# Feature Request: Per-repo vocabulary whitelist for implementation identifier warnings

## Summary

Allow each repo to define a whitelist of `.identifier` patterns that the vocabulary checker should ignore. This eliminates false positive warnings for spec-defined field names and domain verbs without suppressing the rule entirely.

## Problem

The `[vocabulary]` rule flags any `.something` pattern in UL terms as a potential implementation identifier. This catches real leakage (e.g., `.evts`, `.kels` from keripy) but also fires on:

- CESR spec-defined fields: `.code`, `.raw`, `.sn`, `.count`, `.index`
- Domain verbs: `.rotate`, `.sign`, `.update`, `.apply`
- File references: `.yaml`

After cleaning all actual implementation references, 12 of 14 remaining warnings are false positives from spec-level field names. These will never change and should not require manual re-evaluation every linter run.

## Proposed Solution

A per-repo whitelist file (e.g., `rdod/.vocabulary-whitelist`) that the linter reads at startup. Any `.identifier` pattern listed in the file is excluded from vocabulary warnings.

### File format

Plain text, one pattern per line. Comments with `#`. Blank lines ignored.

```
# rdod/.vocabulary-whitelist
# CESR spec-defined primitive fields
.code
.raw
.sn
.count
.index

# Domain verbs (not implementation method names)
.rotate
.sign
.update
.apply

# File extensions in source_material references
.yaml
```

### Linter behavior

1. At startup, look for `.vocabulary-whitelist` in the spec root directory (sibling to `domains/`)
2. If found, load patterns into a set
3. When the vocabulary checker finds a `.something` match, skip it if the pattern is in the whitelist
4. If no whitelist file exists, behavior is unchanged (all patterns flagged)

### CLI override

Optional `--vocabulary-whitelist <path>` flag to specify an alternate whitelist file location.

## Why per-repo, not global

Different specs have different legitimate vocabularies:
- A KERI spec needs `.code`, `.raw`, `.sn` whitelisted (CESR fields)
- A video editing spec might need `.fps`, `.codec`, `.bitrate` whitelisted
- A database spec might need `.index`, `.key`, `.value` whitelisted

The whitelist is part of the spec, not part of the tool.

## Acceptance Criteria

- [ ] Linter reads `rdod/.vocabulary-whitelist` (or `{spec_root}/.vocabulary-whitelist`) if present
- [ ] Whitelisted patterns are excluded from `[vocabulary]` warnings
- [ ] File format: one pattern per line, `#` comments, blank lines ignored
- [ ] Optional `--vocabulary-whitelist <path>` CLI flag
- [ ] Missing whitelist file = no suppression (backwards compatible)
