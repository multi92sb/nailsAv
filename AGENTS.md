# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a nail salon appointment booking platform (`nailsAv`) using npm workspaces with two packages:
- **backend** (port 4000): Serverless Framework + serverless-offline, DynamoDB, JWT auth
- **frontend** (port 3000): React 18 + Vite, Tailwind CSS

### Starting services

All commands assume the working directory is `/workspace`.

1. **DynamoDB Local** (requires Java): `cd backend && npm run dynamo:start` (port 8000)
2. **Create table** (once): `cd backend && npm run dynamo:create-table`
3. **Seed data** (once): `cd backend && npm run dynamo:seed`
4. **Backend**: `cd backend && set -a && source .env && set +a && npx serverless offline --stage dev` (port 4000)
5. **Frontend**: `cd frontend && npm run dev` (port 3000)

### Non-obvious caveats

- The Serverless Framework does **not** auto-load `.env` files. You must `source .env` (with `set -a`) before running `serverless offline`, or the `${env:...}` variables in `serverless.yml` will fail to resolve.
- You must pass `--stage dev` to `serverless offline` so the table name resolves to `NailBooking-dev` (matching what `createTable.ts` and `seed.ts` create). The default stage is `stage`, which resolves to `NailBooking-stage`.
- The backend `.env` must have `IS_OFFLINE=true` and `TABLE_NAME=NailBooking-dev` for local DynamoDB access.
- DynamoDB Local requires the JAR to be downloaded into `backend/dynamodb-local/`. This directory is gitignored. Download from: `https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz`
- Backend TypeScript has pre-existing type errors in `src/utils/jwt.ts` (jsonwebtoken types). This is harmless because `serverless-esbuild` skips type checking.
- No automated tests exist yet in either package (Jest and Vitest are configured but no test files).
- Seeded admin credentials: `admin@nails.com` / `admin123` (role: ADMIN).

### Lint / Type-check / Test

- **Frontend type-check**: `cd frontend && npx tsc --noEmit` (passes clean)
- **Backend type-check**: `cd backend && npx tsc --noEmit` (has pre-existing errors in jwt.ts)
- **Frontend tests**: `cd frontend && npx vitest run` (no test files yet)
- **Backend tests**: `cd backend && npx jest --passWithNoTests` (no test files yet)
