# Crypto Signing — signify-ts

HTTP request authentication using RFC-compliant Signature-Input/Signature headers with CESR-encoded signatures.

## Classes

### Authenticater
**Source:** `keri/core/authing.ts:7`
**Purpose:** High-level sign/verify API for HTTP requests

```typescript
constructor(csig: Signer, verfer: Verfer)
```

**Static:**
- `DefaultFields = ["@method", "@path", "signify-resource", "signify-timestamp"]`

**Methods:**
- `sign(headers, method, path, fields?)` → Headers with Signature-Input/Signature
- `verify(headers, method, path)` → boolean (throws on failure)

### Signage
**Source:** `keri/end/ending.ts:7`
**Purpose:** Container for signature metadata

```typescript
constructor(markers, indexed?, signer?, ordinal?, digest?, kind?)
```

**Fields:**
- `markers` — Map (non-indexed: verfer→Cigar) or Array (indexed: [Siger])
- `indexed` — boolean | undefined
- `signer`, `ordinal`, `digest`, `kind` — string | undefined

### Inputage
**Source:** `keri/core/httping.ts:110`
**Purpose:** Parsed Signature-Input metadata

```typescript
{ name, fields, created, expires?, nonce?, alg?, keyid?, context? }
```

### Unqualified
**Source:** `keri/core/httping.ts:94`
Wraps raw bytes for structured header encoding.

## Functions

### siginput({name, method, path, headers, fields, ...}) → [Headers, string]
**Source:** `keri/core/httping.ts:27`
Builds Signature-Input header and canonical signature input string.

**Parameters:**
- `name` — signature name (e.g., "signify")
- `method`, `path` — HTTP method/path
- `headers` — request headers
- `fields` — array of field names to sign
- Optional: `expires`, `nonce`, `alg`, `keyid`, `context`

**Returns:** [Headers with Signature-Input, canonical input string]

**Field extraction:**
- `@method` → HTTP method (uppercase)
- `@path` → request path
- Other → `headers.get(field)`

### desiginput(value) → Inputage[]
**Source:** `keri/core/httping.ts:122`
Parses Signature-Input header value into array of Inputage.

### normalize(input, method, path, headers) → string
**Source:** `keri/core/httping.ts:159`
Reconstructs canonical signature input string from Inputage.

**Format:**
```
"@method": POST
"@path": /identifiers/aid1/events
"signify-resource": /operations/op123
"signify-timestamp": 2024-02-15T12:34:56.789Z
"@signature-params": ("@method" "@path" ...);created=1708012496
```

### signature(signages) → Headers
**Source:** `keri/end/ending.ts:28`
Serializes Signage array to HTTP Signature header.

**Format (non-indexed):**
```
indexed=false;EVerferQb64=0ACigarQb64
```

**Format (indexed):**
```
indexed=true;0=AASigerQb64;1=ABSigerQb64
```

### designature(value) → Signage[]
**Source:** `keri/end/ending.ts:75`
Parses Signature header into Signage array.

**TRUTHY:** `[true, 1, "?1", "yes", "true", "True", "on"]`
**FALSY:** `[false, 0, "?0", "no", "false", "False", "off"]`

## Client Signing Workflow

1. **Create Authenticater:**
   ```typescript
   const signer = new Signer({ raw: privateKeyBytes });
   const auth = new Authenticater(signer, signer.verfer);
   ```

2. **Prepare headers:**
   ```typescript
   headers.set("signify-resource", "/operations/op123");
   headers.set("signify-timestamp", new Date().toISOString());
   ```

3. **Sign:**
   ```typescript
   const signedHeaders = auth.sign(headers, "POST", "/identifiers/aid1/events");
   // Uses DefaultFields if fields omitted
   ```

4. **Internal process:**
   - Call `siginput()` → [headers, inputString]
   - Sign inputString → signature bytes
   - Create Cigar from signature
   - Create Signage: `markers = Map({ verfer.qb64 → cigar })`
   - Call `signature([signage])` → Signature header
   - Append both headers to original headers

5. **Result headers:**
   ```
   Signature-Input: signify=("@method" "@path" ...);created=1708012496
   Signature: indexed=false;EVerferQb64=0ACigarQb64
   ```

6. **Send request** with signed headers

## Server Verification Workflow

1. **Create Authenticater:**
   ```typescript
   const clientVerfer = new Verfer({ qb64: "EClientVerferQb64..." });
   const auth = new Authenticater(null, clientVerfer); // signer=null
   ```

2. **Verify:**
   ```typescript
   const isValid = auth.verify(headers, method, path);
   ```

3. **Internal process:**
   - Extract Signature-Input header (throw if missing)
   - Extract Signature header (throw if missing)
   - `inputs = desiginput(signatureInputValue)`
   - Filter for "signify" signature
   - `inputString = normalize(input, method, path, headers)`
   - `signages = designature(signatureValue)`
   - Extract cigar: `signages[0].markers.get(verfer.qb64)`
   - `verfer.verify(cigar.raw, inputBytes)`
   - Throw if verification fails

4. **Error handling:**
   - Throws `Error("Signature for ${input.keyid} invalid.")` on failure

## Header Formats

### Signature-Input
```
signify=("@method" "@path" "signify-resource" "signify-timestamp");created=1708012496;keyid="EVerferQb64"
```

**Optional params:** `expires`, `nonce`, `alg`, `context`

### Signature (Non-Indexed)
```
indexed=false;EVerferQb64=0ACigarQb64
```

### Signature (Indexed)
```
indexed=true;0=AASigerQb64;1=ABSigerQb64
```

### Multiple Signatures
```
Signature: indexed=false;EVerfer1=0ACigar1,indexed=false;EVerfer2=0BCigar2
```

## Canonical Input Construction

Given fields `["@method", "@path", "signify-resource", "signify-timestamp"]`:

1. Extract each field:
   - `@method` → "POST"
   - `@path` → "/identifiers/aid1/events"
   - Headers → "signify-resource", "signify-timestamp"

2. Format as `"field": value`, join with `\n`

3. Append `"@signature-params": (fields);params`

**Result:** Canonical string signed by client, reconstructed by server

## Constants

| Constant | Value | Source |
|----------|-------|--------|
| DefaultFields | ["@method", "@path", "signify-resource", "signify-timestamp"] | authing.ts:9 |
| TRUTHY | [true, 1, "?1", "yes", "true", "True", "on"] | ending.ts:5 |
| FALSY | [false, 0, "?0", "no", "false", "False", "off"] | ending.ts:4 |
| Default kind | "CESR" | ending.ts:23 |

## Error Messages

| Error | Condition |
|-------|-----------|
| `"missing required \`created\` field from signature input"` | desiginput(): no created param |
| `"Missing indexed field in Signature header signage."` | designature(): no indexed param |
| `"Indexed signature marker ${marker} when indexed False."` | signature(): Siger when indexed=false |
| `"Unindexed signature marker ${marker} when indexed True."` | signature(): Cigar when indexed=true |
| `"Signature for ${input.keyid} invalid."` | verify(): signature validation failed |

## Implementation Notes

1. **Spec compliance:** Implements HTTP Signatures draft spec with RFC 8941 structured headers
2. **CESR encoding:** Signatures are CESR primitives (Cigar/Siger qb64)
3. **Field ordering:** Preserved from Signature-Input during verification
4. **Derived fields:** `@method`, `@path` computed from request, not headers
5. **Multiple signatures:** Comma-separated in headers, each with unique name
6. **Indexed vs non-indexed:** Non-indexed (HTTP auth) uses Map<verfer, Cigar>; indexed (KERI events) uses Array<Siger>
7. **Default timestamp:** `Math.floor(nowUTC().getTime() / 1000)` (Unix seconds)
8. **Browser compat:** Uses Headers API, Uint8Array, Buffer polyfill

## Dependencies

**authing.ts:**
- Signer, Verfer (signing/verification)
- siginput, desiginput, normalize (httping)
- Signage, signature, designature (ending)
- Cigar, Siger (primitives)

**httping.ts:**
- structured-headers (RFC 8941 serialization)
- Signer, b(), nowUTC()
- urlsafe-base64, buffer

**ending.ts:**
- Siger, Cigar (primitives)

## Complete Example

### Client
```typescript
const signer = new Signer({ qb64: "ASigner..." });
const auth = new Authenticater(signer, signer.verfer);

const headers = new Headers();
headers.set("signify-resource", "/operations/op123");
headers.set("signify-timestamp", "2024-02-15T12:34:56.789Z");

const signedHeaders = auth.sign(headers, "POST", "/identifiers/aid1/events");
fetch(url, { method: "POST", headers: signedHeaders, body });
```

### Server
```typescript
const clientVerfer = new Verfer({ qb64: "EClient..." });
const auth = new Authenticater(null, clientVerfer);

try {
    const isValid = auth.verify(request.headers, request.method, request.path);
    processRequest(request);
} catch (e) {
    return { status: 401, error: "Invalid signature" };
}
```
