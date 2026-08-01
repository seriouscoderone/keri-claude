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

# Asset keys are content hashes, so an object that already exists is by
# definition identical. Skipping those keeps republishing cheap enough to run
# on every deploy — a full upload is ~116MB, and only changed assets move.
already_present() {
  aws s3api head-object --bucket "$BUCKET" --key "$1" --region "$REGION" >/dev/null 2>&1
}

uploaded=0
skipped=0

for item in "$CDK_OUT"/asset.*; do
  [ -e "$item" ] || continue
  base=$(basename "$item")
  hash="${base#asset.}"

  if [ -d "$item" ]; then
    # Directory asset — zip and upload as <hash>.zip
    key="$ASSET_PREFIX/${hash}.zip"
    if already_present "$key"; then
      echo "  Skipping ${hash}.zip (unchanged)"
      skipped=$((skipped + 1))
      continue
    fi
    zip_file="/tmp/keri-chat-asset-${hash}.zip"
    (cd "$item" && zip -qr "$zip_file" .)
    echo "  Uploading ${hash}.zip (zipped from directory)"
    aws s3 cp "$zip_file" "s3://$BUCKET/$key" \
      --region "$REGION" --content-type "application/zip" --only-show-errors
    rm -f "$zip_file"
    uploaded=$((uploaded + 1))
  elif [[ "$item" == *.zip ]]; then
    # Pre-zipped asset — strip .zip from hash (already in filename)
    hash_no_zip="${hash%.zip}"
    key="$ASSET_PREFIX/${hash_no_zip}"
    if already_present "$key"; then
      echo "  Skipping ${hash_no_zip} (unchanged)"
      skipped=$((skipped + 1))
      continue
    fi
    echo "  Uploading ${hash_no_zip} (pre-zipped)"
    aws s3 cp "$item" "s3://$BUCKET/$key" \
      --region "$REGION" --content-type "application/zip" --only-show-errors
    uploaded=$((uploaded + 1))
  fi
done

echo "  Assets: $uploaded uploaded, $skipped unchanged"

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

# ---------------------------------------------------------------
# 4b. Prune assets the new template no longer references
# ---------------------------------------------------------------
# Publishing now runs on every deploy, and each corpus change re-hashes the
# ~96MB document bundle, so without this the public bucket grows without bound.
# Safe only after the template upload above succeeded: the template key is
# overwritten in place, so anything it no longer references is unreachable.

echo "Pruning unreferenced assets..."

# Scan the raw template for ANY occurrence of an asset key, rather than looking
# under specific property names. Asset keys appear under at least two different
# properties — Lambda code uses "S3Key", but BucketDeployment uses
# "SourceObjectKeys" — and matching only the former deleted the 96MB document
# bundle while reporting success (2026-08-01). A generic scan cannot miss a
# property that some future construct introduces.
REFERENCED=$(python3 -c "
import re
t = open('$CDK_OUT/KeriChat.template.json').read()
print('\n'.join(sorted(set(re.findall(r'$ASSET_PREFIX/[A-Za-z0-9._-]+', t)))))
")

if [ -z "$REFERENCED" ]; then
  echo "  ERROR: no asset keys found in the template — refusing to prune." >&2
  exit 1
fi

pruned=0
while read -r key; do
  [ -n "$key" ] || continue
  if ! grep -qxF "$key" <<< "$REFERENCED"; then
    aws s3 rm "s3://$BUCKET/$key" --region "$REGION" --only-show-errors
    echo "  Pruned $(basename "$key")"
    pruned=$((pruned + 1))
  fi
done < <(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$ASSET_PREFIX/" \
  --query 'Contents[].Key' --output text --region "$REGION" | tr '\t' '\n')

echo "  Pruned $pruned unreferenced asset(s)"

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
