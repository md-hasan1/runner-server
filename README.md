# Runner — Project Overview (Organized)

This README is a concise, human-friendly summary of the Runner backend. It's organized for HR/stakeholders and new developers who need a quick, clear view of what the project is and how to get started.

## 1) Project summary
- What it does: Runner is the backend for a courier/delivery platform. It handles creating and tracking delivery orders (parcels), assigning drivers, managing warehouse receipts, processing payments and payouts, and sending emails and push notifications.
- Who uses it: Customers, Drivers/Riders, Merchants, Warehouse operators, and Admins.
- Business value (short):
  - Lets customers book and track deliveries.
  - Enables drivers and warehouses to manage pickups and drop-offs.
  - Automates payments, payouts and invoicing for merchants.

## 2) Core features (one-liner bullets)
- Create & track parcels and recipients.
- Driver matching and accept/reject ride flows.
- Payment flows with Stripe and pay-later invoicing.
- Email invoicing (PDF) and push notifications (Firebase FCM).
- File uploads for profiles and proof-of-delivery (Cloudinary/DO/local).

## 3) Tech stack (short)
- Node.js + TypeScript — runtime and type safety.
- Express — HTTP server & routing.
- Prisma — DB ORM and types.
- Stripe — payments.
- Firebase Admin (FCM) — push notifications.
- Nodemailer + PDFKit — email + invoice PDFs.
- Multer / Cloudinary / DigitalOcean Spaces — file uploads.
- Zod — request validation.

## 4) System structure (simple)
- `src/app/modules/*/*.routes.ts` — route definitions and middleware mounting.
- `src/app/modules/*/*.controller.ts` — controllers: parse request and call services.
- `src/app/modules/*/*.service.ts` — services: business logic, DB operations, external API calls.
- `src/shared` & `src/helpars` — shared utilities: Prisma client, JWT helpers, file uploader, email & invoice helpers, geocoding and distance helpers.

Request lifecycle (one line): Route → middleware (auth/validation/uploads) → Controller → Service → Prisma/external API → Response → Error handler.

## 5) Quickstart (developer)
1. Install dependencies
```bash
npm install
```
2. Create `.env` and set required variables: DB URL, Stripe keys, Firebase credentials, SMTP creds, JWT secret. Do NOT commit secrets.
3. Generate Prisma client / run migrations (dev)
```bash
npx prisma generate
npx prisma migrate dev
```
4. Start server
```bash
npm run dev
```

## 6) Main route quick-reference (top-level)
- Auth: `/auth` — login, logout, profile, password reset.
- Users: `/users` — register, profile completion, calculate-price, user CRUD.
- Delivery: `/deliveryInfo` — create parcel, payment, tracking, accept/reject rides, complete delivery.
- Merchant: `/merchant` — merchant profile, payment/payout requests.
- Warehouse: `/whereHouse` — receive/send parcels, invoice generation for pay-later.
- Proof of delivery: `/prov` — upload POD images & signatures.
- Bank & Card: `/bankInfo`, `/cardInfo` — store metadata for payouts.
- Admin: `/admin` — parcel review, assign riders, reports.
- Notifications: module exists at `src/app/modules/Notification/Notification.routes.ts` but the router is NOT mounted by default — mount under `/notification` to enable pushes.

## 7) Important security notes (must-read before production)
- Remove hard-coded credentials from code; use environment variables and secret stores.
- Do NOT store raw card PANs. Use Stripe tokenization and follow PCI rules.
- Ensure all sensitive routes have `auth()` and proper role checks (some routes are unprotected in code).
- Re-enable input validation (`validateRequest`) where commented-out.
- Limit and validate uploaded file types and sizes in `fileUploader`.

## 8) Where to find full technical docs
- Full developer documentation (detailed routes, controllers, services, shared helpers) is present in the repository. See `src/app/modules/*` for module routes/controllers/services and `src/shared` + `src/helpars` for utilities.

## 9) Next actions (pick one)
- Mount `Notification` router at `/notification` and add a smoke test.
- Generate request/response examples from validation schemas and add Swagger/OpenAPI.
- Perform a security pass: move secrets to env, re-enable validation, and protect unprotected routes.

If you want me to implement any of the next actions, tell me which one and I'll proceed.
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
  # Runner API — Complete API Documentation (HR-friendly + Developer Reference)

  This document is a single, complete reference generated from the codebase. It lists every route, controller and service discovered during code inspection and explains how the system works in simple language for HR and actionable detail for engineers.

  CONTENTS
  - Project summary (HR-friendly)
  - System structure and request lifecycle
  - Full routes documentation (every `*.routes.ts` file)
  - Controllers overview (exported handlers)
  - Services overview (business logic, DB models, external APIs)
  - Shared folder overview (helpers & middleware)
  - Security notes, missing items, and recommended next steps

  ---

  **1) PROJECT SUMMARY**

  - What the project does
    - A backend for a courier/delivery platform: creates and manages delivery orders (parcels), matches drivers to jobs, supports warehouses for parcel storage, handles merchant payouts, payments and invoices, and sends notifications and emails.

  - Who uses it (roles)
    - Customers (users), Delivery persons (drivers/riders), Merchants, Warehouse operators, Admins, and system integrations (Stripe, Firebase, email).

  - Core business value
    - Enables customers to place and track deliveries, providing revenue through delivery fees.
    - Provides operational tools for drivers, merchants and warehouses to manage workflows and payouts.
    - Supports notifications, invoicing and payment flows to operate a commercial delivery service.

  ---

  **2) SYSTEM STRUCTURE**

  - Folder responsibilities (simple)
    - `routes` (module `*.routes.ts`): declare endpoints and attach middleware.
    - `controllers` (module `*.controller.ts`): thin wrappers that call services and format responses.
    - `services` (module `*.service.ts`): core business logic, DB access (Prisma), transactions and external API calls.
    - `shared` & `helpars`: reusable utilities (Prisma client, email senders, invoice generation, file uploading, JWT helpers, geocoding, distance calc).

  - Request lifecycle (simple flow)
    1. Route receives HTTP request and runs middleware (`auth`, validation, file upload).
    2. Controller extracts params/body and calls a Service function.
    3. Service executes business logic, reads/writes DB via Prisma, and calls external APIs as needed (Stripe, Firebase, email).
    4. Controller returns a standardized JSON response via `sendResponse`.
    5. Errors are handled by `globalErrorHandler`.

  ---

  **3) FULL ROUTES DOCUMENTATION (every `*.routes.ts`)**

  Note: the tables below document exactly the endpoints present in each `*.routes.ts` file under `src/app/modules`.

  File: `src/app/modules/Auth/auth.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/login` | `validateRequest(UserValidation.UserLoginValidationSchema)` | `AuthController.loginUser` | `AuthServices.loginUser` | Authenticate user and return JWT + user metadata |
  | POST | `/logout` | none | `AuthController.logoutUser` | none | Clear token cookie / logout |
  | GET | `/profile` | `auth()` | `AuthController.getMyProfile` | `AuthServices.getMyProfile` | Return authenticated user's profile |
  | PUT | `/change-password` | `auth()`, `validateRequest(...)` | `AuthController.changePassword` | `AuthServices.changePassword` | Change authenticated user's password |
  | POST | `/forgot-password` | none | `AuthController.forgotPassword` | `AuthServices.forgotPassword` | Generate OTP and email for password reset |
  | POST | `/resend-otp` | none | `AuthController.resendOtp` | `AuthServices.resendOtp` | Resend OTP |
  | POST | `/verify-otp` | none | `AuthController.verifyForgotPasswordOtp` | `AuthServices.verifyForgotPasswordOtp` | Verify OTP |
  | POST | `/reset-password` | none | `AuthController.resetPassword` | `AuthServices.resetPassword` | Reset password after OTP verification |

  Logic flow (summary): login verifies password via bcrypt, generates JWT; forgot/resend/verify OTP flows set OTP and expiry on `user` and email via `otpSender`.

  File: `src/app/modules/User/user.route.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/register` | `validateRequest(UserValidation.CreateUserValidationSchema)` | `userController.createUser` | `userService.createUserIntoDb` | Register user |
  | POST | `/calculate-price` | none | `userController.calculatePrice` | `userService.calculatePrice` | Estimate delivery price |
  | POST | `/complete-driver-profile` | `auth()`, `fileUploader.completeDriverProfile` | `userController.completeDriverProfile` | `userService.completeDriverProfile` | Upload driver docs and create/update `driverProfile` |
  | POST | `/complete-user-profile` | `auth()`, `fileUploader.uploadSingle` | `userController.completeUserProfile` | `userService.completeUserProfile` | Upload user image and complete profile |
  | POST | `/complete-merchant-profile` | `auth()`, `fileUploader.uploadSingle` | `userController.completeMerchantProfile` | `userService.completeMerchantProfile` | Create or update merchant profile |
  | POST | `/complete-wareHouse-profile` | `auth()`, `fileUploader.uploadSingle` | `userController.completeWareHouseProfile` | `userService.completeWareHouseProfile` | Create/update warehouse profile |
  | POST | `/contact-mail` | none | `userController.contactMail` | `userService.contactMail` | Send contact/support email |
  | GET | `/` | none | `userController.getUsers` | `userService.getUsersFromDb` | List users (filters/pagination) |
  | GET | `/:id` | `auth()` | `userController.getSingleUserFromDb` | `userService.getSingleUserFromDb` | Get user by id |
  | PUT | `/profile` | `auth()`, `fileUploader.uploadSingle` | `userController.updateProfile` | `userService.updateProfile` | Update authenticated user's profile |
  | PUT | `/:id` | none (unprotected in code) | `userController.updateUser` | `userService.updateUserIntoDb` | Update user by id (route lacks `auth()` in code) |
  | PUT | `/approved/:id` | `auth()` | `userController.approvedUser` | `userService.approvedUser` | Toggle approval state for user |
  | DELETE | `/remove-profile-image` | `auth()` | `userController.removeProfileImage` | `userService.removeProfileImage` | Remove profile image |
  | DELETE | `/:id` | `auth()` | `userController.deleteUserAndRelations` | `userService.deleteUserAndRelations` | Delete user and related records |

  Logic flow (summary): profile completion endpoints parse JSON `data` and uploaded files, upload via `fileUploader`, create/update related models (`driverProfile`, `merchant`), and notify admin on driver-profile completion.

  File: `src/app/modules/DeliveryInfo/DeliveryInfo.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/` | `auth()` | `DeliveryInfoController.createDeliveryInfo` | `deliveryInfoService.createIntoDb` | Create parcel and recipients |
  | POST | `/payment` | `auth()` | `DeliveryInfoController.payment` | `deliveryInfoService.payment` | Create Stripe PaymentIntent |
  | POST | `/after-payment` | `auth()` | `DeliveryInfoController.createPaymentInfo` | `deliveryInfoService.createPaymentInfo` | Persist payment info and send invoice/emails |
  | GET | `/` | `auth()` | `DeliveryInfoController.getDeliveryInfoList` | `deliveryInfoService.getListFromDb` | List parcels |
  | GET | `/ride-quest` | `auth()` | `DeliveryInfoController.getRideRequestBasedOnRider` | `deliveryInfoService.getRideRequestBasedOnRider` | List rider requests for a rider |
  | GET | `/get-parcel-base-user` | `auth()` | `DeliveryInfoController.getUserBaseParcel` | `deliveryInfoService.getUserBaseParcel` | Get parcels related to current user |
  | GET | `/ride-quest/:id` | `auth()` | `DeliveryInfoController.getSingleRideRequest` | `deliveryInfoService.getSingleRideRequest` | View ride request details |
  | GET | `/searchParcel/:id` | `auth()` | `DeliveryInfoController.searchParcel` | `deliveryInfoService.searchParcel` | Register search and return parcel |
  | GET | `/parcel-track/:parcelId` | `auth()` | `DeliveryInfoController.getAllTrackingListByParcel` | `deliveryInfoService.getAllTrackingListByParcel` | Parcel tracking history |
  | GET | `/:id` | `auth()` | `DeliveryInfoController.getDeliveryInfoById` | `deliveryInfoService.getByIdFromDb` | Parcel detail with recipients and rider info |
  | PUT | `/complete` | `auth()` | `DeliveryInfoController.completeDelivery` | `deliveryInfoService.completeDelivery` | Mark delivered and update merchant/whereHouse statuses |
  | PUT | `/update-driver-location` | `auth()` | `DeliveryInfoController.updateDriverLocation` | `deliveryInfoService.updateDriverLocation` | Update driver's live coords in driverProfile |
  | PUT | `/:id` | `auth()` | `DeliveryInfoController.updateDeliveryInfo` | `deliveryInfoService.updateIntoDb` | Update parcel |
  | PUT | `/accept-ride/:id` | `auth()` | `DeliveryInfoController.acceptRideRequestByDriver` | `deliveryInfoService.acceptRideRequestByDriver` | Driver accepts a ride |
  | PUT | `/reject-ride/:id` | `auth()` | `DeliveryInfoController.rejectRideRequestByDriver` | `deliveryInfoService.rejectRideRequestByDriver` | Driver rejects a ride |
  | DELETE | `/:id` | `auth()` | `DeliveryInfoController.deleteDeliveryInfo` | `deliveryInfoService.deleteItemFromDb` | Delete parcel |
  | GET | `/parcel-location/:parcelId` | `auth()` | `DeliveryInfoController.getParcelLocationWithRider` | `deliveryInfoService.getParcelLocationWithRider` | Return pickup and recipients' lat/long |

  Logic flow (summary): create uses a Prisma transaction to insert parcel + recipients; payment creates Stripe PaymentIntent; after-payment records payment and sends emails; accept/reject ride updates `riderRequest` rows and statuses.

  File: `src/app/modules/Admin/Admin.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/assign-rider` | `auth()` | `AdminController.SendRiderRequest` | `AdminService.SendRiderRequest` | Assign rider to parcel and notify rider |
  | POST | `/accept-parcel/:id` | `auth()` | `AdminController.confirmParcel` | `AdminService.confirmParcel` | Approve parcel from REVIEW to PENDING |
  | POST | `/accept-ride/:id` | `auth()` | `AdminController.rideRequestAccept` | `AdminService.rideRequestAccept` | Admin accepts ride (service body not fully implemented) |
  | POST | `/reject-parcel/:id` | `auth()` | `AdminController.cancelParcel` | `AdminService.cancelParcel` | Reject parcel in REVIEW |
  | GET | `/find-rider` | `auth()` | `AdminController.findAllRider` | `AdminService.findAllRider` | List riders |
  | GET | `/find-rider/:id` | `auth()` | `AdminController.findRiderBaseParcelLocations` | `AdminService.findRiderBaseParcelLocations` | Find riders near parcel (geocoding) |
  | GET | `/` | `auth()` | `AdminController.getAllCount` | `AdminService.getAllCount` | Admin dashboard counts |
  | GET | `/reviewed-data` | `auth()` | `AdminController.getAllNewRequest` | `AdminService.getAllNewRequest` | Parcels in REVIEW |
  | GET | `/report` | `auth()` | `AdminController.report` | `AdminService.report` | Aggregated report (revenue, top merchants) |
  | GET | `/pending/ride` | `auth()` | `AdminController.getAllPendingRideRequests` | `AdminService.getAllPendingRideRequests` | List pending rides |
  | GET | `/accepted/ride` | `auth()` | `AdminController.getAllAcceptedRideRequests` | `AdminService.getAllAcceptedRideRequests` | List accepted rides |
  | GET | `/rejected/ride` | `auth()` | `AdminController.getAllRejectedRideRequests` | `AdminService.getAllRejectedRideRequests` | List rejected rides |
  | GET | `/:id` | `auth()` | `AdminController.getAdminById` | `AdminService.getByIdFromDb` | Get admin by id |
  | PUT | `/:id` | `auth()`, `validateRequest(AdminValidation.updateSchema)` | `AdminController.updateAdmin` | `AdminService.updateIntoDb` | Update admin |
  | DELETE | `/:id` | `auth()` | `AdminController.deleteAdmin` | `AdminService.deleteItemFromDb` | Delete admin |
  | DELETE | `/cancel-ride/:id` | `auth()` | `AdminController.cancelRideRequest` | `AdminService.cancelRideRequest` | Cancel a rider request |

  Logic flow (summary): admin endpoints perform parcel review workflows, assign riders (send FCM notifications), and aggregate reports using Prisma queries; rider proximity logic uses geocoding and has a commented-out haversine filter.

  File: `src/app/modules/WhereHouseRequest/WhereHouseRequest.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/` | `auth()` | `WhereHouseRequestController.createWhereHouseRequest` | `whereHouseRequestService.createIntoDb` | Register a warehouse receipt for a parcel |
  | POST | `/send` | `auth()` | `WhereHouseRequestController.whereHouseParcelSend` | `whereHouseRequestService.whereHouseParcelSend` | Mark parcel as sent from warehouse |
  | GET | `/` | `auth()` | `WhereHouseRequestController.getReceivedParcel` | `whereHouseRequestService.getReceivedParcel` | List warehouse requests |
  | GET | `/generate-invoice` | `auth()` | `WhereHouseRequestController.makeInvoiceForAdmin` | `whereHouseRequestService.makeInvoiceForAdmin` | Generate PDF invoice for PAY_LATER items |
  | GET | `/:id` | `auth()` | `WhereHouseRequestController.getWhereHouseRequestById` | `whereHouseRequestService.getByIdFromDb` | Get request by id |
  | PUT | `/after-payment-change-status` | `auth()` | `WhereHouseRequestController.afterPaymentChangeStatus` | `whereHouseRequestService.afterPaymentChangeStatus` | Mark payment request as complete |
  | PUT | `/pay-letter/update` | `auth()` | `WhereHouseRequestController.payLetter` | `whereHouseRequestService.payLetter` | Mark request PAY_LATER (create Stripe customer if needed) |
  | PUT | `/:id` | `auth()` | `WhereHouseRequestController.updateWhereHouseRequest` | `whereHouseRequestService.updateIntoDb` | Update request |
  | DELETE | `/:id` | `auth()` | `WhereHouseRequestController.deleteWhereHouseRequest` | `whereHouseRequestService.deleteItemFromDb` | Delete request |

  Logic flow (summary): warehouse flows update related `riderRequest` statuses, create `whereHouseRequest` records, and generate invoices using shared PDF helpers.

  File: `src/app/modules/Notification/Notification.routes.ts` (route file exists but is not mounted in root routes)

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/send-notification/:userId` | `auth()` | `notificationController.sendNotification` | `notificationServices.sendSingleNotification` | Send single FCM notification and persist record |
  | POST | `/send-notification` | `auth()` | `notificationController.sendNotifications` | `notificationServices.sendNotifications` | Send multicast FCM notifications and persist successes |
  | GET | `/` | `auth()` | `notificationController.getNotifications` | `notificationServices.getNotificationsFromDB` | List user's notifications |
  | GET | `/:notificationId` | `auth()` | `notificationController.getSingleNotificationById` | `notificationServices.getSingleNotificationFromDB` | Get + mark single notification read |

  Note: to enable these endpoints mount `notificationsRoute` in `src/app/routes/index.ts` (not found mounted in code).

  File: `src/app/modules/ProvOfDelivery/ProvOfDelivery.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/:id` | `auth()`, `fileUploader.addProf` | `ProvOfDeliveryController.createProvOfDelivery` | `provOfDeliveryService.createIntoDb` | Upload proof-of-delivery (image + signature) and create record |
  | GET | `/` | `auth()` | `ProvOfDeliveryController.getProvOfDeliveryList` | `provOfDeliveryService.getListFromDb` | List proof-of-delivery records |
  | GET | `/:id` | `auth()` | `ProvOfDeliveryController.getProvOfDeliveryById` | `provOfDeliveryService.getByIdFromDb` | Get a single proof record |
  | PUT | `/:id` | `auth()` | `ProvOfDeliveryController.updateProvOfDelivery` | `provOfDeliveryService.updateIntoDb` | Update proof record |
  | DELETE | `/:id` | `auth()` | `ProvOfDeliveryController.deleteProvOfDelivery` | `provOfDeliveryService.deleteItemFromDb` | Delete proof record |

  File: `src/app/modules/BankInfo/BankInfo.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/` | `auth()` | `BankInfoController.createBankInfo` | `bankInfoService.createIntoDb` | Create bank metadata (one per user) |
  | GET | `/` | `auth()` | `BankInfoController.getBankInfoList` | `bankInfoService.getListFromDb` | List bank info |
  | GET | `/user-base` | `auth()` | `BankInfoController.getBankInfoBaseUser` | `bankInfoService.getBankInfoBaseUser` | Get bank info for current user |
  | GET | `/user-base/:id` | `auth()` | `BankInfoController.getBankInfoBaseUserId` | `bankInfoService.getBankInfoBaseUser` | Get bank info for specified user |
  | GET | `/:id` | `auth()` | `BankInfoController.getBankInfoById` | `bankInfoService.getByIdFromDb` | Get bank info by id |
  | PUT | `/:id` | `auth()` | `BankInfoController.updateBankInfo` | `bankInfoService.updateIntoDb` | Update bank info |
  | DELETE | `/:id` | `auth()` | `BankInfoController.deleteBankInfo` | `bankInfoService.deleteItemFromDb` | Delete bank info |

  File: `src/app/modules/CardInfo/CardInfo.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/` | `auth()` | `CardInfoController.createCardInfo` | `cardInfoService.createIntoDb` | Create card metadata (one per user) |
  | GET | `/` | `auth()` | `CardInfoController.getCardInfoList` | `cardInfoService.getListFromDb` | List card info |
  | GET | `/base-user` | `auth()` | `CardInfoController.getCardInfoBaseUser` | `cardInfoService.getCardInfoBaseUser` | Get card info for current user |
  | GET | `/base-user/:id` | `auth()` | `CardInfoController.getCardInfoBaseUserId` | `cardInfoService.getCardInfoBaseUser` | Get card info for specified user |
  | GET | `/:id` | `auth()` | `CardInfoController.getCardInfoById` | `cardInfoService.getByIdFromDb` | Get card info by id |
  | PUT | `/:id` | `auth()` | `CardInfoController.updateCardInfo` | `cardInfoService.updateIntoDb` | Update card info |
  | DELETE | `/:id` | `auth()` | `CardInfoController.deleteCardInfo` | `cardInfoService.deleteItemFromDb` | Delete card info |

  File: `src/app/modules/Merchant/Merchant.routes.ts`

  | Method | Endpoint | Middleware | Controller | Service | Purpose |
  |---|---:|---|---|---|---|
  | POST | `/` | `auth()`, `validateRequest(MerchantValidation.createSchema)` | `MerchantController.createMerchant` | `MerchantService.createIntoDb` | Create merchant profile |
  | POST | `/payment-request` | `auth()` | `MerchantController.makePaymentRequest` | `MerchantService.makePaymentRequest` | Merchant payout request (bank or card) |
  | GET | `/` | `auth()` | `MerchantController.getMerchantList` | `MerchantService.getListFromDb` | List merchant payment requests |
  | GET | `/get-report` | `auth()` | `MerchantController.getReport` | `MerchantService.getReport` | Merchant financial summary |
  | GET | `/get-my-payment-request` | `auth()` | `MerchantController.getMyPaymentRequest` | `MerchantService.getMyPaymentRequest` | Merchant's own payment requests |
  | GET | `/:id` | `auth()` | `MerchantController.getMerchantById` | `MerchantService.getByIdFromDb` | Get merchant by id |
  | PUT | `/:id` | `auth()`, `validateRequest(MerchantValidation.updateSchema)` | `MerchantController.updateMerchant` | `MerchantService.updateIntoDb` | Update merchant |
  | DELETE | `/:id` | `auth()` | `MerchantController.deleteMerchant` | `MerchantService.deleteItemFromDb` | Delete merchant |

  ---

  **4) CONTROLLERS OVERVIEW**

  Below are each controller file's exported handlers and what they do (1–2 lines) and which service they call.

  *- `Auth` (`src/app/modules/Auth/auth.controller.ts`)*
    - `loginUser` — authenticate user, set `token` cookie, returns token and user info. Calls `AuthServices.loginUser`.
    - `logoutUser` — clears cookie. (No service call.)
    - `getMyProfile` — return profile for token; calls `AuthServices.getMyProfile`.
    - `changePassword` — change password for authenticated user; calls `AuthServices.changePassword`.
    - `forgotPassword`, `resendOtp`, `verifyForgotPasswordOtp`, `resetPassword` — OTP + reset flows; call matching `AuthServices` functions.

  *- `User` (`src/app/modules/User/user.controller.ts`)*
    - `createUser` — register user; `userService.createUserIntoDb`.
    - `getUsers` — list users with filters; `userService.getUsersFromDb`.
    - `updateProfile` — update authenticated user's profile (file upload support); `userService.updateProfile`.
    - `getSingleUserFromDb` — get user + profile; `userService.getSingleUserFromDb`.
    - `updateUser` — update user by id; `userService.updateUserIntoDb`.
    - `calculatePrice`, `contactMail`, `completeDriverProfile`, `completeUserProfile`, `completeMerchantProfile`, `completeWareHouseProfile`, `approvedUser`, `deleteUserAndRelations`, `removeProfileImage` — map to `userService` methods as named.

  *- `DeliveryInfo` (`src/app/modules/DeliveryInfo/DeliveryInfo.controller.ts`)*
    - CRUD: `createDeliveryInfo`, `getDeliveryInfoList`, `getDeliveryInfoById`, `updateDeliveryInfo`, `deleteDeliveryInfo` — call corresponding service methods.
    - Payment & tracking: `payment`, `createPaymentInfo`, `getAllTrackingListByParcel`, `getRideRequestBasedOnRider`, `acceptRideRequestByDriver`, `rejectRideRequestByDriver`, `getParcelLocationWithRider`, `completeDelivery`, `getSingleRideRequest`, `searchParcel`, `getUserBaseParcel`, `updateDriverLocation` — call matching `deliveryInfoService` functions.

  *- `Admin`, `Merchant`, `BankInfo`, `CardInfo`, `ProvOfDelivery`, `WhereHouseRequest`, `Notification` controllers* — each exports CRUD and business endpoints which call service functions with matching names; see earlier route tables for mapping.

  ---

  **5) SERVICES OVERVIEW**

  Each service implements the business logic used by controllers. Key details below.

  *- `AuthServices` (`src/app/modules/Auth/auth.service.ts`)*
    - Functions: `loginUser`, `getMyProfile`, `changePassword`, `forgotPassword`, `resetPassword`, `resendOtp`, `verifyForgotPasswordOtp`.
    - Business logic: user lookup (`prisma.user`), bcrypt verification/hash, JWT generation (`jwtHelpers`), OTP generation and emailing (`otpSender`), update user fields.
    - DB models: `user`.

  *- `userService` (`src/app/modules/User/user.services.ts`)*
    - Functions: `createUserIntoDb`, `getUsersFromDb`, `updateProfile`, `updateUserIntoDb`, `completeUserProfile`, `calculatePrice`, `contactMail`, `completeDriverProfile`, `completeMerchantProfile`, `completeWareHouseProfile`, `getSingleUserFromDb`, `approvedUser`, `deleteUserAndRelations`, `removeProfileImage`.
    - Business logic: create users, profile completions with file uploads, generate tokens, complex cascade delete across many models in a transaction, price calculation using `calculatePrice` helpers.
    - DB models: `user`, `driverProfile`, `merchant`, `parcel`, `recipient`, `cardInfo`, `bankInfo`, `paymentRequest`, `parcelTrack`, `riderRequest`, `whereHouseRequest`, `provOfDelivery`, chat/room tables.

  *- `deliveryInfoService` (`src/app/modules/DeliveryInfo/DeliveryInfo.service.ts`)*
    - Functions: create, read, update, delete parcels; `payment` (Stripe PaymentIntent), `createPaymentInfo` (persist payment and email invoice), ride request handling (accept/reject), tracking and driver-location updates.
    - Business logic: transactional creation of parcel+recipients, Stripe calls, emailing (generateDeliveryInfoHtml, emailSender2/emailSender), rider request lifecycle updates, merchant balance updates on delivery completion.
    - DB models: `parcel`, `recipient`, `paymentInfo`, `riderRequest`, `provOfDelivery`, `parcelTrack`, `driverProfile`, `whereHouseRequest`, `userParcel`.
    - External APIs: Stripe, email helpers, geocoding helper.

  *- `AdminService` (`src/app/modules/Admin/Admin.service.ts`)*
    - Functions: `getAllCount`, `getAllNewRequest`, `confirmParcel`, `cancelParcel`, `findRiderBaseParcelLocations`, `SendRiderRequest`, `getAllPendingRideRequests`, `getAllAcceptedRideRequests`, `getAllRejectedRideRequests`, `cancelRideRequest`, `report`, `findAllRider`.
    - Business logic: parcel review workflows, rider assignment (send notification), dashboard aggregations.
    - DB models: `user`, `parcel`, `riderRequest`, `driverProfile`, `merchant`, `paymentInfo`.
    - External: geocoding and notifications.

  *- `whereHouseRequestService` (`src/app/modules/WhereHouseRequest/WhereHouseRequest.service.ts`)* — warehouse flows and invoice generation (PDF). Uses Stripe customer creation for PAY_LATER flows, and `generateInvoice`/`invoiceSender`.

  *- `notificationServices` (`src/app/modules/Notification/Notification.service.ts`)* — send single & multicast FCM messages via Firebase Admin SDK; persist notifications in `notification` table.

  *- `provOfDeliveryService`, `bankInfoService`, `cardInfoService`, `merchantService`* — straightforward CRUD + small business rules (e.g., one bank/card per user, merchant payout validation/deduction).

  ---

  **6) SHARED FOLDER OVERVIEW**

  *- `src/shared/prisma.ts`* — Prisma client used across services.
  *- `src/shared/sendResponse.ts`* — response formatting used by controllers.
  *- `src/shared/catchAsync.ts`* — wrapper for async controllers.
  *- `src/shared/pick.ts`* — query sanitization helper.
  *- `src/shared/parcelTrack.ts`* — write tracking entries.
  *- `src/shared/otpSender.ts`* — OTP email sender used by Auth.
  *- `src/shared/getLatLong.ts`* — geocoding via OpenStreetMap Nominatim.
  *- `src/shared/haverSineDistance.ts`* — distance helper for rider matching.
  *- `src/shared/generateInvoice.ts` & `src/shared/invoiceSender.ts`* — create and send PDF invoices (used by warehouse flows).
  *- `src/shared/generateDeliveryInfoHtml.ts`* — HTML email for delivery summaries.
  *- `src/shared/emailSender*.ts`* — Nodemailer-based email utilities (move credentials to env vars before production).
  *- `src/helpars/fileUploader.ts`* — multer helpers + Cloudinary/DO/local upload helpers (used by profile and POD endpoints).
  *- `src/helpars/jwtHelpers.ts`* — JWT generation and verification (used by Auth and `auth` middleware).
  *- `src/app/middlewares/auth.ts`* — JWT auth middleware (reads `Authorization` header, verifies token, loads `user` from DB, optional role checks).
  *- `src/app/middlewares/validateRequest.ts`* — Zod validation wrapper for request bodies.
  *- `src/app/middlewares/globalErrorHandler.ts`* — central error formatting (Zod, Prisma, ApiError handling).

  ---

  SECURITY & PRODUCTION NOTES

  - Protect unprotected routes: `PUT /users/:id` is unprotected in routes file and should be reviewed.
  - Re-enable `validateRequest` where commented-out to enforce input validation.
  - Replace in-repo SMTP credentials and any hard-coded secrets with environment variables and rotate keys.
  - Use proper payment tokenization (Stripe) and avoid storing raw card PANs.
  - Limit and validate uploaded file types and sizes in `fileUploader` configuration.

  MISSING / TODOS FOUND IN CODE

  - `notificationsRoute` exists but is not mounted in `src/app/routes/index.ts`.
  - Haversine-based rider filtering is present as a TODO / commented code in `AdminService`.
  - Some service methods are partially implemented or left as placeholders.

  RECOMMENDED NEXT STEPS (pick one)

  - Option A: Expand this README with request/response examples by extracting `*.validation.ts` schemas. (Good for Swagger.)
  - Option B: Mount `notificationsRoute` in `src/app/routes/index.ts`, add smoke tests and curl examples.
  - Option C: Add Swagger/OpenAPI and serve docs at `/docs`.
  - Option D: Security pass — re-enable validations and add `auth()` to unprotected routes.

  If you pick one, I will implement it, update the code, run quick checks, and add tests or examples as needed.

  ---

  Generated by code scan on the repository. If you want a narrower export (e.g., only API tables in CSV, or a Swagger JSON), tell me which format.

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


