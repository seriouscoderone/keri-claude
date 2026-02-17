# Parside Group Types

## Counter Code → Group Type Mapping

| Counter Code | Codex Constant | Container Type | Item Type | Item Fields (cesride primitives) |
|-------------|----------------|----------------|-----------|----------------------------------|
| `-A` | `ControllerIdxSigs` | `ControllerIdxSigs` | `ControllerIdxSig` | `siger: Siger` |
| `-B` | `WitnessIdxSigs` | `WitnessIdxSigs` | `WitnessIdxSig` | `siger: Siger` |
| `-C` | `NonTransReceiptCouples` | `NonTransReceiptCouples` | `NonTransReceiptCouple` | `cigar: Cigar` |
| `-D` | `TransReceiptQuadruples` | `TransReceiptQuadruples` | `TransReceiptQuadruple` | `prefixer: Prefixer, seqner: Seqner, saider: Saider, siger: Siger` |
| `-E` | `FirstSeenReplayCouples` | `FirstSeenReplayCouples` | `FirstSeenReplayCouple` | `firner: Seqner, dater: Dater` |
| `-F` | `TransIdxSigGroups` | `TransIdxSigGroups` | `TransIdxSigGroup` | `prefixer: Prefixer, seqner: Seqner, saider: Saider, isigers: ControllerIdxSigs` |
| `-G` | `SealSourceCouples` | `SealSourceCouples` | `SealSourceCouple` | `seqner: Seqner, saider: Saider` |
| `-H` | `TransLastIdxSigGroups` | `TransLastIdxSigGroups` | `TransLastIdxSigGroup` | `prefixer: Prefixer, isigers: ControllerIdxSigs` |
| `-J` | `SadPathSig` | `SadPathSigs` | `SadPathSig` | `pather: Pather, tcounter: Counter, prefixer: Prefixer, seqner: Seqner, saider: Saider, sigers: ControllerIdxSigs` |
| `-K` | `SadPathSigGroup` | `SadPathSigGroups` | `SadPathSigGroup` | `root_path: Pather, sad_path_sigs: SadPathSigs` |
| `-L` | `PathedMaterialQuadlets` | `PathedMaterialQuadlets` | `PathedMaterialQuadlet` | `raw: Vec<u8>` |
| `-V` | `AttachedMaterialQuadlets` | `AttachedMaterialQuadlets` | `CesrGroup` | recursive — `Vec<CesrGroup>` |

All counter codes come from `cesride::counter::Codex`.

## Nesting Hierarchy

```
CesrGroup
│
├── Flat groups (item contains only cesride primitives):
│   ├── ControllerIdxSigs (-A) ──► [ControllerIdxSig]
│   │                                  └── siger: Siger
│   ├── WitnessIdxSigs (-B) ────► [WitnessIdxSig]
│   │                                  └── siger: Siger
│   ├── NonTransReceiptCouples (-C) ► [NonTransReceiptCouple]
│   │                                  └── cigar: Cigar (embeds Verfer)
│   ├── TransReceiptQuadruples (-D) ► [TransReceiptQuadruple]
│   │                                  ├── prefixer, seqner, saider, siger
│   ├── FirstSeenReplayCouples (-E) ► [FirstSeenReplayCouple]
│   │                                  ├── firner: Seqner, dater: Dater
│   └── SealSourceCouples (-G) ────► [SealSourceCouple]
│                                      ├── seqner, saider
│
├── Nested groups (item contains ControllerIdxSigs sub-group):
│   ├── TransIdxSigGroups (-F) ────► [TransIdxSigGroup]
│   │                                  ├── prefixer, seqner, saider
│   │                                  └── isigers: ControllerIdxSigs
│   └── TransLastIdxSigGroups (-H) ► [TransLastIdxSigGroup]
│                                      ├── prefixer
│                                      └── isigers: ControllerIdxSigs
│
├── SAD path groups (doubly nested):
│   ├── SadPathSigs (-J) ──────────► [SadPathSig]
│   │                                  ├── pather, tcounter, prefixer, seqner, saider
│   │                                  └── sigers: ControllerIdxSigs
│   └── SadPathSigGroups (-K) ────► [SadPathSigGroup]
│                                      ├── root_path: Pather
│                                      └── sad_path_sigs: SadPathSigs ──► [SadPathSig]
│
├── Raw material:
│   └── PathedMaterialQuadlets (-L) ► [PathedMaterialQuadlet]
│                                      └── raw: Vec<u8> (unparsed bytes)
│
└── Recursive container:
    └── AttachedMaterialQuadlets (-V) ► [CesrGroup, CesrGroup, ...]
                                         (any CesrGroup variant, recursively)
```

## Group Item Structs — Field Reference

### Simple items (1 primitive)

| Struct | Field | Type | Trait |
|--------|-------|------|-------|
| `ControllerIdxSig` | `siger` | `Siger` | Indexer |
| `WitnessIdxSig` | `siger` | `Siger` | Indexer |
| `NonTransReceiptCouple` | `cigar` | `Cigar` | Matter |

### Couple items (2 primitives)

| Struct | Fields | Types |
|--------|--------|-------|
| `FirstSeenReplayCouple` | `firner`, `dater` | `Seqner`, `Dater` |
| `SealSourceCouple` | `seqner`, `saider` | `Seqner`, `Saider` |

### Quadruple items (4 primitives)

| Struct | Fields | Types |
|--------|--------|-------|
| `TransReceiptQuadruple` | `prefixer`, `seqner`, `saider`, `siger` | `Prefixer`, `Seqner`, `Saider`, `Siger` |

### Nested items (primitives + sub-group)

| Struct | Primitive Fields | Sub-group Field |
|--------|-----------------|-----------------|
| `TransIdxSigGroup` | `prefixer`, `seqner`, `saider` | `isigers: ControllerIdxSigs` |
| `TransLastIdxSigGroup` | `prefixer` | `isigers: ControllerIdxSigs` |
| `SadPathSig` | `pather`, `tcounter`, `prefixer`, `seqner`, `saider` | `sigers: ControllerIdxSigs` |
| `SadPathSigGroup` | `root_path: Pather` | `sad_path_sigs: SadPathSigs` |

### Special items

| Struct | Field | Type | Notes |
|--------|-------|------|-------|
| `PathedMaterialQuadlet` | `raw` | `Vec<u8>` | Unparsed; `raw()` accessor; counter counts quadlets not items |

## Common Patterns

All container structs share:
- `pub value: Vec<ItemType>`
- `#[derive(Debug, Clone, Default)]`
- `impl Group<ItemType>` with `const CODE`
- `pub(crate) fn from_stream_bytes(bytes, &counter, &cold_code) -> ParsideResult<(&[u8], Self)>`

All item structs share:
- Public fields (no getters)
- `pub fn new(...)` constructor
- `impl GroupItem` for serialization
- `#[derive(Debug, Clone, Default)]`

## Parsing Composition

| Combinator | Used by |
|-----------|---------|
| `nom::multi::count(parser, n)` | All flat groups |
| `nom::sequence::tuple((p1, p2, ...))` | Multi-primitive items |
| `nom::multi::many0(parser)` | AttachedMaterialQuadlets, MessageList |
| Direct byte slicing | PathedMaterialQuadlets |
