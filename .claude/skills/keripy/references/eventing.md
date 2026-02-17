# eventing — Event Creation, Kever, Kevery

> Event model, validation rules, key state semantics: see spec skill.

**Source:** `core/eventing.py`

## Event Creation Functions

- `incept(keys, isith?, ndigs?, nsith?, toad?, wits?, cnfg?, data?, delpre?) -> SerderKERI` (icp/dip)
- `delcept(keys, delpre, **kwa) -> SerderKERI` (dip) — convenience wrapper
- `rotate(pre, keys, dig, ilk?, sn?, isith?, ndigs?, nsith?, toad?, wits?, cuts?, adds?, data?) -> SerderKERI` (rot/drt)
- `deltate(pre, keys, dig, ilk=Ilks.drt, **kwa) -> SerderKERI` (drt) — convenience wrapper
- `interact(pre, dig, sn?, data?) -> SerderKERI` (ixn)
- `receipt(pre, sn, said) -> SerderKERI` (rct)
- `state(pre, sn, pig, dig, fn, eilk, keys, eevt, ...) -> KeyStateRecord`
- `query(pre?, route?, query?) -> SerderKERI` (qry)
- `reply(pre?, route?, data?) -> SerderKERI` (rpy)
- `prod(...) -> SerderKERI` (pro), `bare(...) -> SerderKERI` (bar)
- `exchept(...) -> SerderKERI` (xip, v2), `exchange(...) -> SerderKERI` (exn)
- `messagize(serder, sigers?, seal?, wigers?, cigars?, pipelined?) -> bytearray`

## Kever — Key Event Verifier

KEL state machine for one identifier. Init from `state` (reload) or `serder`+`sigers` (inception).

**Attributes:** prefixer, sner, fner, dater, serder, ilk, tholder, verfers, ndigers, ntholder, toader, wits, cuts, adds, lastEst (LastEstLoc), delegated, delpre, estOnly, doNotDelegate, db

**Properties:** sn, fn, ndigs, kevers, prefixes, groups, transferable

**Methods:** incept, update, rotate, deriveBacks, valSigsWigsDel, exposeds, validateDelegation, locallyOwned, locallyDelegated, locallyWitnessed, locallyMembered, locallyContributedIndices, reload, config

## Kevery — Key Event Message Processor

Kever factory and escrow manager. Creates/updates Kevers from message streams. Modes: lax (promiscuous), local (protected source), cloned (attached datetimes), direct (cue receipts/queries), check (read-only).

**Processing:** processEvent, processReceipt, processAttachedReceiptCouples, processAttachedReceiptQuadruples, processQuery

**Reply routes:** processReplyEndRole (/end/role/*), processReplyLocScheme (/loc/scheme), processReplyKeyStateNotice (/ksn), processReplyAddWatched (/watcher/*/add)

**Updates:** updateEnd, updateLoc, updateKeyState, removeKeyState, updateWatched

**Escrows:** processEscrows (iterates all), processEscrowOutOfOrders, processEscrowPartialSigs, processEscrowPartialWigs, processEscrowPartialDels, processEscrowUnverWitness, processEscrowUnverNonTrans, processEscrowUnverTrans, processEscrowDelegables, processEscrowDuplicitous, processQueryNotFound

**Escrow storage:** escrowMFEvent, escrowOOEvent, escrowQueryNotFoundEvent, escrowLDEvent, escrowUWReceipt, escrowUReceipt, escrowTRGroups, escrowTReceipts, escrowTRQuadruple

**Helpers:** fetchEstEvent, fetchWitnessState, removeStaleReplyEndRole, removeStaleReplyLocScheme, duplicity

## Kever/Kevery Relationship

Kevery creates one Kever per prefix (stored in db.kevers). processEvent creates Kever on inception, calls kever.update on subsequent events. Incomplete events get escrowed; processEscrows retries them. Kever validates, Kevery generates cues (receipts, queries, notices).

## Helper Functions

**Threshold:** simple(n) -> majority, ample(n, f?, weak?) -> Byzantine threshold
**Signature validation:** verifySigs(raw, sigers, verfers), validateSigs(serder, sigers, verfers, tholder)
**Attachment extraction:** deWitnessCouple, deReceiptCouple, deSourceCouple, deReceiptTriple, deTransReceiptQuadruple, deTransReceiptQuintuple
**Other:** fetchTsgs(db, saider), loadEvent(db, preb, dig)

## Defaults and Config

Defaults: isith/nsith=ceil(n/2), toad=ample(wits), version=Vrsn_2_0, kind=JSON
Timeouts (seconds): OOE=1200, PSE/PWE/LDE/UWE/URE/VRE/KSN=3600, QNF=300
Config traits: "EO" (EstOnly), "DND" (DoNotDelegate)
