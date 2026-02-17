# locked-in-witness-pool — Infrastructure Resources

> Stack type: `witness-pool` | System: `locked-in` | Ecosystem: `humanitarian-service-marketplace`
> Environment: `dev` | Region: `us-west-2`

## Architecture

```
API Gateway REST (witness API — event submission, receipt queries, OOBI)
    |
Lambda (Rust — stateless witness logic, receipt generation)
    |
DynamoDB (KEL storage + receipt storage, PAY_PER_REQUEST)
    |
EventBridge (receipt notifications)
```

> **NOTE:** Serverless witness — Rust Lambda + DynamoDB.
> No Fargate, no ALB. Scales to zero.

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| WitnessAPI | AWS::ApiGateway::RestApi | REST API for witness operations |
| WitnessFunction | AWS::Lambda::Function | Rust Lambda — stateless witness logic, receipt generation |
| WitnessKELTable | AWS::DynamoDB::Table | Append-only KEL storage for presence events |
| WitnessReceiptTable | AWS::DynamoDB::Table | Receipt storage indexed by event SAID |
| WitnessEventBus | AWS::Events::EventBus | Receipt notification events |

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | /events | Submit event for receipting |
| GET | /events/{said} | Query event by SAID |
| GET | /receipts/{said} | Query receipts for event |
| GET | /oobi/{aid} | OOBI endpoint for witness discovery |
| GET | /health | Health check |

## DynamoDB Table Design

### WitnessKELTable
- **Hash key:** `prefix` (S) — AID prefix
- **Range key:** `sn` (N) — sequence number
- **GSI:** SAIDIndex — hash on `said` for event receipt lookups

### WitnessReceiptTable
- **Hash key:** `event_said` (S) — receipted event SAID
- **Range key:** `witness_aid` (S) — witness AID

## Networking

- **VPC:** default
- **Subnets:** private (Lambda)
- **Security Groups:** WitnessLambdaSG (outbound to DynamoDB via VPC endpoints)
- **Load Balancer:** none (API Gateway handles routing)

## Monitoring

### Dashboards
- locked-in-witness-pool-operations

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| LambdaErrors | Errors | > 0 (5min) | CloudWatch only |
| APILatency | Latency (API Gateway) | > 200ms (p99) | CloudWatch only |
| DynamoDBThrottling | ThrottledRequests | > 0 | CloudWatch only |

### Log Groups
- /aws/lambda/locked-in-witness
- /aws/apigateway/locked-in-witness

## Outputs

| Name | Value | Description |
|---|---|---|
| WitnessOOBIUrl | https://{WitnessAPI}.execute-api.us-west-2.amazonaws.com/prod/oobi/{witness_aid_prefix} | Witness OOBI URL for controller discovery |
| WitnessApiUrl | https://{WitnessAPI}.execute-api.us-west-2.amazonaws.com/prod | Witness REST API URL |
| EventBusArn | {WitnessEventBus.Arn} | EventBridge bus for receipt notifications |

## Cost Estimation Notes

- **Compute:** Lambda ~$3-10/month (pay per invocation, scales to zero)
- **Database:** DynamoDB PAY_PER_REQUEST x2 tables ~$3-10/month (scales with traffic)
- **Networking:** API Gateway ~$1-5/month
- **Storage:** DynamoDB storage ~$1-5/month
- **Total estimated monthly (dev):** $10-$25
- **Total estimated monthly (prod):** $50-$150
