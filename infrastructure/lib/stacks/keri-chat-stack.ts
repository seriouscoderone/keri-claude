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
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
    // CfnParameters — Network & Access Control
    // -----------------------------------------------------------------
    // All parameters are CfnParameters so they work in both CDK deploy
    // (via parameters.json context) and Launch Stack (via CloudFormation console).

    const allowedIpCidrs = new cdk.CfnParameter(this, 'AllowedIpCidrs', {
      type: 'String',
      default: this.node.tryGetContext('allowedIpCidrs') ?? '0.0.0.0/1,128.0.0.0/1',
      description: 'Comma-separated IPv4 CIDR list for IP whitelist (no spaces). Use 0.0.0.0/1,128.0.0.0/1 to allow all (WAF does not support /0).',
    });

    const hostedZoneId = new cdk.CfnParameter(this, 'HostedZoneId', {
      type: 'String',
      default: this.node.tryGetContext('hostedZoneId') ?? '',
      description: 'Route53 Hosted Zone ID (leave empty to skip DNS/TLS)',
    });

    const hostedZoneDomainName = new cdk.CfnParameter(this, 'HostedZoneDomainName', {
      type: 'String',
      default: this.node.tryGetContext('hostedZoneDomainName') ?? '',
      description: 'Base domain (e.g. keri.host)',
    });

    const chatSubdomain = new cdk.CfnParameter(this, 'ChatSubdomain', {
      type: 'String',
      default: this.node.tryGetContext('chatSubdomain') ?? 'chat',
      description: 'Subdomain prefix (e.g. chat → chat.keri.host)',
    });

    // -----------------------------------------------------------------
    // CfnParameters — Embedding Model
    // -----------------------------------------------------------------

    const embeddingModelId = new cdk.CfnParameter(this, 'EmbeddingModelId', {
      type: 'String',
      default: this.node.tryGetContext('embeddingModelId') ?? 'amazon.nova-2-multimodal-embeddings-v1:0',
      allowedValues: [...ALLOWED_MODELS],
      description: 'Bedrock embedding model ID for the knowledge base',
    });

    const embeddingDimension = new cdk.CfnParameter(this, 'EmbeddingDimension', {
      type: 'String',
      default: this.node.tryGetContext('embeddingDimension') ?? '1024',
      allowedValues: [...ALLOWED_DIMENSIONS],
      description: 'Embedding vector dimension (must be compatible with chosen model)',
    });

    // -----------------------------------------------------------------
    // CfnParameters — Rate Limiting & Cost Control
    // -----------------------------------------------------------------


    const lambdaConcurrencyLimit = new cdk.CfnParameter(this, 'LambdaConcurrencyLimit', {
      type: 'Number',
      default: this.node.tryGetContext('lambdaConcurrencyLimit') ?? 0,
      description: 'Lambda reserved concurrency (0=unreserved)',
    });

    const billingAlarmThreshold = new cdk.CfnParameter(this, 'BillingAlarmThreshold', {
      type: 'Number',
      default: this.node.tryGetContext('billingAlarmThreshold') ?? 0,
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
    // Account-unique resource names
    // -----------------------------------------------------------------
    // Defaults to the historical literals so the live stack's template stays
    // byte-identical — renaming the Knowledge Base would REPLACE it and
    // destroy every vector. A second stack in the same account (e.g. an
    // integration test) passes -c namePrefix=<other> for a disjoint set.

    // A CfnParameter, not synth-time context, so the PUBLISHED template can be
    // launched more than once in one account — which is what makes an
    // integration test possible without a second AWS account. Changing it at
    // launch time gives a fully disjoint set of account-unique names.
    //
    // Default is the historical literal, so the live stack is unaffected: the
    // resolved values are identical and CloudFormation sees no change. Renaming
    // the Knowledge Base would REPLACE it.
    const namePrefixParam = new cdk.CfnParameter(this, 'NamePrefix', {
      type: 'String',
      default: this.node.tryGetContext('namePrefix') ?? 'keri-chat',
      allowedPattern: '[a-z][a-z0-9-]{2,30}',
      description:
        'Prefix for account-unique resource names (Knowledge Base, WAF, SSM paths). ' +
        'Change it to deploy a second, independent copy in the same account.',
    });
    const namePrefix = namePrefixParam.valueAsString;

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

    const hasCustomDomain = new cdk.CfnCondition(this, 'HasCustomDomain', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(hostedZoneId.valueAsString, ''),
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
        // Pinned versions rot. 16.6 stopped being creatable, so a fresh deploy
        // of the published template died with "Cannot find version 16.6 for
        // aurora-postgresql" while the existing cluster kept running happily —
        // invisible until a Launch Stack integration test tried it
        // (2026-08-01). 16.11 is what the live cluster had already auto-upgraded
        // to, so this also reconciles that drift rather than forcing a change.
        // If a fresh deploy fails this way again, check:
        //   aws rds describe-db-engine-versions --engine aurora-postgresql
        version: rds.AuroraPostgresEngineVersion.VER_16_11,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('bedrock_admin'),
      defaultDatabaseName: databaseName,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      // Min 0 enables Aurora Serverless v2 auto-pause: the cluster scales to
      // 0 ACU (no compute cost) after ~5 min idle, resuming on next connection.
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 4,
      // 300s is what the cluster is running today, but it lives only in live
      // state — the deployed template never carried it. Declaring it makes the
      // pause behaviour reproducible from code.
      serverlessV2AutoPauseDuration: cdk.Duration.minutes(5),
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

    // Deploy all KERI documents + images into the document bucket.
    // Images live alongside text so the data source can ingest both.
    const documentDeployment = new s3deploy.BucketDeployment(this, 'DocumentDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../scripts/staging'), {
        // Do NOT add a leading '*' here, however tempting the symmetry with
        // sync-docs.sh is. These two use different matchers:
        //
        //   CDK asset exclude — gitignore semantics. A bare name already
        //     matches at any depth, and '*' does NOT match a leading dot, so
        //     '*.DS_Store' silently stops excluding '.DS_Store' altogether.
        //   aws s3 sync --exclude — fnmatch over the whole key. A bare name
        //     matches ONLY at the root, so there the leading '*' is required.
        //
        // Getting this backwards uploaded a .DS_Store that Bedrock then failed
        // to index (2026-08-01).
        exclude: ['.DS_Store', 'distill-*', '*.py'],
      })],
      destinationBucket: documentBucket,
      prune: false,
      memoryLimit: 3008,
      ephemeralStorageSize: cdk.Size.mebibytes(1024),
    });

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

    // Parsing model used to describe images during multimodal ingestion
    // Use Amazon Nova Lite (no marketplace subscription required, unlike Anthropic models)
    const parsingModelArn = `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.nova-lite-v1:0`;

    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          embeddingModelArn,
          parsingModelArn,
        ],
      }),
    );

    // =================================================================
    // 6. Bedrock Knowledge Base — via SDK custom resource (bypasses
    //    CFN handler which doesn't support Nova multimodal embeddings)
    // =================================================================

    // Nova multimodal embeddings require supplementalDataStorageConfiguration;
    // text-only models (Titan, Cohere) fail if it's present.
    const resolvedModelId = this.node.tryGetContext('embeddingModelId') ?? 'amazon.nova-2-multimodal-embeddings-v1:0';
    const isMultimodal = resolvedModelId.includes('nova') || resolvedModelId.includes('image');

    const vectorKbConfig: Record<string, unknown> = {
      embeddingModelArn,
      embeddingModelConfiguration: {
        bedrockEmbeddingModelConfiguration: {
          dimensions: cdk.Token.asNumber(embeddingDimension.valueAsString),
        },
      },
    };

    if (isMultimodal) {
      vectorKbConfig.supplementalDataStorageConfiguration = {
        storageLocations: [
          {
            type: 'S3',
            s3Location: { uri: `s3://${multimodalStorageBucket.bucketName}/` },
          },
        ],
      };
    }

    const kbCreateParams = {
      name: `${namePrefix}-knowledge-base`,
      description: 'KERI ecosystem chat knowledge base',
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: vectorKbConfig,
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
        // ONLY ResourceNotFoundException — the one code that genuinely means
        // "already gone". ValidationException is exactly what delete raises
        // while a data source or in-flight ingestion still exists; swallowing it
        // told CloudFormation the delete had succeeded and leaked an ACTIVE
        // Knowledge Base plus its billing Aurora cluster on every rollback.
        ignoreErrorCodesMatching: 'ResourceNotFoundException',
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
    // 7. Bedrock Data Source — hierarchical chunking + multimodal parsing
    // =================================================================

    // When using a multimodal embedding model, enable foundation model
    // parsing so images (PNG, JPG, PDF diagrams) are described by Claude
    // and embedded alongside text content.
    const dataSourceVectorConfig: Record<string, unknown> = {
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
    };

    if (isMultimodal) {
      dataSourceVectorConfig.parsingConfiguration = {
        parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
        bedrockFoundationModelConfiguration: {
          modelArn: parsingModelArn,
          parsingPrompt: {
            parsingPromptText:
              'Describe this image in detail. Focus on any diagrams, architecture, ' +
              'protocols, data flows, cryptographic operations, or technical concepts shown. ' +
              'Include all labels, arrows, and relationships visible in the diagram.',
          },
        },
      };
    }

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
          vectorIngestionConfiguration: dataSourceVectorConfig,
          // RETAIN, not the DELETE default. On stack deletion CloudFormation can
          // destroy the Aurora cluster before Bedrock deletes the data source,
          // and DELETE then makes Bedrock try to remove vectors from a store
          // that is already gone. The data source ends DELETE_UNSUCCESSFUL and
          // the Knowledge Base becomes permanently undeletable — the policy
          // cannot be changed afterwards, because parsingConfiguration is
          // immutable (observed 2026-08-01, left an undeletable KB behind).
          // Retaining is harmless: the vectors live in a cluster the stack
          // destroys wholesale anyway.
          dataDeletionPolicy: 'RETAIN',
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('dataSource.dataSourceId'),
      },
      // Required, even though nothing here is usefully updatable.
      // AwsCustomResource defaults onUpdate to "no call", and a call never made
      // returns no response data — so ANY property change on this resource makes
      // CloudFormation issue an Update that yields nothing, and every consumer
      // of dataSource.dataSourceId fails the stack with:
      //   "Vendor response doesn't contain dataSource.dataSourceId attribute"
      // That made this resource effectively frozen. getDataSource is read-only
      // and republishes the same fields, which unfreezes it.
      onUpdate: {
        service: 'BedrockAgent',
        action: 'getDataSource',
        parameters: {
          knowledgeBaseId,
          dataSourceId: new cr.PhysicalResourceIdReference(),
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
        // ONLY ResourceNotFoundException — that one genuinely means "already
        // gone", which is the idempotency we want. ValidationException and
        // AccessDeniedException were also ignored, and ValidationException is
        // exactly what delete raises while a data source or in-flight ingestion
        // still exists. Swallowing it told CloudFormation the delete succeeded
        // and leaked an ACTIVE Knowledge Base plus its Aurora cluster on every
        // rollback (observed 2026-08-01, in a test account, still billing).
        // ONLY ResourceNotFoundException — the one code that genuinely means
        // "already gone". ValidationException is exactly what delete raises
        // while a data source or in-flight ingestion still exists; swallowing it
        // told CloudFormation the delete had succeeded and leaked an ACTIVE
        // Knowledge Base plus its billing Aurora cluster on every rollback.
        ignoreErrorCodesMatching: 'ResourceNotFoundException',
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'bedrock:CreateDataSource',
            'bedrock:GetDataSource',
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
      // Must exceed the handler's 120s Aurora wake window, or the retry is cut
      // short by the Lambda timeout instead of completing the resume.
      timeout: cdk.Duration.seconds(180),
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

    // A custom resource is only invoked when its own properties change.
    // knowledgeBaseId and dataSourceId are stable, so without a value that
    // tracks the documents, a docs-only deploy uploaded new files to S3 and
    // never re-ingested them — the KB kept serving the previous vectors until
    // the daily rule happened to fire. Fingerprinting scripts/manifest.sha256,
    // which changes exactly when the corpus changes, is what makes it fire.
    // DON'T REMOVE IT.
    const corpusVersion = (() => {
      const manifest = path.join(__dirname, '../../../scripts/manifest.sha256');
      if (!fs.existsSync(manifest)) return 'no-manifest';
      return crypto.createHash('sha256').update(fs.readFileSync(manifest)).digest('hex').slice(0, 16);
    })();

    // cr.Provider, not AwsCustomResource. An AwsCustomResource calling
    // Lambda.invoke reported success whenever the *API call* succeeded — a
    // handler error still produced a green deploy, so a broken ingestion was
    // invisible. Under a Provider a thrown error fails the resource, and the
    // isCompleteHandler waits for the job to actually finish instead of just
    // starting it. That makes a failed — or partially failed — ingestion a red
    // deploy, which is the only reliable signal that the KB is stale.
    const ingestionCrEnvironment = {
      KNOWLEDGE_BASE_ID: knowledgeBaseId,
      DATA_SOURCE_ID: dataSourceId,
    };

    const ingestionOnEventFn = new lambda.NodejsFunction(this, 'IngestionOnEvent', {
      entry: path.join(__dirname, '../../lambda/ingestion-cr/on-event.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      // Must exceed the 120s Aurora wake window inside startIngestion.
      timeout: cdk.Duration.seconds(180),
      memorySize: 256,
      environment: ingestionCrEnvironment,
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    const ingestionIsCompleteFn = new lambda.NodejsFunction(this, 'IngestionIsComplete', {
      entry: path.join(__dirname, '../../lambda/ingestion-cr/is-complete.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      // Must exceed anything the handler can block on. It was 60s while the
      // handler could spend 120s retrying a start, so the Lambda died without
      // responding and CloudFormation failed the stack.
      timeout: cdk.Duration.seconds(120),
      memorySize: 256,
      environment: ingestionCrEnvironment,
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    const kbArn = cdk.Fn.sub(
      'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:knowledge-base/${kbId}',
      { kbId: knowledgeBaseId },
    );

    ingestionOnEventFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:StartIngestionJob'],
        resources: [kbArn],
      }),
    );
    ingestionIsCompleteFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:GetIngestionJob', 'bedrock:ListIngestionJobs', 'bedrock:StartIngestionJob'],
        resources: [kbArn],
      }),
    );

    const ingestionProvider = new cr.Provider(this, 'DeployIngestionProvider', {
      onEventHandler: ingestionOnEventFn,
      isCompleteHandler: ingestionIsCompleteFn,
      queryInterval: cdk.Duration.seconds(30),
      // Backstop only, and it MUST stay under 60 minutes. CloudFormation
      // abandons any custom resource that has not responded within one hour —
      // not configurable — so the 2h this used to say was unreachable: a fresh
      // stack died at exactly 60.4 min with isComplete still polling happily.
      // The handler self-completes at its own 45-minute budget, so this should
      // never fire; if it does, something is wrong with the handler itself.
      totalTimeout: cdk.Duration.minutes(50),
    });

    const deployIngestion = new cdk.CustomResource(this, 'DeployIngestion', {
      serviceToken: ingestionProvider.serviceToken,
      properties: {
        // The change-detector. See corpusVersion above.
        CorpusVersion: corpusVersion,
      },
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
    // 12. WAF WebACL — IP whitelist via CfnParameter-driven IPSet
    // =================================================================
    // Replaces the previous CloudFront Function approach so that IP
    // CIDRs can be changed at deploy time via CloudFormation parameters
    // (CF Functions require values baked at synth time).

    const blockedPagePath = path.join(__dirname, '../../edge/blocked-page.html');
    const blockedPageHtml = fs.readFileSync(blockedPagePath, 'utf-8');

    const ipSet = new wafv2.CfnIPSet(this, 'AllowedIpSet', {
      name: `${namePrefix}-allowed-ips`,
      scope: 'CLOUDFRONT',
      ipAddressVersion: 'IPV4',
      addresses: cdk.Fn.split(',', allowedIpCidrs.valueAsString),
    });

    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `${namePrefix}-ip-filter`,
      scope: 'CLOUDFRONT',
      defaultAction: { block: {
        customResponse: {
          responseCode: 403,
          customResponseBodyKey: 'blocked-landing-page',
        },
      }},
      customResponseBodies: {
        'blocked-landing-page': {
          contentType: 'TEXT_HTML',
          content: blockedPageHtml,
        },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'keri-chat-waf',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'allow-whitelisted-ips',
          priority: 0,
          action: { allow: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'keri-chat-ip-allow',
            sampledRequestsEnabled: true,
          },
          statement: {
            ipSetReferenceStatement: {
              arn: ipSet.attrArn,
            },
          },
        },
      ],
    });

    // =================================================================
    // 13. CloudFront distribution — S3 default + /api/* + /mcp behaviors
    // =================================================================

    // Extract domains from Function URLs (https://xxx.lambda-url.region.on.aws/)
    const fnUrlDomain = cdk.Fn.select(2, cdk.Fn.split('/', chatFnUrl.url));
    const mcpFnUrlDomain = cdk.Fn.select(2, cdk.Fn.split('/', mcpFnUrl.url));

    // Full domain name from CfnParameters (e.g. chat.keri.host)
    const fullDomain = cdk.Fn.join('.', [
      chatSubdomain.valueAsString,
      hostedZoneDomainName.valueAsString,
    ]);

    // ACM certificate — conditional on HasCustomDomain
    const cfnCert = new acm.CfnCertificate(this, 'Certificate', {
      domainName: fullDomain,
      validationMethod: 'DNS',
      domainValidationOptions: [{
        domainName: fullDomain,
        hostedZoneId: hostedZoneId.valueAsString,
      }],
    });
    cfnCert.cfnOptions.condition = hasCustomDomain;

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      // The WAF allowlist is IPv4-only (AllowedIpCidrs is documented as an IPv4
      // CIDR list, and a WAFv2 IPSet is single-address-family), so serving IPv6
      // means allowlisted users arriving over IPv6 are blocked with a 403 they
      // cannot explain.
      //
      // Production hid this: its Route53 alias never created an AAAA record, so
      // chat.keri.host is only ever reached over IPv4. The raw CloudFront domain
      // DOES publish AAAA — so every Launch Stack user without a custom domain
      // hit it. Measured 2026-08-02: same host, IPv4 200 / IPv6 403.
      //
      // Fails closed, so this is a usability bug rather than a security one.
      // Supporting IPv6 properly means a second IPSet with IPVersion IPV6 plus
      // its own rule, and a parameter for callers to supply IPv6 CIDRs.
      enableIpv6: false,
      defaultBehavior: {
        // Explicit, prefixed name. CDK's default is derived from the synth-time
        // stack name and baked into the published template as a literal, and an
        // OriginAccessControl name must be unique per account — so a second
        // deployment of the published template collided with the first:
        //   'KeriChatDistributionOrigin1S3OriginAccessControl...' already exists
        // A different-account test cannot catch this; only a same-account one can.
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessControl: new cloudfront.S3OriginAccessControl(this, 'FrontendOac', {
            originAccessControlName: `${namePrefix}-frontend-oac`,
          }),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
        },
      },
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      webAclId: webAcl.attrArn,
    });

    // Override distribution properties conditionally for custom domain/cert
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Aliases',
      cdk.Fn.conditionIf(hasCustomDomain.logicalId, [fullDomain], cdk.Aws.NO_VALUE),
    );
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.ViewerCertificate',
      cdk.Fn.conditionIf(
        hasCustomDomain.logicalId,
        {
          AcmCertificateArn: cfnCert.ref,
          SslSupportMethod: 'sni-only',
          MinimumProtocolVersion: 'TLSv1.2_2021',
        },
        {
          CloudFrontDefaultCertificate: true,
        },
      ),
    );

    // =================================================================
    // 14. Route53 record — conditional on custom domain
    // =================================================================

    const cfnARecord = new route53.CfnRecordSet(this, 'AliasRecord', {
      hostedZoneId: hostedZoneId.valueAsString,
      name: fullDomain,
      type: 'A',
      aliasTarget: {
        hostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID (global constant)
        dnsName: distribution.distributionDomainName,
      },
    });
    cfnARecord.cfnOptions.condition = hasCustomDomain;

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
      parameterName: `/${namePrefix}/knowledge-base-id`,
      // namePrefix is a CfnParameter token, so CDK cannot infer whether this
      // is a simple name or a path. It is a path.
      simpleName: false,
      stringValue: knowledgeBaseId,
      description: 'Bedrock Knowledge Base ID for KERI Chat',
    });

    new ssm.StringParameter(this, 'DocumentBucketNameParam', {
      parameterName: `/${namePrefix}/document-bucket-name`,
      // namePrefix is a CfnParameter token, so CDK cannot infer whether this
      // is a simple name or a path. It is a path.
      simpleName: false,
      stringValue: documentBucket.bucketName,
      description: 'S3 bucket name for KERI Chat documents',
    });

    new ssm.StringParameter(this, 'DataSourceIdParam', {
      parameterName: `/${namePrefix}/data-source-id`,
      // namePrefix is a CfnParameter token, so CDK cannot infer whether this
      // is a simple name or a path. It is a path.
      simpleName: false,
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

    const chatUrlOutput = new cdk.CfnOutput(this, 'ChatUrl', {
      value: cdk.Fn.join('', ['https://', fullDomain]),
      description: 'Chat URL (custom domain)',
      condition: hasCustomDomain,
    });
  }
}
