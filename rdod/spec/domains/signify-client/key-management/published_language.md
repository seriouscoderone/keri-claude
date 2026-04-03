# Published Language — signify-client/key-management

## Key Derivation Path Formula

The keripy reference formula for deterministic key derivation from a master salt:

```
path = stem + hex(ridx) + hex(kidx + i)
```

Where:
- **stem**: string prefix identifying the derivation context; defaults to `hex(pidx)`
- **pidx**: AID index under this passcode (0, 1, 2...)
- **ridx**: rotation index (increments on each key rotation)
- **kidx**: key index within a rotation (for multi-key thresholds)
- **i**: iterator for generating multiple keys at the same derivation level

The signify-ts implementation uses an offset calculation that produces equivalent kidx values. Both approaches yield identical derived keys for the same logical key position.

Same salt + same path always produces the same key. This determinism is the foundation of salty keeper recoverability from the passcode alone.
