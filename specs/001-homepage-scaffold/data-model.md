# Data Model: Homepage Scaffold — LonliMT2 Webpage

**Branch**: `001-homepage-scaffold` | **Date**: 2026-03-05
**Note**: This feature has no database access. All entities below are in-memory runtime
structures or configuration shapes, not database tables.

---

## Locale

The active language identifier for a request. Determines which locale catalogue is read
and which text is rendered.

```
Locale
├── value: "pl" | "en"
└── source: "cookie" | "accept-language" | "default"
```

**Rules**:
- `value` MUST be exactly `"pl"` or `"en"`. No other values are accepted.
- `source` is informational only (for logging/debugging); it does not affect behaviour.
- When `source` is `"cookie"`, the `locale` cookie value overrides browser detection.
- When `source` is `"accept-language"`, the best match from `Accept-Language` header was
  used.
- When `source` is `"default"`, no usable preference was detected; `"pl"` is applied.

**Persistence**: Stored as a plain HTTP cookie:
- Name: `locale`
- Value: `"pl"` or `"en"`
- Path: `/`
- SameSite: `Lax`
- Max-Age: 31,536,000 seconds (1 year)
- HttpOnly: `false` (locale is not sensitive; no JS access is needed but not harmful)

---

## LocaleEntry (Translation Key–Value Pair)

The in-memory representation of a single translated string, loaded from the locale
catalogue JSON file.

```
LocaleEntry
├── key: string          // dot-notation key path (e.g., "nav.home", "hero.cta")
└── value: string        // localised string for the active locale
```

**Locale file format** (`locales/pl.json`, `locales/en.json`):

```json
{
  "nav": {
    "home": "Strona główna",
    "patchNotes": "Aktualizacje",
    "presentation": "Prezentacja",
    "register": "Zarejestruj się",
    "login": "Zaloguj się"
  },
  "hero": {
    "tagline": "Dołącz do legendy. Graj w LonliMT2.",
    "description": "Klasyczny serwer Metin2 z unikalnymi funkcjami ...",
    "cta": "Zarejestruj się teraz"
  },
  "placeholder": {
    "comingSoon": "Wkrótce dostępne"
  },
  "footer": {
    "copyright": "© 2026 LonliMT2. Wszelkie prawa zastrzeżone.",
    "serverName": "LonliMT2"
  },
  "lang": {
    "toggle": "EN"
  }
}
```

**Rules**:
- The `pl.json` file is authoritative. A missing key in `pl.json` is a deployment error.
- A missing key in `en.json` falls back to the `pl.json` value for that key (no error).
- Key paths MUST use dot notation matching the nested JSON structure.
- String values MUST NOT contain hardcoded HTML; they are text-only (HTML escaping is
  applied at template render time).

---

## NavItem (Navigation Link)

Runtime configuration for a single entry in the top navigation bar. Constructed once at
server startup from a static list.

```
NavItem
├── key: string       // unique identifier (e.g., "home", "patchNotes")
├── path: string      // URL path (e.g., "/", "/patch-notes")
├── labelKey: string  // locale key for the display label (e.g., "nav.home")
└── isActive: boolean // true when NavItem.path matches the current request path
```

**Static configuration** (defined in `src/lib/nav.ts`):

| key           | path             | labelKey             |
|---------------|------------------|----------------------|
| `home`        | `/`              | `nav.home`           |
| `patchNotes`  | `/patch-notes`   | `nav.patchNotes`     |
| `presentation`| `/presentation`  | `nav.presentation`   |

The Register/Login action is rendered separately from `NavItem` list as it has distinct
visual treatment (button style vs. link style). It uses keys `nav.register` / `nav.login`.

**Rules**:
- `isActive` is computed per-request by comparing `NavItem.path` to the current URL path.
- Exactly one `NavItem` per request will have `isActive = true`, or none if on a route
  outside the nav list (e.g., `/register`).

---

## Page (Route Metadata)

Metadata associated with a server-rendered page route, used to populate `<title>` and
`<meta description>`.

```
Page
├── route: string       // URL path (e.g., "/", "/patch-notes")
├── titleKey: string    // locale key for <title> (e.g., "page.home.title")
└── descKey: string     // locale key for <meta description>
```

**Static page registry** (defined in `src/lib/pages.ts`):

| route            | titleKey                | descKey                  |
|------------------|-------------------------|--------------------------|
| `/`              | `page.home.title`       | `page.home.desc`         |
| `/patch-notes`   | `page.patchNotes.title` | `page.patchNotes.desc`   |
| `/presentation`  | `page.presentation.title` | `page.presentation.desc` |

**Locale additions required** in both `pl.json` and `en.json`:
```json
{
  "page": {
    "home": {
      "title": "LonliMT2 — Dołącz do legendy",
      "desc": "Oficjalny serwer LonliMT2. Zarejestruj się i zacznij grać."
    },
    "patchNotes": {
      "title": "Aktualizacje — LonliMT2",
      "desc": "Historia zmian i aktualizacji serwera LonliMT2."
    },
    "presentation": {
      "title": "Prezentacja serwera — LonliMT2",
      "desc": "Poznaj LonliMT2 — funkcje, świat gry i społeczność."
    }
  }
}
```

---

## HeroSection (Home Page Only)

Logical grouping of content elements rendered in the above-the-fold area of the home page.
Not a database entity — it is assembled from locale strings and a static asset reference
at render time.

```
HeroSection
├── backgroundImagePath: string   // e.g., "/images/hero.jpg"
├── taglineKey: string            // e.g., "hero.tagline"
├── descriptionKey: string        // e.g., "hero.description"
├── ctaTextKey: string            // e.g., "hero.cta"
└── ctaHref: string               // "/register" (static, not localised)
```

**Rules**:
- `ctaHref` is always `/register` regardless of locale (routes are not localised).
- `backgroundImagePath` points to a file in `public/images/`; its existence is a
  deployment precondition, not validated at runtime.
- If the background image is replaced by a CSS gradient, `backgroundImagePath` is
  omitted and the template uses a CSS class instead.
