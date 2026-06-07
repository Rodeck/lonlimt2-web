# Quickstart: Account Registration Feature

**Feature**: 002-register-account
**Date**: 2026-03-05

---

## Prerequisites

- Node.js 20 LTS running
- MySQL server accessible with the game's `account` database
- Access to run SQL as a user with `GRANT` privilege on the `account` schema

---

## 1. Install New npm Dependencies

```bash
npm install mysql2 dotenv
```

Both packages are pure JavaScript — no native compilation required.

---

## 2. Create `.env` File

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
# Patcher download URL (configurable without code changes)
PATCHER_URL=http://51.83.160.241/LonliMT2.Patcher.exe

# MySQL database credentials (dedicated registration user — see step 3)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=web_register
DB_PASSWORD=<strong-password-here>
DB_NAME=account
```

> **Production note**: On FreeBSD with PM2, set these in your `ecosystem.config.cjs` under `env_production` instead of committing a `.env` file. The `.env` file is for local development only.

---

## 3. Provision the Dedicated Database User

Connect to MySQL as a privileged user and run:

```sql
CREATE USER 'web_app'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT EXECUTE ON PROCEDURE account.sp_create_player_account TO 'web_app'@'localhost';
FLUSH PRIVILEGES;
```

Replace `<strong-password>` with the same value used in `.env`.

**Verification** — confirm the user has only the expected privilege:
```sql
SHOW GRANTS FOR 'web_app'@'localhost';
-- Expected: GRANT EXECUTE ON PROCEDURE `account`.`sp_create_player_account` TO ...
```

---

## 4. Modify the Stored Procedure

Add error signalling to `account.sp_create_player_account`. The procedure needs to emit MySQL `SIGNAL` errors for three conditions. Add the following checks at the top of the procedure body, before the INSERT:

```sql
-- (1) Registration toggle — implement as a config table or hardcoded flag
IF (SELECT value FROM account.config WHERE key_name = 'registration_enabled') = 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRATION_DISABLED';
END IF;

-- (2) Email uniqueness check
IF EXISTS (SELECT 1 FROM account WHERE Email = p_email LIMIT 1) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EMAIL_TAKEN';
END IF;

-- (3) Login uniqueness check
IF EXISTS (SELECT 1 FROM account WHERE Login = p_login LIMIT 1) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'LOGIN_TAKEN';
END IF;
```

> **Note on `REGISTRATION_DISABLED`**: The implementation of the toggle (config table, env flag, or hardcoded) is left to the developer. The important contract is the `SIGNAL MESSAGE_TEXT = 'REGISTRATION_DISABLED'` string that the web layer listens for.

---

## 5. Verify Locale Keys

After adding locale keys to `locales/pl.json` and `locales/en.json`, verify no keys are missing:

```bash
npm run dev
# Navigate to http://localhost:8080/register in browser
# Switch language with the toggle — verify all labels render in both languages
```

---

## 6. Run the Application

```bash
npm run dev
```

Navigate to `http://localhost:8080/register`. The registration form should render. Test the following manually:

| Test | Expected result |
|------|----------------|
| Submit with empty fields | Field-level error shown |
| Submit with invalid email | Email validation error |
| Submit with unique data | Redirect to /register/success with patcher link |
| Submit with duplicate email | "email already taken" error |
| Submit with duplicate login | "login already taken" error |
| Submit 11 times from same IP | 10th attempt succeeds (if valid), 11th returns 429 |
| Change `PATCHER_URL` in `.env` and restart | Success page shows updated URL |

---

## 7. Lint and Type Check

```bash
npm run typecheck
```

No type errors should be present before marking the feature complete.

---

## Database Security Checklist

Before deploying to production:

- [ ] `web_register` user exists with password set
- [ ] `web_register` has ONLY `EXECUTE` on `sp_create_player_account` — no table-level access
- [ ] DB credentials are NOT committed to git (`.env` is in `.gitignore`)
- [ ] `DB_PASSWORD` is set in the production PM2 ecosystem config or rc.d environment
