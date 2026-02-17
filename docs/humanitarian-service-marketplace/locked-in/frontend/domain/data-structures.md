# Data Structures — locked-in-frontend

> KERI protocol data structures used by the **frontend** stack.

## Data Structure Catalog

*No domain-level data structures defined.* The frontend uses signify-ts library types for all KERI operations.

---

## signify-ts Library Types

The following types are provided by signify-ts and used by the frontend. They are not defined at the C3 domain level — they are implementation details of the signify-ts library.

| signify-ts Type | Purpose | C3 Equivalent |
|----------------|---------|---------------|
| `SignifyClient` | Client connection to agent-service | — |
| `Identifier` | AID lifecycle management | Managed by agent-keri-service |
| `Credential` | ACDC operations | Managed by registry-acdc-tel-manager |
| `Operation` | Async operation tracking | Managed by AgentAsyncQueue |

For detailed signify-ts API reference, use the `/signify-ts-skill` skill.

---

## Notes

The frontend consumes KERI protocol messages (events, receipts, credentials) but does not define its own data structures. All protocol-level data structures are defined in the server-side domain specifications:

- **Key events:** See witness-pool domain data structures
- **ACDCs:** See acdc-registry domain data structures
- **Receipts:** See witness-pool domain data structures
- **OOBIs:** See agent-service domain data structures
