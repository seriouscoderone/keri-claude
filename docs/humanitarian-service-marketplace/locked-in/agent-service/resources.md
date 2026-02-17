# locked-in-agent — Infrastructure Resources

> Stack type: `agent-service` | System: `locked-in` | Ecosystem: `humanitarian-service-marketplace`
> Environment: `dev` | Region: `us-west-2`

## Architecture

```
API Gateway REST (agent API — AID management, credential ops, KERI messages)
    |
Lambda (Rust — stateless agent logic, <50ms cold starts)
    |
+------------------+--------------------+
|                  |                    |
DynamoDB          Secrets Manager     SQS
(agent state,     (key material,      (async processing:
 KEL,              encrypted via       ACDC issuance,
 ACDC wallet,      KMS)               delegation,
 tenant index)                         receipt collection)
    |
EventBridge (agent lifecycle events)
```

> **NOTE:** This is NOT KERIA. This is a ground-up serverless KERI agent
> implemented in Rust, running on Lambda with DynamoDB persistence.
> KERIA/keripy use LMDB and HIO which require persistent processes.
> This stack scales to zero.

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| AgentAPI | AWS::ApiGateway::RestApi | REST API for agent operations — replaces KERIA's 3-port model |
| AgentFunction | AWS::Lambda::Function | Rust Lambda — stateless KERI agent logic |
| AgentAsyncFunction | AWS::Lambda::Function | Rust Lambda — SQS consumer for delegation, receipts |
| AgentStateTable | AWS::DynamoDB::Table | Agent state — tenant index, AID metadata, configuration |
| AgentKELTable | AWS::DynamoDB::Table | KEL storage — per-tenant event logs |
| AgentWalletTable | AWS::DynamoDB::Table | Credential wallet — ACDC storage per tenant |
| AgentKeySecret | AWS::SecretsManager::Secret | Agent key material template (per-tenant secrets at provisioning) |
| AgentKMSKey | AWS::KMS::Key | Envelope encryption for key material |
| AgentAsyncQueue | AWS::SQS::Queue | Async processing for ACDC issuance, delegation, receipts |
| AgentDLQ | AWS::SQS::Queue | Dead letter queue for failed async operations |
| AgentEventBus | AWS::Events::EventBus | Agent lifecycle events (provisioning, key rotation, credential ops) |

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | /boot | Agent provisioning (replaces KERIA port 3903) |
| POST | /agent/{aid}/events | Submit KERI events (replaces KERIA port 3901) |
| GET | /agent/{aid}/kel | Query KEL |
| POST | /agent/{aid}/credentials | ACDC operations |
| GET | /agent/{aid}/credentials | List credentials |
| POST | /agent/{aid}/oobi | OOBI resolution |
| POST | /messages | Receive external KERI messages (replaces KERIA port 3902) |

## DynamoDB Table Design

### AgentStateTable
- **Hash key:** `tenant_id` (S)
- **Range key:** `resource_type` (S) — "agent" | "config" | "oobi"
- **GSI:** AIDIndex — hash on `aid_prefix` for cross-tenant lookups

### AgentKELTable
- **Hash key:** `prefix` (S) — AID prefix
- **Range key:** `sn` (N) — sequence number
- **GSI:** SAIDIndex — hash on `said` for event lookups

### AgentWalletTable
- **Hash key:** `tenant_id` (S)
- **Range key:** `acdc_said` (S) — ACDC SAID
- **GSI:** SchemaIndex — hash on `schema_said`, range on `issued_at`

## Networking

- **VPC:** default
- **Subnets:** private (Lambda)
- **Security Groups:** AgentLambdaSG (outbound to DynamoDB + Secrets Manager via VPC endpoints)
- **Load Balancer:** none (API Gateway handles routing)

## Monitoring

### Dashboards
- locked-in-agent-operations

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| LambdaErrors | Errors | > 0 (5min) | CloudWatch only |
| APILatency | Latency (API Gateway) | > 500ms (p99) | CloudWatch only |
| DLQMessages | ApproximateNumberOfMessagesVisible (DLQ) | > 0 | CloudWatch only |
| DynamoDBThrottling | ThrottledRequests | > 0 | CloudWatch only |

### Log Groups
- /aws/lambda/locked-in-agent
- /aws/lambda/locked-in-agent-async
- /aws/apigateway/locked-in-agent

## Outputs

| Name | Value | Description |
|---|---|---|
| AgentApiUrl | https://{AgentAPI}.execute-api.us-west-2.amazonaws.com/prod | Agent REST API URL |
| BootUrl | https://{AgentAPI}.execute-api.us-west-2.amazonaws.com/prod/boot | Agent provisioning URL |
| EventBusArn | {AgentEventBus.Arn} | EventBridge bus for agent lifecycle events |

## Cost Estimation Notes

- **Compute:** Lambda ~$5-15/month (pay per invocation, scales to zero)
- **Database:** DynamoDB PAY_PER_REQUEST x3 tables ~$5-20/month (scales with traffic)
- **Secrets:** Secrets Manager + KMS ~$5/month
- **Networking:** API Gateway ~$1-5/month
- **Async:** SQS negligible
- **Total estimated monthly (dev):** $20-$40
- **Total estimated monthly (prod):** $100-$250
