# TODO — Kipato

## Done
- [x] Scaffold repo files
- [x] Backend factory + config + extensions
- [x] Models (User, Role, IncomeEntry, MpesaImport, Statement, StatementEntry)
- [x] Auth blueprint (+ profile update, email verification)
- [x] Income blueprint (+ idempotent offline replay)
- [x] M-PESA blueprint (real SMS parsing, preview, de-duplication)
- [x] Statements blueprint
- [x] Admin blueprint
- [x] RBAC decorators
- [x] Validators/utils/mailer
- [x] Seed scripts (runnable standalone; demo worker + admin)
- [x] Initial Alembic migration
- [x] Backend tests + ruff
- [x] Frontend offline outbox, sync engine, service worker
- [x] Frontend tests + oxlint
- [x] Dockerfile, entrypoint, compose stack
- [x] OpenAPI spec matching every route
- [x] Admin web UI (overview, worker search, worker record)
- [x] Bulk M-PESA import (SMS backup XML, statement CSV, large pastes)
- [x] Deployed to Vercel on Neon Postgres, seeded with a ten-worker demo cast
- [x] Public, revocable, expiring statement links a lender can open
- [x] Password reset endpoints; email flows refuse honestly without SMTP
- [x] Rate limit counters shared across serverless instances
- [x] Route-level code splitting (initial bundle 735 KB -> 242 KB)
- [x] Git history, public GitHub repo, CI, deploy on push

## Next
- [ ] SMTP credentials, then a password-reset screen
- [ ] Statement link QR code for handing over in person
- [ ] Creditworthiness scoring (Sprint 3)
