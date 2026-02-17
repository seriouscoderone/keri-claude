# Client API — signify-ts

## SignifyClient

- `new SignifyClient(url, bran, tier?, bootUrl?)` — url: admin endpoint (3901), bran: 21-char seed, tier: security (default: low), bootUrl: boot endpoint (3903). Throws if bran < 21
- `.boot() -> Promise<Response>` — POST {bootUrl}/boot, provisions agent
- `.connect() -> Promise<State>` — verify agent.anchor == controller.pre, reconstruct state, auto-approve delegation if seq 0
- `.state() -> Promise<State>` — GET {agent, controller, ridx, pidx}
- `.fetch(path, method, body?, headers?) -> Promise<Response>` — authenticated KERIA request with Signify-Resource/Timestamp, signs/verifies response
- `.signedFetch(url, path, aidName, method, body?, headers?) -> Promise<Response>` — sign external request using managed AID

**Resources:** `.identifiers()` AID mgmt, `.oobis()` resolution, `.operations()` polling, `.keyEvents()` KEL, `.keyStates()` queries, `.credentials()` lifecycle, `.registries()` mgmt, `.schemas()` cache, `.challenges()` auth, `.contacts()` mgmt, `.notifications()` inbox, `.escrows()` messages, `.groups()` multisig, `.exchanges()` routing

---

## Identifier

- `.list() -> Promise<any[]>`, `.get(name) -> Promise<any>`, `.members(name) -> Promise<any>` — GET /identifiers ops
- `.create(name, kargs?) -> Promise<InceptionResult>` — defaults: transferable:true, isith/nsith:"1", wits:[], toad:0, dcode:Blake3_256, algo:salty, ncount:1. POST /identifiers with {name, icp, sigs, proxy?, delpre?, data?, states?, rstates?}, increments pidx++
- `.interact(name, data) -> Promise<any>` — anchor data, PUT /identifiers/{name}?type=ixn with {pre, sn:sn+1, data, dig}
- `.rotate(name, kargs?) -> Promise<any>` — PUT /identifiers/{name} with {rot, sigs, smids?, rmids?}. Args: nsith, toad, cuts/adds, data, ncode/ncodes, states/rstates
- `.addEndRole(name, role, eid, stamp?) -> Promise<any>` — POST /identifiers/{name}/endroles

---

## Simple Resources

**Oobis:** `.get(name, role?)` GET /identifiers/{name}/oobis, `.resolve(oobi, alias?)` POST /oobis
**Operations:** `.get(name)` GET /operations/{name}, poll op.done
**KeyEvents:** `.get(pre)` GET /events?pre={pre}
**KeyStates:** `.get(pre)` GET /states, `.list(pres)` multi-pre query, `.query(pre, sn?, anchor?)` POST /queries
**Schemas:** `.get(said)`, `.list()` — GET /schema ops
**Contacts:** `.list()`, `.get(pre)`, `.add(pre, info)`, `.delete(pre)`, `.update(pre, info)` — standard CRUD
**Notifications:** `.list(start?, end?)` Range:notes={start}-{end} (default: 0-24), `.mark(said)`, `.delete(said)`
**Escrows:** `.listReply(route?)` GET /escrows/rpy

---

## Credentials

- `.list(name, filter?)` POST /credentials/query, filter: {filter:{}, sort:[], skip:0, limit:25}
- `.get(name, said, includeCESR?)` GET /credentials/{said}, Accept:json+cesr if includeCESR
- `.issue(name, registry, schema, recipient, credentialData, rules?, source?, priv?)` — construct ACDC {v, i:issuer, ri, s, a:data}, SAIDify, create iss+ixn, POST /credentials with {cred, csigs, path, iss, ixn, sigs}. Throws if "EO"
- `.revoke(name, said)` — construct rev {i, s:"1", p, ri}, create ixn, DELETE /credentials/{said} with {rev, ixn, sigs}. Throws if "EO"
- `.present(name, said, recipient, include?)` — POST /credentials/{said}/presentations, return CESR
- `.request(name, recipient, schema, issuer?)` — POST /identifiers/{name}/requests, return CESR

---

## Registries

- `.list(name)` GET /identifiers/{name}/registries
- `.create(name, registryName, nonce?)` — construct vcp (Ilks.vcp) {i:Blake3_256, ii:hab, s:"0", c:["NB"]}, create ixn, POST /registries. Throws if "EO"

## Challenges

- `.generate(strength?)` GET /challenges (default: 128 = 12 BIP39 words)
- `.respond(name, recipient, words)` POST /challenges/{name}
- `.accept(name, pre, said)` PUT /challenges/{name}

## Groups

- `.getRequest(said)` GET /groups/request/{said}
- `.sendRequest(name, exn, sigs, atc)` POST /identifiers/{name}/multisig/request

## Exchanges

- `.createExchangeMessage(sender, route, payload, embeds) -> [Serder, string]` — return [exn, atc]
- `.send(name, topic, sender, route, payload, embeds, recipients)` POST /identifiers/{name}/exchanges with {tpc, exn, sigs, atc, rec}
- `.sendFromEvents(name, topic, exn, sigs, atc, recipients)` POST with pre-built events

---

## Workflows

1. **Boot & Connect:** `boot()` provisions controller, `connect()` verifies delegation
2. **Create AID:** `identifiers().create('aid', {wits, toad})` then poll `result.op()`
3. **Rotate:** `identifiers().rotate('aid', {cuts, adds, nsith})`
4. **OOBI:** `oobis().resolve(url, alias)` creates contact
5. **Issue Cred:** Create registry, `credentials().issue(name, registry, schema, recipient, data)`
6. **Present:** `credentials().present(name, said, recipient, true)` returns CESR
7. **Challenge:** Verifier `.generate()`, prover `.respond()`, verifier `.accept()`
8. **Multisig:** `.createExchangeMessage()`, sign, `.sendRequest()`

## Key Behaviors

- **Operations:** State-changes return ops, poll via `Operations.get()` checking `op.done`
- **pidx:** Increments after each `.create()` for key derivation
- **Anchoring:** Credential ops create ixn events anchoring iss/rev to KEL
- **"EO" Config:** Throws "not implemented" during credential ops
- **CESR Export:** Accept:application/json+cesr header
- **Timestamp:** .000+00:00 suffix (not Z)
- **Headers:** Signify-Resource (controller.pre or hab.prefix), Signify-Timestamp (ISO8601)
