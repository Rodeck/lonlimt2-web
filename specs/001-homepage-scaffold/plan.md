# Implementation Plan: Homepage Scaffold — LonliMT2 Webpage

**Branch**: `001-homepage-scaffold` | **Date**: 2026-03-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-homepage-scaffold/spec.md`

## Summary

Build the structural foundation of the LonliMT2 game server website: a Hono + Eta SSR
application with a Metin2-themed home page (hero section, navbar, footer), two placeholder
pages (Patch Notes, Presentation), server-side locale detection and switching (Polish/
English), and a hand-rolled JSON i18n helper — all running on Node.js 20 LTS without
native add-on compilation, deployable on FreeBSD 14.

## Technical Context

**Language/Version**: TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14)
**Primary Dependencies**: Hono 4.x + @hono/node-server, Eta 3.x, Tailwind CSS 3.x (build-time only)
**Storage**: N/A — no database access in this feature; locale files are plain JSON
**Testing**: Manual walkthrough per quickstart.md validation checklist (no automated test framework in this feature)
**Target Platform**: FreeBSD 14 (Node.js 20 LTS via pkg; zero native npm deps)
**Project Type**: SSR web application (single Node.js process)
**Performance Goals**: Page load < 500ms on LAN; CSS bundle < 50KB gzipped
**Constraints**: Zero native npm add-ons; no Docker; no SPA routing; no client-side state management
**Scale/Scope**: 3 pages + 1 locale-switch endpoint; 2 locale files; ~8 source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. SSR-First | ✅ PASS | Hono + Eta renders full HTML server-side on every request. No SPA patterns. Client-side JS is limited to optional progressive enhancement only. |
| II. Secure DB Access via SP | ✅ N/A | This feature performs zero database operations. All content is served from locale files and static assets. |
| III. FreeBSD 14 Compatibility | ✅ PASS | All npm deps (hono, eta, tailwindcss) are pure JS. Node.js 20 LTS is available as FreeBSD 14 `pkg install node20`. No native compilation required. |
| IV. Design Authenticity | ✅ PASS | Bespoke Metin2-themed design: custom colour palette (crimson/gold/obsidian), 'Cinzel' serif font for headings, atmospheric backgrounds. No generic component library drives the visual language. |
| V. Security-First Auth | ✅ N/A | No authentication in this feature. The locale cookie is `SameSite=Lax` and contains only `"pl"` or `"en"` — no sensitive data. |
| VI. Simplicity | ✅ PASS | Single process; hand-rolled i18n (~40 lines); no ORM; no microservices; no client state library. Tailwind is build-time only — no runtime JS framework. |
| VII. Localisation | ✅ PASS | All strings externalised to `locales/pl.json` + `locales/en.json`. Accept-Language detection on first request. Cookie persistence. Visible language toggle on every page. Polish default. |

**Post-design re-check**: All gates still pass. No violations found.

## Project Structure

### Documentation (this feature)

```text
specs/001-homepage-scaffold/
├── plan.md              # This file
├── research.md          # Phase 0 — framework, i18n, CSS, runtime decisions
├── data-model.md        # Phase 1 — Locale, NavItem, Page, HeroSection shapes
├── quickstart.md        # Phase 1 — setup, dev server, validation checklist
├── contracts/
│   └── routes.md        # Phase 1 — HTTP route contracts + template context shapes
└── tasks.md             # Phase 2 output (/speckit.tasks command — not yet created)
```

### Source Code (repository root)

```text
locales/
├── pl.json              # Polish locale catalogue (authoritative)
└── en.json              # English locale catalogue

public/
├── css/
│   └── style.css        # Tailwind output (generated, not hand-edited)
└── images/
    └── hero.jpg         # Hero image placeholder (1920×1080 JPEG or WebP)

src/
├── index.ts             # Hono app: initialise server, register routes & middleware
├── lib/
│   ├── i18n.ts          # t() helper, JSON loader, Accept-Language parser, fallback
│   └── nav.ts           # NavItem static list, isActive computation per request path
├── middleware/
│   └── locale.ts        # Locale resolution middleware: cookie → header → "pl"
└── views/
    ├── layouts/
    │   └── base.eta     # Shared HTML shell: <head>, navbar, lang toggle, footer
    ├── home.eta         # Hero section: bg, image, tagline, description, CTA
    ├── patch-notes.eta  # Placeholder content for /patch-notes
    └── presentation.eta # Placeholder content for /presentation

tailwind.config.js       # Tailwind config with content paths + custom theme tokens
tsconfig.json            # TypeScript strict mode
package.json             # Scripts: dev, start, build:css, typecheck
```

**Structure Decision**: Single-project layout (no frontend/backend split). All server
code lives in `src/`; static output lives in `public/`; locale files at root level
`locales/`. This matches the SSR-first, single-process architecture decided in Phase 0.

## Complexity Tracking

> No constitution violations detected. Table left empty intentionally.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
