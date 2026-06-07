# Tasks: Account Registration

**Input**: Design documents from `/specs/002-register-account/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/http-routes.md ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, create environment configuration skeleton, and wire dotenv loading.

- [x] T001 Install new npm dependencies: `npm install mysql2 dotenv` (updates package.json and package-lock.json)
- [x] T002 [P] Create `.env.example` at repository root documenting all required env vars: `PATCHER_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` with example values from research.md Decision 6
- [x] T003 [P] Add `.env` to `.gitignore` (create `.gitignore` at repository root if absent) to ensure database credentials are never committed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented. This phase produces the shared DB layer, password utility, and locale strings consumed by all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Add dotenv initialisation at the top of `src/index.ts` — call `dotenv.config()` before any `process.env` reads so all env vars are available at startup
- [x] T005 [P] Create `src/lib/db.ts` — export a `mysql2/promise` connection pool (`createPool`) initialised from `process.env.DB_HOST/PORT/USER/PASSWORD/NAME`; export a `query<T>` helper that executes parameterized calls against the pool
- [x] T006 [P] Create `src/services/account.ts` with two exports: (1) `mysqlNativePassword(plain: string): string` — implements `'*' + SHA1(SHA1(plain))` using `node:crypto` per research.md Decision 2; (2) `RegistrationErrorCode` union type: `'EMAIL_TAKEN' | 'LOGIN_TAKEN' | 'REGISTRATION_DISABLED' | 'UNKNOWN'`
- [x] T007 [P] Add all `register.*` locale keys to `locales/pl.json` — copy the full key list from data-model.md "Locale Keys Required" table (Polish column); keys must be nested under `"register": { ... }`
- [x] T008 [P] Add all `register.*` locale keys to `locales/en.json` — copy the full key list from data-model.md "Locale Keys Required" table (English column); keys must be nested under `"register": { ... }`

**Checkpoint**: DB pool, password hashing utility, and locale strings are ready. User story work can now begin.

---

## Phase 3: User Story 1 — Successful Account Registration (Priority: P1) 🎯 MVP

**Goal**: A visitor fills in the registration form with valid data, the account is created in the game database via stored procedure, and they are redirected to a success page that displays a link to download the patcher.

**Independent Test**: Navigate to `/register`, fill in a unique email, unique login, and a valid password, submit — expect redirect to `/register/success` with a visible, clickable download button. Verify the account exists in the game database `account` table.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `src/views/register.eta` — SSR registration form template extending `layouts/base.eta`; renders fields for `email`, `login`, `password` with labels and placeholders sourced from `it.t('register.form.*')` keys; include a submit button (`it.t('register.form.submit')`); match Metin2 thematic design (dark parchment background, gold accents, `Cinzel` font) consistent with existing pages
- [x] T010 [P] [US1] Create `src/views/register-success.eta` — SSR success page template extending `layouts/base.eta`; renders heading (`it.t('register.success.heading')`), message (`it.t('register.success.message')`), a prominent download button linking to `it.patcherUrl` with label `it.t('register.success.downloadBtn')`, and a note `it.t('register.success.downloadNote')`; styled consistently with Metin2 theme
- [x] T011 [US1] Add `callRegisterSP(email, login, passwordHash)` async function to `src/services/account.ts` — calls `CALL account.sp_create_player_account(?, ?, ?)` via the db pool from `src/lib/db.ts`; on success returns `{ ok: true }`; on MySQL error with `SQLSTATE '45000'`, maps `error.sqlMessage` to `RegistrationErrorCode` and returns `{ ok: false, code: RegistrationErrorCode }` (depends on T005, T006)
- [x] T012 [US1] Add `GET /register` route to `src/index.ts` — builds `pageCtx`, renders `register` view with `pageTitle: ctx.t('register.page.title')`, `pageDesc: ctx.t('register.page.desc')`; returns `c.html(html)` (depends on T004, T007, T008, T009)
- [x] T013 [US1] Add `POST /register` route to `src/index.ts` — reads `email`, `login`, `password` from `await c.req.parseBody()`; performs basic non-empty validation (return 200 re-render with `register.error.unknown` key if any field is blank); calls `mysqlNativePassword(password)` then `callRegisterSP`; on success redirects to `/register/success` with HTTP 302 (PRG pattern) (depends on T011, T012)
- [x] T014 [US1] Add `GET /register/success` route to `src/index.ts` — reads `process.env.PATCHER_URL` (default to `''` if unset); renders `register-success` view passing `patcherUrl`; uses `register.success.*` locale keys (depends on T010, T013)

**Checkpoint**: User Story 1 is fully functional. A new account can be created end-to-end and the success page shows the patcher link.

---

## Phase 4: User Story 2 — Registration Validation Errors (Priority: P2)

**Goal**: When registration fails due to invalid email format, duplicate email, duplicate login, or disabled registration, the form is re-rendered with a specific, actionable error message. Rate limiting and CSRF protection are active.

**Independent Test**: Test each error case individually: (a) submit invalid email → inline error; (b) submit duplicate email → "email already taken" message; (c) submit duplicate login → "login already taken" message; (d) with registration disabled via SP → "registration closed" message. Also verify that submitting 11 times from the same IP results in a 429 on the 11th attempt.

### Implementation for User Story 2

- [x] T015 [P] [US2] Create `src/middleware/rate-limit.ts` — export `registrationRateLimiter` Hono middleware; uses an in-memory `Map<string, { count: number; windowStart: number }>` keyed by client IP (`c.req.header('x-forwarded-for') ?? c.env?.remoteAddr ?? 'unknown'`); sliding 1-hour window; max 10 attempts; returns HTTP 429 with re-rendered register page including `register.error.rateLimited` locale key when exceeded; map entries are evicted once the window expires
- [x] T016 [P] [US2] Update `src/views/register.eta` to conditionally render an error message block when `it.errorKey` is a non-empty string — display `it.t(it.errorKey)` in a styled error alert; repopulate `email` and `login` input values from `it.emailValue` and `it.loginValue` template variables (password field always empty on re-render)
- [x] T017 [US2] Update `POST /register` route in `src/index.ts` to handle `callRegisterSP` errors: map `RegistrationErrorCode` values to locale keys (`EMAIL_TAKEN → register.error.emailTaken`, `LOGIN_TAKEN → register.error.loginTaken`, `REGISTRATION_DISABLED → register.error.registrationDisabled`, `UNKNOWN → register.error.unknown`); re-render `register` view with `errorKey`, `emailValue`, and `loginValue` on all failure paths (depends on T015, T016, T013)
- [x] T018 [US2] Add email format validation to `POST /register` in `src/index.ts` — apply a standard email RegExp (RFC 5321 simplified: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) before calling the SP; on failure re-render form with `errorKey: 'register.error.invalidEmail'` (depends on T017)
- [x] T019 [US2] Apply `hono/csrf` middleware and `registrationRateLimiter` to `POST /register` in `src/index.ts` — import `csrf` from `hono/csrf`; add both as route-level middleware in the correct order: rate limiter first, CSRF second, handler third; return 403 on CSRF failure (depends on T015, T018)

**Checkpoint**: All error conditions produce specific messages. Rate limiting and CSRF are active on the registration endpoint.

---

## Phase 5: User Story 3 — Registration Form Field Constraints (Priority: P3)

**Goal**: Submissions with field values exceeding allowed lengths are rejected with a specific error message before any SP call is made.

**Independent Test**: Submit (a) email with 65 characters — expect `register.error.emailTooLong`; (b) login with 31 characters — expect `register.error.loginTooLong`; (c) password with 73 characters — expect `register.error.passwordTooLong`; verify no SP call occurs for any of these.

### Implementation for User Story 3

- [x] T020 [P] [US3] Add `register.error.passwordTooLong` key to both `locales/pl.json` (`"Hasło nie może przekraczać 72 znaków."`) and `locales/en.json` (`"Password must not exceed 72 characters."`) — this key was not in the initial data-model.md locale table and is needed for T021
- [x] T021 [US3] Add server-side field length validation to `POST /register` in `src/index.ts` — insert checks after the non-empty validation and before email format validation: `email.length > 64 → errorKey 'register.error.emailTooLong'`; `login.length > 30 → errorKey 'register.error.loginTooLong'`; `password.length > 72 → errorKey 'register.error.passwordTooLong'`; each re-renders the form with the appropriate key and repopulates email/login (depends on T018, T020)
- [x] T022 [P] [US3] Add `maxlength` HTML attributes to form inputs in `src/views/register.eta`: `email` → `maxlength="64"`, `login` → `maxlength="30"`, `password` → `maxlength="72"`; also add `minlength="6"` to password input for client-side UX (depends on T016)

**Checkpoint**: All three user stories are independently functional. Field constraints are enforced both client-side (HTML attributes) and server-side (handler validation).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Logging, navigation, type safety, and final validation across all user stories.

- [x] T023 [P] Add `/register` to `NAV_ITEMS` in `src/lib/nav.ts` — insert `{ key: 'register', path: '/register', labelKey: 'nav.register' }` after the `presentation` entry so the register link appears as an active nav item on the register and register-success pages
- [x] T024 [P] Add registration attempt logging to `POST /register` in `src/index.ts` — after each outcome (success, each error code, rate-limited, CSRF-rejected) emit a `console.log` or structured log line with: ISO timestamp, client IP, outcome string, email (for success/error) — do NOT log the plaintext password at any point (depends on T021)
- [x] T025 Run `npm run typecheck` from repository root and fix all TypeScript errors introduced by this feature across all new and modified files (depends on all prior tasks)
- [x] T026 [P] Verify database security setup against quickstart.md checklist: confirm `web_register`@`localhost` user exists with EXECUTE-only grant; add the grant SQL as a comment block at the top of `src/lib/db.ts` for operator reference; confirm `.env` is listed in `.gitignore`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002 and T003 are parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion; T005, T006, T007, T008 are parallel after T004
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion; T009 and T010 are parallel, T011 follows T005/T006, T012–T014 are sequential
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion; T015 and T016 are parallel, T017–T019 are sequential
- **User Story 3 (Phase 5)**: Depends on Phase 4 completion; T020 and T022 are parallel, T021 requires T020
- **Polish (Phase 6)**: Depends on Phase 5 completion; T023, T024, T026 are parallel, T025 runs last

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational — no dependency on US2 or US3
- **US2 (P2)**: Depends on US1 (extends the POST handler and form template created in US1)
- **US3 (P3)**: Depends on US2 (extends the same POST handler validation chain)

### Within Each User Story

- Views (`.eta` templates) before routes (they must exist before the route renders them)
- Service functions before route handlers that call them
- Foundational middleware (rate-limit.ts) before the handler that registers it
- All locale keys added before any route that uses them via `t()`

### Parallel Opportunities

| Phase | Parallel group | Tasks |
|-------|---------------|-------|
| 1 | Setup files | T002, T003 |
| 2 | Foundational (after T004) | T005, T006, T007, T008 |
| 3 | View templates | T009, T010 |
| 4 | Error infrastructure | T015, T016 |
| 5 | Constraint additions | T020, T022 |
| 6 | Polish | T023, T024, T026 |

---

## Parallel Example: User Story 1

```text
# After Phase 2 checkpoint, these two tasks can run in parallel:
T009 — Create src/views/register.eta
T010 — Create src/views/register-success.eta

# Then T011 (callRegisterSP) can start:
T011 — Implement callRegisterSP in src/services/account.ts

# Then routes in order:
T012 → T013 → T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T009–T014)
4. **STOP and VALIDATE**: Submit a valid registration — expect redirect to `/register/success` with patcher link and account in database
5. Demo or deploy if ready

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. US1 → End-to-end happy path works (MVP)
3. US2 → Error messages and security middleware active
4. US3 → Field constraints enforced
5. Polish → Logging, nav, type safety

---

## Notes

- `[P]` = different files, no blocking inter-dependency
- `[USn]` label maps each task to a specific user story for traceability
- The `POST /register` handler in `src/index.ts` is extended across US1 (T013), US2 (T017, T018, T019), and US3 (T021) — tasks within these phases are sequential on that file
- `src/views/register.eta` is extended in US1 (T009) and US2 (T016) and US3 (T022) — same sequential constraint
- Never log the plaintext password; it must be hashed immediately on receipt and discarded
- Commit after each phase checkpoint for clean rollback points
- Constitution Principle V password-hashing exception is pre-approved in plan.md Complexity Tracking — no further approval needed during implementation
