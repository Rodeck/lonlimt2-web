import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Eta } from "eta";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { localeMiddleware } from "./middleware/locale";
import type { Variables } from "./middleware/locale";
import { buildNav } from "./lib/nav";
import { t } from "./lib/i18n";
import type { Locale } from "./lib/i18n";

const __dirname = dirname(fileURLToPath(import.meta.url));

const eta = new Eta({
  views: join(__dirname, "views"),
  useWith: false,
});

const app = new Hono<{ Variables: Variables }>();

// ── Middleware ────────────────────────────────────────────────
app.use("*", localeMiddleware);

// ── Static files: /static/* → ./public/ ──────────────────────
app.use(
  "/static/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => path.replace(/^\/static/, ""),
  }),
);

// ── Locale switch ─────────────────────────────────────────────
app.get("/set-locale", (c) => {
  const l = c.req.query("l");
  const locale: Locale = l === "en" ? "en" : "pl";
  const referer = c.req.header("referer") ?? "/";
  return new Response(null, {
    status: 302,
    headers: {
      Location: referer,
      "Set-Cookie": `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
    },
  });
});

// ── Shared context builder ────────────────────────────────────
function pageCtx(locale: Locale, currentPath: string) {
  const tFn = (key: string) => t(key, locale);
  return {
    locale,
    t: tFn,
    navItems: buildNav(currentPath, locale),
    currentPath,
    langToggleLocale: locale === "pl" ? "en" : "pl",
    langToggleLabel: tFn("lang.toggle"),
  };
}

// ── Home page (/): US1 ────────────────────────────────────────
app.get("/", async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/");
  const html = await eta.renderAsync("home", {
    ...ctx,
    pageTitle: ctx.t("page.home.title"),
    pageDesc: ctx.t("page.home.desc"),
    hero: {
      tagline: ctx.t("hero.tagline"),
      taglineSub: ctx.t("hero.taglineSub"),
      description: ctx.t("hero.description"),
      ctaText: ctx.t("hero.cta"),
      ctaHref: "/register",
    },
  });
  return c.html(html);
});

// ── Patch Notes (/patch-notes): US2 ──────────────────────────
app.get("/patch-notes", async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/patch-notes");
  const html = await eta.renderAsync("patch-notes", {
    ...ctx,
    pageTitle: ctx.t("page.patchNotes.title"),
    pageDesc: ctx.t("page.patchNotes.desc"),
    sectionTitle: ctx.t("nav.patchNotes"),
    comingSoon: ctx.t("placeholder.comingSoon"),
    comingSoonDesc: ctx.t("placeholder.comingSoonDesc"),
  });
  return c.html(html);
});

// ── Presentation (/presentation): US2 ────────────────────────
app.get("/presentation", async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/presentation");
  const html = await eta.renderAsync("presentation", {
    ...ctx,
    pageTitle: ctx.t("page.presentation.title"),
    pageDesc: ctx.t("page.presentation.desc"),
    sectionTitle: ctx.t("nav.presentation"),
    comingSoon: ctx.t("placeholder.comingSoon"),
    comingSoonDesc: ctx.t("placeholder.comingSoonDesc"),
  });
  return c.html(html);
});

// ── Start server ──────────────────────────────────────────────
serve({ fetch: app.fetch, port: 8080 }, (info) => {
  console.log(`LonliMT2 running at http://localhost:${info.port}`);
});
