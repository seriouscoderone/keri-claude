#!/usr/bin/env bash
set -euo pipefail

# Sync staging documents to S3 and trigger ingestion
# Usage: ./sync-docs.sh [--no-ingest]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STAGING_DIR="$REPO_ROOT/scripts/staging"

AWS_OPTS="--profile ${AWS_PROFILE:-personal} --region ${AWS_REGION:-us-east-1}"

if [ ! -d "$STAGING_DIR" ]; then
  echo "Error: staging directory not found at $STAGING_DIR"
  exit 1
fi

# Read config from SSM
BUCKET_NAME=$(aws $AWS_OPTS ssm get-parameter --name /keri-chat/document-bucket-name --query 'Parameter.Value' --output text)
KB_ID=$(aws $AWS_OPTS ssm get-parameter --name /keri-chat/knowledge-base-id --query 'Parameter.Value' --output text)
DS_ID=$(aws $AWS_OPTS ssm get-parameter --name /keri-chat/data-source-id --query 'Parameter.Value' --output text)

echo "Syncing $STAGING_DIR -> s3://$BUCKET_NAME/"

# Patterns are matched against the whole key, so a bare ".DS_Store" only
# excludes it at the top level — a Finder visit to staging/images/ would
# otherwise upload one and have Bedrock index it as a document. Leading '*'
# makes each pattern match at any depth, matching the find used for the
# expected-count check below.
aws $AWS_OPTS s3 sync "$STAGING_DIR" "s3://$BUCKET_NAME/" \
  --exclude "*.DS_Store" \
  --exclude "*distill-*" \
  --exclude "*.py" \
  --delete

echo "Sync complete."

if [ "${1:-}" = "--no-ingest" ]; then
  echo "Skipping ingestion (--no-ingest)."
  exit 0
fi

echo "Starting ingestion job..."

# Two things make a naive start-ingestion-job fail here, and this script runs
# under `set -e`, so either one kills it:
#
#   1. Bedrock permits one active job per data source. Running this straight
#      after ./scripts/deploy.sh collides with the deploy-time ingestion.
#   2. Aurora rejects the call outright while resuming from auto-pause. The
#      Lambda path handles this via retryWhileWaking; this script calls the API
#      directly, so it needs its own retry.
JOB_ID=""
for attempt in $(seq 1 60); do
  if out=$(aws $AWS_OPTS bedrock-agent start-ingestion-job \
      --knowledge-base-id "$KB_ID" \
      --data-source-id "$DS_ID" \
      --query 'ingestionJob.ingestionJobId' \
      --output text 2>&1); then
    JOB_ID="$out"
    break
  fi

  case "$out" in
    *"is resuming after being auto-paused"*)
      echo "  [$attempt] Aurora is resuming, retrying in 5s..." ;;
    *ConflictException*|*"ongoing ingestion job"*|*"already in progress"*)
      echo "  [$attempt] another ingestion job is active, waiting 5s..." ;;
    *)
      echo "$out" >&2
      exit 1 ;;
  esac
  sleep 5
done

if [ -z "$JOB_ID" ]; then
  echo "ERROR: could not start an ingestion job after 60 attempts." >&2
  exit 1
fi

echo "Ingestion job started: $JOB_ID"
echo "Waiting for completion..."

for _ in $(seq 1 120); do
  STATUS=$(aws $AWS_OPTS bedrock-agent get-ingestion-job \
    --knowledge-base-id "$KB_ID" --data-source-id "$DS_ID" \
    --ingestion-job-id "$JOB_ID" --query 'ingestionJob.status' --output text)
  case "$STATUS" in
    COMPLETE)
      echo "Ingestion COMPLETE."
      aws $AWS_OPTS bedrock-agent get-ingestion-job \
        --knowledge-base-id "$KB_ID" --data-source-id "$DS_ID" \
        --ingestion-job-id "$JOB_ID" --query 'ingestionJob.statistics' --output json
      # Expected scanned count is every file the sync uploaded, images included.
      echo "Expected documents scanned: $(find "$STAGING_DIR" -type f \
        ! -name '.DS_Store' ! -name 'distill-*' ! -name '*.py' | wc -l | tr -d ' ')"
      exit 0 ;;
    FAILED|STOPPED)
      echo "ERROR: ingestion $STATUS" >&2
      aws $AWS_OPTS bedrock-agent get-ingestion-job \
        --knowledge-base-id "$KB_ID" --data-source-id "$DS_ID" \
        --ingestion-job-id "$JOB_ID" --query 'ingestionJob.failureReasons' --output json >&2
      exit 1 ;;
  esac
  sleep 15
done

echo "WARNING: ingestion still running after 30 minutes; check manually:" >&2
echo "  aws $AWS_OPTS bedrock-agent get-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID --ingestion-job-id $JOB_ID" >&2
