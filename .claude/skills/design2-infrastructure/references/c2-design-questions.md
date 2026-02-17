# C2 Design Questions

C2 is intentionally thin. Most decisions are already made at C0 (governance) and C1 (service definition). Only 4 questions remain at the infrastructure level.

## Question 1: Environment

> What environment is this stack for?

| Answer | Maps to in stack.yaml | Effect |
|---|---|---|
| **prod** | `parameters.environment: prod` | Multi-AZ, auto-scaling, backup retention 30d, alarms → PagerDuty |
| **staging** | `parameters.environment: staging` | Single-AZ, fixed capacity, backup 7d, alarms → Slack |
| **dev** | `parameters.environment: dev` | Minimal capacity, no backups, alarms → CloudWatch only |

**Default:** `dev`

## Question 2: AWS Region

> Which AWS region should this deploy to?

| Answer | Maps to | Effect |
|---|---|---|
| Region code | `parameters.region` | All resources created in this region |

**Default:** `us-east-1`

Consider: data residency requirements, latency to users, service availability for DynamoDB global tables / Aurora Serverless / Step Functions.

## Question 3: Custom Domain

> Do you need a custom domain name?

Applies to: `frontend`, `agent-service`, `witness-pool`

| Answer | Maps to | Effect |
|---|---|---|
| Domain name | `parameters.domain_name` | Route53 hosted zone + ACM certificate + ALB/CloudFront alias |
| No | (omitted) | Use default AWS-assigned URLs (ALB DNS, CloudFront distribution) |

**Default:** No custom domain (use AWS defaults).

## Question 4: Security Requirements

> Any additional security or compliance requirements?

| Answer | Maps to | Effect |
|---|---|---|
| **HIPAA** | Encryption at rest + transit, audit logging, VPC isolation, no public subnets | Adds KMS, CloudTrail, VPC endpoints |
| **SOC2** | All HIPAA + access logging, change management | Adds Config rules, GuardDuty |
| **FedRAMP** | All SOC2 + GovCloud region | Forces `us-gov-west-1` region |
| **None** | Standard security (encryption at rest, SG least-privilege) | Default security posture |

**Default:** None (standard security).
