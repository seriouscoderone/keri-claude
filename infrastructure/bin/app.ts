#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { KeriChatStack } from '../lib/stacks/keri-chat-stack';

const app = new cdk.App();

// Load parameters.json into CDK context (CLI -c flags still take precedence)
const parametersPath = path.join(__dirname, '..', 'parameters.json');
const publishMode = app.node.tryGetContext('publishMode') === 'true';

if (!fs.existsSync(parametersPath) && !publishMode) {
  console.error(
    '\n' +
    '  ERROR: infrastructure/parameters.json not found.\n' +
    '\n' +
    '  To get started:\n' +
    '    cp parameters.template.json parameters.json\n' +
    '\n' +
    '  Then edit parameters.json with your deployment settings.\n' +
    '  See README.md for parameter descriptions.\n'
  );
  process.exit(1);
}

if (fs.existsSync(parametersPath)) {
  const params = JSON.parse(fs.readFileSync(parametersPath, 'utf-8'));
  for (const [key, value] of Object.entries(params)) {
    if (app.node.tryGetContext(key) === undefined) {
      app.node.setContext(key, value);
    }
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('region') ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

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
