#!/usr/bin/env bash
# Gera o build no modo híbrido (Cognito + API real) e publica no S3/CloudFront da stack do Helio.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="${STACK_NAME:-helio}"
REGION="${AWS_REGION:-us-east-1}"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

BUCKET=$(output SiteBucketName)
DISTRIBUTION=$(output DistributionId)
CLIENT_ID=$(output UserPoolClientId)
URL=$(output DashboardUrl)

echo "==> Configuração do build (.env.production.local)"
cat > .env.production.local <<EOF
VITE_API_MODE=hybrid
VITE_COGNITO_REGION=$REGION
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
EOF

echo "==> Build"
npm run build

echo "==> Enviando para s3://$BUCKET"
# Arquivos com hash no nome: cache longo. O resto (index.html, service worker): sem cache.
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors
aws s3 sync dist "s3://$BUCKET" --exclude "assets/*" --delete \
  --cache-control "no-cache" --only-show-errors

echo "==> Invalidando o CloudFront"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" \
  --query Invalidation.Id --output text >/dev/null

echo "Publicado em $URL"
