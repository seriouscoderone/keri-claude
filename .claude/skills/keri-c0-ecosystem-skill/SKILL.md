---
name: keri-c0-ecosystem
description: Guide users through designing a KERI-native industry ecosystem. Activates when users want to define industry governance, credential schemas, participant roles, delegation trees, and trust frameworks for a KERI ecosystem. Produces ecosystem.yaml, credential-catalog.md, and trust-framework.md artifacts. Invoke with /keri-c0-ecosystem.
command: /keri-c0-ecosystem
user_invocable: true
---

# KERI C0 Ecosystem Designer

Conversational workflow that guides a user through designing an industry ecosystem restructured around KERI-native verifiable relationships. Produces three artifacts: `ecosystem.yaml`, `credential-catalog.md`, and `trust-framework.md`.

## Before You Start

Read the following reference files (all relative to this skill directory):

- `references/ecosystem-schema.yaml` -- canonical YAML schema with field descriptions
- `references/credential-catalog-template.md` -- output template for the credential catalog
- `references/trust-framework-template.md` -- output template for the trust framework narrative
- `references/c0-design-questions.md` -- question bank with follow-up probes and field mappings

## Workflow

### Phase 1: Discovery

Check whether any ecosystems already exist.

1. Glob for `docs/*/ecosystem.yaml` in the repository.
2. If ecosystems exist, list them with a one-line summary (name, number of roles, number of credentials) and ask the user: **"Continue refining an existing ecosystem, or create a new one?"**
3. If no ecosystems exist, proceed directly to Phase 2.

If the user chooses to continue an existing ecosystem, read its `ecosystem.yaml` and skip to whichever phase needs work (roles incomplete? credentials missing? delegation trees undefined?).

### Phase 2: Framing

Establish the ecosystem scope before imposing structure.

1. Ask: **"What industry or domain is this ecosystem for?"** Record the answer as the ecosystem name.
2. Ask: **"Describe the industry in your own words. What are the main activities, who are the key players, and what are the biggest pain points?"**
3. Listen. Do not rush to structure. Reflect back what you heard and ask clarifying follow-ups until you have a clear mental model of the industry.
4. Propose a one-paragraph `ecosystem.description` and confirm with the user.

### Phase 3: Deep Questioning

Walk through the 8 design questions from `references/c0-design-questions.md`, one at a time.

For each question:

1. Ask the **primary question** in a conversational tone (adapt it to the specific industry -- do not read it verbatim from the reference).
2. Listen to the answer.
3. Ask **1-2 follow-up probes** from the reference, chosen based on what the user said.
4. Summarize what you learned and which artifact fields it populates.
5. Move to the next question.

Do not rush. Let the user think. These questions surface the design decisions that drive everything downstream.

After all 8 questions, summarize the collected insights in a concise table:

| Question | Key Insight | Artifact Impact |
|----------|-------------|-----------------|
| Q1 | ... | credential_catalog, roles |
| ... | ... | ... |

Ask: **"Did I capture everything? Anything I missed or got wrong?"**

### Phase 4: Role Identification

From the answers collected in Phase 3, propose a set of industry roles.

1. List each proposed role with: name, display name, one-sentence description, and which KERI infrastructure it needs (witness pool, watcher network, agent service, ACDC registry).
2. Present the roles as a table.
3. Ask: **"Did I miss any roles? Are any of these unnecessary? Should any be split or merged?"**
4. Iterate until the user confirms.

### Phase 5: Credential Mapping

For each confirmed role, map credentials.

1. Walk through roles one at a time: **"What credentials does the [role] issue? What credentials must they hold? Who verifies them?"**
2. For each credential identified, capture: id, name, description, issuer_role, holder_role, verifier_roles, disclosure_mode.
3. Ask about schema fields: **"What information does this credential contain?"** Record as schema_fields.
4. Ask about chaining: **"Does this credential depend on the issuer holding another credential?"** If yes, record chained_from.
5. After all roles are mapped, present the full credential catalog as a summary table.
6. Ask: **"Any credentials missing? Any that should be combined or split?"**

### Phase 6: Delegation Trees

Map authority delegation hierarchies.

1. Ask: **"Who delegates authority to whom in this ecosystem? Are there chains of delegation?"**
2. For each delegation relationship, capture: root_role, delegate role, scope description, depth_limit.
3. Present delegation trees visually using indentation:
   ```
   regulator (root)
     -> carrier (scope: "underwrite within licensed lines", depth: 2)
       -> tpa (scope: "process claims on carrier's behalf", depth: 1)
   ```
4. Ask: **"Are these delegation boundaries correct? Should any be tighter or looser?"**

### Phase 7: Confirmation

Present the complete ecosystem design as a structured summary.

1. **Ecosystem overview**: name, description, regulatory frameworks.
2. **Roles table**: all roles with infrastructure flags.
3. **Credential catalog table**: all credentials with issuer/holder/verifier.
4. **Delegation trees**: visual hierarchy.
5. **Interoperability**: any cross-ecosystem bridges identified.
6. **Privacy requirements**: summary of disclosure modes and constraints.

Ask: **"This is the complete ecosystem design. Any corrections before I generate the artifacts?"**

### Phase 8: Artifact Generation

Generate the three output files.

1. Create the output directory: `docs/{ecosystem_name}/`

2. **Write `ecosystem.yaml`**: Populate the canonical schema from `references/ecosystem-schema.yaml` with all collected data. Use the exact field structure. Include comments for complex fields.

3. **Write `credential-catalog.md`**: Use the structure from `references/credential-catalog-template.md`. Replace template variables with actual data. Include the credential summary table, per-credential detail sections with schema field tables, chaining info, and privacy notes.

4. **Write `trust-framework.md`**: Use the structure from `references/trust-framework-template.md`. Replace template variables with actual data. Write narrative prose for sections that require it (executive summary, governance authority, dispute resolution, liability framework). Tables for structured data (roles, credentials, infrastructure).

5. After writing all files, report:
   ```
   Artifacts written:
   - docs/{ecosystem_name}/ecosystem.yaml
   - docs/{ecosystem_name}/credential-catalog.md
   - docs/{ecosystem_name}/trust-framework.md
   ```

6. Remind the user: **"Run `/keri-c1-system` to design services that participate in this ecosystem."**

## Conversation Style

- Be curious, not prescriptive. You are interviewing an industry expert.
- Use plain industry language, not KERI jargon, when asking questions. Map to KERI concepts in your summaries.
- One question at a time. Do not overwhelm with multiple questions in a single message.
- Reflect back what you hear before moving on. Misunderstandings at C0 propagate through all lower layers.
- When proposing roles or credentials, explain your reasoning briefly so the user can correct you.
- If the user is unsure about something, suggest options based on patterns from similar industries. Reference the C4 architecture guide patterns (credential ecosystem governance, multi-party process coordination, marketplace economics) where relevant.

## Output Rules

- All output files go in `docs/{ecosystem_name}/` where `{ecosystem_name}` is the machine-readable lowercase hyphenated name.
- `ecosystem.yaml` must be valid YAML that parses without errors.
- Credential IDs must be lowercase with underscores (e.g., `carrier_license`).
- Role names must be lowercase with underscores (e.g., `insurance_carrier`).
- Do not invent credentials or roles the user did not confirm.
- Include all fields from the schema even if empty (use `[]` for empty arrays, `""` for empty strings, `null` for optional fields).
