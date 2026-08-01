# Doc corpus refresh — design

**Date:** 2026-08-01
**Status:** approved
**Touches:** `scripts/download-whitepapers.sh`, `scripts/manifest.sha256` (new)

## Problem

`scripts/download-whitepapers.sh` skips any source already present in
`scripts/staging/`:

```bash
if [ -f "$STAGING_DIR/$name" ]; then
  echo "Already exists: $name"
```

That guard is deliberate — `scripts/staging/` is baked into the CDK asset bundle
at synth time (~113MB), so stable bytes mean stable deploys. But it also means
re-running the script never picks up upstream changes, and nothing records which
version of the corpus you have. Both `staging/` and `markdown/` are gitignored.

The corpus had silently ossified. Staging was dated 2026-02-16 while upstream
`docs/index.html` had moved on for all three specs — keri 2026-03-06, cesr
2026-03-18, acdc 2026-07-14. Since this corpus is the source for the Bedrock
Knowledge Base, `ask_keri_chat` was answering from February specs.

## Goals

1. Re-fetch upstream on demand, without losing the stable-by-default behaviour.
2. Make it obvious which files actually changed, during the run and afterwards.
3. Answer "is my corpus stale?" without mutating anything.

## Design

### Source registry

The ~40 sources are currently inline `download` / `download_url` calls. They move
into a single `SOURCES` array of `group|name|url` records, so scope selection,
freshness checking, and reporting all share one list. Four groups:

| Group | Contents |
|---|---|
| `specs` | 3 kswg Spec-Up-T HTML renders + the IETF draft |
| `papers` | `SmithSamuelM/Papers` whitepapers and presentations |
| `docs` | keridoc, WOT-terms, vLEI, signifypy LLM exports |
| `images` | `whitepapers/{assets,graphics}` — listed via `gh api` |

### Modes

```
./download-whitepapers.sh                    fetch only what is missing (unchanged default)
./download-whitepapers.sh --check [target]   report staleness, change nothing
./download-whitepapers.sh --refresh [target] re-fetch and replace
```

`target` is a group name, a filename glob (`'acdc-*'`), or omitted for
everything. `--check` and `--refresh` share one scope predicate.

`--refresh` with no target covers `specs`, `papers`, and `docs` but **not**
`images`: refreshing 100+ static assets requires an authenticated `gh` and they
never change. `--refresh images` does it explicitly.

### Fetch is replace-on-success, never delete-then-download

Refresh downloads to `$dest.download.$$` and `mv`s over the target only after
curl exits 0. A network failure mid-refresh therefore leaves the previous good
copy in place rather than a truncated file or a hole. `--check` uses the same
path and discards the temp file instead of moving it.

This is why there is no `rm` step: overwrite-on-success subsumes it and is safer.

### Per-file hash reporting

Each source is hashed before and after. The run prints one line per file —
`NEW`, `CHANGED`, `unchanged`, `cached` (skipped, present), `STALE` (check mode),
or `WARN` (fetch failed, cached copy kept) — then a summary. Check mode ends with
the exact refresh command for whatever it found stale.

### Tracked manifest

`scripts/manifest.sha256` is rewritten on every non-check run: one
`sha256  name` line per file for `staging/` and `markdown/`, sorted by name.
It is **tracked in git**, so `git diff scripts/manifest.sha256` after a refresh
is precisely the list of what changed.

Per-file `.sha256` sidecars were rejected. `scripts/staging/` is uploaded to the
KB document bucket with only `.DS_Store`, `distill-*`, `*.py` excluded and
`prune: false` (`infrastructure/lib/stacks/keri-chat-stack.ts:301-305`), so ~80
sidecars would be ingested as junk documents and would persist in S3 after being
deleted locally. The manifest lives outside `staging/` for that reason.

`images/` gets one rolled-up line (count + combined hash) rather than 100+ lines,
to keep the diff readable.

### Conversion is now incremental

The convert phase currently re-runs on all ~40 files every time, including ~20
pymupdf4llm PDF conversions. Since refresh only touches mtime when content
actually changed, conversion can guard on `[ "$src" -nt "$out" ] || [ ! -f "$out" ]`.
The in-place minimize pass makes the output newer than the source, so an
unchanged source stays skipped on later runs.

`--check` skips convert and minimize entirely.

## Out of scope

- ETag/Last-Modified caching to make `--check` cheap. `--check specs` is already
  cheap; a full `--check` downloads to temp to compare, which is the honest cost.
- Triggering KB re-ingestion after a refresh. The daily EventBridge rule and
  `scripts/sync-docs.sh` already cover that.
- Backfilling the five 1-byte orphan files in `markdown/` (`AsyncComputation.md`
  et al.) that predate the current script — no source downloads them.

## Addendum — what the implementation uncovered

The design assumed one staleness layer. There are three, and `--refresh` only
addresses the first. Both extra layers were live.

**Forks are load-bearing.** The four LLM exports are generated by CI on forks
because the upstream PRs adding that generation were never merged — `keridoc`
#29, `WOT-terms` #291/#290 and `vLEI` #95 have been open since 2026-02-16, and
`signifypy` #120 was closed unmerged. Upstream serves none of the artifacts
(all four URLs 404). A fork behind its parent therefore serves stale content
indefinitely while `--check` reports "ok". Three forks were behind by 23, 24 and
9 commits.

**Rendered specs lag their own source.** Fetching `docs/index.html` gets a
committed artifact, not a build. `build-specs.sh` renders locally instead, and
`--check-upstream` reports both extra layers. Six forks total were behind
upstream, including the three kswg spec forks (20/29/40 commits).

Two hazards worth remembering:

- A bare `npm run render` resolves no external cross-references. The keri spec
  silently drops from 115 xrefs to 7 and shrinks by 75KB. Always use
  `collectExternalReferences`.
- Syncing a fork can break its own CI. signifypy's docs workflow installed from
  a root `requirements.txt` that upstream had deleted in favour of
  `pyproject.toml`, and its `GITHUB_TOKEN` lacked `contents: write` to commit
  the rebuild. Both needed fixing before the artifact regenerated.

Net corpus change: keri +6,918 bytes, cesr +596, acdc +13,238, and
signifypy-docs +110,585 (a ~9x increase — its committed artifact had been stale
*and* its rebuild workflow broken). vLEI and WOT-terms were verified unchanged
rather than assumed: their upstream commits touched code, samples and
`logs/brokenLinks.md`, not documentation content.

## Verification

- `--check specs` reports the three known-stale specs and exits without writing.
- `--refresh specs` replaces them; `git diff scripts/manifest.sha256` shows
  exactly six changed lines (three HTML in staging, three MD in markdown).
- A default run after that reports everything `cached` and converts nothing.
- Simulated curl failure keeps the prior file and reports `WARN`.
- Baseline at `scripts/baseline/2026-08-01/` supports before/after diffing.
