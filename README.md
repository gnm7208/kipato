# Kipato — Gig-Worker Income Record

> A lightweight tool that lets an informal worker log daily cash earnings and generates a **verifiable income record** they can show a SACCO or lender.

## Live demo

**<https://kipato.vercel.app>**

| Role | Phone | Password |
|---|---|---|
| worker | `+254700000001` | `demopass123` |
| admin | `+254700000002` | `demopass123` |

Signing in as the worker opens their own record; signing in as the admin opens
the verification desk at `/admin`. The demo carries ten seeded workers with
several months of history each — all of it generated, none of it real. Anyone
with the link can sign in, so treat the demo database as public.

| | |
|---|---|
| Source | [github.com/gnm7208/kipato](https://github.com/gnm7208/kipato) |
| App + API | [Vercel — gnm7208s-projects/kipato](https://vercel.com/gnm7208s-projects/kipato) |
| Postgres | [Neon — kipato (eu-central-1)](https://console.neon.tech/app/projects/super-frost-00864706) |

## Features

- **One-tap income logging** — faster than a notebook, works with no signal
- **M-PESA import** — paste one message or import a whole history at once; incoming payments become entries, outgoing ones never do
- **Shareable income statement** — a revocable, expiring link a SACCO or lender can open with no account
- **Trends** — average daily/weekly/monthly income, consistency over time
- **Offline-first** — entries logged without a signal are queued on the phone and synced on reconnect

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Flask + SQLAlchemy + Alembic + PostgreSQL |
| Frontend | React 19 + Vite + TailwindCSS 4 + TanStack Query |
| Auth | Session-based + RBAC decorators |
| Offline | IndexedDB outbox + read cache, service worker app shell |
| Lint | ruff (backend), oxlint (frontend) |
| Testing | pytest (backend), vitest (frontend) |
| Deploy | Vercel (SPA + Flask serverless API) + Neon (Postgres) |

## Quick Start

### Everything at once (Docker)

```bash
cp .env.example .env
docker compose up -d
```

The backend container waits for Postgres, applies migrations and seeds roles
before serving on <http://localhost:5000>. Postgres is published on host port
**5433** so it never collides with a local Postgres on 5432.

Add the demo worker and admin:

```bash
docker compose exec backend sh -c "cd /app/server && python seed_demo.py"
```

### Backend on its own

```bash
pip install -r requirements.txt
cd server
export DATABASE_URL=postgresql://localhost/kipato SECRET_KEY=dev-secret
flask db upgrade
python seed_roles.py
python seed_demo.py     # optional demo data
python app.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_DATA_MODE=api to use the backend
npm run dev
```

The frontend defaults to `VITE_DATA_MODE=mock`, which runs entirely on
self-contained demo data with no backend. Set `VITE_DATA_MODE=api` and point
`VITE_API_BASE_URL` at the backend to use the real API; that URL must appear in
the backend's `FRONTEND_ORIGINS`.

### Demo accounts

`python seed_demo.py` builds the same dataset the live demo runs on: ten workers
whose earning patterns differ on purpose — a boda rider who logs every day, a
fundi paid in irregular lumps, a mama mboga with small daily takings, and
someone who signed up last week and has barely logged anything. It is
deterministic, so the same command always produces the same database.

| Role | Phone | Password |
|---|---|---|
| worker | `+254700000001` | `demopass123` |
| admin | `+254700000002` | `demopass123` |

Every seeded worker uses `demopass123`; `/admin` lists them all.

## Offline behaviour

Logging income is the one thing that must work with no signal, so it does:

- An entry logged offline goes into an **IndexedDB outbox** and appears
  immediately in the record, badged `pending`.
- Each queued entry carries a `client_uuid`. The API treats a repeat of that key
  as the same entry, so replaying after a flaky connection cannot create
  duplicates.
- On reconnect the sync engine drains the outbox and refreshes the views. An
  entry the server keeps rejecting is dropped after 5 attempts rather than
  blocking everything queued behind it.
- Lists and trends are cached from the last successful read, so the app still
  shows a worker their record while offline; queued entries are folded into both.
- Signing out clears all cached records — phones get shared.
- A service worker caches the app shell (production builds only), so Kipato
  opens without a connection.

Editing, deleting and statement generation still need a connection and say so.

## M-PESA import

### One message, or the whole history

A browser cannot read a phone's SMS inbox — no such API exists — so importing
everything at once means handing Kipato a file. Three sources work:

| Source | What it is |
|---|---|
| Paste | One message or many, straight from the SMS app |
| `.xml` | An SMS Backup & Restore export from the phone |
| `.csv` | An M-PESA statement export (`Receipt No.` / `Completion Time` / `Paid In`) |

The format is detected automatically. Importing a year of messages is one
request, and because entries are keyed by M-PESA transaction code, importing the
same export again adds nothing — so a worker can re-import after every backup.

### What counts as income

The parser:

- reads the transaction amount, not the closing balance;
- reads Kenyan `day/month/year` dates;
- ignores anything sent, paid or withdrawn — only incoming money is income;
- de-duplicates on the M-PESA transaction code.

`server/utils/mpesa_parser.py` + `mpesa_bulk.py` and
`frontend/src/lib/mpesa-parser.ts` + `mpesa-bulk.ts` implement the same rules
against matching test suites; change them together.

## Sharing a statement

A statement is only proof if the worker can hand it to someone, so sharing
produces a real link:

- **Off by default.** Nothing is public until the worker taps share.
- **Unguessable** — a 32-byte token, on a rate-limited route.
- **Expires on its own**, 30 days by default and 180 at most.
- **Revocable**, and re-sharing rotates the token so an old link dies.
- **Minimal** — the public view returns the period, the total, the entries and
  the worker's name and phone. Nothing else about the account is exposed.

The lender opens `/s/<token>`: a printable statement, no account needed. The
page says plainly that Kipato records what the worker logged and what their
M-PESA messages confirmed, and does not vouch for entries logged as cash.

## API Endpoints

Full spec at `/api/docs` (Swagger UI).

### Auth
- `POST /api/auth/register` — Register worker (optional `email`)
- `POST /api/auth/login` — Login worker
- `POST /api/auth/logout` — Logout worker
- `GET /api/auth/me` — Get current user profile
- `PATCH /api/auth/me` — Update name or email
- `POST /api/auth/verify/request` — Send an email verification token
- `POST /api/auth/verify/confirm` — Confirm the token
- `POST /api/auth/password/forgot` — Start a password reset
- `POST /api/auth/password/reset` — Set a new password with the token

### Income
- `GET /api/income/entries` — List entries (paginated, filterable by date)
- `POST /api/income/entries` — Create income entry (accepts `client_uuid` for offline replay)
- `GET /api/income/entries/<id>` — Get single entry
- `PATCH /api/income/entries/<id>` — Update entry
- `DELETE /api/income/entries/<id>` — Delete entry
- `GET /api/income/trends` — Get income trends

### M-PESA
- `GET /api/mpesa/imports` — List imports
- `POST /api/mpesa/imports` — Import M-PESA messages
- `POST /api/mpesa/imports/preview` — Parse without saving

### Statements
- `GET /api/statements/` — List statements
- `POST /api/statements/` — Generate statement for date range
- `GET /api/statements/<id>` — Get statement with entries
- `POST /api/statements/<id>/share` — Create a link a lender can open
- `DELETE /api/statements/<id>/share` — Stop sharing
- `GET /api/statements/shared/<token>` — **Public**: read a shared statement

### Admin

The admin web UI lives at `/admin`; admins are routed there at sign-in, since
they have no income of their own and the worker dashboard would only show them
zeros.

- `GET /api/admin/workers` — List workers with income totals (searchable)
- `GET /api/admin/workers/<id>` — Worker detail
- `GET /api/admin/workers/<id>/entries` — A worker's entries
- `GET /api/admin/workers/<id>/statements` — A worker's statements
- `GET /api/admin/stats` — Platform totals

### Health
- `GET /api/health` — Health check
- `GET /api/docs` — Swagger UI

## Roles

- `worker` — can log income, view own records, export statements
- `admin` — can read any worker's records for verification at `/admin`; admins
  never create or edit a worker's entries, because the record has to stay
  worker-owned

## Deployment

The whole app is one Vercel project: the built SPA is served as static files and
`/api/*` is routed to the Flask app running as a Python serverless function
([api/index.py](api/index.py)). One origin means the session cookie behaves in
production exactly as it does locally — no cross-site cookie rules to work
around.

```bash
vercel deploy --prod        # from the repo root
```

Production environment variables (set with `vercel env add … production`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (`-pooler` host) |
| `SECRET_KEY` | Signs session cookies; changing it signs everyone out |
| `FLASK_DEBUG` | `false` |
| `VITE_DATA_MODE` | `api`, so the SPA talks to the deployed backend |
| `SMTP_*` | Optional. Without them, email verification and password reset return 503 rather than pretending to send |
| `RATELIMIT_STORAGE_URI` | Optional. On Vercel this defaults to the database, because in-process counters reset on every cold start |

`VITE_API_BASE_URL` is deliberately unset: the frontend calls its own origin.

Database changes go out by running the migration against Neon before deploying:

```bash
cd server
DATABASE_URL="<neon connection string>" flask db upgrade
```

Serverless compute suspends and recycles connections, so the app uses the Neon
pooled endpoint with `pool_pre_ping` — see [server/config.py](server/config.py).
`render.yaml` is kept as an alternative if the backend ever wants a long-running
host instead.

## Tests

```bash
python -m pytest          # backend
cd frontend && npm test   # frontend
```

## License

MIT
