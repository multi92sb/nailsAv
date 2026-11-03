# Production Readiness Review — 2026-10-30

**Verdict: not ready for production yet.** The core booking flow works end to end locally, but there is one hard build blocker and several issues that will break or degrade things once deployed to AWS.

## What was tested

| Area | Result |
|---|---|
| Backend unit tests (jest) | ✅ 21/21 pass |
| Backend typecheck (`tsc --noEmit`) | ✅ clean |
| Frontend tests (vitest) | ✅ 6/6 pass |
| Frontend production build (`npm run build`) | ❌ **fails** (TS error) |
| `npm audit --omit=dev` | ⚠️ 3 moderate (react-router-dom) |
| Browser: register → home | ✅ |
| Browser: pick date → slot → confirm booking | ✅ |
| Browser: My Appointments → cancel (with confirm dialog) | ✅ slot released, booking shows Cancelled |
| Browser: admin step-up as normal user | ✅ rejected ("Admin access required") |
| Browser: admin login → Users page | ✅ |
| Browser: admin page reload / direct URL | ❌ bounced back to admin login |
| Browser: gallery | ⚠️ shows "No photos yet" — actually a 500 (missing S3 bucket) |
| API: login brute force | ✅ 429 after 4 failures |
| API: non-admin calling `GET /users` | ✅ 403 |
| API: book non-existent slot / invalid date | ✅ rejected (but with a misleading message) |
| Mobile layout | ⚠️ not verified (screenshot came back blank) |

## Update — fixed in code

- #1 frontend build: fixed (`npm run build` passes).
- #2 email delivery: `createBooking` and `adminModifyBooking` now await emails (failures logged, request still succeeds).
- #7 admin reload: `GET /me` now returns `adminVerified`, and the frontend restores the admin session on load. Verified in the browser.

### Update — 2026-11-03

- #8 gallery errors: `getMedia` now treats a missing or unconfigured `MEDIA_BUCKET` as "no S3 photos"
  instead of a 500, and `GalleryPage` shows an error with a retry button on real failures.
  Covered by `backend/tests/handlers/getMedia.test.ts`.
- #4 (partly) cookies: `Secure` is now set on every deployed stage, not only `prod`. The
  same-site hosting decision is still open.
- #6 weak admin password: `admin:reset` refuses the default password on any stage other than
  `dev`, `seed` refuses to run against a `-stage`/`-prod` table, and the README no longer presents
  the seeded credentials as usable outside local development.
- #15 data safety: `NailBookingTable` and `MediaBucket` carry `DeletionPolicy: Retain`, the table
  has point-in-time recovery enabled, and the media bucket blocks all public access.

Still open: #3 (SES production access), #4 (same-site domain setup), #5 (frontend hosting) are
AWS/ops tasks, plus #14 log retention and monitoring.

## Blockers (must fix before deploy)

1. **Frontend build fails.** `frontend/src/pages/GalleryPage.tsx:7-20` declares a local `MediaItem { key: string }` but `api.getMedia()` returns `GalleryItem[]` where `key` is optional. Fix: use `GalleryItem` from `apiClient.ts` and render by `id`/`url`. Without this there is no `dist/` to deploy.

2. **Confirmation email is "fire and forget" inside Lambda** (`backend/src/handlers/createBooking.ts:64-67`). Once the handler returns, Lambda freezes the process, so the email often never sends. `await` it (wrapped in try/catch so failure doesn't fail the booking), or push to SQS. Check other handlers for the same pattern.

3. **SES is in sandbox mode.** Locally SES rejected the confirmation email: "Email address is not verified". In sandbox, SES only delivers to verified addresses. Request SES production access for eu-west-1 and verify the sending domain (DKIM/SPF) for `SES_FROM_EMAIL`.

4. **Cross-site cookies in production.** Auth is cookie-based with `SameSite=Lax` (`backend/src/utils/cookies.ts`). If the frontend is served from a different *site* than the API (for example a CloudFront/Amplify domain vs `*.execute-api.amazonaws.com`), browsers will not send the cookies on `fetch` and **every authenticated call will 401**. Pick one:
   - Serve the API on a custom domain under the same registrable domain (`app.example.com` + `api.example.com`); recommended. Or
   - Proxy `/api/*` through the same CloudFront distribution as the frontend.
   Also note `Secure` is only added when `APP_STAGE === 'prod'`; add it for `stage` too since it's HTTPS.

5. **No frontend hosting or infra defined.** `serverless.yml` only deploys the API. You need S3 + CloudFront (or Amplify) for `frontend/dist`, SPA fallback (403/404 → `index.html`), a custom domain + ACM cert, and `VITE_API_URL` set at build time.

6. **Seeded admin uses a weak, documented password** (`admin@nails.com` / `admin123`, in README and `seed.ts`). Never run the seed against prod; create the prod admin with `npm run admin:reset` and a strong password, and remove the credentials from the README.

## Should fix before launch

7. **Admin session doesn't survive a reload.** `adminVerified` is only React state (`frontend/src/context/AuthContext.tsx:35`), so any refresh or deep link to `/admin/bookings` sends the admin back to re-enter the password, even though the `adminAccessToken` cookie is still valid. Restore it on load (for example a `GET /admin/session` check, or have `/me` report the token type).

8. **Gallery hides server errors.** `GET /media` returns 500 when the bucket is missing/empty and the UI shows "No photos yet". Make `getMedia` return `[]` when there is nothing, and show an error state in the UI on real failures. Create/populate the media bucket (or run the Instagram sync) for prod.

9. **Misleading booking errors.** Invalid date (`2026-99-99`) or unknown `slotId` returns "This slot is no longer available". Validate real dates/times and reject bookings in the past server-side.

10. **Reminder job scans the whole table** (`bookingRepository.scanBookingsForReminder`). Fine at small scale, but it should query the `BookingByDate` GSI instead; it's cheaper and doesn't miss items beyond the 1 MB scan page (currently no pagination, so reminders silently get dropped as data grows). The same pagination gap applies to the other `Query` calls.

11. **Dependencies:** run `npm audit fix` (react-router-dom moderate advisories) and `npx update-browserslist-db@latest`.

12. **Secrets & config:** `backend/.env.prod` exists locally. It's git-ignored (good); move prod secrets (`JWT_SECRET`, Twilio, Instagram token) into SSM Parameter Store / Secrets Manager rather than plain Lambda env vars. Make sure `CORS_ORIGIN` is the real prod domain.

## Operational gaps (before or right after launch)

13. **No CI.** Add a pipeline that runs backend tests + typecheck + frontend build on every PR. Blocker #1 would have been caught automatically.
14. **Monitoring:** CloudWatch alarms on Lambda errors/throttles and API 5xx, log retention on log groups (currently infinite by default), SES bounce/complaint handling.
15. **Data safety:** enable DynamoDB point-in-time recovery and `DeletionPolicy: Retain` on the table and media bucket so a `serverless remove` can't wipe prod data.
16. **Test coverage:** only 6 of ~22 handlers have tests; there are no tests for cancel, admin modify booking, slots generation, or auth/authorizer. Add an end-to-end smoke test (Playwright) for register → book → cancel.
17. **Legal/UX:** privacy policy / GDPR notice (you store names, emails, phones), and a "forgot password" flow (none exists today).

## Local dev notes found during testing

- `npm run dynamo:start` failed on this machine with a Java `UnixDomainSockets ... Invalid argument: connect` error and left a half-started `java.exe` holding port 8000. Workaround: set `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<short temp dir>`.
- Running offline still calls **real AWS** SES and S3 with your local credentials (only DynamoDB is local), so local test bookings try to send real emails.

## Suggested order

1 → 2 → 4/5 (decide hosting + domain) → 3 → 6 → 7 → 8–12 → 13–17.
