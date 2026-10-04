/**
 * Minimal, dependency-free i18n helper.
 *
 * Phase 0 only needs a typed `t()` that resolves dotted keys against the active
 * catalog and supports `{name}` interpolation. A full library (e.g. i18next) can
 * replace this later without changing call sites, because components only depend
 * on `t('a.b.c')`.
 */
import { en, type Translations } from './en';

export type Locale = 'en';

const catalogs: Record<Locale, Translations> = {
  en,
};

let activeLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

/**
 * Builds the union of dotted key paths for a nested string catalog so `t()`
 * is fully type-checked (e.g. `'tabs.home'`).
 */
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<Translations>;

type InterpolationValues = Record<string, string | number>;

function resolve(catalog: Translations, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((acc, part) => (acc == null ? acc : (acc as Record<string, unknown>)[part]), catalog);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Translate a dotted key for the active locale.
 * Falls back to the English catalog, then to the raw key, so the UI never
 * renders blank.
 */
export function t(key: TranslationKey, values?: InterpolationValues): string {
  const template = resolve(catalogs[activeLocale], key) ?? resolve(en, key) ?? key;
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
