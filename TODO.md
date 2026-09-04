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
- [x] Backend tests (53) + ruff
- [x] Frontend offline outbox, sync engine, service worker
- [x] Frontend tests (40) + oxlint
- [x] Dockerfile, entrypoint, compose stack
- [x] OpenAPI spec matching every route
- [x] Admin web UI (overview, worker search, worker record)
- [x] Bulk M-PESA import (SMS backup XML, statement CSV, large pastes)

- [x] Deployed to Vercel on Neon Postgres, seeded with a ten-worker demo cast

## Next
- [ ] Public, revocable statement links a lender can open
- [ ] Creditworthiness scoring (Sprint 3)
