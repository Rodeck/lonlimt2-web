# HTTP Route Contracts: Homepage Scaffold

**Branch**: `001-homepage-scaffold` | **Date**: 2026-03-05
**Framework**: Hono + `@hono/node-server`
**Rendering**: Server-side HTML (full page responses, no JSON API endpoints)

---

## Route: GET /

**Description**: Home page — the primary landing page for LonliMT2.

**Request**:
- Method: `GET`
- Path: `/`
- Cookies read: `locale` (optional; `"pl"` or `"en"`)
- Headers read: `Accept-Language` (used if `locale` cookie absent)

**Response**:
- Status: `200 OK`
- Content-Type: `text/html; charset=utf-8`
- Body: Full SSR HTML document including:
  - `<head>` with localised `<title>` and `<meta name="description">`
  - Navbar with Home marked active, all links rendered
  - Language toggle
  - Hero section: background, hero image, localised tagline + description, CTA button
    linking to `/register`
  - Footer with localised content

**Error cases**:
- If locale catalogue file is unreadable: `500 Internal Server Error` with a plain-text
  error message (locale files are required at startup).

---

## Route: GET /patch-notes

**Description**: Patch Notes page — placeholder until feature is implemented.

**Request**:
- Method: `GET`
- Path: `/patch-notes`
- Cookies read: `locale`
- Headers read: `Accept-Language`

**Response**:
- Status: `200 OK`
- Content-Type: `text/html; charset=utf-8`
- Body: Full SSR HTML with:
  - Navbar with Patch Notes marked active
  - Language toggle
  - Main content area showing localised "coming soon" / placeholder message
  - Footer

---

## Route: GET /presentation

**Description**: Presentation page — placeholder until feature is implemented.

**Request**:
- Method: `GET`
- Path: `/presentation`
- Cookies read: `locale`
- Headers read: `Accept-Language`

**Response**:
- Status: `200 OK`
- Content-Type: `text/html; charset=utf-8`
- Body: Full SSR HTML with:
  - Navbar with Presentation marked active
  - Language toggle
  - Main content area showing localised placeholder message
  - Footer

---

## Route: GET /set-locale

**Description**: Locale-switching endpoint. Sets the `locale` cookie and redirects.

**Request**:
- Method: `GET`
- Path: `/set-locale`
- Query parameters:
  - `l` (required): `"pl"` or `"en"` — the target locale
- Headers read: `Referer` (to redirect back to the originating page)

**Response (success)**:
- Status: `302 Found`
- Headers:
  - `Set-Cookie: locale=<l>; Path=/; Max-Age=31536000; SameSite=Lax`
  - `Location: <Referer header value, or "/" if absent>`
- Body: empty

**Response (invalid `l` value)**:
- Status: `302 Found`
- Behaviour: Silently ignores invalid value; sets cookie to `"pl"` (safe default);
  redirects to Referer or `/`.
- Rationale: Locale switching is a convenience feature; user error should not produce
  an error page.

---

## Route: GET /static/* (public assets)

**Description**: Static file serving for CSS, images, and any client-side JS.

**Request**:
- Method: `GET`
- Path: `/static/<filename>`
- Examples: `/static/css/style.css`, `/static/images/hero.jpg`

**Response**:
- Status: `200 OK` with appropriate `Content-Type`
- Cache-Control: `public, max-age=86400` (1 day; adjust for production)
- Body: file contents from `public/` directory

**Error**:
- `404 Not Found` if file does not exist

---

## Locale Resolution Algorithm (all page routes)

```
1. Read `locale` cookie from request
   → If value is "pl" or "en": use it, source = "cookie"
2. Else: parse Accept-Language header
   → Find best match in ["pl", "en"]
   → If match found: use it, source = "accept-language"
3. Else: use "pl", source = "default"
4. Pass resolved Locale to template context
5. Set locale cookie on response if source != "cookie"
   (ensures cookie is populated for future requests)
```

---

## Shared Template Context Shape

All page routes inject the following into the Eta template:

```typescript
interface PageContext {
  locale: "pl" | "en";
  t: (key: string) => string;         // translation helper
  navItems: NavItem[];                 // with isActive computed
  currentPath: string;                // e.g., "/patch-notes"
  langToggleLocale: "pl" | "en";      // opposite of current locale
  langToggleLabel: string;            // e.g., "EN" or "PL"
}
```

Page-specific additions for `/`:
```typescript
interface HomePageContext extends PageContext {
  hero: {
    backgroundImagePath: string;
    tagline: string;     // pre-resolved via t()
    description: string; // pre-resolved via t()
    ctaText: string;     // pre-resolved via t()
    ctaHref: "/register";
  };
}
```
