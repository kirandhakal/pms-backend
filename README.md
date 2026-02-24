# Kanban Backend API

Production-focused, simple backend built with Express + TypeORM + PostgreSQL.

## Stack

- Node.js + TypeScript
- Express
- TypeORM + PostgreSQL
- JWT access token auth
- bcrypt password hashing
- Zod validation

## Auth and Roles

- Roles: `USER`, `ADMIN`, `SUPER_ADMIN`
- Access token is required for protected APIs
- Session records are stored server-side and invalidated on logout
- Passwords are hashed using bcrypt

## User fields

The `User` model includes:

- `id`
- `fullName`
- `email` (unique)
- `password` (hashed, hidden from default selects)
- `role`
- `isActive`
- `createdAt`
- `updatedAt`

These fields are enough for current auth, RBAC, account lifecycle, and audit timestamps while keeping the model small for future extension.

## Environment

Create `.env` in `backend/`:

```env
PORT=5000
DATABASE_URL=postgres://<user>:<password>@localhost:5432/<db>
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
BOOTSTRAP_SECRET=optional_one_time_secret
```

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout` (protected)
- `GET /api/auth/me` (protected)
- `PATCH /api/auth/profile` (protected)
- `PATCH /api/auth/change-password` (protected)
- `POST /api/auth/setup-super-admin` (guarded by `x-bootstrap-secret`)

### User Management

- `GET /api/users` (`ADMIN`, `SUPER_ADMIN`)
- `POST /api/users/admins` (`SUPER_ADMIN`)

### Dashboards

- `GET /api/dashboard/user` (`USER`, `ADMIN`, `SUPER_ADMIN`)
- `GET /api/dashboard/admin` (`ADMIN`, `SUPER_ADMIN`)
- `GET /api/dashboard/super-admin` (`SUPER_ADMIN`)

### Landing Page Public APIs

- `GET /api/public/stats`
- `GET /api/public/features`