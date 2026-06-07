# HTTP Route Contracts: Account Registration

**Feature**: 002-register-account
**Date**: 2026-03-05

---

## GET /register

Renders the registration form page.

### Request

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/register` |
| Authentication | None required |
| Cookies | `locale` (optional) — determines display language |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| `200 OK` | HTML page with registration form | Always |

### Page content

- Registration form with fields: `email`, `login`, `password`
- Any validation errors passed via query parameters or session are NOT applicable (clean GET always shows blank form)
- All form field labels and placeholders sourced from locale catalogue

---

## POST /register

Processes a registration form submission.

### Request

| Property | Value |
|----------|-------|
| Method | `POST` |
| Path | `/register` |
| Content-Type | `application/x-www-form-urlencoded` |
| Authentication | None required |
| Headers | `Origin` or `Referer` required (CSRF validation) |

### Request Body Fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email format; max 64 chars |
| `login` | string | Yes | Non-empty; max 30 chars |
| `password` | string | Yes | Min 6 chars; max 72 chars |

### Response

| Status | Body / Headers | Condition |
|--------|---------------|-----------|
| `302 Found` | `Location: /register/success` | Account created successfully |
| `200 OK` | HTML — registration form re-rendered with error message | Validation failed or SP returned business error |
| `429 Too Many Requests` | HTML or plain text error | Rate limit exceeded (10 attempts/IP/hour) |
| `403 Forbidden` | HTML or plain text error | CSRF check failed (missing/invalid Origin or Referer) |
| `500 Internal Server Error` | HTML — registration form with generic error message | Unexpected server/DB error |

### Error display on 200 re-render

The re-rendered form includes one error message in the `register.error.*` namespace. Previously entered `email` and `login` values are repopulated in the form fields. The `password` field is always cleared on re-render.

---

## GET /register/success

Renders the post-registration success page.

### Request

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/register/success` |
| Authentication | None required |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| `200 OK` | HTML success page with patcher download link | Always |

### Page content

- Congratulatory heading and message (from locale catalogue)
- Prominent download button/link pointing to `PATCHER_URL` environment variable value
- Note instructing player to run the patcher as administrator
- Navigation back to home page

**Note**: This page is publicly accessible. No session or token is required to view it. The success page is reached naturally after POST /register → 302 redirect, but can be visited directly at any time.

---

## Middleware Applied

| Middleware | Routes | Purpose |
|-----------|--------|---------|
| `localeMiddleware` | All routes | Resolve display language from cookie / Accept-Language |
| `csrf` (hono/csrf) | `POST /register` | Reject requests with invalid Origin/Referer |
| `rateLimitMiddleware` | `POST /register` | Max 10 attempts per IP per hour |
