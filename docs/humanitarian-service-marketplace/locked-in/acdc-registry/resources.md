# locked-in-acdc-registry — Infrastructure Resources

> Stack type: `acdc-registry` | System: `locked-in` | Ecosystem: `humanitarian-service-marketplace`
> Environment: `dev` | Region: `us-west-2`

## Architecture

```
API Gateway REST (ACDC issuance, revocation, verification)
    |
Lambda (ACDC operations: schema validation, TEL events, sig verification)
    |
+-------------+-----------------+
|             |                 |
DynamoDB     S3               EventBridge
(ACDC +      (immutable       (issuance/revocation
 TEL,         ACDC docs,       notifications)
 SAID-        versioned)
 indexed)
```

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| RegistryAPI | AWS::ApiGateway::RestApi | REST API for ACDC lifecycle operations |
| RegistryFunction | AWS::Lambda::Function | ACDC operations — schema validation, TEL events, sig verification |
| ACDCTable | AWS::DynamoDB::Table | ACDC storage indexed by SAID |
| TELTable | AWS::DynamoDB::Table | Transaction Event Log — issuance/revocation state |
| ACDCDocumentBucket | AWS::S3::Bucket | Immutable ACDC document storage |
| RegistryEventBus | AWS::Events::EventBus | ACDC lifecycle event notifications |

## Networking

- **VPC:** default
- **Subnets:** private (Lambda)
- **Security Groups:** RegistryLambdaSG (outbound to DynamoDB + S3 via VPC endpoints)
- **Load Balancer:** none (API Gateway handles routing)

## Monitoring

### Dashboards
- locked-in-acdc-registry-operations

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| LambdaErrors | Errors | > 0 (5min) | CloudWatch only |
| APILatency | Latency (API Gateway) | > 1s (p99) | CloudWatch only |
| DynamoDBThrottling | ThrottledRequests | > 0 | CloudWatch only |

### Log Groups
- /aws/lambda/locked-in-acdc-registry
- /aws/apigateway/locked-in-acdc-registry

## Outputs

| Name | Value | Description |
|---|---|---|
| RegistryApiUrl | https://{API}.execute-api.us-west-2.amazonaws.com/prod | REST API for ACDC operations |
| EventBusArn | {RegistryEventBus.Arn} | EventBridge bus for issuance/revocation notifications |

## Cost Estimation Notes

- **Compute:** Lambda ~$5-10/month (pay per invocation)
- **Database:** DynamoDB PAY_PER_REQUEST ~$5-15/month (scales with credential volume)
- **Networking:** API Gateway REST ~$3-10/month
- **Storage:** S3 ~$1-5/month, DynamoDB ~$1-5/month
- **Total estimated monthly (dev):** $15-$40
- **Total estimated monthly (prod):** $100-$250
