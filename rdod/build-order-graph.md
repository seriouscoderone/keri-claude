# Feature Request: Generate build-order dependency graph from domain spec

## Summary

Add a command to generate a topologically sorted build-order from the domain graph — showing which domains to implement first based on their dependency relationships. Output as both a text list and a mermaid diagram.

## Problem

The domain spec defines dependencies via `adjacents`, `kernels`, `subdomains`, and `domain_clients`, but nowhere does it say "implement cesr first, then identity, then accountability." An AI building from this spec must topologically sort the graph manually. A human architect must trace relationships across 47 domain.yaml files to determine where to start.

## Proposed Solution

### CLI command

```bash
python scripts/build_order.py rdod/spec/domains/
```

### Output (text)

```
Build Order (47 domains, 5 layers):

Layer 0 (kernels — no dependencies):
  cesr/primitives
  cesr/composition
  keri-messaging

Layer 1 (foundation — depends only on kernels):
  cesr
  identity/establishment
  identity/key-commitment
  identity/state
  identity/anchoring
  identity/thresholds
  identity

Layer 2 (protocol — depends on foundation):
  delegation/authorization
  delegation/lifecycle
  delegation/recovery
  delegation
  accountability/receipting
  accountability/consensus
  accountability/dissemination
  accountability
  integrity/detection
  integrity/evidence
  integrity/recovery
  integrity
  discovery

Layer 3 (credentials — depends on protocol):
  credential-lifecycle/status
  credential-lifecycle/verification
  credential-lifecycle/registry
  credential-lifecycle
  credential-exchange/negotiation
  credential-exchange/proof
  credential-exchange
  privacy/disclosure
  privacy/blinding
  privacy/aggregation
  privacy

Layer 4 (services + applications — depends on all above):
  cloud-agent-service/api
  cloud-agent-service/provisioning
  cloud-agent-service/processing
  cloud-agent-service
  witness-service/api
  witness-service
  watcher-service/api
  watcher-service
  signify-client/key-management
  signify-client/resources
  signify-client
  local-agent/api
  local-agent
```

### Output (mermaid)

```bash
python scripts/build_order.py rdod/spec/domains/ --mermaid
```

Generates a mermaid diagram showing the layers and dependencies.

### Algorithm

1. Parse all domain.yaml files
2. Build directed dependency graph from:
   - `kernels:` → this domain depends on kernel
   - `adjacents:` with `pattern: "Conformist"` → this domain depends on adjacent
   - `adjacents:` with `pattern: "Customer-Supplier"` → this domain depends on supplier
   - `adjacents:` with `pattern: "Partnership"` → mutual dependency (same layer)
   - `subdomains:` → parent depends on children (children build first)
3. Topological sort with layer assignment
4. Group by layer, label each layer

### Edge cases

- **Cycles from Partnership**: Two domains with Partnership pattern are co-dependent — assign to the same layer
- **Kernels always layer 0**: Domains referenced via `kernel://` are always in the first layer
- **Subdomains before parents**: Children must build before parents that compose them

## Integration

- **README**: Include the text output in the README's domain map section
- **Context map**: The layer information could color-code nodes in the context map visualization
- **CI**: Run on PR to detect accidental cycles (circular dependencies)

## Acceptance Criteria

- [ ] Script reads domain.yaml files and generates topological sort
- [ ] Output grouped by build layer with clear labels
- [ ] Handles cycles from Partnership adjacents (same-layer grouping)
- [ ] Kernels always appear in layer 0
- [ ] Subdomains appear before their parents
- [ ] `--mermaid` flag generates mermaid diagram
- [ ] Zero dependencies — uses only Python stdlib + PyYAML
