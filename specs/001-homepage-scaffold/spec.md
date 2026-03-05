# Feature Specification: Homepage Scaffold — LonliMT2 Webpage

**Feature Branch**: `001-homepage-scaffold`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Let's initialize server web page, page should have topbar
with navigation, server name is LonliMT2. Navbar should has Home | Patch Notes |
Presentation .......... Register/Login. Do not add any mocked data, it will be implemented
later. Home page should have some background that fits style, an image and some description
encouraging to play and linking to register page. Include footer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visitor Discovers the Server on the Home Page (Priority: P1)

A new player hears about LonliMT2 and opens the website for the first time. They are
greeted by an immersive, game-themed landing page that clearly displays the server name,
an atmospheric hero image, and a short motivating description of the server. A prominent
call-to-action invites them to register and start playing.

**Why this priority**: This is the primary purpose of the site — to convert curious
visitors into registered players. Every other page builds on having this foundation in
place.

**Independent Test**: Open the home page URL in a browser. Without any other features
built, the page must show the server name, a thematic background, a hero image, descriptive
text, and a working link to the registration page — all in the visitor's detected or chosen
language.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page URL, **When** the page loads, **Then** the
   server name "LonliMT2" is prominently visible in the header/navbar area.
2. **Given** a visitor views the home page, **When** they look at the above-the-fold area,
   **Then** they see a Metin2-themed background, a hero image, and descriptive text
   encouraging them to play — all without scrolling.
3. **Given** a visitor reads the home page, **When** they see the call-to-action element,
   **Then** clicking it navigates them to the registration page.
4. **Given** a visitor whose browser language is Polish, **When** the home page loads for
   the first time, **Then** all text is displayed in Polish.
5. **Given** a visitor whose browser language is English, **When** the home page loads for
   the first time, **Then** all text is displayed in English.

---

### User Story 2 — Visitor Navigates the Site Using the Navbar (Priority: P2)

A returning visitor or curious new player wants to explore different sections of the site
(Patch Notes, Presentation). They use the top navigation bar to move between pages. The
active page is clearly indicated. The Register/Login action is always accessible from the
navbar.

**Why this priority**: Navigation scaffolds all future features. Patch Notes and
Presentation sections cannot be accessed without it, and the Register/Login entry point
must be consistently reachable.

**Independent Test**: Render each navigable page in isolation and confirm the navbar
appears with all links, highlights the correct active item, and that the Register/Login
button is clickable on every page.

**Acceptance Scenarios**:

1. **Given** a visitor is on any page, **When** they look at the top of the page, **Then**
   they see navigation links: Home, Patch Notes, Presentation, and a Register/Login action
   element positioned visually to the right of the other links.
2. **Given** a visitor is on the Home page, **When** they view the navbar, **Then** the
   Home link is visually distinguished as the active page.
3. **Given** a visitor clicks Patch Notes or Presentation in the navbar, **When** the page
   loads, **Then** they land on that page (even if it shows a coming-soon placeholder) and
   that link is marked active.
4. **Given** a visitor views the site on a narrow mobile screen, **When** they open the
   page, **Then** the navbar is usable — either collapsed into a hamburger menu or adapted
   to fit the viewport — without horizontal scrolling.

---

### User Story 3 — Visitor Reads the Footer (Priority: P3)

A visitor scrolls to the bottom of any page and finds a footer with basic information
about the site. The footer is consistent across all pages and matches the active locale.

**Why this priority**: The footer is a required UI element that frames every page and
is expected in a professional web experience. It does not block any core functionality.

**Independent Test**: Render any page and scroll to the bottom. The footer must be visible,
contain localised text, and be consistent in appearance across Home, Patch Notes, and
Presentation pages.

**Acceptance Scenarios**:

1. **Given** a visitor is on any page, **When** they scroll to the bottom, **Then** a
   footer is visible containing at minimum the server name and a copyright or attribution
   line.
2. **Given** the active locale is Polish, **When** a visitor views the footer, **Then**
   footer text is displayed in Polish.
3. **Given** the active locale is English, **When** a visitor views the footer, **Then**
   footer text is displayed in English.

---

### Edge Cases

- What happens when the browser's `Accept-Language` header is absent or contains neither
  `pl` nor `en`? The page MUST fall back to Polish without error.
- What happens when JavaScript is disabled? All pages MUST be fully readable and navigable;
  the language toggle MUST work via a full page reload (form submission or link) rather
  than requiring client-side execution.
- What happens on very wide (2560px+) or very narrow (320px) viewports? The layout MUST
  remain functional and not overflow horizontally at either extreme.
- What happens when a visitor navigates directly to `/patch-notes` or `/presentation`
  before those features are built? The route MUST exist and return a valid page (a
  localised placeholder message) rather than a 404.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST display a persistent top navigation bar on every page
  containing: the server name "LonliMT2" as a brand element, links to Home, Patch Notes,
  and Presentation, and a Register/Login action element positioned visually at the far
  right of the navbar.
- **FR-002**: The navbar MUST visually distinguish the link corresponding to the currently
  active page from the other links.
- **FR-003**: The home page MUST display a themed background (full-width or full-viewport)
  consistent with the Metin2 game aesthetic.
- **FR-004**: The home page MUST include a hero image (game-related artwork or thematic
  visual) visible in the above-the-fold area at desktop resolution (1280×800).
- **FR-005**: The home page MUST include descriptive text that communicates the server's
  appeal and motivates visitors to register; the text MUST be localised in both Polish
  and English.
- **FR-006**: The home page MUST include a prominent call-to-action element (button or
  styled link) that navigates to the registration page (`/register`).
- **FR-007**: The site MUST render a footer on every page containing at minimum the server
  name "LonliMT2" and a copyright line; all footer text MUST be localised.
- **FR-008**: Routes for `/patch-notes` and `/presentation` MUST exist and return a valid
  HTML page; they MAY display a localised placeholder message until their features are
  implemented separately.
- **FR-009**: Every user-facing string across all pages and the footer MUST be sourced from
  locale catalogue files (`locales/pl.json` and `locales/en.json`); hardcoded user-facing
  strings in templates are prohibited per the project constitution.
- **FR-010**: On a visitor's first request, the site MUST read the `Accept-Language` HTTP
  header and set the locale to `pl` if Polish is preferred, `en` if English is preferred,
  or `pl` as default when neither is detected.
- **FR-011**: A visible language toggle MUST appear on every page allowing the visitor to
  switch between Polish (`PL`) and English (`EN`); the selected locale MUST persist across
  subsequent page navigations within the same session.
- **FR-012**: All pages MUST be fully rendered and readable server-side; the site MUST NOT
  require client-side JavaScript for content display or inter-page navigation.

### Key Entities

- **Page**: A navigable route returning a full server-rendered HTML document. Initial
  pages: Home (`/`), Patch Notes (`/patch-notes`), Presentation (`/presentation`).
  Linked-to but out-of-scope pages: Register (`/register`), Login (`/login`).
- **Navigation Item**: A labelled link within the navbar with an active or inactive visual
  state, corresponding to a Page.
- **Locale**: One of two supported language identifiers — `pl` (Polish, default) or `en`
  (English). Determined per-session via browser detection on first visit, overridable by
  user toggle, and persisted for the session.
- **Hero Section**: The above-the-fold area on the Home page comprising: themed
  background, hero image, descriptive text, and call-to-action element.
- **Footer**: A page-bottom element present on all pages containing the server name,
  copyright line, and localised text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify the server name and understand the server's
  purpose within 5 seconds of the home page loading, as measured by a walkthrough where a
  tester reads the server name and tagline without any assistance.
- **SC-002**: All navigation destinations (Home, Patch Notes, Presentation, Register/Login)
  are reachable within a single click from any page in the site.
- **SC-003**: The home page call-to-action (Register link) is visible without scrolling on
  a 1280×800 desktop viewport and a 375×667 mobile viewport.
- **SC-004**: All user-facing text on all pages changes correctly when the language toggle
  is switched, with zero hardcoded strings remaining in either locale.
- **SC-005**: The site is fully readable and navigable with JavaScript disabled — verified
  by disabling JS in browser developer tools and confirming all links work and all content
  is visible.
- **SC-006**: The language toggle selection persists correctly across at least three
  sequential page navigations without reverting to the default locale.
- **SC-007**: The home page passes a visual review confirming it is clearly themed to the
  Metin2 game world and does not resemble a generic off-the-shelf web template.

## Assumptions

- The hero image will be a thematic placeholder (e.g., Metin2 game screenshot or artwork)
  for initial delivery; the specific final asset is not required before implementation
  begins.
- The Register (`/register`) and Login (`/login`) pages are **out of scope** for this
  spec; FR-006 only requires that the CTA and navbar link point to `/register`.
- Patch Notes and Presentation pages are structural placeholders only; their content
  features are separate specs to be created later.
- The footer does not require social media links, a sitemap, or sub-navigation at this
  stage — server name and copyright are sufficient for initial delivery.
- The language toggle may be implemented as a simple server-handled link or form (no
  client-side JS required), consistent with the SSR-First constitution principle.
- No database access occurs in this feature; all content is static or sourced from locale
  files.
