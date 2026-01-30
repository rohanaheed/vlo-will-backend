# Will-Be Backend API

A Node.js/Express backend for a will-writing platform similar to willing.co.uk.

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Query Builder:** Kysely
- **Authentication:** Passport.js (Local + JWT)
- **Validation:** Zod
- **Logging:** Winston
- **Payments:** Stripe
- **PDF Generation:** PDFKit / Puppeteer

## Getting Started

### Prerequisites

- Node.js v18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Installation

1. Clone the repository and navigate to the backend folder:

```bash
cd backend
```

2. Install dependencies (already done if you ran the npm install command):

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/willbe
JWT_SECRET=your-super-secret-key
# ... other configurations
```

5. Create the database:

```bash
createdb willbe
```

6. Run migrations:

```bash
npm run migrate
```

7. Seed the database (creates roles, permissions, and super admin):

```bash
npm run seed
```

8. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run migrate` | Run pending migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:reset` | Reset database (rollback all + migrate) |
| `npm run seed` | Run database seeds |
| `npm run db:setup` | Run migrations + seeds |

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/logout` | Logout user |
| POST | `/refresh-token` | Refresh access token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password |
| GET | `/me` | Get current user |

### Users (`/api/v1/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users (admin) |
| GET | `/:id` | Get user by ID |
| PUT | `/:id` | Update user |
| PUT | `/:id/role` | Assign role (super_admin) |
| DELETE | `/:id` | Delete user |

### Roles (`/api/v1/roles`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List roles |
| GET | `/:id` | Get role with permissions |
| POST | `/` | Create role (super_admin) |
| PUT | `/:id` | Update role (super_admin) |
| DELETE | `/:id` | Delete role (super_admin) |
| POST | `/:id/permissions` | Assign permissions |
| DELETE | `/:id/permissions` | Remove permissions |

### Wills (`/api/v1/wills`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's wills |
| GET | `/:id` | Get will by ID |
| GET | `/:id/summary` | Get will with all data |
| POST | `/` | Create new will |
| PUT | `/:id` | Update will |
| PUT | `/:id/step` | Update current step |
| POST | `/:id/complete` | Mark as completed |
| DELETE | `/:id` | Delete will |

### Will Sub-resources

Each will has nested resources:

- `/api/v1/wills/:willId/testator` - Testator info
- `/api/v1/wills/:willId/executors` - Executors
- `/api/v1/wills/:willId/trustees` - Trustees
- `/api/v1/wills/:willId/guardians` - Guardians
- `/api/v1/wills/:willId/children` - Children
- `/api/v1/wills/:willId/beneficiaries` - Beneficiaries
- `/api/v1/wills/:willId/charities` - Charities
- `/api/v1/wills/:willId/assets` - Assets
- `/api/v1/wills/:willId/debts` - Debts
- `/api/v1/wills/:willId/pets` - Pets
- `/api/v1/wills/:willId/funeral` - Funeral wishes
- `/api/v1/wills/:willId/witnesses` - Witnesses

## Role-Based Access Control

### Roles

| Role | Description |
|------|-------------|
| `user` | Regular user - can manage own wills |
| `admin` | Admin - permissions assigned by super_admin |
| `super_admin` | Full system access |

### Default Super Admin

After running seeds, a super admin user is created:

- **Email:** admin@willbe.com
- **Password:** SuperAdmin@123

**Important:** Change this password immediately in production!

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── db/              # Database (migrations, seeds)
│   ├── middleware/      # Express middleware
│   ├── modules/         # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── wills/
│   │   ├── testators/
│   │   ├── executors/
│   │   └── ...
│   ├── routes/          # Route aggregator
│   ├── utils/           # Utility functions
│   └── app.js           # Express app setup
├── logs/                # Log files (gitignored)
├── .env.example         # Environment template
├── package.json
└── server.js            # Entry point
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

ISC
