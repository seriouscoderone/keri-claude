#!/usr/bin/env bash
set -euo pipefail

# Build frontend and deploy the KeriChat stack using parameters.json.
# Usage: ./scripts/deploy.sh [--profile <aws-profile>] [extra cdk args...]
#
# Examples:
#   ./scripts/deploy.sh                          # default AWS profile
#   ./scripts/deploy.sh --profile personal       # named profile
#   ./scripts/deploy.sh --profile personal --hotswap

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$INFRA_DIR/frontend"

# Parse --profile flag (pass through to both AWS CLI env and CDK)
CDK_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      export AWS_PROFILE="$2"
      CDK_ARGS+=("--profile" "$2")
      shift 2
      ;;
    *)
      CDK_ARGS+=("$1")
      shift
      ;;
  esac
done

# ---------------------------------------------------------------
# 1. Build frontend
# ---------------------------------------------------------------
echo "Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build
echo "Frontend built → $FRONTEND_DIR/dist"

# ---------------------------------------------------------------
# 2. Read parameters.json and pass as --parameters
# ---------------------------------------------------------------
PARAMS_FILE="$INFRA_DIR/parameters.json"
if [ ! -f "$PARAMS_FILE" ]; then
  echo "ERROR: $PARAMS_FILE not found."
  echo "  cp parameters.template.json parameters.json"
  exit 1
fi

# Extract CfnParameter-mapped values and pass them explicitly
# so CloudFormation always picks up the latest values on updates.
PARAM_FLAGS=()
add_param() {
  local val
  val=$(python3 -c "import json,sys; d=json.load(open('$PARAMS_FILE')); print(d.get('$1',''))" 2>/dev/null || echo "")
  if [ -n "$val" ]; then
    PARAM_FLAGS+=("--parameters" "$1=$val")
  fi
}

# Map parameters.json keys to CfnParameter names (PascalCase)
# Uses a simple loop instead of associative arrays for bash 3.2 (macOS) compatibility.
for pair in \
  hostedZoneId:HostedZoneId \
  hostedZoneDomainName:HostedZoneDomainName \
  chatSubdomain:ChatSubdomain \
  allowedIpCidrs:AllowedIpCidrs \
  embeddingModelId:EmbeddingModelId \
  embeddingDimension:EmbeddingDimension \
  lambdaConcurrencyLimit:LambdaConcurrencyLimit \
  billingAlarmThreshold:BillingAlarmThreshold \
; do
  json_key="${pair%%:*}"
  cfn_name="${pair##*:}"
  val=$(python3 -c "import json; d=json.load(open('$PARAMS_FILE')); v=d.get('$json_key',''); print(v if v != 0 else str(v))" 2>/dev/null || echo "")
  if [ -n "$val" ]; then
    PARAM_FLAGS+=("--parameters" "$cfn_name=$val")
  fi
done

# ---------------------------------------------------------------
# 3. Deploy
# ---------------------------------------------------------------
cd "$INFRA_DIR"
echo "Deploying KeriChat..."
npx cdk deploy --require-approval never "${PARAM_FLAGS[@]}" "${CDK_ARGS[@]}"
