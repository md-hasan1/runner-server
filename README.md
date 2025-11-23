# Runner API — Complete Routes, Services & Shared Helpers

This document enumerates the HTTP routes found under `src/app/modules`, and explains the controller and service logic behind each endpoint plus the key shared helpers used across the project.

Base mounts (in `src/app/routes/index.ts`)
- `/users` -> `src/app/modules/User/user.route.ts`
- `/auth` -> `src/app/modules/Auth/auth.routes.ts`
- `/deliveryInfo` -> `src/app/modules/DeliveryInfo/DeliveryInfo.routes.ts`
- `/bankInfo` -> `src/app/modules/BankInfo/BankInfo.routes.ts`
- `/cardInfo` -> `src/app/modules/CardInfo/CardInfo.routes.ts`
- `/admin` -> `src/app/modules/Admin/Admin.routes.ts`
- `/whereHouse` -> `src/app/modules/WhereHouseRequest/WhereHouseRequest.routes.ts`
- `/merchant` -> `src/app/modules/Merchant/Merchant.routes.ts`
- `/prov` -> `src/app/modules/ProvOfDelivery/ProvOfDelivery.routes.ts`

Note: `src/app/modules/Notification/Notification.routes.ts` exports `notificationsRoute` but it's not registered in `src/app/routes/index.ts`. Mount it at `/notification` to enable the endpoints below.

How this doc is organized
- For each route: method + path, whether `auth()` is required, validation/upload middleware notes, and a short explanation of controller → service behavior and side-effects.

----

## Auth (`/auth`)

- POST `/auth/login`
  - Auth: no
  - Validation: login schema applied in the route
  - Service: `AuthServices.loginUser(payload)` verifies email/password via bcrypt, updates user's `fcmToken` if provided, and returns a JWT token (via `jwtHelpers`). Controller sets a `token` cookie and returns `{ token, role, userId, isCompleted }`.

- POST `/auth/logout`
  - Auth: no
  - Service: none — controller clears cookie and returns success.

- GET `/auth/profile`
  - Auth: yes
  - Service: `AuthServices.getMyProfile(token)` decodes token (jwtHelpers.verifyToken) and returns user profile fields from Prisma.

- PUT `/auth/change-password`
  - Auth: yes
  - Validation: change-password schema
  - Service: `AuthServices.changePassword(token, newPassword, oldPassword)` verifies old password with bcrypt and updates stored hashed password.

- POST `/auth/forgot-password`
  - Auth: no
  - Service: `AuthServices.forgotPassword({ email })` generates a 4-digit OTP, stores it with expiry on the user record and sends an email using `otpSender` helper.

- POST `/auth/resend-otp`
  - Auth: no
  - Service: generates and emails a new OTP, updates user record.

- POST `/auth/verify-otp`
  - Auth: no
  - Service: validates OTP and expiry, clears OTP fields from the user record.

- POST `/auth/reset-password`
  - Auth: no
  - Service: `AuthServices.resetPassword({ email, password })` hashes the password and writes it to the user record (clears OTP too).

Notes: Authentication uses both cookie and Authorization header patterns; `jwtHelpers` centralizes token creation/verification.

----

## Users (`/users`)

- POST `/users/register`
  - Auth: no
  - Validation: `CreateUserValidationSchema`
  - Service: `userService.createUserIntoDb(body)` hashes password and creates a new `user` record.

- POST `/users/calculate-price`
  - Auth: no
  - Service: `userService.calculatePrice(body)` uses pricing helpers (`calculatePrice.ts` or `calculate2.ts`) to compute delivery price based on payload.

- POST `/users/complete-driver-profile`
  - Auth: yes
  - Uploads: many files via `fileUploader.completeDriverProfile`
  - Service: `userService.completeDriverProfile(req)` saves driver profile data and uploaded files (stored via `fileUploader.uploadToLocal` or Cloudinary/DigitalOcean depending on config).

- POST `/users/complete-user-profile`, `/users/complete-merchant-profile`, `/users/complete-wareHouse-profile`
  - Auth: yes
  - Uploads: `fileUploader.uploadSingle`
  - Service: respective `userService.*` methods persist profile data and the uploaded file URL.

- POST `/users/contact-mail`
  - Auth: no
  - Service: `userService.contactMail(req)` sends contact/support emails through `emailSender` or `emailSender2`.

- GET `/users/` (list)
  - Auth: no (route unprotected)
  - Service: `userService.getUsersFromDb(filters, options)` returns paginated results; filtering uses `pick` helper.

- GET `/users/:id`
  - Auth: yes
  - Service: `userService.getSingleUserFromDb(id)` returns full user details from Prisma.

- PUT `/users/profile`
  - Auth: yes
  - Uploads: `fileUploader.uploadSingle`
  - Service: `userService.updateProfile(req)` updates the authenticated user's profile and uploaded image.

- PUT `/users/:id`
  - Auth: (route currently unprotected in code) — uses `userService.updateUserIntoDb(body, id)` to update arbitrary fields. Review and add `auth()`+role-check if required.

- PUT `/users/approved/:id`
  - Auth: yes
  - Service: `userService.approvedUser(id)` toggles approval state for a user (used in onboarding flows).

- DELETE `/users/remove-profile-image`
  - Auth: yes
  - Service: `userService.removeProfileImage(userId)` deletes the stored profile image reference (and file if logic implemented).

- DELETE `/users/:id`
  - Auth: yes
  - Service: `userService.deleteUserAndRelations(id)` removes user and cascades related records.

Security note: several user routes (list, update by id) are not consistently protected — review for access control.

----

## DeliveryInfo (`/deliveryInfo`)

This module contains the core parcel/delivery workflows: creation, payment, rider assignment, tracking, and completion.

- POST `/deliveryInfo/` (create delivery)
  - Auth: yes
  - Controller sets `req.body.userId = req.user.id` and calls `deliveryInfoService.createIntoDb(req.body)`.
  - Service: creates a `parcel` record and related `recipient` rows inside a Prisma transaction; if recipients are missing an error is thrown. Attempts to notify an admin via `sendSingleNotificationUtils`.

- POST `/deliveryInfo/payment`
  - Auth: yes
  - Service: `deliveryInfoService.payment(userId, body)` creates a Stripe Payment Intent (amount in GBP) and returns clientSecret and intent id.

- POST `/deliveryInfo/after-payment`
  - Auth: yes
  - Service: `deliveryInfoService.createPaymentInfo(payload)` saves `paymentInfo` record, generates HTML invoice (via `generateDeliveryInfoHtml`) and sends emails (via `emailSender`/`emailSender2`).

- GET `/deliveryInfo/` (list)
  - Auth: yes
  - Service: `getListFromDb(filters)` builds Prisma conditions (search across configured fields) and returns parcel list.

- GET `/deliveryInfo/ride-quest` and `/deliveryInfo/ride-quest/:id`
  - Auth: yes
  - Service: returns rider requests filtered by rider id/status; `getSingleRideRequest` returns parcel + accepted rider info.

- POST / GET endpoints for parcel tracking and search
  - `searchParcel(id, userId)` records a user-parcel relationship (userParcel) for tracking, then returns parcel details.
  - `getAllTrackingListByParcel(parcelId)` returns parcel tracking entries stored by `parcelTrackings`.

- PUT `/deliveryInfo/update-driver-location`
  - Auth: yes
  - Service: `updateDriverLocation(userId, lat, long)` updates `driverProfile` coordinates and returns updated profile. This is used for live tracking and may be broadcasted via websocket utilities.

- PUT `/deliveryInfo/accept-ride/:id`, `/deliveryInfo/reject-ride/:id`
  - Auth: yes
  - Service: `acceptRideRequestByDriver` sets request to ACCEPTED, removes other pending requests for the same parcel; `rejectRideRequestByDriver` marks a rider request as REJECTED and stores a rejection reason.

- PUT `/deliveryInfo/complete`
  - Auth: yes
  - Service: `completeDelivery(parcelId)` marks parcel as DELIVERED, updates riderRequests and whereHouse requests if present, and updates merchant wallets when appropriate.

Notes: Delivery services integrate with Stripe, email, notifications, geocoding (`getLatLngFromPostalCode`) and tracking helpers.

----

## BankInfo (`/bankInfo`) and CardInfo (`/cardInfo`)

These modules provide CRUD for payout/payment accounts.

- POST `/bankInfo/` and `/cardInfo/`
  - Auth: yes
  - Service: `bankInfoService.createIntoDb(data, userId)` / `cardInfoService.createIntoDb(data, userId)` create a single record per user (services currently block creating multiple records per user).

- GET/PUT/DELETE endpoints are standard CRUD using Prisma models `bankInfo` and `cardInfo`.

Security note: Card handling currently stores metadata. Do not store raw card numbers in production — integrate a proper tokenization flow (Stripe, Braintree) and follow PCI rules.

----

## Admin (`/admin`)

- POST `/admin/assign-rider`
  - Auth: yes
  - Service: `AdminService.SendRiderRequest({ riderId, parcelId, deliveryCharge, assignId })` creates a `riderRequest` row and sends a Firebase push notification via `sendSingleNotificationUtils`.

- GET `/admin/`, `/admin/reviewed-data`, `/admin/report`, and ride-status lists
  - Auth: yes
  - Service: `AdminService.getAllCount`, `getAllNewRequest`, `report`, `getAllPendingRideRequests`, etc. — aggregate/parsing queries across parcels, riders, merchants and payments to build admin dashboards and reports.

- POST `/admin/accept-parcel/:id` and `/admin/reject-parcel/:id`
  - Auth: yes
  - Service: `confirmParcel(parcelId)` moves parcel from REVIEW to PENDING; `cancelParcel` sets status REJECTED.

- Rider discovery: `findRiderBaseParcelLocations(parcelId)` uses geocoding (`getLatLngFromPostalCode`) to compute a parcel's pickup lat/long and selects driver profiles with coordinates — potential next step is applying `haversineDistance` to filter nearby riders.

----

## WhereHouseRequest (`/whereHouse`)

- POST `/whereHouse/` and `/whereHouse/send`
  - Auth: yes
  - Service: `whereHouseRequestService.createIntoDb(parcelId, userId)` records that a parcel has been received into a warehouse; `whereHouseParcelSend(requestId)` sets status to SEND when the parcel leaves.

- GET `/whereHouse/` (received parcels)
  - Auth: yes
  - Service: `getReceivedParcel(filters, userId)` returns warehouse requests filtered by status.

- GET `/whereHouse/generate-invoice`
  - Auth: yes
  - Service: `makeInvoiceForAdmin` calls `generateInvoice()` which builds a PDF from all `PAY_LATER` paymentRequests and then uses `invoiceSender` to email it.

- Payment helpers: `afterPaymentChangeStatus` and `payLetter` update `paymentRequest` rows, create Stripe customers where needed, and set `PAY_LATER` state.

----

## Merchant (`/merchant`)

- POST `/merchant/payment-request`
  - Auth: yes
  - Service: `MerchantService.makePaymentRequest(payload)` validates merchant balance and requested account (bank/card). It deducts merchant account balance and creates a `paymentRequest` record.

- GET `/merchant/get-report`, `/merchant/get-my-payment-request`
  - Auth: yes
  - Service: reporting endpoints aggregate counts and sums for merchant dashboards.

----

## ProvOfDelivery (`/prov`)

- POST `/prov/:id`
  - Auth: yes
  - Uploads: `fileUploader.addProf` expects `proveImage` and `signature` fields
  - Service: `provOfDeliveryService.createIntoDb(req)` uploads files (via `fileUploader.uploadToLocal` or cloud storage) and creates a `provOfDelivery` record linking proof images and signatures to the parcel.

----

## Notification (mount manually at `/notification`)

- POST `/notification/send-notification/:userId`
  - Auth: yes
  - Service: `notificationServices.sendSingleNotification(req)` reads `title` and `body`, verifies the target user has an `fcmToken`, stores a `notification` row in the DB and uses Firebase Admin to send the push message.

- POST `/notification/send-notification` (multicast)
  - Auth: yes
  - Service: `notificationServices.sendNotifications(req)` finds users with `fcmToken`s, calls `admin.messaging().sendEachForMulticast`, persists successful notification records and returns counts and failed tokens.

- GET `/notification/` and `/notification/:notificationId`
  - Auth: yes
  - Service: fetch notifications for the current user and mark single notification as read.

----

## Key shared helpers and utilities

- `src/shared/prisma.ts` — Prisma client initialization, connects to DB and calls `initiateSuperAdmin` on startup. Central import for DB access.

- `src/shared/sendResponse.ts` — small helper to standardize API JSON responses: `{ success, message, meta, data }`.

- `src/shared/catchAsync.ts` — wrapper to catch async errors in controllers and forward them to error middleware.

- `src/shared/pick.ts` — picks allowed keys from an object used for filter / option sanitization.

- `src/shared/generateDeliveryInfoHtml.ts` — templates the delivery/invoice HTML used when emailing order summaries.

- `src/shared/generateInvoice.ts` — builds a PDF (via `pdfkit`) for all `PAY_LATER` payment requests and returns a Buffer for attachment/emailing.

- `src/shared/emailSender.ts`, `emailSender2.ts`, `otpSender.ts` — nodemailer-based helpers for sending admin emails, transactional user emails, and OTP emails. Current code contains hard-coded Gmail credentials; move to env variables before production.

- `src/shared/parcelTrack.ts` — helper to append tracking entries to `parcelTrack`.

- `src/shared/getLatLong.ts` — uses OpenStreetMap Nominatim API to convert postal codes into lat/long. Network calls can fail and must be rate-limited for production use.

- `src/shared/haverSineDistance.ts` — Haversine implementation returning miles (rounded to 3 decimals). Useful for proximity/rider matching.

- `src/helpars/fileUploader.ts` — multer-based upload helpers with support for memory storage, Cloudinary, and DigitalOcean Spaces. Exposes `uploadSingle`, `completeDriverProfile`, `addProf` and `uploadToLocal` among others. `uploadToLocal` writes buffers to an `uploads/` folder and returns a `Location` URL built from `BACK_END_URL`.

----

## Implementation & Security notes

- Access control: some routes are unprotected in routes files (e.g., `PUT /users/:id` and `GET /users/`) — review and add `auth()` or role checks where necessary.
- Validation: many routes have `validateRequest(...)` commented out; re-enable validation schemas to prevent malformed input.
- Payments: Stripe integration exists (Payment Intents and customer creation). Avoid storing raw payment data, and ensure proper webhook verification for payment lifecycle events.
- Emails: credentials are hard-coded in helpers; move to environment variables and consider a transactional provider.
- File uploads: confirm storage destination (Cloudinary / DigitalOcean / local) and secure file types/size limits.

----

If you want, I can take one of these concrete next actions and update the code/report accordingly:
- Extract each route's request/response shape from `*.validation.ts` files and add example JSON bodies to this README.
- Mount the `notificationsRoute` inside `src/app/routes/index.ts`, run a quick smoke test, and add curl examples.
- Add Swagger/OpenAPI support and serve generated docs at `/docs`.

Tell me which next step to perform and I'll implement it.


This repository contains the Runner API: an Express/TypeScript backend with Prisma, modular route structure, notifications (Firebase), and helper utilities for delivery and invoicing logic.

**Repository Layout**
- **`src/`**: application source — controllers, services, routes, middlewares, shared helpers.
# Runner API — Overview, Routes & Plain-English Logic

This README is written for both engineers and non-technical readers (HR, PMs, stakeholders). It explains what the project does, how it's organized, and lists every API surface with a plain-language summary of each endpoint's purpose and business logic.

Quick orientation
- Purpose: backend API for a delivery/courier platform (users, merchants, drivers, warehouses, admin operations, payments and notifications).
- Tech: Node.js, Express, TypeScript, Prisma (DB), Firebase Admin (push notifications), Stripe (payments), Cloudinary/DigitalOcean for file uploads.

Where to look in the code
- Routes: `src/app/modules/*/*.routes.ts` and `src/app/routes/index.ts` (module mounting)
- Controllers: `src/app/modules/*/*controller.ts` — translate HTTP requests to service calls
- Services: `src/app/modules/*/*service.ts` — core business logic and DB queries
- Shared helpers: `src/shared/*` — email, invoices, pricing, parcel tracking, geocoding, websocket setup, and Prisma instance

How the document is organized
- Short executive summary and features
- How to run (quickstart) and required env variables
- API summary table (module → core endpoints)
- Detailed endpoint list in plain language (method, path, auth, what it does)
- Shared helpers & what they do (high level)
- Security and production notes
- Recommended next steps

Executive summary (one paragraph)
The Runner API powers an on-demand courier platform. Users can create delivery orders (parcels), merchants can request payouts, drivers (delivery persons) accept rides, warehouses can receive and send parcels, and admins manage request review, ride assignment and reporting. The system integrates payments, email notifications, push notifications (Firebase), file uploads for documents and proof-of-delivery, and invoice generation.

Core features (bullet list)
- User registration, authentication, profile completion (including driver/merchant/warehouse profiles)
- Create and manage delivery requests (parcels), recipient lists and tracking
- Rider (driver) ride requests: assign, accept, reject, track
- Warehouse (whereHouse) storage requests, send/outbound flows and invoice generation
- Merchant payouts and payment requests
- Bank and Card info CRUD (stored as metadata)
- Notifications via Firebase + persisted notification records
- Payments integration (Stripe payment intents) and invoice generation

Quick start (local)
1. Install:

```bash
npm install
```

2. Create `.env` with required variables (example keys below).

3. Run Prisma and start:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Important environment variables (examples)
- `DATABASE_URL` — Prisma DB connection (Postgres)
- `PORT` — HTTP port
- `JWT_SECRET`, `JWT_EXPIRES_IN` — auth
- `FIREBASE_SERVICE_ACCOUNT` — path or credentials for Firebase Admin
- `STRIPE_SECRET_KEY` — Stripe API key
- `DO_SPACE_*` and `CLOUDINARY_*` — file upload credentials

API summary (modules & highlights)
- Auth (`/auth`): login, logout, profile, password reset flows (OTP)
- Users (`/users`): register, profile completion (user/driver/merchant/warehouse), search/list, contact/mail
- Delivery (`/deliveryInfo`): create delivery, payment, tracking, accept/reject rides, update driver location
- Admin (`/admin`): review/accept/reject parcels, assign riders, reporting and ride lists
- Warehouse (`/whereHouse`): create receive requests, send parcels, change status after payment, generate invoices
- Merchant (`/merchant`): register merchants, make payout/payment requests, reports
- BankInfo / CardInfo (`/bankInfo`, `/cardInfo`): CRUD for account metadata used in payouts
- ProvOfDelivery (`/prov`): proof-of-delivery uploads (images/signatures)
- Notification (not automatically mounted): push notifications via Firebase; route file exists and can be mounted at `/notification`

Detailed endpoints (plain English):
Note: all paths below are mounted under the base path listed above (e.g., `/users/register` is the full path).

AUTH (base: `/auth`)
- POST `/auth/login` — Public. Log in with email/password; returns JWT token and user info. Also stores FCM token for push notifications.
- POST `/auth/logout` — Public. Clears the server-side cookie used for sessions (if present).
- GET `/auth/profile` — Auth required. Returns the logged-in user's profile.
- PUT `/auth/change-password` — Auth required. Validates old password and updates to new password.
- POST `/auth/forgot-password` — Public. Generates a 4-digit OTP, stores it on user record with 10-minute expiry, and emails OTP.
- POST `/auth/resend-otp` — Public. Sends a new OTP (5-minute expiry) for password recovery.
- POST `/auth/verify-otp` — Public. Verifies the OTP from email before password reset.
- POST `/auth/reset-password` — Public. Sets the new password after OTP verification.

USERS (base: `/users`)
- POST `/users/register` — Public. Create a new user account (email + password); validation applied.
- POST `/users/calculate-price` — Public. Calculates delivery price using helper logic (used by client to preview cost).
- POST `/users/complete-driver-profile` — Auth + file upload. Upload driver documents (license, vehicle photos). Service saves profile data and files.
- POST `/users/complete-user-profile` — Auth + file upload. Upload user profile image and extra fields.
- POST `/users/complete-merchant-profile` — Auth + file upload. Complete merchant registration and documents.
- POST `/users/complete-wareHouse-profile` — Auth + file upload. Complete warehouse profile.
- POST `/users/contact-mail` — Public. Send contact/support email via the project's email helper.
- GET `/users/` — Public. List users; supports filters and pagination.
- GET `/users/:id` — Auth. Retrieve specific user by id.
- PUT `/users/profile` — Auth + file upload. Update the logged-in user's profile.
- PUT `/users/:id` — Public in code (review: should likely be protected). Updates user by id.
- PUT `/users/approved/:id` — Auth. Approve a user account (used by admin workflows).
- DELETE `/users/remove-profile-image` — Auth. Remove the logged-in user's profile image.
- DELETE `/users/:id` — Auth. Delete user and related records.

DELIVERY (base: `/deliveryInfo`)
- POST `/deliveryInfo/` — Auth. Create a new delivery (parcel) with recipients. Saves parcel + recipient rows atomically; notifies admin about new requests.
- POST `/deliveryInfo/payment` — Auth. Creates a Stripe PaymentIntent and returns client secret for client-side payment.
- POST `/deliveryInfo/after-payment` — Auth. Records payment information and sends invoice/confirmation emails to sender.
- GET `/deliveryInfo/` — Auth. List parcels with filters (status, search term).
- GET `/deliveryInfo/ride-quest` — Auth. List ride requests assigned to a rider (driver), filterable by status/role.
- GET `/deliveryInfo/get-parcel-base-user` — Auth. Return parcels associated with the logged-in user.
- GET `/deliveryInfo/ride-quest/:id` — Auth. Get one ride request detail.
- GET `/deliveryInfo/searchParcel/:id` — Auth. Search parcel by id and register the searcher (for parcel tracking features).
- GET `/deliveryInfo/parcel-track/:parcelId` — Auth. Return parcel tracking history.
- GET `/deliveryInfo/:id` — Auth. Get parcel by id, includes recipients, accepted rider, and proof of delivery info.
- PUT `/deliveryInfo/complete` — Auth. Mark a parcel as delivered; updates parcel status, rider request status, merchant balances when applicable.
- PUT `/deliveryInfo/update-driver-location` — Auth. Save driver's live location (latitude/longitude) to driver profile (used for matching and tracking).
- PUT `/deliveryInfo/:id` — Auth. Update a parcel.
- PUT `/deliveryInfo/accept-ride/:id` — Auth. Driver accepts a ride request; service logic marks other pending requests for same parcel as removed and sets accepted status.
- PUT `/deliveryInfo/reject-ride/:id` — Auth. Driver rejects a ride request with optional reason.
- DELETE `/deliveryInfo/:id` — Auth. Remove a parcel.
- GET `/deliveryInfo/parcel-location/:parcelId` — Auth. Return pickup location and recipient locations (lat/long) to support navigation and matching.

ADMIN (base: `/admin`)
- POST `/admin/assign-rider` — Auth. Admin assigns a rider to a parcel (creates a rider request and notifies the rider).
- POST `/admin/accept-parcel/:id` — Auth. Move parcel from REVIEW → PENDING (admin-approved).
- POST `/admin/accept-ride/:id` — Auth. Admin accepts a ride request (internal handling).
- POST `/admin/reject-parcel/:id` — Auth. Reject parcel in review stage.
- GET `/admin/find-rider` — Auth. Find available riders (driver profiles) possibly filtered by location.
- GET `/admin/find-rider/:id` — Auth. Find riders based on parcel id/location.
- GET `/admin/` — Auth. Returns dashboard counts (users, merchants, drivers, unreviewed parcels).
- GET `/admin/reviewed-data` — Auth. List parcels currently in REVIEW status.
- GET `/admin/report` — Auth. High-level report: completed/pending deliveries, top merchants, revenue summary.
- GET `/admin/pending/ride`, `/admin/accepted/ride`, `/admin/rejected/ride` — Auth. Lists of rider requests partitioned by status.
- GET `/admin/:id`, PUT `/admin/:id`, DELETE `/admin/:id` — Auth. CRUD for admin users.
- DELETE `/admin/cancel-ride/:id` — Auth. Cancel a rider request.

WHEREHOUSE (base: `/whereHouse`)
- POST `/whereHouse/` — Auth. Warehouse receives a parcel (creates a whereHouse request and updates related riderRequest status).
- POST `/whereHouse/send` — Auth. Mark stored parcel as sent (status update).
- GET `/whereHouse/` — Auth. List received parcels for the warehouse (supports `status` filter).
- GET `/whereHouse/generate-invoice` — Auth. Generates a PDF invoice (admin) for PAY_LATER items and returns with PDF headers for download.
- GET `/whereHouse/:id` — Auth. Get a specific warehouse request.
- PUT `/whereHouse/after-payment-change-status` — Auth. Change status after verifying payment request completion.
- PUT `/whereHouse/pay-letter/update` — Auth. Update pay-letter / payment-request metadata (integrates with Stripe customer creation when required).
- PUT `/whereHouse/:id` — Auth. Update request.
- DELETE `/whereHouse/:id` — Auth. Delete request.

MERCHANT (base: `/merchant`)
- POST `/merchant/` — Auth. Create merchant profile (validation applied).
- POST `/merchant/payment-request` — Auth. Merchant creates a payout/payment request referencing a bank or card account; service validates merchant balance and creates `paymentRequest`.
- GET `/merchant/` — Auth. List merchant payment requests (supports `status`).
- GET `/merchant/get-report` — Auth. Merchant financial summary (counts and total settled amount).
- GET `/merchant/get-my-payment-request` — Auth. Merchant's own payment requests (recent first).
- GET `/merchant/:id`, PUT `/merchant/:id`, DELETE `/merchant/:id` — Auth. Merchant CRUD.

BANK & CARD INFO (bases: `/bankInfo`, `/cardInfo`)
- Standard CRUD endpoints for storing bank or card metadata for users. The code prevents adding more than one bank or card record per user (business constraint). These endpoints are auth-protected and return metadata used to create payment/payout requests (do not store raw cardPAN; tokenization required in production).

PROOF OF DELIVERY (`/prov`)
- POST `/prov/:id` — Auth + file upload. Attach proof-of-delivery images and signature for a parcel (saves files and creates provOfDelivery record).
- GET `/prov/` — Auth. List proofs
- GET `/prov/:id`, PUT `/prov/:id`, DELETE `/prov/:id` — Auth. CRUD for POD records.

NOTIFICATIONS (module present; route export not mounted)
- POST `/notification/send-notification/:userId` — Auth. Send single push notification (FCM) and store a notification record.
- POST `/notification/send-notification` — Auth. Send multicast push notifications to all users with FCM tokens; returns counts of success/failure.
- GET `/notification/` — Auth. List notifications for current user.
- GET `/notification/:notificationId` — Auth. Retrieve single notification and mark read.

Shared helpers (high level)
- `src/shared/prisma.ts` — Prisma client init and graceful shutdown + a call to create a super-admin on startup.
- `src/shared/sendResponse.ts` — Response envelope used across controllers: `{ success, message, meta, data }`.
- `src/shared/catchAsync.ts` — Wrapper to forward async errors to Express error handler.
- `src/helpars/fileUploader.ts` — Multer + Cloudinary/DigitalOcean/Local upload helpers; supports many upload fields used in profile/driver documents and POD.
- `src/shared/generateDeliveryInfoHtml.ts` — Builds HTML email for delivery summaries/invoices.
- `src/shared/generateInvoice.ts` — Builds admin PDF for PAY_LATER payment requests.
- `src/shared/getLatLong.ts` — Geocoding via OpenStreetMap Nominatim (postal code to lat/long).
- `src/shared/haverSineDistance.ts` — Haversine distance helper for proximity matching.
- `src/shared/parcelTrack.ts` — Creates parcel tracking entries.
- `src/shared/emailSender*.ts` — Nodemailer wrappers for admin/user/emails. (Contains hard-coded test SMTP credentials — update for production.)

Security & production readiness notes (short)
- Protect all sensitive endpoints with `auth()`; review routes missing `auth()` (example: `PUT /users/:id` is not protected in routes file).
- Enable and verify request validation (`validateRequest`) — several routes have commented-out validation lines.
- Do not store raw card PANs in DB; use a payment provider tokenization (code currently stores card metadata in `cardInfo` — ensure PCI compliance before production).
- Replace hard-coded SMTP credentials with secure environment variables or a secure mail provider (SES, SendGrid, Postmark).
- Store Firebase credentials securely and rotate keys when required.
- Ensure uploads are scanned and limited (size, file type) — `fileUploader` has many helpers but validate types and sizes in production.

Human-friendly next steps I can take (pick one)
- Expand each endpoint with example request/response JSON using `*.validation.ts` and `*.service.ts` to extract fields.
- Mount the `Notification` routes in `src/app/routes/index.ts` and add a short curl example and smoke test.
- Add Swagger/OpenAPI docs and serve a `/docs` UI using `swagger-ui-express`.
- Secure unprotected routes (add `auth()` where missing) and enable commented validation middleware.

If you'd like me to proceed with one of the next steps, tell me which and I'll implement it and add any supporting tests or examples.

---

Last scanned locations (for reference)
- Modules scanned: `Auth`, `User`, `DeliveryInfo`, `BankInfo`, `CardInfo`, `Admin`, `WhereHouseRequest`, `Merchant`, `ProvOfDelivery`, `Notification`.
- Shared scanned: `prisma.ts`, `sendResponse.ts`, `catchAsync.ts`, `fileUploader.ts`, `generateDeliveryInfoHtml.ts`, `generateInvoice.ts`, `parcelTrack.ts`, `getLatLong.ts`, `haverSineDistance.ts`, `emailSender*.ts`.


