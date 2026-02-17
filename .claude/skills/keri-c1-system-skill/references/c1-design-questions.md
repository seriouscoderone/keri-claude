# C1 Design Questions

Question bank for guiding service definition. Each question includes what it maps to
in `system.yaml` and follow-up probes to deepen understanding.

---

## Q1: Problem Framing

**Ask:** "What problem does this service solve for a real human? Describe it without using any KERI terminology."

**Maps to:** `service.value_proposition`

**Push back on jargon.** If the user says "it manages AIDs" or "it provides witness services," respond: "That describes KERI infrastructure, not a human problem. What does the person get out of it? What pain goes away?"

**Follow-ups:**
- "What happens today without this service? What is the current workaround?"
- "If you had to explain this to your mother, what would you say?"
- "What is the one-sentence pitch for a non-technical investor?"

---

## Q2: User Identification

**Ask:** "Who are the humans that use this? What are they trying to accomplish today without it?"

**Maps to:** `service.user_journeys[].actor`

**Follow-ups:**
- "Are there different types of users with different goals?"
- "Who pays vs. who uses? Are they the same person?"
- "What is the user doing the moment before they need this service?"

---

## Q3: Pattern Matching

**Ask:** "Which of these four service patterns is closest to what you are building?"

Present the four patterns:
1. **Identity Lifecycle Service** — "Secure Digital Identity Management" (issue identity, recovery, theft protection, privacy-preserving proof)
2. **Credential Verification Service** — "Instant Background Checks" (real-time verification, no central DB, privacy-preserving, audit trail)
3. **Marketplace Trust Service** — "Portable Reputation System" (cross-platform reputation, portable reviews, unfakeable credentials)
4. **Compliance-as-a-Service** — "Automated Regulatory Compliance" (prove compliance without audits, real-time monitoring, immutable audit trails)

**Maps to:** `service.pattern`

**Follow-ups:**
- "What about this pattern does NOT fit your service?"
- "Does your service combine elements of multiple patterns?"
- "If none fit, describe what makes yours different."

---

## Q4: User Journey

**Ask:** "Walk me through from first encounter to getting value. What does the user do step by step?"

**Maps to:** `service.user_journeys[].steps[]`

**Follow-ups:**
- "What is the very first thing the user sees or does?"
- "At what step does the user first get value?"
- "What are the failure points? Where might a user give up?"
- "How long does the entire journey take? Minutes? Days?"

---

## Q5: Identity Needs

**Ask:** "Does the user need to create their own cryptographic identity to use this service?"

**Maps to:** `keri_requirements.agent_service` (true if yes)

**Follow-ups:**
- "Does the user manage their own keys, or does the service manage keys on their behalf?"
- "Does the user need to recover their identity if they lose their device?"
- "Can a user delegate their identity to someone else?"

---

## Q6: Credential Issuance

**Ask:** "Does anyone in this service need to issue credentials? Who issues what to whom?"

**Maps to:** `keri_requirements.acdc_registry` (true if yes), `keri_requirements.credentials_handled[]`

**Follow-ups:**
- "What does the credential prove? What claim does it make?"
- "Who is the authority that issues it? Why should anyone trust them?"
- "Can credentials be revoked? Under what circumstances?"
- "Does the credential chain to other credentials? (e.g., a license that requires a degree)"

---

## Q7: Verification Needs

**Ask:** "Does anyone need to verify credentials issued by this or another service?"

**Maps to:** `keri_requirements.watcher_network` (true if yes)

**Follow-ups:**
- "Is verification real-time or batch?"
- "Does the verifier need to check for fraud/duplicity?"
- "Does verification need to be privacy-preserving? (only yes/no, not raw data)"

---

## Q8: Business Model

**Ask:** "How does this make money? Who pays, and for what?"

**Maps to:** `service.business_model`

**Follow-ups:**
- "Is it subscription, per-transaction, enterprise licensing, or freemium?"
- "What is the free tier vs. paid tier?"
- "What is the expected price point?"
- "Are there multiple revenue streams?"

---

## Q9: SLA and Reliability

**Ask:** "How fast does verification need to be? What happens if the service goes down for an hour?"

**Maps to:** `service.sla`

**Follow-ups:**
- "What operations are latency-sensitive vs. can be batched?"
- "What is the acceptable downtime per month?"
- "How much data can you afford to lose? (RPO)"
- "Do you need multi-region deployment?"

---

## Q10: Integration Points

**Ask:** "What existing systems does this need to talk to?"

**Maps to:** `integrations[]`

**Follow-ups:**
- "Does it integrate with existing databases, APIs, or identity providers?"
- "Does it need to receive webhooks or push events to other systems?"
- "Are there regulatory systems it must report to?"
- "Does it need to interoperate with other KERI services in the ecosystem?"
