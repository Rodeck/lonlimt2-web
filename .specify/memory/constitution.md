<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: none (initial fill from template)
Added sections:
  - Core Principles (I–VI)
  - Technology Stack & Platform Constraints
  - Quality Gates & Development Workflow
  - Governance
Removed sections: none (all template placeholders replaced)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check references SSR, FreeBSD, MySQL SP gates)
  - .specify/templates/spec-template.md ✅ aligned (FR/SC structure compatible with project scope)
  - .specify/templates/tasks-template.md ✅ aligned (phase structure fits SSR web-app layout)
Deferred TODOs: none
-->

# Metin2 TMP4 — Webpage Constitution

## Core Principles

### I. SSR-First (NON-NEGOTIABLE)

All user-facing pages MUST be rendered on the server. Client-side JavaScript MUST be
treated as progressive enhancement only. No SPA shell pattern or client-side routing for
core page transitions is permitted. The chosen framework MUST support SSR natively and
without additional compilation tooling that conflicts with the FreeBSD platform constraint.

**Rationale**: SSR reduces architectural complexity (no separate API layer), improves
initial load performance, and makes crawlability and SEO straightforward without extra
configuration. Given a single-developer or small-team context, eliminating the
frontend/backend split cuts maintenance surface significantly.

### II. Secure Database Access via Stored Procedures (NON-NEGOTIABLE)

All database read/write operations that touch player or account data MUST be performed
through MySQL stored procedures. Raw SQL queries constructed in application code are
prohibited. Application code MUST call stored procedures exclusively via parameterized
driver calls — no string interpolation of user-supplied values into query strings at any
layer.

**Rationale**: The Metin2 ecosystem stores critical player data. Using stored procedures
centralises SQL logic in the database, limits the attack surface for SQL injection, and
allows database-level auditing. It also aligns with common Metin2 server database
conventions.

### III. FreeBSD 14 Compatibility (NON-NEGOTIABLE)

The entire runtime stack MUST be installable on FreeBSD 14 using official pkg packages or
ports WITHOUT requiring manual compilation of Node.js versions that are end-of-life or
unavailable in the ports tree. The project MUST pin to a Node.js LTS version that is
available as a pre-built package for FreeBSD 14 at the time of deployment.

Acceptable runtimes (as of ratification): Node.js 20 LTS or Node.js 22 LTS.
Native add-ons with complex build requirements are prohibited unless a pre-built binary is
available for FreeBSD 14.

**Rationale**: The server infrastructure runs FreeBSD 14. Avoiding custom compilation
eliminates a class of deployment failures and removes the need for build toolchains in the
production environment.

### IV. Design Authenticity — Immersive, Non-Generic (NON-NEGOTIABLE)

The visual design MUST be custom and themed to the Metin2 game world. Generic UI
component libraries used without customisation are prohibited as the primary design
language. Every page MUST include deliberate visual choices: thematic colour palette,
custom typography, atmospheric graphics or imagery consistent with the game aesthetic.

AI-generated placeholder art or stock assets used verbatim without visual integration are
prohibited. Each significant visual element MUST serve either the brand or the user
journey — decorative clutter for its own sake MUST be avoided.

**Rationale**: Players arriving at this page are part of a gaming community with strong
aesthetic expectations. A generic-looking portal undermines trust and engagement. A
distinctive, polished design signals server quality.

### V. Security-First Authentication & Session Management (NON-NEGOTIABLE)

All authentication flows MUST comply with OWASP Authentication Cheat Sheet requirements.
Specifically:

- Passwords MUST be hashed using bcrypt, Argon2id, or scrypt before storage.
- Sessions MUST use secure, HttpOnly, SameSite=Strict cookies.
- CSRF protection MUST be applied to all state-changing form submissions.
- Account recovery flows MUST use time-limited, single-use tokens delivered via a
  secondary channel (e.g., email).
- Rate limiting MUST be applied to login, registration, and password-reset endpoints.
- All authentication-related operations MUST be logged with timestamp, IP, and outcome.

**Rationale**: Account compromise is among the highest-impact user harms in a game server
context. Authentication hardening is non-negotiable and MUST be addressed before any
feature is considered production-ready.

### VI. Simplicity & Minimal Abstraction

Complexity MUST be justified against a concrete present requirement. Abstractions that
anticipate future needs MUST NOT be introduced speculatively. The following are explicitly
prohibited unless documented with a justification in the relevant plan's Complexity
Tracking table:

- More than two primary runtime processes (e.g., web server + background worker is
  acceptable; adding a separate API service or message broker is not without justification).
- ORM layers when a thin query-builder or direct stored-procedure calls suffice.
- Microservice decomposition of any kind.
- Client-side state management libraries (Redux, Zustand, etc.).

**Rationale**: Small game server projects fail frequently due to over-engineering. A
maintainable, deployable system that works beats an elegant architecture that is never
finished.

## Technology Stack & Platform Constraints

**Runtime**: Node.js LTS (20 or 22), installed via FreeBSD pkg (`node20` or `node22`).

**Framework**: Astro or Hono + server-side templating (e.g., Eta/Nunjucks). Both support
SSR and are available as npm packages with no native compilation requirements.
The framework choice MUST be locked in during Phase 0 research and recorded in plan.md.

**Database**: MySQL 5.x / 8.x (compatible with existing Metin2 database schema).
Driver: `mysql2` npm package (pure JS — no native add-ons required).

**Styling**: Custom CSS with a CSS preprocessor (e.g., Sass) OR Tailwind CSS used as a
utility layer under a bespoke design system — NOT used directly as the design language.

**Asset pipeline**: Keep asset bundling minimal. If a bundler is needed, `esbuild` is
preferred (fast, no native deps). Avoid webpack unless specifically justified.

**Process manager**: PM2 (available in FreeBSD ports as `npm install -g pm2`) or a
FreeBSD rc.d service script wrapping `node`.

**No Docker requirement**: The deployment MUST work as a native FreeBSD service without
requiring Docker or containerisation.

## Quality Gates & Development Workflow

All features MUST pass the following gates before being marked complete:

1. **Constitution Compliance Check**: Confirm the feature does not violate any principle
   (SSR, stored procedures, FreeBSD compat, security). Document violations in Complexity
   Tracking if an exception is deliberately accepted.

2. **Security Review**: Authentication, session, and data-handling code MUST be reviewed
   against Principle V checklist before merge.

3. **Platform Validation**: Any new npm dependency MUST be verified as pure-JS or
   confirmed to have a pre-built binary for FreeBSD 14 (run `npm install` on FreeBSD or
   check `node-pre-gyp` availability). Native add-ons MUST be explicitly approved.

4. **Design Review**: New pages or major UI changes MUST include a visual review against
   the Metin2 thematic design language (Principle IV). Generic or placeholder UI
   MUST NOT be shipped.

5. **Database Access Audit**: Any code touching the database MUST be confirmed to call
   stored procedures only, with no raw SQL construction.

**Branch strategy**: Feature branches off `main`. PRs require at least one review if team
size allows. `main` MUST always be deployable.

**Commit discipline**: Commits MUST be atomic and descriptive. Commit messages MUST
reference the task ID where applicable (e.g., `feat(auth): T014 implement login via SP`).

## Governance

This Constitution supersedes all other project conventions and documentation where
conflicts exist. Amendments require:

1. A clear statement of the change and its rationale.
2. A version bump following semantic versioning (MAJOR for principle removal/redefinition,
   MINOR for new principles or sections, PATCH for clarifications).
3. Updating the `LAST_AMENDED_DATE` field and running `speckit.constitution` to propagate
   changes across dependent templates.
4. If an amendment removes or weakens a security constraint (Principle V), it additionally
   requires explicit written justification stored alongside this file.

All implementation plans MUST include a Constitution Check section that confirms
compliance with active principles. Non-compliance MUST be documented in the Complexity
Tracking table of the relevant plan — undocumented violations are not permitted.

**Version**: 1.0.0 | **Ratified**: 2026-03-05 | **Last Amended**: 2026-03-05
