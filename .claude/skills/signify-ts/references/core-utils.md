# Core Utilities — signify-ts

## Base64 & Encoding

**B64ChrByIdx** — Map<number, string>: 0→'A'...25→'Z', 26→'a'...51→'z', 52→'0'...61→'9', 62→'-', 63→'_' (RFC 4648 URL-safe)
**B64IdxByChr** — Map<string, number>: inverse of B64ChrByIdx

**intToB64(i, l=1)** → string — convert int to CESR base64 string, pad to length l
**b64ToInt(s)** → number — convert CESR base64 to int, throws on empty string
**intToB64b(i, l=1)** → Uint8Array — intToB64 + encode to bytes

## Byte Helpers

**b(s)** → Uint8Array — string to UTF-8 bytes (TextEncoder)
**d(u)** → string — UTF-8 bytes to string (TextDecoder)
**concat(arrays)** → Uint8Array — concatenate byte arrays

## Numeric Helpers

**intToBytes(n, length)** → Uint8Array — int to fixed-length big-endian bytes
**bytesToInt(bytes)** → number — big-endian bytes to int
**readInt(bytes, offset, length)** → number — extract int from byte array slice
**pad(n, width, z='0')** → string — left-pad number to width
**range(start, end, step=1)** → number[] — generate array [start, end) by step

## Data Helpers

**extractValues(obj, labels)** → any[] — extract obj fields in label order (KED construction)
**arrayEquals(a, b)** → boolean — deep equality for arrays
**nowUTC()** → Date — current UTC timestamp (for exchange/siginput)

## Boolean Parsing

**FALSY**: [false, 0, "?0", "no", "false", "False", "off"]
**TRUTHY**: [true, 1, "?1", "yes", "true", "True", "on"]

## Random Generation

**randomPasscode()** → string — 21-char base64 passcode (126-bit entropy, CSPRNG), strips Salt_128 prefix
**randomNonce()** → string — random nonce for HTTP Signature created timestamp

## Error Types

**EmptyMaterialError(err)** — thrown when Matter/Indexer constructors receive no init params

## Agent (delegated agent AID lifecycle)

**Properties**: pre, anchor (di field), verfer, state, sn, said
**Constructor(agent)** — parses agent state from KERIA `/agent` endpoint
**parse()** — extracts sn, said, validates dip event type, checks anchor (di) exists
**event()** — validates single key/next key, threshold=1, extracts pre/anchor/verfer
**Errors**: "invalid inception event type", "no anchor to controller AID", "agent inception event can only have one key/next key", "invalid threshold, must be 1"

## Controller (account signing key manager)

**Properties**: bran (private, 21 chars), stem="signify:controller", tier, ridx, salter, signer, nsigner, serder, keys, ndigs
**Constructor(bran, tier, ridx=0, state=null)** — derives current/next signer from passcode salt
**approveDelegation(agent)** → [sig] — creates interaction event anchoring agent.pre/sn/said, returns signature array
**rotate(bran, aids)** → {rot, sigs, sxlt, keys} — rotate controller key, re-encrypt all AID secrets (salty sxlt or randy prxs/nxts), dual-key threshold ["1","0"]
**recrypt(enc, decrypter, encrypter)** → string — decrypt + re-encrypt value
**Errors**: "Invalid Salty AID", "unable to rotate, validation failed", "invalid aid type"

## Habery (keripy-ported, not core runtime)

**TraitCodex**: EstOnly='EO', DoNotDelegate='DND', NoBackers='NB' (appended to 'c' array)

**Hab** — Properties: name, icp (Serder)
**Constructor(name, icp)** — represents habitat (AID) with inception event

**Habery** — Properties: _name, _mgr (Manager), _habs (Map<name, Hab>)
**Constructor({name, passcode, seed, aeid, pidx, salt, tier})** — validates passcode >=21, derives seed, creates Manager (Algos.salty if salt else Algos.randy)
**habByName(name)** → Hab | undefined — retrieve habitat by name
**makeHab(name, {...})** → Hab — create AID with managed keys
- **MakeHabArgs**: code=Blake3_256, transferable=true, isith=majority(hex), icount=1, nsith=isith, ncount=icount, toad="0", wits=[], delpre, estOnly, DnD, data
- **Algorithm**: apply defaults, non-transferable override (ncount=0, nsith="0", code=Ed25519N), derive verfers/digers, calc thresholds (ceil(count/2), min 1, hex), build config traits, call incept(), wrap in Hab, store in _habs
**Errors**: "Bran (passcode seed material) too short" (<21 chars)

**Threshold calculation**: ceil(count/2) hex, min 1. Examples: 1→"1", 2→"1", 3→"2", 4→"2"

## Module Exports (index.ts)

**ready()** → Promise<void> — MUST await before using signify-ts (loads libsodium + blake3 wasm from CDN, fallback to libsodium-only)
**math** — MathJS instance (default config)
**Browser polyfill**: window.Buffer = Buffer

**Barrel exports**: habery (Habery, Hab, TraitDex, HaberyArgs, MakeHabArgs), apping (randomPasscode, randomNonce), controller (Agent, Controller), all core/* modules (cigar, cipher, core, counter, decrypter, diger, encrypter, eventing, httping, indexer, keeping, kering, manager, matter, number, prefixer, saider, salter, seqner, serder, siger, signer, tholder, utils, verfer), authing (Authenticater), ending (Signage, signature, designature), named export Algos

## Defaults & Config

| Item | Default | Notes |
|------|---------|-------|
| intToB64 length | 1 | single char |
| Controller stem | "signify:controller" | derivation path |
| Controller bran format | Salt_128 + 'A' + bran[0:21] | qb64 salt |
| Controller ridx | 0 | rotation index |
| Habery algo | salty (if salt) else randy | key derivation |
| Hab transferable | true | allow rotation |
| Hab code | Blake3_256 | digest algo |
| Hab icount | 1 | initial keys |
| Hab isith | majority hex | ceil(count/2), min 1 |
| Hab nsith | isith | next threshold |
| Hab ncount | icount | next keys |
| Hab toad | "0" | witness threshold |
| Hab wits | [] | witness list |
| randomPasscode output | 21 chars | 126 bits entropy |
| randomPasscode source | 16 bytes | libsodium CSPRNG |
| blake3 wasm CDN | jsdelivr.net/npm/blake3@2.1.7 | fallback to libsodium |

## Notes

- **ready() mandatory**: await before any signify-ts usage (libsodium + blake3 init)
- **randomPasscode strips prefix**: substring(2) removes '0A' Salt_128 code → 21 chars
- **Controller NOT AID controller**: manages client/agent account signing key (bran = account passcode)
- **Habery keripy-ported**: client-side AID derivation, production uses KERIA server-side
- **Agent delegated AID**: event type 'dip', anchor (di) points to delegating controller
- **EmptyMaterialError wrapper**: no prototype chain, semantic "no init params" error
- **Base64 URL-safe**: RFC 4648 (-, _ not +, /), CESR spec compliant
- **Threshold majority**: ceil(count/2), min 1, hex string format
- **Non-transferable override**: ncount=0, nsith="0", code=Ed25519N (prevents rotation)
- **Controller rotation dual keys**: threshold ["1", "0"] weighted to new key
- **Salty vs Randy**: salty = salt-derived (sxlt encrypted), randy = random keys (prxs/nxts encrypted)
- **Browser polyfills**: window.Buffer for Node.js buffer API compat
- **Blake3 CDN fallback**: libsodium-only if wasm load fails
- **TraitCodex config**: appended to 'c' array (EstOnly, DoNotDelegate, NoBackers)
- **Module barrel pattern**: import {...} from 'signify-ts' for any exported symbol
