---
description: Write blog posts for KERI.host in the project's distinctive voice. Handles creating new posts, editing existing drafts, and maintaining consistent tone across the blog.
user_invocable: true
command: blog
---

# KERI.host Blog Writing Skill

## When to Use

Use this skill when the user asks to:
- Create a new blog post (`/blog new [topic]`)
- Edit or expand an existing draft (`/blog edit [post-name]`)
- Review a post for voice consistency (`/blog review [post-name]`)
- List existing posts (`/blog list`)

## The KERI.host Voice

Every post must embody this voice. It is non-negotiable.

### Tone
- **Conversational but substantive.** Write like you're explaining something important to a smart friend over coffee. Not academic. Not marketing. Not "thought leadership."
- **Direct address.** Talk to the reader. "You" not "users" or "stakeholders."
- **Provocative but grounded.** Challenge assumptions, but back it up with real architecture, not hand-waving.
- **Anti-hype.** Never use breathless language. Never oversell. If something is early-stage, say so. If something is speculative, say so.
- **Philosophical when warranted.** These posts explore what technology means for human relationships, communities, and dignity. Don't shy away from big questions.
- **Short paragraphs.** Punchy. Let ideas breathe.

### What We NEVER Do
- Use the word "blockchain" as a selling point
- Use crypto/Web3 buzzwords (decentralized, trustless, tokenomics, DAO, etc.) without immediately grounding them in real human outcomes
- Write marketing copy or calls-to-action
- Promise things that don't exist yet without clearly marking them as vision
- Use corporate-speak ("leverage," "synergize," "ecosystem play," "value proposition")
- Add social sharing buttons or engagement bait
- Use emojis in posts

### What We ALWAYS Do
- Ground technical concepts in human impact
- Acknowledge what doesn't exist yet (use `*TODO:*` notes)
- Treat the reader as intelligent and capable of nuance
- Connect individual posts to the broader KERI.host vision
- End with a clear, honest assessment of where we are

## Pattern Vocabulary

Use these terms consistently across posts. They have specific meaning in the KERI.host context:

| Term | Meaning |
|------|---------|
| **No Central Workflow** | Systems where no single entity controls the process |
| **Delegated AI** | AI agents with cryptographically scoped, revocable authority |
| **Subjective Reputation** | Reputation that is community-defined, contextual, and plural — not a single universal score |
| **Ecosystem Autonomy** | Each community/ecosystem governs itself; KERI.host provides infrastructure, not governance |
| **OADA** | Offer, Accept, Disclose, Attest — the four-step pattern for community interactions |
| **Negative Capability** | The ability to exist in uncertainty without forcing resolution; applied to technology that doesn't require all answers upfront |
| **Data at the Edge** | Data stays with the individual, not accumulated in central databases |
| **Signing at the Edge** | Cryptographic operations happen on the user's device, never on a server |

## Blog Categories

Each post must have 1-2 categories from this list:

- `identity` — Self-sovereign identity, digital ID, credentials, AIDs
- `economy` — Value exchange, marketplaces, economic models, intermediaries
- `community` — Mutual aid, community service, social infrastructure
- `ai` — AI agents, delegation, security, AI accountability
- `philosophy` — Big picture, human meaning, peace, Earth, civilization
- `technical` — Architecture, implementation, protocol details

## Post Template

When creating a new post, use this template:

```markdown
---
title: "[Title — conversational, not clickbait]"
date: YYYY-MM-DD
categories: [category1, category2]
tags: [specific, relevant, tags]
description: "[One sentence, under 160 characters, for SEO]"
status: draft
theme_summary: "[One paragraph capturing the core thesis]"
---

## [Opening section — hook the reader with a provocative observation or question]

[2-3 short paragraphs that establish the problem or tension]

## [Middle sections — develop the argument]

[Each section builds on the previous. Use subheadings freely.]
[Include concrete examples, not just abstract claims.]
[Use code blocks or diagrams for technical concepts.]
[Use tables for comparisons.]

## [Resolution — what does KERI/the new model offer?]

[Be honest about what exists and what doesn't.]
[Connect to the broader KERI.host vision.]

## Conclusion

[Short, punchy conclusion.]
[End with an honest assessment, not a sales pitch.]

*TODO: [What needs to be added or expanded]*
```

## File Location

All posts go in `docs/_posts/` with the naming convention:
```
YYYY-MM-DD-slug-name.md
```

Use today's date for new posts. Slugs should be lowercase, hyphenated, descriptive.

## Existing Posts Reference

When writing new posts, maintain consistency with these existing pieces:

| Post | Categories | Key Themes |
|------|-----------|------------|
| `keri-ai-security-framework` | ai, technical | Delegated AIDs for AI agents, scoped authority, threat elimination |
| `data-at-the-edge` | identity, philosophy | Data sovereignty, KERI stores, partnership vs extraction |
| `actual-value-economy` | economy, philosophy | Removing intermediaries, direct value exchange, efficiency |
| `earth-ready-for-peace` | philosophy | Earth as mother, evolutionary perspective, infrastructure for peace |
| `community-service-marketplace` | community, economy | OADA pattern, mutual aid, visits, reputation, time banking |
| `why-digital-identity` | identity | 10 reasons for self-sovereign ID, practical benefits |
| `1990-internet-moment` | identity, philosophy | Historical parallel, network effects, paradigm shift |

## Content Architecture Context

The blog exists alongside other KERI.host content:
- **Ecosystem Stories** (`docs/ecosystem-stories/`) — Narrative scenarios showing KERI in action (different format, more story-driven)
- **Phase Docs** (`docs/phase-*/`) — Technical implementation plans
- **Blog posts** bridge these: more accessible than phase docs, more analytical than ecosystem stories

## Process

### For `/blog new [topic]`
1. Ask the user what angle or thesis they want to explore (if not clear)
2. Draft the full post following the template
3. Write it to `docs/_posts/YYYY-MM-DD-slug.md`
4. Show the user the frontmatter and first section for review

### For `/blog edit [post-name]`
1. Read the existing post from `docs/_posts/`
2. Discuss what changes are needed
3. Apply edits while preserving the voice

### For `/blog review [post-name]`
1. Read the post
2. Check against the voice guidelines
3. Flag any sections that break voice conventions
4. Suggest specific improvements

### For `/blog list`
1. List all posts in `docs/_posts/` with their title, date, categories, and status
