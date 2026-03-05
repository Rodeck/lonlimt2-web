import { t } from "./i18n";
import type { Locale } from "./i18n";

export interface NavItemResolved {
  key: string;
  path: string;
  label: string;
  isActive: boolean;
}

const NAV_ITEMS = [
  { key: "home", path: "/", labelKey: "nav.home" },
  { key: "patchNotes", path: "/patch-notes", labelKey: "nav.patchNotes" },
  { key: "presentation", path: "/presentation", labelKey: "nav.presentation" },
] as const;

export function buildNav(currentPath: string, locale: Locale): NavItemResolved[] {
  return NAV_ITEMS.map((item) => ({
    key: item.key,
    path: item.path,
    label: t(item.labelKey, locale),
    isActive: item.path === currentPath,
  }));
}
