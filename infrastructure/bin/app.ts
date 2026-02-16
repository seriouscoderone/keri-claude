#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VectorStoreStack } from '../lib/stacks/vector-store-stack';
import { KnowledgeBaseStack } from '../lib/stacks/knowledge-base-stack';
import { ChatStack } from '../lib/stacks/chat-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const vectorStore = new VectorStoreStack(app, 'KeriVectorStore', { env });

const kb = new KnowledgeBaseStack(app, 'KeriRagKB', {
  env,
  clusterArn: vectorStore.clusterArn,
  secretArn: vectorStore.secretArn,
  databaseName: vectorStore.databaseName,
  tableName: vectorStore.tableName,
});
kb.addDependency(vectorStore);

const chat = new ChatStack(app, 'KeriRagChat', {
  env,
  allowedIpCidrs: app.node.tryGetContext('allowedIpCidrs') ?? '73.65.208.155/32',
  hostedZoneId: app.node.tryGetContext('hostedZoneId') ?? 'Z0070723WLKQKTOACN5H',
  hostedZoneDomainName: app.node.tryGetContext('hostedZoneDomainName') ?? 'keri.host',
  chatSubdomain: app.node.tryGetContext('chatSubdomain') ?? 'chat',
});
chat.addDependency(kb);
