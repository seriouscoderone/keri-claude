import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apiIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

export interface ChatStackProps extends cdk.StackProps {
  allowedIpCidrs?: string;
  hostedZoneId?: string;
  hostedZoneDomainName?: string;
  chatSubdomain?: string;
}

export class ChatStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChatStackProps) {
    super(scope, id, props);

    const allowedIpCidrs = props.allowedIpCidrs ?? '0.0.0.0/0';
    const hostedZoneId = props.hostedZoneId;
    const hostedZoneDomainName = props.hostedZoneDomainName;
    const chatSubdomain = props.chatSubdomain ?? 'chat';

    // -----------------------------------------------------------------
    // CfnParameters (for Launch Stack UI / documentation)
    // -----------------------------------------------------------------

    new cdk.CfnParameter(this, 'AllowedIpCidrs', {
      type: 'String',
      default: '0.0.0.0/0',
      description:
        'Comma-separated CIDR list for IP whitelist (build-time setting, requires redeploy via CDK to change)',
    });

    new cdk.CfnParameter(this, 'HostedZoneId', {
      type: 'String',
      default: '',
      description: 'Route53 Hosted Zone ID (leave empty to skip DNS)',
    });

    new cdk.CfnParameter(this, 'HostedZoneDomainName', {
      type: 'String',
      default: '',
      description: 'Base domain (e.g. keri.host)',
    });

    new cdk.CfnParameter(this, 'ChatSubdomain', {
      type: 'String',
      default: 'chat',
      description: 'Subdomain prefix',
    });

    const apiThrottleRateLimit = new cdk.CfnParameter(this, 'ApiThrottleRateLimit', {
      type: 'Number',
      default: 0,
      description: 'API Gateway sustained requests/sec (0=unrestricted)',
    });

    const apiThrottleBurstLimit = new cdk.CfnParameter(this, 'ApiThrottleBurstLimit', {
      type: 'Number',
      default: 0,
      description: 'API Gateway burst requests (0=unrestricted)',
    });

    const lambdaConcurrencyLimit = new cdk.CfnParameter(this, 'LambdaConcurrencyLimit', {
      type: 'Number',
      default: 0,
      description: 'Lambda reserved concurrency (0=unreserved)',
    });

    const billingAlarmThreshold = new cdk.CfnParameter(this, 'BillingAlarmThreshold', {
      type: 'Number',
      default: 0,
      description: 'CloudWatch billing alarm USD threshold (0=no alarm)',
    });

    // -----------------------------------------------------------------
    // Chat Lambda
    // -----------------------------------------------------------------

    const modelArn = `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0`;

    const chatFn = new lambda.NodejsFunction(this, 'ChatHandler', {
      entry: path.join(__dirname, '../../lambda/chat-handler/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: {
        KNOWLEDGE_BASE_ID: '{{resolve:ssm:/keri-rag/knowledge-base-id}}',
        MODEL_ARN: modelArn,
        REFORMULATION_MODEL_ARN: `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    chatFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:RetrieveAndGenerate',
          'bedrock:Retrieve',
          'bedrock:InvokeModel',
          'bedrock:Converse',
          'bedrock:GetInferenceProfile',
        ],
        resources: ['*'],
      }),
    );

    // Bedrock auto-enables serverless models via Marketplace subscriptions
    chatFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aws-marketplace:ViewSubscriptions',
          'aws-marketplace:Subscribe',
        ],
        resources: ['*'],
      }),
    );

    // Conditional reserved concurrency via L1 override
    const hasConcurrencyLimit = new cdk.CfnCondition(this, 'HasConcurrencyLimit', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(lambdaConcurrencyLimit.valueAsNumber, 0),
      ),
    });

    const cfnChatFn = chatFn.node.defaultChild as lambdaBase.CfnFunction;
    cfnChatFn.addPropertyOverride(
      'ReservedConcurrentExecutions',
      cdk.Fn.conditionIf(
        hasConcurrencyLimit.logicalId,
        lambdaConcurrencyLimit.valueAsNumber,
        cdk.Aws.NO_VALUE,
      ),
    );

    // -----------------------------------------------------------------
    // API Gateway HTTP API
    // -----------------------------------------------------------------

    const httpApi = new apigatewayv2.HttpApi(this, 'ChatApi', {
      apiName: 'keri-chat-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    httpApi.addRoutes({
      path: '/api/chat',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apiIntegrations.HttpLambdaIntegration('ChatIntegration', chatFn),
    });

    // Conditional throttle via L1 override on the $default stage
    const hasThrottle = new cdk.CfnCondition(this, 'HasThrottle', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(apiThrottleRateLimit.valueAsNumber, 0),
      ),
    });

    const defaultStage = httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (defaultStage) {
      defaultStage.addPropertyOverride(
        'DefaultRouteSettings.ThrottlingRateLimit',
        cdk.Fn.conditionIf(
          hasThrottle.logicalId,
          apiThrottleRateLimit.valueAsNumber,
          cdk.Aws.NO_VALUE,
        ),
      );
      defaultStage.addPropertyOverride(
        'DefaultRouteSettings.ThrottlingBurstLimit',
        cdk.Fn.conditionIf(
          hasThrottle.logicalId,
          apiThrottleBurstLimit.valueAsNumber,
          cdk.Aws.NO_VALUE,
        ),
      );
    }

    // -----------------------------------------------------------------
    // Frontend S3 Bucket
    // -----------------------------------------------------------------

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // -----------------------------------------------------------------
    // CloudFront Function — IP filter with landing page
    // -----------------------------------------------------------------

    const cidrList = allowedIpCidrs.split(',').map((c) => c.trim());
    const cidrJson = JSON.stringify(cidrList);

    const landingPagePath = path.join(__dirname, '../../edge/landing-page.html');
    const landingPageHtml = fs.readFileSync(landingPagePath, 'utf-8');
    const escapedHtml = JSON.stringify(landingPageHtml);

    const filterTemplatePath = path.join(__dirname, '../../edge/ip-filter.js');
    const filterTemplate = fs.readFileSync(filterTemplatePath, 'utf-8');

    const functionCode = filterTemplate
      .replace('__ALLOWED_CIDRS__', cidrJson)
      .replace('__LANDING_PAGE_HTML__', escapedHtml);

    const ipFilterFunction = new cloudfront.Function(this, 'IpFilterFunction', {
      functionName: 'keri-chat-ip-filter',
      code: cloudfront.FunctionCode.fromInline(functionCode),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // -----------------------------------------------------------------
    // CloudFront Distribution
    // -----------------------------------------------------------------

    // Determine API origin domain from the HTTP API URL
    // HttpApi URL format: https://{api-id}.execute-api.{region}.amazonaws.com/
    const apiDomainName = cdk.Fn.select(2, cdk.Fn.split('/', httpApi.apiEndpoint));

    // Build certificate and domain names conditionally
    let certificate: acm.ICertificate | undefined;
    let domainNames: string[] | undefined;
    let fullDomain: string | undefined;

    if (hostedZoneId && hostedZoneDomainName) {
      fullDomain = `${chatSubdomain}.${hostedZoneDomainName}`;
      domainNames = [fullDomain];

      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: hostedZoneDomainName,
      });

      // CloudFront requires certificates in us-east-1.
      // Use DnsValidatedCertificate for cross-region cert creation.
      certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
        domainName: fullDomain,
        hostedZone,
        region: 'us-east-1',
      });
    }

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: ipFilterFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiDomainName, {
            originPath: '',
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            {
              function: ipFilterFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      ...(certificate && { certificate }),
      ...(domainNames && { domainNames }),
    });

    // -----------------------------------------------------------------
    // Route53 DNS Record (conditional)
    // -----------------------------------------------------------------

    if (hostedZoneId && hostedZoneDomainName && fullDomain) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'DnsHostedZone', {
        hostedZoneId,
        zoneName: hostedZoneDomainName,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: fullDomain,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution),
        ),
      });
    }

    // -----------------------------------------------------------------
    // Frontend Deployment
    // -----------------------------------------------------------------

    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // -----------------------------------------------------------------
    // Conditional Billing Alarm
    // -----------------------------------------------------------------

    const hasBillingAlarm = new cdk.CfnCondition(this, 'HasBillingAlarm', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(billingAlarmThreshold.valueAsNumber, 0),
      ),
    });

    const billingAlarm = new cloudwatch.CfnAlarm(this, 'BillingAlarm', {
      alarmDescription: 'KERI RAG estimated charges alarm',
      namespace: 'AWS/Billing',
      metricName: 'EstimatedCharges',
      statistic: 'Maximum',
      period: 21600, // 6 hours
      evaluationPeriods: 1,
      threshold: billingAlarmThreshold.valueAsNumber,
      comparisonOperator: 'GreaterThanThreshold',
      dimensions: [{ name: 'Currency', value: 'USD' }],
    });
    billingAlarm.cfnOptions.condition = hasBillingAlarm;

    // -----------------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------------

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    if (fullDomain) {
      new cdk.CfnOutput(this, 'ChatUrl', {
        value: `https://${fullDomain}`,
        description: 'Chat URL (custom domain)',
      });
    }
  }
}
