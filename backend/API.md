# VLO Will Backend — API Documentation

Base URL: `http://localhost:3000` (or your deployed URL)  
API version prefix: **`/api/v1`**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Health](#health)
4. [Auth](#auth)
5. [Users](#users)
6. [Roles](#roles)
7. [Permissions](#permissions)
8. [Wills](#wills)
9. [Will sub-resources](#will-sub-resources)
10. [Feedback](#feedback)
11. [Packages](#packages)
12. [Payment methods](#payment-methods)
13. [Payments](#payments)
14. [Stripe webhook](#stripe-webhook)
15. [Subscriptions](#subscriptions)
16. [Invoices](#invoices)
17. [Admin — Form builder](#admin--form-builder)
18. [Errors & rate limiting](#errors--rate-limiting)

---

## Overview

- **Content-Type:** `application/json` (unless noted).
- **Auth:** JWT in `Authorization: Bearer <token>` or session/cookies where applicable.
- **IDs:** UUIDs for `id`, `willId`, etc., unless stated otherwise.

---

## Authentication

- **Public:** No `Authorization` header required.
- **Private:** Send `Authorization: Bearer <access_token>` (or use cookies if using session).
- **Permission-based:** Some routes require specific permissions (e.g. `users:read`, `roles:read`).
- **Super admin:** Some routes are restricted to the `super_admin` role.

---

## Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | API health (no version prefix) | Public |
| GET | `/api/v1/health` | Versioned health check | Public |

**Response (200):**  
`{ "success": true, "message": "API is healthy", "timestamp": "...", "version": "v1" }`

---

## Auth

Base path: **`/api/v1/auth`**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login (returns tokens/session) | Public |
| POST | `/logout` | Logout | Private |
| POST | `/refresh-token` | Refresh access token | Public |
| POST | `/verify-recaptcha` | Verify reCAPTCHA / bot check | Public |
| POST | `/forgot-password` | Request password reset email | Public |
| POST | `/resend-password-reset-email` | Resend password reset email | Public |
| POST | `/reset-password` | Reset password with token | Public |
| POST | `/verify-email` | Verify email with token | Public |
| POST | `/resend-verification-email` | Resend verification email | Public |
| GET | `/me` | Get current user profile | Private |
| POST | `/change-password` | Change password (authenticated) | Private |
| POST | `/google` | Initiate Google OAuth login | Public |
| POST | `/send-otp` | Send OTP to email | Public |
| POST | `/verify-otp` | Verify OTP | Public |
| POST | `/change-admin-password` | Change user password (admin flow) | Public (rate limited) |

### Request bodies (Auth)

**POST /register**  
```json
{
  "email": "user@example.com",
  "name": "Full Name",
  "password": "SecurePass1!"
}
```
- Password: min 8 chars, at least one uppercase, one lowercase, one number, one special character.

**POST /login**  
```json
{
  "email": "user@example.com",
  "password": "password",
  "remember_me": false
}
```

**POST /refresh-token**  
```json
{
  "refresh_token": "<refresh_token>"
}
```

**POST /forgot-password**, **POST /resend-password-reset-email**, **POST /resend-verification-email**  
```json
{
  "email": "user@example.com"
}
```

**POST /reset-password**  
```json
{
  "token": "<reset_token>",
  "new_password": "NewSecurePass1!"
}
```

**POST /verify-email**  
```json
{
  "token": "<verification_token>"
}
```

**POST /change-password** (authenticated)  
```json
{
  "new_password": "NewSecurePass1!"
}
```

**POST /send-otp**  
```json
{
  "email": "user@example.com"
}
```

**POST /verify-otp**  
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```
- `otp`: 6 characters.

**POST /change-admin-password**  
```json
{
  "email": "user@example.com",
  "new_password": "NewSecurePass1!"
}
```

---

## Users

Base path: **`/api/v1/users`**  
All routes require **authentication**.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List users (paginated) | `users:read` |
| GET | `/:id` | Get user by ID | `users:read` or own profile |
| PUT | `/:id` | Update user | `users:update` or own profile |
| PUT | `/:id/role` | Assign role to user | Super admin only |
| DELETE | `/:id` | Delete user | `users:delete` |

**Query (GET /):**  
- `page`, `limit`, `sortBy`, `sortOrder`, etc. (see validation schema).

---

## Roles

Base path: **`/api/v1/roles`**  
All routes require **authentication**.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List all roles | `roles:read` |
| GET | `/:id` | Get role by ID with permissions | `roles:read` |
| POST | `/` | Create role | Super admin only |
| PUT | `/:id` | Update role | Super admin only |
| DELETE | `/:id` | Delete role | Super admin only |
| POST | `/:id/permissions` | Assign permissions to role | Super admin only |
| DELETE | `/:id/permissions` | Remove permissions from role | Super admin only |

---

## Permissions

Base path: **`/api/v1/permissions`**  
All routes require **authentication** and **`roles:read`**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all permissions |
| GET | `/grouped` | Permissions grouped by module |

---

## Wills

Base path: **`/api/v1/wills`**  
All routes require **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's wills (paginated; admins may see more) |
| GET | `/:id` | Get will by ID |
| GET | `/:id/summary` | Get will with all related data |
| POST | `/` | Create new will |
| PUT | `/:id` | Update will |
| PUT | `/:id/step` | Update current step (legacy) |
| GET | `/:id/steps` | Get all steps status (progress) |
| GET | `/:id/steps/:stepNumber` | Get data for a specific step |
| PUT | `/:id/steps/:stepNumber` | Save step data and optionally advance/go back |
| POST | `/:id/unlock` | Unlock will for editing (e.g. after payment) |
| PUT | `/:id/pdf-path` | Save PDF path for will |
| POST | `/:id/complete` | Mark will as completed |
| DELETE | `/:id` | Delete will |

**Query (GET /):**  
- `page`, `limit`, `sortBy`, `sortOrder`, `status`, `will_type`.

**Body (POST /):**  
```json
{
  "will_type": "single"
}
```
- `will_type`: optional, from enum (e.g. single, joint).

**Body (PUT /:id):**  
```json
{
  "will_type": "single"
}
```

**Body (PUT /:id/step):**  
```json
{
  "current_step": 3
}
```
- `current_step`: integer 1–16.

**Body (PUT /:id/steps/:stepNumber):**  
```json
{
  "data": { ... },
  "action": "save_and_continue"
}
```
- `action`: e.g. `save_and_continue`, `save`, `go_back` (see implementation).
- Step locking: only the current step (highest completed + 1) is editable unless unlocked after payment.

**Body (POST /:id/unlock):**  
```json
{
  "payment_id": "pay_xxx"
}
```

**Body (PUT /:id/pdf-path):**  
```json
{
  "pdf_path": "/path/to/file.pdf"
}
```

**Body (POST /:id/complete):**  
```json
{
  "pdf_path": "/path/to/file.pdf"
}
```
- `pdf_path` optional.

### Dynamic form endpoints (wills)

Mounted under **`/api/v1/wills/:willId`** (same auth as wills).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/form` | Get form structure for the will |
| GET | `/progress` | Get progress across all steps |
| GET | `/form/:stepSlug` | Get step data by slug |
| PUT | `/form/:stepSlug` | Save step data |

---

## Will sub-resources

All under **`/api/v1/wills/:willId/...`**.  
Require **authentication** and a valid `willId`.  
Nested IDs (e.g. `executorId`, `spouseId`) are UUIDs unless otherwise noted.

### Testator

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/testators` | Get testator (path: `.../testators` with no trailing id) |
| POST | `/testators` | Create or update testator |
| PUT | `/testators` | Update testator |

*(In routes, testator is mounted at `.../wills/:willId/testators`; GET/POST/PUT use `/`.)*

### Executors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executors` | List executors |
| POST | `/executors` | Add executor |
| PUT | `/executors/reorder` | Reorder executors |
| PUT | `/executors/:id` | Update executor |
| DELETE | `/executors/:id` | Remove executor |

### Spouses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spouses` | List spouses |
| GET | `/spouses/:spouseId` | Get spouse by ID |
| POST | `/spouses` | Create spouse |
| PUT | `/spouses/:spouseId` | Update spouse |
| DELETE | `/spouses/:spouseId` | Delete spouse |
| POST | `/spouses/reorder` | Reorder spouses |

### Beneficiary (children, guardians, trustees, beneficiaries, charities)

Base: **`/api/v1/wills/:willId/beneficiary`**.

**Children**  
- GET `/children` — List  
- GET `/children/:childId` — Get one  
- POST `/children` — Create  
- PUT `/children/:childId` — Update  
- DELETE `/children/:childId` — Delete  
- POST `/children/reorder` — Reorder  

**Guardians**  
- GET `/guardians`, GET `/guardians/:guardianId`, POST `/guardians`, PUT `/guardians/:guardianId`, DELETE `/guardians/:guardianId`, POST `/guardians/reorder`

**Trustees**  
- GET `/trustees`, GET `/trustees/:trusteeId`, POST `/trustees`, PUT `/trustees/:trusteeId`, DELETE `/trustees/:trusteeId`, POST `/trustees/reorder`

**Beneficiaries**  
- GET `/beneficiaries`, GET `/beneficiaries/:beneficiaryId`, POST `/beneficiaries`, PUT `/beneficiaries/:beneficiaryId`, DELETE `/beneficiaries/:beneficiaryId`, POST `/beneficiaries/reorder`

**Charities**  
- GET `/charities`, GET `/charities/:charityId`, POST `/charities`, PUT `/charities/:charityId`, DELETE `/charities/:charityId`, POST `/charities/reorder`

### Assets

Base: **`/api/v1/wills/:willId/assets`**.

**Properties**  
- GET `/properties`, GET `/properties/:propertyId`, POST `/properties`, PUT `/properties/:propertyId`, DELETE `/properties/:propertyId`, POST `/properties/reorder`

**Bank accounts**  
- GET `/bank-accounts`, GET `/bank-accounts/:accountId`, POST `/bank-accounts`, PUT `/bank-accounts/:accountId`, DELETE `/bank-accounts/:accountId`, POST `/bank-accounts/reorder`

**Investments**  
- GET `/investments`, GET `/investments/:investmentId`, POST `/investments`, PUT `/investments/:investmentId`, DELETE `/investments/:investmentId`, POST `/investments/reorder`

**Valuable items**  
- GET `/valuable-items`, GET `/valuable-items/:itemId`, POST `/valuable-items`, PUT `/valuable-items/:itemId`, DELETE `/valuable-items/:itemId`, POST `/valuable-items/reorder`

**Digital assets**  
- GET `/digital-assets`, GET `/digital-assets/:assetId`, POST `/digital-assets`, PUT `/digital-assets/:assetId`, DELETE `/digital-assets/:assetId`, POST `/digital-assets/reorder`

**Intellectual assets**  
- GET `/intellectual-assets`, GET `/intellectual-assets/:assetId`, POST `/intellectual-assets`, PUT `/intellectual-assets/:assetId`, DELETE `/intellectual-assets/:assetId`, POST `/intellectual-assets/reorder`

### Debts

Base: **`/api/v1/wills/:willId/debts`**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List debts |
| GET | `/:debtId` | Get debt by ID |
| POST | `/` | Create debt |
| PUT | `/:debtId` | Update debt |
| DELETE | `/:debtId` | Delete debt |
| POST | `/reorder` | Reorder debts |

---

## Feedback

Base path: **`/api/v1/feedback`**  
Requires **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:willId` | Create feedback for a will |

**Content-Type:** `multipart/form-data` (files supported).  
**Body:** form fields plus `files` (max 5 files via `upload.array('files', 5)`).

---

## Packages

Base path: **`/api/v1/packages`**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List packages | Public |
| GET | `/:id` | Get package by ID | Public |
| POST | `/create-package` | Create package | Private |
| PUT | `/:id/update-package` | Update package | Private |
| DELETE | `/:id` | Delete package | Private |
| PUT | `/:id/select-package` | Select package | Private |

---

## Payment methods

Base path: **`/api/v1/payment-methods`**  
All routes require **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/all-payment-methods` | Get all payment methods |
| GET | `/:id` | Get payment method by ID |
| GET | `/:id/user-payment-methods` | Get user's payment methods |
| GET | `/:id/default` | Get default payment method |
| POST | `/create-payment-method` | Create payment method |
| PUT | `/:id/update-payment-method` | Update payment method |
| DELETE | `/:id/delete-payment-method` | Delete payment method |

---

## Payments

Base path: **`/api/v1/payments`**  
All routes require **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process-payment` | Process a payment |

---

## Stripe webhook

Base path: **`/api/v1/stripe/webhook`**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Stripe webhook handler (raw body for signature verification) | Stripe signature |

**Note:** This route uses `express.raw({ type: 'application/json' })`; do not send `Content-Type: application/json` with parsed JSON body from client. Stripe sends the raw payload and signature headers.

---

## Subscriptions

Base path: **`/api/v1/subscriptions`**  
All routes require **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's subscriptions |
| POST | `/` | Create subscription |
| PUT | `/:id/update-subscription` | Update subscription |
| PUT | `/:id/pause-subscription` | Pause subscription |
| PUT | `/:id/resume-subscription` | Resume subscription |
| PUT | `/:id/cancel-subscription` | Cancel subscription |

---

## Invoices

Base path: **`/api/v1/invoices`**  
All routes require **authentication**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/download` | Download invoice as PDF |
| POST | `/:id/send` | Send invoice via email |

---

## Admin — Form builder

Base path: **`/api/v1/admin/form-builder`**  
All routes require **authentication** and role **`admin`** or **`super_admin`**.

### Form templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create form template |
| GET | `/` | List form templates |
| GET | `/:id` | Get form template |
| GET | `/:id/full` | Get form template with full structure (steps + fields) |
| PUT | `/:id` | Update form template |
| DELETE | `/:id` | Delete form template |
| POST | `/:id/clone` | Clone form template |

### Versions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/publish` | Publish form |
| POST | `/:id/unpublish` | Unpublish form |
| GET | `/:id/versions` | Get version history |
| GET | `/:id/versions/:versionId` | Get specific version |
| POST | `/:id/versions/:versionId/restore` | Restore to a version |

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:formId/steps` | Create step |
| GET | `/:formId/steps` | List steps |
| PUT | `/:formId/steps/:stepId` | Update step |
| DELETE | `/:formId/steps/:stepId` | Delete step |
| PUT | `/:formId/steps/reorder` | Reorder steps |

### Fields

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:formId/steps/:stepId/fields` | Create field |
| GET | `/:formId/steps/:stepId/fields` | List fields for step |
| PUT | `/:formId/steps/:stepId/fields/:fieldId` | Update field |
| DELETE | `/:formId/steps/:stepId/fields/:fieldId` | Delete field |
| PUT | `/:formId/steps/:stepId/fields/reorder` | Reorder fields |

### Conditional rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:formId/rules` | Create conditional rule |
| GET | `/:formId/rules` | List rules |
| PUT | `/:formId/rules/:ruleId` | Update rule |
| DELETE | `/:formId/rules/:ruleId` | Delete rule |

### Edit locking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/lock` | Get lock status |
| POST | `/:id/lock` | Acquire edit lock |
| PUT | `/:id/lock` | Refresh edit lock (keep alive) |
| DELETE | `/:id/lock` | Release edit lock |

### Autosave

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/autosave` | Get autosave data |
| POST | `/:id/autosave` | Save autosave data |
| DELETE | `/:id/autosave` | Discard autosave data |

### Edit history

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/history` | Get edit history |
| GET | `/:id/history/:historyId` | Get specific history entry |

### Full form operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/:id/full` | Save full form structure (atomic) |
| POST | `/fields/:fieldId/move` | Move field to another step |
| POST | `/fields/:fieldId/duplicate` | Duplicate field |

---

## Errors & rate limiting

- **Validation errors:** 400 with body describing invalid fields (Zod).
- **Unauthorized:** 401 when token is missing or invalid.
- **Forbidden:** 403 when user lacks permission or role.
- **Not found:** 404 for missing resources.
- **Rate limiting:** 429 with message when limit exceeded.  
  Specific limiters apply to auth (login/register, password reset, verification), packages, payment methods, payments, subscriptions, and invoices.  
  Stripe webhook does not use the same JSON body parser; it uses raw body for signature verification.

---

## Quick reference — base paths

| Resource | Base path |
|----------|-----------|
| Health | `/health`, `/api/v1/health` |
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Roles | `/api/v1/roles` |
| Permissions | `/api/v1/permissions` |
| Wills | `/api/v1/wills` |
| Testators | `/api/v1/wills/:willId/testators` |
| Executors | `/api/v1/wills/:willId/executors` |
| Spouses | `/api/v1/wills/:willId/spouses` |
| Beneficiary (children, guardians, etc.) | `/api/v1/wills/:willId/beneficiary` |
| Assets | `/api/v1/wills/:willId/assets` |
| Debts | `/api/v1/wills/:willId/debts` |
| Feedback | `/api/v1/feedback` |
| Packages | `/api/v1/packages` |
| Payment methods | `/api/v1/payment-methods` |
| Payments | `/api/v1/payments` |
| Stripe webhook | `/api/v1/stripe/webhook` |
| Subscriptions | `/api/v1/subscriptions` |
| Invoices | `/api/v1/invoices` |
| Admin form builder | `/api/v1/admin/form-builder` |
