#!/usr/bin/env bash
set -euo pipefail

# Synthesize CloudFormation template and publish for Launch Stack button
# Usage: ./publish-template.sh <s3-bucket-name> [region]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <s3-bucket-name> [region]"
  echo "  s3-bucket-name: Public S3 bucket for CloudFormation template"
  echo "  region: AWS region (default: us-east-1)"
  exit 1
fi

BUCKET="$1"
REGION="${2:-us-east-1}"
TEMPLATE_KEY="keri-rag/template.yaml"

echo "Synthesizing CloudFormation template..."
cd "$INFRA_DIR"
npx cdk synth --no-staging > /tmp/keri-rag-template.yaml

echo "Uploading template to s3://$BUCKET/$TEMPLATE_KEY"
aws s3 cp /tmp/keri-rag-template.yaml "s3://$BUCKET/$TEMPLATE_KEY" \
  --region "$REGION" \
  --content-type "application/x-yaml"

TEMPLATE_URL="https://$BUCKET.s3.$REGION.amazonaws.com/$TEMPLATE_KEY"
LAUNCH_URL="https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks/create/review?templateURL=$TEMPLATE_URL&stackName=KeriRag"

echo ""
echo "Template published: $TEMPLATE_URL"
echo ""
echo "Launch Stack URL:"
echo "$LAUNCH_URL"
echo ""
echo "Markdown badge:"
echo "[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)]($LAUNCH_URL)"
