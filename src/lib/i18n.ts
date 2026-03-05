import { readFileSync } from "fs";
import { join } from "path";

export type Locale = "pl" | "en";

const cache = new Map<Locale, Record<string, unknown>>();

export function loadLocale(locale: Locale): Record<string, unknown> {
  if (cache.has(locale)) return cache.get(locale)!;
  const filePath = join(process.cwd(), "locales", `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  cache.set(locale, data);
  return data;
}

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(key: string, locale: Locale): string {
  const primary = loadLocale(locale);
  const value = resolve(primary, key);
  if (value !== undefined) return value;

  if (locale !== "pl") {
    const fallback = loadLocale("pl");
    const fbValue = resolve(fallback, key);
    if (fbValue !== undefined) return fbValue;
  }

  throw new Error(`Missing locale key "${key}" in pl.json`);
}

export function parseAcceptLanguage(header: string): Locale {
  if (!header) return "pl";
  const parts = header.split(",").map((s) => s.trim());
  for (const part of parts) {
    const lang = part.split(";")[0].trim().split("-")[0].toLowerCase();
    if (lang === "pl") return "pl";
    if (lang === "en") return "en";
  }
  return "pl";
}
