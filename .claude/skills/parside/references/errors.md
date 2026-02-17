# Error Model

## ParsideError

```rust
#[derive(Error, Debug, PartialEq)]
pub enum ParsideError {
    #[error("Payload deserialize error: {0}")]
    PayloadDeserializeError(String),

    #[error("Nom error")]
    StreamDeserializationError(ErrorKind),

    #[error("Empty bytes stream passed for parsing")]
    EmptyBytesStream,

    #[error("Requested variant does not exists")]
    NotExist,

    #[error("Unexpected variant")]
    Unexpected(String),

    #[error("Common error")]
    Common(String),
}

pub type ParsideResult<T> = Result<T, ParsideError>;
```

## Error Origin Mapping

| Variant | Typical Origin | Cause | Recoverable? |
|---------|---------------|-------|-------------|
| `PayloadDeserializeError(msg)` | JSON/CBOR/MGPK deserializer, ColdCode::try_from | Malformed payload, invalid JSON syntax, CBOR structure error, tritet maps to no variant | No |
| `StreamDeserializationError(kind)` | nom combinator via `nomify!`, cesride primitive parser | Insufficient bytes, malformed CESR primitive, count mismatch | No |
| `EmptyBytesStream` | `Message::from_stream_bytes`, `MessageList::from_stream_bytes` | Caller passed `&[]` | Yes — check before calling |
| `NotExist` | `Message::payload()`, `Message::cesr_group()` | Accessed wrong variant (e.g., `payload()` on a Group message) | Yes — check variant first |
| `Unexpected(msg)` | CesrGroup counter dispatch, Parsers factory methods | Unknown counter code, unsupported ColdCode for parser | No — unsupported format |
| `Common(msg)` | `From<anyhow::Error>` propagation | Miscellaneous cesride errors | Depends on cause |

## From Conversions

```rust
impl<E> From<nom::Err<E>> for ParsideError {
    // All nom errors → StreamDeserializationError(ErrorKind::IsNot)
}

impl From<anyhow::Error> for ParsideError {
    // anyhow errors → Common(err.to_string())
}
```

Note: cesride errors propagate through anyhow → `Common`, or through nom → `StreamDeserializationError`. The specific cesride error detail is preserved in `Common` but lost in the nom path.

## Error Handling Patterns

### Guard against empty input
```rust
if bytes.is_empty() {
    return Err(ParsideError::EmptyBytesStream);
}
```

### Safe variant access
```rust
// Don't do this:
let payload = msg.payload()?;  // panics if Group

// Do this:
match msg {
    Message::Custom { value } => { /* use value */ },
    Message::Group { value } => { /* use value */ },
}
```

### Handling parse remainder
```rust
let (rest, list) = MessageList::from_stream_bytes(bytes)?;
if !rest.is_empty() {
    // rest contains unparsable trailing bytes
    // This is normal — not an error condition
    // Could be partial message, non-CESR data, etc.
}
```
