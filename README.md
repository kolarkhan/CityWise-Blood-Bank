# CityWise Blood Bank & Donor Platform

Production-oriented Next.js App Router platform for donors, receivers/hospitals, blood banks, and admins.

## Stack
- Next.js App Router + TypeScript
- MongoDB + Mongoose
- Tailwind CSS + reusable UI component system
- Custom JWT auth (HTTP-only cookie sessions)
- Zod validation for API payloads
- Route handlers for backend APIs

## Roles
- `SUPER_ADMIN`
- `CITY_ADMIN`
- `BLOOD_BANK_ADMIN`
- `DONOR`
- `RECEIVER`
- `HOSPITAL`

## Implemented Modules
- Auth: register/login/logout/me, verification placeholder (`123456` demo code)
- RBAC middleware for dashboard routes
- Donor profile, availability, eligibility cooldown (90 days), request acceptance, history
- Receiver/Hospital request creation and tracking
- Blood bank onboarding + admin verification + inventory and appointments
- Admin user moderation, bank verification, request moderation, analytics
- Search endpoint for city + blood group (donors and blood banks)
- Notifications API (read/unread + mark all read)
- Audit log persistence

## Database Models
- `User`
- `BloodBank`
- `Inventory`
- `DonationRequest`
- `Appointment`
- `Notification`
- `AuditLog`

Indexes are included for key lookups (`city+bloodGroup`, `role`, `isAvailable`, `expiryDate`, etc.).

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Configure env vars in `.env.local`:
- `MONGODB_URI`
- `JWT_SECRET` (minimum 32 chars)
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_MAPS_API_KEY` (for automatic city detection from coordinates)
- `GOOGLE_CLIENT_ID` (Google OAuth client id, used for server-side token verification)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same client id, used to render Google sign-in button)

4. Run dev:
```bash
npm run dev
```

5. Open:
`http://localhost:3000`

## Seed Demo Data
```bash
npm run seed
```

Seeded login password for demo users:
- `Password123!`

Seeded emails:
- `superadmin@citywise.local`
- `cityadmin@citywise.local`
- `bankadmin@citywise.local`
- `donor1@citywise.local`
- `receiver@citywise.local`

## Build & Start
```bash
npm run build
npm run start
```

## API Highlights
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/search?city=...&bloodGroup=...`
- `POST /api/requests`
- `POST /api/requests/:id/accept`
- `GET|POST /api/inventory`
- `POST /api/inventory/cleanup`
- `PATCH /api/admin/banks/:id/verify`
- `PATCH /api/admin/users/:id/block`
- `PATCH /api/admin/requests/:id/status`
- `GET|PATCH /api/notifications`

## Notes
- Rate limiting is implemented in-memory for sensitive auth endpoints.
- Security headers are configured in `next.config.ts`.
- Replace mock notification provider with real email/SMS provider for production.
