# Feature Request: Group context map sidebar by architecture layer

## Summary

Group the context map sidebar into architecture layers (Kernels, Domains, Services, Applications) so adopters can instantly see the system's hierarchy without reading relationship declarations.

## Current Behavior

The sidebar lists all domains alphabetically — a flat list. An adopter scanning 47 domains sees no distinction between a kernel (cesr), a buildable domain (identity), a deployed service (witness-service), or an edge client (signify-client).

## Proposed Behavior

Group the sidebar by architecture layer:

```
KERNELS
  cesr/
  keri-messaging/

DOMAINS
  identity/
  delegation/
  accountability/
  integrity/
  credential-lifecycle/
  credential-exchange/
  privacy/
  discovery/

SERVICES
  cloud-agent-service/
  witness-service/
  watcher-service/

APPLICATIONS
  signify-client/
  local-agent/
```

## Implementation

The grouping can be derived from existing `domain.yaml` fields — no new schema needed:

1. **`implementation_guidance.suggested_type`** — already has values: `module`, `package`, `service`, `app`
2. **`kernels:` self-reference** — if a domain is referenced via `kernel://` by other domains, it's a kernel
3. **Fallback heuristic** — domains with `suggested_type: service` → Services group, `suggested_type: app` → Applications group, domains referenced as `kernel://` → Kernels group, everything else → Domains group

Alternatively, a new optional field `layer:` in domain.yaml:

```yaml
layer: "kernel"  # kernel | domain | service | application
```

But `suggested_type` already captures this — mapping is straightforward:
- `module` / `package` → Domains
- `service` → Services
- `app` → Applications
- Referenced as `kernel://` → Kernels

## Subdomains

Child domains should nest under their parent within the group:

```
DOMAINS
  identity/
    establishment/
    key-commitment/
    thresholds/
    state/
    anchoring/
  delegation/
    authorization/
    lifecycle/
    recovery/
  ...
```

This is already how the sidebar works for navigation — just add the group headers.

## Acceptance Criteria

- [ ] Sidebar groups domains by architecture layer
- [ ] Group headers are visually distinct (bold, separator, or collapsible)
- [ ] Grouping derived from existing domain.yaml fields (no new schema required)
- [ ] Subdomains nest under parents within their group
- [ ] Clicking a domain still navigates to it (existing behavior preserved)
- [ ] Group order: Kernels → Domains → Services → Applications (top to bottom)
