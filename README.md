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

## Multi-Step Form Flow

### Will Types & Steps

**General Will (12 steps):**

| Step | Name | Description |
|------|------|-------------|
| 1 | Testator | Personal details of the will maker |
| 2 | Spouse | Spouse/partner information (if married) |
| 3 | Executors | People who will execute the will |
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
| `locked` | Step completed, view only | No |
| `current` | Current step to fill | Yes |
| `upcoming` | Future step, not yet accessible | No |
| `editable` | Paid and unlocked for editing | Yes |

### Step Locking Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                      WILL LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DRAFT / IN-PROGRESS                                         │
│     ├── User fills step 1 → clicks "Save & Continue"            │
│     ├── Step 1 becomes LOCKED (view only)                       │
│     ├── User moves to step 2                                    │
│     ├── Repeat until all steps completed                        │
│     └── Will status → COMPLETED                                 │
│                                                                  │
│  2. COMPLETED (LOCKED)                                          │
│     ├── All steps are locked (view only)                        │
│     ├── User must PAY to edit                                   │
│     └── Payment unlocks all steps for editing                   │
│                                                                  │
│  3. PAID (UNLOCKED)                                             │
│     ├── is_paid = true                                          │
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
