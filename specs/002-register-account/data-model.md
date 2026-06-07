# Data Model: Account Registration

**Feature**: 002-register-account
**Date**: 2026-03-05

---

## Entities

### RegistrationInput

Represents the validated data collected from the registration form before passing to the stored procedure.

| Field | Type | Constraints | Validation Rules |
|-------|------|-------------|-----------------|
| `email` | string | Required | Valid email format (RFC 5321); max 64 characters |
| `login` | string | Required | Non-empty; max 30 characters; no leading/trailing whitespace |
| `password` | string (plaintext) | Required | Non-empty; min 6 characters; max length such that resulting hash is ≤ 45 chars (MySQL PASSWORD() hash length is always 41 chars for any input) |

**Notes**:
- `password` field is never persisted or logged in plaintext — it is immediately hashed before use.
- MySQL `PASSWORD()` output is always exactly 41 characters (`*` + 40 hex chars), so the 45-char column constraint is never reached regardless of input length. A practical max of 72 characters on the plaintext password is recommended as a UI limit.

---

### PlayerAccount (game database — external)

Represents the record created in the game's MySQL `account` database by the stored procedure. This entity is owned by the game database; the web application only writes to it via stored procedure.

| Field | Type | Source |
|-------|------|--------|
| `Email` | VARCHAR(64) | From `RegistrationInput.email` |
| `Login` | VARCHAR(30) | From `RegistrationInput.login` |
| `Password` | VARCHAR(45) | Derived from `RegistrationInput.password` via `mysqlNativePassword()` |

**Ownership**: The stored procedure `account.sp_create_player_account` owns the INSERT. The web application has no direct table access.

---

### RegistrationError

Represents a failure response from the stored procedure, mapped to a user-facing locale string.

| Code | Locale key | Meaning |
|------|-----------|---------|
| `EMAIL_TAKEN` | `register.error.emailTaken` | Email already registered |
| `LOGIN_TAKEN` | `register.error.loginTaken` | Login name already in use |
| `REGISTRATION_DISABLED` | `register.error.registrationDisabled` | Registration currently closed |
| `UNKNOWN` | `register.error.unknown` | Unexpected database or server error |

---

### RateLimitEntry (in-memory — per-process)

Tracks registration attempts per IP address for rate limiting. Not persisted.

| Field | Type | Description |
|-------|------|-------------|
| `count` | number | Number of attempts in current window |
| `windowStart` | number (unix ms) | Start of current 1-hour window |

**Policy**: Maximum 10 attempts per IP per 1-hour sliding window. Returns HTTP 429 when exceeded.

---

### PatcherConfig (environment — read-only)

Runtime configuration read from environment variables at server startup.

| Variable | Description |
|----------|-------------|
| `PATCHER_URL` | Full HTTPS/HTTP URL to the patcher download |

---

## State Transitions

```
Registration Form (initial state)
        │
        ▼
[Validate input client-side]
        │
        ├── invalid format ──→ Form with field-level error (same page, no SP call)
        │
        ▼
[Submit POST /register]
        │
[Server-side validation]
        │
        ├── invalid ──────────→ Re-render form with error messages
        │
[Hash password (SHA1×2)]
        │
[Call sp_create_player_account]
        │
        ├── SIGNAL EMAIL_TAKEN ──→ Re-render form, "email already taken" message
        ├── SIGNAL LOGIN_TAKEN ──→ Re-render form, "login already taken" message
        ├── SIGNAL REGISTRATION_DISABLED ──→ Re-render form, "registration closed" message
        ├── Rate limit exceeded ──→ HTTP 429 response
        ├── DB connection error ──→ Re-render form, "server error" message (no leak of internals)
        │
        └── success ──────────→ Redirect to /register/success (PRG pattern)
                                        │
                                        ▼
                                [Render success page]
                                [Show patcher download link]
```

**Note on PRG pattern**: After a successful POST, the server redirects (HTTP 302) to `GET /register/success`. This prevents duplicate form submissions on browser back/refresh.

---

## Locale Keys Required

All user-facing strings for this feature must be added to `locales/pl.json` and `locales/en.json`.

### New keys under `register.*`:

| Key | Polish (pl) | English (en) |
|-----|------------|-------------|
| `register.page.title` | `Rejestracja — LonliMT2` | `Register — LonliMT2` |
| `register.page.desc` | `Zarejestruj swoje konto na serwerze LonliMT2.` | `Register your account on LonliMT2 server.` |
| `register.form.title` | `Utwórz konto` | `Create Account` |
| `register.form.email.label` | `Adres e-mail` | `Email address` |
| `register.form.email.placeholder` | `twoj@email.com` | `your@email.com` |
| `register.form.login.label` | `Login` | `Login` |
| `register.form.login.placeholder` | `Nazwa gracza` | `Player name` |
| `register.form.password.label` | `Hasło` | `Password` |
| `register.form.password.placeholder` | `Min. 6 znaków` | `Min. 6 characters` |
| `register.form.submit` | `Zarejestruj się` | `Register` |
| `register.error.emailTaken` | `Ten adres e-mail jest już zajęty.` | `This email address is already in use.` |
| `register.error.loginTaken` | `Ta nazwa gracza jest już zajęta.` | `This login name is already taken.` |
| `register.error.registrationDisabled` | `Rejestracja nowych kont jest chwilowo niedostępna.` | `New account registration is currently unavailable.` |
| `register.error.unknown` | `Wystąpił błąd serwera. Spróbuj ponownie później.` | `A server error occurred. Please try again later.` |
| `register.error.invalidEmail` | `Podaj prawidłowy adres e-mail.` | `Please enter a valid email address.` |
| `register.error.emailTooLong` | `Adres e-mail nie może przekraczać 64 znaków.` | `Email address must not exceed 64 characters.` |
| `register.error.loginTooLong` | `Login nie może przekraczać 30 znaków.` | `Login must not exceed 30 characters.` |
| `register.error.passwordTooShort` | `Hasło musi mieć co najmniej 6 znaków.` | `Password must be at least 6 characters.` |
| `register.error.rateLimited` | `Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.` | `Too many registration attempts. Please try again in an hour.` |
| `register.success.title` | `Konto utworzone! — LonliMT2` | `Account Created! — LonliMT2` |
| `register.success.heading` | `Witaj na LonliMT2!` | `Welcome to LonliMT2!` |
| `register.success.message` | `Twoje konto zostało pomyślnie utworzone. Pobierz patcher, uruchom go i zacznij grać!` | `Your account has been created. Download the patcher, run it, and start playing!` |
| `register.success.downloadBtn` | `Pobierz Patcher` | `Download Patcher` |
| `register.success.downloadNote` | `Uruchom patcher jako administrator, aby pobrać pliki gry.` | `Run the patcher as administrator to download the game files.` |
