# MyNotes Backend

Express + PostgreSQL server for the MyNotes app. See the [root README](../README.md) for project overview.

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL to your Postgres connection string
npm run dev
```

Server listens on `http://localhost:4000` by default. The schema is created (idempotently) on every startup.

## Scripts

- `npm start` — production-style start (`node src/server.js`).
- `npm run dev` — development with auto-reload (`nodemon`).

## Environment variables

See `.env.example`. The most important ones:

- `PORT` — HTTP port (default `4000`).
- `DATABASE_URL` — **required.** PostgreSQL connection string. Example for Neon:
  `postgresql://user:pass@ep-xyz-pooler.neon.tech/dbname?sslmode=require`
- `DB_POOL_MAX` — max connections in the pool (default `10`).
- `DB_IDLE_TIMEOUT_MS` / `DB_CONNECTION_TIMEOUT_MS` — pool timeouts.
- `JWT_SECRET` — optional. If empty, a random secret is generated and stored in the `settings` table so it survives restarts.
- `JWT_EXPIRES_IN_HOURS` — session lifetime in hours (default `72`).
- `BCRYPT_COST` — bcrypt cost factor for the master PIN (default `12`).
- `CORS_ORIGIN` — frontend origin for CORS (default `http://localhost:5173`).

## API (so far)

| Method | Path                | Auth | Description |
|--------|---------------------|------|-------------|
| GET    | `/api/health`       | —    | Liveness probe. |
| GET    | `/api/auth/status`  | —    | `{ isSetup: boolean }` — whether the master PIN has been set. |
| POST   | `/api/auth/setup`   | —    | One-time PIN creation. Body: `{ "pin": "..." }`. |
| POST   | `/api/auth/login`   | —    | Body: `{ "pin": "..." }` → `{ token, expiresInHours }`. |
| POST   | `/api/auth/change`  | JWT  | Body: `{ "currentPin", "newPin" }` → new token. |
| GET    | `/api/me`           | JWT  | Token sanity probe. |

Authenticated requests use `Authorization: Bearer <token>`.

## Resetting

To start over (e.g. lost the PIN), connect to your DB and run:

```sql
DELETE FROM settings WHERE key = 'master_pin_hash';
```

Then call `POST /api/auth/setup` again with a new PIN.

To wipe everything (including projects/notes), drop and recreate the schema:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

The next server start will recreate all tables from `src/db/schema.sql`.

## Notes on Neon

- The pooled host (`-pooler` in the URL) is recommended — `pg.Pool` works well with it.
- SSL is required by Neon. The server auto-detects `sslmode=require` and configures TLS with `rejectUnauthorized: false` (encrypted in transit; CA verification skipped for simplicity in a personal app).
