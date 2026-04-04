# Z0 — Mission: ACDC Specification

## Authentic Chained Data Containers (ACDC)

**Sentence:** An ACDC is a cryptographically verifiable, Schema-enforced data container bound to an Issuer AID via KERI key state, where chains of ACDCs linked through the Edge Section form a distributed property graph enabling granular proof-of-authorship — and, combined with Graduated Disclosure and Rule Section contractual terms, extensible to proof-of-authority for entitlements and permissions.

**Score:** awkward

**Finding:** ACDC-Z0-001 — The UL can describe individual ACDCs and their sections fluently, but has no term for the *graph-level* concept: ACDCs as fragments of a globally distributed property graph, or the chain-of-authority that emerges from linked ACDCs. "Edge Section" names the structural field, but the adopter-facing concept — that chained ACDCs form an authenticated authorization graph — has no first-class UL term. Proposed: **AuthorizationGraph** or **CredentialGraph** (the DAG of linked ACDCs providing proof-of-authority chains).
