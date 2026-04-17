# LockedIn iOS App — Design Specification

**Date:** 2026-04-15
**Status:** Draft
**Ecosystem:** Humanitarian Service Marketplace (first integration, but LockedIn is ecosystem-agnostic)
**Bounded Context:** Presence Attestation

---

## 1. What This Is

LockedIn is a native iOS app that silently builds a private, cryptographic record of the controller's presence. The phone observes GPS, barometric pressure, and biometric signals, signs each observation as a KERI ACDC, and anchors batches to the controller's KEL via TEL. Nobody sees the data unless the controller chooses to disclose it.

The KERI stack IS the application database. Every piece of data in the app — every GPS reading, every hourly summary, every daily record — is a verifiable credential. There is no separate app database. SQLiteDBer replaces LMDB as the storage engine under keripy, and the full KERI protocol runs locally on the phone.

Witnesses are optional. The free tier works with no cloud infrastructure at all. Paid tiers add independent witnesses for stronger proof. The controller chooses.

---

## 2. Architecture

```
+-------------------------------------------------------+
|  LockedIn iOS App                                      |
|                                                        |
|  +--------------------------------------------------+ |
|  |  SwiftUI Layer                                    | |
|  |  - Presence timeline, disclosure sharing          | |
|  |  - Witness management, trust tier display         | |
|  |  - Direct peer-to-peer verification               | |
|  +-------------------------+------------------------+ |
|                            |                           |
|  +-------------------------v------------------------+ |
|  |  Native Services (Swift)                          | |
|  |  - CLLocationManager (GPS + barometric, always-on)| |
|  |  - LocalAuthentication (Face ID / Touch ID)       | |
|  |  - iOS Keychain (passcode, pre-rotation keys)     | |
|  |  - Background location session (continuous)       | |
|  +-------------------------+------------------------+ |
|                            |                           |
|  +-------------------------v------------------------+ |
|  |  Swift <-> Python Bridge (PythonKit)              | |
|  |  16 functions — narrow API, maps to 10 journeys  | |
|  +-------------------------+------------------------+ |
|                            |                           |
|  +-------------------------v------------------------+ |
|  |  keripy (serverless fork + SQLiteDBer)            | |
|  |                                                    | |
|  |  THE database. Every piece of app data is an      | |
|  |  ACDC, a KEL event, or a TEL event.               | |
|  |                                                    | |
|  |  SQLiteDBer -> iOS app sandbox file               | |
|  +--------------------------------------------------+ |
|                                                        |
|  -- optional background URLSession --                  |
|       |                                                |
+-------|-------------------------------------------------+
        v
  +------------------+
  | Witness Pool     |  (serverless keripy + DynamoDB)
  | (optional)       |  free tier: LockedIn witness
  +------------------+
```

**Principle:** Swift owns the device. Python owns the protocol. The bridge between them is a handful of functions. All application data lives as ACDCs inside keripy's SQLiteDBer.

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Fat wallet (local keripy), not thin client (signifypy + KERIA) | Self-sovereign. No hosting required. The phone IS the agent. |
| Swift native shell, not Flet/Kivy | Full control over iOS APIs (background location, biometrics, Keychain). No framework risk. |
| SQLiteDBer, not LMDB | LMDB uses memory-mapped files unsuitable for mobile. SQLite is iOS-native, battle-tested, supports WAL mode for concurrent read/write. |
| KERI stack as the database | No separate app database. Every data point is a verifiable credential. Eliminates impedance mismatch between app state and protocol state. |
| PythonKit for bridge | Embeds CPython in Swift process. Synchronous calls. Single-language debugging on the Python side. |
| keripy serverless fork (feat/dynamodb-backend) | Already decoupled from LMDB. DynamoDBer proves the interface is abstractable. SQLiteDBer follows the same pattern. |

---

## 3. Presence Attestation Domain Model

### Ubiquitous Language

| Term | Definition |
|---|---|
| **Observation** | A single signed sensor reading — GPS, barometric pressure, biometric confirmation. The atomic unit of presence data. An Untargeted ACDC issued by the phone's AID. |
| **Epoch** | A time-bounded collection of Observations, bulk-issued as a batch. Default: 1 hour. The anchoring unit — one TEL entry per Epoch. |
| **Chronicle** | A daily aggregation of Epochs. Provides coarse-grained presence summary without requiring Observation-level access. |
| **Disclosure** | A selectively revealed window of the controller's attestation history. The controller chooses the time range, granularity, and recipient. |
| **Trust Tier** | The witness configuration backing the controller's attestations. Visible to any Disclosure recipient. |
| **Observer** | The device (phone) that collects sensor data and signs Observations. The Observer controls the AID. |

### Verbs

| Verb | Meaning |
|---|---|
| **Observe** | Collect sensor data (GPS, barometric, biometric) |
| **Attest** | Sign an Observation as an ACDC |
| **Anchor** | Bulk-issue an Epoch's Observations to the TEL, anchored to KEL via interaction event |
| **Disclose** | Selectively reveal a time window to a recipient |
| **Witness** | (KERI native) Receipt KEL events |

### ACDC Hierarchy

```
Observation (every 5 min, Untargeted ACDC)
  |  Attributes: coordinates, altitude, barometric_pressure,
  |              horizontal_accuracy, biometric_method,
  |              biometric_confidence, observed_at
  |
  v  (bulk-issued per Epoch -> 1 TEL anchor)
Epoch (hourly aggregation ACDC)
  |  Attributes: starts_at, ends_at, observation_count,
  |              bounding_box, mean_accuracy, biometric_count
  |  Edges: references child Observation SAIDs
  |
  v  (1 per day)
Chronicle (daily aggregation ACDC)
     Attributes: date, epoch_count, total_observations,
                 movement_summary, biometric_summary
     Edges: references child Epoch SAIDs
```

### Graduated Disclosure

| Level | Verifier sees | Use case |
|---|---|---|
| Compact | Chronicle SAID only — "attested presence exists for this date" | Quick boolean check |
| Partial | Epoch-level summaries — bounding boxes and counts per hour | "They were in this area from 9am-1pm" |
| Full | Individual Observations — every 5-min coordinate + biometric | Legal/compliance audit |

### Spec Grounding

The ACDC specification (Section: Untargeted Attribute Section) explicitly describes this pattern:

> "An observer, such as a sensor that controls an AID, MAY make verifiable, nonrepudiable measurements and publish them as ACDCs. These MAY be chained together to provide provenance of a chain of custody of any data."

Observations are Untargeted ACDCs — Issuer (phone AID) but no Issuee. Issued "to whom it may concern." Verifiable authorship without a specified counterparty.

### KEL Impact

| Data | Storage location | Touches KEL? | Touches witnesses? |
|---|---|---|---|
| GPS/bio readings | ACDC in SQLiteDBer | No | No |
| Hourly bulk anchor | TEL event -> KEL ixn | Yes (1 per hour) | Yes (receipted) |
| Daily rollup | ACDC + TEL | Yes (1 per day) | Yes |
| Key state | KEL (inception/rotation) | Yes | Yes |
| Encrypted private keys | CryptSignerSuber in SQLiteDBer | No | No |

Total KEL events per day: ~25 (24 hourly anchors + 1 daily Chronicle). Witnesses receipt ~25 events/day, not hundreds.

### What's In Scope vs. Out of Scope

**In scope (LockedIn bounded context):**
- AID lifecycle (inception, rotation, key management)
- Observation pipeline (collect -> attest -> anchor)
- Epoch/Chronicle aggregation
- Disclosure packaging (selective disclosure of time windows)
- Witness management (tier selection, OOBI exchange, direct receipting)
- Biometric gating (unlock attestation keys)
- Direct peer-to-peer verification

**Out of scope (consuming ecosystem concerns):**
- Proof of service (humanitarian marketplace interprets our Disclosures)
- Attribution agreements (business relationship between witness providers)
- Watcher networks (verifier's infrastructure choice)
- Non-KERI REST APIs (verifier builds their own bridge)
- Service commitments (external ecosystem credentials chain into our Disclosures)

---

## 4. User Journeys

### Setup & Identity

**Journey 1: First-Time Setup**
Download app -> grant permissions (location, barometer, biometrics) -> AID inception -> select witness tier -> pipeline starts. User can close the app. It runs forever in background.

**Journey 2: Existing AID Discovery**
User already has a KERI AID -> resolve via OOBI -> associate with this device -> pipeline starts.

**Journey 3: Witness Management**
Add/remove/change witnesses -> change trust tier -> OOBI exchange with new witnesses -> KEL rotation event if witness list changes.

**Journey 4: Key Rotation / Device Migration**
User-initiated or security-prompted -> rotate to pre-committed next key -> new device becomes controller -> old device's key is dead -> witnesses confirm via receipted rotation event.

### Passive (background, invisible, always-on)

**Journey 5: Observation Pipeline**
Phone silently observes GPS + barometric + biometric -> signs each as Untargeted ACDC -> stores in SQLiteDBer -> on Epoch boundary (hourly): bulk-issue + TEL anchor + KEL ixn -> on Chronicle boundary (daily): daily rollup ACDC -> opportunistic witness sync when network available.

### Active (user-initiated, optional)

**Journey 6: Browse Presence Timeline**
Open app -> scroll through Chronicles (daily cards) -> tap to see Epochs (hourly map) -> tap to see individual Observations (pins on map). All local queries against SQLiteDBer.

**Journey 7: Manual Attestation**
"I'm here" quick action -> biometric confirmation -> higher-strength Observation with explicit biometric proof. For moments that matter — arriving at a site, starting a shift.

**Journey 8: Disclose a Time Window**
Select date/time range -> choose granularity (compact/partial/full) -> app packages selective disclosure -> share via QR code, link, or AirDrop. Trust tier and witness list visible to recipient.

**Journey 9: Direct Peer-to-Peer Verification**
Two phones face to face -> exchange OOBIs (QR scan) -> controller discloses -> verifier's app verifies locally (both have full KERI stack) -> result displayed with trust tier and witness confirmations. No server needed.

**Journey 10: Trust & Witness Health**
View current trust tier -> see per-witness health (last receipt, reachability) -> AID info and OOBI display.

### Trust Tiers

| Tier | Witnesses | Cost | Trust Level |
|---|---|---|---|
| Free | LockedIn only (1 witness) | Free | Low (visible warning) |
| BYOW | User's own witnesses | Free | Variable (depends on witness reputation) |
| Standard | LockedIn + 2 ecosystem witnesses | $2-5/month | Real verifiability |
| Premium | Multiple reputable witnesses | Varies | Strongest |

---

## 5. Background Observation Pipeline

### Always-On Execution Model

The app uses `allowsBackgroundLocationUpdates` on `CLLocationManager`. This keeps the app alive in background indefinitely as long as location permission is "Always." iOS does not kill apps actively receiving location updates. Same mechanism as fitness trackers and navigation apps.

```
First Launch (only time user MUST open app)
    |
    v
Onboarding -> permissions -> AID inception
-> biometric unlock -> passcode stored in Keychain
    |
    v
Pipeline starts. User can close the app.
App is never killed by iOS (active location session).
Blue status bar indicator: "LockedIn is using your location."

From this point forward, the app is silent.
User opens it only when they WANT to.
```

### Pipeline Cycle (every 3-5 minutes)

```
1. OBSERVE
   CLLocationManager.requestLocation()
   CMAltimeter.startRelativeAltitudeUpdates()
   (biometric: already confirmed at session start)

2. ATTEST (call into keripy via bridge)
   observation = {
     coordinates: (lat, lon),
     altitude: meters,
     barometric_pressure: hPa,
     horizontal_accuracy: meters,
     biometric_method: "face_id" | "none",
     biometric_confidence: 0.0-1.0 | null,
     observed_at: ISO8601
   }
   -> keripy signs as Untargeted ACDC
   -> stored in SQLiteDBer

3. CHECK EPOCH BOUNDARY
   if current_hour != last_anchor_hour:
     -> bulk-issue previous Epoch's Observations
     -> anchor to TEL -> KEL interaction event
     -> submit KEL event to witnesses (if online)

4. CHECK CHRONICLE BOUNDARY
   if current_date != last_chronicle_date:
     -> issue Chronicle ACDC for previous day
     -> anchor to TEL -> KEL interaction event
```

### Witness Sync (opportunistic, non-blocking)

```
When network available:
  -> submit any unrecipted KEL events to witnesses
  -> collect receipts
  -> store receipts in SQLiteDBer
When offline:
  -> queue events, sync later
  -> app functions fully without witnesses
```

### iOS Background Task Registration

| Task | Type | Frequency | Purpose |
|---|---|---|---|
| Location updates | CLLocationManager delegate | Continuous | Feeds GPS to pipeline |
| `com.lockedin.anchor` | BGProcessingTask | Hourly | Bulk-issue Epoch (heavier crypto) |
| Witness sync | Opportunistic URLSession | When network available | Submit KEL events, collect receipts |

### Reboot Recovery

```
Device reboots
  -> iOS relaunches app via significant location change trigger
  -> App reads passcode from Keychain (requires one biometric unlock post-reboot)
  -> Derives decryption key
  -> Pipeline resumes
  -> Gap in timeline: reboot to first-unlock (honest, visible)
```

### The Only Times User MUST Interact

1. First launch (onboarding + biometric to store passcode)
2. After device reboot (biometric to unlock Keychain — iOS requirement)

Everything else is optional user-initiated activity.

---

## 6. Swift <-> Python Bridge API

Narrow interface between native shell and keripy. 16 functions mapping to 10 user journeys.

### Setup & Identity

```swift
/// Journey 1: First-time setup — create AID with key pair, pre-rotation, witnesses
func inceptAID(witnessOOBIs: [String], witnessTier: TrustTier) -> AIDResult

/// Journey 2: Discover existing AID via OOBI
func resolveOOBI(url: String) -> OOBIResult

/// Journey 3: Change witness configuration
func updateWitnesses(add: [String], remove: [String], threshold: Int) -> RotationResult

/// Journey 4: Rotate to new key (device migration, security event)
func rotateKeys() -> RotationResult
```

### Attestation

```swift
/// Journey 5: Background observation (called every 3-5 min by iOS)
func attest(observation: Observation) -> SAID

/// Journey 5: Epoch boundary (called hourly)
func anchorEpoch(observationSAIDs: [SAID]) -> EpochResult

/// Journey 5: Chronicle boundary (called daily)
func anchorChronicle(epochSAIDs: [SAID]) -> ChronicleResult

/// Journey 7: Manual attestation (user-initiated, biometric-confirmed)
func attestManual(observation: Observation, biometricProof: BiometricProof) -> SAID
```

### Disclosure

```swift
/// Journey 8: Package selective disclosure for a time window
func disclose(from: Date, to: Date, granularity: Granularity) -> Disclosure

/// Journey 9: Direct peer-to-peer — generate OOBI for local exchange
func generateOOBI() -> String

/// Journey 9: Direct peer-to-peer — verify a received disclosure
func verifyDisclosure(disclosure: Disclosure) -> VerificationResult
```

### Query (local, never touches network)

```swift
/// Journey 6: Browse presence timeline
func queryChronicles(from: Date, to: Date) -> [Chronicle]
func queryEpochs(chronicleSAID: SAID) -> [Epoch]
func queryObservations(epochSAID: SAID) -> [Observation]

/// Journey 10: Witness health
func witnessStatus() -> [WitnessHealth]
func trustTier() -> TrustTier
```

### Network (opportunistic, background)

```swift
/// Submit unrecipted KEL events to witnesses
func syncWitnesses() -> SyncResult
```

### Data Types Crossing the Bridge

```swift
struct Observation {
    let coordinates: (lat: Double, lon: Double)
    let altitude: Double              // meters
    let barometricPressure: Double    // hPa
    let horizontalAccuracy: Double    // meters
    let biometricMethod: String       // "face_id", "touch_id", "none"
    let biometricConfidence: Double?  // 0.0-1.0 or nil
    let observedAt: Date
}

enum Granularity {
    case compact     // Chronicle-level only
    case partial     // Epoch summaries
    case full        // Individual Observations
}

enum TrustTier: String {
    case free        // LockedIn witness only
    case byow        // User's own witnesses
    case standard    // LockedIn + 2 ecosystem witnesses
    case premium     // Multiple reputable witnesses
}

struct WitnessHealth {
    let aid: String
    let lastReceipt: Date?
    let reachable: Bool
    let label: String    // user-facing name
}

struct VerificationResult {
    let valid: Bool
    let trustTier: TrustTier
    let witnessConfirmations: Int
    let observationCount: Int
    let timeRange: (from: Date, to: Date)
}
```

### What the Bridge Is NOT

- Not a full keripy API exposure — Swift never touches Habery, Kevery, Baser directly
- Not async — each call is synchronous from Swift's perspective (called on background thread)
- Not network-aware — `syncWitnesses()` is the only call that touches the network

### Implementation

PythonKit (Swift package that embeds CPython). Each bridge function maps to a Python function in a single `bridge.py` module that wraps keripy operations. The Python side is the only code that imports keripy.

---

## 7. iOS App Structure

### SwiftUI View Hierarchy

```
LockedInApp (root)
|-- OnboardingFlow (shown once, Journey 1)
|   |-- PermissionsView        — request location, barometer, biometrics
|   |-- IdentityView           — create AID or resolve existing OOBI
|   +-- WitnessTierView        — select free/BYOW/standard/premium
|
|-- MainTabView (daily use)
|   |-- TimelineTab (Journey 6)
|   |   |-- ChronicleListView  — scrollable daily cards
|   |   |-- EpochDetailView    — hourly breakdown with map
|   |   +-- ObservationMapView — individual pins on map
|   |
|   |-- DiscloseTab (Journeys 8 & 9)
|   |   |-- WindowPickerView   — date/time range selector
|   |   |-- GranularityView    — compact / partial / full toggle
|   |   |-- ShareView          — QR code, link, AirDrop
|   |   +-- DirectVerifyView   — scan QR / receive disclosure, show result
|   |
|   +-- StatusTab (Journeys 3 & 10)
|       |-- TrustTierView      — current tier + upgrade prompt
|       |-- WitnessListView    — health indicators per witness
|       +-- IdentityView       — AID info, rotation action, OOBI display
|
|-- ManualAttestView (Journey 7, quick-action / widget)
|   +-- "I'm here" button -> biometric prompt -> confirmed observation
|
+-- BiometricGateView (security layer, shown only post-reboot)
```

---

## 8. Security Model

### Secret Storage

| Secret | Storage | When accessible |
|---|---|---|
| Passcode | iOS Keychain (`kSecAttrAccessibleAfterFirstUnlock`) | After first biometric unlock post-reboot. Persistent across app backgrounding. |
| Decryption key (derived) | In-memory only, never persisted | For process lifetime. Process lives as long as location session is active. |
| Encrypted private signing keys | SQLiteDBer (CryptSignerSuber) | Always on disk (but useless without decryption key) |
| Pre-rotation next key | iOS Keychain (separate entry, highest protection class) | Only during rotation |
| SQLite database file | iOS app sandbox, `NSFileProtectionCompleteUntilFirstUserAuthentication` | While device is unlocked or after first unlock |

### Always-On Security Flow

```
Cold Launch / Post-Reboot:
  Face ID / Touch ID
      |
      v
  iOS Keychain -> retrieve passcode
      |
      v
  Passcode -> Argon2 -> decryption key (held in memory)
      |
      v
  keripy CryptSignerSuber can now decrypt private keys
      |
      v
  Pipeline runs continuously. User can close the app.
```

### Threat Scenarios

| Scenario | Mitigation |
|---|---|
| Device stolen while locked | iOS Data Protection encrypts SQLite at rest. Keys double-encrypted (iOS + Argon2). Attacker gets nothing. |
| Device stolen while unlocked | Attacker has process with decryption key in memory. Controller rotates keys from another device (pre-rotation). Attacker's observations detectable (wrong location pattern). |
| Reboot | App relaunches via location trigger. Keychain requires one biometric unlock. Gap in timeline is honest and visible. |
| Compromised key | Rotate immediately. Pre-rotation means attacker cannot rotate first (they don't have the next key). |
| Lost phone, have witnesses | KEL recoverable from witnesses. Rotate to pre-committed next key on new device. Undisclosed Observations lost (acceptable). |
| Lost phone, no witnesses | AID is gone. Start fresh. This is the visible consequence of the free tier. |

### Honest Gaps

If iOS kills the background task, if the user hasn't opened the app after reboot, if location permission is downgraded — the timeline has gaps. These gaps are visible in the UI and in any Disclosure. A verifier sees "continuous attestation from 8am-5pm with Face ID" vs. "spotty coverage, no biometric" and draws their own conclusions. Gaps are a feature, not a bug.

---

## 9. SQLiteDBer Implementation

### What It Is

A `SQLiteDBer` class implementing the same method interface as `DynamoDBer` on the `feat/dynamodb-backend` branch. Drop-in replacement — `subing.py`, `koming.py`, `basing.py` work unchanged on top of it.

### Schema

```sql
-- Single table design (mirrors DynamoDB's single-table pattern)
CREATE TABLE keri_store (
    subdb   TEXT    NOT NULL,   -- subdatabase name ('evts.', 'sigs.', 'rcts.', etc.)
    key     BLOB    NOT NULL,   -- primary key (same bytes keripy uses)
    sort    BLOB    NOT NULL DEFAULT x'',  -- sort key (ordinals, io-sets, dups)
    value   BLOB    NOT NULL,   -- stored value (CESR primitives, events, encrypted keys)

    PRIMARY KEY (subdb, key, sort)
);

CREATE INDEX idx_subdb_key ON keri_store (subdb, key);
CREATE INDEX idx_subdb ON keri_store (subdb);

CREATE TABLE keri_meta (
    subdb   TEXT    PRIMARY KEY,
    dupsort INTEGER NOT NULL DEFAULT 0,
    flags   TEXT    -- JSON for future extensibility
);
```

### Method Mapping

| DynamoDBer method | SQLite equivalent |
|---|---|
| `putVal(db, key, val)` | `INSERT OR IGNORE INTO keri_store (subdb, key, sort, value) VALUES (?, ?, x'', ?)` |
| `setVal(db, key, val)` | `INSERT OR REPLACE INTO keri_store ...` |
| `getVal(db, key)` | `SELECT value FROM keri_store WHERE subdb=? AND key=? AND sort=x''` |
| `delVal(db, key)` | `DELETE FROM keri_store WHERE subdb=? AND key=? AND sort=x''` |
| `putOnVal(db, key, on, val)` | `INSERT OR IGNORE ... sort = on_as_32hex` |
| `getOnVal(db, key, on)` | `SELECT ... WHERE sort = on_as_32hex` |
| `addIoSetVal(db, key, val)` | `INSERT ... sort = next_insertion_order_hex` |
| `getIoSetVals(db, key)` | `SELECT ... WHERE subdb=? AND key=? ORDER BY sort` |
| `putVals(db, key, vals)` | Multiple inserts with `sort = val` for dup ordering |
| `cnt*(db, key)` | `SELECT COUNT(*) ...` |
| Iterators | SQLite cursors with `ORDER BY key, sort` |

### Integration Into keripy Fork

New file: `src/keri/db/sqlitedbing.py` (~800-1000 lines)
Update: `src/keri/db/__init__.py` — add optional import (same pattern as DynamoDBer)

```python
try:
    from .sqlitedbing import SQLiteDBer, openSQLite
except ImportError:
    pass  # sqlite3 not available (unlikely — it's in Python stdlib)
```

App bootstrap:

```python
from keri.db.sqlitedbing import SQLiteDBer

db = SQLiteDBer.open(
    name="lockedin",
    stores=[...all Baser subdbs...],
    path="/var/mobile/.../lockedin.sqlite"
)
baser = Baser(db=db)  # everything else works unchanged
```

### Operational Considerations

| Concern | Mitigation |
|---|---|
| Concurrent read/write | `PRAGMA journal_mode=WAL` — background observations write while UI reads |
| Bulk Epoch issuance | Wrap 12 Observation inserts + TEL anchor in single `BEGIN/COMMIT` |
| File size growth | ~280KB/day (288 Observations x ~1KB). ~100MB/year. Manageable. Older Chronicles prunable. |
| Thread safety | Serialized mode or one connection per thread |
| iOS file protection | `NSFileProtectionCompleteUntilFirstUserAuthentication` — matches always-on model |

---

## 10. Recovery Model

KERI's recovery mechanism IS the backup strategy. There is no export/import.

| Scenario | Recovery |
|---|---|
| Lost phone, have witnesses | KEL recoverable from witnesses. Rotate to pre-committed next key on new device. Undisclosed Observations are lost (acceptable — they were never shared). |
| Lost phone, no witnesses | AID is gone. Start fresh. Visible consequence of free tier — incentive to upgrade. |
| New phone (voluntary) | Rotate to new device. Pre-rotation commitment enables seamless migration. Old key is dead. |
| Compromised key | Rotate immediately. Attacker cannot rotate first (pre-rotation). |
| Multi-sig recovery | Future feature. Multiple devices share control. Losing one doesn't lose the AID. |

---

## 11. Dependencies

### iOS Side
- Swift 5.9+ / SwiftUI
- PythonKit (CPython embedding)
- CoreLocation (GPS + barometric)
- CoreMotion (altimeter)
- LocalAuthentication (Face ID / Touch ID)
- BackgroundTasks framework
- Security framework (Keychain)

### Python Side (embedded in app bundle)
- keripy (serverless fork, `feat/dynamodb-backend` branch + SQLiteDBer)
- pysodium (libsodium bindings — cross-compiled for iOS arm64)
- blake3 (cross-compiled for iOS arm64)
- msgpack, cbor2, simplejson (pure Python or pre-compiled)
- sqlite3 (Python stdlib, uses iOS system SQLite)
- No LMDB. No boto3. No falcon. No hio.

### Infrastructure (optional)
- Serverless witness pool: keripy `feat/dynamodb-backend` + AWS Lambda + DynamoDB
- Free tier: single LockedIn-operated witness
- Paid tiers: multiple independent ecosystem witnesses

---

## 12. What This Design Does NOT Cover

These are explicitly out of scope and belong to consuming ecosystems or future work:

- Proof of service credentials (humanitarian marketplace's concern)
- Attribution agreements (witness provider business relationships)
- Watcher networks (verifier's infrastructure)
- Non-KERI verification APIs (verifier builds their own)
- Android (future — architecture is portable but iOS first)
- Multi-sig (future — advanced recovery and shared control)
- Revenue/billing integration (business layer, not protocol layer)
