export const locales = ["en", "es", "de", "fr", "pt"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
