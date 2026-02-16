# credentials — VDR, Credentials, IPEX Exchange

> TEL theory, ACDC structure, IPEX protocol: see acdc-spec skill.

## TEL Event Functions (`vdr.eventing`)

incept(), rotate(), issue(), revoke(), backerIssue(), backerRevoke() — create TEL Serder events.
state() — RegStateRecord. vcstate() — VcStateRecord. query() — TEL qry Serder.

## Core Classes

Tever (`vdr.eventing`) — single TEL verifier instance. Key methods: incept(), update(), state(), vcState(), logEvent(), verifyAnchor(), reload()

Tevery (`vdr.eventing`) — TEL event processor managing multiple Tevers. Key methods: processEvent(), processQuery(), processEscrows(), registerReplyRoutes()

Reger (`vdr.viring`, extends LMDBer) — TEL database (like Baser for KEL). Path: `keri/reg`. Stores TEL events, backer sigs, credentials, escrows. Key methods: cloneCreds(), logCred(), cloneCred(), sources(). Helpers: openReger(), buildProof(), messagize()

Regery (`vdr.credentialing`) — registry manager owning Reger+Tevery. Key methods: makeRegistry(), registryByName(), processEscrows()

Registry (`vdr.credentialing`, extends BaseRegistry) — local registry ops. Key methods: make(), issue(), revoke(), rotate(), anchorMsg()

SignifyRegistry (`vdr.credentialing`, extends BaseRegistry) — external/Signify registry. Same interface as Registry.

Registrar (`vdr.credentialing`, extends DoDoer) — multisig registry coordination. Key methods: incept(), issue(), revoke(), complete(), processEscrows()

Credentialer (`vdr.credentialing`, extends DoDoer) — credential lifecycle manager. Key methods: create(), validate(), issue(), complete(), processEscrows(). Helpers: sendCredential(), sendArtifacts(), sendRegistry()

Verifier (`vdr.verifying`) — credential verification with escrow processing. Key methods: processCredential(), processACDC(), saveCredential(), query(), verifyChain(), processEscrows()

Exchanger (`app.exchanging`) — peer exchange message processor. Key methods: addHandler(), processEvent(), logEvent(), lead(), complete(), processEscrow()

IpexHandler (`app.exchanging`) — route-specific IPEX handler. Key methods: verify(), response(), handle()

Wallet (`vc.walleting`) — credential storage. Key methods: getCredentials(schema)

WalletDoer (`vc.walleting`, extends DoDoer) — wallet escrow processor.

## IPEX Functions (`app.exchanging`, `vc.protocoling`)

exchange() — create exn message. cloneMessage() — load+verify exn. serializeMessage() — serialize with attachments.
ipexApplyExn(), ipexOfferExn(), ipexAgreeExn(), ipexGrantExn(), ipexAdmitExn(), ipexSpurnExn() — IPEX step builders.
loadHandlers() — register IPEX handlers.

## ACDC Creation (`vc.protocoling`)

credential() — create SerderACDC. Also: regcept(), blindate(), update(), acdcmap(), acdcatt(), acdcagg(), sectionate().

## Constants

TEL ilks: vcp, vrt, iss, rev, bis, brv. Traits: NoBackers ("NB"), EstOnly ("EO").
IPEX routes: apply, offer, agree, grant, admit, spurn. PreviousRoutes maps each step to valid predecessors.
Escrow timeouts: Tevery/Verifier 3600s, Exchanger 10s. ExchangeMessageTimeWindow: 300s.
Signage/Inputage namedtuples for HTTP signature headers. OOBI_URL_TEMPLATE: `/oobi/{cid}/{role}`.
