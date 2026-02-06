import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isValidLocale } from "./i18n/config";

const LOCALE_COOKIE = "locale";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If user already has a locale cookie, skip detection
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (existingLocale && isValidLocale(existingLocale)) {
    return response;
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  let detectedLocale = defaultLocale;

  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().split("-")[0]);

    for (const lang of languages) {
      if (isValidLocale(lang)) {
        detectedLocale = lang;
        break;
      }
    }
  }

  // Set the locale cookie for subsequent requests
  response.cookies.set(LOCALE_COOKIE, detectedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}

export const config = {
  // Run middleware on all routes except static files and API routes that don't need it
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
