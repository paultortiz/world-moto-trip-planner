import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isValidLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  // Priority: 1. Cookie, 2. Accept-Language header, 3. Default
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: Locale = defaultLocale;

  // Check cookie first (set when user is authenticated and has preference)
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // Fall back to Accept-Language header
    const acceptLanguage = headerStore.get("accept-language");
    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "es-ES,es;q=0.9,en;q=0.8")
      const languages = acceptLanguage
        .split(",")
        .map((lang) => lang.split(";")[0].trim().split("-")[0]);

      for (const lang of languages) {
        if (isValidLocale(lang)) {
          locale = lang;
          break;
        }
      }
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
