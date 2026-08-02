#!/usr/bin/env bash
# Deploy the PUBLISHED Launch Stack template into a throwaway stack, verify it,
# and tear it down.
#
#   ./scripts/integration-test.sh --profile personal
#   ./scripts/integration-test.sh --profile sla --keep      # leave it up to poke at
#
# This exists because unit tests cannot catch the failures that only appear on a
# FRESH deploy — which is the only kind a Launch Stack user ever does. Real
# examples it has caught: a pinned Aurora version that stopped being creatable
# while the running cluster kept working, and Bedrock failing files because
# Aurora auto-paused underneath a long first ingestion.
#
# It runs in the SAME account as production. That is possible because NamePrefix
# is a CloudFormation parameter, so every account-unique name (Knowledge Base,
# WAF ACL/IPSet, SSM paths) is disjoint from the live stack's.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGION="${AWS_REGION:-us-east-1}"
KEEP=false
TEMPLATE_URL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --profile) export AWS_PROFILE="$2"; shift 2 ;;
    --keep)    KEEP=true; shift ;;
    --template-url) TEMPLATE_URL="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

AWS="aws --region $REGION"
PARAMS_FILE="$INFRA_DIR/parameters.json"

if [ -z "$TEMPLATE_URL" ]; then
  BUCKET=$(python3 -c "import json;print(json.load(open('$PARAMS_FILE')).get('publishBucket',''))" 2>/dev/null || echo "")
  [ -n "$BUCKET" ] || { echo "ERROR: no publishBucket in parameters.json and no --template-url" >&2; exit 1; }
  TEMPLATE_URL="https://$BUCKET.s3.$REGION.amazonaws.com/keri-chat/template.yaml"
fi

# Distinct per run so a leftover from a previous failure cannot collide. The
# prefix must satisfy the template's own [a-z][a-z0-9-]{2,30} pattern.
SUFFIX="$(date -u +%m%d%H%M)"
PREFIX="keri-chat-it${SUFFIX}"
STACK="KeriChatIT${SUFFIX}"

echo "=== Launch Stack integration test ==="
echo "  template : $TEMPLATE_URL"
echo "  stack    : $STACK"
echo "  prefix   : $PREFIX"
echo "  account  : $($AWS sts get-caller-identity --query Account --output text)"

# ---------------------------------------------------------------
# Teardown — registered before creation so a failure still cleans up
# ---------------------------------------------------------------
teardown() {
  local code=$?
  if $KEEP; then
    echo ""
    echo "--keep given; leaving $STACK in place. Delete it with:"
    echo "  $AWS cloudformation delete-stack --stack-name $STACK"
    exit $code
  fi

  echo ""
  echo "=== Teardown ==="

  # deleteDataSource refuses while a job is running, and that error is no longer
  # swallowed, so an in-flight ingestion fails the whole stack delete.
  local kb ds job
  kb=$($AWS ssm get-parameter --name "/$PREFIX/knowledge-base-id" --query Parameter.Value --output text 2>/dev/null || true)
  ds=$($AWS ssm get-parameter --name "/$PREFIX/data-source-id" --query Parameter.Value --output text 2>/dev/null || true)
  if [ -n "$kb" ] && [ -n "$ds" ]; then
    # Loop, don't stop once. The completion handler starts a sweep-up job when a
    # job finishes with failures, so a single stop races against a fresh start
    # and the delete then fails with "There is at least one running ingestion
    # job for this data source".
    local round
    for round in 1 2 3 4 5; do
      job=$($AWS bedrock-agent list-ingestion-jobs --knowledge-base-id "$kb" --data-source-id "$ds" \
        --filters '[{"attribute":"STATUS","operator":"EQ","values":["IN_PROGRESS"]}]' \
        --query 'ingestionJobSummaries[0].ingestionJobId' --output text 2>/dev/null || true)
      [ -n "$job" ] && [ "$job" != "None" ] || { [ "$round" -gt 1 ] && echo "  no ingestion running"; break; }
      echo "  stopping in-flight ingestion $job (round $round)"
      $AWS bedrock-agent stop-ingestion-job --knowledge-base-id "$kb" --data-source-id "$ds" \
        --ingestion-job-id "$job" >/dev/null 2>&1 || true
      sleep 30
    done
  fi

  echo "  deleting $STACK"
  $AWS cloudformation delete-stack --stack-name "$STACK" >/dev/null 2>&1 || true
  local s
  for _ in $(seq 1 60); do
    s=$($AWS cloudformation describe-stacks --stack-name "$STACK" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo GONE)
    case "$s" in
      GONE|DELETE_COMPLETE) echo "  stack deleted"; break ;;
      DELETE_FAILED) echo "  WARNING: stack delete FAILED — inspect manually" >&2; break ;;
    esac
    sleep 30
  done

  echo "  orphan sweep:"
  printf '    knowledge bases : %s\n' "$($AWS bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?starts_with(name,'$PREFIX')].knowledgeBaseId" --output text 2>/dev/null | sed 's/^$/none/')"
  printf '    aurora clusters : %s\n' "$($AWS rds describe-db-clusters --query "DBClusters[?contains(DBClusterIdentifier,'$(echo "$STACK" | tr 'A-Z' 'a-z')')].DBClusterIdentifier" --output text 2>/dev/null | sed 's/^$/none/')"
  printf '    ssm parameters  : %s\n' "$($AWS ssm get-parameters-by-path --path "/$PREFIX" --query 'length(Parameters)' --output text 2>/dev/null)"
  printf '    waf acls        : %s\n' "$($AWS wafv2 list-web-acls --scope CLOUDFRONT --query "WebACLs[?starts_with(Name,'$PREFIX')].Name" --output text 2>/dev/null | sed 's/^$/none/')"
  exit $code
}
trap teardown EXIT

# ---------------------------------------------------------------
# Create
# ---------------------------------------------------------------
CIDRS=$(python3 -c "import json;print(json.load(open('$PARAMS_FILE')).get('allowedIpCidrs','0.0.0.0/1,128.0.0.0/1'))")
cat > /tmp/it-params-$$.json <<JSON
[
  {"ParameterKey":"NamePrefix","ParameterValue":"$PREFIX"},
  {"ParameterKey":"AllowedIpCidrs","ParameterValue":"$CIDRS"},
  {"ParameterKey":"HostedZoneId","ParameterValue":""},
  {"ParameterKey":"HostedZoneDomainName","ParameterValue":""}
]
JSON

echo ""
echo "=== Creating (first-time ingestion of the full corpus takes 45-90 min) ==="
$AWS cloudformation create-stack --stack-name "$STACK" \
  --template-url "$TEMPLATE_URL" --capabilities CAPABILITY_IAM \
  --parameters "file:///tmp/it-params-$$.json" \
  --tags Key=purpose,Value=launch-stack-integration-test \
  --query StackId --output text
rm -f "/tmp/it-params-$$.json"

DEADLINE=$(( $(date +%s) + 9000 ))   # 2.5h — the stack's own ingestion budget is 2h
while :; do
  STATUS=$($AWS cloudformation describe-stacks --stack-name "$STACK" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo GONE)
  DONE=$($AWS cloudformation describe-stack-resources --stack-name "$STACK" --query 'length(StackResources[?ResourceStatus==`CREATE_COMPLETE`])' --output text 2>/dev/null || echo 0)
  echo "  [$(date -u +%H:%M:%S)] $STATUS ($DONE resources)"
  case "$STATUS" in
    CREATE_COMPLETE) break ;;
    ROLLBACK_*|*FAILED|GONE)
      echo ""
      echo "FAILED. Reasons:" >&2
      $AWS cloudformation describe-stack-events --stack-name "$STACK" \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
        --output text 2>/dev/null | grep -v 'cancelled' | head -5 >&2
      exit 1 ;;
  esac
  [ "$(date +%s)" -lt "$DEADLINE" ] || { echo "TIMEOUT waiting for stack" >&2; exit 1; }
  sleep 60
done

# ---------------------------------------------------------------
# Verify
# ---------------------------------------------------------------
echo ""
echo "=== Verify ==="
KB=$($AWS ssm get-parameter --name "/$PREFIX/knowledge-base-id" --query Parameter.Value --output text)
DS=$($AWS ssm get-parameter --name "/$PREFIX/data-source-id" --query Parameter.Value --output text)
BUCKET_T=$($AWS ssm get-parameter --name "/$PREFIX/document-bucket-name" --query Parameter.Value --output text)
echo "  knowledge base : $KB"

STATS=$($AWS bedrock-agent list-ingestion-jobs --knowledge-base-id "$KB" --data-source-id "$DS" \
  --max-results 1 --sort-by '{"attribute":"STARTED_AT","order":"DESCENDING"}' \
  --query 'ingestionJobSummaries[0].statistics' --output json)
echo "  ingestion      : $(echo "$STATS" | tr -d '\n ')"

FAILED_DOCS=$(echo "$STATS" | python3 -c "import json,sys;print(json.load(sys.stdin).get('numberOfDocumentsFailed',0))")
SCANNED=$(echo "$STATS" | python3 -c "import json,sys;print(json.load(sys.stdin).get('numberOfDocumentsScanned',0))")
EXPECTED=$($AWS s3 ls "s3://$BUCKET_T/" --recursive | wc -l | tr -d ' ')

rc=0
[ "$FAILED_DOCS" = "0" ] || { echo "  FAIL: $FAILED_DOCS document(s) failed to index" >&2; rc=1; }
[ "$SCANNED" = "$EXPECTED" ] || { echo "  FAIL: scanned $SCANNED but bucket holds $EXPECTED" >&2; rc=1; }

CF=$($AWS cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?contains(OutputKey,'Distribution')||contains(OutputKey,'CloudFront')].OutputValue" --output text | head -1)
if [ -n "$CF" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://${CF#https://}") || code=000
  # Also check IPv6 explicitly. The WAF allowlist is IPv4-only, so an
  # IPv6-enabled distribution 403s allowlisted users; production masked that by
  # having no AAAA record. A bare curl picks whichever family resolves first,
  # which makes the failure intermittent rather than obvious.
  code6=$(curl -6 -s -o /dev/null -w '%{http_code}' "https://${CF#https://}" 2>/dev/null || echo skipped)
  echo "  frontend       : HTTP $code (IPv6: $code6) ($CF)"
  [ "$code" = "200" ] || { echo "  FAIL: frontend did not return 200 over IPv4" >&2; rc=1; }
  case "$code6" in
    200|skipped|000) ;;
    *) echo "  FAIL: frontend returned $code6 over IPv6 — allowlist is IPv4-only?" >&2; rc=1 ;;
  esac
fi

echo ""
[ "$rc" -eq 0 ] && echo "=== PASS ===" || echo "=== FAIL ==="
exit $rc
