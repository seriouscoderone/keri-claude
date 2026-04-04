---
name: spec-hardening
description: Systematic process for discovering and resolving gaps, contradictions, and underspecification in an RDOD DDD spec by forcing implementation planning and resolving questions through authoritative oracles. Activates when hardening a spec layer, running implementation planning against domain specs, resolving oracle questions (spec vs keripy vs keria), applying spec fixes layer-by-layer, or stress-testing whether a DDD spec is buildable. Use when the user says "harden layer N", "plan implementation for these domains", "resolve open questions", or "is this spec buildable?"
---

# Spec Hardening

Force-plan implementation of each domain to surface what pure spec review misses: missing types, underspecified invariants, contradictions, forward references, vocabulary gaps. Resolve each gap through authoritative oracles, then fix the spec.

**Input:** `<layer-number> [<rdod-domains-path>]`
- Layer number from `build-order.txt` (0-indexed)
- RDOD domains path: defaults to `rdod/spec/domains/`

**Output:** Implementation plans per domain + findings applied to spec files.

## Relationship to Sibling Skills

| Skill | Question | Tests |
|-------|----------|-------|
| **spec-ul-coverage** | "Can I *say* this?" | UL vocabulary against spec |
| **spec-invariant-coverage** | "Can I *prove* this?" | Verification precision against spec |
| **spec-hardening** | "Can I *build* this?" | Implementation planning against spec |

Best used AFTER both coverage skills. The UL must be right and invariants precise before you force-plan implementation.

## Tooling

All structural validation uses the `/ddd-spec` skill's scripts (from `domain-design-toolkit`):

| Tool | Command | Purpose |
|------|---------|---------|
| **Linter** | `python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains [--strict]` | Reference resolution, mirror consistency, cycles, completeness |
| **Context Map** | `python skills/ddd-spec/scripts/generate_context_map.py rdod/spec/domains` | Regenerate interactive domain visualization |
| **Build Order** | `python skills/ddd-spec/scripts/build_order.py rdod/spec/domains` | Regenerate dependency layers |

## The Process

### Phase 1: Structural Integrity

Before hardening content, ensure the spec is structurally sound.

1. **Lint clean**: `python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains --strict` -- 0 errors, 0 warnings
2. **No parent-ref violations**: child subdomains must not reference types/errors owned by ancestor parent domains. For each violation: move the type to the subdomain that semantically owns it, remove the parent duplicate, update all references
3. **Build order validated**: regenerate and spot-check that Layer 0 domains truly have no upward dependencies in their types/ports

### Phase 2: Force Implementation Planning

Plan each layer bottom-up. This is where gaps surface.

**2.1 Split domains into planner groups** (2-4 groups by cluster affinity):
- Identity cluster (establishment, state, key-commitment, anchoring)
- Service cluster (cloud-agent, signify-client)
- Cross-cutting cluster (accountability, integrity, delegation, privacy, credential-lifecycle)

**2.2 Plan each domain** using the implementation plan template in [references/implementation-plan-template.md](references/implementation-plan-template.md). Read ALL spec files per domain and produce a full plan covering sections A-J. **Spawn parallel agents per planner group** — each agent plans its cluster independently.

**2.3 Surface open questions** — the critical output. Everything the planner couldn't resolve:
- Ambiguities (spec readable two ways)
- Missing definitions (type/error/port referenced but not defined)
- Underspecified invariants (too vague to implement)
- Contradictions (types.yaml says X, UL says Y, verification.yaml says Z)
- Missing builders, state machines, error types
- Cross-domain gaps (port contracts that don't match)

**Frame questions as domain rules, not implementation mechanics:**
- GOOD: "For a weighted threshold with multiple clauses, does satisfaction require ALL clauses met (AND) or ANY clause (OR)?"
- BAD: "What does `Tholder.satisfy()` return?"

### Phase 3: Oracle Resolution

Resolve each question through authoritative sources, in priority order.

**3.1 Reframe every question** as a domain-level rule before asking any oracle:
- What invariant is being tested?
- What protocol constraint is unclear?
- What contract is underspecified?

**3.2 Oracle priority:**
1. **Protocol specification** (KERI/CESR/ACDC specs) -- authoritative. Use the `keri:spec`, `keri:cesr`, or `keri:acdc` skills, or read spec markdown directly.
2. **Reference implementation** (keripy) -- confirmatory. Use the `keri:keripy` skill or read keripy source. Agreement = high confidence; disagreement = surfaces spec interpretation divergence.
3. **Secondary implementations** (keria, signify-ts) -- additional confirmation. Use `keri:signify-ts` skill or read source.
4. **KeriChat** (`mcp__keri-chat__ask_keri_chat`) -- for questions that span multiple specs or need synthesis across sources.
5. **DDD design decisions** -- for questions the protocol spec doesn't reach (escrow queue names, deployment patterns, adopter vocabulary).

**The spec wins ties.** But always consult implementations -- three-way agreement is high-confidence evidence.

**3.3 Synthesize** each answer:
1. What does the spec say? (quote normative text)
2. What does keripy do? (cite code)
3. Do they agree? If not, which is correct?
4. What change does this require in the DDD spec?

### Phase 4: Apply Fixes and Verify

**4.1 Categorize fixes:**
- **Contradictions** -- spec says X, DDD spec says Y. Fix immediately.
- **Missing types/ports** -- planner couldn't find a definition. Add it.
- **Vocabulary corrections** -- implementation jargon leaked into DDD naming. Replace with adopter-centric language.
- **Design decisions** -- no oracle needed, resolve from DDD principles. See [references/ddd-principles.md](references/ddd-principles.md).

**4.2 Apply, lint, commit** after each batch:
```bash
python skills/ddd-spec/scripts/validate_spec.py rdod/spec/domains --strict
python skills/ddd-spec/scripts/generate_context_map.py rdod/spec/domains
python skills/ddd-spec/scripts/build_order.py rdod/spec/domains
```
Commit with a descriptive message citing what was fixed and why.

**4.3 Advance to next layer** once current layer is clean.

## Agent Orchestration

This skill is designed for parallel execution:

- **Phase 2**: Spawn one agent per planner group. Each reads its cluster's spec files and produces plans independently.
- **Phase 3**: Spawn agents per oracle source (one reads the protocol spec, one reads keripy, one queries KeriChat) for each batch of questions.
- **Phase 4**: Apply fixes sequentially (must lint between batches).

## Checklist per Layer

- [ ] Linter passes clean (`--strict`, 0 errors, 0 warnings)
- [ ] No parent-ref violations
- [ ] Build order validated
- [ ] Implementation planning completed for all domains
- [ ] Open questions collected and reframed as domain rules
- [ ] Oracle resolution: spec first, keripy confirms, keria confirms
- [ ] Fixes applied, linter re-run, context map regenerated
- [ ] Commit with descriptive message
- [ ] Ready to advance to next layer
