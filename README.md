# Will-Be - Online Will Writing Platform

A professional online will writing platform. Users can create General or Islamic wills through a multi-step form, pay for their will, and download a legally-formatted PDF.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Database:** PostgreSQL (Neon)
- **Query Builder:** Kysely (type-safe SQL)
- **Authentication:** Passport.js (Local + JWT)
- **Validation:** Zod
- **Logging:** Winston + Morgan
- **Payments:** Stripe
- **PDF Generation:** PDFKit / Puppeteer

## Project Structure

```
will-be/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (database, passport, stripe, email)
│   │   ├── db/
│   │   │   ├── migrations/  # Database migrations
│   │   │   └── seeds/       # Database seeds
│   │   ├── middleware/      # Express middleware (auth, rbac, validation, etc.)
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── users/       # User management
│   │   │   ├── roles/       # Role management
│   │   │   ├── permissions/ # Permission management
│   │   │   ├── wills/       # Will management + step handling
│   │   │   ├── testators/   # Testator information
│   │   │   └── executors/   # Executor management
│   │   ├── routes/          # Route aggregation
│   │   └── utils/           # Utilities (logger, errors, helpers)
│   ├── .env                 # Environment variables
│   └── server.js            # Entry point
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and secrets

# Run migrations
npm run migrate

# Seed initial data (roles, permissions, super admin)
npm run seed

# Start development server
npm run dev
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npm run migrate` | Run pending migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:reset` | Reset and re-run all migrations |
| `npm run seed` | Run database seeds |
| `npm run db:setup` | Run migrations + seeds |
| `npm run db:reset` | Reset migrations + re-seed |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/auth/verify-email` | Verify email |

### Wills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/wills` | List user's wills |
| POST | `/api/v1/wills` | Create new will |
| GET | `/api/v1/wills/:id` | Get will by ID |
| PUT | `/api/v1/wills/:id` | Update will |
| DELETE | `/api/v1/wills/:id` | Delete will |
| GET | `/api/v1/wills/:id/summary` | Get will with all related data |

### Will Steps (Multi-step Form)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/wills/:id/steps` | Get all steps status (for progress bar) |
| GET | `/api/v1/wills/:id/steps/:stepNumber` | Get step data |
| PUT | `/api/v1/wills/:id/steps/:stepNumber` | Save step data |
| POST | `/api/v1/wills/:id/unlock` | Unlock for editing (after payment) |

---

## Complete API Flow Guide

This section explains the complete flow from user registration to will completion with real API examples.

### Flow Overview

```
1. User registers/logs in
2. User clicks "Start Document" → Create Will API
3. User fills Step 1 (Testator) → Save Step API
4. User fills Step 2 (Executors) → Save Step API (with array)
5. User fills Step 3 (Spouse) → Save Step API
6. ... continue all steps ...
7. User pays → Payment API + Unlock API
8. Will is locked, user can download PDF
```

---

### Step 1: Register & Login

**Register:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Login:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "john@example.com" },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

> Save `accessToken` - use it in all subsequent requests as `Authorization: Bearer {token}`

---

### Step 2: Create Will (Start Document)

When user clicks **"Start Document"** button, they first select the will type:

```bash
POST /api/v1/wills
Content-Type: application/json
Authorization: Bearer {token}

{
  "will_type": "general"
}
```

> **Note:** `will_type` can be `"general"` or `"islamic"`. This determines the number of steps (12 vs 16).

**Response:**
```json
{
  "success": true,
  "data": {
    "will": {
      "id": "e32ab0b4-2c90-4d12-bf6b-d8ca624c3ed5",
      "will_type": "general",
      "status": "draft",
      "current_step": 1
    }
  }
}
```

> Save `will.id` - use it for all step operations

**Flow:**
1. User clicks "Start Document"
2. User selects will type (General / Islamic)
3. API creates will → returns `will.id`
4. Redirect to Step 1 form
5. **Marital status is collected in Step 1** (Testator form)

---

### Step 3: Fill Form Steps

#### Step 1 - Testator (Your Details)

```bash
PUT /api/v1/wills/{willId}/steps/1
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "title": "Mr",
    "full_name": "John Alexander Smith",
    "known_as": null,
    "gender": "male",
    "building_number": "1568",
    "building_name": "Sky Land",
    "street": "Wood Street",
    "town": "Leyton",
    "city": "London",
    "county": "London",
    "postcode": "E10 5AB",
    "country": "United Kingdom",
    "national_insurance_number": "AB123456C",
    "date_of_birth": "1990-01-15",
    "phone_country_code": "+44",
    "phone": "7890123456",
    "email": "john@example.com",
    "marital_status": "married",
    "include_future_marriage_clause": false,
    "declaration_confirmed": true,
    "jurisdiction": "england"
  },
  "action": "save_and_continue"
}
```

---

#### Step 2 - Executors (Multiple Items with Add Button)

When user adds multiple executors using **"+ Add"** button, send as array:

```bash
PUT /api/v1/wills/{willId}/steps/2
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "executors": [
      {
        "executor_type": "individual",
        "title": "Mr",
        "full_name": "Robert Wilson",
        "relationship_to_testator": "spouse",
        "phone_country_code": "+44",
        "phone": "7890123456",
        "email": "robert@example.com",
        "is_alternate": false,
        "is_backup": false
      },
      {
        "executor_type": "individual",
        "title": "Mrs",
        "full_name": "Sarah Johnson",
        "relationship_to_testator": "sister",
        "phone_country_code": "+44",
        "phone": "7890654321",
        "email": "sarah@example.com",
        "is_alternate": true,
        "is_backup": false
      },
      {
        "executor_type": "professional",
        "business_name": "Wilson & Co. Solicitors",
        "role_title": "solicitor",
        "phone_country_code": "+44",
        "phone": "2071234567",
        "email": "legal@wilsonsolicitors.co.uk",
        "is_alternate": false,
        "is_backup": true
      }
    ]
  },
  "action": "save_and_continue"
}
```

**Key Points for Arrays:**
- Each **"+ Add"** click adds a new object to the array
- **"× Remove"** click removes that object from array
- Send the ENTIRE array on save (backend replaces all)
- `order_index` is auto-assigned based on array position

---

#### Step 3 - Spouse

```bash
PUT /api/v1/wills/{willId}/steps/3
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "full_name": "Jane Smith",
    "is_same_address": true,
    "address_line_1": "1568 Sky Land, Wood Street",
    "city": "London",
    "county": "London",
    "postcode": "E10 5AB",
    "country": "United Kingdom"
  },
  "action": "save_and_continue"
}
```

---

#### Step 4 - Children (Multiple Items)

```bash
PUT /api/v1/wills/{willId}/steps/4
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "children": [
      {
        "full_name": "Emma Smith",
        "date_of_birth": "2015-03-20",
        "is_minor": true,
        "is_dependent": true
      },
      {
        "full_name": "James Smith",
        "date_of_birth": "2010-07-15",
        "is_minor": true,
        "is_dependent": true
      }
    ]
  },
  "action": "save_and_continue"
}
```

---

#### Step 5 - Guardians (Multiple Items)

```bash
PUT /api/v1/wills/{willId}/steps/5
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "guardians": [
      {
        "full_name": "Michael Brown",
        "relationship_to_testator": "brother",
        "address_line_1": "45 Oak Avenue",
        "city": "Manchester",
        "postcode": "M1 2AB",
        "country": "United Kingdom",
        "is_substitute": false
      },
      {
        "full_name": "Lisa Brown",
        "relationship_to_testator": "sister_in_law",
        "address_line_1": "45 Oak Avenue",
        "city": "Manchester",
        "postcode": "M1 2AB",
        "country": "United Kingdom",
        "is_substitute": true
      }
    ]
  },
  "action": "save_and_continue"
}
```

---

### Navigation Actions

| Action | When to Use | Behavior |
|--------|-------------|----------|
| `save_and_continue` | User clicks "Save and Continue" | Saves data, moves to next step |
| `save` | Auto-save / draft save | Saves data, stays on same step |
| `save_and_back` | User clicks "Back" after editing | Saves data, moves to previous step |

---

### Get Step Data (Load Existing Data)

When user returns to a step or refreshes page:

```bash
GET /api/v1/wills/{willId}/steps/2
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "step": 2,
    "status": "completed",
    "can_edit": true,
    "locked_reason": null,
    "data": {
      "executors": [
        {
          "id": "abc-123",
          "executor_type": "individual",
          "full_name": "Robert Wilson",
          ...
        }
      ]
    },
    "will_info": {
      "current_step": 5,
      "highest_completed_step": 4,
      "is_paid": false
    }
  }
}
```

---

### Get All Steps Status (Progress Bar)

For rendering the progress bar with step states:

```bash
GET /api/v1/wills/{willId}/steps
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      { "step": 1, "status": "completed", "can_edit": true },
      { "step": 2, "status": "completed", "can_edit": true },
      { "step": 3, "status": "completed", "can_edit": true },
      { "step": 4, "status": "current", "can_edit": true },
      { "step": 5, "status": "upcoming", "can_edit": false },
      ...
    ],
    "will_info": {
      "total_steps": 12,
      "is_paid": false
    }
  }
}
```

---

### After Payment - Locking Flow

**Before Payment:** User can freely edit any completed step

**After Payment:**
```bash
POST /api/v1/wills/{willId}/unlock
Content-Type: application/json
Authorization: Bearer {token}

{
  "payment_id": "pi_stripe_payment_id"
}
```

After this, all steps become `locked`. To edit again, user must pay again.

---

## Multi-Step Form Flow

### Will Types & Steps

**General Will (12 steps):**

| Step | Name | Description |
|------|------|-------------|
| 1 | Testator | Personal details of the will maker |
| 2 | Executors | People who will execute the will |
| 3 | Spouse | Spouse/partner information (if married) |
| 4 | Children | Children information |
| 5 | Guardians | Guardians for minor children |
| 6 | Inheritance Age | Age at which beneficiaries inherit |
| 7 | Gifts & Beneficiaries | Specific gifts and beneficiaries |
| 8 | Remainder Beneficiaries | Who gets the remainder of the estate |
| 9 | Total Failure | What happens if all beneficiaries die |
| 10 | Pets | Pet care provisions |
| 11 | Final Wishes | Funeral wishes and additional clauses |
| 12 | Signing | Signing details and witnesses |

**Islamic Will (16 steps):** Includes all General Will steps plus:

| Step | Name | Description |
|------|------|-------------|
| 13 | School of Thought | Islamic jurisprudence school |
| 14 | Religious Obligations | Unfulfilled religious duties |
| 15 | Charitable Bequests | Sadaqah jariyah (max 1/3 of estate) |
| 16 | Islamic Heirs | Heirs according to Faraid |

### Step Status Values

| Status | Description | Can Edit |
|--------|-------------|----------|
| `completed` | Step done (before payment) | Yes |
| `current` | Current step to fill | Yes |
| `upcoming` | Future step, not yet accessible | No |
| `locked` | Paid but not unlocked | No |
| `editable` | Paid and unlocked for editing | Yes |

### Step Locking Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                      WILL LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BEFORE PAYMENT (DRAFT / IN-PROGRESS)                        │
│     ├── User fills step 1 → clicks "Save & Continue"            │
│     ├── User moves to step 2                                    │
│     ├── User can GO BACK to step 1 and EDIT freely              │
│     ├── No locking before payment!                              │
│     ├── Repeat until all steps completed                        │
│     └── Will status → COMPLETED                                 │
│                                                                  │
│  2. AFTER PAYMENT (LOCKED)                                      │
│     ├── is_paid = true                                          │
│     ├── All steps are LOCKED (view only)                        │
│     ├── User cannot edit any step                               │
│     └── Must pay again to unlock for editing                    │
│                                                                  │
│  3. PAID TO EDIT (UNLOCKED)                                     │
│     ├── edit_unlocked = true                                    │
│     ├── User can edit ANY step                                  │
│     └── On save → edit_unlocked = false (locked again)          │
│                                                                  │
│  4. LOCKED AGAIN                                                │
│     ├── edit_unlocked = false                                   │
│     ├── All steps locked again                                  │
│     └── Another payment required to edit                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Usage Examples

**Save Step 1 (Testator) and Continue:**

```bash
PUT /api/v1/wills/{willId}/steps/1
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": {
    "full_name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-15",
    "address_line_1": "123 Main Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "action": "save_and_continue"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Step saved successfully",
  "data": {
    "will": {
      "id": "e32ab0b4-2c90-4d12-bf6b-d8ca624c3ed5",
      "status": "in_progress",
      "current_step": 2,
      "highest_completed_step": 1,
      "is_paid": false,
      "edit_unlocked": false
    },
    "saved_step": 1,
    "next_step": 2
  }
}
```

**Action Values:**

| Action | Behavior |
|--------|----------|
| `save_and_continue` | Save step data, lock step, advance to next step |
| `save` | Save step data only (no navigation) |
| `save_and_back` | Save step data, go to previous step |

**Get Step Status (for Progress Bar):**

```bash
GET /api/v1/wills/{willId}/steps
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "steps": [
      { "step": 1, "status": "locked", "can_edit": false },
      { "step": 2, "status": "current", "can_edit": true },
      { "step": 3, "status": "upcoming", "can_edit": false },
      ...
    ],
    "will_info": {
      "id": "...",
      "status": "in_progress",
      "current_step": 2,
      "highest_completed_step": 1,
      "is_paid": false,
      "edit_unlocked": false,
      "total_steps": 12
    }
  }
}
```

**Unlock After Payment:**

```bash
POST /api/v1/wills/{willId}/unlock
Content-Type: application/json
Authorization: Bearer {token}

{
  "payment_id": "pay_xxxx"
}
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `roles` | User roles (user, admin, super_admin) |
| `permissions` | Granular permissions |
| `role_permissions` | Role-permission mapping |
| `wills` | Will records with status tracking |

### Will-Related Tables

| Table | Description |
|-------|-------------|
| `testators` | Will maker personal info |
| `spouses` | Spouse information |
| `executors` | Will executors |
| `trustees` | Trustees for trusts |
| `guardians` | Guardians for minor children |
| `children` | Children information |
| `beneficiaries` | Beneficiaries (individuals) |
| `charities` | Charity beneficiaries |
| `assets` | Estate assets |
| `debts` | Outstanding debts |
| `pets` | Pet care provisions |
| `funeral_wishes` | Funeral preferences |
| `witnesses` | Signing witnesses |
| `total_failure_clauses` | Wipeout provisions |
| `wipeout_beneficiaries` | Backup beneficiaries |

### Islamic Will Tables

| Table | Description |
|-------|-------------|
| `islamic_will_details` | Islamic-specific details |
| `islamic_heirs` | Heirs according to Faraid |

### Payment & Subscription

| Table | Description |
|-------|-------------|
| `subscriptions` | User subscriptions |
| `payments` | Payment records |

### System Tables

| Table | Description |
|-------|-------------|
| `audit_logs` | Action audit trail |
| `password_resets` | Password reset tokens |

---

## Role-Based Access Control

### Roles

| Role | Description |
|------|-------------|
| `user` | Regular user - can create/manage own wills |
| `admin` | Administrator - can manage users and view wills |
| `super_admin` | Full access - can manage roles and permissions |

### Key Permissions

- `users:read`, `users:create`, `users:update`, `users:delete`
- `wills:read`, `wills:create`, `wills:update`, `wills:delete`
- `roles:read`, `roles:create`, `roles:update`, `roles:delete`
- `permissions:read`, `permissions:assign`

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
EMAIL_FROM=noreply@willbe.com

# Frontend
FRONTEND_URL=http://localhost:3001
```

---

## License

ISC
