# Service Design: {display_name}

**Ecosystem:** {ecosystem.name}
**Service Pattern:** {service.pattern}
**Version:** {version}

---

## Value Proposition

{service.value_proposition}

> Write 2-3 sentences expanding on the value proposition. Explain why this matters
> to the target audience in plain language. No KERI terminology.

---

## User Journeys

### Journey: {journey.name}

**Actor:** {journey.actor}

{Write a 2-3 sentence narrative describing this journey from the actor's perspective.
What problem are they solving? What does the experience feel like?}

| Step | Action | KERI Operation |
|------|--------|----------------|
| 1 | {step.action} | {step.keri_operation} |
| 2 | ... | ... |

**KERI operations involved:** List the unique KERI operations from the steps above.

> Repeat this section for each user journey (target 3-5 journeys).

---

## KERI Infrastructure Requirements

| Component | Needed | Justification |
|-----------|--------|---------------|
| Agent Service (KERIA) | Yes/No | Why this service needs (or does not need) an agent |
| Witness Pool | Yes/No | Why witnessing is required (or not) |
| Watcher Network | Yes/No | Why duplicity detection is required (or not) |
| ACDC Registry + TEL | Yes/No | Why credential issuance/revocation is required (or not) |
| Judge/Jury Service | Yes/No | Why evidence aggregation is required (or not) |
| Frontend (Web/Mobile) | Yes/No | Why a user-facing interface is required (or not) |

**Credentials handled:**
- {credential_id} — {brief description of what this credential represents}

---

## Business Model

**Type:** {business_model.type}

{business_model.pricing_notes}

> Expand with 2-3 sentences on revenue model, target customer segments,
> and pricing rationale.

---

## SLA Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Availability | {sla.availability} | |
| Latency (p99) | {sla.latency_p99} | |
| Throughput | {sla.throughput} | |
| Recovery Time | {sla.recovery_time} | |

> Add context on which operations are latency-sensitive vs. batch-tolerant.

---

## Integration Points

| Integration | Type | Direction | Description |
|-------------|------|-----------|-------------|
| {name} | {type} | {direction} | {description} |

> For each integration, note whether it is a hard dependency (service fails without it)
> or a soft dependency (degraded experience without it).

---

## Next Steps

This service design defines **what** the service does and **why**.
To define **how** it is deployed, run:

```
/keri-c2-service-infrastructure
```

This will read the `system.yaml` produced here and generate infrastructure
stacks (CloudFormation/CDK) for each required KERI component.
