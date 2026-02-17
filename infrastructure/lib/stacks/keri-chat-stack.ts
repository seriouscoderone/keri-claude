import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Embedding model to dimension compatibility matrix.
 *
 *   amazon.nova-2-multimodal-embeddings-v1:0  -> 256, 384, 1024, 3072
 *   amazon.titan-embed-image-v1               -> 256, 384, 1024
 *   cohere.embed-english-v3                   -> 256, 512, 1024, 1536
 *   amazon.titan-embed-text-v2:0              -> 256, 512, 1024
 *
 * CfnRules enforce compatibility at deploy time.
 */

const ALLOWED_MODELS = [
  'amazon.nova-2-multimodal-embeddings-v1:0',
  'amazon.titan-embed-image-v1',
  'cohere.embed-english-v3',
  'amazon.titan-embed-text-v2:0',
] as const;

const ALLOWED_DIMENSIONS = ['256', '384', '512', '1024', '1536', '3072'] as const;

export class KeriChatStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------------
    // Build-time config from CDK context
    // -----------------------------------------------------------------
    // These values are baked into the template at synth time because
    // CloudFront Functions and cross-region certificates require
    // resolved values (not CloudFormation tokens).

    const allowedIpCidrs = this.node.tryGetContext('allowedIpCidrs') ?? '0.0.0.0/0';
    const hostedZoneId = this.node.tryGetContext('hostedZoneId') ?? '';
    const hostedZoneDomainName = this.node.tryGetContext('hostedZoneDomainName') ?? '';
    const chatSubdomain = this.node.tryGetContext('chatSubdomain') ?? 'chat';

    // -----------------------------------------------------------------
    // CfnParameters — Network & Access Control
    // -----------------------------------------------------------------

    new cdk.CfnParameter(this, 'AllowedIpCidrs', {
      type: 'String',
      default: '0.0.0.0/0',
      description:
        'Comma-separated CIDR list for IP whitelist (build-time setting — requires CDK redeploy to change)',
    });

    new cdk.CfnParameter(this, 'HostedZoneId', {
      type: 'String',
      default: '',
      description: 'Route53 Hosted Zone ID (leave empty to skip DNS/TLS — requires CDK deploy)',
    });

    new cdk.CfnParameter(this, 'HostedZoneDomainName', {
      type: 'String',
      default: '',
      description: 'Base domain (e.g. keri.host — requires CDK deploy)',
    });

    new cdk.CfnParameter(this, 'ChatSubdomain', {
      type: 'String',
      default: 'chat',
      description: 'Subdomain prefix (e.g. chat → chat.keri.host — requires CDK deploy)',
    });

    // -----------------------------------------------------------------
    // CfnParameters — Embedding Model
    // -----------------------------------------------------------------

    const embeddingModelId = new cdk.CfnParameter(this, 'EmbeddingModelId', {
      type: 'String',
      default: 'amazon.nova-2-multimodal-embeddings-v1:0',
      allowedValues: [...ALLOWED_MODELS],
      description: 'Bedrock embedding model ID for the knowledge base',
    });

    const embeddingDimension = new cdk.CfnParameter(this, 'EmbeddingDimension', {
      type: 'String',
      default: '1024',
      allowedValues: [...ALLOWED_DIMENSIONS],
      description: 'Embedding vector dimension (must be compatible with chosen model)',
    });

    // -----------------------------------------------------------------
    // CfnParameters — Rate Limiting & Cost Control
    // -----------------------------------------------------------------


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
    // CfnRules — Embedding model/dimension compatibility
    // -----------------------------------------------------------------

    new cdk.CfnRule(this, 'NovaModelDimensionRule', {
      ruleCondition: cdk.Fn.conditionEquals(embeddingModelId.valueAsString, 'amazon.nova-2-multimodal-embeddings-v1:0'),
      assertions: [
        {
          assert: cdk.Fn.conditionContains(['256', '384', '1024', '3072'], embeddingDimension.valueAsString),
          assertDescription:
            'amazon.nova-2-multimodal-embeddings-v1:0 supports dimensions: 256, 384, 1024, 3072',
        },
      ],
    });

    new cdk.CfnRule(this, 'TitanImageDimensionRule', {
      ruleCondition: cdk.Fn.conditionEquals(embeddingModelId.valueAsString, 'amazon.titan-embed-image-v1'),
      assertions: [
        {
          assert: cdk.Fn.conditionContains(['256', '384', '1024'], embeddingDimension.valueAsString),
          assertDescription:
            'amazon.titan-embed-image-v1 supports dimensions: 256, 384, 1024',
        },
      ],
    });

    new cdk.CfnRule(this, 'CohereDimensionRule', {
      ruleCondition: cdk.Fn.conditionEquals(embeddingModelId.valueAsString, 'cohere.embed-english-v3'),
      assertions: [
        {
          assert: cdk.Fn.conditionContains(['256', '512', '1024', '1536'], embeddingDimension.valueAsString),
          assertDescription:
            'cohere.embed-english-v3 supports dimensions: 256, 512, 1024, 1536',
        },
      ],
    });

    new cdk.CfnRule(this, 'TitanTextDimensionRule', {
      ruleCondition: cdk.Fn.conditionEquals(embeddingModelId.valueAsString, 'amazon.titan-embed-text-v2:0'),
      assertions: [
        {
          assert: cdk.Fn.conditionContains(['256', '512', '1024'], embeddingDimension.valueAsString),
          assertDescription:
            'amazon.titan-embed-text-v2:0 supports dimensions: 256, 512, 1024',
        },
      ],
    });

    // -----------------------------------------------------------------
    // CfnConditions
    // -----------------------------------------------------------------

    const hasConcurrencyLimit = new cdk.CfnCondition(this, 'HasConcurrencyLimit', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(lambdaConcurrencyLimit.valueAsNumber, 0),
      ),
    });

    const hasBillingAlarm = new cdk.CfnCondition(this, 'HasBillingAlarm', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(billingAlarmThreshold.valueAsNumber, 0),
      ),
    });

    // =================================================================
    // 1. VPC — isolated subnets only (no NAT Gateway)
    // =================================================================

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // =================================================================
    // 2. Aurora Serverless v2 — PostgreSQL 16.6 with pgvector
    // =================================================================

    const databaseName = 'bedrock_kb_db';
    const tableName = 'bedrock_kb';

    const cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('bedrock_admin'),
      defaultDatabaseName: databaseName,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      enableDataApi: true,
      storageEncrypted: true,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =================================================================
    // 3. DB init custom resource — pgvector extension/schema/indexes
    // =================================================================

    const dbInitFn = new lambda.NodejsFunction(this, 'DbInitHandler', {
      entry: path.join(__dirname, '../../lambda/db-init/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    dbInitFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['rds-data:ExecuteStatement'],
        resources: [cluster.clusterArn],
      }),
    );

    dbInitFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [cluster.secret!.secretArn],
      }),
    );

    const dbInit = new cr.Provider(this, 'DbInitProvider', {
      onEventHandler: dbInitFn,
    });

    const dbInitResource = new cdk.CustomResource(this, 'DbInit', {
      serviceToken: dbInit.serviceToken,
      properties: {
        resourceArn: cluster.clusterArn,
        secretArn: cluster.secret!.secretArn,
        database: databaseName,
        embeddingDimension: embeddingDimension.valueAsString,
      },
    });

    dbInitResource.node.addDependency(cluster);

    // =================================================================
    // 4. S3 document bucket — for KB source documents
    // =================================================================

    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      // Let CFN generate unique bucket name to avoid S3 409 conflicts on redeploy
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Separate bucket for multimodal supplemental storage (extracted media)
    // Must be different from document source bucket to avoid re-ingestion loops
    const multimodalStorageBucket = new s3.Bucket(this, 'MultimodalStorageBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Deploy KERI documents from staging/ into the document bucket
    const documentDeployment = new s3deploy.BucketDeployment(this, 'DocumentDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../scripts/staging'), {
        exclude: ['.DS_Store', 'distill-*', '*.py', 'images', 'images/*'],
      })],
      destinationBucket: documentBucket,
      prune: false,
      memoryLimit: 3008,
      ephemeralStorageSize: cdk.Size.mebibytes(1024),
    });

    // Deploy images into the multimodal storage bucket (separate from documents)
    const imagesPath = path.join(__dirname, '../../../scripts/staging/images');
    if (fs.existsSync(imagesPath)) {
      const imageDeployment = new s3deploy.BucketDeployment(this, 'ImageDeployment', {
        sources: [s3deploy.Source.asset(imagesPath, {
          exclude: ['.DS_Store'],
        })],
        destinationBucket: multimodalStorageBucket,
        prune: false,
      });
      imageDeployment.node.addDependency(documentDeployment);
    }

    // =================================================================
    // 5. Bedrock KB IAM role — S3 + RDS + Bedrock model access
    // =================================================================

    const kbRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for KERI Chat Bedrock Knowledge Base',
    });

    documentBucket.grantReadWrite(kbRole);
    multimodalStorageBucket.grantReadWrite(kbRole);

    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:DescribeDBClusters',
          'rds-data:BatchExecuteStatement',
          'rds-data:ExecuteStatement',
        ],
        resources: [cluster.clusterArn],
      }),
    );

    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [cluster.secret!.secretArn],
      }),
    );

    const embeddingModelArn = cdk.Fn.sub(
      'arn:aws:bedrock:${AWS::Region}::foundation-model/${modelId}',
      { modelId: embeddingModelId.valueAsString },
    );

    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [embeddingModelArn],
      }),
    );

    // =================================================================
    // 6. Bedrock Knowledge Base — via SDK custom resource (bypasses
    //    CFN handler which doesn't support Nova multimodal embeddings)
    // =================================================================

    const kbCreateParams = {
      name: 'keri-chat-knowledge-base',
      description: 'KERI ecosystem chat knowledge base',
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn,
          embeddingModelConfiguration: {
            bedrockEmbeddingModelConfiguration: {
              dimensions: cdk.Token.asNumber(embeddingDimension.valueAsString),
            },
          },
          supplementalDataStorageConfiguration: {
            storageLocations: [
              {
                type: 'S3',
                s3Location: {
                  uri: multimodalStorageBucket.s3UrlForObject(),
                },
              },
            ],
          },
        },
      },
      storageConfiguration: {
        type: 'RDS',
        rdsConfiguration: {
          resourceArn: cluster.clusterArn,
          credentialsSecretArn: cluster.secret!.secretArn,
          databaseName,
          tableName: `bedrock_integration.${tableName}`,
          fieldMapping: {
            primaryKeyField: 'id',
            vectorField: 'embedding',
            textField: 'chunks',
            metadataField: 'metadata',
          },
        },
      },
    };

    const knowledgeBase = new cr.AwsCustomResource(this, 'KnowledgeBase', {
      onCreate: {
        service: 'BedrockAgent',
        action: 'createKnowledgeBase',
        parameters: kbCreateParams,
        physicalResourceId: cr.PhysicalResourceId.fromResponse('knowledgeBase.knowledgeBaseId'),
      },
      onUpdate: {
        service: 'BedrockAgent',
        action: 'updateKnowledgeBase',
        parameters: {
          knowledgeBaseId: new cr.PhysicalResourceIdReference(),
          ...kbCreateParams,
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('knowledgeBase.knowledgeBaseId'),
      },
      onDelete: {
        service: 'BedrockAgent',
        action: 'deleteKnowledgeBase',
        parameters: {
          knowledgeBaseId: new cr.PhysicalResourceIdReference(),
        },
        ignoreErrorCodesMatching: 'ResourceNotFoundException|ValidationException|AccessDeniedException',
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'bedrock:CreateKnowledgeBase',
            'bedrock:UpdateKnowledgeBase',
            'bedrock:DeleteKnowledgeBase',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: ['iam:PassRole'],
          resources: [kbRole.roleArn],
        }),
      ]),
    });

    const knowledgeBaseId = knowledgeBase.getResponseField('knowledgeBase.knowledgeBaseId');

    // Ensure IAM policy and DB initialization complete before KB validates RDS access.
    // The KB validates the Aurora connection at creation time, requiring both the
    // Writer instance (created by dbInit's dependency on cluster) and the schema.
    const defaultPolicy = kbRole.node.findChild('DefaultPolicy').node.defaultChild as cdk.CfnResource;
    knowledgeBase.node.addDependency(defaultPolicy);
    knowledgeBase.node.addDependency(dbInitResource);

    // =================================================================
    // 7. Bedrock Data Source — hierarchical chunking (1500/300/60)
    // =================================================================

    const dataSource = new cr.AwsCustomResource(this, 'DataSource', {
      onCreate: {
        service: 'BedrockAgent',
        action: 'createDataSource',
        parameters: {
          knowledgeBaseId,
          name: 'keri-docs',
          description: 'KERI specification and documentation source',
          dataSourceConfiguration: {
            type: 'S3',
            s3Configuration: {
              bucketArn: documentBucket.bucketArn,
            },
          },
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'HIERARCHICAL',
              hierarchicalChunkingConfiguration: {
                levelConfigurations: [
                  { maxTokens: 1500 },
                  { maxTokens: 300 },
                ],
                overlapTokens: 60,
              },
            },
          },
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('dataSource.dataSourceId'),
      },
      onDelete: {
        service: 'BedrockAgent',
        action: 'deleteDataSource',
        parameters: {
          knowledgeBaseId,
          dataSourceId: new cr.PhysicalResourceIdReference(),
        },
        ignoreErrorCodesMatching: 'ResourceNotFoundException|ValidationException|AccessDeniedException',
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'bedrock:CreateDataSource',
            'bedrock:DeleteDataSource',
          ],
          resources: ['*'],
        }),
      ]),
    });

    const dataSourceId = dataSource.getResponseField('dataSource.dataSourceId');

    // =================================================================
    // 8. Ingestion Lambda — triggers StartIngestionJob on daily schedule
    // =================================================================

    const ingestionFn = new lambda.NodejsFunction(this, 'IngestionHandler', {
      entry: path.join(__dirname, '../../lambda/ingestion-handler/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID: dataSourceId,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    ingestionFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:StartIngestionJob'],
        resources: [
          cdk.Fn.sub(
            'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:knowledge-base/${kbId}',
            { kbId: knowledgeBaseId },
          ),
        ],
      }),
    );

    const dailyRule = new events.Rule(this, 'DailyIngestionRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      description: 'Triggers KERI chat ingestion job daily',
    });

    dailyRule.addTarget(new targets.LambdaFunction(ingestionFn));

    // =================================================================
    // 8b. Deploy-time ingestion — triggers after document upload
    // =================================================================

    const deployIngestion = new cr.AwsCustomResource(this, 'DeployIngestion', {
      onCreate: {
        service: 'BedrockAgent',
        action: 'startIngestionJob',
        parameters: {
          knowledgeBaseId: knowledgeBaseId,
          dataSourceId: dataSourceId,
        },
        physicalResourceId: cr.PhysicalResourceId.of('deploy-ingestion'),
      },
      onUpdate: {
        service: 'BedrockAgent',
        action: 'startIngestionJob',
        parameters: {
          knowledgeBaseId: knowledgeBaseId,
          dataSourceId: dataSourceId,
        },
        physicalResourceId: cr.PhysicalResourceId.of('deploy-ingestion'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['bedrock:StartIngestionJob'],
          resources: ['*'],
        }),
      ]),
    });

    deployIngestion.node.addDependency(documentDeployment);

    // =================================================================
    // 9. Chat Lambda — 3-step pipeline (reformulate → retrieve → generate)
    // =================================================================

    const modelArn = `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0`;

    const chatFn = new lambda.NodejsFunction(this, 'ChatHandler', {
      entry: path.join(__dirname, '../../lambda/chat-handler/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
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
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:Converse',
          'bedrock:ConverseStream',
          'bedrock:GetInferenceProfile',
        ],
        resources: ['*'],
      }),
    );

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
    const cfnChatFn = chatFn.node.defaultChild as lambdaBase.CfnFunction;
    cfnChatFn.addPropertyOverride(
      'ReservedConcurrentExecutions',
      cdk.Fn.conditionIf(
        hasConcurrencyLimit.logicalId,
        lambdaConcurrencyLimit.valueAsNumber,
        cdk.Aws.NO_VALUE,
      ),
    );

    // =================================================================
    // 10. Lambda Function URL — streaming SSE endpoint for chat
    // =================================================================

    const chatFnUrl = chatFn.addFunctionUrl({
      authType: lambdaBase.FunctionUrlAuthType.NONE,
      invokeMode: lambdaBase.InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambdaBase.HttpMethod.POST],
        allowedHeaders: ['Content-Type'],
      },
    });

    // =================================================================
    // 10a. MCP Lambda — stateless MCP-over-HTTP endpoint
    // =================================================================

    const mcpFn = new lambda.NodejsFunction(this, 'McpHandler', {
      entry: path.join(__dirname, '../../lambda/mcp-handler/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.minutes(2),
      environment: {
        CHAT_FN_URL: chatFnUrl.url,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    // =================================================================
    // 10b. MCP Function URL — buffered JSON response
    // =================================================================

    const mcpFnUrl = mcpFn.addFunctionUrl({
      authType: lambdaBase.FunctionUrlAuthType.NONE,
      invokeMode: lambdaBase.InvokeMode.BUFFERED,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambdaBase.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'Accept'],
      },
    });

    // =================================================================
    // 11. Frontend S3 bucket — hosts built React app
    // =================================================================

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      // Let CFN generate unique bucket name to avoid S3 409 conflicts on redeploy
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // =================================================================
    // 12. CloudFront IP filter function — viewer-request JS function
    // =================================================================

    const cidrList = allowedIpCidrs.split(',').map((c: string) => c.trim());
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

    // =================================================================
    // 13. CloudFront distribution — S3 default + /api/* API behavior
    // =================================================================

    // Extract domains from Function URLs (https://xxx.lambda-url.region.on.aws/)
    const fnUrlDomain = cdk.Fn.select(2, cdk.Fn.split('/', chatFnUrl.url));
    const mcpFnUrlDomain = cdk.Fn.select(2, cdk.Fn.split('/', mcpFnUrl.url));

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
          origin: new origins.HttpOrigin(fnUrlDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: cdk.Duration.seconds(60),
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
        '/mcp': {
          origin: new origins.HttpOrigin(mcpFnUrlDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: cdk.Duration.seconds(90),
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

    // =================================================================
    // 14. Certificate + Route53 record — conditional on custom domain
    // =================================================================

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

    // =================================================================
    // 15. Frontend deployment — BucketDeployment from frontend/dist
    // =================================================================

    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // =================================================================
    // 16. Billing alarm — conditional on BillingAlarmThreshold
    // =================================================================

    const billingAlarm = new cloudwatch.CfnAlarm(this, 'BillingAlarm', {
      alarmDescription: 'KERI Chat estimated charges alarm',
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

    // =================================================================
    // 17. SSM parameters — for external tooling (sync-docs.sh, etc.)
    // =================================================================

    new ssm.StringParameter(this, 'KnowledgeBaseIdParam', {
      parameterName: '/keri-chat/knowledge-base-id',
      stringValue: knowledgeBaseId,
      description: 'Bedrock Knowledge Base ID for KERI Chat',
    });

    new ssm.StringParameter(this, 'DocumentBucketNameParam', {
      parameterName: '/keri-chat/document-bucket-name',
      stringValue: documentBucket.bucketName,
      description: 'S3 bucket name for KERI Chat documents',
    });

    new ssm.StringParameter(this, 'DataSourceIdParam', {
      parameterName: '/keri-chat/data-source-id',
      stringValue: dataSourceId,
      description: 'Bedrock Data Source ID for KERI Chat',
    });

    // -----------------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------------

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'ChatFunctionUrl', {
      value: chatFnUrl.url,
      description: 'Lambda Function URL (streaming)',
    });

    new cdk.CfnOutput(this, 'McpEndpointUrl', {
      value: `https://${distribution.distributionDomainName}/mcp`,
      description: 'MCP endpoint URL (Streamable HTTP)',
    });

    if (fullDomain) {
      new cdk.CfnOutput(this, 'ChatUrl', {
        value: `https://${fullDomain}`,
        description: 'Chat URL (custom domain)',
      });
    }
  }
}
