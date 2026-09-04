# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Kipato is a mobile-first, offline-first income record tool for informal/gig workers in Kenya. Workers log daily cash earnings and generate verifiable income statements for SACCOs and lenders.

- **Backend**: Flask REST API with PostgreSQL database
- **Frontend**: React 19 + Vite + TailwindCSS 4 + TanStack Query (`frontend/`)

## Development Commands

### Backend (Flask)

```bash
cd server

# Install dependencies
pip install -r ../requirements.txt

# Required before anything touches the app: Config.validate() refuses to start
# without these.
export DATABASE_URL=postgresql://localhost/kipato SECRET_KEY=dev-secret

# Database setup
flask db upgrade
python seed_roles.py
python seed_demo.py   # ten demo workers + an admin, all with password demopass123

# Run development server
python app.py
# Or: FLASK_DEBUG=true FLASK_PORT=5000 python app.py

# Database migrations
flask db migrate -m "message"
flask db upgrade
flask db downgrade

# Run tests (from the repo root; pyproject sets testpaths)
python -m pytest

# Lint
ruff check .
```

### Frontend (React + Vite)

```bash
cd frontend

npm install
cp .env.example .env.local   # VITE_DATA_MODE=api to talk to the backend

npm run dev       # dev server on :5173
npm run build     # tsc -b && vite build
npm test          # vitest
npm run lint      # oxlint
```

### Whole stack

```bash
docker compose up -d    # Postgres (host :5433) + backend (:5000)
```

### Deploy

```bash
vercel deploy --prod    # one project: static SPA + /api/* on a Python function
```

Production runs on Neon Postgres. `api/index.py` is the serverless entry point;
`vercel.json` routes `/api/*` to it and everything else to the SPA shell. Run
`flask db upgrade` against Neon before shipping a schema change.

The backend image's entrypoint waits for Postgres, runs `flask db upgrade` and
seeds roles before starting.

## Architecture

### Backend Architecture

**Application Factory Pattern**: `server/app.py` contains `create_app()` factory.

**Key Components**:
- `app.py`: Factory, blueprint registration, error handlers, health check
- `extensions.py`: Shared extension instances (db, migrate, cors, limiter)
- `config.py`: Config classes reading from environment variables
- `models.py`: SQLAlchemy models with `to_dict()` serializers
- `routes/`: Blueprints per domain (auth, income, mpesa, statements, admin)
- `rbac.py`: Authorization decorators (`@login_required`, `@admin_required`)
- `utils/mpesa_parser.py`: Parses individual M-PESA messages
- `utils/mpesa_bulk.py`: Detects and unpacks bulk sources (SMS backup XML,
  statement CSV) into that same parser
- `utils/mailer.py`: SMTP sender; logs instead of sending when SMTP is unset

**Authentication**: Session-based auth using Flask sessions. User loaded into `g.current_user` via `@app.before_request` middleware. All authenticated routes use decorators from `rbac.py`.

**Database Models**:
- `User`, `Role`, `IncomeEntry`, `MpesaImport`, `Statement`, `StatementEntry`
- `User.set_role_by_name()` assigns roles; `User.is_admin()` checks admin status
- All models have `to_dict()` methods

**API Structure**:
- All routes under `/api/` prefix
- Blueprints: `/api/auth`, `/api/income`, `/api/mpesa`, `/api/statements`, `/api/admin`
- Rate limiting enabled via Flask-Limiter
- CORS configured for frontend origins via `FRONTEND_ORIGINS`

**Error Handling**: Structured JSON error responses with consistent format via global error handlers.

### Frontend Architecture

**Data layer**: `src/data/repository.ts` picks a backend from `VITE_DATA_MODE` —
`mock` (self-contained demo data, the default) or `api`. Feature code only ever
talks to `repository`, so both modes stay interchangeable.

**Offline**: `src/lib/offline-store.ts` holds an IndexedDB outbox of entries
logged with no signal plus a cache of the last successful reads;
`src/lib/sync-engine.ts` drains the outbox on reconnect. Queued entries carry a
`client_uuid` that the API de-duplicates on, so replays are safe.

**Roles**: the router sends admins to `/admin` (`AdminShell`, its own nav) and
workers to `/app` (`AppShell`). An admin has no income of their own, so the
worker dashboard would only ever show them zeros.

**Structure**: `src/features/<domain>/` for pages and domain components,
`src/components/ui/` for the shared brutalist primitives, `src/lib/` for
framework-free helpers.

## Environment Configuration

See `.env.example` for required variables.

## Git Workflow

Main branch: `main`. Use feature branches for new work.

## Common Pitfalls

1. **Role Assignment**: Use `User.set_role_by_name()` for new users.
2. **Auth Check**: Always check `g.current_user` is not None before accessing properties.
3. **CORS**: Ensure `FRONTEND_ORIGINS` includes your frontend URL.
4. **Database Sessions**: SQLAlchemy manages sessions automatically. Use `db.session.commit()` after changes.
5. **Mirrored M-PESA parsers**: `server/utils/mpesa_parser.py` +
   `mpesa_bulk.py` and `frontend/src/lib/mpesa-parser.ts` + `mpesa-bulk.ts`
   implement the same rules against matching test suites. Change them together.
6. **Card colours**: pass `tone` to `HardCard`, never a `bg-*` class in
   `className`. Tailwind emits both at the same specificity, so an override wins
   or loses on CSS order alone.
7. **Offline writes**: send a `client_uuid` with any income entry that might be
   replayed; the API returns the existing entry with 200 rather than duplicating.
8. **Postgres enums**: a migration that drops tables must drop the `incomemethod`
   and `syncstatus` types too, or the next upgrade fails.
9. **Serverless database**: production points at Neon's **pooled** endpoint and
   relies on `pool_pre_ping`. A direct (non-pooler) URL will exhaust connections
   once more than a couple of function instances are warm.
10. **Demo data is generated**: `server/seed_data.py` is seeded with a fixed
    number so screenshots and demos stay comparable between runs.
11. **Public route**: `GET /api/statements/shared/<token>` and the `/s/:token`
    page are deliberately unauthenticated. Anything added to that response is
    visible to anyone holding the link.
12. **Email-dependent flows** return 503 when no SMTP host is configured rather
    than reporting a success that never arrives. Tests use the `mail_enabled`
    fixture to represent a deployment that can send.
13. **Rate limiting** uses `server/utils/ratelimit_storage.py` on Vercel so
    counters are shared between instances; in-process counters would reset on
    every cold start.
