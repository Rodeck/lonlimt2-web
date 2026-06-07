# Research: Account Registration

**Feature**: 002-register-account
**Date**: 2026-03-05
**Phase**: 0 — Unknowns resolved

---

## Decision 1: MySQL Client Library

**Decision**: Use `mysql2` npm package with the Promise API (`mysql2/promise`).

**Rationale**:
- Pure JavaScript — no native add-ons, no compilation step. Passes the FreeBSD 14 compatibility gate.
- Supports parameterized prepared statements natively, satisfying Principle II (no raw SQL string construction).
- Connection pool API (`createPool`) is built-in. Connections are reused across requests without manual management.
- `mysql2` is the established successor to `mysql` and is widely used in production Node.js services against MySQL 5.x/8.x.

**Alternatives considered**:
- `mysql` (legacy) — rejected; lacks modern Promise API and is effectively unmaintained.
- `knex` query builder — rejected; violates Principle VI (unnecessary abstraction when direct SP calls suffice) and Principle II (stored procedures must be the only DB access path, no raw query builder needed).
- `drizzle-orm` — rejected; same reason as knex, and ORM overhead is explicitly prohibited by Principle VI.

---

## Decision 2: Password Hashing for Metin2 Game Server Compatibility

**Decision**: Hash passwords using `SHA1(SHA1(plaintext))` format, producing `*` + uppercase hex string, using Node.js built-in `node:crypto` module.

**Rationale**:
The Metin2 game server authenticates players by reading the `password` column from the MySQL `account` database and comparing it using MySQL's native `PASSWORD()` function semantics. This function (MySQL 4.1+ format) applies SHA1 twice:
1. Compute `raw1 = SHA1(plaintextPassword)` — raw 20-byte digest
2. Compute `raw2 = SHA1(raw1)` — raw 20-byte digest
3. Result: `'*' + HEX(raw2).toUpperCase()`

Node.js implementation using built-in `node:crypto` (no npm dependency):
```typescript
import { createHash } from 'node:crypto'

export function mysqlNativePassword(plain: string): string {
  const first = createHash('sha1').update(plain, 'utf8').digest()
  const second = createHash('sha1').update(first).digest('hex').toUpperCase()
  return '*' + second
}
```

**Constitution Principle V conflict documented**: This hashing scheme does not meet the OWASP-compliant bcrypt/Argon2id/scrypt requirement. This exception is unavoidable because:
- The game server binary reads the `account.password` column and performs the comparison using its own hardcoded MySQL-compatible algorithm.
- There is no path to modify the game server's authentication logic.
- Storing bcrypt hashes would break all game logins entirely.

The exception is documented in the Complexity Tracking table in `plan.md`.

**Alternatives considered**:
- bcrypt/Argon2id — rejected; game server incompatible.
- Dual-storing both formats — rejected; adds complexity, still requires storing the weak hash, provides no security benefit.

---

## Decision 3: Stored Procedure Error Signalling

**Decision**: Use MySQL `SIGNAL SQLSTATE '45000'` with a `MESSAGE_TEXT` error code string to communicate application-level failures from the stored procedure to the web layer.

**Rationale**:
- Standard MySQL approach for application-level errors from stored procedures.
- `mysql2` surfaces these as JavaScript `Error` objects with `.sqlMessage` containing the MESSAGE_TEXT value.
- Clean separation: the procedure owns the business rules (email uniqueness, registration-enabled flag), and the web layer only maps error codes to locale strings.
- No OUT parameters needed, keeping the call signature simple (`CALL sp_create_player_account(?, ?, ?)`).

**Stored procedure modification required**:
```sql
-- At the start of the procedure body, before INSERT:
IF @registration_disabled THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRATION_DISABLED';
END IF;

IF EXISTS (SELECT 1 FROM account WHERE Email = p_email) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EMAIL_TAKEN';
END IF;

IF EXISTS (SELECT 1 FROM account WHERE Login = p_login) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'LOGIN_TAKEN';
END IF;
```

**Error code catalogue**:
| Code | Meaning |
|------|---------|
| `EMAIL_TAKEN` | Email address already registered |
| `LOGIN_TAKEN` | Login name already in use |
| `REGISTRATION_DISABLED` | Administrator has disabled new registrations |

**Alternatives considered**:
- OUT parameter — rejected; requires changing the call signature and adds boilerplate in the application layer.
- Returning special row values — rejected; overly complex and non-standard.

---

## Decision 4: CSRF Protection

**Decision**: Use `hono/csrf` middleware (built into the `hono` package, no extra install) applied specifically to `POST /register`.

**Rationale**:
- Available with zero additional dependencies (already installed via `hono`).
- Validates `Origin` and `Referer` headers against the current host on state-changing requests. Sufficient for server-rendered forms where the browser always sends one of these headers.
- Simple to configure; aligns with Principle VI (no extra complexity).

**Alternatives considered**:
- Token-based CSRF (embed token in hidden form field, validate in handler) — valid alternative but requires state (server-side token store or signed cookie), adds more code. Deferred unless the Origin/Referer approach proves insufficient.

---

## Decision 5: Rate Limiting

**Decision**: Custom in-memory sliding window rate limiter implemented directly in a Hono middleware file (`src/middleware/rate-limit.ts`).

**Rationale**:
- Zero additional npm dependencies.
- For a small game server, in-memory limits are appropriate. The server runs as a single process (Principle VI: no more than two primary runtime processes).
- Limits: maximum 10 registration attempts per IP per hour.
- Implementation: `Map<string, { count: number; windowStart: number }>` with 1-hour sliding window.

**Alternatives considered**:
- `hono-rate-limiter` npm package — rejected; adds a dependency for logic simple enough to inline. Revisit if multi-process deployment is introduced.
- Redis-backed rate limiting — rejected; introduces a second runtime process and infrastructure dependency, violating Principle VI.

---

## Decision 6: Environment Configuration

**Decision**: Use the `dotenv` npm package for local development; production environment variables set via PM2 ecosystem file or rc.d script. Required variables documented in `.env.example`.

**Rationale**:
- `dotenv` is pure JS, widely used, and adds minimal overhead.
- The patcher URL, database credentials, and other runtime config belong in environment variables — not in code.
- Production deployments on FreeBSD can set env vars via `pm2 start --env production` or the rc.d service script `environment` parameter.

**Required environment variables**:
| Variable | Description | Example |
|----------|-------------|---------|
| `PATCHER_URL` | Full URL to patcher executable download | `http://51.83.160.241/LonliMT2.Patcher.exe` |
| `DB_HOST` | MySQL server hostname | `127.0.0.1` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | DB user with EXECUTE-only privilege | `web_register` |
| `DB_PASSWORD` | DB user password | *(secret)* |
| `DB_NAME` | Database/schema name | `account` |

**Alternatives considered**:
- Reading `.env` manually — rejected; reinventing dotenv without benefit.
- Config file (JSON) — rejected; environment variables are the standard for 12-factor app configuration and work cleanly with PM2/rc.d.

---

## Decision 7: Database User Security

**Decision**: Create a dedicated MySQL user `web_register`@`localhost` with `EXECUTE` privilege on `account.sp_create_player_account` only.

**SQL to provision** (documented in quickstart.md, executed by the operator):
```sql
CREATE USER 'web_register'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT EXECUTE ON PROCEDURE account.sp_create_player_account TO 'web_register'@'localhost';
FLUSH PRIVILEGES;
```

**Rationale**:
- Least-privilege principle: the web process cannot read, write, or delete any account data directly.
- Even if the web application is compromised, the attacker cannot access arbitrary account records via the web DB user.
- Satisfies FR-010 and Constitution Quality Gate 5 (Database Access Audit).

---

## Dependency Summary

**New npm dependencies**:
| Package | Version | Purpose | FreeBSD safe? |
|---------|---------|---------|---------------|
| `mysql2` | `^3.x` | MySQL driver with Promise API | ✅ Pure JS |
| `dotenv` | `^16.x` | Environment variable loading in dev | ✅ Pure JS |

**No new native add-ons.** All existing devDependencies unchanged.
