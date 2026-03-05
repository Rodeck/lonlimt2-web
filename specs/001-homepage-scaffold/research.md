# Research: Homepage Scaffold — LonliMT2 Webpage

**Branch**: `001-homepage-scaffold` | **Date**: 2026-03-05
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## Decision 1: SSR Framework

**Decision**: **Hono** (`hono` + `@hono/node-server`) with **Eta** template engine

**Rationale**:
- Hono is a pure-JS, zero-native-dependency web framework. It installs and runs on
  FreeBSD 14 via `npm install` with no compilation step — directly satisfying Constitution
  Principle III.
- Eta is a lightweight, pure-JS template engine with native support for layouts, partials,
  and server-side rendering. Zero native deps.
- Together, Hono + Eta deliver full SSR in a single Node.js process with minimal
  boilerplate — strongly aligned with Constitution Principle VI (Simplicity).
- No separate build step is required for rendering; only CSS needs a build step (Tailwind).

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| Astro (Node SSR adapter) | Requires a build step on every deployment; more tooling surface; overkill for this content volume |
| Express + Nunjucks | Viable but Hono has better TypeScript support and simpler middleware model |
| Next.js | Overkill; App Router complexity contradicts Principle VI; larger footprint |
| Fastify + Handlebars | Fastify has a native `fast-querystring` dep that may need compilation; risk on FreeBSD |

---

## Decision 2: Localisation Implementation

**Decision**: **Hand-rolled JSON i18n helper** (~40 lines of TypeScript)

**Rationale**:
- Two locales, static JSON files, dot-notation key access — no library is needed.
- `i18next` and similar libraries add hundreds of KB and configuration complexity for
  a use case solvable with a `JSON.parse` + key-path resolver.
- Aligns with Constitution Principle VI and Principle VII's explicit preference for
  lightweight implementation.

**Implementation approach**:
- `locales/pl.json` and `locales/en.json` contain nested objects; keys are accessed via
  dot-notation (e.g., `nav.home`, `hero.cta`).
- A `t(key, locale)` helper function: loads the JSON for the requested locale, traverses
  the key path, and falls back to `pl` if the key is missing in `en`.
- Locale detection order on first request:
  1. Read `locale` cookie → if `pl` or `en`, use it.
  2. Parse `Accept-Language` header → best match against `['pl','en']` → use it.
  3. Default to `pl`.
- Locale switching: A `GET /set-locale?l=en` endpoint sets the `locale` cookie
  (`HttpOnly=false` so it is readable for page decisions, `SameSite=Lax`, `Path=/`,
  `Max-Age=31536000`) and redirects to the `Referer` header or `/`.
- Cookie is `HttpOnly=false` since locale preference is not sensitive data; it needs no
  JS access but is not a security concern.

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| `i18next` | ~280KB, complex init, unnecessary for 2 static locales |
| `rosetta` | Lightweight but adds a dependency for functionality we can write in 40 lines |
| URL-based locale (`/pl/`, `/en/`) | More complex routing; SEO impact requires hreflang setup; scope too large |

---

## Decision 3: CSS / Styling Strategy

**Decision**: **Tailwind CSS** (build-time utility generation) under a **bespoke Metin2
design system**

**Rationale**:
- Tailwind CLI (`tailwindcss` npm package) is pure JS and runs on FreeBSD 14 without
  compilation. It generates a single static CSS file via `npx tailwindcss` — this file
  is served from `public/css/` with no runtime dependency.
- Tailwind is used as a utility toolbox, not as the design language. Custom CSS variables
  define the Metin2 colour palette, fonts, and atmospheric effects. Tailwind utilities
  handle spacing, layout, and responsive breakpoints.
- A single PostCSS build step is added to `package.json` (`npm run build:css`) that
  compiles once. No watch mode is required in production.

**Design tokens** (defined in `src/styles/theme.css`, imported into Tailwind config):
- Primary: deep crimson / blood red (`#8B0000` → `#C62828`)
- Accent: aged gold (`#B8860B` → `#D4AF37`)
- Background: dark charcoal / obsidian (`#0D0D0D` → `#1A1A2E`)
- Text: parchment off-white (`#E8DCC8`)
- Font: 'Cinzel' (Google Fonts — serif with ancient/fantasy aesthetic) for headings;
  system sans-serif for body text

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| Pure hand-written CSS | Slower for responsive layouts; no utility reuse |
| Bootstrap | Generic aesthetic violates Constitution Principle IV |
| Sass only | Valid but Tailwind utilities accelerate layout work without compromising design control |
| UnoCSS | Less stable on FreeBSD pkg; smaller community |

---

## Decision 4: Node.js Runtime Version

**Decision**: **Node.js 20 LTS** (`node20` pkg on FreeBSD 14)

**Rationale**:
- `node20` is available as a pre-built binary package in FreeBSD 14 ports (`pkg install
  node20`) with no compilation required.
- Node.js 20 LTS is in active maintenance through April 2026 and security maintenance
  through April 2027 — sufficient project runway.
- All chosen dependencies (Hono, Eta, Tailwind CLI) are tested against Node.js 20.

**FreeBSD 14 package verification**:
- FreeBSD 14 ports tree includes: `node20`, `npm-node20`, `node22`, `npm-node22`.
- Confirmed: `@hono/node-server`, `hono`, `eta`, `tailwindcss` install cleanly via npm on
  Node.js 20 with no native add-on compilation.

---

## Decision 5: Asset Strategy (Hero Image)

**Decision**: Serve a **placeholder image** from `public/images/hero-placeholder.jpg`
during initial delivery; document the expected dimensions and format for the final asset.

**Rationale**:
- No final game artwork is available at spec time (documented in Assumptions).
- A thematic dark placeholder (`1920×1080`, JPG) with the Metin2 colour scheme is
  sufficient for visual review validation (SC-007).
- The path `public/images/hero.jpg` is the production target; placeholder ships under
  that name so no code changes are required when the final asset replaces it.

**Expected final asset**: `1920×1080` JPEG or WebP, game-themed artwork. Alternative:
A CSS-only atmospheric background using radial gradients + the colour palette (no image
file needed), which eliminates the asset dependency entirely — this is the preferred
fallback if no artwork is available at delivery time.

---

## Decision 6: Process Manager

**Decision**: **PM2** via `npm install -g pm2`

**Rationale**:
- PM2 installs on FreeBSD 14 via npm without native compilation.
- Provides process restart on crash, log rotation, and startup script generation
  (`pm2 startup freebsd`).
- Alternative (FreeBSD `rc.d` script) is equally valid for production but PM2 is faster
  to configure during development and testing.

---

## Resolved NEEDS CLARIFICATION Items

None were raised in the spec. All technical decisions were flagged as "to be locked in
Phase 0" by the constitution — all are now resolved above.
