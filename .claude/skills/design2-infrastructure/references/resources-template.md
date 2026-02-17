# {stack.name} — Infrastructure Resources

> Stack type: `{stack.type}` | System: `{stack.system}` | Ecosystem: `{stack.ecosystem}`
> Environment: `{parameters.environment}` | Region: `{parameters.region}`

## Architecture

```
{ASCII diagram — copy from the matching template in references/templates/}
```

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| {resource.logical_name} | {resource.type} | {resource.purpose} |

## Networking

- **VPC:** {networking.vpc}
- **Subnets:** {networking.subnets}
- **Security Groups:** {networking.security_groups}
- **Load Balancer:** {networking.load_balancer}

## Monitoring

### Dashboards
{monitoring.dashboards — bulleted list}

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| {alarm.name} | {alarm.metric} | {alarm.threshold} | {alarm.action} |

### Log Groups
{monitoring.log_groups — bulleted list}

## Outputs

| Name | Value | Description |
|---|---|---|
| {output.name} | {output.value} | {output.description} |

## Cost Estimation Notes

- **Compute:** {estimate based on stack type — Fargate vCPU-hours, Lambda invocations, etc.}
- **Database:** {estimate — DynamoDB WCU/RCU, Aurora ACU-hours, etc.}
- **Networking:** {estimate — ALB hours, data transfer, CloudFront requests}
- **Storage:** {estimate — S3 GB, DynamoDB GB, RDS storage}
- **Total estimated monthly (dev):** ${low}-${high}
- **Total estimated monthly (prod):** ${low}-${high}
