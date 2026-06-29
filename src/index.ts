import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { csrf } from "hono/csrf";
import { Eta } from "eta";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { localeMiddleware } from "./middleware/locale";
import type { Variables } from "./middleware/locale";
import { buildNav } from "./lib/nav";
import { t } from "./lib/i18n";
import type { Locale } from "./lib/i18n";
import {
  createRegistrationRateLimiter,
  getClientIP,
} from "./middleware/rate-limit";
import {
  mysqlNativePassword,
  callRegisterSP,
  errorCodeToLocaleKey,
} from "./services/account";

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

// ── Registration rate limiter (10 attempts / IP / hour) ───────
const registrationRateLimiter = createRegistrationRateLimiter(async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/register");
  const html = await eta.renderAsync("register", {
    ...ctx,
    pageTitle: ctx.t("register.page.title"),
    pageDesc: ctx.t("register.page.desc"),
    errorKey: "register.error.rateLimited",
    emailValue: "",
    loginValue: "",
  });
  return c.html(html, 429);
});

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
      downloadText: ctx.t("hero.downloadPatcher"),
      patcherUrl: process.env.PATCHER_URL ?? "",
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

// ── Registration form (GET /register) ─────────────────────────
app.get("/register", async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/register");
  const html = await eta.renderAsync("register", {
    ...ctx,
    pageTitle: ctx.t("register.page.title"),
    pageDesc: ctx.t("register.page.desc"),
    errorKey: "",
    emailValue: "",
    loginValue: "",
  });
  return c.html(html);
});

// ── Registration submit (POST /register) ──────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/register", csrf(), registrationRateLimiter, async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/register");
  const ip = getClientIP(c);

  const renderForm = async (
    errorKey: string,
    emailValue = "",
    loginValue = "",
  ) => {
    const html = await eta.renderAsync("register", {
      ...ctx,
      pageTitle: ctx.t("register.page.title"),
      pageDesc: ctx.t("register.page.desc"),
      errorKey,
      emailValue,
      loginValue,
    });
    return c.html(html);
  };

  const body = await c.req.parseBody();
  const email = String(body.email ?? "").trim();
  const login = String(body.login ?? "").trim();
  const password = String(body.password ?? "");

  // Non-empty validation
  if (!email || !login || !password) {
    console.log(
      `[${new Date().toISOString()}] REGISTER FAIL | ip=${ip} reason=EMPTY_FIELDS`,
    );
    return renderForm("register.error.unknown", email, login);
  }

  // Field length validation
  if (email.length > 64) {
    return renderForm("register.error.emailTooLong", email, login);
  }
  if (login.length > 30) {
    return renderForm("register.error.loginTooLong", email, login);
  }
  if (password.length < 6) {
    return renderForm("register.error.passwordTooShort", email, login);
  }
  if (password.length > 72) {
    return renderForm("register.error.passwordTooLong", email, login);
  }

  // Email format validation
  if (!EMAIL_RE.test(email)) {
    return renderForm("register.error.invalidEmail", email, login);
  }

  // Hash password and call stored procedure
  const passwordHash = mysqlNativePassword(password);
  const result = await callRegisterSP(email, login, passwordHash);

  if (!result.ok) {
    const errorKey = errorCodeToLocaleKey(result.code);
    console.log(
      `[${new Date().toISOString()}] REGISTER FAIL | ip=${ip} email=${email} error=${result.code}`,
    );
    return renderForm(errorKey, email, login);
  }

  console.log(
    `[${new Date().toISOString()}] REGISTER OK | ip=${ip} email=${email}`,
  );
  return c.redirect("/register/success", 302);
});

// ── Registration success (GET /register/success) ──────────────
app.get("/register/success", async (c) => {
  const locale = c.get("locale");
  const ctx = pageCtx(locale, "/register");
  const patcherUrl = process.env.PATCHER_URL ?? "";
  const html = await eta.renderAsync("register-success", {
    ...ctx,
    pageTitle: ctx.t("register.success.title"),
    pageDesc: ctx.t("register.page.desc"),
    patcherUrl,
  });
  return c.html(html);
});

// ── Start server ──────────────────────────────────────────────
serve({ fetch: app.fetch, port: 8080 }, (info) => {
  console.log(`FairMT2 running at http://localhost:${info.port}`);
});
