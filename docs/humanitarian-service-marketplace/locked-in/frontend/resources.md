# locked-in-frontend — Infrastructure Resources

> Stack type: `frontend` | System: `locked-in` | Ecosystem: `humanitarian-service-marketplace`
> Environment: `dev` | Region: `us-west-2`

## Architecture

```
CloudFront (CDN, HTTPS, caching, SPA routing)
    |
S3 (static site files, private — OAC access only)
```

## Resource Inventory

| Logical Name | AWS Type | Purpose |
|---|---|---|
| FrontendBucket | AWS::S3::Bucket | Static site file storage (HTML, JS, CSS, assets) |
| FrontendCDN | AWS::CloudFront::Distribution | CDN with HTTPS, SPA routing, caching |
| FrontendOAC | AWS::CloudFront::OriginAccessControl | Secure S3 access from CloudFront only |

## Networking

- **VPC:** none (static hosting)
- **Subnets:** none
- **Security Groups:** none
- **Load Balancer:** none

## Monitoring

### Dashboards
- locked-in-frontend-cdn

### Alarms
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| High4xxRate | 4xxErrorRate (CloudFront) | > 5% | CloudWatch only |
| High5xxRate | 5xxErrorRate (CloudFront) | > 1% | CloudWatch only |

### Log Groups
- /aws/cloudfront/locked-in-frontend

## Outputs

| Name | Value | Description |
|---|---|---|
| SiteUrl | https://{FrontendCDN.DomainName} | Website URL |
| CloudFrontDistributionId | {FrontendCDN.Id} | Distribution ID for cache invalidation |
| DeployBucketName | {FrontendBucket.Name} | S3 bucket for deploying site files |

## Cost Estimation Notes

- **Compute:** none (static hosting)
- **Database:** none
- **Networking:** CloudFront free tier covers 1TB/month + 10M requests
- **Storage:** S3 ~$1/month
- **Total estimated monthly (dev):** $1-$5
- **Total estimated monthly (prod):** $10-$50
