#!/usr/bin/env bash
# =============================================================================
# first-deploy.sh — Run from your LOCAL machine after `cdk deploy`.
#
# Prerequisites:
#   - AWS CLI configured
#   - CDK deployed (run: cd infra && npm install && npx cdk deploy)
#   - EC2 key pair created and .pem file available
#
# Usage:
#   bash scripts/first-deploy.sh <EC2_IP> <PATH_TO_KEY.pem>
#
# Example:
#   bash scripts/first-deploy.sh 54.123.45.67 ~/.ssh/my-key.pem
# =============================================================================
set -euo pipefail

EC2_IP="${1:?Usage: $0 <EC2_IP> <KEY.pem>}"
KEY_FILE="${2:?Usage: $0 <EC2_IP> <KEY.pem>}"
SSH_USER="${SSH_USER:-ubuntu}"
REMOTE="${SSH_USER}@${EC2_IP}"
SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=no"

echo "==> Waiting for EC2 to be ready..."
until $SSH "$REMOTE" "echo ok" 2>/dev/null; do sleep 5; done

echo "==> Copying project files to EC2..."
rsync -az --exclude node_modules --exclude .git --exclude dist \
  -e "ssh -i $KEY_FILE -o StrictHostKeyChecking=no" \
  . "$REMOTE:/opt/app/"

echo "==> Running deploy script on EC2..."
$SSH "$REMOTE" "
  export AWS_REGION=${AWS_REGION:-us-east-1}
  export S3_BUCKET_NAME=${S3_BUCKET_NAME:?Set S3_BUCKET_NAME env var}
  export DB_HOST=${DB_HOST:?Set DB_HOST env var (from CDK output DbEndpoint)}
  export PUBLIC_BASE_URL=${PUBLIC_BASE_URL:-http://${EC2_IP}}
  export USE_ANTHROPIC_DIRECT=${USE_ANTHROPIC_DIRECT:-false}
  export ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
  export ANTHROPIC_MODEL=${ANTHROPIC_MODEL:-claude-sonnet-4-6}
  export ANTHROPIC_FALLBACK_MODELS=${ANTHROPIC_FALLBACK_MODELS:-}
  export BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID:-amazon.nova-lite-v1:0}
  export BEDROCK_FALLBACK_MODEL_IDS=${BEDROCK_FALLBACK_MODEL_IDS:-}
  export YOUTUBE_API_KEY=${YOUTUBE_API_KEY:-}
  export VIMEO_ACCESS_TOKEN=${VIMEO_ACCESS_TOKEN:-}
  export STOCK_IMAGE_API_KEY=${STOCK_IMAGE_API_KEY:-}
  export AI_IMAGE_API_URL=${AI_IMAGE_API_URL:-}
  export AI_IMAGE_API_KEY=${AI_IMAGE_API_KEY:-}
  bash /opt/app/scripts/deploy.sh
"

echo ""
echo "✅  First deploy complete! Visit: http://${EC2_IP}"
