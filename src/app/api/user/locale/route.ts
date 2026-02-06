import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidLocale } from "@/i18n/config";

const LOCALE_COOKIE = "locale";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locale } = body;

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Always set the cookie (works for both authenticated and guest users)
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    // If user is authenticated, also save to database
    const session = await auth();
    if (session?.user) {
      const userId = (session.user as any).id;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { locale },
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Error updating locale:", error);
    return NextResponse.json(
      { error: "Failed to update locale" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ locale: null });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ locale: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });

    return NextResponse.json({ locale: user?.locale ?? null });
  } catch (error) {
    console.error("Error fetching locale:", error);
    return NextResponse.json(
      { error: "Failed to fetch locale" },
      { status: 500 }
    );
  }
}
