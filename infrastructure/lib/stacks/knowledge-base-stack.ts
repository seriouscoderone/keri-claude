import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export interface KnowledgeBaseStackProps extends cdk.StackProps {
  clusterArn: string;
  secretArn: string;
  databaseName: string;
  tableName: string;
}

/**
 * Embedding model to dimension compatibility matrix.
 *
 * When deploying, ensure the EmbeddingDimension parameter is compatible
 * with the chosen EmbeddingModelId:
 *
 *   amazon.nova-2-multimodal-embeddings-v1:0  -> 256, 384, 1024, 3072
 *   amazon.titan-embed-image-v1        -> 256, 384, 1024
 *   cohere.embed-english-v3            -> 256, 512, 1024, 1536
 *   amazon.titan-embed-text-v2:0       -> 256, 512, 1024
 *
 * A CfnRule in this stack enforces compatibility at deploy time.
 */

const ALLOWED_MODELS = [
  'amazon.nova-2-multimodal-embeddings-v1:0',
  'amazon.titan-embed-image-v1',
  'cohere.embed-english-v3',
  'amazon.titan-embed-text-v2:0',
] as const;

const ALLOWED_DIMENSIONS = ['256', '384', '512', '1024', '1536', '3072'] as const;

export class KnowledgeBaseStack extends cdk.Stack {
  public readonly knowledgeBaseId: string;

  constructor(scope: Construct, id: string, props: KnowledgeBaseStackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // CfnParameters
    // ---------------------------------------------------------------

    const embeddingModelId = new cdk.CfnParameter(this, 'EmbeddingModelId', {
      type: 'String',
      default: 'amazon.titan-embed-text-v2:0',
      allowedValues: [...ALLOWED_MODELS],
      description: 'Bedrock embedding model ID for the knowledge base',
    });

    const embeddingDimension = new cdk.CfnParameter(this, 'EmbeddingDimension', {
      type: 'String',
      default: '1024',
      allowedValues: [...ALLOWED_DIMENSIONS],
      description: 'Embedding vector dimension (must be compatible with chosen model)',
    });

    // ---------------------------------------------------------------
    // Deploy-time validation via CfnRules
    // ---------------------------------------------------------------
    // CloudFormation rules enforce model/dimension compatibility at
    // deploy time (CfnParameter values are tokens at synth time so
    // we cannot validate in CDK code).

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

    // ---------------------------------------------------------------
    // S3 Document Bucket
    // ---------------------------------------------------------------

    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ---------------------------------------------------------------
    // IAM Role for Bedrock Knowledge Base
    // ---------------------------------------------------------------

    const kbRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for KERI RAG Bedrock Knowledge Base',
    });

    // S3 read access on document bucket
    documentBucket.grantRead(kbRole);

    // RDS Data API access for Aurora vector store
    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:DescribeDBClusters',
          'rds-data:BatchExecuteStatement',
          'rds-data:ExecuteStatement',
        ],
        resources: [props.clusterArn],
      }),
    );

    kbRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.secretArn],
      }),
    );

    // Bedrock InvokeModel on the embedding model
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

    // ---------------------------------------------------------------
    // Bedrock Knowledge Base (L1 CfnKnowledgeBase)
    // ---------------------------------------------------------------

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'keri-chat-knowledge-base',
      description: 'KERI ecosystem chat knowledge base',
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn,
        },
      },
      storageConfiguration: {
        type: 'RDS',
        rdsConfiguration: {
          resourceArn: props.clusterArn,
          credentialsSecretArn: props.secretArn,
          databaseName: props.databaseName,
          tableName: `bedrock_integration.${props.tableName}`,
          fieldMapping: {
            primaryKeyField: 'id',
            vectorField: 'embedding',
            textField: 'chunks',
            metadataField: 'metadata',
          },
        },
      },
    });

    // Ensure IAM policy is fully applied before KB creation validates RDS access
    const defaultPolicy = kbRole.node.findChild('DefaultPolicy').node.defaultChild as cdk.CfnResource;
    knowledgeBase.addDependency(defaultPolicy);

    this.knowledgeBaseId = knowledgeBase.attrKnowledgeBaseId;

    // ---------------------------------------------------------------
    // Bedrock Data Source — S3 with hierarchical chunking
    // ---------------------------------------------------------------

    const dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      name: 'keri-docs-v3',
      description: 'KERI specification and documentation source',
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
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
    });

    // ---------------------------------------------------------------
    // Ingestion Lambda
    // ---------------------------------------------------------------

    const ingestionFn = new lambda.NodejsFunction(this, 'IngestionHandler', {
      entry: path.join(__dirname, '../../lambda/ingestion-handler/index.ts'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.attrKnowledgeBaseId,
        DATA_SOURCE_ID: dataSource.attrDataSourceId,
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
            { kbId: knowledgeBase.attrKnowledgeBaseId },
          ),
        ],
      }),
    );

    // ---------------------------------------------------------------
    // EventBridge — daily ingestion schedule
    // ---------------------------------------------------------------

    const dailyRule = new events.Rule(this, 'DailyIngestionRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      description: 'Triggers KERI RAG ingestion job daily',
    });

    dailyRule.addTarget(new targets.LambdaFunction(ingestionFn));

    // ---------------------------------------------------------------
    // SSM Parameter exports
    // ---------------------------------------------------------------

    new ssm.StringParameter(this, 'KnowledgeBaseIdParam', {
      parameterName: '/keri-rag/knowledge-base-id',
      stringValue: knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID for KERI RAG',
    });

    new ssm.StringParameter(this, 'DocumentBucketNameParam', {
      parameterName: '/keri-rag/document-bucket-name',
      stringValue: documentBucket.bucketName,
      description: 'S3 bucket name for KERI RAG documents',
    });

    new ssm.StringParameter(this, 'DataSourceIdParam', {
      parameterName: '/keri-rag/data-source-id',
      stringValue: dataSource.attrDataSourceId,
      description: 'Bedrock Data Source ID for KERI RAG',
    });
  }
}
