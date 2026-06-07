# Implementation Plan: Account Registration

**Branch**: `002-register-account` | **Date**: 2026-03-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-register-account/spec.md`

## Summary

Add a server-rendered registration page (`/register`) that collects email, login, and password from the visitor, hashes the password to MySQL `PASSWORD()` format using Node.js built-in `crypto`, and calls the `account.sp_create_player_account` stored procedure via `mysql2`. Business errors (email taken, login taken, registration disabled) are emitted by the procedure using `SIGNAL SQLSTATE '45000'` and mapped to locale strings. On success, the visitor is redirected to `/register/success` which displays a congratulatory message and a link to the patcher download (URL configured via `.env`). Rate limiting (10/IP/hour) and CSRF protection (Origin/Referer check via `hono/csrf`) are applied to the POST endpoint. All user-facing strings are externalised to `locales/pl.json` and `locales/en.json`.

## Technical Context

**Language/Version**: TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14)
**Primary Dependencies**: Hono 4.x + @hono/node-server, Eta 3.x (existing); `mysql2` ^3.x, `dotenv` ^16.x (new)
**Storage**: MySQL 5.x/8.x via `mysql2/promise` connection pool; stored procedure access only
**Testing**: `npm run typecheck` (tsc --noEmit); manual smoke testing (no unit test framework yet)
**Target Platform**: FreeBSD 14, Node.js 20 via `node20` pkg
**Project Type**: SSR web service
**Performance Goals**: Registration endpoint p95 < 500ms (dominated by DB round-trip)
**Constraints**: Pure-JS npm dependencies only (no native add-ons); no ORM; all DB access via stored procedures
**Scale/Scope**: Small game server; single-process; in-memory rate limiter is sufficient

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check post-Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — SSR-First | ✅ PASS | Registration and success pages rendered server-side via Hono + Eta. No client-side routing. |
| II — Stored Procedures | ✅ PASS | All DB interaction via `CALL account.sp_create_player_account(?, ?, ?)`. No raw SQL in application code. |
| III — FreeBSD 14 Compatibility | ✅ PASS | `mysql2` and `dotenv` are pure JS. `node:crypto` is built-in. No native add-ons added. |
| IV — Design Authenticity | ✅ PASS | Registration form and success page styled with Metin2 thematic design consistent with existing pages. Generic UI components not used. |
| V — Security (password hashing) | ⚠️ EXCEPTION | MySQL `PASSWORD()` format (SHA1×2) used instead of bcrypt/Argon2id. See Complexity Tracking. |
| V — Security (CSRF) | ✅ PASS | `hono/csrf` middleware applied to `POST /register`. |
| V — Security (rate limiting) | ✅ PASS | In-memory 10/IP/hour rate limiter on `POST /register`. |
| V — Security (logging) | ✅ PASS | Registration attempts (success and failure) logged with timestamp, IP, and outcome. |
| VI — Simplicity | ✅ PASS | No ORM, no extra process, no state management library. In-memory rate limiter avoids Redis dependency. |
| VII — i18n | ✅ PASS | All user-facing strings in `locales/pl.json` and `locales/en.json` under `register.*` namespace. Language toggle functional on both pages. |

**Post-Phase 1 re-check**: All gates remain the same. The design introduces no new violations beyond the documented Principle V password-hashing exception.

## Project Structure

### Documentation (this feature)

```text
specs/002-register-account/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Phase 1 — entities, locale keys, state transitions
├── quickstart.md        # Phase 1 — setup and smoke-test guide
├── contracts/
│   └── http-routes.md   # Phase 1 — HTTP route contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (additions for this feature)

```text
src/
├── index.ts                      (existing — add GET /register, POST /register, GET /register/success)
├── lib/
│   ├── i18n.ts                   (existing — unchanged)
│   ├── nav.ts                    (existing — unchanged)
│   └── db.ts                     (new — mysql2 connection pool, initialised from env vars)
├── services/
│   └── account.ts                (new — mysqlNativePassword(), callRegisterSP(), error code mapping)
├── middleware/
│   ├── locale.ts                 (existing — unchanged)
│   └── rate-limit.ts             (new — in-memory IP rate limiter, 10/IP/hour)
└── views/
    ├── register.eta              (new — registration form, displays field errors)
    └── register-success.eta      (new — success page, patcher download link)

locales/
├── pl.json                       (existing — add register.* keys per data-model.md)
└── en.json                       (existing — add register.* keys per data-model.md)

.env.example                      (new — document all required environment variables)
```

**Structure Decision**: Single-project layout (Option 1) — the project already uses `src/` for all application code. No additional top-level directories are introduced. The `src/services/` subdirectory is introduced as the natural home for the account registration business logic.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle V: SHA1(SHA1) password hash instead of bcrypt/Argon2id | The Metin2 game server binary reads the `account.password` column and authenticates players using MySQL `PASSWORD()` function semantics (SHA1 applied twice). The game client cannot be modified, and the web application must produce hashes in a format the game server can verify. | Storing bcrypt hashes would cause all game logins to fail. Dual-storing both formats adds complexity without security benefit (the weak hash is still present). This exception is unavoidable given the game server constraint. |
