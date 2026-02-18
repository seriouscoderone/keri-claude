#!/usr/bin/env bash
set -euo pipefail

# Build frontend, synthesize CloudFormation template, and publish for Launch Stack button.
# Usage: ./publish-template.sh <s3-bucket-name> [region]
#
# Prerequisites:
#   - S3 bucket must exist and allow public reads (for CloudFormation to fetch assets)
#   - AWS credentials configured (default profile or AWS_PROFILE)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$INFRA_DIR/frontend"
CDK_OUT="/tmp/keri-chat-cdk-out"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <s3-bucket-name> [region]"
  echo "  s3-bucket-name: Public S3 bucket for template and assets"
  echo "  region: AWS region (default: us-east-1)"
  exit 1
fi

BUCKET="$1"
REGION="${2:-us-east-1}"
ASSET_PREFIX="latest"
TEMPLATE_KEY="keri-chat/template.yaml"

# ---------------------------------------------------------------
# 1. Build frontend
# ---------------------------------------------------------------

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm ci
npm run build

# ---------------------------------------------------------------
# 2. Synthesize with publishMode (bootstrapless synthesizer)
# ---------------------------------------------------------------

echo "Synthesizing CloudFormation template (publishMode)..."
cd "$INFRA_DIR"
rm -rf "$CDK_OUT"
npx cdk synth KeriChat \
  -c publishMode=true \
  -c assetBucket="$BUCKET" \
  -c assetPrefix="$ASSET_PREFIX" \
  -o "$CDK_OUT"

# ---------------------------------------------------------------
# 3. Upload assets to public S3 bucket
# ---------------------------------------------------------------
# CDK assets are either directories (need zipping) or .zip files.
# The template references them as s3://<bucket>/<prefix>/<hash>.zip
# (or without .zip for pre-zipped assets).

echo "Uploading assets to s3://$BUCKET/$ASSET_PREFIX/..."

for item in "$CDK_OUT"/asset.*; do
  [ -e "$item" ] || continue
  base=$(basename "$item")
  hash="${base#asset.}"

  if [ -d "$item" ]; then
    # Directory asset — zip and upload as <hash>.zip
    zip_file="/tmp/keri-chat-asset-${hash}.zip"
    (cd "$item" && zip -qr "$zip_file" .)
    echo "  Uploading ${hash}.zip (zipped from directory)"
    aws s3 cp "$zip_file" "s3://$BUCKET/$ASSET_PREFIX/${hash}.zip" \
      --region "$REGION" --content-type "application/zip"
    rm -f "$zip_file"
  elif [[ "$item" == *.zip ]]; then
    # Pre-zipped asset — strip .zip from hash (already in filename)
    hash_no_zip="${hash%.zip}"
    echo "  Uploading ${hash_no_zip} (pre-zipped)"
    aws s3 cp "$item" "s3://$BUCKET/$ASSET_PREFIX/${hash_no_zip}" \
      --region "$REGION" --content-type "application/zip"
  fi
done

# ---------------------------------------------------------------
# 4. Upload template
# ---------------------------------------------------------------

echo "Uploading template to s3://$BUCKET/$TEMPLATE_KEY..."
aws s3 cp "$CDK_OUT/KeriChat.template.json" "s3://$BUCKET/$TEMPLATE_KEY" \
  --region "$REGION" \
  --content-type "application/json"

# ---------------------------------------------------------------
# 5. Print Launch Stack URL
# ---------------------------------------------------------------

TEMPLATE_URL="https://$BUCKET.s3.$REGION.amazonaws.com/$TEMPLATE_KEY"
LAUNCH_URL="https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks/create/review?templateURL=$TEMPLATE_URL&stackName=KeriChat"

echo ""
echo "Template published: $TEMPLATE_URL"
echo ""
echo "Launch Stack URL:"
echo "$LAUNCH_URL"
echo ""
echo "Markdown badge:"
echo "[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)]($LAUNCH_URL)"

# Clean up
rm -rf "$CDK_OUT"
