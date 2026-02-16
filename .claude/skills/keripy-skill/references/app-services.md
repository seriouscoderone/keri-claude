# app-services — Habery, Agents, Coordination, Services

## Habery — Shared Environment

Central db env for all Habs. Owns ks(Keeper), db(Baser), cf(Configer), mgr(Manager), rtr(Router), rvy(Revery), exc(Exchanger), kvy(Kevery), psr(Parser), habs dict. Init: name, base, temp, ks, db, cf. Setup: seed, aeid, bran, pidx, algo, salt, tier.

Methods: `makeHab(name)`, `makeGroupHab(group,mhab,smids,rmids)`, `joinGroupHab(pre,group,mhab,smids)`, `makeSignifyHab(name)`, `makeSignifyGroupHab(name,mhab,smids)`, `deleteHab(name)`, `habByPre(pre)`, `habByName(name,ns)`. Props: kevers, prefixes, signator. Context: `openHby(name,base,temp,salt)`.

## Hab(BaseHab) — Standard Id

Main id API, local keys. Make: code, icode, dcode, transferable, isith, icount, nsith, ncount, toad, wits, delpre, estOnly, DnD, hidden, data, algo, salt, tier.

Methods: `rotate()`, `interact(data)`, `sign(ser,verfers,indexed,indices,ondices)`, `query(pre,src)`, `endorse(serder)`, `exchange(route,payload,recipient)`, `receipt(serder)`, `makeOwnEvent(sn)`. Endpoints: `fetchEnd()`, `fetchUrl()`, `fetchUrls()`, `fetchRoleUrls()`, `endsFor(pre)`. Props: iserder, kever, accepted.

## Variants

**GroupHab(BaseHab)** — multisig. Init: smids, mhab, rmids. `make(merfers,migers,isith,nsith,toad,wits)`, `rotate(smids,rmids,serder)`, `sign(ser,indexed,rotated)`, `witnesser()`.

**SignifyHab(BaseHab)** — external keys (Signify). `make(serder,sigers)`, `rotate(serder,sigers)`, `interact(serder,sigers)`, `processEvent(serder,sigers)`. sign() raises KeriError.

**SignifyGroupHab** — SignifyHab+GroupHab for external multisig.

## Manager — Key Mgmt

Init: ks, seed. `incept(icount,icode,ncount,ncode,dcode,algo,salt,tier,transferable)`->(verfers,digers), `rotate(pre,ncount,ncode,dcode,erase)`->(verfers,digers), `sign(ser,pubs,verfers,indexed,indices,ondices,pre,path)`->list, `ingest(secrecies,iridx,algo,salt)`->(ipre,verferies). Props: aeid, pidx, algo, salt, tier. Algos: randy, salty, group, extern.

## Agent Doers (all DoDoer)

**Receiptor** — witness receipts. `receipt()`, `get()`, `catchup()`.
**WitnessReceiptor** — async receipt propagation. `receiptDo()`.
**WitnessInquisitor** — queries. `query(pre,r,sn,fn,src,hab)`, `telquery()`.
**WitnessPublisher** — broadcast. `sendDo()`, `sent(said)`, `.idle`.
**HTTPMessenger** — HTTP transport. `msgDo()`, `responseDo()`.
**MailboxDirector** — mailbox polling. `pollDo()`, `addPollers(hab)`.
**Poller** — SSE polling. `eventDo()`.

Setup: `indirecting.setupWitness(hby,alias,tcpPort,httpPort)`->doers. Factories: `agenting.messenger(hab,pre)`, `messengerFrom(hab,pre,urls)`.

## Counselor(DoDoer) — multisig coord. `start(ghab,prefixer,seqner,saider)`, `complete(prefixer,seqner,saider)`->bool, `escrowDo()`. Flow: local sig->threshold->delegator->anchor->witnesses->receipts. Escrows: gpse, gdee, gpwe, cgms.

## Multisig factories (grouping): `multisigInceptExn`, `multisigRotateExn`, `multisigInteractExn`, `multisigRegistryInceptExn`, `multisigIssueExn`, `multisigRevokeExn`. All->(exn,atc).

## Multiplexor — maps /multisig exn to event SAIDs. `add(serder)`, `get(esaid)`->list.

## Anchorer(DoDoer) — delegation. `delegation(pre,sn)`, `complete()`->bool. Escrows: dpwe, dune, dpub, cdel. Factory: `delegateRequestExn(hab,delpre,evt)`.

## Poster(DoDoer) — /fwd envelope forwarder. `send(dest,topic,serder)`, `sent(said)`. Priority: controller->agent->mailbox->witness.

## StreamPoster — batched HTTP. `deliver()`->doers, `send(serder)`. essr=True for encrypted sealed sender.

## Oobiery — OOBI resolver. RetryDelay=30s. `processFlows()`, `processOobis()`, `processClients()`, `processMOOBIs()`, `processRetries()`. URLs: `/oobi/{cid}/witness/{eid}`, `/oobi/{cid}/controller`, `/oobi/{said}`. DB: oobis, coobi, eoobi, roobi, moobi, schema.

## Services

**Notifier** — persistent notes. `add(attrs)`, `rem(rid)`, `mar(rid)`, `getNotes(start,end)`.
**Signaler** — transient signals. `push(attrs,topic,ckey)`. Same ckey replaces prev.
**Mailboxer** — msg storage. `storeMsg(topic,msg)`, `getTopicMsgs(topic,fn)`, `cloneTopicIter()`, `delTopic()`.
**Respondant** — response router. `responseDo()`, `cueDo()`.
**Organizer** — remote contacts. `update/replace/set/unset/get/rem(pre)`, `list()`, `find(field,val)`, `setImg/getImg(pre)`. **IdentifierOrganizer** — same for local ids.
**Clienter(DoDoer)** — HTTP client mgr, 300s timeout. `request(method,url)`, `remove(client)`.
**Configer(Filer)** — cfg (HJSON/JSON/MGPK/CBOR). `put(data)`, `get()`. Use `openCF()`.
**Adjudicator** — key state vs watchers. `adjudicate(watched,toad)`. Cues: keyStateConsistent, Lagging, Update, Duplicitous.
**QueryDoer**(pre), **SeqNoQuerier**(pre,sn), **AnchorQuerier**(pre,anchor). `signing.signPaths()`, `signing.transSeal()`.

## Defaults

Habery: name="test", temp=True, algo="salty", tier="low", icount=1, isith='1', ncount=1, nsith='1', toad=0. Codes: Blake3_256, Ed25519_Seed. Threshold: `max(1,ceil(count/2))` hex. Timeouts: Clienter 300s, Signaler 10min, Oobiery 30s. DB paths: keri/{ks,not,mbx,cf}.
