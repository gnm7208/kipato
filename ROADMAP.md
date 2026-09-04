# ROADMAP — Kipato

## Sprint 0: Project Scaffold
- [x] Repo structure, README, CLAUDE.md, ROADMAP, tracker, LICENSE
- [x] Backend factory + models + migrations
- [x] Auth routes (register/login/logout)
- [x] Domain routes (income, mpesa, statements)
- [x] Seed scripts
- [x] Tests + lint

## Sprint 1: Core Backend
- [x] Worker registration & session auth
- [x] Income entry CRUD (one-tap log)
- [x] Income trends endpoint
- [x] M-PESA import pipeline
- [x] Statement generation
- [x] Admin moderation routes

## Sprint 2: Polish & Deploy
- [x] Offline sync queue (IndexedDB outbox + idempotent replay)
- [x] Email verification
- [x] Swagger UI
- [x] CI (lint + tests + audit)
- [x] Dockerfile + compose for the whole stack
- [x] Admin web UI on top of the admin API
- [x] Deployed: Vercel (SPA + serverless API) on a Neon Postgres

## Sprint 3: Scoring (beyond MVP)
- [ ] Creditworthiness score model
- [x] Opt-in sharing to SACCO (revocable, expiring statement links)
- [ ] Savings nudges

## Known gaps
- Bulk import reads a file the worker supplies. Reading the SMS inbox directly
  would need a native Android app; no browser API exists.
- Email verification and password reset need SMTP credentials the deployment
  does not have yet; both refuse with 503 rather than pretending to send.
- The password reset flow has no UI yet — the endpoints exist and are tested.
