---
name: spec-ul-coverage
description: Use when validating how well RDOD Ubiquitous Language covers a protocol specification, discovering UL gaps at progressive zoom levels, or stress-testing domain vocabulary against normative spec text. Activates for UL gap analysis, spec-UL mapping, coverage scoring, or vocabulary stress testing.
command: /keri:spec-ul-coverage
user_invocable: true
---

# Spec-UL Coverage Analysis

Stress-tests an RDOD Ubiquitous Language by attempting to describe a protocol specification at progressive zoom levels using only UL terms. Wherever the language breaks down — awkward, missing, or overly complex — the UL needs work.

**Input:** `<spec-markdown-path> [<rdod-domains-path>]`
- Spec markdown: e.g., `scripts/markdown/keri-specification.md`
- RDOD domains: defaults to `rdod/spec/domains/`

**Output:** Coverage artifacts in `rdod/spec/coverage/<spec-name>/` + a findings file with proposed UL changes.

## Relationship to Hardening

This is a **sibling** to the [hardening methodology](../../rdod/spec/hardening-methodology.md). Both surface spec gaps through different lenses:

| Hardening | UL Coverage |
|-----------|-------------|
| Forces **implementation planning** | Forces **natural-language description** |
| Surfaces missing types, invariants, ports | Surfaces missing vocabulary, naming problems, abstraction gaps |
| Asks: "Can I build this?" | Asks: "Can I say this?" |
| Bottom-up (layer by layer) | Top-down (zoom out → zoom in) |

Use UL coverage first (get the vocabulary right), then hardening (get the implementation details right). Or interleave: coverage at Z1-Z2 to set vocabulary, hardening to validate, then coverage at Z3-Z4 to refine.

## The Zoom Model

Protocol specs have hierarchical structure (H1-H6 headings). Collapse these into five semantic zoom levels:

| Zoom | Headings | What You Describe | Sentence Pattern |
|------|----------|-------------------|------------------|
| **Z0 — Mission** | H1 | Why the spec exists | Purpose & value for the adopter |
| **Z1 — Capabilities** | H2 | What an adopter can do | Capability claims using Services |
| **Z2 — Workflows** | H3 | How an adopter accomplishes it | Process narratives with actors and events |
| **Z3 — Rules** | H4 | What constraints govern each step | Invariants, state transitions, guards |
| **Z4 — Mechanics** | H5-H6 | Wire-level and encoding details | Field semantics, Builders, CESR types |

The insight: **high zoom levels test whether the UL has the right abstractions** (services, capabilities). **Low zoom levels test whether the UL has the right precision** (field names, state names, invariants). Both matter.

## Two Loops — Discovery vs Application

**Loop 1: Discovery** (read-only against RDOD)
- Attempt UL sentences, score them, propose fixes
- Fixes go into `findings.yaml`, NOT into RDOD files
- Iterate freely — no cost to proposing and revising

**Loop 2: Application** (write to RDOD — separate session)
- Review consolidated findings, accept/reject, batch-apply to RDOD YAML
- Run linter, regenerate context map, commit

Never mix the loops. Discovery can be speculative; application must be deliberate.

## Phase 1: Structure

**Goal:** Map the spec's heading hierarchy to zoom levels.

1. Extract all headings with line numbers from the spec markdown.
2. Classify each heading into Z0-Z4 based on heading level and semantic content.
   - Some H3s may be Z3 (rules disguised as subsections). Use judgment.
3. Write `structure.yaml` — the coverage matrix skeleton.

```yaml
# structure.yaml
spec: keri-specification
zoom_levels:
  Z0: { count: 1, headings: ["Key Event Receipt Infrastructure (KERI)"] }
  Z1: { count: 9, headings: [...] }
  # ...
sections:
  - heading: "Introduction"
    zoom: Z1
    line: 42
    sentence: null    # filled in Phase 2
    score: null
    finding_id: null
```

## Phase 2: Discovery (Top-Down)

**Goal:** For each heading, write sentences using only UL terms, score them.

Work top-down: Z0 first, then Z1, Z2, Z3, Z4. Each pass benefits from the previous — proposed terms from Z1 are available when writing Z2 sentences.

### Per heading:

1. **Read** the spec section content.
2. **Read** the relevant RDOD UL files (use domain mapping — KERI spec §7 maps to `identity/`, §8 to `delegation/`, etc.).
3. **Write 1-3 sentences** describing the section using ONLY UL terms. If a term doesn't exist, note what you need.
4. **Score** each sentence. See Scoring Rubric below.
5. **For non-Fluent scores**, create a finding entry in `findings.yaml`.

### Sentence categories by zoom level

See `references/templates.md` for detailed patterns per zoom level with examples:
- Z0: Purpose statements
- Z1: Capability claims, scope boundaries
- Z2: Process narratives, actor-service-event chains
- Z3: Invariant statements, state transitions, guard conditions
- Z4: Field semantics, Builder patterns, encoding rules

### Output per zoom level

Write `z<N>-<label>.md` (e.g., `z1-capabilities.md`) containing:
- Each heading
- The attempted sentence(s)
- The score
- Cross-reference to finding ID (if any)

## Phase 2.5: Finding Routing

**Goal:** Route each finding to the right place in the RDOD structure.

The spec is one flat document. The RDOD is a multi-domain hierarchy with multiple file types (`ubiquitous-language.yaml`, `types.yaml`, `verification.yaml`, `errors.yaml`). Every finding is real — nothing gets dropped. The question is WHERE it belongs.

### Why this matters

As you zoom down the spec, you cross domain boundaries. The KERI spec's §6.6 on indexed signatures isn't in the identity domain — it's cesr/primitives territory. §A.3 on superseding recovery might be integrity/recovery. A finding that seems "too low level" for one domain's UL might be exactly right for another domain's UL, or it might be a `type` or `verification rule` rather than a UL term.

### Routing table

| Finding feels like... | Route to... | Example |
|----------------------|-------------|---------|
| Adopter-facing concept, names WHAT | `ubiquitous-language.yaml` in the right domain | "Identity Recovery" → integrity/recovery UL |
| Developer-facing mechanism, names HOW | `types.yaml` in the right domain | "Forward-Blinded Commitment" → identity/key-commitment types |
| Validation constraint | `verification.yaml` in the right domain | "Dual threshold satisfaction" → identity/thresholds verification |
| Error condition | `errors.yaml` in the right domain | "Invalid superseding rotation" → integrity/recovery errors |
| Concept used across domains | `imports` in the consuming domain | cesr/primitives Siger imported by identity for signature verification |

### The adopter test (per domain)

Different domains have different adopters, so what counts as "UL-level" varies:

| Domain | Adopter | UL register |
|--------|---------|-------------|
| identity, delegation | Someone managing identifiers | Everyday / business language |
| cesr, cesr/primitives | A developer building codecs | Technical terms ARE the UL |
| credential-lifecycle | An issuer or verifier | Business language |
| accountability | Someone configuring trust infrastructure | Mixed |
| keri-messaging | A developer wiring protocol handlers | Technical terms appropriate |

A finding like "Indexed Signature" might not be UL for the identity domain, but it IS UL for cesr/primitives — because that domain's adopter thinks in those terms.

### Watch for collapses upward

Multiple findings at Z2-Z4 sometimes collapse into a single adopter concept at Z0-Z1. This is the most valuable routing outcome. Example: "Superseding Recovery", "Reserve Rotation", "SQAR", and "Reconciliation" are all mechanisms (types/rules), but they collapse upward into one UL concept: "Identity Recovery." The mechanisms don't disappear — they become the types and verification rules UNDER the UL term.

### Output

Add `route` and `route_domain` fields to each finding in `findings.yaml`:

```yaml
- id: KERI-Z2-002
  route: types          # mechanism, not adopter concept
  route_domain: identity/key-commitment
  route_reason: "HOW pre-rotation works, not WHAT the adopter does"

- id: KERI-Z2-010
  route: ul_term        # adopter-facing concept
  route_domain: integrity/recovery
  collapse_from: ["KERI-Z2-008c", "KERI-Z2-008e"]  # these mechanisms collapse into this UL term
```

Write `routing-summary.md` listing all findings grouped by route and domain.

## Phase 3: Verification (Bottom-Up)

**Goal:** Check that proposed terms compose across zoom levels.

1. Re-read Z0-Z1 sentences with the full set of proposed terms from Z2-Z4.
2. Verify high-level sentences still read naturally — new low-level terms shouldn't make high-level descriptions more complex.
3. Check that terms discovered at Z4 compose into Z2 process narratives.
4. Update findings where proposed terms need revision.

Write `verification.md` with pass/fail notes per zoom level.

## Phase 4: Consolidation

**Goal:** Merge findings across specs (if running multiple), deduplicate, assess impact.

1. Merge `findings.yaml` files from each spec pass.
2. Deduplicate — same concept discovered from KERI and ACDC specs.
3. Identify conflicts — same term proposed differently.
4. Write `findings-merged.yaml` and `impact-report.md`.

`impact-report.md` should be human-readable: what changes, which domains affected, what simplifies, what's still missing.

## Phase 5: Application Plan

**Goal:** Decide which findings to accept.

1. Review `impact-report.md` with the human.
2. Group accepted findings by RDOD domain.
3. Write `application-plan.yaml` — the accepted subset, ordered by domain dependency.

This is the gate between discovery and RDOD modification.

## Phase 6: RDOD Update (Separate Session)

**Goal:** Apply accepted changes to RDOD YAML files.

1. Apply UL changes per `application-plan.yaml`.
2. Run the linter: `python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains --strict`
3. Regenerate context map and build order.
4. Commit with descriptive message citing finding IDs.

## Scoring Rubric

| Score | Symbol | Meaning | Action |
|-------|--------|---------|--------|
| **Fluent** | `fluent` | UL describes it naturally, reads like plain English | None |
| **Awkward** | `awkward` | UL can describe it but the sentence is forced or wordy | Refine definition, add synonym, or rename |
| **Gap** | `gap` | No UL term exists for a needed concept | Add new term to appropriate domain |
| **Discovery** | `discovery` | A new concept would simplify multiple sentences | Add term + update related terms — this is gold |
| **Collapse** | `collapse` | A spec mechanism expands into multiple UL terms | Document the expansion mapping |

**Priority:** Discovery > Gap > Awkward > Collapse > Fluent. Discoveries are the highest-value output — they reveal hidden domain structure.

## Parallel Execution

This process maps to parallel agents per spec:
- One agent per spec (KERI, CESR, ACDC) running Phases 1-3
- One reviewer agent for Phase 4 cross-spec consistency
- Phase 5-6 require human judgment — not parallelizable

Within a single spec, Z1-Z4 are sequential (each builds on the prior). But multiple specs can run concurrently.

## Stopping Criteria

- **Within a spec pass:** Stop when Z4 sentences are fluent OR remaining gaps are outside RDOD scope (e.g., cryptographic algorithm internals → `externals` domain).
- **Across specs:** One pass per spec, then cross-spec merge.
- **After RDOD application:** Optionally re-run Phase 2 to verify applied changes improved coverage. This is a new session.
