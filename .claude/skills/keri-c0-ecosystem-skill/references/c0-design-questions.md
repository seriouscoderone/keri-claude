# C0 Ecosystem Design Questions

Question bank for the `/keri-c0-ecosystem` workflow. Each question probes a facet of the industry that maps to a specific KERI concept and populates a specific field in `ecosystem.yaml`.

---

## Q1: Trust Intermediaries

**Primary:** "What trust relationships in this industry currently require intermediaries?"

**Follow-up probes:**
- "What would happen if those intermediaries disappeared tomorrow?"
- "Which intermediaries add real value vs. which exist only because there was no alternative?"
- "Are there intermediaries that both parties wish they could bypass?"

**Maps to KERI concept:** ACDC-based verifiable claims replacing trusted third parties.

**Populates:** `credential_catalog[]` -- identifies which credentials can replace intermediary functions. Also informs `roles[]` by revealing which intermediary roles survive as issuers vs. which are eliminated.

---

## Q2: Data Duplication

**Primary:** "What data is duplicated across organizations in this industry?"

**Follow-up probes:**
- "Who is the source of truth today for each duplicated dataset?"
- "How much does reconciliation cost (time, money, errors)?"
- "What breaks when copies get out of sync?"

**Maps to KERI concept:** Verifiable data registries and ACDC-backed single-source credentials replacing data silos.

**Populates:** `credential_catalog[].schema_fields` -- the duplicated data fields become credential attributes. `roles[].credentials_issued` -- the source of truth becomes the issuer.

---

## Q3: Reconciliation Processes

**Primary:** "What reconciliation processes exist between parties?"

**Follow-up probes:**
- "How long do they take? What breaks when they fail?"
- "How many people are employed primarily for reconciliation?"
- "What is the error rate in current reconciliation?"

**Maps to KERI concept:** Cryptographic proof chains (KEL + TEL anchoring) replacing manual reconciliation. ACDCs as shared state that needs no reconciliation.

**Populates:** `credential_catalog[]` -- credentials that eliminate reconciliation. `interoperability[]` -- cross-organization data flows that currently require reconciliation.

---

## Q4: Liability Boundaries

**Primary:** "What are the liability boundaries between parties?"

**Follow-up probes:**
- "Who gets blamed when things go wrong today?"
- "Are liability boundaries clear or contested?"
- "What evidence is used to establish fault?"

**Maps to KERI concept:** Duplicity detection, KEL-based audit trails, and delegation chains that create cryptographic liability boundaries.

**Populates:** `governance.dispute_resolution` -- how disputes are resolved. `delegation_trees[]` -- authority boundaries map to liability boundaries. Trust framework liability section.

---

## Q5: Friction-Reducing Credentials

**Primary:** "What credentials would reduce the most friction in daily operations?"

**Follow-up probes:**
- "What is the most painful verification process today?"
- "Where do people wait days for something that should take seconds?"
- "What onboarding processes could be instant with the right credential?"

**Maps to KERI concept:** ACDC credential issuance and verification, graduated disclosure for privacy-preserving verification.

**Populates:** `credential_catalog[]` -- prioritized list of credentials. `credential_catalog[].disclosure_mode` -- whether full or selective disclosure is needed.

---

## Q6: Authorized Issuers

**Primary:** "Who should be authorized to issue credentials in this industry?"

**Follow-up probes:**
- "What makes an issuer trustworthy? Regulation? Reputation? Expertise?"
- "Should issuer authority be delegated? To what depth?"
- "What happens when an issuer loses trust?"

**Maps to KERI concept:** Delegation trees, delegated AIDs, and governance-controlled issuance authority.

**Populates:** `roles[]` -- which roles have issuance authority. `delegation_trees[]` -- delegation hierarchy. `roles[].governance_obligations` -- what issuers must maintain.

---

## Q7: Privacy Requirements

**Primary:** "What privacy requirements exist in this industry?"

**Follow-up probes:**
- "What data must never be revealed to certain parties?"
- "What can be shared freely vs. what requires consent?"
- "Are there regulatory privacy mandates (GDPR, HIPAA, state laws)?"

**Maps to KERI concept:** ACDC graduated disclosure (full, selective, partial), chain-link confidentiality, and consent-gated presentation.

**Populates:** `governance.privacy_requirements` -- regulatory and contractual privacy constraints. `credential_catalog[].disclosure_mode` -- per-credential privacy level.

---

## Q8: Regulatory Compliance

**Primary:** "What regulatory compliance requirements apply to this industry?"

**Follow-up probes:**
- "What audits happen today and how often?"
- "What documentation must be retained and for how long?"
- "Which regulations would be easier to satisfy with verifiable credentials?"

**Maps to KERI concept:** KEL/TEL-based immutable audit trails, ACDC compliance certificates, automated schema validation against regulatory requirements.

**Populates:** `governance.regulatory_frameworks` -- applicable regulations. `roles[].governance_obligations` -- per-role compliance duties. `credential_catalog[]` -- compliance-related credentials.
