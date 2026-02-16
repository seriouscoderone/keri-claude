#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { KeriChatStack } from '../lib/stacks/keri-chat-stack';

const app = new cdk.App();

// Load parameters.json into CDK context (CLI -c flags still take precedence)
const parametersPath = path.join(__dirname, '..', 'parameters.json');
if (fs.existsSync(parametersPath)) {
  const params = JSON.parse(fs.readFileSync(parametersPath, 'utf-8'));
  for (const [key, value] of Object.entries(params)) {
    if (app.node.tryGetContext(key) === undefined) {
      app.node.setContext(key, value);
    }
  }
} else {
  console.warn(
    'WARNING: infrastructure/parameters.json not found.\n' +
    'Copy parameters.template.json to parameters.json and fill in your values.\n' +
    'Deploy will continue but domain/certificate configuration may be missing.'
  );
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const publishMode = app.node.tryGetContext('publishMode') === 'true';

if (publishMode) {
  const assetBucket = app.node.tryGetContext('assetBucket');
  const assetPrefix = app.node.tryGetContext('assetPrefix') ?? 'latest';

  new KeriChatStack(app, 'KeriChat', {
    synthesizer: new BootstraplessStackSynthesizer({
      fileAssetBucketName: assetBucket,
      fileAssetPrefix: `${assetPrefix}/`,
    }),
  });
} else {
  new KeriChatStack(app, 'KeriChat', { env });
}
