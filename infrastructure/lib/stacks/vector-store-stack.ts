import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';

export class VectorStoreStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly clusterArn: string;
  public readonly secretArn: string;
  public readonly databaseName: string;
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const databaseName = 'bedrock_kb_db';
    const tableName = 'bedrock_kb';

    // ---------------------------------------------------------------
    // VPC — isolated subnets only (no NAT Gateway)
    // ---------------------------------------------------------------

    this.vpc = new ec2.Vpc(this, 'Vpc', {
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

    // ---------------------------------------------------------------
    // Aurora Serverless v2 — PostgreSQL 16.6 with pgvector
    // ---------------------------------------------------------------

    const cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('bedrock_admin'),
      defaultDatabaseName: databaseName,
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      enableDataApi: true,
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.clusterArn = cluster.clusterArn;
    this.secretArn = cluster.secret!.secretArn;
    this.databaseName = databaseName;
    this.tableName = tableName;

    // ---------------------------------------------------------------
    // DB Init Custom Resource — runs SQL via RDS Data API
    // ---------------------------------------------------------------

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
      },
    });

    dbInitResource.node.addDependency(cluster);
  }
}
