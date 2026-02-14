# PAC Theorem: Privacy, Authenticity, Confidentiality

KERI and Zero Trust Data Management
https://hackmd.io/Qsrfj7Y-TIGl5ESvrxWGxw

_Samuel M. Smith Ph.D._

_[sam@keri.one](mailto:sam@keri.one)_
_[https://keri.one](https://keri.one)_

version 2.60

2021/04/23

###### PAC Theorem

A conversation may be two of the three, _private_, _authentic_, and _confidential_
to the same degree, but not all three at the same degree.

Authentic

Trade-offs required!

###### Definitions

_Private_ :

The parties to a conversation are only known by the parties to that conversation.
_Authentic_ :

The origin and content of any statement by a party to a conversation is provable to any other party.
_Confidential_ :
All statements in a conversation are only known by the parties to that conversation.

_Privacy_ :

about control over the disclosure of who participated is in the conversation (non-content meta-data)
_Authenticity_ :

about proving who said what in the conversation (secure attribution)
_Confidentiality_ :

about control over the disclosure of what was said in the conversation (content data)

Relatively weak legal protection for non-content (supoena)
Relatively strong legal protection for content (search warrant)

[https://www.lawfareblog.com/relative-vs-absolute-approaches-contentmetadata-line](https://www.lawfareblog.com/relative-vs-absolute-approaches-contentmetadata-line)
https://www.pogo.org/analysis/2019/06/the-history-and-future-of-mass-metadata-surveillance/

Authenticity

###### Proving Authenticity

_Non-repudiable Proof:_
a statement's author cannot successfully dispute its authorship

_Asymmetric key-pair digital signature_

_Repudiable Proof:_
a statement's author can successfully dispute its authorship

_DH shared symmetric key-pair encryption (auth crypt)_
_Shared secret makes every verifier a potential forger_

Signed with

Verified with

private key

public key

Encrypted with
shared private key

Sue
Zoe

Sue
Zoe

###### Trade-offs

_Private_ :

The parties to a conversation are only known by the parties to that conversation.
_Authentic_ :

The origin and content of any statement by a party to a conversation is provable to any other party.
_Confidential_ :
All statements in a conversation are only known by the parties to that conversation.

Non-repudiation means any party to conversation can proof to any other party exactly what was said by whom.
This means that technologically there is no way to prevent disclosure by any party to some third party.
We can incentivize confidentiality by imposing a liability on the parties to the disclosure set before disclosure
occurs.

Authentic

Enforcement of that liability will usually necessarily violate privacy but not confidentiality.
Real world value often requires transitivity.
Transitive value transfer will violate complete privacy.

###### Layering

A communication system can layer the different properties in different orders thereby imposing a
priority on each property.

Authenticity
Confidentiality
Privacy

Authentic

## Privacy?

Weak

_Strong_ Privacy

Definition: un-correlated interactions over unbounded time and space.

Super aggregators and state actors have effectively unlimited storage and
compute capacity. Eventually all disclosed data will be at least statistically
correlatable.

_Weak_ Privacy

Definition: un-correlated interactions over bounded time and space.

when the cost of correlation exceeds the value of correlation the data will be
un-correlated.

|Col1|Operating Regimes|
|---|---|
|Hide<br>or<br>Bribe|Regulation<br>and/or<br>Legally Enforced Contracts|
|Hide<br>and<br>Bribe|Criminally Enforced Contracts ?|

Illegitimate Legitimate

Economic

_Economics of Correlator_

data lifecycle _past_ _now_ _future_

_measured_ _predicted_

_Economics of Correlator: Value Extraction_

data lifecycle _past_ _now_ _future_

_measured_ _predicted_

_Economics of De-correlator_

data lifecycle _past_ _now_ _future_

_measured_ _predicted_

_Economics of De-correlator: Value Extraction_

data lifecycle _past_ _now_ _future_

_measured_ _predicted_

## Freedom

_balanced_
Freedom from … Freedom to …

exploitation (commercial)

intimidation (political)

extract value(commercial)

build relationships (social)

censorship (political) build community (political)

possibility of erasure = possibility of censorship

anonymity = loss-of-value from attribution

fairness = loss of privacy from attribution

###### Three Party Exploitation Model

###### Contractually Governed Exchanges

_Ricardian Contracts:_
_[https://en.wikipedia.org/wiki/Ricardian_contract](https://en.wikipedia.org/wiki/Ricardian_contract)_

_Chain-link Confidentiality_
_[https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2045818](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2045818)_

_Consent, Waiver, Terms-of-use, Remuneration, etc._

###### Chain-Link Confidentiality

_[https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2045818](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2045818)_

###### Least Disclosure

###### Contractual Exchange

Disclosee may now engage in permissioned use and carries liability as a deterrent against unpermissioned use.

###### Latent Accountability

Example Use Cases

##### Background

###### BADA (Best Available Data Acceptance) Policy

Authentic Data:
Two primary attacks:

Replay attack:

Mitigation: Monotonicity
Deletion attack:
Mitigation: Redundancy
Replay Monotonicity:

Interactive:

Nonce
Non-interactive:

Memory (sequence number, date-time stamp, nullification)
More scalable

Authentic

###### RUN off the CRUD

Client-Server API or Peer-to-Peer.
Create, Read, Update, Delete (CRUD)
Read, Update, Nullify (RUN)
Decentralized control means server never creates only client. Client (Peer) updates server (other Peer) always for data
sourced by Client (Peer). So no Create.
Non-interactive monotonicity means we can’t ever delete.
So no Delete. We must Nullify instead. Nullify is a special type of Update.
Ways to Nullify:

null value
flag indicating nullified
Rules for Update : (anchored to key state in KEL)
Accept if no prior record.

Accept if anchor is later than prior record.
Rules for Update: (signed by keys given by key state in KEL, ephemeral identifiers have constant key state)
Accept if no prior record.

Accept if key state is later than prior record.
Accept if key state is the same and date-time stamp is later than prior record.

## Toolkits

## Only have one set of tools for truly secure data control!

## Entropy Derived Tools Cryptographic one-way functions … hashes, ECC scalar multiplication… digital signatures, ZKPs …

## its

cryptographic
## bits
pseudonymous identifiers

control
attribution

##### Secure Attribution Problem

Secure attribution of any communication to its source

Authentic communication

Authentic interactions based an secure attribution of all statements by participants

Verifiable authenticity of data

Data Provenance

Authentic data economy

###### Identity System Security Overlay

Establish authenticity of IP packet’s message payload.

The overlay’s security is contingent

on the mapping’s security.

###### Self-Certifying Identifier Issuance and Binding

entropy

self-certifying

Self-Certifying Identifier Issuance

###### Basic SCID

Prefix

one-way function one-way function

one-way function

```
    BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0

did:un:BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0/path/to/resource?name=secure#really

```

###### Self-Addressing SCID

Prefix

```
    EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148

did:keri:EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148/path/to/resource?name=secure#this

```

###### Multi-Sig Self-Addressing SCID

one-way function one-way function

Prefix

one-way function

one-way function one-way function

…

one-way function

one-way function one-way function

one-way function

```
    EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148

did:un:EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148/path/to/resource?name=secure#really

```

###### Delegated Self-Addressing SCID

Prefix

```
    EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148

did:un:EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148/path/to/resource?name=secure#really

```

###### Self-Signing SCID

Prefix

Full Sequence

Establishment

Subsequence

Non-Establishment

Subsequence

###### Inconsistency and Duplicity

_inconsistency_ : lacking agreement, as two or more things in relation to each other

_duplicity_ : acting in two different ways to different people concerning the same matter

Internal vs. External Inconsistency

Internally inconsistent log = not verifiable.

Log verification from self-certifying root-of-trust protects
against internal inconsistency.

Externally inconsistent log with a purported copy of log but
both verifiable = duplicitous.

Duplicity detection protects against external inconsistency.

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

Duplicity Game

_How may Cate be duplicitous_

Cate promises to provide a

_How may Cate be_

consistent pair-wise log.

_and not get caught?_

consistent pair-wise log.
_Local Consistency Guarantee_

Cate
_Controller_

Log

Eve
_Validator_

Log

private (one-to-one) interactions

Joe
_Validator_

Log

Service promises to provide a

consistent log to anyone.
_Local Consistency Guarantee_

Duplicity Game

Cate
_Controller_

Log

How may Cate/Service/Agent be

duplicitous and not get caught?

Truncate Log

Delete Log

Service/Agent
_Controlled by Cate_

Log

Eve
_Validator_

Log

Joe
_Validator_

Log

highly available, private (one-to-one) interactions

Service promises to provide
exact same log to everyone.
_Global Consistency Guarantee_

Duplicity Game

Cate
_Controller_

Log

How may Cate and/or service be

duplicitous and not get caught?

Service
_Controlled by Cate_

Log

Ledger Registration

entropy

self-certifying access identifier

The access identifier may have a self-certifying primary root-of-trust, but the registered
identifier does not, even if its format appears to be self-certifying.

Autonomic Identifier (AID) and Namespace (AN)

_auto nomos_ = self rule
_autonomic_ = self-governing, self-controlling, etc.

An _autonomic_ namespace is
_self-certifying_ and hence _self-administrating._
_AIDs_ and ANs are _portable =_ truly self-sovereign.
autonomic prefix = self-cert + UUID + URL = universal identifier

###### Trust Basis

###### Administrative Trust Basis

DNS/Certificate Authorities

###### Algorithmic Trust Basis

Shared Distributed Ledgers

###### Autonomic Trust Basis

Cryptographic Proofs

###### KEY Event Based Provenance of Identifiers

KERI enables cryptographic _proof-of-control-authority_ ( _provenance)_
for each identifier.

A _proof_ is in the form of an identifier’s _key event receipt log_ (KERL).

KERLs are _End Verifiable_ :

End user alone may verify. Zero trust in intervening infrastructure.

KERLs may be _Ambient Verifiable_ :

_Anyone_ may verify _any-log_, _anywhere_, at _anytime_ .

KERI = self-cert root-of-trust + certificate transparency + KA [2] CE +
recoverable + post-quantum.

###### KERI for the DID ified

KERI non-transferable ephemeral with derivation code ~ did:key

KERI private direct mode (one-to-one) ~ did:peer

KERI public persistent indirect mode (one-to-any) ~ Indy interop, did:sov etc

KERI = did:keri (did:uni, did:un) (all of the above in one method)
```
did:keri: prefix [: options ][/ path ][? query ][# fragment ]
BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0
did:keri:BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0/path/to/resource?name=secure#really

```

###### KERI Agnosticism and Interop

KERI itself is completely agnostic about anything but the _prefix_ !
```
???: prefix [: options ][/ path ][? query ][# fragment ]
```

The KERI layer establishes control authority over a _prefix_
_Any_ and _All_ namespaces that share the same _prefix_ may share the same KERI
trust basis for control establishment over that _prefix_ and hence that
namespace.
Interop happens in a layer above the KERI layer
All we need for bootstrapping interop is some indication that the _prefix_ inside
identifier is KERI based (KERI trust basis).
```
BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0
did:indy:sov:keri:BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0

```

###### Autonomic Identifier System

###### Zooko’s Trilemma

_Desirable identifier properties: secure, decentralized, human meaningful_

_Trilemma: May have any two of the three properties but not all three._

_One way to sort of solve the trilemma is to uniquely register a human meaningful_
_identifier on a ledger controlled by a different identifier that is secure and_
_decentralized but not human meaningful._

###### Trust Balance

Reputational Trust

Cryptographic Trust

authenticity

###### Unified Identifier Model

_AID_ : Autonomic Identifier (primary)

self-managing self-certifying identifier with cryptographic root of trust

secure, decentralized, portable, universally unique

L _ID_ : Legitimized Human Meaningful Identifier (secondary)

legitimized within trust domain of given AID by a verifiable authorization from AID controller

authorization is verifiable to the root-of-trust of AID

Forms _`AID|LID`_ couplet within trust domain of AID

AID LID

###### AID|LID Couplet

```
625.127C125r

EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148|625.127C125r

```

###### KERI Stack

Infrastructure

Stack

|Key<br>Event|Confirmation|
|---|---|
|Key<br>Event|Verification|
|Key<br>Event|Promulgation|
|Key<br>Event|Storage|
|Key<br>Event|Signing|
|Key<br>Event|Creation|
|AID|Discovery|
|AID|Derivation|
|Key|Storage|
|Key|Creation|

###### Basic KERI Stack

KERI employs a modular architecture with modular components that each provide services. Participants may
configure their stacks to provide some of all of the services or share services provided by others.

The component services include Controller, Witness, Watcher, Delegate, Oracle, Validator.

The root-of-trust for the GLEIF ecosystem is provided by a single globally published AID called the Root AID. It is a
KERI DID.

This Root AID is the issuer of delegations to other KERI AID DIDs. These delegated identifiers may be the issuers of
VCs.

Cloud Delegate AID

Witness Pool

Participant AID Cloud

###### Decentralized Key Management Infrastructure (Univalent DKMI)

###### Hierarchical DKMI: Bivalent DKMI

###### MultiValent Delegation

###### Delegation (Cross Anchor)

|prefix|sn|digest|Col4|
|---|---|---|---|
|_prefix_|_sn_|_digest_|_gest_|

|Delegating Event Data<br>Data (Seals)<br>Delegated Event Seal<br>header configuration prefix sn digest|Col2|
|---|---|
|Delegating  Event Data<br>_header_<br>_configuration_<br>Data (Seals)<br>Delegated Event Seal<br>_sn_<br>_prefix_<br>_digest_|_signatures_|

###### Interaction Delegation

Delegator Delegate

C
Key Event Stream

∆→ X : Delegation to X

∆← A : Delegation from A

D
Key Event Stream

D ∆← C Inception

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

###### Scaling Delegation via Interaction

|A Key Event Stream Delegator|X Key Event Stream Y Key Event Stream Z Key Event Stream Delegate Delegate Delegate|
|---|---|
|A Inception|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>|
|A Rotation|A Rotation|
|A Interaction<br>∆→ X Inception|A Interaction<br>∆→ X Inception|
|A Interaction<br>∆→ Y Inception|A Interaction<br>∆→ Y Inception|
|A Interaction<br>∆→ Z Inception|A Interaction<br>∆→ Z Inception|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Rotation|A Rotation|

|Col1|Col2|Col3|Col4|Col5|Col6|Col7|
|---|---|---|---|---|---|---|
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||

∆← A : Delegation from A

###### Rotation Delegation

Delegator Delegate

C
Key Event Stream

∆→ X : Delegation to X

∆← A : Delegation from A

D
Key Event Stream

D ∆← C Inception

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

###### Scaling Delegation via Rotation

|A Key Event Stream Delegator|X Key Event Stream Y Key Event Stream Z Key Event Stream Delegate Delegate Delegate|Col3|
|---|---|---|
|A Inception|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction|
|A Rotation|A Rotation|A Rotation|
|A Rotation<br>∆→ X Inception|A Rotation<br>∆→ X Inception|A Rotation<br>∆→ X Inception|
|A Rotation<br>∆→ Y Inception|A Rotation<br>∆→ Y Inception|A Rotation<br>∆→ Y Inception|
|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|
|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|Z ∆← A Inception|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|Z ∆← A Rotation|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|Z Interaction|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z ∆← A Rotation|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|

|Col1|Col2|Col3|Col4|Col5|Col6|Col7|
|---|---|---|---|---|---|---|
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||

∆→ X : Delegation to X
∆← A : Delegation from A

Sovrin
Network

Indy X
Network

Ethereum

Network

Ledger X

Network

Each level of delegation forms a nested trust domain that is protected by the level above.
This increases ultimate security while enabling higher performance event issuance in lower layers.

The Level 1 entity AID provides the root-of-trust for the whole ecosystem. This enables secure decentralized
interoperability.

Each trust domain may make delegations of both identifiers and verifiable credentials to a subordinate trust
domain. These delegations provide revocable authorizations.

system.

Entity A

|Col1|Col2|Col3|Col4|Col5|Col6|
|---|---|---|---|---|---|
|||||||
|||||||

**Tripartite Authentic Data (VC) Model**

Issuer: Source of the VC. Creates (issues) and signs VC
Holder: Usually the target of the VC. The holder is the “ _issuee_ ” that receives the VC and holds it for its own use.
Verifier: Verifies the signatures on the VC and authenticates the holder at the time of presentation

The issuer and target each have a DID (decentralized identifier).
The DIDs are used to look-up the public key(s) needed to verify signatures.

Issuer-Holder-Verifier Model

**Tripartite Authentic Data (VC) Model with VDR**

Verifiable Data Registry (VDR) enables decentralized but interoperable discovery and verification of authoritative key pairs for
DIDs in order to verify the signatures on VCs. A VDR may also provide other information such as data schema or revocation state
of a VC.

Each controller of a DID registers that DID on a VDR so that a verifier can determine the authoritative key pairs for any
signatures.

We call this determination, _establishment of control authority_ over a DID.

Issuer-Holder-Verifier Model with Verification at Verifiable Data Registry

**KERI VDRs vs. Shared Ledger VDRs**

Most DID methods use a shared ledger (commonly referred to as a _blockchain_ ) for their VDR. Typically, in order to interoperate all participants must
use the same shared ledger or support multiple different DID methods. There are currently over 70 DID methods. Instead GLEIF has chosen to use
KERI based DID methods. KERI stands for Key Event Receipt Infrastructure. KERI based VDRs are ledger independent, i.e. not locked to a given ledger.
This provides a path for greater interoperability without forcing participants in the vLEI ecosystem to use the same shared ledger.

A KERI VDR is called a key event log (KEL). It is a cryptographically verifiable signed hash chained data structure, a special class of verifiable data
structure. Each KERI based identifier has its own dedicated KEL. The purpose of the KEL is to provide proof of the establishment of control authority
over an identifier. This provides cryptographically verifiable proof of the current set of authoritative keys for the identifier. KERI identifiers are long
cryptographic pseudo random strings of characters. They are self-certifying and self-managing.

A KERI identifier is abstractly called an Autonomic Identifier (AID) because it is self-certifying and self-managing. A KERI DID is one concrete
implementation of a KERI AID. The same KERI prefix may control multiple different DIDs as long as they share the same prefix.

Full Sequence

Establishment

Subsequence

Non-Establishment

Subsequence

```
did:keri: prefix [: options ][/ path ][? query ][# fragment ]

did:keri:ENqFtH6_cfDg8riLZ-GDvDaCKVn6clOJa7ZXXVXSWpRY

```

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

**KERI Identifier KEL VDR** _**Controls**_ **Verifiable Credential Registry TEL VDR**

A KERI KEL for a given identifier provides proof of authoritative key state at each event. The events are ordered. This ordering may be used to
order transactions on some other VDR such as a Verifiable Credential Registry by attaching anchoring seals to KEL events.
Seals include cryptographic digest of external transaction data.
A seal binds the key-state of the anchoring event to the transaction event data anchored by the seal.
The set of transaction events that determine the external registry state form a log called a Transaction Event Log (TEL).
Transactions are signed with the authoritative keys determined by the key state in the KEL with the transaction seal.
The transactions likewise contain a reference seal back to the key event authorizing the transaction.
This setup enables a KEL to control a TEL for any purpose. This includes what are commonly called “smart contracts”.
The TEL provides a cryptographic proof of registry state by reference to the corresponding controlling KEL.
Any validator may therefore cryptographically verify the authoritative state of the registry.
In the case of the vLEI the associated TEL controls a vLEI issuance and revocation registry.

_seal = proof of authenticity_

**Registry with Separable VC Issuance-Revocation TELs**

Each VC also has a uniquely identified issuer using a KERI AID.
Each VC may be uniquely identified with a content digest.
A full identifier for the VC may include its content digest but also be in the namespace of its issuer.
These may be used as database keys to lookup a VC and verify the content of a given VC.
This combination enables a separable registry of VC issuance-revocation state.
The state may employ a cryptographic accumulator for enhanced privacy

###### Identity System Security Overlay

Establish authenticity of IP packet’s message payload.

The overlay’s security is contingent

on the mapping’s security.

**Identifier System Security**

Authentic transmission of data may be verified using an identity system security overlay.
This overlay maps cryptographic key-pairs to identifiers.
When those identifiers are self-certifying they are derived via cryptographic one-way functions from the key pairs.
This provides a self-certifying identifier with a cryptographic root-of-trust.
A key event log (KEL) provide support for secure key rotation without changing the identifier.
Message authenticity is provided by verifying signatures to the authoritative keys pairs for the identifier included in the
message.

The overlay’s security is contingent

on the mapping’s security.

###### Smith’s Identifier System Properties Triangle

May exhibit any two at the highest level but not all three at the highest level

###### The Internet Protocol (IP) is bro-ken because it has no security layer.

OSI Model IP Model

Application

Transport

Network

Link

Authentication

Application

Presentation

Session

Transport

Network

Link

Physical

TCP, UDP

IP

###### Instead … We use bolt-on identity system security overlays. (DNS-CA …)

###### Identity System Security Overlay

Establish authenticity of IP packet’s message payload.

The overlay’s security is contingent

on the mapping’s security.

###### Administrative Identifier Issuance and Binding

entropy

controller

administrator

admin-certifying

Admin-Certifying Identifier Issuance

###### DNS Hijacking

[A DNS hijacking wave is targeting companies at an almost unprecedented scale. Clever trick allows attackers to obtain valid TLS certificate for hijacked domains.](https://w3c-ccg.github.io/did-spec/)

https://arstechnica.com/information-technology/2019/01/a-dns-hijacking-wave-is-targeting-companies-at-an-almost-unprecedented-scale/

###### BGP Hijacking: AS Path Poisoning

[Spoof domain verification process from CA. Allows attackers to obtain valid TLS certificate for hijacked domains.](https://w3c-ccg.github.io/did-spec/)

Birge-Lee, H., Sun, Y., Edmundson, A., Rexford, J. and Mittal, P., “Bamboozling certificate authorities with {BGP},” vol. 27th {USENIX} Security Symposium, no. {USENIX} Security 18, pp.
833-849, 2018 https://www.usenix.org/conference/usenixsecurity18/presentation/birge-lee

Gavrichenkov, A., “Breaking HTTPS with BGP Hijacking,” BlackHat, 2015 https://www.blackhat.com/docs/us-15/materials/us-15-Gavrichenkov-Breaking-HTTPS-With-BGP-Hijacking-wp.pdf

###### Identity System Security Overlay

###### Spanning Layer

###### Hourglass

Fewer Applications

More Supports

|Col1|All Necessary Applications|Col3|
|---|---|---|
||||
|Spanning Layer S<br>Weaker (fe|Spanning Layer S<br>Weaker (fe|Spanning Layer S<br>Weaker (fe|
||~~All Possible Supports~~||
||||

###### Platform Locked Trust

Trust Domain Based

Segmentation

Each trust layer only spans platform specific applications
Bifurcates the internet trust map
No spanning trust layer

###### Waist and Neck

|Application 1|Application 2|Application 3|
|---|---|---|
|Trust Spanning Layer|Trust Spanning Layer|Trust Spanning Layer|
|Support/Application 1|Support/Application 2|Support/Application 3|
|IP Spanning Layer|IP Spanning Layer|IP Spanning Layer|
|Support 1|Support 2|Support 3|

###### Identity System Security Overlay

Establish authenticity of IP packet’s message payload.

The overlay’s security is contingent

on the mapping’s security.

###### Tripartite Authentic Data Model

Issuer-Holder-Verifier Model

###### Tripartite with VDR

Issuer-Holder-Verifier Model with Verification at Verifiable Data Registry

###### Tripartite without VDR

Issuer-Holder-Verifier Model with Verification at Issuer

|Verification|Col2|
|---|---|
|||

###### Bipartite Model

Issuer-Holder Model with Verification at Issuer

Holder

|Presentation/Verification|Col2|
|---|---|
|||

###### Joint Delegator-Service Model

Joint Delegator-Service Model

###### Split Delegator-Service Model

Split Delegator-Service Model

Service

###### Closed Loop Joint Model

Closed Loop Joint Model

###### Closed Loop Split Model

Closed Loop Split Model

Service

|Verification|Col2|
|---|---|
|||

###### Open Loop Split Model

Open Loop Split Model

###### Autonomic Identity System

_why_, _how_ - _who_ controls _what_, _when_, and _how?_

## Root-of-Trust

cryptographic autonomic identifier = _why_, _how_
## Source-of-Truth

controller of the private key = _who_

## Loci-of-Control

authoritative operation = _what, when, how_

###### Key Event Message

###### Event Chaining

###### Self-Certifying Identifier Prefixes

All crypto material appears in KERI in a fully qualified representation that
includes a derivation code prepended to the crypto-material.

Identifier prefixes are fully qualified crypto-material.

###### Event Sequencing

Establishment

Subsequence

Full Sequence

Non-Establishment

Subsequence

Establishment

Subsequence

|Inception Event|Col2|
|---|---|
|Rotation Event|Rotation Event|
|Rotation Event||
|Rotation Event|Rotation Event|
|Rotation Event||
|Rotation Event|Rotation Event|
|Rotation Event||

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

###### Establishment Events

Establishment

Subsequence

|Inception Event|Col2|
|---|---|
|Rotation Event|Rotation Event|
|Rotation Event||
|Rotation Event|Rotation Event|
|Rotation Event||
|Rotation Event|Rotation Event|
|Rotation Event||

###### Non-Establishment Events

Full Sequence

Non-Establishment

Subsequence

Establishment

Subsequence

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

###### Seal (Anchor)

_seal provides_ _evidence of authenticity_

A _seal_ anchors arbitrary data to an event in the key event sequence thereby
providing proof of control authority for that data at the location of the anchoring
event.
_Seals_ make KERI both privacy preserving and _data semantic agnostic._
_Context independent extensibility_ via externally layered APIs for anchored data
instead of context dependent extensibility via internal linked data or tag registries.
Interoperability is total w.r.t. establishment of control authority.
Minimally sufficient means.

###### Pre-Rotation

Digest of _next_ key(s) makes pre-rotation post-quantum secure

###### _Key Infrastructure Valence_

###### _Repurposed Keys_

###### _Univalent Key Roles_

Repurposed Rotation to Interaction

Rotation Only

###### Delegation (Cross Anchor)

|prefix|sn|digest|Col4|
|---|---|---|---|
|_prefix_|_sn_|_digest_|_gest_|

|Delegating Event Data<br>Data (Seals)<br>Delegated Event Seal<br>header configuration prefix sn digest|Col2|
|---|---|
|Delegating  Event Data<br>_header_<br>_configuration_<br>Data (Seals)<br>Delegated Event Seal<br>_sn_<br>_prefix_<br>_digest_|_signatures_|

###### Interaction Delegation

Delegator Delegate

C
Key Event Stream

∆→ D : Delegation to D

∆← C : Delegation from C

D
Key Event Stream

D ∆← C Inception

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

###### Scaling Delegation via Interaction

|A Key Event Stream Delegator|X Key Event Stream Y Key Event Stream Z Key Event Stream Delegate Delegate Delegate|
|---|---|
|A Inception|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>|
|A Rotation|A Rotation|
|A Interaction<br>∆→ X Inception|A Interaction<br>∆→ X Inception|
|A Interaction<br>∆→ Y Inception|A Interaction<br>∆→ Y Inception|
|A Interaction<br>∆→ Z Inception|A Interaction<br>∆→ Z Inception|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Rotation|A Rotation|

|Col1|Col2|Col3|Col4|Col5|Col6|Col7|
|---|---|---|---|---|---|---|
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||

∆← A : Delegation from A

###### Rotation Delegation

Delegator Delegate

C
Key Event Stream

∆→ D : Delegation to D

∆← C : Delegation from C

D
Key Event Stream

D ∆← C Inception

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

D ∆← C Rotation

D Interaction

D Interaction

###### Scaling Delegation via Rotation

|A Key Event Stream Delegator|X Key Event Stream Y Key Event Stream Z Key Event Stream Delegate Delegate Delegate|Col3|
|---|---|---|
|A Inception|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction|
|A Rotation|A Rotation|A Rotation|
|A Rotation<br>∆→ X Inception|A Rotation<br>∆→ X Inception|A Rotation<br>∆→ X Inception|
|A Rotation<br>∆→ Y Inception|A Rotation<br>∆→ Y Inception|A Rotation<br>∆→ Y Inception|
|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|
|A Rotation<br>∆→ Z Inception|A Rotation<br>∆→ Z Inception|Z ∆← A Inception|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|Z ∆← A Rotation|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|
|A Rotation<br>∆→ Y Rotation|A Rotation<br>∆→ Y Rotation|Z Interaction|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z ∆← A Rotation|
|A Rotation<br>∆→ Z Rotation|A Rotation<br>∆→ Z Rotation|Z Interaction|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|
|A Rotation<br>∆→ X Rotation|A Rotation<br>∆→ X Rotation|Z Interaction|

|Col1|Col2|Col3|Col4|Col5|Col6|Col7|
|---|---|---|---|---|---|---|
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||

∆→ X : Delegation to X
∆← A : Delegation from A

###### _Security Concepts_

Availability, Consistency, and Duplicity

_Harm to controller_ : Unavailability, loss of control authority, externally forced duplicity

_Harm to validator_ : Inadvertent acceptance of verifiable but forged or duplicitous events

Local vs. Global Duplicity Guarantees

Direct Mode vs. Indirect Mode Operation

Malicious Controller vs. Malicious Third Party

Live Exploit vs. Dead Exploit

Controller Protection vs. Validator Protection

Protection to controller: key management, promulgation consensus, redundancy.

Protection to validator: verifiable logs, verification consensus, duplicity detection

###### _Ledger Attack Vectors_

Exploring the Attack Surface of Blockchain: A Systematic Overview https://arxiv.org/pdf/1904.03487.pdf

Exploring the Attack Surface of Blockchain: A Systematic Overview https://arxiv.org/pdf/1904.03487.pdf

Ledger:

Network paid by transaction fees

###### _Apples-to-Apples_

KERI:

Networks paid by transaction fees

(more or less competitive within the network)

Successful exploits without compromised keys

_Controller_ :

Highly available nodes of other’s choosing

Must trust that a majority are honest

No recovery if keys compromised

_Validator;_

Need full copy of ledger (big)

Need full access to network

Must trust that a majority are honest

(competitive across all networks)

_Controller_ :

Highly available nodes of own choosing

Must “ _trust”_ that a majority are honest

Successful exploits must compromise keys

Recovery if keys compromised

_Validator_ :

Need full copy of KEL (small)

Need full access to network of own choosing.

Must “ _trust”_ that a majority are honest

###### Protocol Operational Modes

Direct Event Replay Mode (one-to-one)

Indirect Event Replay Mode (one-to-any)

Entity

A

Entity

B

###### Direct Mode: A to B

Entity

A

Entity

B

###### Direct Mode: B to A

Indirect Mode
Promulgation Service

Key Event Promulgation Service

###### Establishment Events

Indirect Mode
Promulgation and Confirmation Services

Key Event Promulgation Service Key Event Confirmation Service

###### Indirect Mode Full

|Col1|Col2|Col3|Col4|Col5|
|---|---|---|---|---|
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||
||||||

|Col1|Col2|Col3|
|---|---|---|
||||
||||
||||
||||
||||
||||
||||
||||
||||

|Indirect Replay Mode|Col2|Key Event Confirmation Service|Col4|Col5|Col6|
|---|---|---|---|---|---|
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Judge<br>Event Validator<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier|Judge<br>Event Validator<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier|Entity B<br>Validator of Identifier A<br>Event Validator<br>KERL of A<br>Key Event Receipt Log<br>Event Receipt Streams<br>Duplicitous Event Streams<br>Authoritative Event Stream|Entity B<br>Validator of Identifier A<br>Event Validator<br>KERL of A<br>Key Event Receipt Log<br>Event Receipt Streams<br>Duplicitous Event Streams<br>Authoritative Event Stream|
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Judge<br>Event Validator<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Judge<br>Event Validator<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|Judge<br>Event Validator<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||Designated by B<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier|Designated by B<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier|||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||Designated by B<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier|Designated by B<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier<br>Watcher<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Juror<br>DEL of A<br>Duplicitous Event Log<br>Event Verifier|||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service|||||Event Receipt Streams|
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||||||
|Designated by A<br>Entity A<br>Controller of Identifier A<br>KEL/KERL of A<br>Key Event Log<br>Key Event Receipt Log<br>Event Generator<br> Event and Event Receipt Streams<br>Witness W-0<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-1<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-2<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Witness W-3<br>KERL of A<br>Key Event Receipt Log<br>Event Verifier<br>Event Receipt Streams<br>Key Event Promulgation Service||||||

###### Indirect Mode with Ledger Oracles

Indirect Replay Mode with Ledger Oracle

Key Event Promulgation Service Key Event Confirmation Service

###### Separation of Control

Shared ledger = _shared_ _control_ over _shared_ _data_ .

Shared _data_ = _good_, shared _control_ = _bad_ .

Shared control between controllers and validators may be
problematic for governance, scalability, and performance.

KERI = _separated_ _control_ over _shared_ _data_ .

Separated control between controllers and validators may provide
better decentralization, more flexibility, better scalability, lower
cost, higher performance, and more privacy at comparable security.

(current signing keys)
###### Live Exploit

_Hard Problem:_
_Recovery from Live Exploit_
_of Current Signing Keys_

Pre-rotation provides protection from successful _live_ exploit of current signing keys.

(next signing keys)
###### Live Exploit

Compromised

Keys

Preemptive Alternate History

Original History

Exposed

Keys

! [0]
_C_

!
_C_ [1]

! [3]
_C_

! [4]
_C_

Difficulty of inverting _next_ key(s) protects against successful _live_ exploit.

(stale next signing keys)
###### Dead Exploit

Original History

Compromised

Keys

Exposed

Keys

! [0]
_C_

! [4]
_C_

Any copy of original history protects against successful _dead_ exploit: First Seen Wins

###### Witnessing Rules

An honest witness will only _witness_, (i.e. create, store, and promulgate a receipt for), at
most _one and only one version_ of any event.
That event version must first be verified.
A verified event version must be signed by the controller’s authoritative keys as
determined by prior events.
A verified event version must be consistent with all prior events.

###### Agreement

A _state of agreement_ about a version of an event is defined with respect to _set_ of
witnesses in agreement:
Each witness in that _set_ has witnessed the same version of that event and each receipt in
that set has been promulgated to every other witness in that _set_ .
The size of an agreement is the number of contributing witnesses in the _set_ .
The associated _agreement_ include a receipt from each witness in the _set_ .
This state of agreement is provable to any validator, watcher, juror, or judge via a
verifiable fully receipted copy of the event i.e the _agreement_ .
This copy provides _proof of agreement_ .
Such a proof may be obtained via any verifiable KERL that includes that version of that
event.

_N_ =
number of witness
_M_ =
size of agreement
_F_ =
faulty witnesses

_V_
_Validator_
_C_
_Controller_

###### Definitions

Sufficient Agreement

_Controller’s Guarantee_
###### _M M_ ≥

_C_

_Threshold of Accountable Duplicity_
_TOAD_

_M_
_C_

_M_
_V_

_Validator’s Choice_

_M_ _M_
≥
_V_ _C_

###### Algorithm Objectives

Any pre-existing copy or digest of original KERL available to Validator
protects Validator from future dead exploits.

KAACE provides fault tolerance from live exploit.

A successful but recoverable live exploit is a compromise of the controller’s
current signing keys and/or a compromise of the witnesses’ signing keys.

A) WRT Controller, a successful live exploit of the witnesses’ would
prevent sufficient agreement thereby inducing a recovery operation.

B) WRT Validator, a successful live exploit would produce undetectably
duplicitous but sufficient agreement about current events.

(KAACE immune agreement prevents this, i.e. Validator is immune)

###### Detectable vs Undetectable Duplicity

Witness Duplicity

Witness Duplicity is Detectable.

Controller Duplicity

Controller Duplicity wrt witnesses is undetectable if a sufficient
number of witnesses are not duplicitous and sufficient agreement is
small enough.

(KA [2] CE)
Keri’s Agreement Algorithm for Control Establishment

Produce Witnessed

Agreements
with Guarantees

###### Agreement Constraints

_N_ =
number of witness
_M_ =
size of agreement
_F_ =
faulty witnesses

_V Validator_
_C_
_Controller_

Proper Agreement

_F_ + 1

Bounds on Sufficient Agreement

_M_    - _F_

_M_ ≤ _N_    - _F_

_F_ < _M_ ≤ _N_    - _F_

Intact Agreement

_N_ 2 _F_ 1
≥ +

###### One Agreement or None at All (Immune)

_first seen rule limits liveness induces recovery rotation_

⌢ ⌢ ⌢
⌢ ⌢

_M_ = _M_ = _M_

_N_ = _N_ 1 2
_M_ _M_ = _N_ = _N_
1 2
∪⌢

⌢ ⌢
_M_ = _M_ = _M_
1 2

Overlapping Sets
⌢ ⌢
_M_ _M_ = _N_
1 2

⌢ ⌢ ⌢ ⌢
_M_ + _M_ = _M_ _M_ + _M_ _M_
1 2 1 2 1 2
∪⌢ ∩⌢

2 _M_ = _N_ + _F_ + 1

⎡

_M_ ≥ _[N]_ [ +] _[ F]_ [ +] [1]

⎢ [⎢]

_M_ ≤ _N_ - _F_

⎤
⎥ [⎥]

One honest witness if:
⌢
_M_ _M_ ≥ _F_ + 1
1 2
∩⌢

Immune Agreement
_N_ + _F_ + 1

≤ _M_ ≤ _N_    - _F_

###### Example Values

Immunity

|F|N|3F+1|+ +<br>⎡ ⎤<br>N F 1<br>⎢ ⎥<br>⎢ ⎥<br>2|N-F|M|
|---|---|---|---|---|---|
|1|4|4|3|3|3|
|1|5|4|4|4|4|
|1|6|4|4|5|4, 5|
|1|7|4|5|6|5, 6|
|1|8|4|5|7|5, 6, 7|
|1|9|4|6|8|6, 7, 8|
|2|7|7|5|5|5|
|2|8|7|6|6|6|
|2|9|7|6|7|6, 7|
|2|10|7|7|8|7, 8|
|2|11|7|7|9|7, 8, 9|
|2|12|7|8|10|8, 9, 10|
|3|10|10|7|7|7|
|3|11|10|8|8|8|
|3|12|10|8|9|8, 9|
|3|13|10|9|10|9, 10|
|3|14|10|9|11|9, 10, 11|
|3|15|10|10|12|10, 11, 12|

Recovery from Live Exploit Of Current Signing Keys

Recovery from Live Exploit

Unexploited Events

|0|Inception|Col3|
|---|---|---|
|1|Rotation|Rotation|
||2|Interaction|
||3|Interaction|
|4|Rotation|Rotation|
|4|5|Interaction|
|4|6|Interaction|

Recovery Event

Exploited Events

Accountable Event
# event

Non-Accountable Event

Disputed (Forked) Events

# event

|7|Rotation|Col3|
|---|---|---|
||8|Interaction|
||9|Interaction|

|7|Interaction|
|---|---|
|8|Interaction|
|9|Interaction|

###### Function Stack

KERI

On Top of KERI

Authorizations after Establishment

Design follows the
_Hourglass Model_ of
a stack of thin layers

###### Rotate Prefix vs Rotate Keys

Non-transferable may not rotate keys. May only rotate prefix
Rotate prefix good for bootstrapping. No key event log (KEL) needed.
If prefix has no persistent value outside its function and its function may be marshaled by
some other prefix controller then rotating prefix may be preferred.

###### Events

Delegating Events

###### State Verifier Engine

KERI Core — State Verifier Engine

|Current State<br>Current Signatories Next Signatories|Col2|Col3|Col4|Col5|Col6|Col7|Col8|Col9|Col10|
|---|---|---|---|---|---|---|---|---|---|
|Current State<br>Current Signatories<br>Next Signatories|Current State<br>Current Signatories<br>Next Signatories|Current State<br>Current Signatories<br>Next Signatories|Current Signatories|Current Signatories|Next Signatories|Next Signatories|Next Signatories|Next Signatories|Next Signatories|
|ID|SN|Digest|Threshold|Signers|Threshold|Signers|Tally|Witnesses|Event Message|
|Hash<br>Event Message<br>Event Processing<br>+|Hash<br>Event Message<br>Event Processing<br>+|Hash<br>Event Message<br>Event Processing<br>+|Hash<br>Event Message<br>Event Processing<br>+|Hash<br>Event Message<br>Event Processing<br>+|Hash<br>Event Message<br>Event Processing<br>+|||||
|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|
|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Next State<br>Current Signatories<br>Next Signatories|Current Signatories|Current Signatories|Next Signatories|Next Signatories|Next Signatories|Next Signatories|Next Signatories|
|ID|SN|Digest|Threshold|Signers|Threshold|Signers|Tally|Witnesses|Event Message|

###### Delegated State Verifier Engine

KERI Delegated Core — State Verifier Engine

|Current State<br>Delegation Signatory|Col2|Col3|Col4|Col5|Col6|Col7|Col8|Col9|Col10|Col11|Col12|Col13|Col14|Col15|Col16|Col17|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|Current State<br>Signatory<br>Delegation|Current State<br>Signatory<br>Delegation|Current State<br>Signatory<br>Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Signatory|Signatory|Signatory|Signatory|Signatory|
|ID|SN|Digest|ID|ID|SN|SN|Digest|Digest|Controller|Controller|Perms|Threshold|Signers|Tally|Witnesses|Event Message|
|Hash<br>+|Hash<br>+|Hash<br>+|Hash<br>+||||||||||||||
|Hash<br>+|Hash<br>+|Hash<br>+|Hash<br>+||||||||||||||
|Hash<br>+|Hash<br>+|Hash<br>+|Hash<br>+||||||||||||||
|Next State<br>Signatory<br>Delegation|Next State<br>Signatory<br>Delegation|Next State<br>Signatory<br>Delegation|Next State<br>Signatory<br>Delegation||||||||||||||
|Next State<br>Signatory<br>Delegation|Next State<br>Signatory<br>Delegation|Next State<br>Signatory<br>Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Delegation|Signatory|Signatory|Signatory|Signatory|Signatory|
|ID|SN|Digest|ID|ID|SN|SN|Digest|Digest|Controller|Controller|Perms|Threshold|Signers|Tally|Witnesses|Event Message|

###### Witness Designation

###### Witnessed Key Event Receipt

…

_C_
_CW_

_C_
_W_

_k_ 0

_C_
_C_
ε
_k_

_C_ _C_
σ
_W_

_C_ _C_
σ
_W_

ε
_k_

_C_ _C_
σ
_W_

_C_
_W_

_k_ 0

_C_
_C_

###### Generic Event Formats

###### Generic Inception

_C_
_K_

0 1

_C_
, _W_

[⌢]

_C_
, _cnfg_ σ

[⌢] 0

[ ]

_C_
= ν

0 0

_C_
, icp, _K_

0 0

ε

_C_
, _C_, _t_

0 0

_C_ _C_

_K_, _C_

[⌢]

1 1 0

( ) [,] _[ M]_

_C_
, _C_

[⌢]

_C_
, _C_

[⌢]

_C_
,η

_C_

⌢
_C_

_C_
−1

0 _L_
_C_,, _C_
…

⎡⎣ ⎤⎦0

_C_

_C_

0 _L_
= _C_, …, _C_

_C_

_C_

⌢
_C_

_C_

+ _L_ −1
1 1 1
_r_ _r_
_C_,, _C_
…

⎡⎣ ⎤⎦1

_C_ + _L_
1 1 1
_r_ _r_
= _C_, …, _C_

⌢
_W_

_C_ _C_

_W_,, _W_ _C_

…

_N_ −1

⎡⎣ 0 ⎤⎦0

_C_ _C_
,, _W_
…
_N_

_C_
= _W_

_C_

⌢
σ

_C_

_C_
_s_
= σ σ

_C_ …

_C_

_sS_ −1

###### Generic Rotation

_C_
, _X_

[⌢]
_l_

_C_
, _Y_

[⌢]
_l_

_C_ _C_
_K_
_l_ +1

_C_ _C_
, _seals_ σ

[⌢] _kl_

[ ]

_C_
= ν

_k_ _k_

_C_
,η

_k_ _k_

_C_
, _C_

[⌢]
_l_

ε
_k_

_C_
, _C_, _t_

_k_ _k_

_C_

ε
_k_ −1 _l_

( ) [,][ rot][,] _[ K]_

_C_
,η
_l_

_C_ _C_

_K_, _C_

[⌢]

_l_ +1 _l_ +1 _l_

( ) [,] _[ M]_

_C_ _C_
, _C_

[⌢]

+1 _l_ +1

_C_ _C_
ε

_k_ _k_ −1

(

⌢
_C_
_l_

_C_
_l_
_r_
= _C_

_C_

_C_
+ _L_
_l_

_C_

⌢

_C_

_C_
_l_ +1

_C_ _C_ _C_

+ _L_ −1

_l_ _l_ _l_
_r_ _r_
_C_,, _C_

…

⎡⎣ ⎤⎦ _l_

_C_

_C_ _C_ _C_

+ _L_ −1

_l_ +1 _l_ +1 _l_ +1
_r_ _r_
_C_,, _C_

…

⎡⎣ ⎤⎦ _l_ +1

_C_
_l_
_r_
,, _C_
…

_C_

_C_
_l_ +1
_r_
= _C_

+1

_C_ _C_

+1 _l_ +1

_r_
,, _C_
…

_C_ _C_
+ _L_

+1 _l_ +1

⌢
_X_
_l_

_C_ _C_

_X_,, _X_ _C_

…

_O_ −1

⎡⎣ _l_ ⎤⎦ _l_

_C_

⌢
_Y_
_l_

_C_
= _X_

_C_
= _Y_

_C_ _C_
,, _X_
…
_O_
_l_

_C_

⌢ _C_
σ
_kl_

_C_ _C_

_Y_,, _Y_ _C_

…

_P_ −1

⎡⎣ _l_ ⎤⎦ _l_

_C_

_C_
= σ

_C_
,, _Y_
…
_P_
_l_

_C_

_C_ [−][1]

_rl_

_C_
+ _s_

[…][σ]

_rl_

_C_
+

_C_

_sSkl_

###### Generic Interaction

_C_
= ν

_k_ _k_

_C_
,η

_k_ _k_

_C_

ε
_k_

_C_

_C_ _C_

ε _[seals]_ σ
_k_ −1 [⌢] _kl_

[ ]
( ) [,] [ixn][,]

_C_
, _C_, _t_

_k_ _k_

_C_ _C_
ε

_k_ _k_ −1

(

_C_

_K_
_l_

⌢
_C_
_l_

_C_
_l_
_r_
= _C_

_C_
+ _L_
_l_

_C_

_C_
_l_
_r_
,, _C_
…

⌢ _C_
σ
_kl_

_C_ _C_ _C_

+ _L_ −1

_l_ _l_ _l_
_r_ _r_
_C_,, _C_

…

⎡⎣ ⎤⎦ _l_

_C_

_C_
= σ

_C_

_C_ [−][1]

_rl_

_C_
+ _s_

[…][σ]

_rl_

_C_
+

_C_

_sSkl_

###### Generic Delegating Event Formats

###### Inception Delegation

⌢
Δ

_D_ _C_ _D_

_D_, _t_,η ε Delegated Event Seal
0 _k_ 0

( )
{ }

_D_
,η
_k_

_D_
= _D_, _t_

0 0

_C_
ε

_k_ 0

(

_D_
, _W_

[⌢]

_D_
= ν

_D_
, dip, _K_

⌢
Δ
_k_

_C_ ⌢
σ

_k_ 0

ε

_D_
, _D_, _t_

_D_
, _D_

[⌢]

_D_
, _M_

_D_
, _cnfg_,

[ ]

_D_

⌢
_D_

_D_

0 _L_ −1

_D_,, _D_
…

⎡⎣ ⎤⎦0

_D_ 0 _L_

= _D_, …, _D_

_D_

⌢
_W_

_C_ _C_

_W_,, _W_ _C_

…

_N_ −1

⎡⎣ 0 ⎤⎦0

_C_ _C_
,, _W_
…
_N_

_C_
= _W_

_C_

⌢

_C_ _C_ _C_ _C_

Δ = _C_, _t_, _ilk_,η ε Delegating Event Location Seal
_k_ _k_ _k_ _k_ −1

( )
{ }

_C_ _C_ _C_

_C_, _t_, _ilk_,η ε
_k_ _k_ _k_ −1

( )
{ }

_C_
= _C_, _t_

_k_ _k_

_C_ _C_
ε

_k_ _k_ −1

(

_C_
, _ilk_,η

_k_ _k_

⌢
σ

_D_

_D_
_s_
= σ 0 σ
_D_ …

_sSD_ [−][1]

⌢
Δ
_k_

_D_ _C_ _D_

_D_, _t_,η ε Delegated Event Seal
_k_ _k_ _k_

( )
{ }

_D_
,η
_k_

###### Rotation Delegation

_D_
, _X_

[⌢]
_l_

_D_
= _D_, _t_

_k_ _k_

_C_
ε

_k_ _k_

(

_D_
, _seals_,

[ ]

_D_
= ν
_k_

_D_
,η
_k_

_D_
, _D_

[⌢]
_l_

⌢
Δ
_k_

_C_ ⌢ _D_
σ

_k_ _kl_

ε
_k_

_D_

ε
_k_ −1 _l_

( ) [,][ drt][,] _[ K]_

_D_
, _M_
_l_

_D_ _D_
ε

_k_ _k_ −1

(

_D_
, _Y_

[⌢]
_l_

_D_

⌢
_D_
_l_

_D_
, _D_, _t_
_k_

_D_ _r_
_l_
= _D_

_D_
_r_
_l_
,, _D_
…

_D_
+ _L_
_l_

_D_

⌢
_X_
_l_

_D_ _D_ _D_

_r_ _r_ + _L_ −1
_l_ _l_ _l_
_D_,, _D_

…

⎡⎣ ⎤⎦ _l_

_D_ _D_

_X_,, _X_ _D_

…

_O_ −1

⎡⎣ _l_ ⎤⎦ _l_

_D_ _D_
,, _X_
…
_O_
_l_

_D_
= _X_

_D_

⌢
_Y_
_l_

_D_
= _Y_

_D_ _D_

_Y_,, _Y_ _D_

…

_P_ −1

⎡⎣ _l_ ⎤⎦ _l_

_D_
,, _Y_
…
_P_
_l_

_D_

⌢

_C_ _C_ _C_ _C_

Delegating Event Location Seal
Δ = _C_, _t_, _ilk_,η ε
_k_ _k_ _k_ _k_ −1

( )
{ }

_C_ _C_ _C_

_C_, _t_, _ilk_,η ε
_k_ _k_ _k_ −1

( )
{ }

_C_
= _C_, _t_

_k_ _k_

_C_ _C_
ε

_k_ _k_ −1

(

_C_
, _ilk_,η

_k_ _k_

⌢
σ = σ
_kl_

_C_

_D_ [−][1]

_C_

+
_rl_

_D_
+ _s_

[…][σ]

_rl_

_D_
+

_D_

_sSkl_

###### Delegated Interaction

_D_
= ν
_k_

_D_
,η
_k_

ε
_k_

_D_
, _D_, _t_
_k_

_D_ _D_

ε _[seals]_ σ
_k_ −1 [⌢] _kl_

[ ]
( ) [,] [ixn][,]

_D_ _D_
ε
_k_ −1

(

_D_

###### Receipt Messages

…

_C_ _C_
_C_, …, _W_
_lN_

_l_ 0 _s_

_C_ _C_
σ _C_

_W_
_l_ 0

_C_

ρ
!
_W_
_ls_

_C_
_C_ ε

! _k_

_C_

ε [ν]
_k_ [=] _k_

( )

_C_
, _C_, _t_

_k_ _k_

_C_
, rct,η

_k_ _k_

_C_ _C_

ε
_k_ _[W]_ _l_ 0

( )

_C_ _C_
_C_ σ _C_
−1 _W_

_s_

_lNs_ −1

_C_
ε

_k_ _k_

(

_C_
_C_

…

_V_
ε

_k_ _k_

(

⌢

_V_

Δ
_k_

_V_ ⌢ _C_
σ

_k_ _V_

_l_

_C_
ε
_k_

(

ρ
_V_

_C_

ε [ν]
_k_ [=] _k_

( )

⌢

_V_

Δ
_k_

_C_

ε
_k_

( ) [,]

_C_

_V_ _V_

_V_,η ε
_k_ _k_

( )
{ }

_C_
, _C_, _t_

_k_ _k_

_C_
, vrc,η

_k_ _k_

_C_
ε

_k_ _k_

(

_V_
= _V_,η

_k_ _k_

###### Witness Rotations

⌢
_W_ = _W_ _W_ ", _W_
0 0 1 _N_ −1
,,
⎡⎣ ⎤⎦
⌢ ⌢ ⌢
_W_ = _W_ _X_
_l_ _l_ −1 _l_ _l_
      ( ) [∩⌢] _[Y]_
⌢ ⌢ ⌢ ⌢ ⌢
_Xl_ ⊆ _Wl_ −1 _Yl_ ⊄ _Wl_ −1 _Xl_ ⊄

⌢
_X_ = _O_
_l_ _l_

⌢
_Y_ = _P_
_l_ _l_

⌢ ⌢ ⌢
_X_ = _O_ _Y_ = _P_ _W_ = _N_
_l_ _l_ _l_ _l_ _l_ _l_

⌢ ⌢

⌢

_U_ _W_
_l_ −1 _l_ −1 _U_ ≥ _M_
⊆ _l_ −1 _l_ −1

⌢

⌢ ⌢
_U_ ⊆ _W_ _Ul_ ≥ _M_ _l_
_l_ _l_

⌢
_U_ _U_ ≤ _M_ _M_
_l_ −1 _l_ _l_ −1 _l_
∪⌢ +

⌢

⌢

_W_
_l_ −1 _l_ −1 _U_ ≥ _M_
⊆ _l_ −1 _l_ −1

⌢

⌢ ⌢
_U_ ⊆ _W_ _Ul_ ≥ _M_ _l_
_l_ _l_

⌢ ⌢
_Y_ ⊄ _W_
_l_ _l_ −1

⌢ ⌢
_X_ ⊄ _W_
_l_ _l_

_N_ = _N_ _O_ _P_
_l_ _l_ −1 _l_ _l_
     - +

_M_ ≤ _N_
_l_ _l_

###### Complex Weighted Signing Thresholds

⌢
_C_ = _C_
_l_ _l_

⎡⎣

1 _L_

_l_

= _C_, …, _C_
_l_ _l_ _l_

⎡⎣ ⎤⎦ _l_
⌢

1 _L_

_K_ = _U_, …, _U_
_l_ _l_ _l_

⎡⎣ ⎤⎦ _l_

,, _C_
…

_l_ _l_

1 _L_

_U_,, _U_

…

_l_ _l_

⎡⎣ ⎤⎦ _l_

⌢
1 2 3
_C_ = ⎡⎣ _C_, _C_, _C_ ⎤⎦

,, _U_
…
_l_

_j_

0 < _U_ ≤ 1
_l_

_U_
_l_

_j_
= 1
_K_
_l_

⌢ _l_
_s_
_k_

_l_

_s_,, _s_ _l_
…

_S_ −1

⎡⎣ _k_ ⎤⎦ _k_

_l_
= _s_, …, _s_ _l_

_S_
_k_

⎡⎣

_l_

⌢
_K_ = 12, 12, 12

[ ]

⌢
_K_ = 12, 12, 14, 14, 14, 14
_l_

[ ] _l_
⌢
_K_ = 12, 12, 14, 14, 14, 14 12, 12, 12, 12 [1,1,1,1]
_l_

[ ] [,] [ ] [,] [ ]
⎡⎣ ⎤⎦

_s_
−1
_Sk_ _i_

_U_ ≥ 1
_l_

∑ _i_ = _s_ 0

_s_
−1
_Sk_

_U_ = _U_
_l_ _l_

_i_ = _s_

_i_

_i_ = _s_

#### BACKGROUND

**Tripartite Authentic Data (VC) Model**

Issuer: Source of the VC. Creates (issues) and signs VC
Holder: Usually the target of the VC. The holder is the “ _issuee_ ” that receives the VC and holds it for its own use.
Verifier: Verifies the signatures on the VC and authenticates the holder at the time of presentation

The issuer and target each have a DID (decentralized identifier).
The DIDs are used to look-up the public key(s) needed to verify signatures.

Issuer-Holder-Verifier Model

**Tripartite Authentic Data (VC) Model with VDR**

Verifiable Data Registry (VDR) enables decentralized but interoperable discovery and verification of authoritative key pairs for
DIDs in order to verify the signatures on VCs. A VDR may also provide other information such as data schema or revocation state
of a VC.

Each controller of a DID registers that DID on a VDR so that a verifier can determine the authoritative key pairs for any
signatures.

We call this determination, _establishment of control authority_ over a DID.

Issuer-Holder-Verifier Model with Verification at Verifiable Data Registry

**KERI VDRs vs. Shared Ledger VDRs**

Most DID methods use a shared ledger (commonly referred to as a _blockchain_ ) for their VDR. Typically, in order to interoperate all participants must
use the same shared ledger or support multiple different DID methods. There are currently over 70 DID methods. Instead GLEIF has chosen to use
KERI based DID methods. KERI stands for Key Event Receipt Infrastructure. KERI based VDRs are ledger independent, i.e. not locked to a given ledger.
This provides a path for greater interoperability without forcing participants in the vLEI ecosystem to use the same shared ledger.

A KERI VDR is called a key event log (KEL). It is a cryptographically verifiable hash chained data structure. Each KERI based identifier has its own
dedicated KEL. The purpose of the KEL is to provide proof of the establishment of control authority over an identifier. This provides cryptographically
verifiable proof of the current set of authoritative keys for the identifier. KERI identifiers are long cryptographic pseudo random strings of characters.
They are self-certifying and self-managing.

A KERI identifier is abstractly called an Autonomic Identifier (AID) because it is self-certifying and self-managing. A KERI DID is one concrete
implementation of a KERI AID. The same KERI prefix may control multiple different DIDs as long as they share the same prefix.

Full Sequence

Establishment

Subsequence

Non-Establishment

Subsequence

```
did:keri: prefix [: options ][/ path ][? query ][# fragment ]

did:keri:ENqFtH6_cfDg8riLZ-GDvDaCKVn6clOJa7ZXXVXSWpRY

```

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

**KERI Identifier KEL VDR** _**Controls**_ **Verifiable Credential Registry TEL VDR**

A KERI KEL for a given identifier provides proof of authoritative key state at each event. The events are ordered. This ordering may
be used to order transactions on some other VDR such as a Verifiable Credential Registry by attaching anchoring seals to the KEL
events.
The set of transactions that determine registry state form a log called a Transaction Event Log (TEL).
Transactions are signed with the authoritative keys determined by the key state in the KEL with the transaction seal.
The transactions likewise contain a reference seal back to the key event authorizing the transaction.
This setup enables a KEL to control a TEL for any purpose.
In the case of the vLEI the TEL controls a vLEI issuance and revocation registry.
The TEL provides a cryptographic proof of registry state by reference to the corresponding controlling KEL.
Any validator may therefore cryptographically verify the authoritative state of the registry.

_seal = proof of authenticity_

**Registry with Separable VC Issuance-Revocation TELs**

Each VC may be uniquely identified with a content digest.
Each VC also has a uniquely identified issuer using a KERI AID.
This combination enables a separable registry of VC issuance-revocation state.
The state may employ a cryptographic accumulator for enhanced privacy

**Identifier System Security**

Authentic transmission of data may be verified using an identity system security overlay.
This overlay maps cryptographic key-pairs to identifiers.
When those identifiers are self-certifying they are derived via cryptographic one-way functions from the key pairs.
This provides a self-certifying identifier with a cryptographic root-of-trust.
A key event log (KEL) provide support for secure key rotation without changing the identifier.
Message authenticity is provided by verifying signatures to the authoritative keys pairs for the identifier included in the
message.

Cryptographic Material Derivation Code Tables

Length of crypt material determines number of pad characters. One character table for one pad char. Two character table for two pad char.

One Character KERI Base64 Prefix Derivation Code Selector

Four Character KERI Base64 Count Code for Attached Receipt Couplets

|Derivation<br>Code|Prefix Description|
|---|---|
|**0**|Two character derivation code. Use two character table.|
|**1**|Four character derivation code. Use four character table.|
|**2**|Five character derivation code. Use fve character table.|
|**3**|Six character derivation code. Use six character table.|
|**4**|Eight character derivation code. Use eight character table.|
|**5**|Nine character derivation code. Use nine character table.|
|**6**|Ten character derivation code. Use ten character table.|
|**-**|Count code for attached receipts. Use receipt count code table(s)|

One Character KERI Base64 Prefix Derivation Code

|Derivati<br>on<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Count<br>Code<br>Length|Qual<br>Length<br>Base64|Code<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**-A**_XX_|Count of Attached Qualifed Base64 Receipt Couplets|0|0|4|4|3|
|**-B**_XX_|Count of Attached Qualifed Base2 Receipt Couplets|0|0|4|4|3|

Two Character KERI Base64 Prefix Derivation Code

|Derivation<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Derivat<br>ion<br>Code<br>Length|Prefix<br>Length<br>Base64|Prefix<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**0A**|Ed25519 signature. Self-signing derivation.|64|2|2|88|66|
|**0B**|ECDSA secp256k1 signature. Self-signing derivation.|64|2|2|88|66|
|**0C**|Blake3-512 Digest. Self-addressing derivation.|64|2|2|88|66|
|**0D**|SHA3-512 Digest. Self-addressing derivation.|64|2|2|88|66|
|**0E**|Blake2b-512 Digest. Self-addressing derivation.|64|2|2|88|66|
|**0F**|SHA2-512 Digest. Self-addressing derivation.|64|2|2|88|66|

|Derivation<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Derivat<br>ion<br>Code<br>Length|Prefix<br>Length<br>Base64|Prefix<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**A**|Non-transferable prefx using Ed25519 public signing<br>verifcation key. Basic derivation.|32|1|1|44|33|
|**B**|X25519 public encryption key. May be converted from<br>Ed25519 public signing verifcation key.|32|1|1|44|33|
|**C**|Ed25519 public signing verifcation key. Basic derivation.|32|1|1|44|33|
|**D**|Blake3-256 Digest. Self-addressing derivation.|32|1|1|44|33|
|**E**|Blake2b-256 Digest. Self-addressing derivation.|32|1|1|44|33|
|**F**|Blake2s-256 Digest. Self-addressing derivation.|32|1|1|44|33|
|**G**|Non-transferable prefx using ECDSA secp256k1 public<br>singing verifcation key. Basic derivation.|32|1|1|44|33|
|**H**|ECDSA secp256k1 public signing verifcation key. Basic<br>derivation.|32|1|1|44|33|
|**I**|SHA3-256 Digest. Self-addressing derivation.|32|1|1|44|33|
|**J**|SHA2-256 Digest. Self-addressing derivation.|32|1|1|44|33|

Attached Signature Derivation Code Tables

Length of crypt material determines number of pad characters. One character table for one pad char. Two character table for two pad char.

Two Character KERI Base64 Attached Signature Selection Code

Four Character KERI Base64 Count Code for Attached Signatures

|Derivation<br>Code|Selector Description|Data<br>Length<br>Bytes|Pad<br>Length|Derivation<br>Code<br>Length|Prefix<br>Length<br>Base64|Prefix<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**0**|Four character attached signature code. Use four character table||||||
|**1**|Five character attached signature code. Use fve character table||||||
|**2**|Six character attached signature code. Use six character table||||||
|**-**|Count code for attached signatures. Use attached signature count code table(s)||||||

Two Character KERI Base64 Attached Signature Derivation Code

|Derivation<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Count<br>Code<br>Length|Qual<br>Length<br>Base64|Code<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**-A**_XX_|Count of Attached Qualifed Base64 Signatures|0|0|4|4|3|
|**-B**_XX_|Count of Attached Qualifed Base2 Signatures|0|0|4|4|3|

|Derivation<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Derivation<br>Code<br>Length|Prefix<br>Length<br>Base64|Prefix<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**A**_X_|Ed25519 signature|64|2|2|88|66|
|**B**_X_|ECDSA secp256k1 signature|64|2|2|88|66|

Four Character KERI Base64 Attached Signature Derivation Code

|Derivation<br>Code|Prefix Description|Data<br>Length<br>Bytes|Pad<br>Length|Derivation<br>Code<br>Length|Prefix<br>Length<br>Base64|Prefix<br>Length<br>Bytes|
|---|---|---|---|---|---|---|
|**0A**_XX_|Ed448 signature|114|0|4|156|117|
|**OB**_XX_|||||||
|**0C**_XX_|||||||
||||||||

Base64

Base64 Decode ASCII to Binary

Base64 Binary Decoding from ASCII

Base64 Encode Binary to ASCII

Base64 Binary Encoding to ASCII

|ASCII<br>Char|Base64<br>Index<br>Decimal|Base64<br>Index<br>Hex|Base64<br>Index<br>6 bit Binary|ASCII<br>Char|Base64<br>Index<br>Decimal|Base64<br>Index<br>Hex|Base64<br>Index<br>6 bit Binary|ASCII<br>Char|Base64<br>Index<br>Decimal|Base64<br>Index<br>Hex|Base64<br>Index<br>6 bit Binary|ASCII<br>Char|Base64<br>Index<br>Decimal|Base64<br>Index<br>Hex|Base64<br>Index<br>6 bit Binary|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|A|0|00|000000|Q|16|10|010000|g|32|20|100000|w|48|30|110000|
|B|1|01|000001|R|17|11|010001|h|33|21|100001|x|49|31|110001|
|C|2|02|000010|S|18|12|010010|i|34|22|100010|y|50|32|110010|
|D|3|03|000011|T|19|13|010011|j|35|23|100011|z|51|33|110011|
|E|4|04|000100|U|20|14|010100|k|36|24|100100|0|52|34|110100|
|F|5|05|000101|V|21|15|010101|l|37|25|100101|1|53|35|110101|
|G|6|06|000110|W|22|16|010110|m|38|26|100110|2|54|36|110110|
|H|7|07|000111|X|23|17|010111|n|39|27|100111|3|55|37|110111|
|I|8|08|001000|Y|24|18|011000|o|40|28|101000|4|56|38|111000|
|J|9|09|001001|Z|25|19|011001|p|41|29|101001|5|57|39|111001|
|K|10|0A|001010|a|26|1A|011010|q|42|2A|101010|6|58|3A|111010|
|L|11|0B|001011|b|27|1B|011011|r|43|2B|101011|7|59|3B|111011|
|M|12|0C|001100|c|28|1C|011100|s|44|2C|101100|8|60|3C|111100|
|N|13|0D|001101|d|29|1D|011101|t|45|2D|101101|9|61|3D|111101|
|O|14|0E|001110|e|30|1E|011110|u|46|2E|101110|-|62|3E|111110|
|P|15|0F|001111|f|31|1F|011111|v|47|2F|101111|_|63|3F|111111|

|Base64<br>Index<br>Decimal|ASCII<br>Char|ASCII<br>Decimal|ASCII<br>Hex|ASCII<br>8 bit<br>Binary|Base64<br>Index<br>Decimal|ASCII<br>Char|ASCII<br>Decimal|ASCII<br>Hex|ASCII<br>8 bit<br>Binary|Base64<br>Index<br>Decimal|ASCII<br>Char|ASCII<br>Decimal|ASCII<br>Hex|ASCII<br>8 bit<br>Binary|Base64<br>Index<br>Decimal|ASCII<br>Char|ASCII<br>Decimal|ASCII<br>Hex|ASCII<br>8 bit<br>Binary|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|**0**|A|65|41|01000001|**16**|Q|81|51|01010001|**32**|g|103|67|01100111|**48**|w|119|77|01110111|
|**1**|B|66|42|01000010|**17**|R|82|52|01010010|**33**|h|104|68|01101000|**49**|x|120|78|01111000|
|**2**|C|67|43|01000011|**18**|S|83|53|01010011|**34**|i|105|69|01101001|**50**|y|121|79|01111001|
|**3**|D|68|44|01000100|**19**|T|84|54|01010100|**35**|j|106|6A|01101010|**51**|z|122|7A|01111010|
|**4**|E|69|45|01000101|**20**|U|85|55|01010101|**36**|k|107|6B|01101011|**52**|0|48|30|00110000|
|**5**|F|70|46|01000110|**21**|V|86|56|01010110|**37**|l|108|6C|01101100|**53**|1|49|31|00110001|
|**6**|G|71|47|01000111|**22**|W|87|57|01010111|**38**|m|109|6D|01101101|**54**|2|50|32|00110010|
|**7**|H|72|48|01001000|**23**|X|88|58|01011000|**39**|n|110|6E|01101110|**55**|3|51|33|00110011|
|**8**|I|73|49|01001001|**24**|Y|89|59|01011001|**40**|o|111|6F|01101111|**56**|4|52|34|00110100|
|**9**|J|74|4A|01001010|**25**|Z|90|5A|01011010|**41**|p|112|70|01110000|**57**|5|53|35|00110101|
|**10**|K|75|4B|01001011|**26**|a|97|61|01100001|**42**|q|113|71|01110001|**58**|6|54|36|00110110|
|**11**|L|76|4C|01001100|**27**|b|98|62|01100010|**43**|r|114|72|01110010|**59**|7|55|37|00110111|
|**12**|M|77|4D|01001101|**28**|c|99|63|01100011|**44**|s|115|73|01110011|**60**|8|56|38|00111000|
|**13**|N|78|4E|01001110|**29**|d|100|64|01100100|**45**|t|116|74|01110100|**61**|9|57|39|00111001|
|**14**|O|79|4F|01001111|**30**|e|101|65|01100101|**46**|u|117|75|01110101|**62**|-|45|2D|00101101|
|**15**|P|80|50|01010000|**31**|f|102|66|01100110|**47**|v|118|76|01110110|**63**|_|95|5F|01011111|

###### Discovery

Ledger Based

Non-Ledger Based

###### DNS “Hierarchical” Discovery

Diagrams from https://www.cloudflare.com/learning/dns/what-is-dns/

$ORIGIN example.com.
@          3600 SOA  ns1.p30.oraclecloud.net. (
zone-admin.dyndns.com.   ; address of responsible party
2016072701         ; serial number
3600            ; refresh period
600            ; retry period
604800           ; expire time
1800           ) ; minimum ttl
86400 NS  ns1.p68.dns.oraclecloud.net.
86400 NS  ns2.p68.dns.oraclecloud.net.
86400 NS  ns3.p68.dns.oraclecloud.net.
86400 NS  ns4.p68.dns.oraclecloud.net.
3600 MX  10 mail.example.com.
3600 MX  20 vpn.example.com.
3600 MX  30 mail.example.com.
60 A   204.13.248.106
3600 TXT  "v=spf1 includespf.oraclecloud.net ~all"
mail         14400 A   204.13.248.106
vpn           60 A   216.146.45.240
webapp          60 A   216.146.46.10
webapp          60 A   216.146.46.11
www          43200 CNAME example.com.

###### DHT “Distributed” Discovery

Diagrams from https://en.wikipedia.org/wiki/Distributed_hash_table
Diagrams from https://en.wikipedia.org/wiki/Kademlia

###### DHT Discovery for KERI

Lookup IP address of any DHT Node Prefix

bootstrap DHT access from any cache ( ≈ DNS Server cache)

Query DHT for Latest Rotation Event of Controller Prefix
-> Extract Witness Prefixes from Event (≈ CName Record)

Query DHT for IP Address of Witness Prefix (≈ A Record)

Query Witness for KERL of Controller Prefix

Query Watcher Network for Duplicitous KERL of Controller Prefix

###### Certificate Transparency Problem

[“The solution the computer world has relied on for many years is to introduce into the system trusted](https://w3c-ccg.github.io/did-spec/)
third parties (CAs) that vouch for the binding between the domain name and the private key. The
problem is that we've managed to bless several hundred of these supposedly trusted parties, any of
which can vouch for any domain name. Every now and then, one of them gets it wrong, sometimes
spectacularly.”

Pinning inadequate
Notaries inadequate
DNSSec inadequate
All require trust in 3rd party compute infrastructure that is inherently vulnerable

Certificate Transparency: (related EFF SSL Observatory)
Public end-verifiable append-only event log with consistency and inclusion proofs
End-verifiable duplicity detection = Ambient verifiability of duplicity
Event log is third party infrastructure but zero trust because it is verifiable.
Sparse Merkle Trees for revocation of certificates

###### Certificate Transparency Solution

Public end-verifiable append-only event log with consistency and inclusion proofs
End-verifiable duplicity detection = ambient verifiability of duplicity
Event log is third party infrastructure but it is not trusted because logs are verifiable.
Sparse Merkle trees for revocation of certificates

# Key Event Receipt Infrastructure

Security Considerations

_Samuel M. Smith Ph.D._
_[sam@samuelsmith.org](mailto:sam@keri.one)_

_[https://keri.one](https://keri.one)_

version 2.59

2021/03/09

**Macro vs. Micro Security Considerations for Public KERI Identifiers**

Macro:
Cryptographic root-of-trust via self-certifying identifiers (SCID) of different types (self-addressing, delegated, etc)
Cryptographically Verifiable Data Structure (VDS) that provides proof of key state for its identifier = Key Event Log (KEL)
Key management embedded in VDS construction including recovery from key compromise
Multi-valent key management infrastructure via delegation
Externally anchored transactions via cryptographic commitments in VDS = Transaction Event Log (TEL)
Separated control of promulgation of KEL (witnesses) vs confirmation of KEL (watchers+)
Threshold structures via pools of promulgation nodes and confirmation nodes
Duplicity Detection

Micro:
Details of self-certifying identifier construction
Details of VDS = KEL construction
Details of key management embedded in VDS construction including recovery from key compromise
Details of multi-valent key management infrastructure via delegation
Details of promulgation and confirmation communication protocols and pool construction
Details of Duplicity Detection algorithms and protocols

The security of KERI private identifiers in pair-wise or group-wise relationships is trivially established.

**Security from Outside In**
•Treat Micro considerations as a black box with certain properties
•Examine the macro considerations
Properties:
KEL (VDS) is cryptographically verifiable hash chained non-repudiably signed data structure

KEL

Successful attacks on KEL (VDS) and its root-of-trust require key compromise

(VDS)

Best practices KEY management practically limits Key compromise to side channel attacks on exposed signing keys

Black Box

Recovery from signing key compromise ensured via unexposed post quantum committed one time rotation keys
Multi-valent cooperative delegation = scalable performant tiered-security key management via hierarchies of KELs

Full Sequence

Establishment

Subsequence

Non-Establishment

Subsequence

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

**Terminology**

_Controller_ is entity that controls the authoritative set of asymmetric key-pairs for an identifier (PKI). Non-repudiable
signature key pairs.
KEL provides cryptographically verifiable proof of control authority over an identifier and its KEL via authoritative set
of key-pairs
KEL authoritative key state is recursively constructed from inviolable entropy generated root-of-trust for the incepting
key state.
Future changes to key state are controlled by key-pairs that the KEL itself establishes as authoritative via keys pairs
from past key state.
KEL is a cryptographically verifiable state machine that provides proof of key state and hence proof of control
authority over identifier.
_Validator_ is entity that validates the key state of a given Controller’s identifier.
This validation includes but is not limited to cryptographically verifying the KEL.
A two party interaction between a first party and second party creates a pair-wise relationship of two identifiers/KELs.
Each party acts in turn as _Controller_ of own identifier/KEL and _Validator_ of the other’s identifier/KEL.
Each _Validator’s decision to interact_ is based on its validation and resultant degree of trust in _Controller’s_ identifier/KEL
used in the interaction.

**Macro Consideration #1: Key Compromise**

•External entity compromises Controller’s exposed signing keys.
•Malicious Controller misuses its own signing keys
Both exhibit as the existence of two or more duplicitous but cryptographically verifiable KELs for a given identifier
Non-repudiable signatures on each KEL make duplicity provable and detectable given any copy of set of duplicitous KELs
from any source.
_Validator_ may be protected from such key compromise given it detects duplicity before continuing interaction with
Controller.

Full Sequence

Establishment

Subsequence

Non-Establishment

Subsequence

###### Inconsistency and Duplicity

_inconsistency_ : lacking agreement, as two or more things in relation to each other

_duplicity_ : acting in two different ways to different people concerning the same matter

Internal vs. External Inconsistency

Internally inconsistent log = not verifiable.

Log verification from self-certifying root-of-trust protects
against internal inconsistency.

Externally inconsistent log with a purported copy of log but
both verifiable = duplicitous.

Duplicity detection protects against external inconsistency.

|Inception Event|Col2|Col3|
|---|---|---|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction  Event|Interaction  Event|
|Rotation Event|Rotation Event|Rotation Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
|Rotation Event|Rotation Event|Rotation Event|
||Interaction Event|Interaction Event|
||Interaction Event||
||Interaction Event|Interaction Event|
||Interaction Event||

Duplicity Game

_How may Cate be duplicitous_

Cate promises to provide a

_How may Cate be_

consistent pair-wise log.

_and not get caught?_

consistent pair-wise log.
_Local Consistency Guarantee_

Cate
_Controller_

Log

Eve
_Validator_

Log

private (one-to-one) interactions

Joe
_Validator_

Log

Service promises to provide a

consistent log to anyone.
_Local Consistency Guarantee_

Duplicity Game

Cate
_Controller_

Log

How may Cate/Service/Agent be

duplicitous and not get caught?

Truncate Log

Delete Log

Service/Agent
_Controlled by Cate_

Log

Eve
_Validator_

Log

Joe
_Validator_

Log

highly available, private (one-to-one) interactions

Service promises to provide
exact same log to everyone.
_Global Consistency Guarantee_

Duplicity Game

Cate
_Controller_

Log

How may Cate and/or service be

duplicitous and not get caught?

Service
_Controlled by Cate_

Log

How may Cate and/or service be

duplicitous and not get caught?

Service promises to provide
exact same log to everyone.

Cate
_Controller_

Log

Service
_Controlled by Cate_

Log

Duplicity Game

Cate
_Controller_

Log

Service
_Controlled by Cate_

Log

**Macro Consideration #2: First Seen Immutability of Verifiers (Watchers) of KEL**

_Watcher_ is observer of KEL that verifies a given KEL using its _first seen_ version of that KEL.
_First Seen_ = Always Seen never Unseen. No later key compromise (dead attack) may change first seen state of honest watcher..
Honest watcher’s verified KEL is immutable due to its first seen policy.
Watchers are selected by or under the control of Validator.
A pool of watchers may be secure without trusting any given watcher due to threshold structure of pool.
By construction a Validator may trust that a sufficient majority of Watchers in pool are honest at any time.
Watcher pool thus constructed either provides simple secure distributed consensus about KEL duplicity or not at all.
Validator may thereby appraise _authoritative_ state of a given KEL in spite of duplicity. One authoritative KEL or none at all.
_First Seen_ consensus in combination with the fact that successful attacks on a KEL require key compromise of exposed keys mean that
Controller may have window of opportunity to promulgate key event before key compromise of keys exposed by that same promulgated
event.
Once promulgated throughout watcher network (which may happen in milliseconds) the event becomes immutably first seen by
consensus majority of watchers. (global majority)
No later compromise of keys and resultant promulgation of alternative event may displace that first seen consensus version.
The authoritative KEL is thus established immutably or not at all.
In the case of side channel attack on live signing keys (live attack), malicious event may be promulgated before Controller’s event. A
rotation recovery from one time pre-rotated keys enables controller to recover from such a live attack.
This recovery operation may be repeated until Controller detects and mitigates side channel attack.
Main purpose of Witness pool designated by Controller is to help honest Controller ensure that its own promulgation of any event happens
before any compromised event.

**Macro Consideration #3: Safety and Liveness of Total Ordering**

_Safety and Liveness_ are typically used to describe properties
of Byzantine fault tolerant (BFT) totally ordering distributed
consensus algorithms
Such an algorithm depends on a pool of Nodes that each
maintain a replicated copy of a global ledger.
Each replicated ledger is a verifiable data structure (VDS)
consisting of transactions promulgated to the nodes by any
number of remote clients.
_Total ordering_ means that all the transactions from all clients
have the same ordering in every replicated ledger.
Total ordering enables double spend proofing of a both
fungible asset balances and non-fungible assets in the ledger.
Double spend proofing is an essential property for cryptocurrencies.
_Safety_ means that whenever Node pool comes to consensus
as to the ordering of of all client promulgated transactions
they will come to the same consensus or none at all.
Liveness means that the Node pool will eventually come to
consensus as the total ordering of all client promulgated
transactions.

**Macro Consideration #3 continued: Hard constraint space = high cost floor**

There are four major classes of BFT total ordering
distributed consensus algorithms with many variants and
hybrids. These are:
Verifiable Random Function (VRF)
Byzantine Agreement (BA)
Proof-of-Work (PoW)
Proof-of-Stake (PoS)

they operate within hard constraint space that must trade

latency and governance to name a few.
This hard constraint space establishes a cost for
performance floor that may be orders of magnitudes
higher than cloud infrastructure that does have similar
requirements.
Thus an identifier system does not absolutely need to

of these requirements.

**Macro Consideration #3 continued: Ledger as primary root-of-trust is not portable**

When the Ledger Algorithm is the primary root-of-trust/
source-of-trust for ordering transactions then key-state is
bound to that ledger.
Porting to other ledgers requires additional infrastructure
or a VDS that is not the Ledger. In which case the Ledger
merely acts as storage, discovery, and/or secondary rootof-trust mechanism.
Portable infrastructure requires cryptographic
commitments to infrastructure state just like key state.
Ledgers are essentially platforms with shared governance.

platformed identifiers (identity).
KERI wants to de-platform identity systems by making
identifiers truly portable.
Much of DID method proliferation is driven by an attempt
to drive market value to a given platform usually a ledger
with a platform (ledger) locked (platform specific)
identifier (DID method).

###### _Ledger Attack Vectors_

Exploring the Attack Surface of Blockchain: A Systematic Overview https://arxiv.org/pdf/1904.03487.pdf

Exploring the Attack Surface of Blockchain: A Systematic Overview https://arxiv.org/pdf/1904.03487.pdf

**Macro Consideration #3 continued: Secure Attribution only requires Safety, not liveness nor Total Ordering**

An identifier system must solve the secure attribution
problem. In other words any statement must be
either securely attributed to its source or not at all, i.e.
the authenticity of any statement may be established.
This protects any user from harm that may result from
relying on the authenticity of that statement.
The innovation of KERI is recognizing that the secure
attribution problem may be solved by only requiring
safety not liveness or total ordering.
In KERI the only entity that may order the events in a
KEL is the Controller. Thus total ordering is not
required. In KERI a controller is solely responsible for
ensuring liveness if at all. The one primarily harmed by
lack of liveness is an honest Controller. Each validator
is responsible for its own safety with regard a given
Controller’s KEL. If the validator has irreconcilable
evidence of duplicity then that Controller’s KEL is
effectively dead (no liveness) to that Validator. An
honest Controller has every incentive to ensure there
is no irreconcilable duplicity with regards its own KEL
to ensure liveness.
So a KEL is ordered by its Controller and it may be live
and safe but the liveness is up to the controller while
safety is up to the Validator.
Better _dead_ but _safe_ than _live_ but _unsafe_ .

Key Event Promulgation Service Key Event Confirmation Service

**Macro Consideration #4: Honest Controller ensures Liveness with key management**

An honest Controller may ensure liveness of its KEL by employing best-of-breed key management
for its authoritative key sets and best practices security for its witnesses.
KERI provides a full suite of operations to facilitate best-of-breed key management with async
multi-sig, post quantum pre-rotation, and recovery of compromised signing keys, as well as
hierarchical tiered cooperative delegated multi-valent infrastructure with recovery of both
compromised signing and compromised rotation keys on nested levels.
KERI witnesses allow any level of extra security layering (additional access control) by an honest
Controller to ensure its own un-compromised events are always promulgated first, resulting in
universal immutable first seen status of the global watcher network.
As a special case a Controller may designate as its witnesses, one or more Ledger oracles. This
allows applications to leverage needed for beneficial features of a ledger or ledgers.
One such application are NFTs where all of safety, liveness, and double spend proofing are
required. But because NFTs are non-fungible we can use a KEL with a transferable identifier
derived from the digital content of the NFT to provide double spend proofing. We only need the
ledger to guarantee liveness. Specifically to ensure double spend proofing and liveness only one
ledger at a time may be used but the NFT may be portably moved from one ledger to another by
rotating the one witness. So its a one-ledger-at a time solution. All validators must trust the one
ledger so there is no duplicity. The authoritative KEL is always the one KEL registered on the one
ledger and then moved or registered on a new ledger.
Recall that liveness is the responsibility of the controller. A given NFT could require that each
successive controller of the NFT in turn use a minimal level of key management and witness
configuration that ensures liveness to a higher margin than a ledger ensures safety. In such a case
then the overall security of a non-ledger KERI NFT would be higher than a ledger based KERI NFT.
The weak link of the ledger is the access identifier private key protection from key compromise
(safety) which may be much less than KERI.

###### Pre-Rotation

Digest of _next_ key(s) makes pre-rotation post-quantum secure

###### _Key Infrastructure Valence_

###### Scaling Delegation via Interaction

|A Key Event Stream Delegator|X Key Event Stream Y Key Event Stream Z Key Event Stream Delegate Delegate Delegate|
|---|---|
|A Inception|X ∆← A Inception<br>X Interaction<br>Y ∆← A Inception<br>Y Interaction<br>Z Interaction<br>X Interaction<br>X ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Z ∆← A Inception<br>X Interaction<br>X Interaction<br>X Interaction<br>Y Interaction<br>Y Interaction<br>Y ∆← A Rotation<br>Y Interaction<br>Y Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>X ∆← A Rotation<br>X Interaction<br>X Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>Z Interaction<br>Z ∆← A Rotation<br>Z Interaction<br>Z Interaction<br>|
|A Rotation|A Rotation|
|A Interaction<br>∆→ X Inception|A Interaction<br>∆→ X Inception|
|A Interaction<br>∆→ Y Inception|A Interaction<br>∆→ Y Inception|
|A Interaction<br>∆→ Z Inception|A Interaction<br>∆→ Z Inception|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ Y Rotation|A Interaction<br>∆→ Y Rotation|
|A Interaction<br>∆→ Z Rotation|A Interaction<br>∆→ Z Rotation|
|A Interaction<br>∆→ X Rotation|A Interaction<br>∆→ X Rotation|
|A Rotation|A Rotation|

|Col1|Col2|Col3|Col4|Col5|Col6|Col7|
|---|---|---|---|---|---|---|
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||
||||||||

∆← A : Delegation from A

**Macro Consideration #5: Validator is responsible for ensuring its Safety WRT a given KEL**

Each Validator selects Watchers it trusts.
These may include multiple levels of trust from Watchers it controls to reputable watchers controller by other entities.
Together they form a watcher network with a shared incentive to detect duplicitous behavior by Controllers.
Each Validator appraise evidence of duplicity as observed by its Watcher network.
Given no evidence of duplicity then Validator trusts KEL.
Given evidence of duplicity then Validator must reconcile that duplicity or else the KEL is dead to that Validator.
KERI provides key rotation recovery mechanisms to enable duplicity reconciliation of live signing key compromise.
Immutable first seen property of honest watchers in threshold structure enables duplicity reconciliation of dead (stale)
key compromise.

###### _Security Concepts_

Availability, Consistency, and Duplicity

_Harm to controller_ : Unavailability, loss of control authority, externally forced duplicity

_Harm to validator_ : Inadvertent acceptance of verifiable but forged or duplicitous events

Local vs. Global Duplicity Guarantees

Direct Mode vs. Indirect Mode Operation

Malicious Controller vs. Malicious Third Party

Live Exploit vs. Dead Exploit

Controller Protection vs. Validator Protection

Protection to controller: key management, promulgation consensus, redundancy.

Protection to validator: verifiable logs, verification consensus, duplicity detection

Ledger:

Network paid by transaction fees

###### _Apples-to-Apples_

KERI:

Networks paid by transaction fees

(more or less competitive within the network)

Successful exploits without compromised keys

_Controller_ :

Highly available nodes of other’s choosing

Must trust that a majority are honest

No recovery if keys compromised

_Validator;_

Need full copy of ledger (big)

Need full access to network

Must trust that a majority are honest

(competitive across all networks)

_Controller_ :

Highly available nodes of own choosing

Must “ _trust”_ that a majority are honest

Successful exploits must compromise keys

Recovery if keys compromised

_Validator_ :

Need full copy of KEL (small)

Need full access to network of own choosing.

Must “ _trust”_ that a majority are honest

###### Smith’s Identifier System Properties Triangle

May exhibit any two at the highest level but not all three at the highest level

###### Trust Basis

###### Administrative Trust Basis

DNS/Certificate Authorities

###### Algorithmic Trust Basis

Shared Distributed Ledgers

###### Autonomic Trust Basis

Cryptographic Proofs

Composable cryptographic material primitives and groups

in dual text and binary streaming protocol design

Application

Presentation

Session

Transport

Network

Link

Physical

TCP, UDP

IP

OSI Model IP Model

_LonTalk Protocol (1988+)_
CEA/EIA/ANSI 709.1 - .4
EN/ISO/IEC 14908.1 - .4
ISO/IEC JTC 1/SC 6.
GB/Z 20177.1-2006
IEEE 1473-L
SEMI E54
IFSF
OSGP
NASA FAA DO-178B 709.1

_LonTalk over IP (UDP)_
CEA/EIA/ANSI 852 A B C
CEA/EIA/ANSI 852.1

RAET (Reliable Asynchronous
Event Transport) Protocol
Reliable secure UDP

Application

Transport

Network

Link

**Open Standard Protocol Design History**

Authentication

**Protocol Formats**

**Internet Protocols**
_**Binary**_
UDP, TCP, DNS, RTP, RTCP, NTP, SNMP, BGP, BGMP, ARP,
IGMP, RIP, PING, WebRTC
_**Text**_ _(line based)_
Syslog, SMTP, POP, Telnet, NNTP, RTSP, IRC

**Text** _(header framed)_
_HTTP, SIP_

_**Inflection Point in Protocol Design**_ _(dual representation)_
_XML, JSON (text self describing map)_
_MGPK, CBOR (binary self describing map)_

**Cryptographic Protocols**
_**JSON or Hybrid JSON/MGPK**_
RAET, Secure Scuttlebutt, DIDCom
**Fixed Binary**
RLPx (Ethereum)
Bitcoin
_**Flexible Concatenable Binary Crypto Material**_
Noise (Signal)
_**Flexible Composable Concatenable Text/Binary Crypto Material**_
CESR (KERI) Composable Event Streaming Representation

**Binary vs Text Based Protocol Features**

**Binary Format**
_Advantages_ :
Compact, efficient, and performant
_Disadvantages_ :
Difficult to develop, test, debug (over the wire), prove compliance, and extremely difficult to fix and version
Requires custom tooling especially over the wire debug, difficult to understand, and _hard to gain adoption_ .

**Text Format** (especially self-describing hash map based)
_Advantages_ :
Easy to develop, test, debug (especially over the wire), and prove compliance, and extremely easy to fix and version
Requires little custom tooling especially over the wire debug, easy to understand and _easy to gain adoption_ .
_Disadvantages_ :
Verbose, Inefficient, Non-performant

**Hybrid Both Text & Binary Formats** (self describing map, Text=JSON  and Binary=MGPK or CBOR)
_Advantages_ :
Zero cost to switch between text and binary. Text for development and adoption. Binary for production use.
Easy to develop, test, debug (especially over the wire), and prove compliance when text
Requires little custom tooling especially over the wire debug, easy to understand
Extremely easy to fix and version
Easy to adopt as text with no additional barrier to binary adoption
Fairly compact when binary, Fairly efficient when binary, fairly performant when binary

**Composable Concatenable (Text/Binary) Event Streaming Representation (CESR)**

**Hybrid Flexible Concatenated Compact Text Base64 & Binary Formats**
_Advantages_ :
Composable _(any concatenated block in one format may be converted as a block to the other without loss, round trippable )_
Zero cost to switch between text and binary. Text for development and adoption. Binary for production use.
Flexible concatenation of heterogenous crypto material that preserves byte/char boundaries between primitives
Pipelined parsing and processing
Stream or Datagram
Fully qualified self framing derivation codes for primitives.
Fully qualified self framing count codes for groups of primitives or groups of groups.
Fully qualified self framing count codes for pipelining groups.
More compact text and binary than hybrid text and binary self describing map based formats
Fairly Easy to develop, test, debug (especially over the wire), and prove compliance when text
Fairly easy to fix and version
Requires little custom tooling especially over the wire debug when text
Fairly easy to understand when text
Archivable audit compliant text format
Fairly easy to adopt as text with no additional barrier to binary adoption
Compact when binary, Efficient when binary, Performant when binary
_Disadvantages:_
Not as but almost as compact, efficient, performant as non-composable tuned binary.

**Three native domains and formats**
Raw Domain (separated code and raw binary) (cryptographic operations)
Namespace Domain (fully qualified text) (name-spaceable text) (streamable text) (archivable text) (envelopable text)
Compact Domain (fully qualified binary) (streaming binary)

Raw Domain = Raw binary representation that crypto libraries use

Compact Domain = Fully qualified binary representation of cryptographic material for efficient over the wire streaming

Namespace Domain = Fully qualified text representations of cryptographic material: identifiers, digests, signatures etc

Includes any textual use of cryptographic material, Documents, VCs, Archives, Audit logs etc

Usable in over the wire streaming for development and debug
```
BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0
did:keri: prefix [: options ][/ path ][? query ][# fragment ]
did:keri:BDKrJxkcR9m5u1xs33F5pxRJP6T7hJEbhpHrUtlDdhh0/path/to/resource?name=bob#really

{
"id": "did:keri:Eewfge7gf78sgfivsf/vLEIGLEIFCredential", // DID of the verifiable credential itself

"type":

[

"VerifiableCredential",

"vLEIGLEIFCredential"

], // type of the verifiable credential

"issuer": "did:keri:Eewfge7gf78sgfivsf/DelegatedGLEIFRootID", // issuer of the verifiable credential

"issuanceDate": "2021-02-10T17:50:24Z", // date of issuance

"credentialSubject":

{

"id": "did:keri:Eewfge7gf78sgfivsf/GLEIFRootID", // DID of the issuee / holder

"lei": "506700GE1G29325QX363" // LEI

},

"proof":

{
"signature": "AAmdI8OSQkMJ9r-xigjEByEjIua7LHH3AOJ22PQKqljMhuhcgh9nGRcKnsz5KvKd7K_H9-1298F4Id1DxvIoEmCQ"
}
}

```

**Round Trippable Closed loop Transformation**
Namespace to/from Compact to/from Raw Domain to/from Namespace
Fully qualified means prepended derivation code.
In namespace domain, readability is enhanced if prepended derivation code is stable and is not changed by post-pended crypto material value
Namespace domain, T, is fully qualified Base64. Streaming binary domain, S, is fully qualified base 2 equivalent (conversion) of T.
Composability Property: transformation (round trip) between T and S of concatenated primitives does not cross primitive boundaries. Separable parseability is preserved.
Normally composability requires pad characters (pad bytes) on each Base64 (Base2) primitive.
KERI replaces pad characters with prepend derivation codes whose length preserves composability.
By comparison did:key is not stable, did:peer is, neither are composable.
In general Multi-Codec is not stable nor composable except fro serendipitous combinations of code and value

_(dc, rm) -> R2T -> t -> T2S -> s -> S2R -> (dc, rm)_

**Code Tables**

3 classes of stable composable derivation codes:
Basic material primitives,
Indexed signature primitives or variable length values,
Grouping count codes.

Appear in namespace domain:
Name-spaced identifiers
Ephemeral identifiers
VCs
Documents
Message bodies

**Basic Primitives**

|Derivatio<br>n<br>Code|Description|Code<br>Length|Index<br>Length|Total<br>Length|Max<br>Count|
|---|---|---|---|---|---|
||**Basic Codes**|||||
||**One Char Codes**|||||
|**A**|Random seed of Ed25519 private key of length 256 bits|1||44||
|**B**|Ed25519 non-transferable prefx public signing verifcation key. Basic derivation.|1||44||
|**C**|X25519 public encryption key. May be converted from Ed25519 public signing<br>verifcation key.|1||44||
|**D**|Ed25519 public signing verifcation key. Basic derivation.|1||44||
|**E**|Blake3-256 Digest. Self-addressing derivation.|1||44||
|**F**|Blake2b-256 Digest. Self-addressing derivation.|1||44||
|**G**|Blake2s-256 Digest. Self-addressing derivation.|1||44||
|**H**|SHA3-256 Digest. Self-addressing derivation.|1||44||
|**I**|SHA2-256 Digest. Self-addressing derivation.|1||44||
|**J**|Random seed of ECDSA secp256k1 private key of length 256 bits|1||44||
|**K**|Random seed of Ed448 private key of length 448 bits|1||76||
|**L**|X448 public encryption key. May be converted from Ed448 public signing verifcation<br>key.|1||76||
|**M**|Short value of length 16 bits|1||4||
|||||||
||**Two Char Codes**|||||
|**0A**|Random salt, seed, private key, or sequence number of length 128 bits|2||24||
|**0B**|Ed25519 signature. Self-signing derivation.|2||88||
|**0C**|ECDSA secp256k1 signature. Self-signing derivation.|2||88||
|**0D**|Blake3-512 Digest. Self-addressing derivation.|2||88||
|**0E**|Blake2b-512 Digest. Self-addressing derivation.|2||88||
|**0F**|SHA3-512 Digest. Self-addressing derivation|2||88||
|**0G**|SHA2-512 Digest. Self-addressing derivation.|2||88||
|**0H**|Long value of length 32 bits|2||8||
|||||||
||**Four Char Codes**|||||
|**1AAA**|ECDSA secp256k1 non-transferable prefx public signing verifcation key. Basic<br>derivation.|4||48||
|**1AAB**|ECDSA secp256k1 public signing verifcation or encryption key. Basic derivation.|4||48||
|**1AAC**|Ed448 non-transferable prefx public signing verifcation key. Basic derivation.|4||80||
|**1AAD**|Ed448 public signing verifcation key. Basic derivation.|4||80||
|**1AAE**|Ed448 signature. Self-signing derivation.|4||156||
|**1AAF**|Tag Base64 4 chars or 3 bytes|4||8||
|**1AAG**|DateTime Base64 custom encoded 32 char ISO8601|4||36||

Appear in message
attachments as stream group:
Compact list is signatures
indexed by offset into key or
witness list.

**Indexed Codes**

KERI Master Base64 Char Derivation Code Table

|Derivation<br>Code|Description|Code<br>Length|Index<br>Length|Total<br>Length|Max<br>Count|
|---|---|---|---|---|---|
||**Indexed Codes**|||||
||**Indexed  Two Char Codes**|||||
|**A**_#_|Ed25519 indexed signature|2|1|88|63|
|**B**_#_|ECDSA secp256k1 indexed signature|2|1|88|63|
|||||||
||**Indexed Four Char Codes**|||||
|**0A**_##_|Ed448 indexed signature|4|2|156|4,095|
|**0B**_##_|Label Base64 char of variable length L=N*4 where N is value of index, total = L+4|4|2|Variable|4,095|

Appear in message
attachments to group and/or
pipeline heterogenous
attachments and future
composable message format:

**Group Count Codes**

KERI Master Base64 Char Derivation Code Table

|Derivatio<br>n<br>Code|Description|Code<br>Length|Index<br>Length|Total<br>Length|Max<br>Count|
|---|---|---|---|---|---|
||**Counter Codes**|||||
||**Four Char Counter Codes**|||||
|**-A**_##_|Count of attached qualifed Base64 indexed controller signatures|4|2|4|4,095|
|**-B**_##_|Count of attached qualifed Base64 indexed witness signatures|4|2|4|4,095|
|**-C**_##_|Count of attached qualifed Base64 nontransferable identifer receipt couples<br>pre+cig|4|2|4|4,095|
|**-D**_##_|Count of attached qualifed Base64 transferable identifer receipt quadruples<br>pre+snu+dig+sig|4|2|4|4,095|
|**-E**_##_|Count of attached qualifed Base64 frst seen replay couples fnu+dts|4|2|4|4,095|
|**-F**_##_|Count of attached qualifed Base64 transferable identifer indexed controller sig<br>groups each triple pre+snu+dig of signer est. event followed by counter -A##<br>followed by indexed controller sigs|4|2|4|4,095|
|||||||
|**-U**_##_|Count of qualifed Base64 groups or primitives in message data|4|2|4|4,095|
|**-V**_##_|Count of total attached grouped material qualifed Base64 4 char quadlets|4|2|4|4,095|
|**-W**_##_|Count of total message data grouped material qualifed Base64 4 char quadlets|4|2|4|4,095|
|**-X**_##_|Count of total message data plus attachments  grouped qualifed Base64 4 char<br>quadlets|4|2|4|4,095|
|**-Y**_##_|Count of qualifed Base64 groups or primitives in group. (context dependent)|4|2|4|4,095|
|**-Z**_##_|Count of grouped material qualifed Base64 4 char quadlets (context dependent)|4|2|4|4,095|
|||||||
|**-a**_##_|Count of anchor seal groups in list  (anchor seal list) (a)|4|2|4|4,095|
|**-c**_##_|Count of confg traits (each trait is 4 char quadlet   (confguration trait list) (c)|4|2|4|4,095|
|**-d**_##_|Count of digest seal Base64 4 char quadlets in digest  (digest seal  (d)|4|2|4|4,095|
|**-e**_##_|Count of event seal Base64 4 char quadlets in seal triple of (event seal) (i, s, d)|4|2|4|4,095|
|**-k**_##_|Count of keys in list  (key list) (k)|4|2|4|4,095|
|**-l**_##_|Count of locations seal Base64 4 char quadlets in seal quadruple of (location seal) (i,<br>s, t, p)|4|2|4|4,095|
|**-r**_##_|Count of root digest seal Base64 4 char quadlets in root digest  (root digest) (rd)|4|2|4|4,095|
|**-w**_##_|Count of witnesses in list  (witness list or witness remove list or witness add list) (w,<br>wr, wa)|4|2|4|4,095|
|||||||
||**Eight Char Counter Codes**|||||
|**-0U**_####_<br>_#_|Count of qualifed Base64 groups or primitives in message data|8|5|8<br>|3,741,823|
|**-0V**_#####_|Count of total attached grouped material qualifed Base64 4 char quadlets|8|5|8<br>|3,741,823|
|**-0W**_####_<br>_#_|Count of total message data grouped material qualifed Base64 4 char quadlets|8|5|8<br>|3,741,823|
|**-0X**_#####_|Count of total group message data plus attachments qualifed Base64 4 char<br>quadlets|8|5|8<br>|3,741,823|
|**-0Y**_#####_|Count of qualifed Base64 groups or primitives in group (context dependent)|8|5|8<br>|3,741,823|
|**-0Z**_#####_|Count of grouped  material qualifed Base64 4 char quadlets (context dependent)|8|5|8<br>|3,741,823|
|||||||
|**-0a**_#####_|Count of anchor seals  (seal groups in list)|8|5|8<br>|3,741,823|

**Stream Parsing Rules**

Stream start, cold restart, message end, group end:
Examine tritet (3 bits).
Each stream must start (restart) with one of four things:

Framing count code in either Base64 or Binary.
Framing opcode in either Base64 or Binary
JSON encoded mapping.
CBOR encoded Mapping.
MGPK encoded mapping.
(1 remaining unused tritet)
A parser merely needs to examine the first tritet (3 bits) of the first byte of the stream start to determine which
one of the five it is.
When the first tritet indicates its JSON, CBOR, or MGPK, then the included version string provides the remaining
and confirming information needed to fully parse the associated encoded message.
When the first tritet is a framing code then, the remainder of framing code itself will include the remaining
information needed to parse the attached group.
The framing code may be in either Base64 or binary.
At the end of the stream start, the stream must resume with one of the 5 things, either a new JSON, CBOR, or
MGPK encoded mapping or another of two types of framing codes expressed in either Base64 or binary.

**Annotated Example**

```
-FAB                      # Trans Indexed Sig Groups counter code with 1 following group
E_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y  # trans prefix of signer for sigs
-EAB0AAAAAAAAAAAAAAAAAAAAAAB          # sequence number of est event of signer's public keys for sigs
EwmQtlcszNoEIDfqD-Zih3N6o5B3humRKvBBln2juTEM  # digest of est event of signer's public keys for sigs
-AAD                      # Controller Indexed Sigs counter code with 3 following sigs
AA5267UlFg1jHee4Dauht77SzGl8WUC_0oimYG5If3SdIOSzWM8Qs9SFajAilQcozXJVnbkY5stG_K4NbKdNB4AQ # sig 0
ABBgeqntZW3Gu4HL0h3odYz6LaZ_SMfmITL-Btoq_7OZFe3L16jmOe49Ur108wH7mnBaq2E_0U0N0c5vgrJtDpAQ # sig 1
ACTD7NDX93ZGTkZBBuSeSGsAQ7u0hngpNTZTK_Um7rUZGnLRNJvo5oOnnC1J2iBQHuxoq8PyjdT3BHS2LiPrs2Cg # sig 2

```

**Partially Annotated Example**

```
{"v":"KERI10JSON000154_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"0","t":"icp","kt":["1/2","1/2","1/2"],"k":["DaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg","DuzjZ2lR2DqB0cI0421oSMUVWOrN5axojx8g9fSx3PM","DRXPAmNVVqafWvQiN5qQmWUDvVupF2w8xFNGg1Gays9Y"],"n":"EO5f_IQjtBoeN_-OyzfVJx1_WqBFUL-Ely4x-xmUtOW8","wt":"0","w":[],"c":[]}
-VEM
-AAD
AA6Z50BRlXby_uSdkqbybLXds-5OMwQil4miux1sRxJkiD3kRS4HuCpv5m-wwsPHWwn_Ku5xB2P—NJ1pl7KXjAQ
ABDjMdRtemkn9oykLFo9MBwZsS85hGd1yaMMdFb_P1FY8_PZcHBVTc2iF5Bd6T2rGorwS-ChRa24bxUrkemWD1DA
ACpxUYq2zrFAlMdWuxdaYTqvh12pgk4Ba-vllsaZP5ct5HcOtJw47B6cVLcEePwEHk6jHlSoDGgH2YiyOwPbgSBQ
-DAD
E_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y
0AAAAAAAAAAAAAAAAAAAAAAA
EFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRY
AA6Z50BRlXby_uSdkqbybLXds-5OMwQil4miux1sRxJkiD3kRS4HuCpv5m-wwsPHWwn_Ku5xB2P—NJ1pl7KXjAQ
E_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y
0AAAAAAAAAAAAAAAAAAAAAAA
EFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRY
ABDjMdRtemkn9oykLFo9MBwZsS85hGd1yaMMdFb_P1FY8_PZcHBVTc2iF5Bd6T2rGorwS-ChRa24bxUrkemWD1DA
E_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y
0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACpxUYq2zrFAlMdWuxdaYTqvh12pgk4Ba-vllsaZP5ct5HcOtJw47B6cVLcEePwEHk6jHlSoDGgH2YiyOwPbgSBQCABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0B6Z50BRlXby_uSdkqbybLXds-5OMwQil4miux1sRxJkiD3kRS4HuCpv5m-wwsPHWwn_Ku5xB2P—NJ1pl7KXjAQEAB0AAAAAAAAAAAAAAAAAAAAAAA1AAG2021-04-22T17c15c03d117401p00c00{"v":"KERI10JSON000098_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"1","t":"ixn","p":"Egd_fi2QDtfjjdB5p9tT6QCHuBsSWUwQP6AbarcjLgw0","a":[]}-VEMAADAAPLMNHELcDDuPT1gyI9_TEBM6FRji2xmc0iBfNBwoKJttbJfeQhH41y-ayubtyhyMzHaqrq-WXaNQkpnzTTOPBAABUawpt1Nd7GR9rTwPD4ucT-M7Vy1xuxGlgRf9pgkOcXBBbhomjjEpz3aid9PP2vWeJ_rvw7W5rgrTJ38Q2v8bDwACoHNjlZ-IZ1K9opgeu33TNIFBd3rNW_gKO_bFat2GYwOzlWoDlzF7kSRQnVKlXMeVrLBe3uwO6PjYjeZdUSlDg-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAAPLMNHELcDDuPT1gyI9_TEBM6FRji2xmc0iBfNBwoKJttbJfeQhH41y-ayubtyhyMzHaqrqWXaNQkpnzTTOPBAE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYABUawpt1Nd7GR9rTwPD4ucTM7Vy1xuxGlgRf9pgkOcXBBbhomjjEpz3aid9PP2vWeJ_rvw7W5rgrTJ38Q2v8bDwE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACoHNjlZ-IZ1K9opgeu33TNIFBd3rNW_gKO_bFat2GYwOzlWoDlzF7kSRQnVKlXMeVrLBe3uwO6PjYjeZdUSlDg-CABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0BPLMNHELcDDuPT1gyI9_TEBM6FRji2xmc0iBfNBwoKJttbJfeQhH41y-ayubtyhyMzHaqrq-WXaNQkpnzTTOPBAEAB0AAAAAAAAAAAAAAAAAAAAAAQ1AAG2021-04-22T17c15c03d143279p00c00
{“v":"KERI10JSON000190_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"2","t":"rot","p":"E8MU3qwR6gzbMUqEXh0CgG4k3k4WKkk9hM0iaVeCmG7E","kt":["1/2","1/2","1/2"],"k":
["DIsi8qYso1KMmpLOGYty3NC2BAojZmUCfzR5_5oQRiso","DkdClpaWCAoCPBYgUmqP9gwAtsGq81yyPhGQKQ6-W_F0","DKDyq4QQYKnx9ircxeCvEcraI4HUSr_ytWPelDHAM98w"],"n":"E1oOvJmwenmC4uHjX7qB40LGVbeZY5rYQeZ6IK5zmdmM","wt":"0","wr":[],"wa":[],"a":[]}
-VEM
-AAD
AAr5HeTAGJ_WfIMO82lbEnpAMkuqZ0iJO0yYhjwvLElPYltF_jSOApKPWxepare2O7XMMOvtgxjXj9pvvqpW8WDgABKHoueBd4JgakpVydJYADwh5wMSNyHNMKXwhYMGrgApl_EvsTmEt8uS94PmrfCtRjLRbZdzLRZVkX7Yx4jlNNCgACjKJlODGhL_a0S3-oDRJhOUG0sul4SCJd21QpKSFSfGavACAwQdEYQL43jko9lFDuhwKDt1BD8kAoy3T-tdoAw-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAA7JJAxJL3nhVur7YboCK2zPSmx_AaYDYeN7UsvoKcZKrYbuScUje_qfx_e9z1SM4tm8bUbYJnLXTz8dOta9ZiDwE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYABi7dsjnldn7E-L56Rlz4ZWp8XC5y8v7h4XRoZp2sO69H84dhyRM27UE9_egCWQZJ_MHJKVA5g2s0hXmXvjSKrAQE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACo0JcZmUhiNBfb_3bBwgX7KfN52vmazAzEFgJlr8wNfXSvF6rA5lED4J1EWuEnhA00vUHQqPrjk78nnRBBZlVAACABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0B7JJAxJL3nhVur7YboCK2zPSmx_AaYDYeN7UsvoKcZKrYbuScUje_qfx_e9z1SM4tm8bUbYJnLXTz8dOta9ZiDwEAB0AAAAAAAAAAAAAAAAAAAAAAg1AAG2021-04-22T17c15c03d150633p00c00{"v":"KERI10JSON000098_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"3","t":"ixn","p":"EO2hh7xg29y3i7uywQ_n0g7vk0W1oGiErUY9QpGjSUhc","a":[]}-VEMAADAA5Iox67c4HL78UrYqpSNH-UkHZRpR7X0fPQ0GEYJG8OGqCHBvPJica_yohOQP8GNOFQ9UsmBa0TDji6EAaXivBwAB6BgG2CQ-Ukw8CchtCHf9L5kVsmg1Tu2OuLkcy9Sb9uVm23yLx-8I4pc6KHmZke8KCvpXjcdV65gOOEVUIMOBwACXtTZoFqJHFhoMZABunXETksrK1nNiP9xzXx13gl4uqoVZkqfwqUTL3C7q0RcxYwaz5sYSNQA8zblA8YxVyFuCQ-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAAG1L04T2jREp2pizWjQ0tglZ8I4CDNoKx4bN2K0ztuf_0ywQ29p2kFkBVZaRPwljOZlUzJqlPU6P2R-IVORJBQE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAB2ss-isfVr2WpdCWwNxO_9N75eJK-2CZp1J-DicWd8FqziZIckAmxNBD9TjxfuYn7pQmXnaWF7g4RhCLJGBuDAE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIa-OCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACrxgx3QlrBs-g369i807ntd8rGWGC4WGrrdy60cPy9hjrP10qjDtSTwa2UZPNVEUZolM-lHsFqoNhjeaHmg_mDACABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0BG1L04T2jREp2pizW-jQ0tglZ8I4CDNoKx4bN2K0ztuf_0ywQ29p2kFkBVZaRPwljOZlUzJqlPU6P2R-IVORJBQEAB0AAAAAAAAAAAAAAAAAAAAAAw1AAG2021-04-22T17c15c03d154307p00c00{"v":"KERI10JSON000098_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"4","t":"ixn","p":"EQI0EXdK6WvQae17PBWDUkMOdOiTPpx48oMSYTUYsCl0","a":[]}-VEMAADAAbnPY1i0cpo6q0cmvQr2bZOcipzl7LYY2h-3ixndlzB3f-4VFLzSnIUtB_qwp1H2NI_DNGqXWGACywJoxkFccAQABHDicUliz3Bl6y1T7-sQteMKxoDYZ4A8hVx3p3EjztyO8UnA6PkaV2b7AFwAfk4UbBWKMGjTtpZ88S7P9EsXLBAACNFFh6nDIWNG1ZbEsqqlCG2aKLgnpHmR6cJr1dq1F4pylAF1e3on2aasDMYk3c2fj-AWErRqbsf8ejnJE3YvDg-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAAh0E0mltmkUz1_TXMirWFa67IGAaK7fThhrJ8TQyuhY7usunzf8VtWfaaLBQSpofhgppsMlf3zZxDS1g6t-7PCgE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYABECiScuPby_LbGw5s6qNTJQm2m6Dqbsig7sRdk841XWU6hV3MlD-k_SriiPEJWMAWDmY74lM-UiNDvnmN4OAJCAE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACSc48sfSvNtYByMlUQsMPdEsDw5Z6oDX4jlZ9F5eCMcRvYWWApAD-OOi85JTIiW3y3nSdbfyt4vS6YvroA68MAQCABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0Bh0E0mltmkUz1_TXMirWFa67IGAaK7fThhrJ8TQyuhY7usunzf8VtWfaaLBQSpofhgppsMlf3zZxDS1g6t-7PCgEAB0AAAAAAAAAAAAAAAAAAAAABA1AAG2021-04-22T17c15c03d158167p00c00{"v":"KERI10JSON000098_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"5","t":"ixn","p":"EvrAC5XVQyu01ZuKfq1wiR0kXF2j8TjrCg4QyA0LVjKk","a":[]}-VEMAADAA1OJn3UHjLcI333fduqTj6nAJY27VtkQqW_lHalnJKtgmb0tk1tV5xUCVzpal14xWDuyCdImhFzTk0sRgW4MYDQABOR8ay9qQYR3ieant4ujM_FX0Nm_mUHcVVo4pCqDy8jLaM3EBNmkOKUIfxgZC-8k6OpYcy33gCqgUpc6C2_PDwACSoZSibaYcin32vY4ANzflFpJh_EF7mcGbTWSFrNLnwFrrOfhXL3i1Pf39Sk079ApSI87Nt-CvHpRRdows3TABQ-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAAgXtG2I3AxvU5yHKzfucOKOvxeKWwChKQvEQJtJnz9iIpsXqyyrgRfOyoyjhk73D-E3FbDg_3k1XK_3i-yDWeAQE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAByUVjq4Y_sMWi9iqqWXTo2ES5pBMlBgJbAY3h61aJElQdCIxr2ldx_BSq4vA-FlELEBUkSbeHnHGXeFfVi6AjCwE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAC6GmjxPFclVsY7smEcpmptQnZgET9LUO606SzhkCaGCe1jR2KZ3vNsgitA_7OQ_VDipLwoWGv_Kz2YnUkjKFsCwCABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0BgXtG2I3AxvU5yHKzfucOKOvxeKWwChKQvEQJtJnz9iIpsXqyyrgRfOyoyjhk73D-E3FbDg_3k1XK_3i-yDWeAQEAB0AAAAAAAAAAAAAAAAAAAAABQ1AAG2021-04-22T17c15c03d161436p00c00{"v":"KERI10JSON000098_","i":"E4ReNhXtuh4DAKe4_qcX__uF70MnOvW5Wapj3LcQ8CT4","s":"6","t":"ixn","p":"EwmQtlcszNoEIDfqD-Zih3N6o5B3humRKvBBln2juTEM","a":[]}-VEMAADAAvYMCRmJgjFM7EG7rWng7Q3WRfwcd908UdKL-7ZfGw4igpF9DcA-yxwliba59D4pkmhIcrW_Ax76iuaD6yD03BwAB9Wp-awBUfw2jnDRjvEU3xpFlLDHwiFLRKpom8Wnx7qDD4aEv6ERZhH8yP3eL4sNEFjP5HcRrb5MpFwOp0VyAwACdedbq9E2Exs1NobGwSNQpNxKlgDPiNDE8nOeOqgXt1rAj8SAh8gX2pOgEFj3g3UB69dNGw2M-bEZ557-p9G-Aw-DADE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYAA9U_Kq0GNM1fFq1Vgp937kHkwxSBn4nT8UciTepjjOdOAR-hvsLCxQx2V2pbyQo3fubs6mPd6TQ4ZUmXNrtxmBwE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYABuFO678xi0JuYyQWnSOtOVXABknvRo6-0EWFCv7hxucmqgE6Je2R4120G3nFsJ_ImTjkDibQU8m7CYBGcFh-hAQE_T2_p83_gRSuAYvGhqV3S0JzYEF2dIaOCPLbIhBO7Y0AAAAAAAAAAAAAAAAAAAAAAAEFSbLZkTmOMfRCyEYLgz53ARZougmEu_edeW-0j2DVRYACBUqcpzMYX373ePKsfKBjt9aXO2vkl9jAb5vBHFYc0h5r-pGL2TIgoyfMPMAf0zFrsKnDdmN0HmSaE1OsP2hmDACABBaYh8uaASuDjMUd8_BoNyQs3GwupzmJL8_RBsuNtZHQg0B9U_Kq0GNM1fFq1Vgp937kHkwxSBn4nT8UciTepjjOdOAR-hvsLCxQx2V2pbyQo3fubs6mPd6TQ4ZUmXNrtxmBw-EAB0AAAAAAAAAAAAAAAAAAAAABg1AAG2021-04-22T17c15c03d164449p00c00'

```

**Why Composability**

Verifiable Text Stream = Verifiable Binary Stream (no loss of verifiability in mass conversion)
Amount of cryptographic material in attachments far exceeds cryptographic material in message bodies. Controller
signatures, witness signatures, other receipt signatures, endorsement signatures.
Replay of KELs must replay messages (key events) plus signatures
Want this replay to be compact, performant, and supported by bare metal protocols (TCP, UDP)
Verifiable Credential world is Text
Verifiable Authentic Data world human facing side is Text
Verifiable Digitally Signed Contract world is Text
Verifiable Audit Trail World is Text

**Archival Preservation**

**Archival Preservation**

**Legally Binding Digital Signatures (Contracts)**

**Audit Trails**
