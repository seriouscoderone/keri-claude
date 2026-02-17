# Disclosure, Exploitation Protection, and IPEX

> **IPEX caveat:** The IPEX section is **non-normative** (spec line 3979). A separate spec is in development. It is "only normative in the sense that it specifies the message types and routes that SHOULD be used."

---

## 1. Graduated Disclosure Levels

All mechanisms MAY be combined (R12).

| Level | Mechanism | Disclosed | Schema Op | Privacy |
|-------|-----------|-----------|-----------|---------|
| Metadata | Metadata ACDC with empty `u` | Metadata only | -- | No correlation to real ACDC SAID |
| Compact | SAID of block | Digest only | `oneOf` (compact+full) | Verifiable commitment (R9) |
| Partial | SAID + salty nonce UUID | Blinded until UUID revealed | `oneOf` | Exposes at minimum field labels of enclosing block (R13) |
| Nested Partial | Hierarchical SAIDs+UUIDs | Per-branch | Nested `oneOf` per block | Per-branch control |
| Selective | Per-element SAID+UUID from set | Chosen elements only | `anyOf` set / `oneOf` element | No info about undisclosed elements or labels (R14); order-independent (R11) |
| Full | Complete block | Everything | Base schema | Full content visible |

DON'T: Confuse Partial and Selective disclosure
DO: Partial exposes field labels of sibling fields (R13); Selective exposes nothing about undisclosed fields (R14)

DON'T: Assume SAID alone provides privacy
DO: Use UUID blinding (`u` field) -- without it, SAID gives compactness but not privacy (rainbow table risk)

**Hash tree property:** All variants form a hash tree via SAIDs. Commitment on top-level SAID of most compact variant = commitment to hash tree root. Different variants = different tree paths. Single Issuer commitment suffices for any schema-authorized variant (R29, R32).

---

## 2. Exploitation Model

| Party | Role | Exploitation Rule |
|-------|------|-------------------|
| 1st party | Discloser / data subject | Owns data, controls disclosure |
| 2nd party | Disclosee / intended recipient | Any **unintended** use is exploitive |
| 3rd party | Observer / unintended recipient | **Any** use is exploitive by definition |

**Mitigations:** UUID blinding, bulk issuance (uncorrelatable copies), TEL Observers (mask PoV), Metadata ACDCs.

---

## 3. Contractual Protection

### Chain-Link Confidentiality

DON'T: Allow terms to stop propagating at any link
DO: MUST apply original disclosure terms to each subsequent Disclosee via each subsequent disclosure (R16)

- Contractual terms MAY include provisions beyond third-party disclosure (liability, etc.) (R15)
- Chain-link terms MAY be specific terms of use or other consensual constraints; MAY apply to subsequent disclosures (R17)

### Contingent Disclosure

- When contingency is met, disclosure MUST be made by the responsible party (R18)
- Responsible party MAY be Discloser or another party (e.g., escrow agent) (R19)
- Clause MAY reference a cryptographic commitment to a private ACDC (Partial Disclosure) that satisfies via Full Disclosure the contingent obligation (R20)
- MAY limit PII disclosure to just-in-time, need-to-know basis (R21)

### Ricardian Contracts

Rule section (`r` field) provides human-readable + machine-verifiable clauses. Top-level SAID provides cryptographic digest for contract referencing. See `acdc-structure.md` for full Rule section structure.

---

## 4. IPEX Protocol

Uniform protocol for issuance and presentation. All exchanges MAY be modeled as Discloser-to-Disclosee disclosure (R24). Carried as KERI `exn` messages; routes in `r` field (R22). Route semantics indicate how message SHOULD be used (R23).

### 4.1 Message Routes

| Route | Dir | Init? | Contents |
|-------|-----|:-----:|----------|
| `apply` | Disclosee->Discloser | Yes | Schema/SAID, attribute labels, aggregate labels, sig |
| `spurn` | either | No | Rejects `apply`, `offer`, or `agree` |
| `offer` | Discloser->Disclosee | Yes | Metadata ACDC/SAID, Schema/SAID, partial disclosure, sig |
| `agree` | Disclosee->Discloser | No | Sig/seal on `offer` or its SAID |
| `grant` | Discloser->Disclosee | Yes | Full/Selective ACDC, sig |
| `admit` | Disclosee->Discloser | No | Sig/seal on `grant` or its SAID |

Initiating messages: `apply`, `offer`, `grant`. `spurn` rejects at any stage.

### 4.2 Exchange State Machine

```
[idle] --apply received (valid schema, valid sig)--> [applied]
[idle] --offer sent (Discloser initiates)--> [offered]
[applied] --spurn sent--> [spurned] (terminal)
[applied] --offer sent--> [offered]
[offered] --spurn sent--> [spurned] (terminal)
[offered] --agree received (valid sig/seal on offer)--> [agreed]
[agreed] --spurn sent--> [spurned] (terminal)
[agreed] --grant sent (ACDC prepared, valid sig)--> [granted]
[granted] --admit received (valid sig/seal on grant)--> [admitted] (terminal)
```

Both Discloser and Disclosee SHOULD make non-repudiable commitments via signatures or seals (R27). Same state machine for issuance and presentation.

### 4.3 SAID Commitments

Indirect verification: verify SAID against SAD, then verify sig/seal on SAID (R25). Signature on any variant MAY verify Issuer commitment to any other variant, section-by-section (R26, R29).

**Issuer commitment rules:**

| Rule | Level | Requirement |
|------|-------|-------------|
| R30 | MUST | Issuer MUST provide signature/seal on SAID of most compact form variant |
| R31 | SHOULD | Issuer SHOULD also provide signatures/seals on SAIDs and SADs of other variants |

**Proof types:**

| Type | Abbr | How |
|------|------|-----|
| Proof of Issuance | PoI | Disclose SAID of most compact variant + verifiable Issuer commitment (R33) |
| Proof of Disclosure | PoD | Disclose SAD of most compact variant, recursively expand nested SADs as needed (R34) |

For any disclosed variant, Disclosee MAY need only one PoI and MAY need a specific PoD (R35). IPEX SHOULD specify how validator does this (R36).

### 4.4 Graduated Disclosure Validation

```
validate_graduated_disclosure(variant_SAD, issuer_commitment, schema):
  1. [ ] Obtain SAID of most compact form (see acdc-structure.md algorithm)
  2. [ ] Verify PoI:
     a. [ ] Obtain Issuer signature/seal on compact variant SAID
     b. [ ] Verify against Issuer Key State (KEL lookup)
     c. [ ] If indirect: verify SAID against SAD, then verify sig/seal on SAID
  3. [ ] Verify PoD:
     a. [ ] Obtain SAD of most compact variant
     b. [ ] Recursively expand nested SADs for promised disclosure
     c. [ ] At each level: verify nested block SAD against its SAID (hash tree inclusion)
     d. [ ] Verify disclosed variant conforms to Schema
  4. [ ] Both PoI and PoD pass → valid
```

For bulk issuance: Issuer signs/seals only the blinded SAID of compact variant; enables proof of inclusion without correlation leakage.

---

## 5. Bespoke Issued ACDCs

Disclosure-specific ACDC where Issuer (`i`) = Discloser, Issuee (`a.i`) = Disclosee. Signing agreement consummates contract (R39). Referenced ACDC attributes MAY be addressed via JSON Pointer (RFC 6901) or CESR-SAD-Path relative to Edge node SAID (R37). Attribute section MAY be empty or bespoke-only (R38).

| Field | Req | Description |
|-------|:---:|-------------|
| `v` | MUST | Version string |
| `d` | MUST | SAID of this ACDC |
| `i` | MUST | Issuer AID (Discloser) |
| `s` | MUST | Schema SAID |
| `a` | MAY | Attribute section (MAY be empty) |
| `a.d` | MUST | Attribute section SAID |
| `a.i` | MUST | Issuee AID (Disclosee) |
| `e` | MAY | Edge section referencing other ACDCs |
| `e.d`, `e.<label>.d` | MUST | Edge/block SAIDs |
| `e.<label>.n` | MUST | Node SAID of referenced ACDC |
| `r` | MAY | Rules section (contractual language) |
| `r.d`, `r.<label>.d` | MUST | Rules/clause SAIDs |
| `r.<label>.l` | MUST | Human-readable legal clause |

---

## 6. ACDC State Binding

ACDCs are NOT directly signed. They are bound to Issuer Key State (directly or indirectly); Key State is signed. Key State changes independently of ACDC state (R5).

### Direct Anchoring

Issuer anchors issuance proof digest seal in KEL. Seal digest = SAID of ACDC (or aggregate for bulk). Single state: issued/anchored. No Registry/TEL.

### Indirect Anchoring (TEL Registry)

- Registry inception event (`rip`) SAID MUST be anchored in Issuer KEL as Registry proof seal (R1)
- TEL update events MUST also be anchored in Issuer KEL (R2)
- TEL update event MAY include ACDC SAID, blinded or unblinded (R3)
- State proof reference MAY be attached to presentation or provided out-of-band (R4)

```
[non-existent] --direct anchor (seal=SAID in KEL)--> [issued/anchored] (terminal)
[non-existent] --indirect anchor (rip in KEL)--> [issued]
[issued] --TEL revocation (anchored in KEL)--> [revoked] (terminal)
```

### TEL Observers (No-Phone-Home Validation)

| Rule | Property |
|------|----------|
| R6 | TEL Observer masks ACDC usage from Issuer; validator queries Observer, not Registrar, at PoV |
| R7 | Observer-Registrar interactions occur at state changes, not at PoV; prevents forced validator-to-issuer correlation |
| R8 | Race conditions MAY be mitigated via timed grace periods on revocations |

```
tel_observer_sync():
  1. [ ] On startup: download and cache Registries from Registrar
  2. [ ] Update via periodic polling OR pushed state updates
  3. [ ] MAY use batch sync (state changes are rare)
  4. [ ] Implement timed grace periods on revocations (effective after delay)
  5. [ ] At PoV: Validator queries Observer (never Registrar)
```

Key privacy property: Observer-Registrar sync at state-change time, not PoV time.
