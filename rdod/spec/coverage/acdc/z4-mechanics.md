# Z4 — Mechanics: ACDC Specification

## Operator, `o` field — Edge-group
**Sentence:** The `o` field in an Edge-group holds an m-ary Operator (AND, OR, NAND, NOR, AVG, WAVG) aggregating nested Edge/Edge-group validity; defaults to AND when absent.
**Score:** fluent

## Weight, `w` field — Edge-group
**Sentence:** The `w` field is an optional weight for weighted Operators like WAVG; MUST NOT appear on the top-level Edge Section Edge-group.
**Score:** fluent

## Node, `n` field
**Sentence:** The required `n` field holds the SAID of the far-node ACDC; a Validator MUST confirm the provided far-node ACDC SAID matches and satisfies its Schema.
**Score:** fluent

## Schema, `s` field — Edge
**Sentence:** The optional `s` field constrains the far-node ACDC to satisfy an additional Schema; when it differs from the far-node's own Schema, two separate validations are performed.
**Score:** fluent

## Operator, `o` field — Edge
**Sentence:** The `o` field holds unary Operators (I2I, NI2I, DI2I, NOT); defaults to I2I for Targeted far-nodes and NI2I for untargeted; latest in list takes precedence on conflict.
**Score:** fluent

## Legal, `l` Field
**Sentence:** The `l` field carries the legal language clause string; required in every Rule, optional in Rule-groups; a Rule with only `l` may use Simple Compact Rule form.
**Score:** fluent

## TEL field descriptions
**Sentence:** TEL event fields: Version String `v`, Message type `t`, SAID `d`, UUID `u` (blinding), Issuer `i`, Registry SAID `rd` (binding TEL to Registry Inception).
**Score:** fluent

## Blinded Attribute Block field details
**Sentence:** The Blinded Attribute Block is a fixed-field CESR concatenation [d (BLID), u (UUID/salt), td (ACDC SAID), ts (transaction state)] whose labels are virtual (mnemonic only, never serialized); transmitted as a BlindedStateQuadruples CESR attachment.
**Score:** awkward
**Finding:** ACDC-Z4-001 — No UL term for "virtual label" or "fixed-field block" — the structural distinction from normal SAD field maps is unnamed. Proposed: **FixedFieldBlock** or **VirtualLabeledBlock**.

## Calculating SAID of serialized Blinded Attribute Block
**Sentence:** The BLID is computed by replacing the `d` field slot with dummy `#` characters, appending remaining CESR Text-domain serializations in order, computing the BLAKE3-256 digest, and substituting it for the dummies.
**Score:** awkward
**Finding:** ACDC-Z4-002 — The fixed-field SAID computation variant (BLID) has no UL term distinct from standard SAID. Proposed: **FixedFieldSAID** or **BLIDComputation**.

## Bound Issuee fields — `bn` and `bd`
**Sentence:** `bn` holds the CESR-encoded sequence number of the Issuee's current KEL key event at publication time; `bd` holds the SAID of that event; together they bind Credential State to Issuee key state; placeholder values (MAAA for bn, 1AAP for bd) used before binding.
**Score:** fluent

## ACDC as top-level field map in CESR native format
**Sentence:** An `acm` message in CESR native format uses `-G##` or `--G#####` count codes; fields in fixed order [v, t, d, u, i, rd, s, a, A, e, r] with required [v, t, d, i, s].
**Score:** fluent

## Section Message Types
**Sentence:** Section Messages (sch, att, agg, edg, rul) allow independent transmission of ACDC sections; the embedded section block's SAID MUST match the corresponding compact ACDC field value via the Most Compact Form algorithm.
**Score:** fluent
