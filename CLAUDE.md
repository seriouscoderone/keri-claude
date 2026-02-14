# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **multi-language monorepo** implementing the Key Event Receipt Infrastructure (KERI) specification - a decentralized key management system and protocol. KERI provides cryptographic security equivalent to blockchain without requiring global ordering, enabling self-sovereign identity management with post-quantum resistant key rotation.

The repository contains 20+ distinct projects organized as independent but interdependent components, all unified around the KERI specification.

## Project Structure and Dependencies

```
Specifications (Trust over IP / IETF)
├── kswg-keri-specification/ - KERI protocol specification (Spec-Up-T format)
├── kswg-cesr-specification/ - CESR encoding specification
└── kswg-acdc-specification/ - ACDC credential specification
    ↓
Core Implementations
├── keripy/          - Python reference implementation (most complete)
├── keriox/          - Rust production implementation (second most advanced)
└── kerijs/          - JavaScript implementation (legacy)
    ↓
Cryptographic Encoding (CESR)
├── cesride/         - Rust CESR primitives (signing, hashing, qualification)
├── cesrox/          - Rust CESR codec
├── simple-cesr/     - TypeScript CESR implementation
└── cesr-decoder/    - Browser CESR visualization tool
    ↓
Agent Infrastructure
├── keria/           - Python cloud agent (depends on keripy)
├── keriox/          - Rust witness, watcher, controller components
└── serious-keri/    - TypeScript serverless KERI for AWS Lambda (WIP)
    ↓
Edge Client Libraries
├── signify-ts/      - TypeScript signing at the edge
└── signifypy/       - Python signing library
    ↓
Web/Browser Integration
├── polaris-web/     - TypeScript library for websites to communicate with browser extension
└── signify-browser-extension/ - React browser extension (Chrome/Firefox) for secure auth
    ↓
Applications
├── keriauth-blazor-wasm/  - C#/Blazor browser extension (alternative implementation)
└── tsp/                   - Trust Spanning Protocol SDK (Rust)
    ↓
Deprecated/Abandoned
└── keria-aws/       - Abandoned AWS wrapper for keria (LMDB sync issues)
```

## Key Architectural Concepts

### Separation of Concerns
- **Signing at the Edge:** signify-ts/signifypy handle sensitive key operations client-side
- **Cloud Agents:** keria hosts identifiers but never has access to private keys
- **Protocol Core:** keripy provides reference implementation others build upon
- All client tasks are signed 'at the edge' via the Signify protocol

### KERIA Service Architecture
KERIA provides three endpoints for Signify clients:
- **Agency (boot):** Port 3903 - provisions agents via `/boot` requests
- **API Handler (admin):** Port 3901 - handles `/agent` requests for creating identifiers, receiving credentials
- **Message Router (http):** Port 3902 - receives external KERI protocol messages (multisig coordination, credential revocation)

### Cryptographic Primitives (CESR)
All implementations use CESR (Composable Event Streaming Representation) - qualified base-64 encoding with type prefixes:
- **Diger:** digest/hash
- **Verfer:** public key (e.g., "D" prefix for Ed25519)
- **Siger:** indexed signature
- **Cigar:** unindexed signature
- **Salter:** seed
- **E prefix:** Blake3-256 digest

### Browser Extension Authentication Flow
The **signify-browser-extension** and **polaris-web** work together to enable passwordless web authentication:
1. **Website Integration:** Websites integrate polaris-web library to communicate with the browser extension
2. **Extension Storage:** Browser extension connects to KERIA agent and retrieves user AIDs and credentials
3. **Signing Requests:** Website uses polaris-web to request signed headers from the extension
4. **Secure Signing:** Extension signs requests using signify-ts (keys never exposed to websites)
5. **Authentication:** Website backend validates signed headers against KERI protocol
6. **Association Storage:** Signing associations stored in Chrome storage for future use

**Security Model:**
- Private keys never exposed to websites
- Extension only signs for websites with established associations
- All operations require active tab context
- Passcode timeout for additional security

### Event-Driven Architecture
- KERI events form an immutable ledger per identifier
- Asynchronous processing using HIO (Hierarchical Input/Output) orchestration in Python projects
- Conflict resolution via KAACE (Key Agreement, Aggregation, Consensus, and Escrow)

## Common Development Commands

### Specifications (kswg-*-specification)

The KERI Working Group (KSWG) specifications use Spec-Up-T for rendering. These repos contain the authoritative protocol specifications.

**Building specs locally:**
```bash
cd kswg-keri-specification  # or kswg-cesr-specification, kswg-acdc-specification
npm install
npm run render              # Build HTML output
npm run dev                 # Development server with hot reload
```

**Spec locations:**
- **KERI:** https://trustoverip.github.io/kswg-keri-specification/
- **CESR:** https://trustoverip.github.io/kswg-cesr-specification/
- **ACDC:** https://trustoverip.github.io/kswg-acdc-specification/

### serious-keri (Serverless KERI for AWS Lambda)

TypeScript implementation designed for serverless environments. Uses DynamoDB instead of LMDB.

**Structure:**
- `packages/core/` - Pure KERI logic (no AWS dependencies)
- `packages/aws/` - DynamoDB implementations, Lambda handlers
- `infrastructure/` - AWS CDK stack
- `tests/integration/` - Tests against deployed infrastructure

**Setup:**
```bash
cd serious-keri
pnpm install
pnpm build
```

**Testing:**
```bash
pnpm test                  # Run all tests
pnpm test:deployed         # Test deployed infrastructure
```

**Deploy:**
```bash
cd infrastructure
pnpm cdk deploy            # Deploy to AWS
pnpm cdk diff              # Preview changes
```

**Current Status:** DynamoDB tables deployed, Lambda handlers pending (bundling issues with signify-ts/libsodium).

### keripy (Python Reference Implementation)

**Setup:**
```bash
cd keripy
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

**Testing:**
```bash
pip install pytest
pytest tests/ --ignore tests/demo/     # Run core tests
pytest tests/demo/                     # Run demo tests
pytest tests/path/to/test_file.py      # Run single test file
pytest tests/path/to/test_file.py::test_function_name  # Run single test
```

**CLI:**
```bash
kli version                            # Check installation
```

**Build Docker:**
```bash
make build-keri
make publish-keri
```

**Documentation:**
```bash
pip install sphinx myst-parser
cd docs && make html
```

### keria (Cloud Agent)

**Setup:**
```bash
cd keria
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Run:**
```bash
keria start --config-dir scripts --config-file demo-witness-oobis
```

**Testing:**
```bash
pip install pytest
pytest tests/
```

**Build Docker:**
```bash
make build-keria
```

### keriox (Rust Implementation)

**Structure:**
- `keriox_core/` - Core protocol implementation
- `keriox_tests/` - Integration tests
- `keriox_sdk/` - SDK layer
- `components/witness/` - Witness node
- `components/watcher/` - Watcher node
- `components/controller/` - Controller client
- `support/gossip/` - Gossip protocol
- `support/teliox/` - Teliox support

**Testing:**
```bash
cd keriox
cargo test                             # Run all tests in workspace
cargo test --package keriox_core       # Test specific package
cargo test --package keriox_tests      # Run integration tests
cargo test test_name                   # Run specific test
```

**Build:**
```bash
cargo build                            # Debug build
cargo build --release                  # Release build
cargo build --package witness          # Build specific component
```

**Run Witness/Watcher:**
```bash
cd components/witness && cargo run
cd components/watcher && cargo run
```

### signify-ts (TypeScript Edge Signing)

**Setup:**
```bash
cd signify-ts
npm install
```

**Testing:**
```bash
npm test                               # Run all tests with Jest
npm test -- --testPathPattern=test_name  # Run specific test
```

**Build:**
```bash
npm run build
```

### signify-browser-extension (Browser Extension for Secure Auth)

**Setup:**
```bash
cd signify-browser-extension
npm install
```

**Build:**
```bash
npm run build                          # Build for Chrome (outputs to dist/chrome/)
npm run build:firefox                  # Build for Firefox (outputs to dist/firefox/)
npm run dev                            # Development mode with hot reload
```

**Prerequisites:**
- Requires a running KERIA agent (see keria section)
- Note the boot URL (default port 3903) and agent URL (default port 3901)

**Architecture:**
- **Background script (service worker):** Handles messages and KERIA agent communication
- **Popup:** User interface accessed via extension icon
- **Content script:** Injected into web pages to handle website messages
- **Dialog:** HTML injected by content script for user interaction

**Security Features:**
- Only sends signed headers to websites with established signing associations
- Passcode temporarily stored and zeroed after timeout
- All sensitive data accessed only by background script and popup
- Requires active tab for all operations

### polaris-web (Web Library for Extension Communication)

**Setup:**
```bash
cd polaris-web
npm install
```

**Testing:**
```bash
npm test                               # Run tests with Vitest
npm run format                         # Format code with Prettier
npm run lint                           # Lint code with ESLint
```

**Build:**
```bash
npm run build                          # Build TypeScript to dist/
npm run docs:build                     # Generate TypeDoc documentation
npm run docs:serve                     # Build and serve documentation
```

**Example Usage:**
```bash
npm -w web-react start                 # Run example React app
```

**Purpose:**
- Companion library for websites to communicate with signify-browser-extension
- Enables websites to request signed headers for authentication
- Websites integrate this library to interact with user's browser extension

### Other Projects

**cesride (Rust CESR):**
```bash
cd cesride
cargo test
cargo build
```

**simple-cesr (TypeScript):**
```bash
cd simple-cesr
npm install
npm test
npm run standards-test                 # Cross-validation tests
```

**signifypy (Python Signing):**
```bash
cd signifypy
pip install -r requirements.txt
pytest tests/
```

**tsp (Trust Spanning Protocol):**
```bash
cd tsp
cargo test
cargo run --package tsp_demo           # Run demo
```

### Deprecated Projects

**keria-aws (Abandoned):**
Attempted to wrap keria with S3/DynamoDB sync for AWS Lambda. Abandoned due to:
- LMDB memory-mapped database incompatible with Lambda's ephemeral filesystem
- Race conditions with cache synchronization
- Stale cache and rebuild failures

This led to the creation of **serious-keri** as a ground-up serverless implementation.

## Shared Dependencies

### System Requirements
- **Python:** 3.10.4+ (preferably 3.12.1+)
- **Rust:** 1.88+
- **Node.js:** Current LTS
- **libsodium:** 1.0.18+ (required for all projects)

### Python Dependencies (keripy, keria, signifypy)
- lmdb 0.98+ (database)
- pysodium 0.7.5+ (libsodium bindings)
- blake3 0.1.5+ (hashing)
- msgpack 1.0.0+ (serialization)
- simplejson 3.17.0+
- cbor2 5.1.0+ (encoding)
- hio (orchestration - keria only)
- falcon (web framework - keria only)

### Rust Dependencies (keriox, cesride, tsp)
- argon2 (key stretching)
- ed25519-dalek (signing)
- blake3/blake2 (hashing)
- sha2/sha3 (hashing)
- k256/p256 (ECDSA curves)
- tokio (async runtime)
- axum (web framework - tsp)

### TypeScript/JavaScript Dependencies
**Core libraries (signify-ts, simple-cesr):**
- libsodium.js (cryptography)
- blake3 (hashing)
- Jest (testing)

**Browser extension (signify-browser-extension):**
- React 18+ (UI framework)
- signify-ts (KERI signing)
- Vite (build tool)
- styled-components (styling)
- webextension-polyfill (cross-browser compatibility)
- @crxjs/vite-plugin (Chrome extension bundling)

**Web integration (polaris-web):**
- TypeScript (type-safe development)
- Vitest (testing)
- TypeDoc (documentation generation)

### macOS libsodium Setup
After installing with Homebrew, link the library:
```bash
sudo ln -s /opt/homebrew/lib /usr/local/lib
```

## Testing Frameworks

- **Python:** pytest with test discovery
- **Rust:** `cargo test` with workspace support, rstest for parameterized tests
- **TypeScript/JavaScript:** Jest (signify-ts, simple-cesr) or Vitest (polaris-web)

## Important Notes

### Security Principles
- Private keys never leave the edge client (signify-ts/signifypy)
- Cloud agents (keria) never have access to decryption keys
- All events are cryptographically signed and verifiable
- Post-quantum resistant using Ed25519 with pre-rotation

### KERI vs Traditional Blockchain
- No global ordering required
- No canonical chain or "KERI Network"
- Identifiers generated independently in self-sovereign manner
- Same security properties without blockchain overhead

### Multi-Signature Support
- Threshold multi-sig and delegated signing
- Flexible key rotation through pre-rotation commitment
- Asynchronous multisig coordination via Message Router

## Documentation

### Specifications (Authoritative)
- **KERI Spec:** https://trustoverip.github.io/kswg-keri-specification/
- **CESR Spec:** https://trustoverip.github.io/kswg-cesr-specification/
- **ACDC Spec:** https://trustoverip.github.io/kswg-acdc-specification/
- **KERI Whitepaper:** https://github.com/SmithSamuelM/Papers/blob/master/whitepapers/KERI_WP_2.x.web.pdf

### Implementation Docs
- **keripy:** https://keripy.readthedocs.io
- **keria:** https://keria.readthedocs.io
- **signify-ts:** https://weboftrust.github.io/signify-ts/
