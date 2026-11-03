# Production Deployment

Production runs entirely on AWS: one CloudFront distribution serves the React app from a private S3
bucket and proxies `/api/*` to the API Gateway HTTP API. The database, media bucket, Lambda functions
and emails live in `eu-west-1`; the CloudFront TLS certificate is issued in `us-east-1`.

`nailsav.podinario.rs` is a CNAME in cPanel, so DNS and existing mail remain on cPanel.

## 1. Prerequisites

- AWS credentials with permission to deploy the backend stack, ACM, S3 and CloudFront.
- `backend/.env.prod` with `JWT_SECRET`, `SES_FROM_EMAIL`, `MEDIA_BUCKET`,
  `CORS_ORIGIN=https://nailsav.podinario.rs`, `FRONTEND_DOMAIN=nailsav.podinario.rs` and
  `CERTIFICATE_ARN`.
- An issued ACM certificate for `nailsav.podinario.rs` in **us-east-1**. DNS validation is done by
  adding the CNAME ACM provides to cPanel.

Certificate setup, once per domain:

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name nailsav.podinario.rs \
  --validation-method DNS

aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn <certificate-arn> \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

Add the returned CNAME in cPanel, wait until `Status` is `ISSUED`, then set `CERTIFICATE_ARN` in
`backend/.env.prod`.

## 2. First deployment

From the repository root:

```bash
npm run deploy:prod
```

This deploys the backend stack first, then builds the frontend, uploads `dist/` to the private S3
bucket, and invalidates CloudFront.

After the stack exists, read the distribution domain:

```bash
aws cloudformation describe-stacks \
  --stack-name nail-booking-backend-prod \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendDistributionDomain'].OutputValue | [0]" \
  --output text
```

Add one more CNAME in cPanel:

| Name | Target |
|---|---|
| `nailsav` | `<distribution-id>.cloudfront.net` |

Do not create an A record for `nailsav`; the CNAME must be the only record for that hostname.

## 3. Create the production admin

The seed script is blocked for deployed tables. Use `resetAdmin` with the production env file and
AWS enabled:

```bash
cd backend
IS_OFFLINE=false DOTENV_CONFIG_PATH=.env.prod \
  ADMIN_EMAIL=admin@nails.com ADMIN_PASSWORD='<strong password>' \
  npx ts-node -r tsconfig-paths/register src/scripts/resetAdmin.ts prod
```

Read the resulting admin item back from DynamoDB and verify the new password against the stored
bcrypt hash. Do not trust only the script's success message.

## 4. Frontend-only releases

```bash
npm run frontend:deploy --workspace=backend
```

The script rebuilds the frontend, uploads hashed assets, uploads `index.html` last, and starts a
CloudFront invalidation.

## 5. Checks

```bash
curl -I https://nailsav.podinario.rs
curl -i https://nailsav.podinario.rs/api/media
```

Expected:

- the site returns the SPA over HTTPS;
- `/api/media` returns the API response, not the SPA HTML;
- no request is served from the API Gateway URL directly;
- `/api/*` responses never appear in the CloudFront cache.

Log in through the browser and confirm `accessToken` is set as `HttpOnly; Secure; SameSite=Lax`
with `Path=/`.

## 6. Cost controls

- Create an AWS Budget with alerts at $5 and $10.
- Set CloudWatch log retention to 14 or 30 days; do not leave it at "Never expire".
- CloudFront's current Free plan covers 1M requests and 100 GB per month. Keep the distribution on
  the cheapest plan that fits actual traffic.
- Media images are served through presigned S3 URLs, so CloudFront caching them is not required.
