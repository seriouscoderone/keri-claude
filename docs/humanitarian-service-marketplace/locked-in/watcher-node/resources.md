# locked-in-watcher — Infrastructure Resources

> Stack type: `watcher-node` | System: `locked-in` | Ecosystem: `humanitarian-service-marketplace`
> Environment: `dev` | Region: `us-west-2`

## Architecture

```
API Gateway WebSocket (real-time event streaming)
    |
Lambda (stateless KEL validation, duplicity detection)
    |
DynamoDB (KEL + first-seen tracking, conditional writes for atomicity)
    |
SNS (duplicity alerts, multi-protocol delivery)
```

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| WatcherWebSocketAPI | AWS::ApiGatewayV2::Api | WebSocket API for real-time event streaming |
| WatcherFunction | AWS::Lambda::Function | Stateless KEL validation and duplicity detection |
| WatcherKELTable | AWS::DynamoDB::Table | KEL storage — watched AID event logs |
| WatcherFirstSeenTable | AWS::DynamoDB::Table | First-seen tracking — conditional writes for atomicity |
| WatcherDuplicityTable | AWS::DynamoDB::Table | Duplicity evidence — conflicting events for same AID+sn |
| WatcherAlertTopic | AWS::SNS::Topic | Duplicity alert notifications |

## First-Seen Atomicity

DynamoDB conditional writes provide atomic first-seen semantics without a relational database:

1. On receiving an event, `PutItem` to WatcherFirstSeenTable with condition `attribute_not_exists(event_said)`
2. If the write **succeeds** — this is the first time we've seen this event. Record it in WatcherKELTable.
3. If the write **fails** (`ConditionalCheckFailedException`) — a duplicate was detected. Compare the new event against the stored one. If they differ for the same AID+sn, record duplicity evidence and fire an SNS alert.

This is simpler, cheaper, and lower-latency than Aurora Serverless for this access pattern.

## Networking

- **VPC:** default
- **Subnets:** private (Lambda)
- **Security Groups:** WatcherLambdaSG (outbound to DynamoDB via VPC endpoints)
- **Load Balancer:** none (API Gateway handles routing)

## Monitoring

### Dashboards
- locked-in-watcher-operations

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| LambdaErrors | Errors | > 0 (5min) | CloudWatch only |
| DuplicityDetected | Custom/DuplicityCount | > 0 | CloudWatch only |
| DynamoDBThrottling | ThrottledRequests | > 0 | CloudWatch only |

### Log Groups
- /aws/lambda/locked-in-watcher

## Outputs

| Name | Value | Description |
|---|---|---|
| WatcherApiUrl | wss://{API}.execute-api.us-west-2.amazonaws.com/prod | WebSocket API URL |
| AlertTopicArn | {WatcherAlertTopic.Arn} | SNS topic for duplicity alerts |

## Cost Estimation Notes

- **Compute:** Lambda ~$5-15/month (pay per invocation)
- **Database:** DynamoDB PAY_PER_REQUEST x3 tables ~$5-20/month (scales with traffic)
- **Networking:** API Gateway WebSocket ~$1-5/month
- **Storage:** DynamoDB storage ~$1-5/month
- **Total estimated monthly (dev):** $15-$30
- **Total estimated monthly (prod):** $80-$200
