# Feature Request: Validate port_ref fields in verification.yaml contracts

## Summary

The linter validates `via_port` references in domain.yaml relationship entries but does NOT validate `port_ref` fields in verification.yaml contract sections. Phantom ports in verification contracts go undetected.

## Problem

verification.yaml has a `contracts:` section where each contract references a port:

```yaml
contracts:
  - port_ref: "port://identity/establishment/inbound/event-processing"
    preconditions: [...]
    postconditions: [...]
```

If `event-processing` was renamed to `validate-event` in ports.yaml, the verification contract silently references a non-existent port. An implementer following the contract hits a dead end — the port doesn't exist.

The linter catches this for domain.yaml `via_port` fields but not for verification.yaml `port_ref` fields.

## Concrete Incident

7 phantom ports found across a 47-domain KERI spec — all in verification.yaml contract `port_ref` fields that referenced renamed ports:

| Phantom | Actual Port | File |
|---|---|---|
| `event-processing` | `validate-event` | identity/establishment/verification.yaml |
| `receipt-processing` | `receipt-lifecycle` | accountability/receipting/verification.yaml |
| `tel-event-processing` | `state-query` | credential-lifecycle/status/verification.yaml |
| `exchange-processing` | `negotiate` | credential-exchange/negotiation/verification.yaml |
| `oobi-resolution` | `discovery` | discovery/verification.yaml |
| `endpoint-authorization` | `discovery` | discovery/verification.yaml |
| `network-transport` | `witness-comms` | local-agent/domain.yaml |

All were manually discovered by an external AI audit, not by the linter.

## Proposed Fix

Extend the existing port resolution check to also scan verification.yaml `port_ref` fields:

```python
# In check_ref_resolution or a new check_verification_port_refs:
for sid, spec in specs.items():
    verif_data = load_yaml(str(Path(spec.dir) / "verification.yaml"))
    if not verif_data:
        continue
    for contract in verif_data.get("contracts", []):
        port_ref = contract.get("port_ref", "")
        if not port_ref:
            continue
        # Same resolution logic as via_port
        port_domain_id = strip_prefix(port_ref.split("/inbound/")[0].split("/outbound/")[0])
        if port_domain_id in specs:
            target_ports = specs[port_domain_id].port_ids
            if target_ports and port_ref not in target_ports:
                result.warn("port-resolution", sid,
                    f"verification contract port_ref '{port_ref}' "
                    f"not found in {port_domain_id}/ports.yaml")
```

## Acceptance Criteria

- [ ] Linter validates `port_ref` in verification.yaml contracts against ports.yaml
- [ ] Same resolution logic as existing `via_port` check
- [ ] All 7 phantom ports from the incident would have been caught
- [ ] No false positives for valid port_ref references
