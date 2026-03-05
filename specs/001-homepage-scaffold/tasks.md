---
description: "Task list for 001-homepage-scaffold"
---

# Tasks: Homepage Scaffold — LonliMT2 Webpage

**Input**: Design documents from `specs/001-homepage-scaffold/`
**Branch**: `001-homepage-scaffold`
**Stack**: TypeScript · Node.js 20 LTS · Hono 4.x + @hono/node-server · Eta 3.x · Tailwind CSS 3.x
**Tests**: Not requested — no test tasks generated.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[USn]**: User story label — required for all user story phase tasks
- Include exact file path in every task description

---

## Phase 1: Setup (Project Initialisation)

**Purpose**: Create the package manifest, TypeScript config, Tailwind config, and CSS
entry file. No source code yet. All tasks after T001 depend on npm dependencies being
installed.

- [x] T001 Initialise package.json with all runtime and dev dependencies (`hono`, `@hono/node-server`, `eta`, `tsx`, `typescript`, `@types/node`, `tailwindcss`) and npm scripts (`dev`, `start`, `build:css`, `typecheck`) at project root
- [x] T002 [P] Create tsconfig.json at project root — strict mode, `moduleResolution: "bundler"`, `target: "ES2022"`, include `src/**/*`
- [x] T003 [P] Create tailwind.config.js at project root — set `content` to `["./src/views/**/*.eta"]`; define Metin2 custom theme: colours (`crimson: #C62828`, `gold: #D4AF37`, `obsidian: #0D0D0D`, `parchment: #E8DCC8`), font family (`cinzel: ["Cinzel", "serif"]`)
- [x] T004 Create src/styles/input.css — add `@tailwind base; @tailwind components; @tailwind utilities;` plus CSS custom properties for Metin2 design tokens (matching Tailwind theme)

**Checkpoint**: ✅ `npm install` succeeded (83 packages); `npm run build:css` produces `public/css/style.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that every user story depends on — locale catalogues,
i18n helper, nav config, locale middleware, base layout template, and the Hono app entry
point. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: All route implementations in Phases 3–5 depend on T008–T010.

- [x] T005 [P] Create locales/pl.json with all string keys for this feature: `nav.*` (home, patchNotes, presentation, register, login), `hero.*` (tagline, description, cta), `footer.*` (serverName, copyright), `placeholder.comingSoon`, `lang.toggle`, `page.home.*`, `page.patchNotes.*`, `page.presentation.*` (title + desc for each)
- [x] T006 [P] Create locales/en.json with the same key structure as pl.json, translated to English
- [x] T007 [P] Implement src/lib/i18n.ts — export `loadLocale(locale: "pl"|"en"): Record<string,unknown>` that reads and parses the JSON file; export `t(key: string, locale: "pl"|"en"): string` that resolves dot-notation paths, falls back to `pl` for missing `en` keys, throws for missing `pl` keys
- [x] T008 [P] Implement src/lib/nav.ts — export the static `NAV_ITEMS` array of `NavItem` objects (key, path, labelKey for home/patchNotes/presentation); export `buildNav(currentPath: string, locale: "pl"|"en"): NavItemResolved[]` that computes `isActive` and resolves labels via `t()`
- [x] T009 Implement src/middleware/locale.ts — Hono middleware that reads the `locale` cookie; if absent, parses `Accept-Language` header for `pl`/`en` best-match; defaults to `pl`; stores resolved locale in Hono context variable; sets `locale` cookie on response (`SameSite=Lax`, `Path=/`, `Max-Age=31536000`) when source is not cookie (depends on T007)
- [x] T010 Create src/views/layouts/base.eta — complete HTML shell with: `<head>` (charset, viewport, localised `<title>` from `it.pageTitle`, `<meta name="description">`, link to `/static/css/style.css`, Google Fonts Cinzel link); `<header>` with LonliMT2 brand + navbar links from `it.navItems` + language toggle link (`/set-locale?l=<toggle>`); `<%~ it.body %>` content slot; `<footer>` with `it.t("footer.serverName")` and `it.t("footer.copyright")` (depends on T008)
- [x] T011 Implement src/index.ts — create Hono app; register locale middleware; serve `public/` as static at `/static/*` using Hono's `serveStatic`; register `GET /set-locale` route that validates `l` query param (`pl`|`en`, defaults to `pl`), sets locale cookie, redirects to `Referer` or `/`; start `@hono/node-server` on port 3000 (depends on T009, T010)

**Checkpoint**: ✅ Server starts on port 3000; `/set-locale?l=en` returns 302 with Set-Cookie; static CSS served at `/static/css/style.css`

---

## Phase 3: User Story 1 — Visitor Discovers the Server on the Home Page (Priority: P1) 🎯 MVP

**Goal**: Home page at `/` renders with themed background, hero image, localised tagline,
description, and a CTA button linking to `/register`. Navbar visible with Home active.

**Independent Test**: Open http://localhost:3000 — server name "LonliMT2" visible in navbar,
hero section with image and Polish text above the fold, "Zarejestruj się teraz" CTA links
to `/register`. Switch locale to EN via toggle — all text changes to English.

### Implementation for User Story 1

- [x] T012 [P] [US1] Add hero placeholder image to public/images/hero.jpg — CSS-gradient-only atmospheric background implemented in src/styles/input.css (.hero class with crimson/gold/obsidian radial gradients); decorative CSS emblem serves as thematic visual focal point
- [x] T013 [US1] Create src/views/home.eta — hero section with: full-viewport themed background (.hero CSS class); decorative emblem; `<h1>` with `it.hero.tagline` + `it.hero.taglineSub`; gold divider; `<p>` with `it.hero.description`; `<a href="/register">` CTA button with .hero-cta class (depends on T010)
- [x] T014 [US1] Register `GET /` route in src/index.ts — build `HomePageContext` (locale, t function, navItems with Home active, hero object with `/register` href); render `home.eta` inside `base.eta` layout; return HTML response (depends on T011, T013)

**Checkpoint**: ✅ US1 verified — GET / returns 200; Polish text found (tagline, CTA); English detection works; Home nav-active present on /

---

## Phase 4: User Story 2 — Visitor Navigates the Site Using the Navbar (Priority: P2)

**Goal**: `/patch-notes` and `/presentation` routes return valid pages with the correct nav
link active. Navbar mobile responsiveness verified. Active link visually distinct.

**Independent Test**: Navigate to http://localhost:3000/patch-notes — Patch Notes link is
visually active, page shows localised placeholder message. On a 375px-wide viewport, navbar
is usable without horizontal overflow.

### Implementation for User Story 2

- [x] T015 [P] [US2] Create src/views/patch-notes.eta — page body with `<h1>` using `it.sectionTitle` and a `<p>` using `it.comingSoon` styled with Metin2 theme classes (depends on T010)
- [x] T016 [P] [US2] Create src/views/presentation.eta — page body with `<h1>` using `it.sectionTitle` and a `<p>` using `it.comingSoon` styled with Metin2 theme classes (depends on T010)
- [x] T017 [US2] Register `GET /patch-notes` route in src/index.ts — build `PageContext` (locale, t, navItems with Patch Notes active); render `patch-notes.eta` inside `base.eta`; return 200 HTML (depends on T011, T015)
- [x] T018 [US2] Register `GET /presentation` route in src/index.ts — build `PageContext` (locale, t, navItems with Presentation active); render `presentation.eta` inside `base.eta`; return 200 HTML (depends on T011, T016)
- [x] T019 [US2] Refine navbar active state in src/views/layouts/base.eta — conditional `.nav-active` class (gold underline + gold text + text-shadow) vs `.nav-link` for inactive links; `aria-current="page"` attribute on active item (depends on T010)
- [x] T020 [US2] Add mobile navbar responsiveness in src/views/layouts/base.eta — `flex-wrap` + `gap-x-6 gap-y-2` on `.navbar`; `ml-auto` on `.navbar-right`; navbar content wraps naturally at 320–640px viewports without JS (depends on T019)

**Checkpoint**: ✅ US2 verified — GET /patch-notes returns 200; `nav-active` class present; GET /presentation returns 200; responsive CSS-only navbar implemented

---

## Phase 5: User Story 3 — Visitor Reads the Footer (Priority: P3)

**Goal**: Footer is visible at the bottom of all three pages, contains "LonliMT2" and a
localised copyright line, and changes language when the toggle is used.

**Independent Test**: Scroll to the bottom of each page (/, /patch-notes, /presentation) —
footer shows server name and copyright in the active locale. Switch locale — footer text
updates.

### Implementation for User Story 3

- [x] T021 [US3] Complete footer in src/views/layouts/base.eta — `<footer>` contains `it.t("footer.serverName")` (renders "LonliMT2") and `it.t("footer.copyright")` (renders localised copyright); no hardcoded user-facing strings in footer markup (depends on T010)
- [x] T022 [US3] Add footer visual styling in src/styles/input.css — `.site-footer` class: `mt-auto`, `py-6 px-6`, `text-center`, dark background (`rgba(13,13,13,0.95)`), `border-top` with gold tint; `.footer-server-name` (Cinzel, gold-dark, tracking-widest); `.footer-copyright` (parchment-muted, xs)

**Checkpoint**: ✅ US3 verified — footer "Wszelkie prawa" found in PL response; all text from locale files; styling applied via CSS component classes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, type-safety, and production readiness across all user stories.

- [x] T023 [P] Run `npm run build:css` from project root — verify `public/css/style.css` is generated with no errors and is under 50KB gzipped; commit the output file
- [x] T024 [P] Run `npm run typecheck` from project root — resolve all TypeScript errors across src/ until zero errors remain
- [ ] T025 Verify no-JS usability (SC-005) — disable JavaScript in browser DevTools; open /, /patch-notes, /presentation; confirm all content visible and all links navigable; confirm language toggle works via full page reload
- [ ] T026 Verify locale persistence (SC-006) — switch locale to EN; navigate through /, /patch-notes, /presentation in sequence; confirm locale stays EN across all three navigations without reverting
- [ ] T027 Run the complete validation checklist from `specs/001-homepage-scaffold/quickstart.md` — check every item; document any failures as follow-up issues

**Note**: T025–T027 require a browser; marked for manual verification.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete (npm install done)
  - T005, T006, T007, T008: Parallel — all depend only on Phase 1 completing
  - T009: Requires T008 (uses `buildNav`)
  - T010: Requires T009 (imports base template) and T008 (registers locale middleware)
  - T011: Requires T010 (imports and starts server)
- **User Stories (Phases 3–5)**: All require Phase 2 (T011) complete
- **Polish (Phase 6)**: Requires all desired user story phases complete

### User Story Dependencies

- **US1 (Phase 3)**: No dependency on US2 or US3 — independently testable after Phase 2
- **US2 (Phase 4)**: No dependency on US1 or US3 — placeholder pages are self-contained
- **US3 (Phase 5)**: Footer is in base.eta (created in T010); US3 only refines and verifies it — no dependency on US1 or US2

### Within Each User Story

- Models/lib before middleware before entry point (Phase 2)
- Templates before route registration (Phases 3–4)
- Implementation before polish/validation (Phase 6)

### Parallel Opportunities

- T002, T003 can run in parallel (different config files)
- T005, T006, T007, T008 can run in parallel (different files, no cross-dependency)
- T012, T013 (US1 template + route) — T013 must follow T012, but T012 can start immediately after T011
- T015, T016 (US2 placeholder templates) — fully parallel
- T023, T024 (CSS build + typecheck) — fully parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (all tasks — BLOCKS user stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: http://localhost:3000 — home page with hero, navbar, lang toggle, CTA
5. Demo / review before proceeding to US2

### Incremental Delivery

1. Phase 1 + Phase 2 → Server boots, locale switching works (foundation demo)
2. Phase 3 (US1) → Home page complete → **MVP deliverable**
3. Phase 4 (US2) → Navigation complete → all routes return valid pages
4. Phase 5 (US3) → Footer polished and verified
5. Phase 6 → Polish, typecheck, production CSS

### Parallel Team Strategy

With two developers after Phase 2 is complete:
- Developer A: US1 (home page hero section, T012–T014)
- Developer B: US2 (placeholder pages, T015–T020)
- US3 (T021–T022) then taken by whoever finishes first

---

## Notes

- `[P]` = different file(s), no dependency on incomplete tasks in same phase
- `[USn]` label maps task to the user story it delivers; required in Phases 3–5
- No test tasks generated (not requested in spec)
- All templates use Eta syntax: `<%= it.varName %>` for escaped output, `<%~ it.body %>` for unescaped HTML slots
- The locale cookie must be set as `SameSite=Lax` (not `Strict`) so it survives redirect from `/set-locale`
- `public/` is served at `/static/` — CSS link in base.eta must use `/static/css/style.css`
- Commit after each phase checkpoint to preserve rollback points
