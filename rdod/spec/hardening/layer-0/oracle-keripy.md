# Oracle-keripy Findings -- Layer 0

## Summary
- Questions addressed: 23
- HIGH confidence: 16
- MEDIUM confidence: 5
- LOW/ambiguous: 2

## Findings

---

### OQ-15: Idempotent duplicate event handling -- accumulate signatures or discard?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:4011-4029` -- `Kevery.processEvent()`
- **Code evidence:**
```python
if eserder.said == said:  # event is a duplicate but not duplicitous
    # may have attached valid signature not yet logged
    # raises ValidationError if no valid sig
    kever = self.kevers[pre]  # get key state
    sigers, indices = verifySigs(raw=serder.raw, sigers=sigers, verfers=eserder.verfers)
    wigers, windices = verifySigs(raw=serder.raw, sigers=wigers, verfers=eserder.berfers)
    if sigers or wigers:  # at least one verified sig or wig so log evt
        # this allows late arriving witness receipts or controller
        # signatures to be added to the databse
        # Not first seen version of event so ignore return
        # idempotent update db logs
        kever.logEvent(serder, sigers=sigers, wigers=wigers)
```
- **Domain rule:** When a duplicate event (same SAID) arrives for an already-accepted event, new valid signatures ARE accumulated into the existing event via idempotent log update. The duplicate is NOT silently discarded. Both controller signatures and witness signatures are verified and merged. This applies to both inception duplicates (line 4011) and post-inception duplicates (line 4093). The `logEvent` call uses `first=False` (default), meaning no new fn is assigned -- only signatures are added.
- **Spec change required:** The identity/establishment validation FSM should clarify that `accepted` for same-SAID duplicates means "signatures merged into existing event" not "discarded." Add a `merge_signatures` transition for the `sn < expected, same SAID` case.

---

### OQ-16: Local vs remote source distinction mechanism
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:3789-3860` -- `Kevery.__init__()`, `keri/db/basing.py:209-220` -- `EventSourceRecord`
- **Code evidence:**
```python
# Kevery.__init__:
local (bool): True means event source is local (protected) for validation
             False means event source is remote (unprotected) for validation

# EventSourceRecord persists source per event:
# .esrs is named sub DB instance of Komer of EventSourceRecord
# Keeps track of the source of the event. When .local is Truthy the
# event was sourced in a protected way such as being generated
# locally or via a protected path. When .local is Falsey the event was
# NOT sourced in a protected way.
```
At `eventing.py:3937`: `local = local if local is not None else self.local` -- the per-event `local` parameter overrides the Kevery-level default. The `EventSourceRecord` is persisted to the `esrs` database per (prefix, SAID) so escrow processing can recover the original source designation (line 3338-3345).
- **Domain rule:** Local/remote is a per-event boolean metadata flag, set at the Kevery (processing facility) level as default and overridable per-event. It is NOT a transport-level concept -- it is a domain-level concept persisted alongside each event. "Local protected channel" means the event was generated or received through a path the controller trusts (e.g., same process, authenticated local API). The flag is stored in `EventSourceRecord.local` and survives escrow round-trips. Local can upgrade remote (line 3339: `if local and not esr.local`) but not vice versa.
- **Spec change required:** The identity/establishment domain should define `EventSource` as a domain type with `local: boolean` semantics. The MisfitEventSourceError should reference this type. Add that local can promote remote but not the reverse.

---

### OQ-17: First-seen ordinal -- global counter or per-AID counter?
- **Confidence:** HIGH
- **Source:** `keri/db/basing.py:185-206` -- `.fels` and `.fons` database definitions, `keri/core/eventing.py:3349` -- `logEvent()`
- **Code evidence:**
```python
# basing.py:185-195
# .fels is named sub DB instance of OnSuber for first seen event logs (FEL)
#     DB is keyed by identifier prefix plus monotonically increasing first
#     seen order number fn.
#     Provides append-only ordering of accepted first seen events.

# eventing.py:3349
fn = self.db.fels.appendOn(keys=serder.preb, val=serder.saidb)
```
The `fels` database is keyed by `(prefix, fn)` where `fn` is assigned by `appendOn` which is an auto-incrementing counter per prefix key. Each prefix has its own independent fn counter starting from 0.
- **Domain rule:** The first-seen ordinal (fn) is a PER-AID monotonic counter, NOT a global counter. Each identifier prefix has its own independent fn sequence. fn=0 is the first accepted event for that AID. The fn provides ordering of accepted events within a single identifier's history, including across recovery forks (superseded events retain their fn but get new fn for superseding events). BADA comparisons and staleness detection use (sn + datetime), not fn directly.
- **Spec change required:** The identity/state domain should clarify that `first_seen_sn` is per-AID, not global. The `field_seen_sn` field name is appropriate. Remove any language suggesting global ordering via fn.

---

### OQ-18: WriteOutcome.accepted -- boolean first_seen vs integer first_seen_number
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:3281-3370` -- `Kever.logEvent()`
- **Code evidence:**
```python
def logEvent(self, serder, sigers=None, wigers=None, wits=None, first=False, ...):
    fn = None  # None means not a first seen log event so does not return an fn
    ...
    if first:  # append event dig to first seen database in order
        fn = self.db.fels.appendOn(keys=serder.preb, val=serder.saidb)
        ...
    return (fn, nowdater.dts)  # (fn int, dts str) if first else (None, dts str)
```
The `first` parameter controls whether an fn is assigned. When `first=True`, the return is `(fn_integer, dts_string)`. When `first=False` (duplicate sig accumulation), return is `(None, dts_string)`. The caller (e.g., `Kever.__init__` at line 1754) checks `if fn is not None` to determine first-seen status.
- **Domain rule:** The commit result carries BOTH: a nullable integer fn (None if not first-seen, integer if first-seen) and a datetime string. The boolean `first_seen` concept is derivable from `fn is not None`. The DDD spec should use `first_seen_number: integer | null` where null means "not first seen (duplicate signature accumulation)." The boolean is implicit.
- **Spec change required:** Normalize WriteOutcome.accepted and ValidationResult.accepted to both carry `first_seen_number: integer | null`. Remove the boolean `first_seen` field -- it is redundant with null-checking the ordinal.

---

### OQ-19: Validation pipeline -- strictly sequential or parallelizable?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2408-2612` -- `Kever.valSigsWigsDel()`
- **Code evidence:** The validation method `valSigsWigsDel` executes checks in strict sequential order:
1. Signature verification (line 2472: `verifySigs`)
2. Misfit check (line 2482-2509: local/remote source validation)
3. Signing threshold check (line 2510-2524: `tholder.satisfy`)
4. Prior next rotation threshold check (line 2527-2540: `ntholder.satisfy` for rot/drt)
5. Witness threshold check (line 2546-2573: `toader.num` check)
6. Delegation check (line 2576-2612: `validateDelegation`)

Each step can escrow the event and raise an exception, short-circuiting further checks. The order matters: signature verification must precede threshold checks, and threshold checks must precede delegation validation.
- **Domain rule:** The validation pipeline is STRICTLY SEQUENTIAL with short-circuit on escrow. Each check can escrow the event and halt further evaluation. The order is: (1) signature verification, (2) misfit/source check, (3) signing threshold, (4) prior-next threshold (rotation only), (5) witness threshold, (6) delegation validation. Parallelization of steps 5 and 6 is NOT safe because step 5 can escrow to PWE while step 6 can escrow to PDE -- and only one escrow decision should be made per processing pass.
- **Spec change required:** The validation constraint DAG should be redrawn as a sequential pipeline, not a parallel branching graph. The ordering matters for escrow routing: the first unsatisfied check determines the escrow queue.

---

### OQ-20: Key exposure detection -- who checks and when?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2617-2661` -- `Kever.exposeds()`
- **Code evidence:**
```python
def exposeds(self, sigers):
    """Returns list of ondices (indices) suitable for Tholder.satisfy
    from self.ndigers (prior next key digests) as exposed by event sigers.
    ...
    A key given by siger.verfer (at siger.index in the current key list)
    may expose a prior next key hidden by the diger at siger.ondex in .digers.
    """
    odxs = []
    for siger in sigers:
        diger = self.ndigers[siger.ondex]
        kdig = Diger(ser=siger.verfer.qb64b, code=diger.code).qb64
        if kdig == diger.qb64:
            odxs.append(siger.ondex)
    return odxs
```
Called at line 2530 during `valSigsWigsDel` for rotation events. The `exposeds` method checks whether the signing keys on a rotation event match the pre-committed next-key digests. This is NOT "key exposure detection" in the security sense -- it is the mechanism by which rotation events prove they control the pre-committed keys. There is no separate check that prevents a pre-committed key from appearing in a signing key list before its activation rotation.
- **Domain rule:** Key "exposure" in keripy is the rotation-time verification that signing keys match pre-committed digests -- it is part of the rotation validation pipeline (step 4 in the sequential pipeline). There is NO separate key-exposure attack detection check that prevents pre-committed keys from appearing prematurely. The protection is structural: pre-committed keys are digests, so an attacker cannot use them as signing keys without first performing a rotation that exposes them.
- **Spec change required:** Remove KeyExposureError from the identity/key-commitment domain or redefine it as a builder-time constraint (during event construction, not validation). The validation pipeline does not check for premature key exposure -- the digest-based commitment makes it structurally impossible.

---

### OQ-21: Consumed-digest tracking -- explicit persistent set or KEL-derived?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2180-2187` -- `Kever.update()`, `keri/core/eventing.py:2327-2330` -- `Kever.rotate()`
- **Code evidence:**
```python
# After successful rotation (update, line 2186):
self.ndigers = serder.ndigers  # updates to NEW next-key digests

# At rotation validation (rotate, line 2327):
if not self.ndigers:  # prior next list is empty so rotations not allowed
    raise ValidationError("Attempted rotation for nontransferable prefix")
```
The consumed-digest tracking is IMPLICIT through KEL-derived state. `self.ndigers` always holds the CURRENT set of next-key digests from the latest establishment event. When a rotation occurs, `self.ndigers` is overwritten with the new event's `ndigers`. The old digests are not explicitly tracked as "consumed" -- they simply no longer exist in the current state. The KEL itself (append-only) preserves the history, so traversal can reconstruct which digests were used at each rotation.
- **Domain rule:** Consumed-digest tracking is IMPLICIT through current key state, not an explicit persistent set. The `ndigers` field on key state always reflects the next-key digests from the latest establishment event. Once a rotation consumes pre-committed digests, the state updates to the new next-key set. "One-time use" is enforced by the fact that each rotation event's signing keys must match the CURRENT ndigers (from the immediately prior establishment event), and the state advances after acceptance.
- **Spec change required:** The identity/key-commitment domain should NOT define a separate consumed-digest repository. Instead, document that consumed-digest enforcement is implicit in the key state progression: each rotation's `n` field becomes the next `ndigers` to be consumed.

---

### OQ-22: Partial rotation -- can new signing keys include keys NOT from the pre-committed set?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2527-2540` -- rotation threshold check, `keri/core/eventing.py:2617-2661` -- `exposeds()`
- **Code evidence:**
```python
# Line 2530-2531: check prior next threshold
ondices = self.exposeds(sigers)
if not self.ntholder.satisfy(indices=ondices):
    # escrow to PSE
```
The `exposeds()` method extracts ondices ONLY for signers whose keys match prior next-key digests. The signing threshold (`tholder.satisfy`) is checked separately against ALL signing keys (line 2510-2524) regardless of whether they match prior digests. The prior-next threshold (`ntholder.satisfy`) only needs a SUBSET of signers to match digests.

Critically, the new signing key list (`serder.verfers`/`serder.keys`) is NOT validated against the prior next-key set at all -- only the SIGNATURES are checked. New signing keys can be completely new keys with no corresponding prior digest. What matters is: (1) enough signatures satisfy the signing threshold, and (2) enough of those signatures expose prior next-key digests to satisfy the next-key threshold.
- **Domain rule:** In a partial rotation, the new signing key list CAN include entirely new keys that have no corresponding prior next-key digest. The constraint is on SIGNATURES, not on keys: enough signatures must expose prior next-key digests to satisfy the prior next-key threshold. A rotation could include 5 new signing keys where only 2 match prior digests, as long as those 2 satisfy the next-key threshold. The other 3 keys are freely chosen.
- **Spec change required:** The identity/key-commitment domain should clarify that the pre-rotation commitment constrains which SIGNATURES are required, not which keys can appear. New signing keys are unconstrained; the constraint is that enough signers must also expose pre-committed digests.

---

### OQ-23: Pre-rotation binding -- positional or cross-position via ondex?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2617-2661` -- `Kever.exposeds()`
- **Code evidence:**
```python
for siger in sigers:
    try:
        diger = self.ndigers[siger.ondex]  # ondex indexes into prior next digests
    except TypeError as ex:  # ondex may be None
        continue
    ...
    kdig = Diger(ser=siger.verfer.qb64b, code=diger.code).qb64
    if kdig == diger.qb64:
        odxs.append(siger.ondex)
```
The `siger.ondex` is the index into the PRIOR next-key digest list (`self.ndigers`), while `siger.index` is the index into the CURRENT signing key list. These can differ -- a signer at current index 2 can have ondex 0, meaning key[2] exposes digest[0]. This is explicit cross-position matching via the dual-index Siger mechanism.
- **Domain rule:** Pre-rotation binding uses CROSS-POSITION matching via the Siger ondex mechanism. A signing key at index `i` in the current key list can match a pre-committed digest at ondex `j` in the prior next-key list, where `i != j`. The ondex is carried by the indexed signature itself (Siger dual-index codes like 2A). Positional matching (key[i] matches digest[i]) is just the special case where index == ondex.
- **Spec change required:** The identity/key-commitment BindingVerification type should use `(index, ondex, expected_digest, computed_digest)` tuples, not just `(index, expected_digest, computed_digest)`. The ondex is essential for cross-position matching.

---

### OQ-24: Delegation seal in inception events -- valid or only in rot/ixn?
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:649-663` -- `incept()` function
- **Code evidence:**
```python
ked = dict(v=vs, t=ilk, d="", i="", s=sner.numh,
           kt=..., k=keys,
           nt=..., n=ndigs,
           bt=..., b=wits,
           c=cnfg,
           a=data,  # list of seal dicts
           )
```
The inception event builder includes an `a` (anchor/seal) field that accepts a list of seal dicts. This is true for both `icp` and `dip` events (since `dip` is just `incept()` with `delpre` set). The delegator approves a delegation by anchoring a seal of the delegated event in their OWN KEL -- this seal can appear in any event type including inception, since the delegator's inception event can contain seals in its `a` field. However, in practice, a delegator must exist before it can approve a delegation, so the delegator's inception only matters if it is simultaneously approving a delegation (which is valid but unusual).
- **Domain rule:** A delegation approval seal CAN appear in any event type including inception events. The inception event's `a` field accepts arbitrary seal data. However, the delegator must already exist (have an accepted inception) before the delegatee's delegation can be validated. So while a delegator's inception CAN contain a delegation seal, it would only be meaningful if the delegator is simultaneously being created and approving a delegation in the same event -- which is architecturally valid.
- **Spec change required:** The delegation/authorization UL should say "interaction event (ixn), rotation event (rot), or inception event (icp)" for where delegation seals may appear. In practice, icp is rare but protocol-valid.

---

### OQ-44: BADA staleness logic -- public interface or internal mechanism?
- **Confidence:** HIGH
- **Source:** `keri/core/routing.py:198-289` -- `Revery.acceptReply()`
- **Code evidence:**
```python
def acceptReply(self, serder, saider, route, aid, osaider=None, cigars=None, tsgs=None):
    """Applies Best Available Data Acceptance policy to reply and signatures
    ...
    BADA (Best Available Data Acceptance) model for each reply message.
    Latest-Seen-Signed Pairwise comparison of new update reply compared to
    old already accepted reply from same source for same route (same data).
    Accept new reply (update) if new reply is later than old reply where:
        1) If transferable: Later is True
             A) sn of est evt for new sigs > sn of est evt for old sigs
             Or
             B) sn equal And date-time-stamp of new > old
        2) Else If non-transferable: Later is True
             If date-time-stamp of new > old
    """
```
BADA is implemented as a public method on the `Revery` class, called by Kevery's reply processing methods (e.g., `processReplyEndRole` at line 4698, `processReplyLocScheme` at line 4799). It is a distinct, callable service.
- **Domain rule:** BADA is a PUBLIC interface (method on the Revery service), not an internal implementation detail. It is called explicitly by reply processing logic to decide whether to accept a new reply over an existing one. The comparison uses (sn of endorser's establishment event + datetime) for transferable endorsers, and (datetime only) for non-transferable. BADA is specific to reply messages (`rpy` ilk), not to key events.
- **Spec change required:** The identity/state domain should expose BADA as an explicit port operation for reply acceptance, not bury it as internal commit logic. It applies to reply messages, not key events. Consider whether BADA belongs in identity/state or a separate "reply routing" domain.

---

### OQ-45: State-read-model consistency guarantee after escrow promotions
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:5586-5607` -- `Kevery.processEscrows()`, `keri/core/eventing.py:2174-2199` -- `Kever.update()`
- **Code evidence:**
When an escrowed event is promoted, it is reprocessed via `self.processEvent()` (e.g., line 5693 in OOE processing, line 6535 in delegable processing). `processEvent` calls `Kever.update()` which calls `logEvent()` with `first=True`, and then immediately updates the in-memory Kever state (lines 2181-2199):
```python
self.sner = sner
self.serder = serder
self.tholder = tholder
self.verfers = serder.verfers
...
self.db.states.pin(keys=self.prefixer.qb64, val=self.state())
```
The `states.pin` writes the updated state to the database immediately. The in-memory kevers dict is also updated immediately since it holds references to the Kever objects.
- **Domain rule:** State is IMMEDIATELY consistent after escrow promotion. When an escrowed event is promoted, it goes through the full `processEvent` -> `Kever.update()` -> `logEvent()` path, which updates both the in-memory kever state and the persistent `.states` database synchronously in the same call. There is no staleness window. All operations are single-threaded within a Kevery processing pass.
- **Spec change required:** The identity/state domain can assert immediate consistency. The "immediately consistent" claim in the state-read-model port is correct. No staleness window exists.

---

### OQ-46: KEL repository append-only invariant vs escrow pruning
- **Confidence:** HIGH
- **Source:** `keri/db/basing.py:160-195` -- `.kels` and `.fels` definitions, `keri/core/eventing.py:5647-5688` -- escrow processing with `remOn`
- **Code evidence:**
```python
# basing.py - KEL is append-only:
# .kels - DB is keyed by identifier prefix plus sequence number
# .fels - Provides append-only ordering of accepted first seen events.

# eventing.py - escrows are pruned on timeout or success:
# Line 6504 (delegable escrow): timeout check
# Line 6548: self.db.delegables.rem(keys=(pre, sn,), val=edig)  # removes one escrow
# Line 5647: self.db.ooes.getOnItemIterAll()  # OOE escrow iteration
```
The `.kels` (KEL) and `.fels` (FEL) databases are append-only. Escrow databases (`.ooes`, `.pses`, `.pwes`, `.ldes`, `.delegables`, etc.) are separate databases that support add, get, and remove operations. Timed-out escrow entries are removed by raising a ValidationError in escrow processing which triggers removal in the except block.
- **Domain rule:** The append-only invariant applies ONLY to the accepted KEL (`.kels`) and the first-seen event log (`.fels`). Escrow queues are separate databases that support full CRUD: add (on escrow), get/iterate (on sweep), and remove (on promotion or timeout). Pruning timed-out events from escrow queues does NOT violate the append-only invariant because escrows are NOT part of the KEL.
- **Spec change required:** The identity/state domain should explicitly distinguish "accepted KEL" (append-only) from "escrow queues" (add/remove). The kel-repository port should document that append-only applies to the committed log, while the escrow-drain port operates on mutable queues.

---

### OQ-47: Delegable event escrow promotion path
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:6460-6558` -- `Kevery.processEscrowDelegables()`
- **Code evidence:**
```python
# Line 6531-6537: When delegation seal is found:
if (duple := self.db.aess.get(keys=(pre.encode("utf-8"), edig))) is not None:
    delnum, diger = duple
    # process event
    self.processEvent(serder=eserder, sigers=sigers, wigers=wigers,
                      delnum=delnum, deldiger=diger, local=esr.local)
else:
    raise MissingDelegableApprovalError("No delegation seal found for event.")
```
When promoted from the delegable escrow, the event goes DIRECTLY to `processEvent()` with the delegation seal attached. `processEvent` then runs the full validation pipeline which can result in either direct KEL acceptance (if all thresholds are met) or escrow to another queue (e.g., PSE if signatures are insufficient, PWE if witness receipts are insufficient, PDE if the delegator's KEL is not yet available).
- **Domain rule:** When a delegable event is promoted, it goes through the FULL validation pipeline via `processEvent()`, not directly to PDE or KEL. The outcome depends on the event's current state: if the delegation seal is found AND all other thresholds are met, the event goes directly to the KEL. If other conditions are unmet, it may escrow to PSE, PWE, or PDE. There is no mandatory PDE intermediate step.
- **Spec change required:** The delegation/lifecycle UL should say "promoted to full re-validation via the validation pipeline" not "promoted to PDE or directly to KEL." The shortcut is real -- PDE is not mandatory.

---

### OQ-48: Delegator key rotation effect on PDE seal validity
- **Confidence:** MEDIUM
- **Source:** `keri/core/eventing.py:2664-2912` -- `Kever.validateDelegation()`, `keri/db/basing.py:256-259` -- `.aess` database
- **Code evidence:**
```python
# basing.py:256-259
# .aess is named sub DB instance of CatCesrSuber for authorizing event
#     source seal couples that map digest of key event to seal source
#     couple of authorizer's (delegator or issuer) event.
```
The delegation source seal is stored as a `(Number, Diger)` couple representing the (sequence number, SAID) of the delegator's event that contains the approval seal. This binds the seal to a SPECIFIC event in the delegator's KEL, not to the delegator's current key state. The `validateDelegation` method searches the delegator's KEL for a seal matching the delegated event -- this search is by event content (seal matching), not by key state.
- **Domain rule:** The delegation seal is bound to a SPECIFIC event in the delegator's KEL (identified by sn + SAID), not to the delegator's current key state. A delegator key rotation does NOT invalidate existing delegation seals because seals are anchored in committed events which are immutable. The seal's validity depends on the delegating event remaining in the delegator's accepted KEL, not on the delegator's current signing keys.
- **Spec change required:** The delegation/lifecycle domain should clarify that delegation seals are event-bound, not key-state-bound. A delegator rotation has no effect on already-anchored seals.

---

### OQ-49: Siger dual-indexed code encoding -- index/ondex split in soft part
- **Confidence:** HIGH
- **Source:** `keri/core/indexing.py:195-215` -- `Indexer.Sizes` table
- **Code evidence:**
```python
Sizes = {
    'A': Xizage(hs=1, ss=1, os=0, fs=88, ls=0),   # 1-char code, 1 soft, no ondex
    '0A': Xizage(hs=2, ss=2, os=1, fs=156, ls=0),  # 2-char code, 2 soft, 1 ondex
    '2A': Xizage(hs=2, ss=4, os=2, fs=92, ls=0),   # 2-char code, 4 soft, 2 ondex
    '3A': Xizage(hs=2, ss=6, os=3, fs=160, ls=0),  # 2-char code, 6 soft, 3 ondex
}
# where ss includes os, so main index size ms = ss - os
```
For dual-indexed codes:
- `0A##`: ss=2, os=1 -- soft part is 2 chars total: 1 char main index + 1 char ondex
- `2A####`: ss=4, os=2 -- soft part is 4 chars total: 2 chars main index + 2 chars ondex
- `3A######`: ss=6, os=3 -- soft part is 6 chars total: 3 chars main index + 3 chars ondex

The split is SYMMETRIC: main index size (ms = ss - os) always equals ondex size (os). The main index comes first in the soft part, followed by the ondex.
- **Domain rule:** Siger dual-indexed codes split the soft part SYMMETRICALLY between index and ondex. For code `2A` with ss=4 and os=2: the soft part is 4 B64 chars, first 2 chars encode the main index, last 2 chars encode the ondex. For code `0A` with ss=2 and os=1: first 1 char is index, last 1 char is ondex. The formula is: `ms = ss - os` for main index size, `os` for ondex size.
- **Spec change required:** The cesr/primitives domain should document the Xizage formula: `ms = ss - os`, with the soft part layout being `[index_chars(ms)][ondex_chars(os)]`.

---

### OQ-50: Tholder.satisfy() ownership -- encoding only or satisfaction logic too?
- **Confidence:** HIGH
- **Source:** `keri/core/coring.py:4344-4849` -- `Tholder` class with `satisfy()` method
- **Code evidence:**
```python
class Tholder:
    """Tholder is KERI Signing Threshold Satisfaction class
    .satisfy method evaluates satisfaction based on ordered list of indices of
    verified signatures.
    """
    def satisfy(self, indices):
        """Returns True if indices list of verified signature key indices satisfies
        threshold, False otherwise."""
        return (self._satisfy(indices=indices))

    def _satisfy_weighted(self, indices):
        """Returns True if satisfies fractional weighted threshold..."""
        for clause in self.thold:
            cw = 0
            for e in clause:
                ...
            if cw < 1:  # each clause must sum to at least 1
                return False
        return True  # all clauses have cw >= 1, AND true
```
Tholder lives in `coring.py` (the CESR primitives module) and owns BOTH the encoding/decoding (via `Bexter` for weighted, `Number` for numeric) AND the satisfaction logic (`satisfy()`, `_satisfy_numeric()`, `_satisfy_weighted()`).
- **Domain rule:** In keripy, Tholder owns BOTH encoding and satisfaction logic. The `satisfy()` method is a core part of the Tholder class, not delegated to a separate domain. For weighted thresholds, satisfaction requires ALL clauses to sum to >= 1 (AND semantics across clauses). This is non-trivial domain logic that lives alongside the CESR encoding.
- **Spec change required:** The cesr/primitives domain should own Tholder INCLUDING `satisfy()`. The identity/thresholds domain should import and use Tholder's satisfy method rather than re-implementing satisfaction logic. Alternatively, if the DDD spec wants to keep cesr/primitives as pure codec, it must acknowledge that this is a deviation from keripy's architecture.

---

### OQ-51: Mid-padding algorithm for qb64 encoding
- **Confidence:** HIGH
- **Source:** `keri/core/coring.py:1303-1362` -- `Matter._infil()`
- **Code evidence:**
```python
def _infil(self):
    # For fixed size:
    ps = (3 - ((rs + ls) % 3)) % 3  # net pad size given raw with lead
    # Prepad raw so we midpad the full primitive. Prepad with ps+ls
    # zero bytes ensures encodeB64 of prepad+lead+raw has no trailing
    # pad characters. Finally skip first ps == cs % 4 of the converted
    # characters to ensure that when full code is prepended, the full
    # primitive size is fs but midpad bits are zeros.
    full = (both.encode("utf-8") + encodeB64(bytes([0] * (ps + ls)) + raw)[ps:])
```
The mid-padding algorithm:
1. Compute pad size: `ps = (3 - ((rs + ls) % 3)) % 3`
2. Prepend `ps + ls` zero bytes to raw
3. Base64-encode the prepended bytes
4. Skip the first `ps` characters of the encoded result
5. Prepend the code string

The "mid-pad" refers to the fact that the zero-pad bytes end up BETWEEN the code and the raw material in the Base64 representation, not at the end (as trailing '=' pad chars would be in standard Base64).
- **Domain rule:** qb64 mid-padding works by prepending `(ps + ls)` zero bytes to raw material before Base64 encoding, then stripping the first `ps` characters of the encoded result. The code is prepended to the stripped result. This places zero-valued pad bits between the code and the raw data in the T-domain representation, avoiding trailing '=' characters. The formula is: `ps = (3 - ((raw_size + lead_size) % 3)) % 3`, and `ps` must equal `code_size % 4`.
- **Spec change required:** The cesr/primitives domain should include the mid-padding algorithm with this precise formula. This is foundational for every primitive's T-domain round-trip.

---

### OQ-52: Complete Sizage table for all code table entries
- **Confidence:** HIGH
- **Source:** `keri/core/coring.py:768-850` -- `Matter.Sizes`, `keri/core/indexing.py:195-215` -- `Indexer.Sizes`, `keri/core/counting.py` -- counter sizes
- **Code evidence:** The complete Sizage tables are defined as class-level dicts on `Matter` (for primitives), `Indexer` (for indexed signatures), and `Counter` (for count codes). Each entry maps a code string to a named tuple of sizes. The Matter.Sizes table has entries for all one-char codes (A-Z, a), all two-char codes (0A-0S), all four-char codes (1AAA-1AAP), all variable-size codes (4A-9AAC, etc.), and testing codes. The data is fully enumerated in code -- not derivable from a formula (though there are patterns in the size relationships).
- **Domain rule:** The Sizage table is EXPLICITLY ENUMERATED, not formula-derivable. Each code has its own (hs, ss, xs, fs, ls) tuple that must be looked up. However, there are patterns: one-char codes generally have ss=0 and fs=44 (for 32-byte raw), two-char codes with ss=0 have fs=88 (for 64-byte raw), etc. The complete table is the authoritative reference and must be replicated exactly in any implementation.
- **Spec change required:** The cesr/primitives domain should include the complete Sizage table as a reference artifact, extracted from keripy's `Matter.Sizes`. This is foundational data, not derivable.

---

### OQ-53: One-character code assignments beyond E
- **Confidence:** HIGH
- **Source:** `keri/core/coring.py:236-268` -- `MatterCodex`
- **Code evidence:** All 26 uppercase letters (A-Z) and lowercase 'a' are assigned:
```
A=Ed25519_Seed, B=Ed25519N, C=X25519, D=Ed25519, E=Blake3_256,
F=Blake2b_256, G=Blake2s_256, H=SHA3_256, I=SHA2_256, J=ECDSA_256k1_Seed,
K=Ed448_Seed, L=X448, M=Short, N=Big, O=X25519_Private,
P=X25519_Cipher_Seed, Q=ECDSA_256r1_Seed, R=Tall, S=Large, T=Great,
U=Vast, V=Label1, W=Label2, X=Tag3, Y=Tag7, Z=Tag11, a=Salt_256
```
Only lowercase 'a' is assigned from the lowercase range. Lowercase b-z are NOT assigned in the MatterCodex. However, the `Matter.Hards` table (line 766) maps ALL lowercase chars a-z to hs=1, meaning they are RESERVED (the parser recognizes them as one-char codes) even though they are not yet assigned to specific primitives.
- **Domain rule:** All 26 uppercase one-char codes (A-Z) are assigned. Only lowercase 'a' (Salt_256) is assigned from the lowercase range. Lowercase b-z are recognized by the parser as valid one-char code positions but are UNASSIGNED/RESERVED. The domain should distinguish between "unassigned but reserved" (b-z) and "invalid" in error handling.
- **Spec change required:** The cesr/primitives domain should list the complete one-char code assignment table and note that lowercase b-z are reserved but unassigned.

---

### OQ-54: Key derivation path offset formula
- **Confidence:** HIGH
- **Source:** `keri/app/keeping.py:506-533` -- `SaltyCreator.create()`
- **Code evidence:**
```python
def create(self, codes=None, count=1, code=MtrDex.Ed25519_Seed,
           pidx=0, ridx=0, kidx=0, transferable=True, temp=False, **kwa):
    stem = self.stem if self.stem else "{:x}".format(pidx)  # if not stem use pidx
    for i, code in enumerate(codes):
        path = "{}{:x}{:x}".format(stem, ridx, kidx + i)
        signers.append(self.salter.signer(path=path, ...))
```
The path formula is: `path = stem + hex(ridx) + hex(kidx + i)` where:
- `stem` is a user-provided string, or `hex(pidx)` if not provided
- `ridx` is the rotation index (which establishment event)
- `kidx` is the starting key index, `i` iterates per key in the set
- All hex values use lowercase, no leading zeros, no "0x" prefix

There is NO explicit `offset` calculation involving `transferable` or `icodes.count` in keripy's Keeper. That logic appears to be signify-ts specific.
- **Domain rule:** In keripy, the key derivation path is `stem + hex(ridx) + hex(kidx + i)`. The stem defaults to `hex(pidx)` when not explicitly set. There is no transferable/pidx offset calculation in the path itself -- that complexity lives in the caller (habbing.py) which computes the correct `kidx` to pass. The path formula is simple string concatenation of hex values.
- **Spec change required:** The signify-client/key-management domain should document the keripy formula as the reference, then note signify-ts's offset calculation as an implementation convenience that produces equivalent kidx values.

---

### OQ-55: DuplicityEventLog persistence -- who owns it?
- **Confidence:** HIGH
- **Source:** `keri/db/basing.py:413-421` -- `.ldes` database, `keri/core/eventing.py:5351-5379` -- `escrowLDEvent()`
- **Code evidence:**
```python
# basing.py:413-421
# .ldes is named sub DB instance of OnIoDupSuber for likely duplicitous
#     escrowed event tables that map identifier prefix plus sequence
#     number to serialized event digests.
#     DB is keyed by identifier prefix, ordinal is sequence number

# eventing.py:5351 (escrowLDEvent stores to .ldes)
# eventing.py:6937 (processEscrowDuplicitous reads from .ldes)
```
The likely-duplicitous event log (`.ldes`) is owned by the `Baser` database class (the central database) and managed by the `Kevery` class. It is a persistent LMDB sub-database, not an in-memory structure. The LDE escrow has a timeout of 3600 seconds (line 3815). Events in `.ldes` are pruned on timeout or on successful reprocessing.
- **Domain rule:** The duplicity event log IS persisted via the central database (Baser.ldes). It is owned by the database layer and managed by Kevery's escrow processing. The integrity/detection domain SHOULD have an outbound persistence port for DEL storage, as keripy implements it as a persistent database table.
- **Spec change required:** Add an outbound persistence port to the integrity/detection domain for DEL storage. The `.ldes` database in keripy proves that duplicity evidence requires persistent storage.

---

### OQ-91: Delegation source seal -- attachment or event body?
- **Confidence:** HIGH
- **Source:** `keri/core/counting.py:229-230` -- SealSourceCouples code, `keri/core/eventing.py:2576-2612` -- delegation validation, `keri/db/basing.py:256-259` -- `.aess` storage
- **Code evidence:**
```python
# counting.py:229-230
SealSourceCouples: str = '-S'  # Seal Source Couple(s), snu+dig of source sealing or sealed event.

# eventing.py:2587-2597 - delegation seal comes as (delnum, deldiger) parameters
if delnum is None or deldiger is None: # missing delegation seal
    self.escrowDelegableEvent(...)
    raise MissingDelegableApprovalError(msg)

# basing.py:256-259 - stored in .aess database
# .aess maps digest of key event to seal source couple of authorizer's event
```
The delegation source seal travels as a CESR attachment (SealSourceCouples `-S` group code), consisting of a Seqner (sequence number) + Saider (SAID) couple. It does NOT appear in the event body. The `processEvent` method receives it as separate parameters (`delnum`, `deldiger`) parsed from the attachment stream. It is stored in the `.aess` database keyed by the delegated event's (prefix, SAID).
- **Domain rule:** The delegation source seal is a CESR ATTACHMENT (SealSourceCouples, code `-S`), not part of the event body. It consists of a (Seqner, Diger) couple identifying the delegator's event that contains the approval seal. For the DDD spec, this means the source seal belongs to the CESR attachment/composition type system, not the delegation/authorization event-body type system.
- **Spec change required:** The delegation/authorization domain should define the source seal as an attachment type (CESR couple), not an event body field. The event body has `di` (delegator prefix) but the source seal couple is external to the event.

---

### Bonus Findings for HIGH-priority spec-targeted questions

### Bonus for OQ-5 (PDE vs MDE distinction):
- **Confidence:** MEDIUM
- **Source:** `keri/kering.py:666-802` -- error classes, `keri/core/eventing.py:6043-6200` -- `processEscrowPartialDels`
- keripy has `MissingDelegationError` (line 666) for PDE and `MissingDelegableApprovalError` (line 802) for delegable events. There is no separate "MDE" error class. The distinction in keripy is: PDE = "the delegator's KEL event containing the approval seal has not been found yet" (remote validator perspective). Delegable = "the local delegator has not yet created the approval event" (local delegator perspective). Both map to missing delegation seal -- the difference is the party's role (remote vs local).

### Bonus for OQ-7 (Delegation escrow timeout 3600s vs 86400s):
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:3812-3820` -- Kevery timeout constants
- keripy defines: `TimeoutOOE = 1200`, `TimeoutPSE = 3600`, `TimeoutPWE = 3600`, `TimeoutLDE = 3600`. There is NO separate PDE timeout constant -- the delegable escrow uses `TimeoutOOE = 1200` (line 6504: `self.TimeoutOOE`). The 86400s (24h) value does NOT appear anywhere in keripy. The authoritative timeout for delegation-related escrows in keripy is 1200s (delegable) and 3600s (partial delegation via PSE).

### Bonus for OQ-9 (Non-transferable identifiers and interaction events):
- **Confidence:** HIGH
- **Source:** `keri/core/eventing.py:2130-2132` -- `Kever.update()`
```python
if not self.transferable:  # not transferable so no further events allowed
    raise ValidationError("Unexpected event = {} is nontransferable or abandoned state.")
```
- Non-transferable identifiers CANNOT produce any further events (neither rotation nor interaction). The check is absolute: `self.transferable` is False when the ndigers list is empty, and ANY event type is rejected.
