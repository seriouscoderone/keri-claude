# Components — {stack.name}

> Domain components for the **{stack.type}** stack in the **{system.display_name}** service ({ecosystem.display_name}).

## Domain Overview

This stack implements the **{stack.type}** deployment pattern within the **{system.display_name}** service. It belongs to the **{ecosystem.display_name}** ecosystem and provides {brief purpose from stack context}.

**Runtime:** {runtime_recommendation.language} / {runtime_recommendation.library}
**Rationale:** {runtime_recommendation.rationale}

---

## Component Inventory

| Name | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| {component.name} | {component.type} | {component.purpose} | {component.dependencies} |

---

## Component Details

### {component.name}

**Type:** {component.type}
**Purpose:** {component.purpose}

#### Operations

| Operation | Inputs | Outputs | Description |
|-----------|--------|---------|-------------|
| {op.name} | {op.inputs} | {op.outputs} | {op.description} |

#### State Management

| State | Storage Mapping | Description |
|-------|----------------|-------------|
| {state.name} | {state.storage_mapping} (from stack.yaml) | {state.description} |

#### Invariants

These protocol rules MUST be enforced by this component. Invariant violations indicate implementation bugs or protocol attacks.

- {invariant rule}

#### Failure Modes

| Condition | Impact | Recovery |
|-----------|--------|----------|
| {fm.condition} | {fm.impact} | {fm.recovery} |

#### Observability

**Metrics:**
- {metric name and description}

**Logs:**
- {log event and what triggers it}

**Traces:**
- {span name and what it covers}

---

*Repeat "Component Details" section for each component in the domain.*

---

## Component Interaction Diagram

```
{component A} --[operation call]--> {component B}
{component B} --[state read]------> {AWS resource from stack.yaml}
```

Describe the primary interaction flows between components. Show which component initiates, which responds, and what data flows between them.

---

## Cross-Cutting Concerns

### Error Propagation
How errors in one component affect others. Which failures are recoverable vs. fatal.

### State Consistency
How components maintain consistent state across shared storage resources.

### Security Boundaries
Which components handle sensitive material (keys, signatures) and how they isolate it.
