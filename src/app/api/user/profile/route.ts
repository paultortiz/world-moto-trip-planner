import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Valid enum values for validation
const RIDING_STYLES = ["TOURING", "ADVENTURE", "OFFROAD", "SPORT_TOURING"] as const;
const PACE_PREFERENCES = ["RELAXED", "MODERATE", "AGGRESSIVE"] as const;
const TERRAIN_PREFERENCES = ["PAVEMENT_ONLY", "MIXED", "OFFROAD_FOCUSED"] as const;
const EXPERIENCE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
const VALID_INTERESTS = [
  "scenicRoutes",
  "localCuisine",
  "historicSites",
  "photography",
  "camping",
  "twistyRoads",
  "wildlife",
  "beaches",
  "mountains",
  "deserts",
] as const;

// ISO 3166-1 alpha-2 country codes (complete list)
const VALID_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU",
  "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ",
  "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD",
  "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CU",
  "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC",
  "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA",
  "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW",
  "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN",
  "IQ", "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC",
  "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MR",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG",
  "NI", "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG",
  "PH", "PK", "PL", "PS", "PT", "PW", "PY", "QA", "RO", "RS",
  "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SI", "SK",
  "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY", "SZ",
  "TD", "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT",
  "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC",
  "VE", "VN", "VU", "WS", "YE", "ZA", "ZM", "ZW",
] as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        locale: true,
        passportCountries: true,
        ridingStyle: true,
        pacePreference: true,
        terrainPreference: true,
        experienceLevel: true,
        dailyDistanceKm: true,
        interests: true,
        avoidHighways: true,
        preferCamping: true,
        dietaryRestrictions: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    console.error("Get profile error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();

    // Validate and sanitize input
    const updateData: Prisma.UserUpdateInput = {};

    // Name (optional string)
    if (body.name !== undefined) {
      updateData.name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : null;
    }

    // Locale (optional string)
    if (body.locale !== undefined) {
      const validLocales = ["en", "es", "de", "fr", "pt"];
      updateData.locale = validLocales.includes(body.locale) ? body.locale : null;
    }

    // Passport countries (array of ISO 3166-1 alpha-2 codes)
    if (body.passportCountries !== undefined) {
      if (Array.isArray(body.passportCountries)) {
        const filtered = body.passportCountries.filter((c: string) =>
          VALID_COUNTRY_CODES.includes(c as any)
        );
        updateData.passportCountries = filtered.length > 0 ? filtered : Prisma.DbNull;
      } else {
        updateData.passportCountries = Prisma.DbNull;
      }
    }

    // Riding style enum
    if (body.ridingStyle !== undefined) {
      updateData.ridingStyle = RIDING_STYLES.includes(body.ridingStyle)
        ? body.ridingStyle
        : null;
    }

    // Pace preference enum
    if (body.pacePreference !== undefined) {
      updateData.pacePreference = PACE_PREFERENCES.includes(body.pacePreference)
        ? body.pacePreference
        : null;
    }

    // Terrain preference enum
    if (body.terrainPreference !== undefined) {
      updateData.terrainPreference = TERRAIN_PREFERENCES.includes(body.terrainPreference)
        ? body.terrainPreference
        : null;
    }

    // Experience level enum
    if (body.experienceLevel !== undefined) {
      updateData.experienceLevel = EXPERIENCE_LEVELS.includes(body.experienceLevel)
        ? body.experienceLevel
        : null;
    }

    // Daily distance (positive integer, max 1000km)
    if (body.dailyDistanceKm !== undefined) {
      const dist = parseInt(body.dailyDistanceKm, 10);
      updateData.dailyDistanceKm = !isNaN(dist) && dist > 0 && dist <= 1000 ? dist : null;
    }

    // Interests (array of valid strings)
    if (body.interests !== undefined) {
      if (Array.isArray(body.interests)) {
        const filtered = body.interests.filter((i: string) =>
          VALID_INTERESTS.includes(i as any)
        );
        updateData.interests = filtered.length > 0 ? filtered : Prisma.DbNull;
      } else {
        updateData.interests = Prisma.DbNull;
      }
    }

    // Booleans
    if (body.avoidHighways !== undefined) {
      updateData.avoidHighways = Boolean(body.avoidHighways);
    }
    if (body.preferCamping !== undefined) {
      updateData.preferCamping = Boolean(body.preferCamping);
    }

    // Dietary restrictions (optional string, max 500 chars)
    if (body.dietaryRestrictions !== undefined) {
      updateData.dietaryRestrictions =
        typeof body.dietaryRestrictions === "string"
          ? body.dietaryRestrictions.trim().slice(0, 500) || null
          : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        locale: true,
        passportCountries: true,
        ridingStyle: true,
        pacePreference: true,
        terrainPreference: true,
        experienceLevel: true,
        dailyDistanceKm: true,
        interests: true,
        avoidHighways: true,
        preferCamping: true,
        dietaryRestrictions: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update profile" },
      { status: 500 }
    );
  }
}
