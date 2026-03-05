import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { parseAcceptLanguage } from "../lib/i18n";
import type { Locale } from "../lib/i18n";

export type Variables = { locale: Locale };

export const localeMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const cookieLocale = getCookie(c, "locale");
    let locale: Locale;
    let persistCookie = false;

    if (cookieLocale === "pl" || cookieLocale === "en") {
      locale = cookieLocale;
    } else {
      const acceptLang = c.req.header("accept-language") ?? "";
      locale = parseAcceptLanguage(acceptLang);
      persistCookie = true;
    }

    c.set("locale", locale);
    await next();

    if (persistCookie) {
      c.header(
        "Set-Cookie",
        `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
      );
    }
  },
);
