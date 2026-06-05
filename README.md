# Local Setup Notes

## Overview

This document summarizes the local development setup completed so far for the `nailsAv` project, including DynamoDB Local, DynamoDB Admin, seed data, admin authentication, and mobile/APK-related tips.

## What Was Set Up

### 1. DynamoDB Local without Docker

To reduce RAM usage and avoid Docker-related instability, DynamoDB Local was configured to run directly on the machine instead of inside Docker.

Current local endpoint:

- `http://localhost:8000`

### 2. DynamoDB Admin UI

`dynamodb-admin` was configured to inspect local DynamoDB tables and items in the browser.

Current admin UI:

- `http://localhost:8001`

### 3. Backend DynamoDB client

The backend uses the AWS SDK v3 client and automatically points to local DynamoDB when running offline.

Relevant file:

- `backend/src/db/client.ts`

Important environment values:

- `IS_OFFLINE=true`
- `AWS_REGION=eu-west-1`
- `TABLE_NAME=NailBooking-dev`

### 4. Table creation and seed

The local DynamoDB table was created and seeded with:

- an admin user
- slot data for upcoming working days

Relevant files:

- `backend/src/scripts/createTable.ts`
- `backend/src/scripts/seed.ts`

### 5. Admin seed user

The seed script creates an admin user if it does not already exist.

Seeded admin credentials:

- Email: `admin@nails.com`
- Password: `admin123`
- Role: `ADMIN`

Important behavior:

- If the admin user already exists, the seed script does not overwrite it.

### 6. Frontend admin flow

The frontend admin panel currently uses a one-step authentication flow:

1. Standard user login
2. Access is granted to admin pages if the logged-in user role is `ADMIN`

Important detail:

- The normal user token is stored in `localStorage`
- Admin route protection checks `token` + `user.role === 'ADMIN'`

Relevant files:

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/AdminRoute.tsx`

The `/admin/login` endpoint and `AdminLoginPage` still exist as an optional extra verification flow, but they are not required for entering admin routes.

### 7. Database Repositories

To decouple business logic from raw AWS DynamoDB details, the database access is refactored into entity-specific repositories inside `backend/src/db/repositories/`:

- [userRepository.ts](file:///c:/gitHubBrame/nailsAv/backend/src/db/repositories/userRepository.ts) – Handles user registration, profile queries, role updates, and scans.
- [slotRepository.ts](file:///c:/gitHubBrame/nailsAv/backend/src/db/repositories/slotRepository.ts) – Handles slot queries, deletions, batch creation, and time updating transactions.
- [bookingRepository.ts](file:///c:/gitHubBrame/nailsAv/backend/src/db/repositories/bookingRepository.ts) – Handles booking queries, transactions for creation, cancellation, status updates, and reschedule logic.

Unit tests in `backend/tests/` mock these repository functions instead of low-level DynamoDB clients to keep tests resilient and easy to read.

## Useful Commands

Run these from the `backend` folder:

```bash
npm run dynamo:start
npm run dynamo:admin
npm run dynamo:create-table
npm run dynamo:seed
npm run dev
```

## Local Verification Checklist

### Backend

- API should run on `http://localhost:4000`

### Admin login test

Use:

- `POST http://localhost:4000/login`

Request body:

```json
{
  "email": "admin@nails.com",
  "password": "admin123"
}
```

Expected successful response:

- `token`
- `user.userId = admin`
- `user.role = ADMIN`

### Optional admin verification endpoint test

Use:

- `POST http://localhost:4000/admin/login`

Request body:

```json
{
  "email": "admin@nails.com",
  "password": "admin123"
}
```

Expected successful response:

- `token`
- `user.userId = admin`
- `user.role = ADMIN`

### DynamoDB Admin verification

Open:

- `http://localhost:8001`

Check that the seeded admin item exists with:

- `PK = USER#admin`
- `SK = PROFILE`
- `email = admin@nails.com`
- `role = ADMIN`

## Notes and Caveats

- The seed script does not update an existing admin record.
- If an old or broken admin record already exists, delete only that item and run the seed again.
- Public signup creates only `USER` accounts.
- Admin access is granted by role after normal login (`role = ADMIN`).
