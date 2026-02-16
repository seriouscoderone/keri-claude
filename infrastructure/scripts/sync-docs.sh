#!/usr/bin/env bash
set -euo pipefail

# Sync staging documents to S3 and trigger ingestion
# Usage: ./sync-docs.sh [--no-ingest]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STAGING_DIR="$REPO_ROOT/scripts/staging"

AWS_OPTS="--profile ${AWS_PROFILE:-personal} --region ${AWS_REGION:-us-west-2}"

if [ ! -d "$STAGING_DIR" ]; then
  echo "Error: staging directory not found at $STAGING_DIR"
  exit 1
fi

# Read config from SSM
BUCKET_NAME=$(aws $AWS_OPTS ssm get-parameter --name /keri-rag/document-bucket-name --query 'Parameter.Value' --output text)
KB_ID=$(aws $AWS_OPTS ssm get-parameter --name /keri-rag/knowledge-base-id --query 'Parameter.Value' --output text)
DS_ID=$(aws $AWS_OPTS ssm get-parameter --name /keri-rag/data-source-id --query 'Parameter.Value' --output text)

echo "Syncing $STAGING_DIR -> s3://$BUCKET_NAME/"

aws $AWS_OPTS s3 sync "$STAGING_DIR" "s3://$BUCKET_NAME/" \
  --exclude ".DS_Store" \
  --exclude "distill-*" \
  --exclude "*.py" \
  --delete

echo "Sync complete."

if [ "${1:-}" = "--no-ingest" ]; then
  echo "Skipping ingestion (--no-ingest)."
  exit 0
fi

echo "Starting ingestion job..."
JOB_ID=$(aws $AWS_OPTS bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --query 'ingestionJob.ingestionJobId' \
  --output text)

echo "Ingestion job started: $JOB_ID"
echo "Monitor: aws $AWS_OPTS bedrock-agent get-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID --ingestion-job-id $JOB_ID"
